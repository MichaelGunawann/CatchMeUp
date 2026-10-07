import { supabaseAdmin } from "@/lib/supabase/server";
import { getAssessmentAvailability, parseDbTime } from "@/lib/auth/assessment-availability";
import type { Assessment, AssessmentAttempt } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/assessments
 *
 * The signed-in student's published assessments with question counts and
 * per-student availability.
 *
 * Why server-side: students have (deliberately) no RLS read on
 * assessment_questions - it would expose which questions are in an exam
 * before it starts - so a client-side `assessment_questions(count)` embed
 * always returned 0. The UI then showed "0 soal · Belum ada soal" for every
 * assessment and refused to open them. Only counts leave this route, never
 * question content.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
    if (!profile || profile.role !== "STUDENT") return Response.json({ error: "Hanya untuk siswa" }, { status: 403 });
    const { data: student } = await supabaseAdmin
      .from("students").select("id, class_id, status").eq("user_profile_id", profile.id).single();
    if (!student || student.status !== "ACTIVE") return Response.json({ error: "Akun siswa belum aktif" }, { status: 403 });
    if (!student.class_id) return Response.json({ assessments: [], noClass: true });

    const { data: rows, error } = await supabaseAdmin
      .from("assessments")
      .select("*, subjects(name)")
      .eq("class_id", student.class_id)
      .eq("status", "published")
      .order("open_at", { ascending: true, nullsFirst: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const list = (rows ?? []) as unknown as Array<Assessment & { subjects: { name: string } | null; distribution_mode?: string; question_count?: number | null }>;
    if (list.length === 0) return Response.json({ assessments: [] });

    const ids = list.map(a => a.id);
    const [{ data: aq }, { data: attempts }] = await Promise.all([
      supabaseAdmin.from("assessment_questions").select("assessment_id").in("assessment_id", ids),
      supabaseAdmin.from("assessment_attempts").select("*").eq("student_id", student.id).in("assessment_id", ids),
    ]);
    const poolSize = new Map<string, number>();
    for (const r of (aq ?? []) as Array<{ assessment_id: string }>) poolSize.set(r.assessment_id, (poolSize.get(r.assessment_id) ?? 0) + 1);
    const attemptsBy = new Map<string, AssessmentAttempt[]>();
    for (const a of (attempts ?? []) as AssessmentAttempt[]) attemptsBy.set(a.assessment_id, [...(attemptsBy.get(a.assessment_id) ?? []), a]);

    const iso = (v: string | null) => (v ? new Date(parseDbTime(v)).toISOString() : null);

    return Response.json({
      assessments: list.map(a => {
        const pool = poolSize.get(a.id) ?? 0;
        // Adaptive: each student gets question_count questions from the pool.
        const questionCount = a.distribution_mode === "adaptive" && a.question_count ? Math.min(a.question_count, pool) : pool;
        const own = attemptsBy.get(a.id) ?? [];
        const info = getAssessmentAvailability(a, own);
        const graded = own.filter(t => t.status === "graded" || t.status === "submitted").sort((x, y) => (y.attempt_number ?? 0) - (x.attempt_number ?? 0))[0];
        return {
          id: a.id,
          title: a.title,
          type: a.type,
          subject: a.subjects?.name ?? "Umum",
          durationMinutes: a.duration_minutes,
          openAt: iso(a.open_at),
          closeAt: iso(a.close_at),
          questionCount,
          state: info.state,             // UPCOMING | OPEN | COMPLETED | MISSED | CLOSED
          inProgress: own.some(t => t.status === "in_progress"),
          message: info.message,
          score: graded?.score != null ? Number(graded.score) : null,
        };
      }),
    });
  } catch (error) {
    console.error("Error listing student assessments:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
