import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { recomputeAttempt, syncWrongAnswer } from "@/lib/grading";
import { gradeAnswer, letterOptions, matchingOf, questionTypeOf, statementsOf } from "@/lib/question-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/teacher/regrade-question  { assessmentQuestionId, correctAnswer?, answerKey? }
 *
 * Changes the answer key of one question (any type) and regrades every
 * submitted answer to it in this assessment with the new key. Only the key
 * changes - text, options and type stay - so answers already given keep
 * their meaning (matching answers are indices into the unchanged right list).
 * Essays only store the new example answer / keywords: the teacher grades
 * them, so nothing is regraded.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { assessmentQuestionId, correctAnswer, answerKey } = (await req.json()) as { assessmentQuestionId?: string; correctAnswer?: string; answerKey?: unknown };
  if (!assessmentQuestionId) return Response.json({ error: "Soal tidak ditemukan" }, { status: 400 });

  const { data: aqRow } = await supabaseAdmin.from("assessment_questions")
    .select("id, points, question_id, assessments(class_id, subject_id), questions(id, question_type, options, correct_answer, answer_key)")
    .eq("id", assessmentQuestionId).maybeSingle();
  type AQ = {
    id: string; points: number; question_id: string;
    assessments: { class_id: string; subject_id: string } | null;
    questions: { id: string; question_type?: string | null; options: Record<string, unknown> | null; correct_answer: string | null; answer_key: unknown } | null;
  };
  const aq = aqRow as unknown as AQ | null;
  const a = aq?.assessments;
  if (!aq || !a || !aq.questions) return Response.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  if (!t.assignments.some(x => x.class_id === a.class_id && x.subject_id === a.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  }

  const q = aq.questions;
  const type = questionTypeOf(q);
  const key = validateKey(type, q.options, correctAnswer, answerKey);
  if ("error" in key) return Response.json({ error: key.error }, { status: 400 });

  const { error: upErr } = await supabaseAdmin.from("questions")
    .update({ correct_answer: key.correctAnswer, answer_key: key.answerKey, updated_at: new Date().toISOString() })
    .eq("id", q.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  if (type === "esai") return Response.json({ graded: 0, right: 0, changed: 0, essay: true });

  const updated = { ...q, correct_answer: key.correctAnswer, answer_key: key.answerKey };
  const max = Number(aq.points) || 1;
  const { data: rows } = await supabaseAdmin.from("question_attempts")
    .select("id, assessment_attempt_id, student_answer, points_earned").eq("assessment_question_id", aq.id);
  let right = 0, changed = 0;
  for (const r of rows ?? []) {
    const g = gradeAnswer(updated, r.student_answer, max);
    if (g.isCorrect) right++;
    if (Number(r.points_earned ?? 0) !== g.earned) changed++;
    await supabaseAdmin.from("question_attempts").update({
      is_correct: g.isCorrect, points_earned: g.earned, graded_at: new Date().toISOString(),
    }).eq("id", r.id);
    await syncWrongAnswer(r.assessment_attempt_id, q.id, g.isCorrect === true, r.student_answer);
  }
  for (const attemptId of new Set((rows ?? []).map(r => r.assessment_attempt_id as string))) await recomputeAttempt(attemptId);
  return Response.json({ graded: rows?.length ?? 0, right, changed });
}

type ValidKey = { correctAnswer: string | null; answerKey: unknown } | { error: string };

function validateKey(type: ReturnType<typeof questionTypeOf>, options: Record<string, unknown> | null, correctAnswer: unknown, answerKey: unknown): ValidKey {
  const letters = letterOptions(options).map(o => o.key);
  switch (type) {
    case "pg":
      return typeof correctAnswer === "string" && letters.includes(correctAnswer)
        ? { correctAnswer, answerKey: null } : { error: "Pilih satu jawaban yang benar." };
    case "pg_kompleks": {
      const k = Array.isArray(answerKey) ? [...new Set(answerKey.map(String))].filter(x => letters.includes(x)).sort() : [];
      return k.length ? { correctAnswer: null, answerKey: k } : { error: "Centang minimal satu jawaban yang benar." };
    }
    case "benar_salah": {
      const n = statementsOf(options).length;
      const k = Array.isArray(answerKey) ? answerKey.map(String) : [];
      return k.length === n && k.every(x => x === "B" || x === "S")
        ? { correctAnswer: null, answerKey: k } : { error: "Tentukan Benar/Salah untuk setiap pernyataan." };
    }
    case "menjodohkan": {
      const { left, right } = matchingOf(options);
      const k = Array.isArray(answerKey) ? answerKey.map(Number) : [];
      return k.length === left.length && k.every(x => Number.isInteger(x) && x >= 0 && x < right.length)
        ? { correctAnswer: null, answerKey: k } : { error: "Pasangkan setiap item kiri dengan satu jawaban." };
    }
    case "isian": {
      const acc = (answerKey as { accepted?: unknown } | null)?.accepted;
      const k = Array.isArray(acc) ? [...new Set(acc.map(String).map(x => x.trim()).filter(Boolean))].slice(0, 20) : [];
      return k.length ? { correctAnswer: null, answerKey: { accepted: k } } : { error: "Isi minimal satu jawaban yang benar." };
    }
    case "esai": {
      const o = (answerKey ?? {}) as { rubric?: unknown; keywords?: unknown };
      const rubric = typeof o.rubric === "string" ? o.rubric.trim().slice(0, 4000) : "";
      const keywords = Array.isArray(o.keywords) ? o.keywords.map(String).map(x => x.trim()).filter(Boolean).slice(0, 30) : [];
      return { correctAnswer: null, answerKey: rubric || keywords.length ? { ...(rubric ? { rubric } : {}), ...(keywords.length ? { keywords } : {}) } : null };
    }
  }
}
