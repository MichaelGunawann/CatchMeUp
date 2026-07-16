import { supabaseAdmin } from "@/lib/supabase/server";
import { awardXpAndStreak, checkAndAwardAchievements } from "@/lib/gamification/award";

export const dynamic = "force-dynamic";

const XP_PER_CORRECT_PRACTICE = 2;

/**
 * POST /api/student/practice/submit
 *
 * Service-role only, grades server-side - same discipline as assessment
 * grading (supabase/migrations/007_gamification_and_settings.sql blocks
 * all client INSERT on practice_attempts). Untimed, one question at a
 * time, backs "Latihan Adaptif".
 *
 * Request body: { questionId: string, answer: "A"|"B"|"C"|"D"|"E" }
 */
export async function POST(req: Request) {
  try {
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
      return Response.json({ error: "Hanya siswa yang dapat berlatih" }, { status: 403 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!student || student.status !== "ACTIVE") {
      return Response.json({ error: "Akun siswa belum aktif" }, { status: 403 });
    }

    const { questionId, answer } = (await req.json()) as { questionId?: string; answer?: string };
    if (!questionId || !answer) {
      return Response.json({ error: "questionId dan answer wajib diisi" }, { status: 400 });
    }

    const { data: question } = await supabaseAdmin
      .from("questions")
      .select("correct_answer, explanation")
      .eq("id", questionId)
      .single();
    if (!question) {
      return Response.json({ error: "Soal tidak ditemukan" }, { status: 404 });
    }

    const isCorrect = answer === question.correct_answer;

    await supabaseAdmin.from("practice_attempts").insert({
      student_id: student.id,
      question_id: questionId,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      await awardXpAndStreak(student.id, XP_PER_CORRECT_PRACTICE);
      await checkAndAwardAchievements(student.id, {});
    }

    return Response.json({
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error("Error submitting practice attempt:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
