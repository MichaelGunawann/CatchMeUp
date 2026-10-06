-- ═══════════════════════════════════════════════════════════════════════
-- MATERIAL METADATA, ADAPTIVE ASSESSMENTS, ASSESSMENT SCHEDULE CHECK
-- ═══════════════════════════════════════════════════════════════════════
--
-- 1. materials: the upload form has always asked for Bab, Tahun Ajaran,
--    Penerbit and Sumber, but the table had nowhere to store them, so the
--    inputs were thrown away. Adds nullable columns for each.
--
-- 2. assessments.distribution_mode / question_count: the builder's
--    "Adaptif per Siswa" choice was never persisted, so every assessment
--    silently behaved as "Sama untuk Semua Siswa". In adaptive mode the
--    linked assessment_questions are a POOL, and each student receives
--    `question_count` of them chosen by /api/student/assessment/[id]/start
--    from that student's weakest topics.
--
-- 3. assessment_attempts.selected_question_ids: the per-student subset
--    picked at start time, so the submit route grades exactly the
--    questions that student was shown (and nothing else from the pool).
--    NULL for uniform assessments = "every linked question".
--
-- 4. open_at/close_at -> TIMESTAMPTZ (timezone bug, see below).
-- 5. Schedule sanity: close_at must be after open_at.
--
-- Safe to run once. Idempotent (ADD COLUMN IF NOT EXISTS, constraint
-- dropped before re-adding). No RLS changes - students never read these
-- columns directly; the service-role start/submit routes do.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS distribution_mode TEXT NOT NULL DEFAULT 'uniform';
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_distribution_mode_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_distribution_mode_check
  CHECK (distribution_mode IN ('uniform', 'adaptive'));
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS question_count INTEGER;

ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS selected_question_ids UUID[];

-- 4. Schedule columns become TIMESTAMPTZ. They were TIMESTAMP (no zone):
--    the app writes UTC ISO strings, but PostgREST returned them without
--    an offset, so browsers in WIB read every open/close time 7 hours
--    off. Existing values were written as UTC, so they're reinterpreted
--    AT TIME ZONE 'UTC' (same instants, only the type changes). Guarded so
--    a re-run never applies the conversion twice.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'open_at') = 'timestamp without time zone' THEN
    ALTER TABLE assessments
      ALTER COLUMN open_at TYPE TIMESTAMPTZ USING open_at AT TIME ZONE 'UTC',
      ALTER COLUMN close_at TYPE TIMESTAMPTZ USING close_at AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 5. Schedule sanity: close_at must be after open_at. NOT VALID: enforced
--    for new/updated rows without failing on any legacy row that was
--    saved with an inverted window before this check existed.
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_schedule_order_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_schedule_order_check
  CHECK (open_at IS NULL OR close_at IS NULL OR close_at > open_at) NOT VALID;
