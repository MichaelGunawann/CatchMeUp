import { supabaseAdmin } from "@/lib/supabase/server";
import { parseDbTime } from "@/lib/auth/assessment-availability";
import { describeAnswer, describeKey, questionTypeOf } from "@/lib/question-types";
import { hashInput } from "@/lib/ai-cache";
import { explainCacheKey, explainInput, type AiExplanation, type ExplainQuestion } from "@/lib/ai-explain";

export const dynamic = "force-dynamic";

type WrongItem = {
  id: string; source: string; topic: string; question: string; options: Record<string, string>;
  yourAnswer: string | null; correctAnswer: string; explanation: string; at: number;
  /** human-readable answer and key (all question types) */
  yourText: string; keyText: string;
  questionId: string;
  /** the pembahasan was written by the AI (teacher left none) */
  aiExplanation?: boolean;
  /** no pembahasan yet - the page asks /api/student/explain for one */
  needsAi?: boolean;
};

/**
 * GET /api/student/wrong-answers
 *
 * The signed-in student's own wrong answers ("Soal Salah"):
 * - practice questions whose MOST RECENT attempt is still wrong (a later
 *   correct answer removes it from the list), and
 * - wrong answers in submitted assessments whose teacher allows review
 *   (same rule as the answer reveal in Hasilku).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!authData.user) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (!profile || profile.role !== "STUDENT") return Response.json({ error: "Hanya untuk siswa" }, { status: 403 });
  const { data: student } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", profile.id).single();
  if (!student) return Response.json({ items: [] });

  const items: WrongItem[] = [];
  const questions = new Map<string, ExplainQuestion>();
  type Q = { id: string; question: string; options: Record<string, string>; correct_answer: string; explanation: string | null; topic: string | null; question_type?: string | null; answer_key?: unknown };

  // Practice: latest attempt per question decides.
  const { data: practice } = await supabaseAdmin
    .from("practice_attempts")
    .select("*, questions(*)")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false })
    .limit(500);
  const seen = new Set<string>();
  for (const p of (practice ?? []) as Array<{ id: string; question_id: string; is_correct: boolean; submitted_at: string; student_answer?: string | null; questions: Q | null }>) {
    if (seen.has(p.question_id)) continue;
    seen.add(p.question_id);
    if (p.is_correct || !p.questions) continue;
    const yourAnswer = p.student_answer ?? null;
    if (yourAnswer && yourAnswer === p.questions.correct_answer) continue;
    items.push({
      id: `p_${p.id}`, source: "Latihan", topic: p.questions.topic ?? "", question: p.questions.question,
      options: p.questions.options, yourAnswer, correctAnswer: p.questions.correct_answer,
      explanation: p.questions.explanation ?? "", at: parseDbTime(p.submitted_at),
      yourText: yourAnswer ? describeAnswer(p.questions, yourAnswer) : "(tidak tercatat)", keyText: describeKey(p.questions),
      questionId: p.question_id,
    });
    questions.set(p.question_id, p.questions);
  }

  // Assessments: submitted attempts of review-enabled assessments.
  const { data: attempts } = await supabaseAdmin
    .from("assessment_attempts")
    .select("id, submitted_at, assessments(title, allow_review)")
    .eq("student_id", student.id)
    .in("status", ["submitted", "graded"]);
  const reviewable = ((attempts ?? []) as unknown as Array<{ id: string; submitted_at: string | null; assessments: { title: string; allow_review: boolean } | null }>)
    .filter(a => a.assessments?.allow_review);
  if (reviewable.length) {
    const { data: qa } = await supabaseAdmin
      .from("question_attempts")
      .select("id, assessment_attempt_id, student_answer, is_correct, assessment_questions(questions(*))")
      .in("assessment_attempt_id", reviewable.map(a => a.id))
      .eq("is_correct", false);
    const byAttempt = new Map(reviewable.map(a => [a.id, a]));
    for (const r of (qa ?? []) as unknown as Array<{ id: string; assessment_attempt_id: string; student_answer: string | null; assessment_questions: { questions: Q | null } | null }>) {
      const q = r.assessment_questions?.questions;
      const att = byAttempt.get(r.assessment_attempt_id);
      if (!q || !att || !r.student_answer || (questionTypeOf(q) === "pg" && r.student_answer === q.correct_answer)) continue;
      items.push({
        id: `a_${r.id}`, source: att.assessments?.title ?? "Asesmen", topic: q.topic ?? "", question: q.question,
        options: q.options, yourAnswer: r.student_answer, correctAnswer: q.correct_answer,
        explanation: q.explanation ?? "", at: att.submitted_at ? parseDbTime(att.submitted_at) : 0,
        yourText: describeAnswer(q, r.student_answer), keyText: describeKey(q),
        questionId: q.id,
      });
      questions.set(q.id, q);
    }
  }

  items.sort((a, b) => b.at - a.at);
  const list = items.slice(0, 150);
  await fillExplanations(list, questions);
  return Response.json({ items: list });
}

/**
 * Essays: the teacher's only text is the example answer, shown as the key;
 * the pembahasan comes from the AI. Other types without a teacher
 * pembahasan also get the AI one. Stored AI explanations are filled in
 * here; the rest are marked needsAi and requested by the page.
 */
async function fillExplanations(list: WrongItem[], questions: Map<string, ExplainQuestion>) {
  for (const it of list) {
    const q = questions.get(it.questionId);
    if (q && questionTypeOf(q) === "esai") {
      it.keyText = it.explanation ? `Contoh jawaban guru: ${it.explanation}` : "";
      it.explanation = "";
    }
  }
  const missing = [...new Set(list.filter(it => !it.explanation).map(it => it.questionId))];
  if (!missing.length) return;
  const { data } = await supabaseAdmin.from("ai_cache").select("key, input_hash, value").in("key", missing.map(explainCacheKey));
  const stored = new Map(((data ?? []) as Array<{ key: string; input_hash: string; value: AiExplanation }>).map(r => [r.key, r]));
  for (const it of list) {
    if (it.explanation) continue;
    const q = questions.get(it.questionId);
    const c = stored.get(explainCacheKey(it.questionId));
    if (q && c && c.input_hash === hashInput(explainInput(q))) {
      it.explanation = c.value.explanation;
      it.aiExplanation = true;
      if (!it.keyText && c.value.modelAnswer) it.keyText = c.value.modelAnswer;
    } else {
      it.needsAi = true;
    }
  }
}
