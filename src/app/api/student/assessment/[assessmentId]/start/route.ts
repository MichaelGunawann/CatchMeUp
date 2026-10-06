import { supabaseAdmin } from "@/lib/supabase/server";
import { getAssessmentAvailability, parseDbTime } from "@/lib/auth/assessment-availability";
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

type PoolRow = { id: string; question_id: string; question_order: number; points: number; questions: Question };

/**
 * Adaptive ("Adaptif per Siswa") selection: the assessment's linked
 * questions are a pool, and each student gets `count` of them weighted
 * toward the topics THEY are weakest in. Per-topic accuracy comes from
 * the student's own graded history (assessment question_attempts +
 * practice_attempts). Topics the student has never attempted are treated
 * as 50% so they still get covered. Selection is round-robin across
 * topics from weakest to strongest so one weak topic can't swallow the
 * whole test, and ties/ordering are seeded by the attempt id so a reload
 * of the same attempt always yields the same set.
 */
async function pickAdaptiveQuestions(studentId: string, pool: PoolRow[], count: number, seed: string): Promise<PoolRow[]> {
  if (pool.length <= count) return pool;

  const stats = new Map<string, { correct: number; total: number }>();
  const bump = (topic: string | null | undefined, correct: boolean) => {
    const key = (topic ?? "").trim().toLowerCase();
    if (!key) return;
    const cur = stats.get(key) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (correct) cur.correct += 1;
    stats.set(key, cur);
  };

  const { data: attempts } = await supabaseAdmin
    .from("assessment_attempts")
    .select("id")
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"]);
  const attemptIds = (attempts ?? []).map(a => a.id as string);
  if (attemptIds.length > 0) {
    const { data: qa } = await supabaseAdmin
      .from("question_attempts")
      .select("is_correct, assessment_questions(questions(topic))")
      .in("assessment_attempt_id", attemptIds);
    for (const row of (qa ?? []) as unknown as Array<{ is_correct: boolean | null; assessment_questions: { questions: { topic: string } | null } | null }>) {
      bump(row.assessment_questions?.questions?.topic, !!row.is_correct);
    }
  }
  const { data: practice } = await supabaseAdmin
    .from("practice_attempts")
    .select("is_correct, questions(topic)")
    .eq("student_id", studentId);
  for (const row of (practice ?? []) as unknown as Array<{ is_correct: boolean; questions: { topic: string } | null }>) {
    bump(row.questions?.topic, row.is_correct);
  }

  const accuracy = (topic: string) => {
    const s = stats.get(topic.trim().toLowerCase());
    return s && s.total > 0 ? s.correct / s.total : 0.5;
  };

  const byTopic = new Map<string, PoolRow[]>();
  for (const row of seededShuffle(pool, seed)) {
    const t = row.questions.topic || "Umum";
    byTopic.set(t, [...(byTopic.get(t) ?? []), row]);
  }
  const topics = [...byTopic.keys()].sort((a, b) => accuracy(a) - accuracy(b));

  // Weakest topics get proportionally more turns: a topic at 20% accuracy
  // gets 3 picks per round, 50% gets 2, 80%+ gets 1.
  const weight = (t: string) => (accuracy(t) < 0.4 ? 3 : accuracy(t) < 0.7 ? 2 : 1);
  const picked: PoolRow[] = [];
  while (picked.length < count) {
    let progressed = false;
    for (const t of topics) {
      const bucket = byTopic.get(t)!;
      for (let i = 0; i < weight(t) && bucket.length > 0 && picked.length < count; i++) {
        picked.push(bucket.shift()!);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return picked;
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

    let rows = (aqRows ?? []) as unknown as PoolRow[];

    const adaptive = (assessment as { distribution_mode?: string }).distribution_mode === "adaptive";
    if (adaptive) {
      const stored = (attempt as { selected_question_ids?: string[] | null }).selected_question_ids;
      if (stored && stored.length > 0) {
        // Resuming an in-progress attempt: keep exactly the subset this
        // student was already given, in the same order.
        const byId = new Map(rows.map(r => [r.id, r]));
        rows = stored.map(id => byId.get(id)).filter((r): r is PoolRow => !!r);
      } else {
        const count = (assessment as { question_count?: number | null }).question_count ?? rows.length;
        rows = await pickAdaptiveQuestions(student.id, rows, count, attempt.id);
        await supabaseAdmin
          .from("assessment_attempts")
          .update({ selected_question_ids: rows.map(r => r.id) })
          .eq("id", attempt.id);
      }
    }

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
    const closeDeadline = a.close_at ? parseDbTime(a.close_at) : null;
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
