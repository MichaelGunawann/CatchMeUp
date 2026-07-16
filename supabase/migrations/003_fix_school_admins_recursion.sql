-- ═══════════════════════════════════════════════════════════════════════
-- FIX: infinite recursion in RLS policies referencing school_admins
-- ═══════════════════════════════════════════════════════════════════════
--
-- Found via live validation testing (not detectable by static review):
-- any policy that queries school_admins from within another policy on
-- school_admins itself (or that Postgres evaluates alongside such a
-- policy, since RLS policies for the same command are OR'd together)
-- causes "infinite recursion detected in policy for relation
-- school_admins" (error 42P17). This broke RLS across nearly every table
-- for every role, since almost all "school admin scope" policies queried
-- school_admins directly.
--
-- Fix: a SECURITY DEFINER helper function that looks up the current
-- user's managed school_ids without re-triggering RLS on school_admins,
-- referenced via `IN (SELECT get_my_school_admin_school_ids())` instead
-- of a raw subquery everywhere. This also fixes a second, separate bug:
-- parent_registration_invites and parent_student_links compared
-- school_id to that subquery with `=` instead of `IN`, which would have
-- thrown "more than one row returned by a subquery" for any admin who
-- manages more than one school.
--
-- Safe to run once against the live project. Uses CREATE OR REPLACE for
-- the function and DROP POLICY IF EXISTS + CREATE POLICY for every
-- affected policy, so it will not error if anything here has already
-- been (partially) applied.

CREATE OR REPLACE FUNCTION get_my_school_admin_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM school_admins
  WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  );
$$;

-- school_admins
DROP POLICY IF EXISTS "School admins can view admins in their school" ON school_admins;
CREATE POLICY "School admins can view admins in their school"
  ON school_admins FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- teachers
DROP POLICY IF EXISTS "School admins can view teachers in their school" ON teachers;
CREATE POLICY "School admins can view teachers in their school"
  ON teachers FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- students
DROP POLICY IF EXISTS "School admins can view students in their school" ON students;
CREATE POLICY "School admins can view students in their school"
  ON students FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- classes
DROP POLICY IF EXISTS "School admins can manage classes in their school" ON classes;
CREATE POLICY "School admins can manage classes in their school"
  ON classes FOR ALL
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- subjects
DROP POLICY IF EXISTS "School admins can manage subjects in their school" ON subjects;
CREATE POLICY "School admins can manage subjects in their school"
  ON subjects FOR ALL
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- teacher_assignments
DROP POLICY IF EXISTS "School admins can manage assignments in their school" ON teacher_assignments;
CREATE POLICY "School admins can manage assignments in their school"
  ON teacher_assignments FOR ALL
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- parent_registration_invites (also fixes the separate `=` multi-school bug)
DROP POLICY IF EXISTS "School admins can create invitations for their students" ON parent_registration_invites;
CREATE POLICY "School admins can create invitations for their students"
  ON parent_registration_invites FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE school_id IN (SELECT get_my_school_admin_school_ids())
    )
    AND created_by = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- parent_student_links (also fixes the separate `=` multi-school bug)
DROP POLICY IF EXISTS "School admins can manage links for their students" ON parent_student_links;
CREATE POLICY "School admins can manage links for their students"
  ON parent_student_links FOR ALL
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE school_id IN (SELECT get_my_school_admin_school_ids())
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE school_id IN (SELECT get_my_school_admin_school_ids())
    )
  );

-- questions
DROP POLICY IF EXISTS "School admins can view questions in their school" ON questions;
CREATE POLICY "School admins can view questions in their school"
  ON questions FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- materials
DROP POLICY IF EXISTS "School admins can view materials in their school" ON materials;
CREATE POLICY "School admins can view materials in their school"
  ON materials FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );

-- assessments
DROP POLICY IF EXISTS "School admins can view assessments in their school" ON assessments;
CREATE POLICY "School admins can view assessments in their school"
  ON assessments FOR SELECT
  USING (
    school_id IN (SELECT get_my_school_admin_school_ids())
  );
