-- ═══════════════════════════════════════════════════════════════════════
-- SCHOOL ADMINS CAN VIEW THEIR TEACHERS' AND STUDENTS' user_profiles ROWS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Same gap as 016 (parents) and 017 (teachers) again, this time for
-- SCHOOL_ADMIN: user_profiles never had a policy granting an admin
-- visibility into the profiles of the teachers/students in the school(s)
-- they manage. AdminStudents (just migrated off mock data) and the
-- existing real AdminTeachers/AdminDashboard screens all read names via a
-- nested user_profiles(full_name) embed keyed by teachers.user_profile_id
-- or students.user_profile_id - with no policy granting that read, every
-- name across the whole admin portal silently rendered as "-".
--
-- Checked for the same recursion shape as 012-018 before adding this: the
-- SECURITY DEFINER helper bypasses RLS entirely for every table it reads
-- (teachers, students, user_profiles included), so none of its internal
-- queries re-trigger this new policy or any other policy on any of those
-- tables - no cycle possible.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION is_profile_in_my_admin_schools(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teachers
    WHERE user_profile_id = target_profile_id
    AND school_id IN (SELECT get_my_school_admin_school_ids())
  ) OR EXISTS (
    SELECT 1 FROM students
    WHERE user_profile_id = target_profile_id
    AND school_id IN (SELECT get_my_school_admin_school_ids())
  );
$$;

DROP POLICY IF EXISTS "School admins can view profiles in their school" ON user_profiles;
CREATE POLICY "School admins can view profiles in their school"
  ON user_profiles FOR SELECT
  USING (
    is_profile_in_my_admin_schools(id)
  );
