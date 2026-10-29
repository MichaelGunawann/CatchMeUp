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
  needsImage?: boolean;
};

/** Split at question boundaries ("12." / "12)" / a lone number line) near CHUNK size. */
function chunks(text: string): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > CHUNK) {
    const window = rest.slice(0, CHUNK + 1500);
    const re = /(?:^|\n)\s*\d{1,3}\s*[.)]?\s*(?=\S)/g;
    let cut = -1;
    for (let m; (m = re.exec(window));) if (m.index > CHUNK * 0.6) { cut = m.index; break; }
    if (cut < 0) cut = CHUNK;
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
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { materialId } = (await req.json()) as { materialId?: string };
  const { data: mat } = await supabaseAdmin.from("materials").select("*").eq("id", materialId ?? "").maybeSingle();
  if (!mat) return Response.json({ error: "Materi tidak ditemukan" }, { status: 404 });
  if (!t.assignments.some(a => a.class_id === mat.class_id && a.subject_id === mat.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel materi ini" }, { status: 403 });
  }
  const text = (await getMaterialText(mat)).replace(/\n{3,}/g, "\n\n");
  if (!text.trim()) return Response.json({ error: "Teks file tidak terbaca (mungkin hasil scan/foto)." }, { status: 400 });

  // A printed key ("Kunci jawaban: 1. B 2. A ...") usually sits at the end.
  const keyAt = text.search(/kunci\s*jawaban|answer\s*key|\bkunci\b\s*:/i);
  const keySection = keyAt >= 0 ? text.slice(keyAt, keyAt + 2500) : "";

  const found: Extracted[] = [];
  try {
    for (const part of chunks(keyAt >= 0 ? text.slice(0, keyAt) : text)) {
      const completion = await aiChat("smart", {
        messages: [{ role: "user", content: `Ini teks dari LEMBAR SOAL (kuis/ujian) yang diunggah guru. Tugasmu MENYALIN soal-soalnya, BUKAN membuat soal baru.

ATURAN:
- Salin teks soal dan pilihan jawaban persis seperti di dokumen (boleh rapikan spasi). Jangan mengubah isi, angka, atau menambah soal.
- Pilihan jawaban beri huruf A, B, C, D, E sesuai urutannya walau di dokumen tidak berhuruf. Soal tanpa pilihan (uraian) -> "options": {}.
- "answerOnSheet": huruf kunci HANYA jika kuncinya tertulis di dokumen (lihat juga bagian KUNCI di bawah). Jika tidak ada -> null.
- "suggestedAnswer": jika answerOnSheet null dan soal pilihan ganda, isi huruf jawaban yang menurutmu benar (akan dicek guru). Selain itu null.
- "needsImage": true jika soal merujuk gambar/tabel/grafik yang tidak ada di teks.
- Abaikan teks yang bukan soal (judul, nama/absen, "Mark only one oval", "2 points", petunjuk umum).

${keySection ? `BAGIAN KUNCI JAWABAN DI DOKUMEN:\n${keySection}\n` : ""}
TEKS DOKUMEN:
---
${part}
---

Jawab HANYA JSON: {"questions":[{"question":"","options":{"A":"","B":""},"answerOnSheet":null,"suggestedAnswer":"A","needsImage":false}]}` }],
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
  const rows = found.filter(q => typeof q.question === "string" && q.question.trim()).map(q => {
    const opts = Object.fromEntries(letters.filter(k => typeof q.options?.[k] === "string" && q.options[k].trim()).map(k => [k, q.options![k].trim()]));
    const isPg = Object.keys(opts).length >= 2;
    const onSheet = q.answerOnSheet && opts[q.answerOnSheet.toUpperCase()] ? q.answerOnSheet.toUpperCase() : null;
    const suggested = q.suggestedAnswer && opts[q.suggestedAnswer.toUpperCase()] ? q.suggestedAnswer.toUpperCase() : null;
    return {
      school_id: mat.school_id, class_id: mat.class_id, subject_id: mat.subject_id, creator_id: t.profileId,
      source: "uploaded", topic: mat.chapter || mat.title, subtopic: mat.chapter || mat.title,
      difficulty: "Sedang", bloom_level: "Menerapkan",
      question: q.question!.trim() + (q.needsImage ? "\n(Soal ini memakai gambar - tambahkan gambarnya sebelum dipakai.)" : ""),
      question_type: isPg ? "pg" : "esai",
      options: isPg ? opts : {},
      correct_answer: isPg ? (onSheet ?? suggested ?? Object.keys(opts)[0]) : null,
      // Flag for Tinjau Soal: the key wasn't on the sheet.
      answer_key: isPg && !onSheet ? { keyCheck: true, keySource: suggested ? "ai" : "none" } : null,
      explanation: "",
      status: "pending",
      source_title: mat.title,
      source_material_id: mat.id,
    };
  });
  if (!rows.length) return Response.json({ error: "Tidak ada soal yang bisa dibaca dari file ini." }, { status: 422 });
  const { error } = await supabaseAdmin.from("questions").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from("materials").update({ is_question_sheet: true }).eq("id", mat.id).then(() => {}, () => {});
  return Response.json({
    imported: rows.length,
    keyFromSheet: rows.filter(r => r.question_type === "pg" && !r.answer_key).length,
    keyToCheck: rows.filter(r => r.answer_key).length,
    essays: rows.filter(r => r.question_type === "esai").length,
  });
}
