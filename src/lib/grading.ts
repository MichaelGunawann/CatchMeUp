import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Recomputes an attempt's score from all its answers. While any essay is
 * still ungraded the score stays empty ("–") and the status 'submitted'.
 */
export async function recomputeAttempt(attemptId: string): Promise<{ score: number | null; pending: boolean }> {
  const { data: all } = await supabaseAdmin
    .from("question_attempts")
    .select("points_earned, is_correct, student_answer, assessment_questions(points, questions(question_type))")
    .eq("assessment_attempt_id", attemptId);
  type Part = { points_earned: number | null; is_correct: boolean | null; student_answer: string | null; assessment_questions: { points: number; questions: { question_type?: string | null } | null } | null };
  const parts = (all ?? []) as unknown as Part[];
  const total = parts.reduce((s, p) => s + (Number(p.assessment_questions?.points) || 1), 0);
  const got = parts.reduce((s, p) => s + (Number(p.points_earned) || 0), 0);
  const pending = parts.some(p => (p.assessment_questions?.questions?.question_type ?? "pg") === "esai" && p.is_correct === null && !!p.student_answer);
  const score = total > 0 ? Math.round((got / total) * 100) : 0;
  await supabaseAdmin.from("assessment_attempts")
    .update({ score: pending ? null : score, total_points: total, status: pending ? "submitted" : "graded" })
    .eq("id", attemptId)
    .in("status", ["submitted", "graded"]);
  return { score: pending ? null : score, pending };
}

/**
 * Keeps an attempt's "Soal Salah" row (student_wrong_answers) in step with
 * an answer regraded after submission: removed when it is now right,
 * (re)added when it is now wrong.
 */
export async function syncWrongAnswer(attemptId: string, questionId: string, isCorrect: boolean, answer: string | null) {
  await supabaseAdmin.from("student_wrong_answers").delete().eq("assessment_attempt_id", attemptId).eq("question_id", questionId);
  if (isCorrect || !answer?.trim()) return;
  const { data: att } = await supabaseAdmin.from("assessment_attempts").select("student_id, submitted_at").eq("id", attemptId).maybeSingle();
  if (!att) return;
  await supabaseAdmin.from("student_wrong_answers").insert({
    student_id: att.student_id, assessment_attempt_id: attemptId, question_id: questionId,
    student_answer: answer, attempted_at: att.submitted_at ?? new Date().toISOString(),
  });
}
