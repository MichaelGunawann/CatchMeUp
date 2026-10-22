import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/grade-essay  { questionAttemptId, points, feedback? }
 *
 * Teacher scores one essay answer (0..question points). The attempt's
 * score is then recomputed from all its answers, and once no essay in the
 * attempt is left ungraded the attempt moves from 'submitted' to 'graded'.
 * Only a teacher assigned to the assessment's class + subject may grade.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { questionAttemptId, points, feedback } = (await req.json()) as { questionAttemptId?: string; points?: number; feedback?: string };
  if (!questionAttemptId || typeof points !== "number" || !Number.isFinite(points)) {
    return Response.json({ error: "Data penilaian tidak lengkap" }, { status: 400 });
  }

  const { data: qa } = await supabaseAdmin
    .from("question_attempts")
    .select("id, assessment_attempt_id, assessment_questions(points, questions(question_type)), assessment_attempts(id, assessments(id, class_id, subject_id))")
    .eq("id", questionAttemptId)
    .single();
  type QA = {
    id: string; assessment_attempt_id: string;
    assessment_questions: { points: number; questions: { question_type?: string | null } | null } | null;
    assessment_attempts: { id: string; assessments: { id: string; class_id: string; subject_id: string } | null } | null;
  };
  const row = qa as unknown as QA | null;
  const assessment = row?.assessment_attempts?.assessments;
  if (!row || !assessment) return Response.json({ error: "Jawaban tidak ditemukan" }, { status: 404 });
  if (!t.assignments.some(a => a.class_id === assessment.class_id && a.subject_id === assessment.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  }
  if ((row.assessment_questions?.questions?.question_type ?? "pg") !== "esai") {
    return Response.json({ error: "Hanya soal esai yang dinilai manual" }, { status: 400 });
  }
  const max = Number(row.assessment_questions?.points) || 1;
  const earned = Math.min(max, Math.max(0, Math.round(points * 100) / 100));

  const { error: upErr } = await supabaseAdmin.from("question_attempts").update({
    points_earned: earned,
    is_correct: earned >= max,
    teacher_feedback: (feedback ?? "").trim().slice(0, 1000) || null,
    graded_at: new Date().toISOString(),
  }).eq("id", row.id);
  if (upErr) {
    const missing = /teacher_feedback|graded_at/.test(upErr.message);
    return Response.json({ error: missing ? "Jalankan migrasi 026 terlebih dahulu." : upErr.message }, { status: 500 });
  }

  // Recompute the attempt score from every answer in it.
  const { data: all } = await supabaseAdmin
    .from("question_attempts")
    .select("points_earned, is_correct, student_answer, assessment_questions(points, questions(question_type))")
    .eq("assessment_attempt_id", row.assessment_attempt_id);
  type Part = { points_earned: number | null; is_correct: boolean | null; student_answer: string | null; assessment_questions: { points: number; questions: { question_type?: string | null } | null } | null };
  const parts = (all ?? []) as unknown as Part[];
  const total = parts.reduce((s, p) => s + (Number(p.assessment_questions?.points) || 1), 0);
  const got = parts.reduce((s, p) => s + (Number(p.points_earned) || 0), 0);
  const stillPending = parts.some(p => (p.assessment_questions?.questions?.question_type ?? "pg") === "esai" && p.is_correct === null && !!p.student_answer);
  const score = total > 0 ? Math.round((got / total) * 100) : 0;
  await supabaseAdmin.from("assessment_attempts")
    .update({ score, total_points: total, status: stillPending ? "submitted" : "graded" })
    .eq("id", row.assessment_attempt_id)
    .in("status", ["submitted", "graded"]);

  return Response.json({ success: true, earned, score, pending: stillPending });
}
