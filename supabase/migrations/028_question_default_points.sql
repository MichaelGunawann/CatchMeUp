-- ═══════════════════════════════════════════════════════════════════════
-- SCORE PER QUESTION IN THE QUESTION BANK
-- ═══════════════════════════════════════════════════════════════════════
--
-- Teachers set a question's score when they write it ("Skor (poin)" in
-- the question form). The assessment builder uses it as the default
-- points for that question (still changeable per assessment, stored in
-- assessment_questions.points as before).
--
-- No new tables. Safe to run more than once.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS default_points NUMERIC NOT NULL DEFAULT 1;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_default_points_check;
ALTER TABLE questions ADD CONSTRAINT questions_default_points_check CHECK (default_points > 0 AND default_points <= 100);
