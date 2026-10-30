export const dynamic = "force-dynamic";
// AI generation can take a while (typed formats ~30-45s per batch).
export const maxDuration = 300;
import { aiChat } from "@/lib/ai";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { groqErrorResponse } from "@/lib/groq-error";
import { MAX_QUESTIONS_PER_CALL, QUESTION_QUALITY_RULES, avoidListPrompt, parseQuestionsJson, parseTypedQuestions, typedFormatPrompt, languageRule, resolveQuestionLanguage, type AiQuestionType, type QuestionLanguage } from "@/lib/ai-questions";

async function generateTyped(type: AiQuestionType, count: number, context: string, avoid: string[] | undefined, lang: QuestionLanguage) {
  const prompt = `Kamu adalah pembuat soal profesional untuk sekolah di Indonesia (SD sampai SMA); sesuaikan tingkat soal dengan materinya.
${context}

${typedFormatPrompt(type, count)}
${QUESTION_QUALITY_RULES}
Pastikan kunci jawaban benar-benar sesuai isi materi; periksa ulang setiap kunci sebelum menulis.${avoidListPrompt(avoid)}${languageRule(lang)}`;
  const completion = await aiChat("smart", {
    messages: [{ role: "user", content: prompt }],
    max_tokens: Math.min(8192, count * 450 + 600),
    temperature: 0.3,
  });
  return parseTypedQuestions(completion.choices[0].message.content ?? "", type);
}

export async function POST(req: Request) {
  // Teachers only - this spends AI quota.
  const teacherCheck = await requireTeacher(req);
  if (teacherCheck instanceof Response) return teacherCheck;
  const body = await req.json() as {
    materialTitle: string;
    topic: string;
    subject: string;
    count?: number;
    difficulty?: string;
    questionType?: AiQuestionType;
    avoid?: string[];
    /** "en" = everything in English; default by subject (Bahasa Inggris -> en) */
    language?: string;
  };
  const { materialTitle, topic, subject, difficulty = "Sedang" } = body;
  const lang = resolveQuestionLanguage(body.language, subject);
  // Capped per call - callers batch larger requests (45 at once timed out).
  const count = Math.min(Math.max(1, body.count ?? 5), MAX_QUESTIONS_PER_CALL);

  if (body.questionType && body.questionType !== "pg" && ["pg_kompleks", "benar_salah", "menjodohkan", "isian", "esai"].includes(body.questionType)) {
    try {
      const questions = await generateTyped(body.questionType, count,
        `Mata pelajaran ${subject}, topik "${topic}" (materi: ${materialTitle}), tingkat kesulitan ${difficulty}.`, body.avoid, lang);
      if (!questions.length) return Response.json({ error: "AI tidak menghasilkan soal yang valid. Coba lagi.", questions: [] }, { status: 502 });
      return Response.json({ questions });
    } catch (err) {
      const { message, status } = groqErrorResponse(err);
      return Response.json({ error: message, questions: [] }, { status });
    }
  }

  const prompt = `Buatkan ${count} soal pilihan ganda tingkat ${difficulty} untuk topik "${topic}" pada mata pelajaran ${subject} (materi: ${materialTitle}).

Format WAJIB — kembalikan HANYA JSON array seperti ini, tanpa teks lain:
[
  {
    "question": "Teks pertanyaan",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "A",
    "explanation": "Penjelasan mengapa jawaban ini benar",
    "topic": "${topic}",
    "difficulty": "${difficulty}"
  }
]

Pastikan:
- Pertanyaan jelas dan sesuai tingkat kelas siswa
- Ada 4 pilihan (A, B, C, D) per soal
- Penjelasan jawaban lengkap dan edukatif
- Jawaban tersebar merata (tidak selalu A)
- Jangan include sourceTitle atau sourcePage (tidak ada materi spesifik)
- SANGAT PENTING: Sebelum menuliskan correctAnswer, hitung ulang jawabannya
  langkah demi langkah, PASTIKAN hasil perhitunganmu benar-benar cocok
  dengan salah satu dari 4 pilihan yang kamu buat. Jika hasil hitunganmu
  tidak cocok dengan pilihan manapun, ubah pilihannya (bukan jawabannya)
  agar cocok. correctAnswer HARUS konsisten dengan explanation - jangan
  pernah memilih opsi yang berbeda dari hasil perhitungan di explanation.
${QUESTION_QUALITY_RULES}${avoidListPrompt(body.avoid)}${languageRule(lang)}`;

  try {
    // Scaled to the actual question count instead of a flat 8192 - Groq's
    // daily-token rate limiter checks the requested max_tokens against
    // remaining quota, so a fixed oversized value rejects small requests
    // even when there'd be plenty of real headroom for them.
    const maxTokens = Math.min(8192, count * 300 + 500);
    const completion = await aiChat("smart", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      // Low temperature specifically to reduce answer-key inconsistency -
      // verified empirically that the default temperature let the model
      // compute the right answer in its own explanation and then pick a
      // different, wrong option anyway; 0.3 + the self-verification
      // instruction above eliminated that in repeated testing.
      temperature: 0.3,
    });

    const questions = parseQuestionsJson(completion.choices[0].message.content ?? "");
    if (!questions.length) return Response.json({ error: "AI tidak menghasilkan soal yang valid. Coba lagi.", questions: [] }, { status: 502 });
    return Response.json({ questions });
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message, questions: [] }, { status });
  }
}
