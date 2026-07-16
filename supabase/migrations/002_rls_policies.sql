-- ═══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY SETUP
-- ═══════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_registration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_wrong_answers ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- USER PROFILES RLS
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Only PLATFORM_ADMIN can create user profiles (system provisioning)
-- Authenticated users cannot create via RLS
CREATE POLICY "User profiles creation blocked"
  ON user_profiles FOR INSERT
  WITH CHECK (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- SCHOOL ADMINS RLS - CRITICAL SECURITY
-- ═══════════════════════════════════════════════════════════════════════

-- School admins can view their own record
CREATE POLICY "School admins can view their own admin record"
  ON school_admins FOR SELECT
  USING (
    user_profile_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- School admins can view other admins in their school(s) (for visibility)
CREATE POLICY "School admins can view admins in their school"
  ON school_admins FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- CRITICAL: No INSERT allowed via RLS
-- School admin creation is PLATFORM_ADMIN-only, handled server-side
CREATE POLICY "School admin creation blocked"
  ON school_admins FOR INSERT
  WITH CHECK (FALSE);

-- No UPDATE/DELETE allowed via RLS
CREATE POLICY "School admin updates blocked"
  ON school_admins FOR UPDATE
  WITH CHECK (FALSE);

CREATE POLICY "School admin deletion blocked"
  ON school_admins FOR DELETE
  USING (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- TEACHERS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Teachers can view their own record
CREATE POLICY "Teachers can view their own record"
  ON teachers FOR SELECT
  USING (
    user_profile_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- School admins can view teachers in their school(s)
CREATE POLICY "School admins can view teachers in their school"
  ON teachers FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- STUDENTS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view their own record
CREATE POLICY "Students can view their own record"
  ON students FOR SELECT
  USING (
    user_profile_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Teachers can view students in their assigned classes
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
      )
    )
  );

-- School admins can view students in their school(s)
CREATE POLICY "School admins can view students in their school"
  ON students FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Parents can view explicitly linked students only
CREATE POLICY "Parents can view linked students only"
  ON students FOR SELECT
  USING (
    id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id IN (
        SELECT id FROM parents
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
      AND verified = TRUE
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- CLASSES RLS
-- ═══════════════════════════════════════════════════════════════════════

-- School admins can manage classes in their school(s)
CREATE POLICY "School admins can manage classes in their school"
  ON classes FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can view classes they teach
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
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- SUBJECTS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- School admins can manage subjects in their school(s)
CREATE POLICY "School admins can manage subjects in their school"
  ON subjects FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can view subjects they teach
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
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- TEACHER ASSIGNMENTS RLS - SCHOOL ADMIN CONTROL
-- ═══════════════════════════════════════════════════════════════════════

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view their own assignments"
  ON teacher_assignments FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- School admins can manage teacher assignments for their school(s)
CREATE POLICY "School admins can manage assignments in their school"
  ON teacher_assignments FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- PARENT REGISTRATION INVITES RLS - SERVER ENDPOINT ONLY
-- ═══════════════════════════════════════════════════════════════════════

-- School admins can create invitations for students in their school
CREATE POLICY "School admins can create invitations for their students"
  ON parent_registration_invites FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE school_id = (
        SELECT school_id FROM school_admins
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
    AND created_by = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- School admins can view invitations they created
CREATE POLICY "School admins can view invitations they created"
  ON parent_registration_invites FOR SELECT
  USING (
    created_by = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Parents can only view their own used invitation (after registration)
CREATE POLICY "Parents can view their used invitation"
  ON parent_registration_invites FOR SELECT
  USING (
    used_by = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE via RLS (server-side only)
CREATE POLICY "Invitation updates blocked"
  ON parent_registration_invites FOR UPDATE
  WITH CHECK (FALSE);

CREATE POLICY "Invitation deletions blocked"
  ON parent_registration_invites FOR DELETE
  USING (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- PARENTS RLS - CREATION VIA TRANSACTION ONLY
-- ═══════════════════════════════════════════════════════════════════════

-- Parents can view their own record
CREATE POLICY "Parents can view their own record"
  ON parents FOR SELECT
  USING (
    user_profile_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- CRITICAL: No INSERT allowed via RLS
-- Parent creation is server-side transaction-safe only
CREATE POLICY "Parent creation blocked via RLS"
  ON parents FOR INSERT
  WITH CHECK (FALSE);

-- No UPDATE/DELETE via RLS
CREATE POLICY "Parent updates blocked"
  ON parents FOR UPDATE
  WITH CHECK (FALSE);

CREATE POLICY "Parent deletions blocked"
  ON parents FOR DELETE
  USING (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- PARENT-STUDENT LINKS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Parents can view their own links
CREATE POLICY "Parents can view their own links"
  ON parent_student_links FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parents
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- School admins can manage links for students in their school
CREATE POLICY "School admins can manage links for their students"
  ON parent_student_links FOR ALL
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE school_id = (
        SELECT school_id FROM school_admins
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE school_id = (
        SELECT school_id FROM school_admins
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- QUESTIONS RLS - TEACHER CREATION WITH SCOPE CONTROL
-- ═══════════════════════════════════════════════════════════════════════

-- Teachers can view questions for their assigned subjects
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
      )
    )
  );

-- School admins can view questions in their school(s)
CREATE POLICY "School admins can view questions in their school"
  ON questions FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can create questions ONLY for subjects in their assignments
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
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- MATERIALS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view materials for their class
CREATE POLICY "Students can view materials for their class"
  ON materials FOR SELECT
  USING (
    (school_id = (
      SELECT school_id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    ))
    AND (
      class_id IS NULL
      OR class_id = (
        SELECT class_id FROM students
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Teachers can view materials for their assigned classes
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
      )
    )
  );

-- Teachers can create materials for their assigned classes
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
      )
    )
  );

-- School admins can view materials in their school(s)
CREATE POLICY "School admins can view materials in their school"
  ON materials FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Parents can view materials for linked children's classes
CREATE POLICY "Parents can view materials for linked children"
  ON materials FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM students
      WHERE id IN (
        SELECT student_id FROM parent_student_links
        WHERE parent_id IN (
          SELECT id FROM parents
          WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
        )
        AND verified = TRUE
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ASSESSMENTS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view assessments for their class
CREATE POLICY "Students can view assessments for their class"
  ON assessments FOR SELECT
  USING (
    class_id = (
      SELECT class_id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
    AND status = 'published'
  );

-- Teachers can view assessments for their assigned classes
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
      )
    )
  );

-- Teachers can create assessments for their assigned classes
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
      )
    )
  );

-- Teachers can update/delete their own assessments
CREATE POLICY "Teachers can update their own assessments"
  ON assessments FOR UPDATE
  USING (
    creator_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id = (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- School admins can view assessments in their school(s)
CREATE POLICY "School admins can view assessments in their school"
  ON assessments FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_admins
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Parents can view assessments for linked children
CREATE POLICY "Parents can view assessments for linked children"
  ON assessments FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM students
      WHERE id IN (
        SELECT student_id FROM parent_student_links
        WHERE parent_id IN (
          SELECT id FROM parents
          WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
        )
        AND verified = TRUE
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ASSESSMENT QUESTIONS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Teachers can view assessment questions for their assessments
CREATE POLICY "Teachers can view assessment questions"
  ON assessment_questions FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE creator_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can manage assessment questions for their assessments
CREATE POLICY "Teachers can manage assessment questions"
  ON assessment_questions FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE creator_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE creator_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ASSESSMENT ATTEMPTS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view their own attempts
CREATE POLICY "Students can view their own attempts"
  ON assessment_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Students can create and update their own attempts
CREATE POLICY "Students can create their own attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students can update their own attempts"
  ON assessment_attempts FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can view attempt results for their students
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
        )
      )
    )
  );

-- Parents can view attempts for linked children
CREATE POLICY "Parents can view linked children attempts"
  ON assessment_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id IN (
        SELECT id FROM parents
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
      AND verified = TRUE
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- QUESTION ATTEMPTS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view their own question attempts
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
      )
    )
  );

-- Students can create and update their question attempts
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
      )
    )
  );

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
      )
    )
  );

-- Teachers can view question attempts for their students' assessments
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
          )
        )
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- STUDENT WRONG ANSWERS RLS
-- ═══════════════════════════════════════════════════════════════════════

-- Students can view their own wrong answers
CREATE POLICY "Students can view their wrong answers"
  ON student_wrong_answers FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Students can create wrong answer records
CREATE POLICY "Students can create wrong answer records"
  ON student_wrong_answers FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students
      WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Teachers can view wrong answers for their students
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
        )
      )
    )
  );

-- Parents can view wrong answers for linked children
CREATE POLICY "Parents can view linked children wrong answers"
  ON student_wrong_answers FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id IN (
        SELECT id FROM parents
        WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
      AND verified = TRUE
    )
  );
