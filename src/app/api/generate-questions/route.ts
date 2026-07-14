import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Jawaban tersebar merata (tidak selalu A)`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return Response.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg, questions: [] }, { status: 500 });
  }
}
