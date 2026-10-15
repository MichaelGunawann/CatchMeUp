-- ═══════════════════════════════════════════════════════════════════════
-- AI PERSONA SETTINGS ("Pengaturan AI Companion")
-- ═══════════════════════════════════════════════════════════════════════
--
-- Teachers could only pick a teaching style. They can now also set:
--   persona_name    - the name the AI uses with students ("Kak AI", "Bu Rina AI")
--   language_style  - santai (friendly, casual) | baku (formal Indonesian)
--   help_level      - petunjuk (hints only, never the final answer)
--                   | bertahap (guide first, answer after the student tries)
--                   | lengkap  (full worked explanation)
--
-- Read by the student chat route (service role); the existing "teachers
-- manage their own row" RLS policy already covers the new columns.
--
-- Safe to run more than once.

ALTER TABLE teacher_ai_settings ADD COLUMN IF NOT EXISTS persona_name TEXT NOT NULL DEFAULT 'Kak AI';
ALTER TABLE teacher_ai_settings ADD COLUMN IF NOT EXISTS language_style TEXT NOT NULL DEFAULT 'santai';
ALTER TABLE teacher_ai_settings ADD COLUMN IF NOT EXISTS help_level TEXT NOT NULL DEFAULT 'bertahap';

ALTER TABLE teacher_ai_settings DROP CONSTRAINT IF EXISTS teacher_ai_settings_persona_name_check;
ALTER TABLE teacher_ai_settings ADD CONSTRAINT teacher_ai_settings_persona_name_check
  CHECK (char_length(btrim(persona_name)) BETWEEN 1 AND 40);
ALTER TABLE teacher_ai_settings DROP CONSTRAINT IF EXISTS teacher_ai_settings_language_style_check;
ALTER TABLE teacher_ai_settings ADD CONSTRAINT teacher_ai_settings_language_style_check
  CHECK (language_style IN ('santai', 'baku'));
ALTER TABLE teacher_ai_settings DROP CONSTRAINT IF EXISTS teacher_ai_settings_help_level_check;
ALTER TABLE teacher_ai_settings ADD CONSTRAINT teacher_ai_settings_help_level_check
  CHECK (help_level IN ('petunjuk', 'bertahap', 'lengkap'));
