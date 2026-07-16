export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { groqErrorResponse } from "@/lib/groq-error";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export async function POST(req: Request) {
  const { materialTitle, topic, subject, count = 5, difficulty = "Sedang" } = await req.json() as {
    materialTitle: string;
    topic: string;
    subject: string;
    count?: number;
    difficulty?: string;
  };

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
- Jangan include sourceTitle atau sourcePage (tidak ada materi spesifik)`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
    });

    const text = completion.choices[0].message.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return Response.json({ questions });
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message, questions: [] }, { status });
  }
}
