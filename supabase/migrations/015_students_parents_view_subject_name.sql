-- ═══════════════════════════════════════════════════════════════════════
-- STUDENTS AND PARENTS CAN VIEW THEIR OWN SCHOOL'S SUBJECT NAMES
-- ═══════════════════════════════════════════════════════════════════════
--
-- subjects only ever had SELECT policies for teachers (subjects they teach)
-- and school admins (their own school) - same gap as 014 fixed for classes.
-- Any query joining assessments -> subjects for a student or parent (e.g.
-- computing real per-subject score averages) got subjects: null back, so
-- every subject label silently fell back to "Umum" instead of the real
-- name. Found while verifying 014's fix and wiring real score
-- trend/subject-mastery data for StudentProgress and ParentProgress.
--
-- Checked for the same recursion shape as 012/013/014 before adding this:
-- neither new policy queries subjects from within any students/
-- parent_student_links policy, and neither existing subjects policy
-- queries students/parent_student_links - no cycle in either direction.
-- Both helpers are SECURITY DEFINER (same pattern as 013/014) so they
-- never re-trigger RLS on students/parent_student_links/parents.
--
-- Subjects are school-scoped, not class-scoped, so this grants visibility
-- to all of the student's/linked child's own school's subject names (e.g.
-- "Matematika", "Fisika") - not a narrower per-class-assignment scope.
-- That matches how subjects already work for everyone else in this schema
-- (a catalog of the school's subjects, not per-class secrets).
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION get_my_active_school_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM students
  WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
  AND status = 'ACTIVE';
$$;

DROP POLICY IF EXISTS "Students can view subjects in their school" ON subjects;
CREATE POLICY "Students can view subjects in their school"
  ON subjects FOR SELECT
  USING (
    school_id = get_my_active_school_id()
  );

CREATE OR REPLACE FUNCTION is_school_of_my_linked_child(sch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE school_id = sch_id
    AND id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id IN (
        SELECT id FROM parents WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
      AND verified = TRUE
    )
  );
$$;

DROP POLICY IF EXISTS "Parents can view subjects in linked child's school" ON subjects;
CREATE POLICY "Parents can view subjects in linked child's school"
  ON subjects FOR SELECT
  USING (
    is_school_of_my_linked_child(school_id)
  );
