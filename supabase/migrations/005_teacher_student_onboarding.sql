-- ═══════════════════════════════════════════════════════════════════════
-- TEACHER/STUDENT ONBOARDING: pending/approval state
-- ═══════════════════════════════════════════════════════════════════════
--
-- Adds a minimal PENDING -> ACTIVE/REJECTED state to teachers/students so
-- self-registered accounts require school-admin approval before they can
-- touch any protected data. Enforced at the RLS layer (not just hidden in
-- the UI): every existing policy that used a teachers/students lookup to
-- grant DERIVED access to other tables now also requires status='ACTIVE'.
-- Policies that let a user see their OWN teachers/students row are left
-- untouched, since a pending user must be able to see their own status.
--
-- Approval/rejection itself does NOT go through a new RLS UPDATE policy -
-- per explicit instruction, school admins get no direct write path to
-- teachers/students at all. The mutation is server-side only
-- (POST /api/school-admin/approve-registration), using the service role
-- key, with the server code itself constraining which columns can change
-- (status, and class_id only for students) - RLS stays exactly as strict
-- as before for these two tables (no new UPDATE policy added).
--
-- Idempotent: safe to run once, and safe to re-run if partially applied.

-- ═══════════════════════════════════════════════════════════════════════
-- SCHEMA CHANGES
-- ═══════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE teachers ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED'));
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED'));
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- A self-registered student doesn't know their class at registration time
-- (only name/email/password/school are collected) - the school admin
-- assigns/confirms it, optionally at approval time. NULL means "approved
-- or pending, not yet placed in a class"; existing class-scoped policies
-- already treat NULL as "matches nothing", so this is safe by construction.
ALTER TABLE students ALTER COLUMN class_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- ═══════════════════════════════════════════════════════════════════════
-- PUBLIC SCHOOL DIRECTORY (for the registration combobox)
-- ═══════════════════════════════════════════════════════════════════════
--
-- The searchable school combobox must query real schools before the user
-- has an account. schools has no public-read policy today (only "School
-- admins can view their school(s)"). name/city/province/npsn are
-- non-sensitive directory data (NPSN is already a public national school
-- ID), so a public SELECT is additive and doesn't touch any other policy.

DROP POLICY IF EXISTS "Anyone can view schools for registration" ON schools;
CREATE POLICY "Anyone can view schools for registration"
  ON schools FOR SELECT
  USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- STATUS-GATED POLICIES: TEACHER-DERIVED ACCESS
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Teachers can view students in assigned classes" ON students;
CREATE POLICY "Teachers can view students in assigned classes"
  ON students FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;
CREATE POLICY "Teachers can view their classes"
  ON classes FOR SELECT
  USING (
    id IN (
      SELECT class_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view their subjects" ON subjects;
CREATE POLICY "Teachers can view their subjects"
  ON subjects FOR SELECT
  USING (
    id IN (
      SELECT subject_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view their own assignments" ON teacher_assignments;
CREATE POLICY "Teachers can view their own assignments"
  ON teacher_assignments FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Teachers can view questions for assigned subjects" ON questions;
CREATE POLICY "Teachers can view questions for assigned subjects"
  ON questions FOR SELECT
  USING (
    subject_id IN (
      SELECT subject_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can create questions for assigned subjects" ON questions;
CREATE POLICY "Teachers can create questions for assigned subjects"
  ON questions FOR INSERT
  WITH CHECK (
    creator_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
    AND subject_id IN (
      SELECT subject_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view materials for assigned classes" ON materials;
CREATE POLICY "Teachers can view materials for assigned classes"
  ON materials FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can create materials for assigned classes" ON materials;
CREATE POLICY "Teachers can create materials for assigned classes"
  ON materials FOR INSERT
  WITH CHECK (
    creator_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
    AND class_id IN (
      SELECT class_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view assessments for assigned classes" ON assessments;
CREATE POLICY "Teachers can view assessments for assigned classes"
  ON assessments FOR SELECT
  USING (
    (class_id, subject_id) IN (
      SELECT class_id, subject_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can create assessments for assigned classes" ON assessments;
CREATE POLICY "Teachers can create assessments for assigned classes"
  ON assessments FOR INSERT
  WITH CHECK (
    creator_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
    AND (class_id, subject_id) IN (
      SELECT class_id, subject_id FROM teacher_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view attempt results for their students" ON assessment_attempts;
CREATE POLICY "Teachers can view attempt results for their students"
  ON assessment_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE class_id IN (
        SELECT class_id FROM teacher_assignments
        WHERE teacher_id IN (
          SELECT id FROM teachers
          WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
          AND status = 'ACTIVE'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view question attempts for their assessments" ON question_attempts;
CREATE POLICY "Teachers can view question attempts for their assessments"
  ON question_attempts FOR SELECT
  USING (
    assessment_attempt_id IN (
      SELECT id FROM assessment_attempts
      WHERE student_id IN (
        SELECT id FROM students
        WHERE class_id IN (
          SELECT class_id FROM teacher_assignments
          WHERE teacher_id IN (
            SELECT id FROM teachers
            WHERE user_profile_id = (
              SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
            )
            AND status = 'ACTIVE'
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view student wrong answers" ON student_wrong_answers;
CREATE POLICY "Teachers can view student wrong answers"
  ON student_wrong_answers FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE class_id IN (
        SELECT class_id FROM teacher_assignments
        WHERE teacher_id IN (
          SELECT id FROM teachers
          WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
          AND status = 'ACTIVE'
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- STATUS-GATED POLICIES: STUDENT-DERIVED ACCESS
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Students can view materials for their class" ON materials;
CREATE POLICY "Students can view materials for their class"
  ON materials FOR SELECT
  USING (
    (school_id = (
      SELECT school_id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    ))
    AND (
      class_id IS NULL
      OR class_id = (
        SELECT class_id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Students can view assessments for their class" ON assessments;
CREATE POLICY "Students can view assessments for their class"
  ON assessments FOR SELECT
  USING (
    class_id = (
      SELECT class_id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
    AND status = 'published'
  );

DROP POLICY IF EXISTS "Students can view their own attempts" ON assessment_attempts;
CREATE POLICY "Students can view their own attempts"
  ON assessment_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Students can create their own attempts" ON assessment_attempts;
CREATE POLICY "Students can create their own attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Students can update their own attempts" ON assessment_attempts;
CREATE POLICY "Students can update their own attempts"
  ON assessment_attempts FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Students can view their question attempts" ON question_attempts;
CREATE POLICY "Students can view their question attempts"
  ON question_attempts FOR SELECT
  USING (
    assessment_attempt_id IN (
      SELECT id FROM assessment_attempts
      WHERE student_id IN (
        SELECT id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Students can create question attempts" ON question_attempts;
CREATE POLICY "Students can create question attempts"
  ON question_attempts FOR INSERT
  WITH CHECK (
    assessment_attempt_id IN (
      SELECT id FROM assessment_attempts
      WHERE student_id IN (
        SELECT id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Students can update question attempts" ON question_attempts;
CREATE POLICY "Students can update question attempts"
  ON question_attempts FOR UPDATE
  USING (
    assessment_attempt_id IN (
      SELECT id FROM assessment_attempts
      WHERE student_id IN (
        SELECT id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  )
  WITH CHECK (
    assessment_attempt_id IN (
      SELECT id FROM assessment_attempts
      WHERE student_id IN (
        SELECT id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Students can view their wrong answers" ON student_wrong_answers;
CREATE POLICY "Students can view their wrong answers"
  ON student_wrong_answers FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Students can create wrong answer records" ON student_wrong_answers;
CREATE POLICY "Students can create wrong answer records"
  ON student_wrong_answers FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'ACTIVE'
    )
  );
