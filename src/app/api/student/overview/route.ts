import { supabaseAdmin } from "@/lib/supabase/server";
import { effectiveStreak } from "@/lib/gamification/award";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/overview
 *
 * A student's own progress numbers (or a parent's linked child's), computed
 * server-side.
 *
 * Why not in the browser: RLS only lets a student read their OWN
 * `students` row and their OWN `assessment_attempts`, so a client-side
 * class ranking only ever saw one student and always reported "#1 dari 1".
 * Ranking needs every classmate's scores, which only the service role can
 * read - and this route returns just the aggregate (rank, class size),
 * never other students' rows.
 *
 * Body: { studentId?: string }  - omitted for a student (self); required
 * for a parent, and must be a VERIFIED linked child.
 *
 * Returns { stats, achievements, weakTopics }.
 */

type AttemptRow = { student_id: string; score: number | null };

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) {
      return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
    }
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (!profile) return Response.json({ error: "Profil tidak ditemukan" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { studentId?: string };

    // ── Resolve which student, enforcing who may see whom ──
    let studentId: string | null = null;
    if (profile.role === "STUDENT") {
      const { data: self } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", profile.id).single();
      studentId = self?.id ?? null;
    } else if (profile.role === "PARENT" && body.studentId) {
      const { data: parent } = await supabaseAdmin.from("parents").select("id").eq("user_profile_id", profile.id).single();
      if (parent) {
        const { data: link } = await supabaseAdmin
          .from("parent_student_links")
          .select("student_id")
          .eq("parent_id", parent.id)
          .eq("student_id", body.studentId)
          .eq("verified", true)
          .maybeSingle();
        studentId = link?.student_id ?? null;
      }
    }
    if (!studentId) return Response.json({ error: "Data siswa tidak ditemukan" }, { status: 403 });

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, class_id, xp, streak_days, last_active_date")
      .eq("id", studentId)
      .single();
    if (!student) return Response.json({ error: "Data siswa tidak ditemukan" }, { status: 404 });

    // ── Class ranking ──
    let rank = 1;
    let classSize = 1;
    let className = "-";
    let avgScore = 0;
    let totalAssessments = 0;

    if (student.class_id) {
      const [{ data: classRow }, { data: classmates }, { data: classAssessments }] = await Promise.all([
        supabaseAdmin.from("classes").select("name").eq("id", student.class_id).single(),
        supabaseAdmin.from("students").select("id, xp").eq("class_id", student.class_id).eq("status", "ACTIVE"),
        supabaseAdmin.from("assessments").select("id").eq("class_id", student.class_id),
      ]);
      className = classRow?.name ?? "-";
      const roster = (classmates ?? []) as Array<{ id: string; xp: number }>;
      if (!roster.some(r => r.id === student.id)) roster.push({ id: student.id, xp: student.xp });
      classSize = roster.length;

      const scoreBy = new Map<string, { sum: number; count: number }>();
      const assessmentIds = (classAssessments ?? []).map(a => a.id as string);
      if (assessmentIds.length > 0) {
        const { data: attempts } = await supabaseAdmin
          .from("assessment_attempts")
          .select("student_id, score")
          .in("assessment_id", assessmentIds)
          .in("status", ["submitted", "graded"]);
        for (const a of (attempts ?? []) as AttemptRow[]) {
          if (a.score == null) continue;
          const cur = scoreBy.get(a.student_id) ?? { sum: 0, count: 0 };
          cur.sum += Number(a.score);
          cur.count += 1;
          scoreBy.set(a.student_id, cur);
        }
      }

      // Rank by average score (desc); ties share a rank (1, 2, 2, 4).
      // Students with no graded assessment yet come after everyone who
      // has one, ordered by XP.
      const keyOf = (id: string, xp: number) => {
        const s = scoreBy.get(id);
        return { hasScore: !!s, avg: s ? Math.round((s.sum / s.count) * 10) / 10 : 0, xp };
      };
      const keys = roster.map(r => ({ id: r.id, ...keyOf(r.id, r.xp) }));
      const better = (a: typeof keys[number], b: typeof keys[number]) =>
        a.hasScore !== b.hasScore ? a.hasScore : a.hasScore ? a.avg > b.avg : a.xp > b.xp;
      const me = keys.find(k => k.id === student.id)!;
      rank = 1 + keys.filter(k => k.id !== student.id && better(k, me)).length;

      const own = scoreBy.get(student.id);
      avgScore = own ? Math.round(own.sum / own.count) : 0;
      totalAssessments = own?.count ?? 0;
    }

    // ── Achievements (real catalog + this student's awards) ──
    const [{ data: catalog }, { data: earned }] = await Promise.all([
      supabaseAdmin.from("achievements").select("id, code, title, description, category, xp_reward, icon").order("xp_reward"),
      supabaseAdmin.from("student_achievements").select("achievement_id, earned_at").eq("student_id", student.id),
    ]);
    const earnedAt = new Map((earned ?? []).map(e => [e.achievement_id as string, e.earned_at as string]));
    const achievements = (catalog ?? []).map(a => ({
      id: a.id as string,
      code: a.code as string,
      title: a.title as string,
      description: a.description as string,
      category: a.category as string,
      xp: a.xp_reward as number,
      icon: a.icon as string | null,
      earned: earnedAt.has(a.id as string),
      earnedAt: earnedAt.get(a.id as string) ?? null,
    }));

    // ── Weak topics: per-topic accuracy from assessments + practice ──
    const topicStats = new Map<string, { topic: string; subject: string; correct: number; total: number }>();
    const bump = (topic: string | null | undefined, subject: string | null | undefined, correct: boolean) => {
      const t = (topic ?? "").trim();
      if (!t) return;
      const key = `${subject ?? ""}::${t.toLowerCase()}`;
      const cur = topicStats.get(key) ?? { topic: t, subject: subject ?? "Umum", correct: 0, total: 0 };
      cur.total += 1;
      if (correct) cur.correct += 1;
      topicStats.set(key, cur);
    };
    const { data: myAttempts } = await supabaseAdmin
      .from("assessment_attempts")
      .select("id")
      .eq("student_id", student.id)
      .in("status", ["submitted", "graded"]);
    const myAttemptIds = (myAttempts ?? []).map(a => a.id as string);
    if (myAttemptIds.length > 0) {
      const { data: qa } = await supabaseAdmin
        .from("question_attempts")
        .select("is_correct, assessment_questions(questions(topic, subjects(name)))")
        .in("assessment_attempt_id", myAttemptIds);
      for (const r of (qa ?? []) as unknown as Array<{ is_correct: boolean | null; assessment_questions: { questions: { topic: string; subjects: { name: string } | null } | null } | null }>) {
        const q = r.assessment_questions?.questions;
        bump(q?.topic, q?.subjects?.name, !!r.is_correct);
      }
    }
    const { data: practice } = await supabaseAdmin
      .from("practice_attempts")
      .select("is_correct, questions(topic, subjects(name))")
      .eq("student_id", student.id);
    for (const r of (practice ?? []) as unknown as Array<{ is_correct: boolean; questions: { topic: string; subjects: { name: string } | null } | null }>) {
      bump(r.questions?.topic, r.questions?.subjects?.name, r.is_correct);
    }
    const weakTopics = [...topicStats.values()]
      .map(t => ({ topic: t.topic, subject: t.subject, attempted: t.total, accuracy: Math.round((t.correct / t.total) * 100) }))
      .filter(t => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted);

    return Response.json({
      stats: {
        avgScore,
        xp: student.xp,
        streak: effectiveStreak(student.streak_days, student.last_active_date),
        rank,
        classSize,
        className,
        totalAssessments,
      },
      achievements,
      weakTopics,
    });
  } catch (error) {
    console.error("Error building student overview:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
