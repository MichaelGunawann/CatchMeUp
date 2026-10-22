-- ═══════════════════════════════════════════════════════════════════════
-- EXPLICIT DATA API GRANTS
-- ═══════════════════════════════════════════════════════════════════════
--
-- From 30 Oct 2026 Supabase no longer grants Data API access automatically
-- to tables created in "public". Existing tables keep their grants, so the
-- live project is unaffected - but rebuilding the schema from these
-- migrations (new project, preview branch, `supabase db reset`) would
-- create every table without grants and the app would get
-- "permission denied" everywhere.
--
-- This makes the grants explicit for every table the migrations create.
-- RLS policies still decide which ROWS each user can see or change; these
-- grants only let the API reach the table at all.
--
-- Any NEW table added in a later migration must include the same three
-- GRANT lines in that migration.
--
-- Safe to run more than once (re-granting is a no-op).

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'achievements', 'activity_log', 'assessment_attempts', 'assessment_questions',
    'assessments', 'assessment_style_templates', 'classes', 'materials',
    'parent_registration_invites', 'parents', 'parent_student_links',
    'platform_settings', 'practice_attempts', 'question_attempts', 'questions',
    'school_admins', 'schools', 'student_achievements', 'students',
    'student_wrong_answers', 'subjects', 'teacher_ai_settings',
    'teacher_assignments', 'teachers', 'user_profiles'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;
