import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Onboarding guidance (migration 033): the teacher's "Siapkan kelas
 * pertamamu" checklist and the student's "Misi Pemula" missions.
 *
 * Every step is recorded server-side only, once per account, in
 * user_onboarding. A step counts as done either because the data already
 * proves it (checked when the card loads) or because the API route that
 * performs the action recorded it (recordStudentStep). Recorded steps stay
 * done even if the data later disappears (e.g. an archived material), so
 * the checklist never moves backwards.
 *
 * Everything degrades to "no onboarding" if the table doesn't exist yet.
 */

export const STUDENT_MISSION_XP = 5;
export const STUDENT_BADGE_CODE = "siap_belajar";

export type TeacherStep = "teacher_upload" | "teacher_generate" | "teacher_approve" | "teacher_ai_style" | "teacher_publish";
export type StudentStep = "student_material" | "student_practice" | "student_ask_ai" | "student_review";
export const TEACHER_HIDDEN = "teacher_checklist_hidden";
export const STUDENT_HIDDEN = "student_missions_hidden";

export const TEACHER_STEPS: TeacherStep[] = ["teacher_upload", "teacher_generate", "teacher_approve", "teacher_ai_style", "teacher_publish"];
export const STUDENT_STEPS: StudentStep[] = ["student_material", "student_practice", "student_ask_ai", "student_review"];

/** Steps already recorded for this profile, or null when the table is missing. */
export async function recordedSteps(profileId: string): Promise<Set<string> | null> {
  const { data, error } = await supabaseAdmin.from("user_onboarding").select("step").eq("user_profile_id", profileId);
  if (error) return null;
  return new Set((data ?? []).map(r => r.step as string));
}

/** Records steps; returns the ones THIS call newly recorded (race-safe via the primary key). */
export async function recordSteps(profileId: string, steps: string[]): Promise<string[]> {
  if (steps.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("user_onboarding")
    .upsert(steps.map(step => ({ user_profile_id: profileId, step })), { onConflict: "user_profile_id,step", ignoreDuplicates: true })
    .select("step");
  if (error) return [];
  return (data ?? []).map(r => r.step as string);
}

async function payMissionXp(profileId: string, newlyDone: number) {
  if (newlyDone <= 0) return;
  const { data: student } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", profileId).maybeSingle();
  if (!student) return;
  await supabaseAdmin.rpc("add_student_xp", { p_student_id: student.id, p_xp: newlyDone * STUDENT_MISSION_XP });
}

/**
 * Called by the API route that performs a mission's action (material
 * download, Tanya AI, Pembahasan). Pays the mission XP the first time only.
 * Never throws: onboarding must not break the route it is attached to.
 */
export async function recordStudentStep(profileId: string, step: StudentStep): Promise<void> {
  try {
    // A hidden card means the student is out of the missions: no step, no XP.
    const recorded = await recordedSteps(profileId);
    if (!recorded || recorded.has(STUDENT_HIDDEN)) return;
    const added = await recordSteps(profileId, [step]);
    await payMissionXp(profileId, added.length);
  } catch { /* onboarding is best-effort */ }
}

// ── Teacher checklist ────────────────────────────────────────────────────

export type TeacherOnboarding = {
  available: true;
  hidden: boolean;
  hasAssignments: boolean;
  done: Record<TeacherStep, boolean>;
};

export async function teacherOnboarding(profileId: string, teacherId: string): Promise<TeacherOnboarding | null> {
  const recorded = await recordedSteps(profileId);
  if (!recorded) return null;
  if (recorded.has(TEACHER_HIDDEN)) {
    const none = Object.fromEntries(TEACHER_STEPS.map(s => [s, false])) as Record<TeacherStep, boolean>;
    return { available: true, hidden: true, hasAssignments: false, done: none };
  }

  const [{ count: assignments }, materials, generated, approved, aiStyle, published] = await Promise.all([
    supabaseAdmin.from("teacher_assignments").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabaseAdmin.from("materials").select("id", { count: "exact", head: true }).eq("creator_id", profileId),
    supabaseAdmin.from("questions").select("id", { count: "exact", head: true }).eq("creator_id", profileId).in("source", ["ai_generated", "uploaded"]),
    supabaseAdmin.from("questions").select("id", { count: "exact", head: true }).eq("creator_id", profileId).in("status", ["active", "approved"]),
    supabaseAdmin.from("teacher_ai_settings").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabaseAdmin.from("assessments").select("id", { count: "exact", head: true }).eq("creator_id", profileId).eq("status", "published"),
  ]);

  const proven: Record<TeacherStep, boolean> = {
    teacher_upload: (materials.count ?? 0) > 0,
    teacher_generate: (generated.count ?? 0) > 0,
    teacher_approve: (approved.count ?? 0) > 0,
    teacher_ai_style: (aiStyle.count ?? 0) > 0,
    teacher_publish: (published.count ?? 0) > 0,
  };
  const newlyProven = TEACHER_STEPS.filter(s => proven[s] && !recorded.has(s));
  for (const s of await recordSteps(profileId, newlyProven)) recorded.add(s);

  const done = Object.fromEntries(TEACHER_STEPS.map(s => [s, recorded.has(s) || proven[s]])) as Record<TeacherStep, boolean>;
  return { available: true, hidden: recorded.has(TEACHER_HIDDEN), hasAssignments: (assignments ?? 0) > 0, done };
}

// ── Student missions ─────────────────────────────────────────────────────

export type StudentOnboarding = {
  available: true;
  hidden: boolean;
  done: Record<StudentStep, boolean>;
  /** missions that can't be done yet (nothing from the teacher, no finished exam) */
  locked: Record<StudentStep, boolean>;
  /** true only on the load that finished the last mission (show the celebration once) */
  justCompleted: boolean;
  xpPerMission: number;
};

export async function studentOnboarding(profileId: string, student: { id: string; school_id: string; class_id: string }): Promise<StudentOnboarding | null> {
  const recorded = await recordedSteps(profileId);
  if (!recorded) return null;
  // Hidden (by the student, or for accounts that predate the missions):
  // no card, and no mission XP or badge paid behind the student's back.
  if (recorded.has(STUDENT_HIDDEN)) {
    const none = Object.fromEntries(STUDENT_STEPS.map(s => [s, false])) as Record<StudentStep, boolean>;
    return { available: true, hidden: true, done: none, locked: none, justCompleted: false, xpPerMission: STUDENT_MISSION_XP };
  }

  const [practice, materials, bank, finished] = await Promise.all([
    supabaseAdmin.from("practice_attempts").select("id", { count: "exact", head: true }).eq("student_id", student.id),
    supabaseAdmin.from("materials").select("id", { count: "exact", head: true })
      .eq("school_id", student.school_id).eq("status", "active")
      .or(`class_id.eq.${student.class_id},class_id.is.null`),
    supabaseAdmin.from("questions").select("id", { count: "exact", head: true }).eq("class_id", student.class_id).eq("status", "active"),
    supabaseAdmin.from("assessment_attempts").select("id", { count: "exact", head: true }).eq("student_id", student.id).in("status", ["submitted", "graded"]),
  ]);

  // Practice is the one mission the data already proves.
  if ((practice.count ?? 0) > 0 && !recorded.has("student_practice")) {
    const added = await recordSteps(profileId, ["student_practice"]);
    if (added.length) {
      recorded.add("student_practice");
      await payMissionXp(profileId, added.length);
    }
  }

  const done = Object.fromEntries(STUDENT_STEPS.map(s => [s, recorded.has(s)])) as Record<StudentStep, boolean>;
  const locked: Record<StudentStep, boolean> = {
    student_material: !done.student_material && (materials.count ?? 0) === 0,
    student_practice: !done.student_practice && (bank.count ?? 0) === 0,
    student_ask_ai: false,
    student_review: !done.student_review && (finished.count ?? 0) === 0,
  };

  let justCompleted = false;
  if (STUDENT_STEPS.every(s => done[s])) {
    const { data: badge } = await supabaseAdmin.from("achievements").select("id").eq("code", STUDENT_BADGE_CODE).maybeSingle();
    if (badge) {
      const { data: inserted } = await supabaseAdmin
        .from("student_achievements")
        .upsert([{ student_id: student.id, achievement_id: badge.id }], { onConflict: "student_id,achievement_id", ignoreDuplicates: true })
        .select("achievement_id");
      justCompleted = (inserted ?? []).length > 0;
    }
  }

  return { available: true, hidden: recorded.has(STUDENT_HIDDEN), done, locked, justCompleted, xpPerMission: STUDENT_MISSION_XP };
}
