import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { teacherAssessment } from "@/lib/auth/teacher-assessment";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/attempts/reopen  { attemptId, keepAnswers, minutes }
 *
 * Lets a student back into an exam that ended for them (e.g. they left
 * the exam screen by accident). The attempt becomes "in progress" again
 * with a personal deadline of now + `minutes` (may pass the closing time,
 * for this student only). keepAnswers=false clears their answers.
 * Submitting again regrades it from scratch.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { attemptId, keepAnswers, minutes } = (await req.json()) as { attemptId?: string; keepAnswers?: boolean; minutes?: number };
  const m = Math.round(Number(minutes));
  if (!attemptId || !Number.isFinite(m) || m < 1 || m > 600) return Response.json({ error: "Isi durasi 1-600 menit" }, { status: 400 });

  const { data: attempt } = await supabaseAdmin.from("assessment_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!attempt) return Response.json({ error: "Data ujian siswa tidak ditemukan" }, { status: 404 });
  const a = await teacherAssessment(t, attempt.assessment_id);
  if (!a) return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  if (attempt.status === "in_progress") return Response.json({ error: "Siswa ini masih mengerjakan. Pakai \"Tambah waktu\"." }, { status: 409 });

  const { data: other } = await supabaseAdmin.from("assessment_attempts").select("id")
    .eq("assessment_id", attempt.assessment_id).eq("student_id", attempt.student_id).eq("status", "in_progress");
  if (other?.length) return Response.json({ error: "Siswa ini sudah punya ujian yang sedang berjalan." }, { status: 409 });

  if (!keepAnswers) {
    await supabaseAdmin.from("question_attempts").delete().eq("assessment_attempt_id", attemptId);
  }
  await supabaseAdmin.from("student_wrong_answers").delete().eq("assessment_attempt_id", attemptId);
  const { error } = await supabaseAdmin.from("assessment_attempts").update({
    status: "in_progress", submitted_at: null, score: null,
    deadline_override: new Date(Date.now() + m * 60000).toISOString(),
    end_reason: null,
  }).eq("id", attemptId);
  if (error) return Response.json({ error: /deadline_override|end_reason/.test(error.message) ? "Jalankan migrasi 031 terlebih dahulu." : error.message }, { status: 500 });
  return Response.json({ success: true });
}
