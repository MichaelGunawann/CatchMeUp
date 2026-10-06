import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Server-side-only gamification helpers, shared by the assessment submit
 * route and the practice submit route (Phase 4/5). XP/streak are never
 * client-writable - both routes call this after grading is already
 * computed server-side.
 */
/** Calendar date (YYYY-MM-DD) in Asia/Jakarta - streak days roll over at midnight WIB. */
export function jakartaDate(offsetDays = 0, now: number = Date.now()): string {
  return new Date(now + offsetDays * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/**
 * The streak to SHOW: the stored streak_days only changes when the student
 * is active, so after missing a day it would still display the old number.
 * A streak is alive only if the last activity was today or yesterday (WIB).
 */
export function effectiveStreak(streakDays: number, lastActiveDate: string | null): number {
  if (!lastActiveDate) return 0;
  return lastActiveDate === jakartaDate(0) || lastActiveDate === jakartaDate(-1) ? streakDays : 0;
}

/**
 * Records that the student was active today (keeps/extends the daily
 * streak) and adds XP. Called for every graded assessment and every
 * practice answer - pass xpToAdd = 0 for activity that earns no XP (e.g. a
 * wrong practice answer still counts as "belajar hari ini").
 */
export async function awardXpAndStreak(studentId: string, xpToAdd: number) {
  const today = jakartaDate(0);

  // Atomic path (migration 017): safe under the parallel per-answer grading
  // the practice screen does.
  const { data, error } = await supabaseAdmin.rpc("award_student_activity", {
    p_student_id: studentId,
    p_xp: xpToAdd,
    p_today: today,
  });
  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as { xp: number; streak_days: number } | undefined;
    return row ? { xp: row.xp, streakDays: row.streak_days } : null;
  }

  // Fallback for databases without migration 017 (not race-safe).
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("xp, streak_days, last_active_date")
    .eq("id", studentId)
    .single();
  if (!student) return null;

  let newStreak = student.streak_days;
  if (student.last_active_date !== today) {
    newStreak = student.last_active_date === jakartaDate(-1) ? student.streak_days + 1 : 1;
  }
  const newXp = student.xp + xpToAdd;
  await supabaseAdmin
    .from("students")
    .update({ xp: newXp, streak_days: newStreak, last_active_date: today, last_active_at: new Date().toISOString() })
    .eq("id", studentId);

  return { xp: newXp, streakDays: newStreak };
}

export async function checkAndAwardAchievements(
  studentId: string,
  context: { perfectScore?: boolean; assessmentId?: string }
) {
  const { data: student } = await supabaseAdmin.from("students").select("streak_days").eq("id", studentId).single();
  if (!student) return;

  const toAward: string[] = [];
  if (context.perfectScore) toAward.push("nilai_sempurna");
  if (student.streak_days >= 7) toAward.push("streak_seminggu");
  if (student.streak_days >= 30) toAward.push("streak_sebulan");

  const { data: myAttemptIds } = await supabaseAdmin
    .from("assessment_attempts")
    .select("id")
    .eq("student_id", studentId);
  const attemptIds = (myAttemptIds ?? []).map((a) => a.id);

  let assessmentQuestionCount = 0;
  if (attemptIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .in("assessment_attempt_id", attemptIds);
    assessmentQuestionCount = count ?? 0;
  }
  const { count: practiceCount } = await supabaseAdmin
    .from("practice_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  if (assessmentQuestionCount + (practiceCount ?? 0) >= 100) toAward.push("rajin_berlatih");

  if (context.assessmentId) {
    const { data: classAttempts } = await supabaseAdmin
      .from("assessment_attempts")
      .select("student_id, score")
      .eq("assessment_id", context.assessmentId)
      .eq("status", "graded");
    const scores = (classAttempts ?? []).map((a) => a.score ?? 0);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const myScore = (classAttempts ?? []).find((a) => a.student_id === studentId)?.score ?? 0;
    if (maxScore > 0 && myScore === maxScore) toAward.push("juara_kelas");
  }

  if (toAward.length === 0) return;

  const { data: achievementRows } = await supabaseAdmin.from("achievements").select("id, code, xp_reward").in("code", toAward);
  const { data: alreadyEarned } = await supabaseAdmin
    .from("student_achievements")
    .select("achievement_id")
    .eq("student_id", studentId);
  const earnedIds = new Set((alreadyEarned ?? []).map((e) => e.achievement_id));

  const newRows = (achievementRows ?? [])
    .filter((a) => !earnedIds.has(a.id))
    .map((a) => ({ student_id: studentId, achievement_id: a.id }));

  if (newRows.length === 0) return;

  // Parallel grading can race here; UNIQUE(student_id, achievement_id) +
  // ignoreDuplicates keeps one award, and the returned rows are only the
  // ones THIS call actually inserted, so the bonus XP is paid exactly once.
  const { data: inserted } = await supabaseAdmin
    .from("student_achievements")
    .upsert(newRows, { onConflict: "student_id,achievement_id", ignoreDuplicates: true })
    .select("achievement_id");
  const insertedIds = new Set((inserted ?? []).map((r) => r.achievement_id as string));
  const bonusXp = (achievementRows ?? [])
    .filter((a) => insertedIds.has(a.id))
    .reduce((sum, a) => sum + ((a as { xp_reward?: number }).xp_reward ?? 0), 0);
  if (bonusXp <= 0) return;

  const { error: rpcError } = await supabaseAdmin.rpc("add_student_xp", { p_student_id: studentId, p_xp: bonusXp });
  if (rpcError) {
    const { data: current } = await supabaseAdmin.from("students").select("xp").eq("id", studentId).single();
    if (current) {
      await supabaseAdmin.from("students").update({ xp: current.xp + bonusXp }).eq("id", studentId);
    }
  }
}
