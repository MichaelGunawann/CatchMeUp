export const dynamic = "force-dynamic";
import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export async function POST(req: Request) {
  const { topicStats } = await req.json() as {
    topicStats: Array<{ topic: string; avgSuccessRate: number; count: number }>;
  };

  const topicList = topicStats
    .map(t => `- ${t.topic}: ${t.count} soal, rata-rata akurasi ${t.avgSuccessRate}%`)
    .join("\n");

  const prompt = `Kamu adalah asisten pengajaran AI untuk guru di Indonesia. Berdasarkan data performa soal berikut:

${topicList}

Analisis topik mana yang perlu perhatian khusus dan buat rekomendasi tindakan pengajaran yang konkret dan dapat dilaksanakan.

Jawab HANYA dengan JSON berikut (tanpa teks lain):
{
  "summary": "Ringkasan singkat 2-3 kalimat tentang kondisi kelas dan prioritas utama",
  "recommendations": [
    {
      "id": "r1",
      "topic": "nama topik",
      "issue": "deskripsi masalah spesifik yang dialami siswa pada topik ini",
      "affectedStudents": 15,
      "wrongCount": 6,
      "priority": "Tinggi",
      "suggestion": "langkah konkret yang bisa dilakukan guru untuk mengatasi masalah ini",
      "estimatedTime": "20 menit"
    }
  ]
}

Ketentuan:
- priority harus salah satu dari: "Tinggi", "Sedang", "Rendah"
- Fokus pada topik dengan akurasi di bawah 70%
- Buat 2-4 rekomendasi saja, yang paling penting
- affectedStudents dan wrongCount harus angka masuk akal berdasarkan data
- suggestion harus spesifik dan langsung bisa dipraktikkan guru`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "", recommendations: [] };
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
