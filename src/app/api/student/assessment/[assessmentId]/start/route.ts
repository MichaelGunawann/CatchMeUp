import { supabaseAdmin } from "@/lib/supabase/server";
import { getAssessmentAvailability } from "@/lib/auth/assessment-availability";
import type { Assessment, AssessmentAttempt, Question } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/assessment/[assessmentId]/start
 *
 * Service-role only. Students have no RLS INSERT on assessment_attempts
 * (see supabase/migrations/009_secure_grading.sql) - this route is the
 * only place a new attempt can be created, because it's also the only
 * place max_attempts/schedule are actually enforced (reusing the
 * existing getAssessmentAvailability() helper rather than reimplementing
 * it). The response strips `correct_answer`/`explanation` from every
 * question - the client never receives the answer key.
 */

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    return ((h >>> 0) % 1000) / 1000;
  };
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(req: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    const { assessmentId } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (!profile || profile.role !== "STUDENT") {
      return Response.json({ error: "Hanya siswa yang dapat mengerjakan asesmen" }, { status: 403 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, class_id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!student || student.status !== "ACTIVE" || !student.class_id) {
      return Response.json({ error: "Akun siswa belum aktif atau belum ditempatkan di kelas" }, { status: 403 });
    }

    const { data: assessment } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();
    if (!assessment || (assessment as Assessment).class_id !== student.class_id) {
      return Response.json({ error: "Asesmen tidak ditemukan" }, { status: 404 });
    }
    const a = assessment as Assessment;

    const { data: existingAttempts } = await supabaseAdmin
      .from("assessment_attempts")
      .select("*")
      .eq("assessment_id", assessmentId)
      .eq("student_id", student.id);
    const attempts = (existingAttempts ?? []) as AssessmentAttempt[];

    const availability = getAssessmentAvailability(a, attempts);

    let attempt = attempts.find((att) => att.status === "in_progress") ?? null;

    if (!attempt) {
      if (!availability.canAttempt) {
        return Response.json({ error: availability.message }, { status: 400 });
      }
      const completedCount = attempts.filter((att) => att.status === "submitted" || att.status === "graded").length;
      const { data: created, error: createError } = await supabaseAdmin
        .from("assessment_attempts")
        .insert({
          assessment_id: assessmentId,
          student_id: student.id,
          attempt_number: completedCount + 1,
          status: "in_progress",
        })
        .select()
        .single();

      if (createError) {
        // Race: another concurrent request already created the in_progress
        // attempt (partial unique index one_active_attempt_per_student).
        // Re-fetch instead of erroring.
        const { data: retryFetch } = await supabaseAdmin
          .from("assessment_attempts")
          .select("*")
          .eq("assessment_id", assessmentId)
          .eq("student_id", student.id)
          .eq("status", "in_progress")
          .single();
        if (!retryFetch) {
          return Response.json({ error: "Gagal memulai asesmen" }, { status: 400 });
        }
        attempt = retryFetch as AssessmentAttempt;
      } else {
        attempt = created as AssessmentAttempt;
      }
    }

    const { data: aqRows } = await supabaseAdmin
      .from("assessment_questions")
      .select("id, question_id, question_order, points, questions(*)")
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true });

    type AQRow = { id: string; question_id: string; question_order: number; points: number; questions: Question };
    let rows = (aqRows ?? []) as unknown as AQRow[];

    if (a.randomize_questions) {
      rows = seededShuffle(rows, attempt.id);
    }

    const questions = rows.map((row) => {
      const q = row.questions;
      const opts = q.options as unknown as { A: string; B: string; C: string; D: string; E?: string };
      const keys = (["A", "B", "C", "D", ...(opts.E ? ["E" as const] : [])] as const).filter((k) => opts[k]);
      const displayOrder = a.randomize_options ? seededShuffle(keys, attempt.id + row.id) : keys;

      return {
        assessmentQuestionId: row.id,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        points: row.points,
        displayOptions: displayOrder.map((k) => ({ key: k, text: opts[k] })),
      };
    });

    const startedAtMs = new Date(attempt.started_at).getTime();
    const durationDeadline = a.duration_minutes ? startedAtMs + a.duration_minutes * 60000 : null;
    const closeDeadline = a.close_at ? new Date(a.close_at).getTime() : null;
    const deadlineAt = [durationDeadline, closeDeadline].filter((d): d is number => d !== null).sort((x, y) => x - y)[0] ?? null;

    return Response.json({
      attemptId: attempt.id,
      title: a.title,
      deadlineAt,
      allowReview: a.allow_review,
      questions,
    });
  } catch (error) {
    console.error("Error starting assessment attempt:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
