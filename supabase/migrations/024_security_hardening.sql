-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING (found in user testing: "bisa akses database dari inspect")
-- ═══════════════════════════════════════════════════════════════════════
--
-- The browser talks to Supabase directly with the public anon key, so RLS
-- is the only thing standing between a signed-in user and the database.
-- A live probe with a student JWT found:
--
-- 1. CRITICAL - "Users can update own profile" let anyone UPDATE every
--    column of their own user_profiles row, including `role`. A student
--    could run one request from DevTools and become TEACHER / SCHOOL_ADMIN
--    / PLATFORM_ADMIN. The app never updates user_profiles from the
--    browser (all profile writes go through service-role API routes), so
--    the policy is dropped outright, and a trigger additionally refuses
--    any role / auth_user_id change not made by the service role.
--
-- 2. The answer-key reveal for finished assessments exposed the WHOLE
--    adaptive pool (e.g. 30 questions) to a student who only got 10 -
--    including answers to questions classmates may still be working on.
--    It now reveals only the questions that student actually received.
--
-- Safe to run more than once.

-- ── 1. Profile role escalation ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE OR REPLACE FUNCTION protect_user_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- service role (API routes) and the SQL editor (postgres) may still change it
  IF coalesce(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin')
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id) THEN
    RAISE EXCEPTION 'Peran akun hanya bisa diubah oleh sistem';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_identity ON user_profiles;
CREATE TRIGGER protect_user_profile_identity
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_user_profile_identity();

-- ── 2. Answer reveal limited to the student's own questions ─────────────
DROP POLICY IF EXISTS "Students can view questions for reviewable completed assessments" ON questions;
CREATE POLICY "Students can view questions for reviewable completed assessments"
  ON questions FOR SELECT
  USING (
    id IN (
      SELECT aq.question_id FROM assessment_questions aq
      JOIN assessments a ON a.id = aq.assessment_id
      JOIN assessment_attempts att ON att.assessment_id = a.id
      WHERE att.student_id IN (
        SELECT id FROM students WHERE user_profile_id = (
          SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
        AND status = 'ACTIVE'
      )
      AND att.status IN ('submitted', 'graded')
      AND a.allow_review = TRUE
      -- adaptive: only the subset this student was given
      AND (att.selected_question_ids IS NULL OR aq.question_id = ANY (att.selected_question_ids))
    )
  );

-- ── 3. "Soal Salah" from the server ─────────────────────────────────────
-- The wrong-answer list used to live in the browser's localStorage under
-- one shared key, so on a shared school computer students saw each
-- other's mistakes (and entries from failed requests showed up as ":").
-- It is now built server-side; practice attempts need the chosen option.
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS student_answer TEXT;
