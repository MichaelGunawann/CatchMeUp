export const dynamic = "force-dynamic";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

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
  "difficultyLevel": "Mudah|Sedang|Sulit"
}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const summary = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return Response.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
