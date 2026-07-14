import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
