import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/api-user";
import { recordSteps, studentOnboarding, teacherOnboarding, STUDENT_HIDDEN, TEACHER_HIDDEN } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding
 *
 * Body {}             -> the caller's onboarding card state (teacher
 *                        checklist or student missions), recording any step
 *                        the data already proves.
 * Body { hide: true } -> hides the caller's card for good.
 *
 * Only the server records steps; the browser can hide its card but never
 * mark a step done (student steps pay XP). { available: false } means no
 * card: other roles, inactive accounts, or migration 033 not applied yet.
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const { hide } = (await req.json().catch(() => ({}))) as { hide?: boolean };

  if (user.role === "TEACHER") {
    const { data: teacher } = await supabaseAdmin.from("teachers").select("id, status").eq("user_profile_id", user.profileId).maybeSingle();
    if (!teacher || teacher.status !== "ACTIVE") return Response.json({ available: false });
    if (hide) {
      await recordSteps(user.profileId, [TEACHER_HIDDEN]);
      return Response.json({ success: true });
    }
    return Response.json((await teacherOnboarding(user.profileId, teacher.id)) ?? { available: false });
  }

  if (user.role === "STUDENT") {
    const { data: student } = await supabaseAdmin.from("students").select("id, school_id, class_id, status").eq("user_profile_id", user.profileId).maybeSingle();
    if (!student || student.status !== "ACTIVE" || !student.class_id) return Response.json({ available: false });
    if (hide) {
      await recordSteps(user.profileId, [STUDENT_HIDDEN]);
      return Response.json({ success: true });
    }
    return Response.json((await studentOnboarding(user.profileId, student as { id: string; school_id: string; class_id: string })) ?? { available: false });
  }

  return Response.json({ available: false });
}
