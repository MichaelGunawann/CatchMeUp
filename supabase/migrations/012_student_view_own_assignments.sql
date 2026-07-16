-- ═══════════════════════════════════════════════════════════════════════
-- STUDENTS CAN VIEW THEIR OWN CLASS'S teacher_assignments
-- ═══════════════════════════════════════════════════════════════════════
--
-- Bug: Latihan Adaptif (StudentAdaptive) resolves which subject(s) a
-- student can practice by querying teacher_assignments for their own
-- class_id. But teacher_assignments RLS only ever granted SELECT to
-- teachers (their own rows) and school admins (their own school) -
-- students had no policy at all. RLS silently returns zero rows rather
-- than erroring, so the subject list came back empty, no picker showed,
-- and "Mulai Latihan Sekarang" stayed permanently disabled with no
-- explanation - this is what was actually happening, confirmed directly
-- against the live data (the assignments exist; the query just couldn't
-- see them under the student's own session).
--
-- Fix: a narrow SELECT policy scoped to the student's own class only.

DROP POLICY IF EXISTS "Students can view assignments for their own class" ON teacher_assignments;
CREATE POLICY "Students can view assignments for their own class"
  ON teacher_assignments FOR SELECT
  USING (
    class_id = (
      SELECT class_id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );
