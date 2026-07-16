-- ═══════════════════════════════════════════════════════════════════════
-- STUDENTS AND PARENTS CAN VIEW THEIR OWN / LINKED CHILD'S CLASS
-- ═══════════════════════════════════════════════════════════════════════
--
-- classes only ever had SELECT policies for teachers (their own classes)
-- and school admins (their own school) - a student reading their own
-- class name, or a parent reading a linked child's class name, silently
-- got nothing back (RLS returns zero rows, not an error), so every screen
-- that shows a class name for a student/parent has been quietly falling
-- back to "-" since the schema was first created. Not something today's
-- recursion bug caused - found while re-verifying 013's fix.
--
-- Checked for the same recursion shape as 012/013 before adding this:
-- neither of the two new policies below query classes from within any
-- students/parent_student_links policy, and neither existing classes
-- policy queries students/parent_student_links - no cycle in either
-- direction. The student-facing policy reuses get_my_active_class_id()
-- from 013 (already SECURITY DEFINER, already proven safe); the
-- parent-facing one follows the same SECURITY DEFINER pattern as 004's
-- is_student_in_my_admin_schools so it never re-triggers students' or
-- parent_student_links' own RLS.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

DROP POLICY IF EXISTS "Students can view their own class" ON classes;
CREATE POLICY "Students can view their own class"
  ON classes FOR SELECT
  USING (
    id = get_my_active_class_id()
  );

CREATE OR REPLACE FUNCTION is_class_of_my_linked_child(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE class_id = cid
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

DROP POLICY IF EXISTS "Parents can view classes of linked children" ON classes;
CREATE POLICY "Parents can view classes of linked children"
  ON classes FOR SELECT
  USING (
    is_class_of_my_linked_child(id)
  );
