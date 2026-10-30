import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { getMaterialText } from "@/lib/material-text";
import { aiChat } from "@/lib/ai";
import { groqErrorResponse } from "@/lib/groq-error";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHUNK = 6000;

type Extracted = {
  question?: string;
  options?: Record<string, string>;
  answerOnSheet?: string | null;   // key printed on the sheet
  suggestedAnswer?: string | null; // AI's suggestion when the sheet has none
  answerTextOnSheet?: string | null;  // uraian: answer printed on the sheet
  suggestedAnswerText?: string | null; // uraian: AI's short model answer
  needsImage?: boolean;
  optionsByAi?: boolean;      // pg mode: the sheet had no options, the AI made them
  shortAnswer?: string | null; // isian mode: final answer only
};

/** What a question WITHOUT options on the sheet becomes (sheet PG stays PG). */
type ImportAs = "pg" | "isian" | "esai";

/** Split at question boundaries ("12." / "12)" / a lone number line) near CHUNK size. */
function chunks(text: string, size = CHUNK): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > size) {
    const window = rest.slice(0, size + 1500);
    const re = /(?:^|\n)\s*\d{1,3}\s*[.)]?\s*(?=\S)/g;
    let cut = -1;
    for (let m; (m = re.exec(window));) if (m.index > size * 0.6) { cut = m.index; break; }
    if (cut < 0) cut = size;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) out.push(rest);
  return out;
}

/**
 * POST /api/teacher/materials/import-questions  { materialId }
 *
 * "Impor soal" for a quiz/worksheet: COPIES the sheet's questions (no new
 * questions are invented) into Tinjau Soal AI. An answer key printed on the
 * sheet is used; otherwise the AI suggests one and the question is marked
 * "kunci perlu dicek" so the teacher checks it before approving.
 * `as` decides what questions without options become: "pg" (the AI writes
 * A-E options with one right answer), "isian" (short exact answer) or
 * "esai" (default, graded by the teacher).
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const body = (await req.json()) as { materialId?: string; as?: string };
  const materialId = body.materialId;
  const as: ImportAs = body.as === "pg" || body.as === "isian" ? body.as : "esai";
  const { data: mat } = await supabaseAdmin.from("materials").select("*").eq("id", materialId ?? "").maybeSingle();
  if (!mat) return Response.json({ error: "Materi tidak ditemukan" }, { status: 404 });
  if (!t.assignments.some(a => a.class_id === mat.class_id && a.subject_id === mat.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel materi ini" }, { status: 403 });
  }
  const text = (await getMaterialText(mat)).replace(/\n{3,}/g, "\n\n");
  if (!text.trim()) return Response.json({ error: "Isi file tidak terbaca, juga oleh AI pembaca gambar. Coba unggah ulang dengan foto/scan yang lebih jelas." }, { status: 400 });

  // A printed key ("Kunci jawaban: 1. B 2. A ...") usually sits at the end.
  const keyAt = text.search(/kunci\s*jawaban|answer\s*key|\bkunci\b\s*:/i);
  const keySection = keyAt >= 0 ? text.slice(keyAt, keyAt + 2500) : "";

  const found: Extracted[] = [];
  try {
    const modeRule = as === "pg"
      ? `- Soal yang di dokumen TIDAK punya pilihan: BUAT pilihan A, B, C, D, E sendiri - tepat satu jawaban benar (kerjakan/hitung dengan teliti) dan 4 pengecoh yang masuk akal (kesalahan yang sering dibuat siswa, mis. salah rumus). Isi "optionsByAi": true dan "suggestedAnswer" = huruf jawaban benar. Teks soal tetap disalin persis.`
      : as === "isian"
      ? `- Soal yang di dokumen TIDAK punya pilihan: isi "shortAnswer" dengan jawaban akhir yang singkat saja (angka atau 1-3 kata, tanpa cara), selain mengisi suggestedAnswerText.`
      : "";
    // Making options (pg) is more output per question: smaller parts.
    const partSize = as === "pg" ? 3000 : CHUNK;
    for (const part of chunks(keyAt >= 0 ? text.slice(0, keyAt) : text, partSize)) {
      const completion = await aiChat("smart", {
        messages: [{ role: "user", content: `Ini teks dari LEMBAR SOAL (kuis/ujian) yang diunggah guru. Tugasmu MENYALIN soal-soalnya, BUKAN membuat soal baru.

ATURAN:
- Salin teks soal dan pilihan jawaban persis seperti di dokumen (boleh rapikan spasi). Jangan mengubah isi, angka, atau menambah soal.
- Pilihan jawaban beri huruf A, B, C, D, E sesuai urutannya walau di dokumen tidak berhuruf. Soal tanpa pilihan (uraian) -> "options": {}.
- "answerOnSheet": huruf kunci HANYA jika kuncinya tertulis di dokumen (lihat juga bagian KUNCI di bawah). Jika tidak ada -> null.
- "suggestedAnswer": jika answerOnSheet null dan soal pilihan ganda, isi huruf jawaban yang menurutmu benar (akan dicek guru). Selain itu null.
- Soal uraian/isian (tanpa pilihan): "answerTextOnSheet" = jawaban jika tertulis di dokumen, selain itu null; "suggestedAnswerText" = jawaban singkat yang benar menurutmu (beserta cara singkat bila hitungan), akan dicek guru.
- "needsImage": true jika soal merujuk gambar/tabel/grafik yang tidak ada di teks.
- Abaikan teks yang bukan soal (judul, nama/absen, "Mark only one oval", "2 points", petunjuk umum).
${modeRule}

${keySection ? `BAGIAN KUNCI JAWABAN DI DOKUMEN:\n${keySection}\n` : ""}
TEKS DOKUMEN:
---
${part}
---

Jawab HANYA JSON: {"questions":[{"question":"","options":{"A":"","B":""},"answerOnSheet":null,"suggestedAnswer":"A","answerTextOnSheet":null,"suggestedAnswerText":null,"needsImage":false${as === "pg" ? `,"optionsByAi":false` : as === "isian" ? `,"shortAnswer":null` : ""}}]}` }],
        max_tokens: 6000,
        temperature: 0.1,
      });
      const raw = completion.choices[0].message.content ?? "";
      try {
        const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (Array.isArray(json.questions)) found.push(...json.questions);
      } catch { /* a chunk the model couldn't format - skip it */ }
    }
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    if (!found.length) return Response.json({ error: message }, { status });
  }

  const letters = ["A", "B", "C", "D", "E"];
  const base = {
    school_id: mat.school_id, class_id: mat.class_id, subject_id: mat.subject_id, creator_id: t.profileId,
    source: "uploaded", topic: mat.chapter || mat.title, subtopic: mat.chapter || mat.title,
    difficulty: "Sedang", bloom_level: "Menerapkan", status: "pending",
    source_title: mat.title, source_material_id: mat.id,
  };
  const rows = found.filter(q => typeof q.question === "string" && q.question.trim()).map(q => {
    let opts: Record<string, string> = Object.fromEntries(letters.filter(k => typeof q.options?.[k] === "string" && q.options[k].trim()).map(k => [k, q.options![k].trim()]));
    const isPg = Object.keys(opts).length >= 2;
    const madeByAi = isPg && !!q.optionsByAi;
    const onSheet = !madeByAi && q.answerOnSheet && opts[q.answerOnSheet.toUpperCase()] ? q.answerOnSheet.toUpperCase() : null;
    let suggested = q.suggestedAnswer && opts[q.suggestedAnswer.toUpperCase()] ? q.suggestedAnswer.toUpperCase() : null;
    if (madeByAi && suggested) {
      // Models like to put the right answer first: shuffle the options.
      const texts = Object.keys(opts).map(k => ({ k, text: opts[k] }));
      for (let i = texts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]]; }
      const right = opts[suggested];
      opts = Object.fromEntries(texts.map((x, i) => [letters[i], x.text]));
      suggested = Object.keys(opts).find(k => opts[k] === right) ?? suggested;
    }
    const answerText = q.answerTextOnSheet?.trim() || q.suggestedAnswerText?.trim() || "";
    const keyFromSheet = !!q.answerTextOnSheet?.trim();
    const question = q.question!.trim() + (q.needsImage ? "\n(Soal ini memakai gambar - tambahkan gambarnya sebelum dipakai.)" : "");
    if (isPg) {
      return {
        ...base, question, question_type: "pg", options: opts,
        correct_answer: onSheet ?? suggested ?? Object.keys(opts)[0],
        // Flag for Tinjau Soal: the key wasn't on the sheet (or the options are the AI's).
        answer_key: !onSheet ? { keyCheck: true, keySource: suggested ? "ai" : "none" } : null,
        explanation: madeByAi ? answerText : "",
      };
    }
    const short = (q.shortAnswer ?? "").trim() || (keyFromSheet ? q.answerTextOnSheet!.trim() : "");
    if (as === "isian" && short && short.length <= 60) {
      return {
        ...base, question, question_type: "isian", options: {}, correct_answer: null,
        answer_key: keyFromSheet ? { accepted: [short] } : { accepted: [short], keyCheck: true, keySource: "ai" },
        explanation: answerText,
      };
    }
    // Uraian: the (printed or suggested) answer becomes the example answer
    // the essay check compares against.
    return {
      ...base, question, question_type: "esai", options: {}, correct_answer: null,
      answer_key: keyFromSheet ? null : { keyCheck: true, keySource: answerText ? "ai" : "none" },
      explanation: answerText,
    };
  });
  if (!rows.length) {
    return Response.json({ error: "Tidak ada soal di file ini (isinya materi/pembahasan, bukan lembar soal). Untuk membuat soal dari materi, pakai \"Proses dengan AI\"." }, { status: 422 });
  }
  const { error } = await supabaseAdmin.from("questions").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("materials").update({ is_question_sheet: true }).eq("id", mat.id).then(() => {}, () => {});
  return Response.json({
    imported: rows.length,
    keyFromSheet: rows.filter(r => !(r.answer_key as { keyCheck?: boolean } | null)?.keyCheck && r.question_type !== "esai").length,
    pg: rows.filter(r => r.question_type === "pg").length,
    isian: rows.filter(r => r.question_type === "isian").length,
    keyToCheck: rows.filter(r => (r.answer_key as { keyCheck?: boolean } | null)?.keyCheck).length,
    essays: rows.filter(r => r.question_type === "esai").length,
  });
}
