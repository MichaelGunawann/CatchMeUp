import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { recomputeAttempt, syncWrongAnswer } from "@/lib/grading";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/grade-essay  { questionAttemptId, points, feedback? }
 *
 * Teacher scores one essay answer (0..question points), or overrides the
 * automatic score of a short answer ("isian") whose key missed a valid
 * variant (that also updates the student's "Soal Salah"). The attempt's
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
    .select("id, assessment_attempt_id, student_answer, assessment_questions(question_id, points, questions(question_type)), assessment_attempts(id, assessments(id, class_id, subject_id))")
    .eq("id", questionAttemptId)
    .single();
  type QA = {
    id: string; assessment_attempt_id: string; student_answer: string | null;
    assessment_questions: { question_id: string; points: number; questions: { question_type?: string | null } | null } | null;
    assessment_attempts: { id: string; assessments: { id: string; class_id: string; subject_id: string } | null } | null;
  };
  const row = qa as unknown as QA | null;
  const assessment = row?.assessment_attempts?.assessments;
  if (!row || !assessment) return Response.json({ error: "Jawaban tidak ditemukan" }, { status: 404 });
  if (!t.assignments.some(a => a.class_id === assessment.class_id && a.subject_id === assessment.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  }
  const type = row.assessment_questions?.questions?.question_type ?? "pg";
  if (type !== "esai" && type !== "isian") {
    return Response.json({ error: "Hanya soal esai dan isian singkat yang dinilai manual" }, { status: 400 });
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

  if (type === "isian" && row.assessment_questions) {
    await syncWrongAnswer(row.assessment_attempt_id, row.assessment_questions.question_id, earned >= max, row.student_answer);
  }
  const { score, pending } = await recomputeAttempt(row.assessment_attempt_id);
  return Response.json({ success: true, earned, score, pending });
}
