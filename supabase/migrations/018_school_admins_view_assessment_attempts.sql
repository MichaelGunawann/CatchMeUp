-- ═══════════════════════════════════════════════════════════════════════
-- SCHOOL ADMINS CAN VIEW assessment_attempts FOR STUDENTS IN THEIR SCHOOL
-- ═══════════════════════════════════════════════════════════════════════
--
-- assessment_attempts never had a SELECT policy for SCHOOL_ADMIN at all -
-- only students (own attempts), teachers (their assigned classes), and
-- parents (linked children). Needed to compute a real "Rata-rata Nilai"
-- column for AdminStudents (currently 100% hardcoded mock data being
-- migrated to real data) - without this, the admin's own students query
-- would work but every score would silently come back empty.
--
-- Checked for recursion before adding: this is a raw subquery on students,
-- not a SECURITY DEFINER helper, but that's safe here because none of
-- students' own policies (self/teacher/school-admin/parent) subquery
-- assessment_attempts - verified by re-reading every existing policy on
-- students in 002/003/004/005. No cycle in either direction.
--
-- Safe to run once. Idempotent (DROP POLICY IF EXISTS before CREATE).

DROP POLICY IF EXISTS "School admins can view assessment attempts in their school" ON assessment_attempts;
CREATE POLICY "School admins can view assessment attempts in their school"
  ON assessment_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE school_id IN (SELECT get_my_school_admin_school_ids())
    )
  );
