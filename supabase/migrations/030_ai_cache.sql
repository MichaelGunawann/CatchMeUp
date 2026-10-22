-- ═══════════════════════════════════════════════════════════════════════
-- AI RESULT CACHE
-- ═══════════════════════════════════════════════════════════════════════
--
-- AI results that were re-generated on every page visit (Rekomendasi for
-- teachers and parents) or every click (Analisis AI on an assessment) are
-- stored here and reused while their input data hasn't changed
-- (input_hash). Saves AI quota; "Perbarui" regenerates on demand.
--
-- Server-only (service role): RLS on with no policies, and no grants to
-- anon/authenticated - the browser never reads this table directly.
-- Explicit grants per Supabase's 30 Oct 2026 Data API change.
--
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS ai_cache (
  key TEXT PRIMARY KEY,
  input_hash TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_cache FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_cache TO service_role;
