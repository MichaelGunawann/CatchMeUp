import { supabaseAdmin } from "@/lib/supabase/server";
import { attemptDeadline } from "@/lib/auth/exam-deadline";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/assessment/[assessmentId]/deadline?attemptId=
 *
 * The current deadline of the student's running attempt. Polled by the
 * exam screen so extra time the teacher gives mid-exam shows up without
 * the student doing anything.
 */
export async function GET(req: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  const attemptId = new URL(req.url).searchParams.get("attemptId");
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ") || !attemptId) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!authData.user) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("id").eq("auth_user_id", authData.user.id).single();
  const { data: student } = profile ? await supabaseAdmin.from("students").select("id").eq("user_profile_id", profile.id).single() : { data: null };
  if (!student) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: attempt } = await supabaseAdmin.from("assessment_attempts").select("*")
    .eq("id", attemptId).eq("assessment_id", assessmentId).eq("student_id", student.id).maybeSingle();
  if (!attempt) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  const { data: a } = await supabaseAdmin.from("assessments").select("duration_minutes, close_at").eq("id", assessmentId).single();
  return Response.json({ status: attempt.status, deadlineAt: a ? attemptDeadline(attempt, a) : null });
}
