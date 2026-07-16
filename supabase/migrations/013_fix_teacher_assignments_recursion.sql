-- ═══════════════════════════════════════════════════════════════════════
-- FIX: infinite recursion in RLS policies, round 3 - teacher_assignments <-> students
-- ═══════════════════════════════════════════════════════════════════════
--
-- 012_student_view_own_assignments.sql added a policy on teacher_assignments
-- that subqueries students directly. But students already has "Teachers can
-- view students in assigned classes" (002_rls_policies.sql), which
-- subqueries teacher_assignments right back - a two-table cycle, same
-- shape as the school_admins<->students and students<->parent_student_links
-- cycles fixed by 003 and 004. Postgres evaluates every policy on a table
-- for every query against it, so this made "infinite recursion detected in
-- policy for relation teacher_assignments" (42P17) fire on any query that
-- touches teacher_assignments OR students - which is most dashboards,
-- across every role, not just students.
--
-- Fix: same technique as 004 - a SECURITY DEFINER helper function that
-- reads the caller's own class_id without re-triggering RLS on students
-- (SECURITY DEFINER functions run as their owner, which is exempt from RLS
-- on tables it owns, unless FORCE ROW LEVEL SECURITY is set - it isn't
-- here), used by the teacher_assignments policy instead of a raw subquery.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).
-- Run this immediately - until it's applied, every dashboard that touches
-- students or teacher_assignments (i.e. almost all of them) is broken.

CREATE OR REPLACE FUNCTION get_my_active_class_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT class_id FROM students
  WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
  AND status = 'ACTIVE';
$$;

DROP POLICY IF EXISTS "Students can view assignments for their own class" ON teacher_assignments;
CREATE POLICY "Students can view assignments for their own class"
  ON teacher_assignments FOR SELECT
  USING (
    class_id = get_my_active_class_id()
  );
