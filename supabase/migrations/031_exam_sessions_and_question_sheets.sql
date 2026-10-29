-- ═══════════════════════════════════════════════════════════════════════
-- EXAM SESSION CONTROL + QUESTION-SHEET MATERIALS
-- ═══════════════════════════════════════════════════════════════════════
--
-- assessment_attempts.deadline_override
--   A personal deadline for one student's attempt, set by the teacher when
--   reopening an exam for a student who was thrown out (e.g. switched tab
--   by accident) or when giving one student extra time. When set it
--   replaces started_at + duration and may go past the assessment's
--   close_at for that student only.
--
-- assessment_attempts.end_reason
--   Why the exam ended for the student ("Kamu berpindah tab", "Waktu
--   habis", ...) so the teacher can decide whether to reopen it.
--
-- materials.is_question_sheet
--   True when the uploaded file is a quiz/worksheet (numbered questions +
--   A-D options) rather than learning material. "Proses AI" is replaced by
--   "Impor soal" for those: generating new questions from a worksheet made
--   the AI invent answer keys.
--
-- No new tables. Safe to run more than once.

ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS deadline_override TIMESTAMPTZ;
ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS end_reason TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_question_sheet BOOLEAN NOT NULL DEFAULT FALSE;
