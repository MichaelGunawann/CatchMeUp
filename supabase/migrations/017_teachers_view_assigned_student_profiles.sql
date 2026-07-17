-- ═══════════════════════════════════════════════════════════════════════
-- TEACHERS CAN VIEW THEIR ASSIGNED STUDENTS' user_profiles ROWS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Same gap as 016 fixed for parents, this time for teachers: user_profiles
-- only ever had a SELECT policy for the row's own owner (auth_user_id =
-- auth.uid()) - there was never a teacher-facing policy. fetchRealClassStudents
-- (TeacherDashboard/TeacherAnalytics roster) reads each student's full_name
-- via a nested user_profiles(full_name) embed keyed by students.user_profile_id;
-- with no policy granting that, the embed silently returned null for every
-- row (RLS default-deny, not an error) - "Performa Siswa" cards rendered
-- with real scores/ranks but every name as "-", easy to miss until a class
-- actually had multiple real students to look at side by side.
--
-- Checked for the same recursion shape as 012-016 before adding this: the
-- SECURITY DEFINER helper bypasses RLS entirely for every table it reads
-- (students, teacher_assignments, teachers, user_profiles included), so
-- none of its internal queries re-trigger this new policy or any other
-- policy on any of those tables - no cycle possible.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION is_profile_of_my_assigned_student(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE user_profile_id = target_profile_id
    AND class_id IN (
      SELECT class_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );
$$;

DROP POLICY IF EXISTS "Teachers can view assigned students profiles" ON user_profiles;
CREATE POLICY "Teachers can view assigned students profiles"
  ON user_profiles FOR SELECT
  USING (
    is_profile_of_my_assigned_student(id)
  );
