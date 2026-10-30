// AI pembahasan for "Soal Salah" (route /api/student/explain), stored in
// ai_cache per question and reused by every student while the question
// is unchanged.

export type AiExplanation = {
  explanation: string;
  /** essays: the right answer in short */
  modelAnswer?: string;
  /** essays with a teacher example answer: false when the AI found it wrong */
  teacherKeyOk?: boolean;
};

export type ExplainQuestion = {
  id: string; question: string; options: Record<string, unknown>; correct_answer: string | null;
  explanation: string | null; question_type?: string | null; answer_key?: unknown;
};

export const explainCacheKey = (questionId: string) => `explain:${questionId}`;
export const explainInput = (q: ExplainQuestion) => ({ q: q.question, o: q.options, k: q.correct_answer, a: q.answer_key, e: q.explanation });

/**
 * "Jawaban benar" for an essay in Soal Salah. The teacher's example answer
 * normally; when the AI found it wrong (e.g. 1440 where the right count is
 * 2880) the student sees the corrected answer and is told to check with
 * the teacher, instead of a key that contradicts the pembahasan.
 */
export function essayKeyText(teacherExample: string, ai: AiExplanation | null): string {
  const ex = teacherExample.trim();
  if (ai?.teacherKeyOk === false && ai.modelAnswer) {
    return `${ai.modelAnswer}${ex ? `\n(Contoh jawaban guru: ${ex} — menurut AI keliru, tanyakan ke gurumu.)` : ""}`;
  }
  if (ex) return `Contoh jawaban guru: ${ex}`;
  return ai?.modelAnswer ?? "";
}
