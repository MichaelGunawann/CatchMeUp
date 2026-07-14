import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const count = parseInt((formData.get("count") as string) ?? "5");
  const materialTitle = (formData.get("materialTitle") as string) ?? "";
  const subject = (formData.get("subject") as string) ?? "";

  if (!file) {
    return Response.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let extractedText = "";

  try {
    if (name.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("pdf-parse");
      const pdfParse = (typeof mod === "function" ? mod : mod.default) as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (name.endsWith(".txt")) {
      extractedText = await file.text();
    } else {
      return Response.json({
        error: "Format tidak didukung. Gunakan PDF, DOCX, atau TXT. PPT/PPTX harus dikonversi ke PDF dulu.",
        questions: [],
      }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return Response.json({ error: `Gagal membaca file: ${msg}`, questions: [] }, { status: 500 });
  }

  extractedText = extractedText.replace(/\s+/g, " ").trim().slice(0, 12000);

  if (!extractedText) {
    return Response.json({ error: "File kosong atau tidak dapat dibaca.", questions: [] }, { status: 400 });
  }

  const prompt = `Kamu adalah pembuat soal profesional untuk ujian SMA Indonesia.
Berikut adalah isi materi dari file "${materialTitle}" (${subject}):

---
${extractedText}
---

Berdasarkan isi materi di atas, buatkan ${count} soal pilihan ganda yang:
- Menguji pemahaman isi materi secara langsung
- Sesuai level SMA Indonesia
- Jawaban dan penjelasan merujuk ke konten materi

Format WAJIB — kembalikan HANYA JSON array, tanpa teks lain:
[
  {
    "question": "Pertanyaan berdasarkan isi materi",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "B",
    "explanation": "Penjelasan mengapa jawaban ini benar, merujuk ke materi",
    "topic": "Topik spesifik dari materi",
    "difficulty": "Mudah"
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return Response.json({ questions, extractedLength: extractedText.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg, questions: [] }, { status: 500 });
  }
}
