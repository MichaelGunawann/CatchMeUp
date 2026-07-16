import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent/topic-stats
 *
 * Real per-topic accuracy for a parent's linked child, computed server-side
 * from question_attempts (a parent has no RLS access to question_attempts or
 * questions - both are student/teacher-scoped only - so this can't be done
 * as a direct client query without widening RLS onto raw question content,
 * which would leak correct_answer/options and bypass the allow_review gate
 * assessments already enforce for the student themselves). Feeds
 * /api/recommendations, same shape as the teacher-side caller.
 *
 * Request body: { "studentId": "uuid" }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (!profile || profile.role !== "PARENT") {
      return Response.json({ error: "Only parents can access this" }, { status: 403 });
    }

    const { studentId } = await req.json() as { studentId?: string };
    if (!studentId) {
      return Response.json({ error: "Missing studentId" }, { status: 400 });
    }

    const { data: parent } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("user_profile_id", profile.id)
      .single();
    if (!parent) {
      return Response.json({ error: "No parent record for this account" }, { status: 403 });
    }

    const { data: link } = await supabaseAdmin
      .from("parent_student_links")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .eq("verified", true)
      .single();
    if (!link) {
      return Response.json({ error: "Student is not linked to this account" }, { status: 403 });
    }

    const { data: attempts } = await supabaseAdmin
      .from("assessment_attempts")
      .select("id")
      .eq("student_id", studentId);
    const attemptIds = (attempts ?? []).map(a => a.id as string);
    if (attemptIds.length === 0) {
      return Response.json({ topicStats: [] });
    }

    const { data: qAttempts } = await supabaseAdmin
      .from("question_attempts")
      .select("is_correct, assessment_questions(questions(topic))")
      .in("assessment_attempt_id", attemptIds);

    type Row = { is_correct: boolean | null; assessment_questions: { questions: { topic: string } | null } | null };
    const rows = (qAttempts ?? []) as unknown as Row[];

    const byTopic = new Map<string, { total: number; correct: number }>();
    for (const r of rows) {
      const topic = r.assessment_questions?.questions?.topic;
      if (!topic) continue;
      const cur = byTopic.get(topic) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (r.is_correct) cur.correct += 1;
      byTopic.set(topic, cur);
    }

    const topicStats = [...byTopic.entries()].map(([topic, v]) => ({
      topic,
      count: v.total,
      avgSuccessRate: Math.round((v.correct / v.total) * 100),
    }));

    return Response.json({ topicStats });
  } catch (error) {
    console.error("Error computing parent topic stats:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
