import { supabaseAdmin } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

/**
 * POST /api/student/practice/questions
 *
 * Service-role only. Students have no RLS SELECT on `questions` at all
 * (only a narrow, allow_review-gated reveal for already-completed
 * assessments - see 009_secure_grading.sql) - general practice-question
 * browsing needs its own service route for the same reason the exam
 * `start` route exists: correct_answer must never reach the client
 * before an answer is submitted. Tops up the real bank with fresh AI
 * questions (inserted for real, not ephemeral) when there aren't enough
 * matching the filters yet.
 *
 * Request body: { subjectId: string, topic?: string, difficulty?: "Mudah"|"Sedang"|"Sulit", count?: number }
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
      .select("id, school_id, class_id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!student || student.status !== "ACTIVE" || !student.class_id) {
      return Response.json({ error: "Akun siswa belum aktif atau belum ditempatkan di kelas" }, { status: 403 });
    }

    const { subjectId, topic, difficulty, count } = (await req.json()) as {
      subjectId?: string;
      topic?: string;
      difficulty?: "Mudah" | "Sedang" | "Sulit";
      count?: number;
    };
    if (!subjectId) {
      return Response.json({ error: "subjectId wajib diisi" }, { status: 400 });
    }
    const wantCount = Math.min(Math.max(count ?? 5, 1), 20);

    const { data: assignment } = await supabaseAdmin
      .from("teacher_assignments")
      .select("id")
      .eq("class_id", student.class_id)
      .eq("subject_id", subjectId)
      .limit(1)
      .maybeSingle();
    if (!assignment) {
      return Response.json({ error: "Mata pelajaran ini tidak diajarkan di kelasmu" }, { status: 403 });
    }

    let query = supabaseAdmin
      .from("questions")
      .select("id, question, options, topic, difficulty, correct_answer, explanation")
      .eq("school_id", student.school_id)
      .eq("class_id", student.class_id)
      .eq("subject_id", subjectId)
      .eq("status", "active")
      .limit(wantCount);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (topic) query = query.ilike("topic", `%${topic}%`);

    const { data: existing } = await query;
    const found = existing ?? [];

    let generated: typeof found = [];
    if (found.length < wantCount) {
      const shortfall = wantCount - found.length;
      try {
        const { data: subjectRow } = await supabaseAdmin.from("subjects").select("name").eq("id", subjectId).single();
        const prompt = `Buat ${shortfall} soal pilihan ganda (A-D) bahasa Indonesia untuk mata pelajaran "${subjectRow?.name ?? "Umum"}"${
          topic ? ` topik "${topic}"` : ""
        } tingkat kesulitan "${difficulty ?? "Sedang"}". Jawab HANYA JSON: {"questions":[{"question":"","options":{"A":"","B":"","C":"","D":""},"correctAnswer":"A","explanation":"","topic":""}]}`;
        const completion = await getGroq().chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
        });
        const text = completion.choices[0].message.content ?? "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };
        const raw = (parsed.questions ?? []) as Array<{
          question: string;
          options: Record<string, string>;
          correctAnswer: string;
          explanation: string;
          topic: string;
        }>;

        if (raw.length > 0) {
          const rows = raw.map((q) => ({
            school_id: student.school_id,
            class_id: student.class_id,
            subject_id: subjectId,
            creator_id: profile.id,
            source: "ai_generated" as const,
            topic: q.topic || topic || "Umum",
            difficulty: (difficulty ?? "Sedang") as "Mudah" | "Sedang" | "Sulit",
            question: q.question,
            options: q.options,
            correct_answer: (["A", "B", "C", "D", "E"].includes(q.correctAnswer) ? q.correctAnswer : "A") as
              | "A"
              | "B"
              | "C"
              | "D"
              | "E",
            explanation: q.explanation,
            status: "active" as const,
          }));
          const { data: inserted } = await supabaseAdmin.from("questions").insert(rows).select(
            "id, question, options, topic, difficulty, correct_answer, explanation"
          );
          generated = inserted ?? [];
        }
      } catch (err) {
        console.error("Practice AI generation failed:", err);
      }
    }

    const all = [...found, ...generated];
    return Response.json({
      questions: all.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        topic: q.topic,
        difficulty: q.difficulty,
      })),
    });
  } catch (error) {
    console.error("Error fetching practice questions:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
