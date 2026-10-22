-- ═══════════════════════════════════════════════════════════════════════
-- FIX: plain multiple-choice questions must have an answer key
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration 026's check let a 'pg' question be saved with correct_answer
-- NULL: `NULL IN ('A',...)` is NULL, and a CHECK that evaluates to NULL
-- passes. Verified live (an insert of pg + NULL key succeeded). The app
-- never sends that, but the database should refuse it too.
--
-- Safe to run more than once.

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_answer_check;
ALTER TABLE questions ADD CONSTRAINT questions_correct_answer_check
  CHECK (
    CASE
      WHEN question_type = 'pg' THEN correct_answer IS NOT NULL AND correct_answer IN ('A', 'B', 'C', 'D', 'E')
      ELSE correct_answer IS NULL OR correct_answer IN ('A', 'B', 'C', 'D', 'E')
    END
  );
