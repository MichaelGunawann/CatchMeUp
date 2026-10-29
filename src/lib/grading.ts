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
