-- ═══════════════════════════════════════════════════════════════════════
-- TKA QUESTION TYPES + QUESTION IMAGES + ESSAY GRADING
-- ═══════════════════════════════════════════════════════════════════════
--
-- New question types (see src/lib/question-types.ts for the exact shapes):
--   pg (default, unchanged) · pg_kompleks · benar_salah · menjodohkan · esai
-- Non-pg types keep their key in answer_key (JSONB) and leave
-- correct_answer NULL, so correct_answer stops being NOT NULL for them.
--
-- image_url: public URL of an optional picture shown with the question
-- (bucket "question-images"; public read - the file names are random
-- UUIDs, uploads only through the teacher-only server route).
--
-- Essays are graded by the teacher afterwards: their question_attempts
-- row has is_correct NULL until graded, and the assessment attempt stays
-- 'submitted' (not 'graded') until every essay has a score.
--
-- Points per question already exist (assessment_questions.points) and
-- grading already weights by them.
--
-- No new tables. Safe to run more than once.

-- ── questions ──────────────────────────────────────────────────────────
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'pg';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_key JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN ('pg', 'pg_kompleks', 'benar_salah', 'menjodohkan', 'esai'));

-- correct_answer: required (A-E) only for plain multiple choice.
ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.questions'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%correct_answer%'
  LOOP
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE questions ADD CONSTRAINT questions_correct_answer_check
  CHECK (
    (question_type = 'pg' AND correct_answer IN ('A', 'B', 'C', 'D', 'E'))
    OR (question_type <> 'pg' AND (correct_answer IS NULL OR correct_answer IN ('A', 'B', 'C', 'D', 'E')))
  );

-- ── essay grading ──────────────────────────────────────────────────────
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- ── image storage ──────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
