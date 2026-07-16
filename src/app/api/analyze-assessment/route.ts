export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export async function POST(req: Request) {
  const { assessmentTitle, questions } = await req.json() as {
    assessmentTitle: string;
    questions: Array<{
      question: string;
      correctAnswer: string;
      correctOption: string;
      majorityWrongAnswer: string;
      majorityWrongOption: string;
      majorityWrongPct: number;
      topic: string;
    }>;
  };

  const questionList = questions
    .map((q, i) =>
      `${i + 1}. ${q.question}\n   Jawaban benar: ${q.correctAnswer}) ${q.correctOption}\n   Mayoritas siswa memilih: ${q.majorityWrongAnswer}) ${q.majorityWrongOption} (${q.majorityWrongPct}%)\n   Topik: ${q.topic}`
    )
    .join("\n\n");

  const prompt = `Kamu adalah analis pendidikan AI untuk guru di Indonesia. Asesmen "${assessmentTitle}" baru saja selesai.

Berikut soal-soal yang banyak dijawab salah oleh siswa:

${questionList}

Berikan analisis singkat dan praktis dalam bahasa Indonesia. Fokus pada:
1. Miskonsepsi umum yang mungkin menyebabkan siswa memilih jawaban salah
2. Pola kesalahan yang perlu diperhatikan guru
3. Saran tindak lanjut konkret untuk perbaikan

Jawab HANYA dengan JSON berikut (tanpa teks lain):
{
  "overallAnalysis": "Ringkasan 2-3 kalimat tentang pola kesalahan umum dalam asesmen ini",
  "questionAnalyses": [
    {
      "index": 1,
      "misconception": "Penjelasan singkat mengapa siswa memilih jawaban yang salah",
      "suggestion": "Saran konkret untuk guru mengatasi miskonsepsi ini"
    }
  ]
}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallAnalysis: "", questionAnalyses: [] };
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
