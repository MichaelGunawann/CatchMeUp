import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { teacherAssessment } from "@/lib/auth/teacher-assessment";
import { attemptDeadline } from "@/lib/auth/exam-deadline";
import { parseDbTime } from "@/lib/auth/assessment-availability";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/assessments/extend
 *   { assessmentId, minutes, attemptIds?: string[], extendClose?: boolean }
 *
 * Extra time in the middle of an exam.
 * - attemptIds given: only those running attempts get `minutes` more
 *   (a personal deadline that may pass close_at).
 * - otherwise everyone: the duration grows by `minutes` (running and future
 *   attempts), personal deadlines move too, and with extendClose the
 *   assessment's closing time moves as well.
 * Running exam screens pick the new deadline up within ~30 seconds.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { assessmentId, minutes, attemptIds, extendClose } = (await req.json()) as {
    assessmentId?: string; minutes?: number; attemptIds?: string[]; extendClose?: boolean;
  };
  const m = Math.round(Number(minutes));
  if (!assessmentId || !Number.isFinite(m) || m < 1 || m > 600) return Response.json({ error: "Isi tambahan waktu 1-600 menit" }, { status: 400 });
  const a = await teacherAssessment(t, assessmentId);
  if (!a) return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });

  const { data: running } = await supabaseAdmin.from("assessment_attempts").select("*")
    .eq("assessment_id", assessmentId).eq("status", "in_progress");
  const targets = (running ?? []).filter(r => !attemptIds?.length || attemptIds.includes(r.id));

  if (attemptIds?.length) {
    for (const r of targets) {
      const base = attemptDeadline(r, a) ?? Date.now();
      const { error } = await supabaseAdmin.from("assessment_attempts")
        .update({ deadline_override: new Date(Math.max(base, Date.now()) + m * 60000).toISOString() }).eq("id", r.id);
      if (error) return Response.json({ error: /deadline_override/.test(error.message) ? "Jalankan migrasi 031 terlebih dahulu." : error.message }, { status: 500 });
    }
    return Response.json({ success: true, extended: targets.length });
  }

  const patch: Record<string, unknown> = { duration_minutes: (a.duration_minutes ?? 0) + m };
  if (extendClose && a.close_at) patch.close_at = new Date(parseDbTime(a.close_at) + m * 60000).toISOString();
  const { error } = await supabaseAdmin.from("assessments").update(patch).eq("id", assessmentId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  for (const r of targets.filter(x => x.deadline_override)) {
    await supabaseAdmin.from("assessment_attempts")
      .update({ deadline_override: new Date(parseDbTime(r.deadline_override) + m * 60000).toISOString() }).eq("id", r.id);
  }
  return Response.json({ success: true, extended: targets.length, durationMinutes: patch.duration_minutes });
}
