import { supabaseAdmin } from "@/lib/supabase/server";
import { attemptDeadline } from "@/lib/auth/exam-deadline";
import { awardXpAndStreak, checkAndAwardAchievements } from "@/lib/gamification/award";
import type { Assessment, AssessmentAttempt, Question } from "@/lib/supabase/types";
import { describeAnswer, describeKey, gradeAnswer, questionTypeOf } from "@/lib/question-types";

export const dynamic = "force-dynamic";

const XP_PER_CORRECT_ANSWER = 10;

/**
 * POST /api/student/assessment/[assessmentId]/submit
 *
 * Service-role only, grades entirely server-side. Body carries raw
 * answers only - no correctness/score claims from the client are ever
 * trusted (see supabase/migrations/009_secure_grading.sql for why this
 * has to be a server route: RLS is row-grain, not column-grain, so
 * there is no way to let a student write `student_answer` directly
 * while forbidding them from also writing `is_correct`/`score`).
 *
 * Request body: { attemptId: string, answers: Record<assessmentQuestionId, string> }
 * (answer encoding per question type: see src/lib/question-types.ts).
 * Essays are left for the teacher: the attempt stays 'submitted' (score
 * provisional) until every essay is graded via /api/teacher/grade-essay.
 */
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
      return Response.json({ error: "Hanya siswa yang dapat mengirim jawaban" }, { status: 403 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!student || student.status !== "ACTIVE") {
      return Response.json({ error: "Akun siswa belum aktif" }, { status: 403 });
    }

    const { attemptId, answers, endReason } = (await req.json()) as {
      attemptId?: string;
      answers?: Record<string, string>;
      /** why the exam ended, e.g. "Kamu berpindah tab" (shown to the teacher) */
      endReason?: string;
    };
    if (!attemptId || !answers) {
      return Response.json({ error: "attemptId dan answers wajib diisi" }, { status: 400 });
    }

    const { data: attempt } = await supabaseAdmin
      .from("assessment_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", student.id)
      .eq("assessment_id", assessmentId)
      .single();
    if (!attempt) {
      return Response.json({ error: "Percobaan tidak ditemukan" }, { status: 404 });
    }
    if (attempt.status !== "in_progress") {
      return Response.json({ error: "Jawaban ujian ini sudah dikumpulkan.", alreadySubmitted: true }, { status: 409 });
    }

    const { data: assessment } = await supabaseAdmin.from("assessments").select("*").eq("id", assessmentId).single();
    const a = assessment as Assessment;

    // The exam client auto-submits exactly at close_at; allow a short grace
    // window for that request's network latency so those answers aren't
    // discarded. Starting a NEW attempt after close is still blocked by
    // the start route.
    const SUBMIT_GRACE_MS = 2 * 60_000;
    // Same deadline the exam screen counts down to: a teacher's personal
    // deadline, else started_at + duration capped by close_at (the duration
    // was only enforced by the client before).
    const limit = attemptDeadline(attempt as AssessmentAttempt, a);
    if (limit !== null && Date.now() > limit + SUBMIT_GRACE_MS) {
      await supabaseAdmin.from("assessment_attempts").update({ status: "missed" }).eq("id", attemptId).eq("status", "in_progress");
      return Response.json({ error: "Waktu pengerjaan asesmen ini sudah berakhir" }, { status: 400 });
    }

    // Double-submit lock: claim the attempt atomically (in_progress ->
    // submitted only if it is STILL in_progress). Two requests arriving
    // together (double click, retry on a slow connection) both passed the
    // check above and graded twice - duplicate answers, double XP. Only the
    // request that wins this conditional update continues.
    const { data: claimed } = await supabaseAdmin
      .from("assessment_attempts")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("status", "in_progress")
      .select("id");
    if (!claimed || claimed.length === 0) {
      return Response.json({ error: "Jawaban ujian ini sudah dikumpulkan.", alreadySubmitted: true }, { status: 409 });
    }

    const { data: aqRows } = await supabaseAdmin
      .from("assessment_questions")
      .select("id, question_id, points, questions(*)")
      .eq("assessment_id", assessmentId);

    type AQRow = { id: string; question_id: string; points: number; questions: Question };
    let rows = (aqRows ?? []) as unknown as AQRow[];

    // Adaptive assessments: grade only the per-student subset chosen at
    // start time, never the whole pool (unseen pool questions would
    // otherwise count as wrong answers).
    const selectedIds = (attempt as { selected_question_ids?: string[] | null }).selected_question_ids;
    if (selectedIds && selectedIds.length > 0) {
      const allowed = new Set(selectedIds);
      rows = rows.filter(r => allowed.has(r.id));
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    let pendingCount = 0;
    const questionAttemptRows: Array<{
      assessment_attempt_id: string;
      assessment_question_id: string;
      student_answer: string | null;
      is_correct: boolean | null;
      points_earned: number;
    }> = [];
    const wrongAnswerRows: Array<{
      student_id: string;
      assessment_attempt_id: string;
      question_id: string;
      student_answer: string | null;
      attempted_at: string;
    }> = [];

    const graded = new Map<string, ReturnType<typeof gradeAnswer>>();
    for (const row of rows) {
      const raw = answers[row.id];
      const submittedAnswer = typeof raw === "string" && raw.length > 0 ? raw.slice(0, 5000) : null;
      const points = Number(row.points) || 1;
      const g = gradeAnswer(row.questions as never, submittedAnswer, points);
      graded.set(row.id, g);
      const isCorrect = g.isCorrect;
      const pointsEarned = g.earned;

      totalPoints += points;
      earnedPoints += pointsEarned;
      if (isCorrect) correctCount += 1;
      if (g.pending) pendingCount += 1;

      questionAttemptRows.push({
        assessment_attempt_id: attemptId,
        assessment_question_id: row.id,
        student_answer: submittedAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });

      if (isCorrect === false) {
        wrongAnswerRows.push({
          student_id: student.id,
          assessment_attempt_id: attemptId,
          question_id: row.question_id,
          student_answer: submittedAnswer,
          attempted_at: new Date().toISOString(),
        });
      }
    }

    // A reopened attempt already has rows from its first submission.
    await supabaseAdmin.from("question_attempts").delete().eq("assessment_attempt_id", attemptId);
    await supabaseAdmin.from("student_wrong_answers").delete().eq("assessment_attempt_id", attemptId);
    if (questionAttemptRows.length > 0) {
      await supabaseAdmin.from("question_attempts").insert(questionAttemptRows);
    }
    if (wrongAnswerRows.length > 0) {
      await supabaseAdmin.from("student_wrong_answers").insert(wrongAnswerRows);
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // With ungraded essays the attempt stays 'submitted' and the score is
    // provisional until the teacher grades them.
    // Score stays empty (shown as "–") until the teacher has graded every
    // essay - a provisional number looked like a real (low) grade.
    const finalFields = { status: pendingCount > 0 ? "submitted" : "graded", submitted_at: new Date().toISOString(), score: pendingCount > 0 ? null : score, total_points: totalPoints };
    const { error: finErr } = await supabaseAdmin.from("assessment_attempts")
      .update({ ...finalFields, end_reason: endReason ? String(endReason).slice(0, 200) : null }).eq("id", attemptId);
    if (finErr) await supabaseAdmin.from("assessment_attempts").update(finalFields).eq("id", attemptId); // before migration 031

    await awardXpAndStreak(student.id, correctCount * XP_PER_CORRECT_ANSWER);
    await checkAndAwardAchievements(student.id, { perfectScore: pendingCount === 0 && score === 100, assessmentId });

    let review = null;
    if (a.allow_review) {
      review = rows.map((row) => {
        const q = row.questions as never;
        const g = graded.get(row.id);
        return {
          type: questionTypeOf(q),
          question: row.questions.question,
          options: row.questions.options,
          correctAnswer: row.questions.correct_answer,
          correctText: describeKey(q),
          explanation: row.questions.explanation,
          yourAnswer: answers[row.id] ?? null,
          yourText: describeAnswer(q, answers[row.id] ?? null),
          isCorrect: g?.isCorrect ?? false,
          pending: g?.pending ?? false,
        };
      });
    }

    return Response.json({
      success: true,
      score: pendingCount > 0 ? null : score,
      correctCount,
      pendingCount,
      totalQuestions: rows.length,
      allowReview: a.allow_review,
      review,
    });
  } catch (error) {
    console.error("Error submitting assessment attempt:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
