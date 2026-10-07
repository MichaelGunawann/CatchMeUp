export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { groqErrorResponse } from "@/lib/groq-error";
import { MAX_QUESTIONS_PER_CALL, avoidListPrompt, parseQuestionsJson } from "@/lib/ai-questions";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    materialTitle: string;
    topic: string;
    subject: string;
    count?: number;
    difficulty?: string;
    avoid?: string[];
  };
  const { materialTitle, topic, subject, difficulty = "Sedang" } = body;
  // Capped per call - callers batch larger requests (45 at once timed out).
  const count = Math.min(Math.max(1, body.count ?? 5), MAX_QUESTIONS_PER_CALL);

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
- Pertanyaan jelas dan sesuai level SMA Indonesia
- Ada 4 pilihan (A, B, C, D) per soal
- Penjelasan jawaban lengkap dan edukatif
- Jawaban tersebar merata (tidak selalu A)
- Jangan include sourceTitle atau sourcePage (tidak ada materi spesifik)
- SANGAT PENTING: Sebelum menuliskan correctAnswer, hitung ulang jawabannya
  langkah demi langkah, PASTIKAN hasil perhitunganmu benar-benar cocok
  dengan salah satu dari 4 pilihan yang kamu buat. Jika hasil hitunganmu
  tidak cocok dengan pilihan manapun, ubah pilihannya (bukan jawabannya)
  agar cocok. correctAnswer HARUS konsisten dengan explanation - jangan
  pernah memilih opsi yang berbeda dari hasil perhitungan di explanation.${avoidListPrompt(body.avoid)}`;

  try {
    // Scaled to the actual question count instead of a flat 8192 - Groq's
    // daily-token rate limiter checks the requested max_tokens against
    // remaining quota, so a fixed oversized value rejects small requests
    // even when there'd be plenty of real headroom for them.
    const maxTokens = Math.min(8192, count * 300 + 500);
    const completion = await getGroq().chat.completions.create({
      model: "openai/gpt-oss-120b",
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
