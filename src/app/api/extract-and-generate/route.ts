export const dynamic = "force-dynamic";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const count = parseInt((formData.get("count") as string) ?? "5");
  const materialTitle = (formData.get("materialTitle") as string) ?? "";
  const subject = (formData.get("subject") as string) ?? "";

  if (!file) {
    return Response.json({ error: "File tidak ditemukan.", questions: [] }, { status: 400 });
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    return Response.json({ error: "API key belum diset di .env.local", questions: [] }, { status: 500 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  const prompt = `Kamu adalah pembuat soal profesional untuk ujian SMA Indonesia.
Berdasarkan isi dokumen materi "${materialTitle}" (${subject}), buatkan tepat ${count} soal pilihan ganda yang:
- Menguji pemahaman isi materi secara langsung
- Sesuai level SMA Indonesia
- Penjelasan merujuk ke konten dokumen

Kembalikan HANYA JSON array tanpa teks lain:
[
  {
    "question": "Pertanyaan berdasarkan isi materi",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "A",
    "explanation": "Penjelasan singkat mengapa jawaban ini benar",
    "topic": "Topik dari materi",
    "difficulty": "Mudah"
  }
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    let result;

    if (name.endsWith(".pdf")) {
      // Gemini reads PDF natively — no pdf-parse needed
      result = await model.generateContent([
        { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
        { text: prompt },
      ]);
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const extracted = await mammoth.extractRawText({ buffer });
      const text = extracted.value.trim().slice(0, 12000);
      if (!text) return Response.json({ error: "Dokumen DOCX kosong atau tidak dapat dibaca.", questions: [] }, { status: 400 });
      result = await model.generateContent(`${prompt}\n\nIsi materi:\n${text}`);
    } else if (name.endsWith(".txt")) {
      const text = (await file.text()).slice(0, 12000);
      result = await model.generateContent(`${prompt}\n\nIsi materi:\n${text}`);
    } else {
      return Response.json({
        error: `Format "${name.split(".").pop()?.toUpperCase()}" tidak didukung. Gunakan PDF, DOCX, atau TXT.`,
        questions: [],
      }, { status: 400 });
    }

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    if (!questions.length) {
      return Response.json({ error: "AI tidak menghasilkan soal. Coba lagi.", questions: [] }, { status: 500 });
    }

    return Response.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg, questions: [] }, { status: 500 });
  }
}
