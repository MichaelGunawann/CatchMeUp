-- ═══════════════════════════════════════════════════════════════════════
-- ATOMIC XP + STREAK UPDATES
-- ═══════════════════════════════════════════════════════════════════════
--
-- awardXpAndStreak() (src/lib/gamification/award.ts) used to read
-- xp/streak_days, compute new values in Node, then write them back. The
-- adaptive practice screen grades every answer in parallel, so several of
-- those read-modify-writes raced and XP from all but one answer was lost.
-- This function does the whole update in one statement (row-locked by
-- UPDATE), so concurrent calls always add up correctly.
--
-- p_today is the student's local calendar date (Asia/Jakarta), computed by
-- the caller, so the streak day boundary is midnight WIB, not 07:00 WIB
-- (UTC midnight) as before.
--
-- Streak rule: same day -> unchanged; consecutive day -> +1; any gap -> 1.
--
-- Service-role only: never callable by anon/authenticated clients (xp and
-- streak stay non-client-writable, same as migration 007).
--
-- Safe to run more than once (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION award_student_activity(p_student_id UUID, p_xp INTEGER, p_today DATE)
RETURNS TABLE (xp INTEGER, streak_days INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE students s
  SET
    xp = s.xp + GREATEST(p_xp, 0),
    streak_days = CASE
      WHEN s.last_active_date = p_today THEN GREATEST(s.streak_days, 1)
      WHEN s.last_active_date = p_today - 1 THEN s.streak_days + 1
      ELSE 1
    END,
    last_active_date = GREATEST(COALESCE(s.last_active_date, p_today), p_today),
    last_active_at = now()
  WHERE s.id = p_student_id
  RETURNING s.xp, s.streak_days;
$$;

REVOKE ALL ON FUNCTION award_student_activity(UUID, INTEGER, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_student_activity(UUID, INTEGER, DATE) TO service_role;

-- Same race for achievement bonus XP.
CREATE OR REPLACE FUNCTION add_student_xp(p_student_id UUID, p_xp INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE students SET xp = xp + GREATEST(p_xp, 0) WHERE id = p_student_id;
$$;

REVOKE ALL ON FUNCTION add_student_xp(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_student_xp(UUID, INTEGER) TO service_role;
