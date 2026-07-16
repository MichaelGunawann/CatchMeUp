-- ═══════════════════════════════════════════════════════════════════════
-- CLASS-SCOPED QUESTIONS + HARD-DELETE FOR REJECTED PENDING QUESTIONS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Correction to the Bank Soal / Tinjau Soal AI migration: the product's
-- real semantic is class + subject specific (matching the legacy mock's
-- per-class question tagging), not subject-only. `questions` had no
-- class_id column at all; this migration adds it as the missing half of
-- the (class, subject) scope.
--
-- `questions` is empty in production as of this migration (verified
-- directly via the service role before writing this), so class_id is
-- added as NOT NULL immediately - no backfill is needed and none is
-- attempted.
--
-- Safe to run once: DROP POLICY IF EXISTS before every CREATE POLICY,
-- duplicate_column guarded.

DO $$
BEGIN
  BEGIN
    ALTER TABLE questions ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

ALTER TABLE questions ALTER COLUMN class_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_class_subject ON questions(class_id, subject_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Teacher SELECT/INSERT: (class_id, subject_id) must both match a real
-- teacher_assignments row - AND, not OR (subject-only was wrong).
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Teachers can view questions for assigned subjects" ON questions;
DROP POLICY IF EXISTS "Teachers can view questions for assigned class and subject" ON questions;
CREATE POLICY "Teachers can view questions for assigned class and subject"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.class_id = questions.class_id
      AND ta.subject_id = questions.subject_id
      AND ta.teacher_id IN (
        SELECT id FROM teachers WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can create questions for assigned subjects" ON questions;
DROP POLICY IF EXISTS "Teachers can create questions for assigned class and subject" ON questions;
CREATE POLICY "Teachers can create questions for assigned class and subject"
  ON questions FOR INSERT
  WITH CHECK (
    creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.class_id = questions.class_id
      AND ta.subject_id = questions.subject_id
      AND ta.teacher_id IN (
        SELECT id FROM teachers WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Hard-delete for rejected PENDING questions only
-- ═══════════════════════════════════════════════════════════════════════
--
-- "Tolak" on Tinjau Soal AI must actually remove the row, not soft-reject
-- it. This is safe ONLY for status='pending' rows: assessment_questions,
-- practice_attempts, and student_wrong_answers all reference questions(id)
-- ON DELETE CASCADE, so deleting an already-approved ('active') question
-- that has been used anywhere would silently destroy that historical
-- attempt/grading data. A 'pending' question has, by construction, never
-- been approved into the bank, so it can never appear in any assessment,
-- practice session, or wrong-answer record - there is nothing for the
-- cascade to destroy. The RLS policy itself enforces the pending-only
-- rule (not just application code), so a bug in the app can never
-- escalate into deleting a question that's actually in use.
DROP POLICY IF EXISTS "Teachers can delete their own pending questions" ON questions;
CREATE POLICY "Teachers can delete their own pending questions"
  ON questions FOR DELETE
  USING (
    status = 'pending'
    AND creator_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );
