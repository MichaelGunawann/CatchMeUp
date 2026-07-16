-- ═══════════════════════════════════════════════════════════════════════
-- SECURE EXAM GRADING: remove client-writable attempt/grading policies
-- ═══════════════════════════════════════════════════════════════════════
--
-- Phase 4 of the complete mock-data-elimination migration - the
-- highest-stakes change in this batch.
--
-- Root problem: Postgres RLS is row-grain, not column-grain. The
-- pre-existing "Students can update their own attempts" /
-- "Students can create question attempts" / "Students can update
-- question attempts" policies (002_rls_policies.sql) grant the OWNING
-- student full-row write access - there is no way to let a student
-- write `student_answer` while forbidding them from also writing
-- `score`/`is_correct`/`points_earned` in the same USING/WITH CHECK
-- clause. Confirmed: students also have NO RLS SELECT on `questions`
-- or `assessment_questions` today, so `correct_answer` was never
-- actually exposed to a real client - but the write-side gap meant a
-- student's own client could still have set `score`/`is_correct`
-- directly via a raw REST PATCH once this flow was wired up, with no
-- grading logic ever verifying it server-side.
--
-- Fix: drop every student-writable policy on assessment_attempts /
-- question_attempts / student_wrong_answers. There is no replacement -
-- all writes to these three tables now happen exclusively through
-- /api/student/assessment/[id]/start and /submit (service role,
-- supabaseAdmin, which bypasses RLS entirely), which compute
-- correctness server-side by reading `questions.correct_answer`
-- directly - the client never receives it and never gets to claim it.
--
-- The one new, deliberate access path added here: a narrow,
-- allow_review-gated SELECT reveal so a student can see the correct
-- answer/explanation for questions on an assessment they already
-- completed, if and only if the teacher enabled allow_review. This is a
-- legitimate row-grain condition (by the time it applies, grading has
-- already happened and the school's own policy is to let the student
-- see it) - not a column-masking workaround.
--
-- Safe to run once: DROP POLICY IF EXISTS before every statement.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Drop exploitable student-writable policies
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Students can create their own attempts" ON assessment_attempts;
DROP POLICY IF EXISTS "Students can update their own attempts" ON assessment_attempts;
DROP POLICY IF EXISTS "Students can create question attempts" ON question_attempts;
DROP POLICY IF EXISTS "Students can update question attempts" ON question_attempts;
DROP POLICY IF EXISTS "Students can create wrong answer records" ON student_wrong_answers;

-- Existing student/teacher/parent SELECT policies on these three tables
-- (own-history reads) are untouched - they were never the problem.

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Explicit deny (documents intent - RLS already defaults to deny
--    with zero matching policies, this makes it unambiguous)
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Assessment attempts are service-role only for writes" ON assessment_attempts;
CREATE POLICY "Assessment attempts are service-role only for writes"
  ON assessment_attempts FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Question attempts are service-role only for writes" ON question_attempts;
CREATE POLICY "Question attempts are service-role only for writes"
  ON question_attempts FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Wrong answers are service-role only for writes" ON student_wrong_answers;
CREATE POLICY "Wrong answers are service-role only for writes"
  ON student_wrong_answers FOR INSERT
  WITH CHECK (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Controlled reveal: allow_review-gated SELECT on questions/
--    assessment_questions for a student's own completed attempts
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Students can view questions for reviewable completed assessments" ON questions;
CREATE POLICY "Students can view questions for reviewable completed assessments"
  ON questions FOR SELECT
  USING (
    id IN (
      SELECT aq.question_id FROM assessment_questions aq
      JOIN assessments a ON a.id = aq.assessment_id
      JOIN assessment_attempts att ON att.assessment_id = a.id
      WHERE att.student_id IN (
        SELECT id FROM students WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
      AND att.status IN ('submitted', 'graded')
      AND a.allow_review = TRUE
    )
  );

DROP POLICY IF EXISTS "Students can view assessment_questions for reviewable assessments" ON assessment_questions;
CREATE POLICY "Students can view assessment_questions for reviewable assessments"
  ON assessment_questions FOR SELECT
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN assessment_attempts att ON att.assessment_id = a.id
      WHERE att.student_id IN (
        SELECT id FROM students WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
      AND att.status IN ('submitted', 'graded')
      AND a.allow_review = TRUE
    )
  );

-- After this migration, the client-writable RLS surface for the entire
-- attempt lifecycle is empty. Regression test (must be run live before
-- this is considered done): with a real student JWT, PATCH
-- assessment_attempts?id=eq.<id> setting score=100 directly against the
-- Supabase REST endpoint must be rejected.
