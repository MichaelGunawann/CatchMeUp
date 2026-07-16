-- ═══════════════════════════════════════════════════════════════════════
-- FIX: infinite recursion in RLS policies, round 2 - students <-> parent_student_links
-- ═══════════════════════════════════════════════════════════════════════
--
-- After 003_fix_school_admins_recursion.sql, a second cycle surfaced in
-- live testing: students' own "Parents can view linked students only"
-- policy queries parent_student_links, and parent_student_links'
-- "School admins can manage links for their students" policy queried
-- students right back - a two-table cycle causing "infinite recursion
-- detected in policy for relation students" (42P17) on every query that
-- touches the students table (which is most of the schema).
--
-- Fix: a SECURITY DEFINER helper function that checks student/school
-- membership without re-triggering RLS on students, used by the
-- parent_student_links policy instead of a raw subquery on students.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION is_student_in_my_admin_schools(sid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE id = sid
    AND school_id IN (SELECT get_my_school_admin_school_ids())
  );
$$;

DROP POLICY IF EXISTS "School admins can manage links for their students" ON parent_student_links;
CREATE POLICY "School admins can manage links for their students"
  ON parent_student_links FOR ALL
  USING (
    is_student_in_my_admin_schools(student_id)
  )
  WITH CHECK (
    is_student_in_my_admin_schools(student_id)
  );
