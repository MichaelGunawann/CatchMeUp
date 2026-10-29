export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { aiChat } from "@/lib/ai";
import { groqErrorResponse } from "@/lib/groq-error";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { hashInput, readCache, writeCache } from "@/lib/ai-cache";

/**
 * POST /api/analyze-assessment
 *
 * "Analisis AI" on an assessment's results (teacher of that class+subject).
 * Stored per assessment (ai_cache): reopening the results shows the saved
 * analysis for free (`cachedOnly`), and it is only regenerated when the
 * answers changed (new submissions) and the teacher clicks again.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { assessmentId, assessmentTitle, questions, cachedOnly } = await req.json() as {
    assessmentId: string;
    cachedOnly?: boolean;
    assessmentTitle: string;
    questions: Array<{
      /** 1-based number of the question in the assessment */
      index: number;
      question: string;
      correctAnswer: string;
      correctOption: string;
      majorityWrongAnswer: string;
      majorityWrongOption: string;
      majorityWrongPct: number;
      topic: string;
    }>;
  };

  const { data: a } = await supabaseAdmin.from("assessments").select("class_id, subject_id").eq("id", assessmentId ?? "").maybeSingle();
  if (!a || !t.assignments.some(x => x.class_id === a.class_id && x.subject_id === a.subject_id)) {
    return Response.json({ error: "Kamu tidak mengajar kelas/mapel asesmen ini" }, { status: 403 });
  }
  const key = `analysis:${assessmentId}`;
  const inputHash = hashInput(questions ?? []);
  const cached = await readCache<Record<string, unknown>>(key);
  if (cachedOnly) return Response.json(cached ? { ...cached.value, cached: true, stale: cached.inputHash !== inputHash } : {});
  if (cached && cached.inputHash === inputHash) return Response.json({ ...cached.value, cached: true, stale: false });
  if (!questions?.length) {
    const none = { overallAnalysis: "Tidak ada soal yang dijawab salah oleh lebih dari 25% siswa, jadi belum ada pola kesalahan yang perlu dianalisis.", questionAnalyses: [] };
    await writeCache(key, inputHash, none);
    return Response.json(none);
  }

  const questionList = questions
    .map((q, i) =>
      `${q.index ?? i + 1}. ${q.question}\n   Jawaban benar: ${q.correctAnswer}) ${q.correctOption}\n   Mayoritas siswa memilih: ${q.majorityWrongAnswer}) ${q.majorityWrongOption} (${q.majorityWrongPct}%)\n   Topik: ${q.topic}`
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
    const completion = await aiChat("fast", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      reasoning_effort: "low",
    });

    const text = completion.choices[0].message.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallAnalysis: "", questionAnalyses: [] };
    await writeCache(key, inputHash, result);
    return Response.json(result);
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message }, { status });
  }
}
