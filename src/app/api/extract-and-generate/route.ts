export const dynamic = "force-dynamic";
import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text.trim();
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const count = parseInt((formData.get("count") as string) ?? "5");
  const materialTitle = (formData.get("materialTitle") as string) ?? "";
  const subject = (formData.get("subject") as string) ?? "";

  if (!file) return Response.json({ error: "File tidak ditemukan.", questions: [] }, { status: 400 });
  if (!process.env.GROQ_API_KEY) return Response.json({ error: "GROQ_API_KEY belum diset di .env.local", questions: [] }, { status: 500 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let extractedText = "";

  try {
    if (name.endsWith(".pdf")) {
      extractedText = await extractPdfText(buffer);
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    } else if (name.endsWith(".txt")) {
      extractedText = await file.text();
    } else {
      return Response.json({
        error: `Format "${name.split(".").pop()?.toUpperCase()}" tidak didukung. Gunakan PDF, DOCX, atau TXT.`,
        questions: [],
      }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: `Gagal membaca file: ${msg}`, questions: [] }, { status: 500 });
  }

  extractedText = extractedText.replace(/\s+/g, " ").trim().slice(0, 10000);
  if (!extractedText) return Response.json({ error: "File kosong atau tidak dapat dibaca.", questions: [] }, { status: 400 });

  const prompt = `Kamu adalah pembuat soal profesional untuk ujian SMA Indonesia.
Berikut adalah isi materi dari file "${materialTitle}" (${subject}):

---
${extractedText}
---

Berdasarkan isi materi di atas, buatkan tepat ${count} soal pilihan ganda yang menguji pemahaman isi materi secara langsung.

Format WAJIB — kembalikan HANYA JSON array, tanpa teks lain:
[
  {
    "question": "Pertanyaan berdasarkan isi materi",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "B",
    "explanation": "Penjelasan singkat mengapa jawaban ini benar, merujuk ke materi",
    "topic": "Topik spesifik dari materi",
    "difficulty": "Sedang",
    "sourceTitle": "${materialTitle}",
    "sourcePage": 1
  }
]

Pastikan:
- sourceTitle harus sama dengan "${materialTitle}"
- sourcePage harus angka halaman di materi (estimasi atau asli jika terlihat)`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    });

    const text = completion.choices[0].message.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    if (!questions.length) return Response.json({ error: "AI tidak menghasilkan soal. Coba lagi.", questions: [] }, { status: 500 });
    return Response.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg, questions: [] }, { status: 500 });
  }
}
