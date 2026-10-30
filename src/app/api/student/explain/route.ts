import { aiChat } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/api-user";
import { groqErrorResponse } from "@/lib/groq-error";
import { hashInput, readCache, writeCache } from "@/lib/ai-cache";
import { describeKey, questionTypeOf } from "@/lib/question-types";
import { essayKeyText, explainCacheKey, explainInput, type AiExplanation, type ExplainQuestion } from "@/lib/ai-explain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/student/explain  { questionId }
 *
 * "Soal Salah" for a question the teacher left without a pembahasan (or an
 * essay, whose only teacher text is the example answer): the AI writes
 * one, stored in ai_cache per question so every student reuses it.
 * Only for questions this student has already answered (practice, or a
 * submitted assessment that allows review) - never an open exam question.
 */
export async function POST(req: Request) {
  const u = await requireUser(req);
  if (u instanceof Response) return u;
  if (u.role !== "STUDENT") return Response.json({ error: "Hanya untuk siswa" }, { status: 403 });
  const { questionId } = (await req.json()) as { questionId?: string };
  if (!questionId) return Response.json({ error: "questionId wajib diisi" }, { status: 400 });

  const { data: student } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", u.profileId).single();
  if (!student) return Response.json({ error: "Akun siswa tidak ditemukan" }, { status: 403 });
  if (!(await hasAnswered(student.id as string, questionId))) {
    return Response.json({ error: "Pembahasan hanya untuk soal yang sudah kamu kerjakan" }, { status: 403 });
  }

  const { data: q } = await supabaseAdmin.from("questions")
    .select("id, question, options, correct_answer, explanation, question_type, answer_key").eq("id", questionId).single();
  if (!q) return Response.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  const question = q as ExplainQuestion;

  const inputHash = hashInput(explainInput(question));
  const cached = await readCache<AiExplanation>(explainCacheKey(questionId));
  if (cached && cached.inputHash === inputHash) return Response.json(withKey(question, cached.value));

  const type = questionTypeOf(question);
  const essay = type === "esai";
  const teacherText = (question.explanation ?? "").trim();
  const key = essay ? "" : describeKey(question);
  const prompt = `Kamu guru yang menjelaskan pembahasan soal kepada siswa SMA dalam Bahasa Indonesia yang jelas dan singkat.

SOAL (${type}):
${question.question}
${type === "pg" || type === "pg_kompleks" ? `PILIHAN: ${JSON.stringify(question.options)}\n` : ""}${type === "benar_salah" || type === "menjodohkan" ? `DATA SOAL: ${JSON.stringify(question.options)}\n` : ""}${key ? `KUNCI JAWABAN: ${key}\n` : ""}${essay && teacherText ? `CONTOH JAWABAN DARI GURU (bisa saja keliru, periksa dulu): ${teacherText}\n` : ""}
Tugas:
- Tulis pembahasan langkah demi langkah (maks 120 kata) kenapa jawabannya begitu. Untuk hitungan, tunjukkan langkah dan hasil akhirnya.
- Teks biasa saja: tanpa LaTeX, tanpa markdown tebal/judul. Pakai ×, ÷, ², √ bila perlu.${essay ? `
- Isi "modelAnswer" dengan jawaban yang benar secara ringkas (1-3 kalimat atau hasil akhir hitungan).` : ""}${essay && teacherText ? `
- Isi "teacherKeyOk": true jika contoh jawaban guru benar, false jika keliru (misalnya hasil hitungannya salah).` : ""}

Jawab HANYA JSON: {"explanation":""${essay ? `,"modelAnswer":""` : ""}${essay && teacherText ? `,"teacherKeyOk":true` : ""}}`;

  try {
    const completion = await aiChat("smart", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.2,
      reasoning_effort: "low",
    });
    const text = completion.choices[0].message.content ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Partial<AiExplanation>;
    const value: AiExplanation = { explanation: String(json.explanation ?? "").trim().slice(0, 2000) };
    if (essay && json.modelAnswer) value.modelAnswer = String(json.modelAnswer).trim().slice(0, 600);
    if (essay && teacherText && json.teacherKeyOk === false) value.teacherKeyOk = false;
    if (!value.explanation) return Response.json({ error: "AI belum bisa membuat pembahasan. Coba lagi." }, { status: 502 });
    await writeCache(explainCacheKey(questionId), inputHash, value);
    return Response.json(withKey(question, value));
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message }, { status });
  }
}

/** Essays also get the "Jawaban benar" text to show (see essayKeyText). */
function withKey(q: ExplainQuestion, v: AiExplanation) {
  return questionTypeOf(q) === "esai" ? { ...v, keyText: essayKeyText(q.explanation ?? "", v) } : v;
}

async function hasAnswered(studentId: string, questionId: string): Promise<boolean> {
  const { count } = await supabaseAdmin.from("practice_attempts").select("id", { count: "exact", head: true })
    .eq("student_id", studentId).eq("question_id", questionId);
  if (count) return true;
  const { data } = await supabaseAdmin.from("question_attempts")
    .select("id, assessment_questions!inner(question_id), assessment_attempts!inner(student_id, status, assessments(allow_review))")
    .eq("assessment_questions.question_id", questionId)
    .eq("assessment_attempts.student_id", studentId)
    .in("assessment_attempts.status", ["submitted", "graded"])
    .limit(5);
  return ((data ?? []) as unknown as Array<{ assessment_attempts: { assessments: { allow_review: boolean } | null } | null }>)
    .some(r => r.assessment_attempts?.assessments?.allow_review);
}
