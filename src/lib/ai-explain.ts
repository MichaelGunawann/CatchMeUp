// AI pembahasan for "Soal Salah" (route /api/student/explain), stored in
// ai_cache per question and reused by every student while the question
// is unchanged.

export type AiExplanation = { explanation: string; modelAnswer?: string };

export type ExplainQuestion = {
  id: string; question: string; options: Record<string, unknown>; correct_answer: string | null;
  explanation: string | null; question_type?: string | null; answer_key?: unknown;
};

export const explainCacheKey = (questionId: string) => `explain:${questionId}`;
export const explainInput = (q: ExplainQuestion) => ({ q: q.question, o: q.options, k: q.correct_answer, a: q.answer_key, e: q.explanation });
