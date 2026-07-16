-- ═══════════════════════════════════════════════════════════════════════
-- GAMIFICATION, PLATFORM SETTINGS, PRACTICE ATTEMPTS, ASSESSMENT STYLE
-- TEMPLATES, TEACHER AI SETTINGS, ACTIVITY LOG
-- ═══════════════════════════════════════════════════════════════════════
--
-- Phase 0 of the complete mock-data-elimination migration: none of this
-- schema existed before (confirmed by grepping 001-006 for
-- xp|streak|achievement|setting|config|session|activity - zero real
-- hits). This lands first because several later phases (grading,
-- practice, admin analytics) write into these tables.
--
-- Safe to run once against the live project: IF NOT EXISTS / DO blocks /
-- DROP POLICY IF EXISTS throughout.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Gamification columns on students
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE students ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- xp/streak_days/last_active_date/last_active_at are only ever written by
-- service-role routes (assessment/practice submit routes) - no RLS
-- change needed here, existing students SELECT policies already cover
-- reading these new columns at the row level.

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Achievements catalog + student_achievements
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'score', 'mastery', 'rank', 'practice')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO achievements (code, title, description, category, xp_reward, icon)
VALUES
  ('rajin_berlatih', 'Rajin Berlatih', 'Kerjakan 100 soal latihan', 'practice', 50, 'BookOpen'),
  ('nilai_sempurna', 'Nilai Sempurna', 'Skor 100 dalam satu asesmen', 'score', 200, 'Gem'),
  ('ahli_tiga_topik', 'Ahli Tiga Topik', 'Capai Mahir di 3 topik berbeda', 'mastery', 300, 'GraduationCap'),
  ('comeback_king', 'Comeback King', 'Tingkatkan nilai 20+ poin dari asesmen sebelumnya', 'score', 250, 'Zap'),
  ('juara_kelas', 'Juara Kelas', 'Raih peringkat 1 dalam asesmen manapun', 'rank', 400, 'Crown'),
  ('streak_seminggu', 'Konsisten Seminggu', 'Belajar 7 hari berturut-turut', 'streak', 150, 'Flame'),
  ('streak_sebulan', 'Konsisten Sebulan', 'Belajar 30 hari berturut-turut', 'streak', 500, 'Flame'),
  ('penjelajah_soal', 'Penjelajah Soal', 'Kerjakan soal dari 5 mata pelajaran berbeda', 'practice', 100, 'BookOpen')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view the achievements catalog" ON achievements;
CREATE POLICY "Anyone authenticated can view the achievements catalog"
  ON achievements FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Achievements catalog is managed outside RLS" ON achievements;
CREATE POLICY "Achievements catalog is managed outside RLS"
  ON achievements FOR INSERT
  WITH CHECK (FALSE);

CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own earned achievements" ON student_achievements;
CREATE POLICY "Students can view their own earned achievements"
  ON student_achievements FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view achievements for their students" ON student_achievements;
CREATE POLICY "Teachers can view achievements for their students"
  ON student_achievements FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE class_id IN (
        SELECT class_id FROM teacher_assignments
        WHERE teacher_id IN (
          SELECT id FROM teachers WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Parents can view linked children achievements" ON student_achievements;
CREATE POLICY "Parents can view linked children achievements"
  ON student_achievements FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id IN (
        SELECT id FROM parents WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
      )
      AND verified = TRUE
    )
  );

DROP POLICY IF EXISTS "School admins can view achievements in their school" ON student_achievements;
CREATE POLICY "School admins can view achievements in their school"
  ON student_achievements FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE school_id IN (SELECT get_my_school_admin_school_ids())
    )
  );

-- CRITICAL: no client INSERT/UPDATE/DELETE. Achievements are awarded only
-- by service-role grading/practice-submit routes, same trust boundary as
-- xp/streak - never client-writable.
DROP POLICY IF EXISTS "Achievement awards are service-role only" ON student_achievements;
CREATE POLICY "Achievement awards are service-role only"
  ON student_achievements FOR INSERT
  WITH CHECK (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Practice attempts (untimed "Latihan Adaptif", not tied to an
--    assessments row)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS practice_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_id ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_question_id ON practice_attempts(question_id);

ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own practice attempts" ON practice_attempts;
CREATE POLICY "Students can view their own practice attempts"
  ON practice_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can view practice attempts for their students" ON practice_attempts;
CREATE POLICY "Teachers can view practice attempts for their students"
  ON practice_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE class_id IN (
        SELECT class_id FROM teacher_assignments
        WHERE teacher_id IN (
          SELECT id FROM teachers WHERE user_profile_id = (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  );

-- CRITICAL: is_correct must never be client-writable (same grading-integrity
-- rule as assessment/question_attempts) - only /api/student/practice/submit
-- (service role, grades server-side against questions.correct_answer) may
-- insert these rows.
DROP POLICY IF EXISTS "Practice attempts are service-role only" ON practice_attempts;
CREATE POLICY "Practice attempts are service-role only"
  ON practice_attempts FOR INSERT
  WITH CHECK (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Assessment style templates ("Gaya Asesmen" presets)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS assessment_style_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  style_type TEXT,
  default_duration_minutes INTEGER,
  default_question_count INTEGER,
  randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
  randomize_options BOOLEAN NOT NULL DEFAULT FALSE,
  allow_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_style_templates_school_id ON assessment_style_templates(school_id);

ALTER TABLE assessment_style_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view style templates in their school" ON assessment_style_templates;
CREATE POLICY "Teachers can view style templates in their school"
  ON assessment_style_templates FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM teachers
      WHERE user_profile_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Teachers can create style templates in their school" ON assessment_style_templates;
CREATE POLICY "Teachers can create style templates in their school"
  ON assessment_style_templates FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
    AND school_id = (
      SELECT school_id FROM teachers
      WHERE user_profile_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Teachers can update their own style templates" ON assessment_style_templates;
CREATE POLICY "Teachers can update their own style templates"
  ON assessment_style_templates FOR UPDATE
  USING (created_by = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (created_by = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "School admins can manage style templates in their school" ON assessment_style_templates;
CREATE POLICY "School admins can manage style templates in their school"
  ON assessment_style_templates FOR ALL
  USING (school_id IN (SELECT get_my_school_admin_school_ids()))
  WITH CHECK (school_id IN (SELECT get_my_school_admin_school_ids()));

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Teacher AI settings ("Konfigurasi AI")
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS teacher_ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID UNIQUE NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  active_style TEXT NOT NULL DEFAULT 'socratic' CHECK (active_style IN ('socratic', 'explicit', 'analogy')),
  grounding_required BOOLEAN NOT NULL DEFAULT TRUE,
  auto_review BOOLEAN NOT NULL DEFAULT FALSE,
  parent_reports BOOLEAN NOT NULL DEFAULT TRUE,
  bloom_balance BOOLEAN NOT NULL DEFAULT TRUE,
  notify_weak BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE teacher_ai_settings ENABLE ROW LEVEL SECURITY;

-- Safe for direct anon-key access: a teacher can only ever read/write
-- their own single row (UNIQUE teacher_id), no cross-tenant read at all.
DROP POLICY IF EXISTS "Teachers can manage their own AI settings" ON teacher_ai_settings;
CREATE POLICY "Teachers can manage their own AI settings"
  ON teacher_ai_settings FOR ALL
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Platform settings (singleton)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_name TEXT NOT NULL DEFAULT 'Catch Up',
  admin_contact_email TEXT,
  login_attempt_limit INTEGER NOT NULL DEFAULT 5,
  session_ttl_hours INTEGER NOT NULL DEFAULT 8,
  report_notification_email TEXT,
  updated_at TIMESTAMP DEFAULT now(),
  updated_by UUID REFERENCES user_profiles(id)
);

INSERT INTO platform_settings (platform_name)
SELECT 'Catch Up' WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view platform settings" ON platform_settings;
CREATE POLICY "Platform admins can view platform settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND role = 'PLATFORM_ADMIN'
    )
  );

-- CRITICAL: no RLS UPDATE grant - mutation only via
-- /api/platform-admin/update-settings (service role, field-scoped),
-- same discipline as every other sensitive mutation this session.
DROP POLICY IF EXISTS "Platform settings update blocked" ON platform_settings;
CREATE POLICY "Platform settings update blocked"
  ON platform_settings FOR UPDATE
  WITH CHECK (FALSE);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Activity log (minimal heartbeat, backs "Pengguna Aktif Hari Ini")
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON activity_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_profile_id ON activity_log(user_profile_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Low-stakes: any authenticated user may log their own heartbeat directly.
DROP POLICY IF EXISTS "Users can log their own activity" ON activity_log;
CREATE POLICY "Users can log their own activity"
  ON activity_log FOR INSERT
  WITH CHECK (
    user_profile_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Platform admins can view all activity" ON activity_log;
CREATE POLICY "Platform admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND role = 'PLATFORM_ADMIN'
    )
  );
