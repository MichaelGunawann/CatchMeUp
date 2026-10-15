-- ═══════════════════════════════════════════════════════════════════════
-- CACHED MATERIAL TEXT FOR THE STUDENT AI TUTOR
-- ═══════════════════════════════════════════════════════════════════════
--
-- The AI tutor ("Tanya AI") used to receive only material TITLES, so it
-- could not explain anything inside a book ("jelaskan bab 1" -> "tidak ada
-- materi ini"). It now answers from the material's actual text, with
-- "[hal. N]" page markers for citations.
--
-- Extracting text from a large PDF is slow, so it is done once (when the
-- material is processed, or on first question) and stored here. Read only
-- by service-role server routes - no RLS change needed; students never
-- select this column directly.
--
-- Safe to run more than once.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS content_text TEXT;
