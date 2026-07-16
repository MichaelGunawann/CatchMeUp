-- ═══════════════════════════════════════════════════════════════════════
-- SCHOOL SELF-REGISTRATION + PLATFORM ADMIN APPROVAL
-- ═══════════════════════════════════════════════════════════════════════
--
-- Mirrors the teacher/student onboarding pattern (see
-- 005_teacher_student_onboarding.sql), one level up: a school can now be
-- self-registered (school info + its first School Admin, created
-- together) instead of only being provisionable by direct SQL access.
-- The new school starts status='PENDING' and is invisible to the rest of
-- the product until a PLATFORM_ADMIN approves it - approval is a
-- server-route-only mutation (supabaseAdmin/service-role), never an RLS
-- UPDATE grant, following the same field-scoped-mutation discipline
-- already established for teacher/student approval.
--
-- Safe to run once against the live project: uses IF NOT EXISTS / DO
-- blocks / CREATE OR REPLACE / DROP POLICY IF EXISTS throughout.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. schools.status
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN
    ALTER TABLE schools ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED'));
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Schools that already exist today are already-operating, real schools -
-- treat them as pre-approved so this migration cannot lock out any
-- existing School Admin.
UPDATE schools SET status = 'ACTIVE' WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Helper functions
-- ═══════════════════════════════════════════════════════════════════════

-- Every existing "school admin scope" policy (teachers, students, classes,
-- subjects, teacher_assignments, questions, materials, assessments,
-- parent_registration_invites, parent_student_links) calls
-- get_my_school_admin_school_ids(). Redefining it to only return ACTIVE
-- schools means a School Admin whose school is still PENDING (or was
-- REJECTED) automatically loses all derived access everywhere, with no
-- need to touch ~20 individual policies again.
CREATE OR REPLACE FUNCTION get_my_school_admin_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT sa.school_id
  FROM school_admins sa
  JOIN schools s ON s.id = sa.school_id
  WHERE sa.user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
  AND s.status = 'ACTIVE';
$$;

-- Status-independent variant, used ONLY by the "view my own managed
-- schools" policy on `schools` itself so a School Admin whose school is
-- still PENDING or was REJECTED can still see that one row (to render a
-- pending/rejected banner) without granting them any derived access to
-- teachers/students/classes/etc for it.
CREATE OR REPLACE FUNCTION get_my_school_admin_school_ids_all()
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

-- ═══════════════════════════════════════════════════════════════════════
-- 3. schools RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Restrict the previously wide-open "Anyone can view schools for
-- registration" policy (migration 005) to ACTIVE schools only, so the
-- teacher/student registration combobox can never surface a school that
-- hasn't been approved yet (or was rejected).
DROP POLICY IF EXISTS "Anyone can view schools for registration" ON schools;
CREATE POLICY "Anyone can view active schools for registration"
  ON schools FOR SELECT
  USING (status = 'ACTIVE');

-- A School Admin must be able to see their own managed school(s)
-- regardless of status, so a pending/rejected registration renders its
-- own status banner instead of silently looking like a 404.
CREATE POLICY "School admins can view their own managed schools"
  ON schools FOR SELECT
  USING (
    id IN (SELECT get_my_school_admin_school_ids_all())
  );

-- PLATFORM_ADMIN needs visibility into every school (including
-- PENDING/REJECTED) to review registration requests. Read-only - the
-- approval mutation itself never goes through an RLS UPDATE grant (see
-- /api/platform-admin/approve-school).
CREATE POLICY "Platform admins can view all schools"
  ON schools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'PLATFORM_ADMIN'
    )
  );

-- CRITICAL: no INSERT/UPDATE/DELETE allowed via RLS for anyone. School
-- creation happens only through /api/register-school (service role), and
-- approval only through /api/platform-admin/approve-school (service
-- role, field-scoped to `status` alone) - never a direct client mutation.
DROP POLICY IF EXISTS "Schools creation blocked" ON schools;
CREATE POLICY "Schools creation blocked"
  ON schools FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Schools update blocked" ON schools;
CREATE POLICY "Schools update blocked"
  ON schools FOR UPDATE
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Schools deletion blocked" ON schools;
CREATE POLICY "Schools deletion blocked"
  ON schools FOR DELETE
  USING (FALSE);
