import { supabaseAdmin } from "@/lib/supabase/server";
import { QUESTION_TYPE_LABEL, questionTypeOf, type QuestionType } from "@/lib/question-types";

export type TypeStat = { type: QuestionType; label: string; correct: number; total: number; accuracy: number | null };

/**
 * A student's accuracy per question type, from practice answers and
 * graded assessment answers (essays waiting for the teacher don't count).
 * Used to steer adaptive practice toward the formats they're weak in.
 */
export async function loadTypeStats(studentId: string, subjectId?: string): Promise<TypeStat[]> {
  const agg = new Map<QuestionType, { correct: number; total: number }>();
  const add = (q: { question_type?: string | null; subject_id?: string } | null | undefined, ok: boolean | null) => {
    if (!q || ok === null || (subjectId && q.subject_id !== subjectId)) return;
    const t = questionTypeOf(q);
    const cur = agg.get(t) ?? { correct: 0, total: 0 };
    cur.total += 1; if (ok) cur.correct += 1;
    agg.set(t, cur);
  };

  const [{ data: practice }, { data: attempts }] = await Promise.all([
    supabaseAdmin.from("practice_attempts").select("is_correct, questions(*)").eq("student_id", studentId)
      .order("submitted_at", { ascending: false }).limit(1000),
    supabaseAdmin.from("assessment_attempts").select("id").eq("student_id", studentId).in("status", ["submitted", "graded"]),
  ]);
  for (const p of (practice ?? []) as unknown as Array<{ is_correct: boolean; questions: { question_type?: string | null; subject_id?: string } | null }>) {
    add(p.questions, p.is_correct);
  }
  const ids = (attempts ?? []).map(a => a.id as string);
  if (ids.length) {
    const { data: qa } = await supabaseAdmin.from("question_attempts")
      .select("is_correct, assessment_questions(questions(*))").in("assessment_attempt_id", ids).limit(3000);
    for (const r of (qa ?? []) as unknown as Array<{ is_correct: boolean | null; assessment_questions: { questions: { question_type?: string | null; subject_id?: string } | null } | null }>) {
      add(r.assessment_questions?.questions, r.is_correct);
    }
  }
  return (["pg", "pg_kompleks", "benar_salah", "menjodohkan", "isian", "esai"] as QuestionType[]).map(type => {
    const s = agg.get(type) ?? { correct: 0, total: 0 };
    return { type, label: QUESTION_TYPE_LABEL[type], ...s, accuracy: s.total ? Math.round((s.correct / s.total) * 100) : null };
  });
}
