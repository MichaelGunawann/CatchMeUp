import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { recomputeAttempt } from "@/lib/grading";
import { isianMatches } from "@/lib/question-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/teacher/grade-by-key  { assessmentQuestionId, accepted: string[], convert?: boolean }
 *
 * For "essay" questions that really have one exact answer (e.g. 5040):
 * grades every submitted answer automatically against the accepted
 * answers (numbers compared by value), no AI needed. With convert=true the
 * question becomes "Isian Singkat" so future attempts are auto-graded too.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { assessmentQuestionId, accepted, convert } = (await req.json()) as { assessmentQuestionId?: string; accepted?: string[]; convert?: boolean };
  const keys = (accepted ?? []).map(k => String(k).trim()).filter(Boolean).slice(0, 10);
  if (!assessmentQuestionId || keys.length === 0) return Response.json({ error: "Isi jawaban yang benar" }, { status: 400 });

  const { data: aq } = await supabaseAdmin.from("assessment_questions")
    .select("id, points, question_id, assessments(class_id, subject_id)").eq("id", assessmentQuestionId).maybeSingle();
  const a = (aq as unknown as { assessments: { class_id: string; subject_id: string } | null } | null)?.assessments;
  if (!aq || !a || !t.assignments.some(x => x.class_id === a.class_id && x.subject_id === a.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  }
  const max = Number(aq.points) || 1;

  const { data: rows } = await supabaseAdmin.from("question_attempts")
    .select("id, assessment_attempt_id, student_answer").eq("assessment_question_id", assessmentQuestionId);
  let right = 0;
  for (const r of rows ?? []) {
    const ok = isianMatches(r.student_answer ?? "", keys);
    if (ok) right++;
    await supabaseAdmin.from("question_attempts").update({
      is_correct: ok, points_earned: ok ? max : 0, graded_at: new Date().toISOString(),
    }).eq("id", r.id);
  }

  let converted = false;
  let convertError: string | null = null;
  if (convert) {
    const { error } = await supabaseAdmin.from("questions").update({ question_type: "isian", answer_key: { accepted: keys } })
      .eq("id", aq.question_id);
    if (error) convertError = /check constraint/i.test(error.message) ? "Jalankan migrasi 032 untuk mengubah jenis soal." : error.message;
    else converted = true;
  }

  for (const attemptId of new Set((rows ?? []).map(r => r.assessment_attempt_id as string))) await recomputeAttempt(attemptId);
  return Response.json({ graded: rows?.length ?? 0, right, converted, convertError });
}
