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
  const { materialTitle, topic, subject } = await req.json() as {
    materialTitle: string;
    topic: string;
    subject: string;
  };

  const prompt = `Buatkan ringkasan materi untuk guru tentang: "${materialTitle}"
Topik: ${topic}
Mata Pelajaran: ${subject}

Berikan ringkasan dalam format JSON berikut (HANYA JSON, tanpa teks lain):
{
  "summary": "Ringkasan singkat 2-3 kalimat tentang materi ini",
  "keyPoints": ["poin 1", "poin 2", "poin 3", "poin 4", "poin 5"],
  "prerequisites": ["prasyarat 1", "prasyarat 2"],
  "estimatedStudyTime": "X menit",
  "difficultyLevel": "Mudah"
}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    const text = completion.choices[0].message.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return Response.json(result);
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message }, { status });
  }
}
