-- ═══════════════════════════════════════════════════════════════════════
-- FIX allow_review DEFAULT (restore legacy "always visible" review behavior)
-- ═══════════════════════════════════════════════════════════════════════
--
-- The legacy mock /student/review screen never had a permission concept at
-- all - a completed assessment's correct answers/explanations were always
-- shown, unconditionally. When grading was moved server-side (migration
-- 009), the real allow_review-gated reveal policy on `questions` was built
-- to require assessments.allow_review = TRUE - but the column itself
-- (migration 001) defaulted to FALSE, and the legacy assessment builder UI
-- was never given a toggle for it (matching the old mock, which had no such
-- toggle either). Net effect: every real assessment silently defaulted to
-- "review never available", which is more restrictive than the legacy
-- behavior it's supposed to preserve, not equivalent to it.
--
-- Fix: default TRUE going forward, and flip existing rows that were still
-- sitting on the FALSE default (never explicitly set otherwise, since no UI
-- exists to set it either way yet).
--
-- Safe to run once / re-run: plain ALTER + a scoped UPDATE, no guards needed.

ALTER TABLE assessments ALTER COLUMN allow_review SET DEFAULT TRUE;

UPDATE assessments SET allow_review = TRUE WHERE allow_review = FALSE;
