-- ═══════════════════════════════════════════════════════════════════════
-- ONBOARDING: teacher "Siapkan kelas pertamamu" checklist + student
-- "Misi Pemula" missions
-- ═══════════════════════════════════════════════════════════════════════
--
-- user_onboarding records each onboarding step a user has completed (or
-- the card they chose to hide), once per account - so the guidance follows
-- the user across devices instead of living in one browser.
--
-- Steps are recorded ONLY by the server (src/lib/onboarding.ts): from data
-- that already proves the step (a material exists, a practice answer
-- exists, ...) or from the API route that performs the action (material
-- download, Tanya AI, Pembahasan). Student steps pay XP, so the browser
-- must never be able to write this table: RLS on with no policies and no
-- grants to anon/authenticated (same pattern as ai_cache, migration 030).
--
-- The PRIMARY KEY makes recording a step idempotent: the XP for a step is
-- paid only by the request whose insert actually created the row.
--
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS user_onboarding (
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_profile_id, step)
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_onboarding FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO service_role;

-- Badge for finishing every "Misi Pemula" mission. No bonus XP: each
-- mission already pays its own +5 XP.
INSERT INTO achievements (code, title, description, category, xp_reward, icon)
VALUES ('siap_belajar', 'Siap Belajar', 'Selesaikan semua Misi Pemula dari Kak AI', 'practice', 0, 'Compass')
ON CONFLICT (code) DO NOTHING;
