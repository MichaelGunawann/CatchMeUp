-- ═══════════════════════════════════════════════════════════════════════
-- SHORT-ANSWER ("Isian Singkat") QUESTION TYPE
-- ═══════════════════════════════════════════════════════════════════════
--
-- Questions with one exact answer (a number such as 5040, or a word)
-- are graded automatically: answer_key = {"accepted": ["5040", ...]};
-- numbers are compared by value ("5.040", "5040 cara" = 5040). Only
-- real essays still need the teacher.
--
-- No new tables. Safe to run more than once.

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN ('pg', 'pg_kompleks', 'benar_salah', 'menjodohkan', 'isian', 'esai'));
