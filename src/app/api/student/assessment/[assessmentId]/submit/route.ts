import { supabaseAdmin } from "@/lib/supabase/server";
import { awardXpAndStreak, checkAndAwardAchievements } from "@/lib/gamification/award";
import type { Assessment, Question } from "@/lib/supabase/types";

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
 * Request body: { attemptId: string, answers: Record<assessmentQuestionId, "A"|"B"|"C"|"D"|"E"> }
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

    const { attemptId, answers } = (await req.json()) as {
      attemptId?: string;
      answers?: Record<string, string>;
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
      return Response.json({ error: "Percobaan ini sudah selesai" }, { status: 400 });
    }

    const { data: assessment } = await supabaseAdmin.from("assessments").select("*").eq("id", assessmentId).single();
    const a = assessment as Assessment;

    if (a.close_at && new Date() > new Date(a.close_at)) {
      await supabaseAdmin.from("assessment_attempts").update({ status: "missed" }).eq("id", attemptId);
      return Response.json({ error: "Waktu pengerjaan asesmen ini sudah berakhir" }, { status: 400 });
    }

    const { data: aqRows } = await supabaseAdmin
      .from("assessment_questions")
      .select("id, question_id, points, questions(*)")
      .eq("assessment_id", assessmentId);

    type AQRow = { id: string; question_id: string; points: number; questions: Question };
    const rows = (aqRows ?? []) as unknown as AQRow[];

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    const questionAttemptRows: Array<{
      assessment_attempt_id: string;
      assessment_question_id: string;
      student_answer: string | null;
      is_correct: boolean;
      points_earned: number;
    }> = [];
    const wrongAnswerRows: Array<{
      student_id: string;
      assessment_attempt_id: string;
      question_id: string;
      student_answer: string | null;
      attempted_at: string;
    }> = [];

    for (const row of rows) {
      const submittedAnswer = answers[row.id] ?? null;
      const isCorrect = submittedAnswer === row.questions.correct_answer;
      const pointsEarned = isCorrect ? row.points : 0;

      totalPoints += row.points;
      earnedPoints += pointsEarned;
      if (isCorrect) correctCount += 1;

      questionAttemptRows.push({
        assessment_attempt_id: attemptId,
        assessment_question_id: row.id,
        student_answer: submittedAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });

      if (!isCorrect) {
        wrongAnswerRows.push({
          student_id: student.id,
          assessment_attempt_id: attemptId,
          question_id: row.question_id,
          student_answer: submittedAnswer,
          attempted_at: new Date().toISOString(),
        });
      }
    }

    if (questionAttemptRows.length > 0) {
      await supabaseAdmin.from("question_attempts").insert(questionAttemptRows);
    }
    if (wrongAnswerRows.length > 0) {
      await supabaseAdmin.from("student_wrong_answers").insert(wrongAnswerRows);
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    await supabaseAdmin
      .from("assessment_attempts")
      .update({ status: "graded", submitted_at: new Date().toISOString(), score, total_points: totalPoints })
      .eq("id", attemptId);

    await awardXpAndStreak(student.id, correctCount * XP_PER_CORRECT_ANSWER);
    await checkAndAwardAchievements(student.id, { perfectScore: score === 100, assessmentId });

    let review = null;
    if (a.allow_review) {
      review = rows.map((row) => ({
        question: row.questions.question,
        options: row.questions.options,
        correctAnswer: row.questions.correct_answer,
        explanation: row.questions.explanation,
        yourAnswer: answers[row.id] ?? null,
        isCorrect: answers[row.id] === row.questions.correct_answer,
      }));
    }

    return Response.json({
      success: true,
      score,
      correctCount,
      totalQuestions: rows.length,
      allowReview: a.allow_review,
      review,
    });
  } catch (error) {
    console.error("Error submitting assessment attempt:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
