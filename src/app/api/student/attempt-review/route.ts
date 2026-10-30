import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/api-user";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/attempt-review?attemptId=...
 *
 * Pembahasan of one finished assessment (Hasilku). Read here with plain
 * queries instead of from the browser: the browser read went through three
 * layers of RLS (question_attempts -> assessment_questions -> questions,
 * the last one a multi-join policy) and on a busy database it timed out,
 * which the page showed as "Detail soal tidak tersedia". Same rules as
 * that policy: only the caller's own submitted attempt, only when the
 * teacher allows review, only the questions that student actually got.
 */
export async function GET(req: Request) {
  const u = await requireUser(req);
  if (u instanceof Response) return u;
  if (u.role !== "STUDENT") return Response.json({ error: "Hanya untuk siswa" }, { status: 403 });
  const attemptId = new URL(req.url).searchParams.get("attemptId");
  if (!attemptId) return Response.json({ error: "attemptId wajib diisi" }, { status: 400 });

  const { data: student } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", u.profileId).single();
  if (!student) return Response.json({ error: "Akun siswa tidak ditemukan" }, { status: 403 });
  const { data: attempt } = await supabaseAdmin.from("assessment_attempts")
    .select("id, status, assessment_id, selected_question_ids").eq("id", attemptId).eq("student_id", student.id).maybeSingle();
  if (!attempt || !["submitted", "graded"].includes(attempt.status as string)) {
    return Response.json({ error: "Hasil ujian tidak ditemukan" }, { status: 404 });
  }
  const { data: assessment } = await supabaseAdmin.from("assessments").select("allow_review").eq("id", attempt.assessment_id).single();
  if (!assessment?.allow_review) return Response.json({ allowReview: false, items: [] });

  const { data: answers, error } = await supabaseAdmin.from("question_attempts")
    .select("student_answer, is_correct, points_earned, teacher_feedback, assessment_question_id")
    .eq("assessment_attempt_id", attemptId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const selected = (attempt.selected_question_ids as string[] | null) ?? null;
  const aqIds = (answers ?? []).map(a => a.assessment_question_id as string).filter(id => !selected || selected.includes(id));
  const { data: aqs } = aqIds.length
    ? await supabaseAdmin.from("assessment_questions").select("id, question_order, points, questions(*)").in("id", aqIds)
    : { data: [] };
  const byId = new Map(((aqs ?? []) as Array<{ id: string }>).map(r => [r.id, r]));

  const items = (answers ?? [])
    .filter(a => byId.has(a.assessment_question_id as string))
    .map(a => ({ ...a, assessment_questions: byId.get(a.assessment_question_id as string) }));
  return Response.json({ allowReview: true, items });
}
