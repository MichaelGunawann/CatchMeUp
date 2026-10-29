import { supabaseAdmin } from "@/lib/supabase/server";
import { aiChat } from "@/lib/ai";
import { getMaterialText } from "@/lib/material-text";
import { chunkMaterial, retrieve } from "@/lib/retrieval";
import { QUESTION_QUALITY_RULES, isSelfContained, parseQuestionsJson, parseTypedQuestions, typedFormatPrompt, type TypedQuestion } from "@/lib/ai-questions";
import { PRACTICE_TYPES, displayPayload, questionTypeOf, type QuestionType } from "@/lib/question-types";
import { loadTypeStats } from "@/lib/learning/type-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
 * Request body: { subjectId: string, topic?: string, difficulty?: "Mudah"|"Sedang"|"Sulit", count?: number, exclude?: string[] }
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

    const { subjectId, topic, difficulty, count, exclude } = (await req.json()) as {
      subjectId?: string;
      topic?: string;
      difficulty?: "Mudah" | "Sedang" | "Sulit";
      count?: number;
      exclude?: string[]; // ids already shown in this session
    };
    const excluded = new Set((Array.isArray(exclude) ? exclude : []).slice(0, 200));
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

    // ── Adaptive selection ──
    // Candidates = active bank questions for this class+subject (+ filters).
    // Ranked so practice targets what THIS student needs: weakest topics
    // first (accuracy from their practice + graded exams), never-attempted
    // questions before repeats, recently-correct questions last, with a
    // little randomness so sessions vary.
    let query = supabaseAdmin
      .from("questions")
      .select("*") // question_type exists only after migration 026
      .eq("school_id", student.school_id)
      .eq("class_id", student.class_id)
      .eq("subject_id", subjectId)
      .eq("status", "active")
      .limit(300);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (topic) query = query.ilike("topic", `%${topic}%`);
    const { data: candidates } = await query;

    const { data: history } = await supabaseAdmin
      .from("practice_attempts")
      .select("question_id, is_correct, submitted_at, questions(topic)")
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false })
      .limit(1000);
    const topicStats = new Map<string, { correct: number; total: number }>();
    const lastResult = new Map<string, boolean>(); // most recent result per question
    for (const h of (history ?? []) as unknown as Array<{ question_id: string; is_correct: boolean; questions: { topic: string } | null }>) {
      if (!lastResult.has(h.question_id)) lastResult.set(h.question_id, h.is_correct);
      const t = (h.questions?.topic ?? "").toLowerCase();
      if (!t) continue;
      const cur = topicStats.get(t) ?? { correct: 0, total: 0 };
      cur.total += 1; if (h.is_correct) cur.correct += 1;
      topicStats.set(t, cur);
    }
    const accuracy = (t: string) => {
      const st = topicStats.get(t.toLowerCase());
      return st && st.total > 0 ? st.correct / st.total : 0.5;
    };
    // Which question FORMATS this student struggles with (PG kompleks,
    // Benar/Salah, menjodohkan...) - practice leans toward the weak ones.
    const typeStats = await loadTypeStats(student.id, subjectId);
    const typeAcc = (t: QuestionType) => {
      const st = typeStats.find(x => x.type === t);
      return st && st.total >= 2 ? st.correct / st.total : null;
    };
    const ranked = (candidates ?? [])
      // Older bank questions may still say "menurut slide 3..." - skip them.
      // Practice is auto-graded: every format except essays.
      .filter(q => !excluded.has(q.id) && isSelfContained(q) && PRACTICE_TYPES.includes(questionTypeOf(q)))
      .map(q => {
        const last = lastResult.get(q.id);
        let score = (1 - accuracy(q.topic)) * 2;          // weak topic -> higher
        const ta = typeAcc(questionTypeOf(q));
        score += ta === null ? 0.4 : (1 - ta) * 1.5;      // weak / untried format -> higher
        if (last === undefined) score += 0.6;            // never tried
        else if (last === true) score -= 0.8;            // already mastered
        else score += 0.3;                               // got it wrong before
        return { q, score: score + Math.random() * 0.5 };
      })
      .sort((x, y) => y.score - x.score);
    // Format focus for this batch: weighted toward the student's weakest
    // (or not yet tried) format; plain PG stays the most common. When the
    // focus isn't PG, about half the batch is that format - taken from the
    // bank, or made by the AI if the bank has too few.
    const weights = PRACTICE_TYPES.map(t => {
      const ta = typeAcc(t);
      return { t, w: (t === "pg" ? 0.8 : 0) + (ta === null ? 0.5 : 1 - ta) };
    });
    let roll = Math.random() * weights.reduce((a, b) => a + b.w, 0);
    const genType: QuestionType = (weights.find(x => (roll -= x.w) < 0) ?? weights[0]).t;
    const focusWanted = genType === "pg" ? 0 : Math.ceil(wantCount / 2);

    // Spread over topics: at most 3 from one topic before moving on.
    const perTopic = new Map<string, number>();
    const found: NonNullable<typeof candidates> = [];
    const take = (list: typeof ranked, limit: number) => {
      for (const { q } of list) {
        if (found.length >= limit) break;
        if (found.includes(q)) continue;
        const n = perTopic.get(q.topic) ?? 0;
        if (n >= 3 && ranked.length > wantCount * 2) continue;
        perTopic.set(q.topic, n + 1);
        found.push(q);
      }
    };
    if (focusWanted) take(ranked.filter(({ q }) => questionTypeOf(q) === genType), focusWanted);
    const focusFound = found.length;
    // Leave room for AI-made focus questions when the bank had too few.
    const reserve = focusWanted ? focusWanted - focusFound : 0;
    take(ranked.filter(({ q }) => !focusWanted || questionTypeOf(q) !== genType), wantCount - reserve);

    let generated: typeof found = [];
    let generationNote: string | null = null;
    if (found.length < wantCount) {
      const shortfall = wantCount - found.length;
      try {
        const { data: subjectRow } = await supabaseAdmin.from("subjects").select("name").eq("id", subjectId).single();

        // Ground new questions in the teacher's materials for this subject:
        // pick the passages most relevant to the topic (or spread across the
        // material when practising "Semua").
        const { data: mats } = await supabaseAdmin.from("materials").select("*")
          .eq("school_id", student.school_id).eq("subject_id", subjectId).eq("status", "active")
          .or(`class_id.eq.${student.class_id},class_id.is.null`);
        const texts = await Promise.all(((mats ?? []) as Array<{ id: string; title: string; file_url: string | null; content_text?: string | null }>)
          .map(async m => ({ title: m.title, text: await Promise.race([getMaterialText(m), new Promise<string>(r => setTimeout(() => r(""), 15_000))]) })));
        const chunks = texts.flatMap(t => chunkMaterial(t.title, t.text));
        const groundingFor = (excerpts: ReturnType<typeof retrieve>) => excerpts.length
          ? `\n\nBuat soal BERDASARKAN kutipan materi dari guru berikut (jangan keluar dari isinya). Isi "sourceTitle" dan "sourcePage" sesuai tanda <<Judul, hal. N>> (hanya di kolom itu, jangan di teks soal/penjelasan):\n${excerpts.map(c => `<<${c.materialTitle}${c.page ? `, hal. ${c.page}` : ""}>>\n${c.text}`).join("\n\n")}`
          : "";
        const grounding = groundingFor(retrieve(chunks, topic ?? subjectRow?.name ?? "", 7000));

        const buildPrompt = (groundingText: string) => `Buat ${shortfall} soal latihan pilihan ganda (A-D) bahasa Indonesia untuk mata pelajaran "${subjectRow?.name ?? "Umum"}"${
          topic ? ` topik "${topic}"` : ""
        } tingkat kesulitan "${difficulty ?? "Sedang"}". Bahasa sederhana dan jelas, sesuai tingkat materi.${groundingText}
Jawab HANYA JSON: {"questions":[{"question":"","options":{"A":"","B":"","C":"","D":""},"correctAnswer":"A","explanation":"","topic":"","sourceTitle":"","sourcePage":1}]}
${QUESTION_QUALITY_RULES}
SANGAT PENTING: sebelum menuliskan correctAnswer, hitung ulang jawabannya langkah demi langkah dan pastikan hasilnya benar-benar cocok dengan salah satu dari 4 pilihan. correctAnswer HARUS konsisten dengan explanation.`;
        // Grounded in the materials first. If the topic's excerpts weren't
        // enough to write questions, retry with a broader slice of the same
        // materials - never ungrounded while materials exist, otherwise the
        // tutor can't explain the questions afterwards. Only a subject with
        // no readable material at all falls back to general questions.
        const ask = async (groundingText: string) => {
          const completion = await aiChat("smart", {
            messages: [{ role: "user", content: buildPrompt(groundingText) }],
            max_tokens: 4000,
            temperature: 0.3,
          });
          // Tolerant parsing: recovers every complete question even when the
          // model's JSON is wrapped, slightly malformed or cut off.
          return parseQuestionsJson(completion.choices[0].message.content ?? "");
        };
        // Non-PG formats use the typed prompt (same grounding + rules).
        const askTyped = async (groundingText: string) => {
          const completion = await aiChat("smart", {
            messages: [{ role: "user", content: `Buat soal latihan bahasa Indonesia untuk mata pelajaran "${subjectRow?.name ?? "Umum"}"${topic ? ` topik "${topic}"` : ""}, tingkat kesulitan "${difficulty ?? "Sedang"}". Bahasa sederhana, sesuai tingkat materi.${groundingText}

${typedFormatPrompt(genType, shortfall)}
${QUESTION_QUALITY_RULES}
Periksa ulang setiap kunci jawaban sebelum menulis.` }],
            max_tokens: Math.min(8192, shortfall * 450 + 600),
            temperature: 0.3,
          });
          return parseTypedQuestions(completion.choices[0].message.content ?? "", genType);
        };
        const groundedOk = !!grounding;
        let raw: TypedQuestion[];
        if (genType === "pg") {
          let rawList = await ask(grounding);
          if (rawList.length === 0 && grounding) rawList = await ask(groundingFor(retrieve(chunks, subjectRow?.name ?? "", 9000)));
          raw = rawList.map(q => ({ questionType: "pg" as const, question: q.question, options: q.options, correctAnswer: q.correctAnswer, answerKey: null, explanation: q.explanation ?? "", topic: q.topic, sourceTitle: q.sourceTitle, sourcePage: q.sourcePage }));
        } else {
          raw = await askTyped(grounding);
          if (raw.length === 0 && grounding) raw = await askTyped(groundingFor(retrieve(chunks, subjectRow?.name ?? "", 9000)));
        }

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
            correct_answer: q.questionType === "pg" ? (["A", "B", "C", "D", "E"].includes(q.correctAnswer ?? "") ? q.correctAnswer : "A") : null,
            question_type: q.questionType,
            answer_key: q.answerKey ?? null,
            explanation: q.explanation,
            status: "active" as const,
            // Only trust a cited source when the model was actually given the
            // material excerpts - otherwise it invents book titles/pages.
            source_title: (groundedOk && q.sourceTitle) || "Latihan AI",
            source_page: groundedOk && Number.isInteger(q.sourcePage) ? q.sourcePage : null,
          }));
          const { data: inserted, error: insertError } = await supabaseAdmin.from("questions").insert(rows).select("*");
          if (insertError) generationNote = `insert: ${insertError.message}`;
          generated = inserted ?? [];
        } else {
          generationNote = "AI tidak menghasilkan soal yang valid";
        }
      } catch (err) {
        console.error("Practice AI generation failed:", err);
        generationNote = err instanceof Error ? err.message.slice(0, 200) : "unknown";
      }
    }

    const all = [...found, ...generated];
    return Response.json({
      questions: all.map((q) => ({
        id: q.id,
        question: q.question,
        options: questionTypeOf(q) === "pg" ? q.options : {},
        topic: q.topic,
        difficulty: q.difficulty,
        imageUrl: (q as { image_url?: string | null }).image_url ?? null,
        ...displayPayload(q, `${student.id}:${q.id}`),
      })),
      typeStats,
      // Why fewer questions than requested came back (shown to no one by
      // default; useful for diagnosing generation problems).
      ...(all.length < wantCount && generationNote ? { note: generationNote } : {}),
    });
  } catch (error) {
    console.error("Error fetching practice questions:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
