-- ═══════════════════════════════════════════════════════════════════════
-- AI SCORE SUGGESTIONS FOR ESSAYS
-- ═══════════════════════════════════════════════════════════════════════
--
-- In "Nilai Esai" the teacher can ask the AI to check one answer or a
-- selection of answers. The AI compares each answer with the teacher's
-- example answer / grading guide (or, when both are empty, with the class
-- materials) and suggests a score and a short reason. The suggestion is
-- stored so it isn't paid for twice; it never counts until the teacher
-- accepts it (points_earned / is_correct stay untouched).
--
-- No new tables. Safe to run more than once.

ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS ai_suggested_points NUMERIC;
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS ai_reason TEXT;
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMPTZ;
