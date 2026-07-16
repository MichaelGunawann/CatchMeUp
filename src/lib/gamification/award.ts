import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Server-side-only gamification helpers, shared by the assessment submit
 * route and the practice submit route (Phase 4/5). XP/streak are never
 * client-writable - both routes call this after grading is already
 * computed server-side.
 */
export async function awardXpAndStreak(studentId: string, xpToAdd: number) {
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("xp, streak_days, last_active_date")
    .eq("id", studentId)
    .single();
  if (!student) return null;

  const today = new Date().toISOString().slice(0, 10);
  let newStreak = student.streak_days;
  if (student.last_active_date !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    newStreak = student.last_active_date === yesterday ? student.streak_days + 1 : 1;
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

  const { data: achievementRows } = await supabaseAdmin.from("achievements").select("id, code").in("code", toAward);
  const { data: alreadyEarned } = await supabaseAdmin
    .from("student_achievements")
    .select("achievement_id")
    .eq("student_id", studentId);
  const earnedIds = new Set((alreadyEarned ?? []).map((e) => e.achievement_id));

  const newRows = (achievementRows ?? [])
    .filter((a) => !earnedIds.has(a.id))
    .map((a) => ({ student_id: studentId, achievement_id: a.id }));

  if (newRows.length > 0) {
    await supabaseAdmin.from("student_achievements").insert(newRows);
    const totalXpReward = (achievementRows ?? [])
      .filter((a) => newRows.some((r) => r.achievement_id === a.id))
      .length;
    if (totalXpReward > 0) {
      const { data: rewardSum } = await supabaseAdmin
        .from("achievements")
        .select("xp_reward")
        .in(
          "id",
          newRows.map((r) => r.achievement_id)
        );
      const bonusXp = (rewardSum ?? []).reduce((sum, a) => sum + a.xp_reward, 0);
      if (bonusXp > 0) {
        const { data: current } = await supabaseAdmin.from("students").select("xp").eq("id", studentId).single();
        if (current) {
          await supabaseAdmin
            .from("students")
            .update({ xp: current.xp + bonusXp })
            .eq("id", studentId);
        }
      }
    }
  }
}
