-- ═══════════════════════════════════════════════════════════════════════
-- PARENTS CAN VIEW THEIR LINKED CHILD'S user_profiles ROW
-- ═══════════════════════════════════════════════════════════════════════
--
-- user_profiles only ever had a SELECT policy for the row's own owner
-- (auth_user_id = auth.uid()) - there was never a parent-facing policy at
-- all. /parent/dashboard reads the linked child's full_name via a
-- user_profiles lookup keyed by students.user_profile_id; with no policy
-- granting that, the lookup silently returned zero rows (RLS default-deny,
-- not an error) and every child's name rendered as "-" - looked like the
-- whole "anak terhubung" section was empty even though the link, class,
-- school and attempt-count queries were all working fine.
--
-- Checked for the same recursion shape as 012-015 before adding this: the
-- SECURITY DEFINER helper bypasses RLS entirely for every table it reads
-- (students, parent_student_links, parents, user_profiles included), so
-- none of its internal queries re-trigger this new policy or any other
-- policy on any of those tables - no cycle possible.
--
-- Safe to run once. Idempotent (CREATE OR REPLACE + DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION is_profile_of_my_linked_child(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students
    WHERE user_profile_id = target_profile_id
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

DROP POLICY IF EXISTS "Parents can view linked children profiles" ON user_profiles;
CREATE POLICY "Parents can view linked children profiles"
  ON user_profiles FOR SELECT
  USING (
    is_profile_of_my_linked_child(id)
  );
