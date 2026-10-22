export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { groqErrorResponse } from "@/lib/groq-error";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/api-user";
import { hashInput, readCache, writeCache } from "@/lib/ai-cache";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

type Body = {
  topicStats: Array<{ topic: string; avgSuccessRate: number; count: number }>;
  /** teacher view */ classId?: string; subjectId?: string;
  /** parent view */ studentId?: string;
  /** regenerate even when a stored result exists */ refresh?: boolean;
};

/**
 * POST /api/recommendations
 *
 * Teaching recommendations from topic accuracy. Login required (teacher
 * for their class+subject, parent for a linked child). The result is
 * stored (ai_cache) and returned on later visits without calling the AI;
 * `stale` tells the page the data changed since, and `refresh` regenerates.
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const { topicStats, classId, subjectId, studentId, refresh } = await req.json() as Body;
  if (!Array.isArray(topicStats) || topicStats.length === 0) return Response.json({ summary: "", recommendations: [] });

  let key: string;
  if (user.role === "TEACHER" && classId && subjectId) {
    const { data: t } = await supabaseAdmin.from("teachers").select("id").eq("user_profile_id", user.profileId).single();
    const { data: a } = await supabaseAdmin.from("teacher_assignments").select("id").eq("teacher_id", t?.id ?? "").eq("class_id", classId).eq("subject_id", subjectId).limit(1);
    if (!a?.length) return Response.json({ error: "Kamu tidak mengajar kelas/mapel ini" }, { status: 403 });
    key = `rec:class:${classId}:${subjectId}`;
  } else if (user.role === "PARENT" && studentId) {
    const { data: parent } = await supabaseAdmin.from("parents").select("id").eq("user_profile_id", user.profileId).single();
    const { data: link } = await supabaseAdmin.from("parent_student_links").select("id").eq("parent_id", parent?.id ?? "").eq("student_id", studentId).limit(1);
    if (!link?.length) return Response.json({ error: "Anak ini tidak terhubung dengan akunmu" }, { status: 403 });
    key = `rec:student:${studentId}`;
  } else {
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const inputHash = hashInput(topicStats);
  const cached = await readCache<{ summary: string; recommendations: unknown[] }>(key);
  if (cached && !refresh) {
    return Response.json({ ...cached.value, cached: true, updatedAt: cached.updatedAt, stale: cached.inputHash !== inputHash });
  }

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
- "topic" harus persis salah satu nama topik dari data di atas
- suggestion harus spesifik dan langsung bisa dipraktikkan guru`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      reasoning_effort: "low",
    });

    const text = completion.choices[0].message.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "", recommendations: [] };
    // Numbers come from the real data, never from the AI.
    if (Array.isArray(result.recommendations)) {
      result.recommendations = result.recommendations.map((r: { topic?: string }) => {
        const st = topicStats.find(x => x.topic.toLowerCase() === String(r.topic ?? "").toLowerCase());
        return { ...r, accuracy: st?.avgSuccessRate ?? null, questionCount: st?.count ?? null };
      });
    }
    await writeCache(key, inputHash, result);
    return Response.json({ ...result, cached: false, updatedAt: new Date().toISOString(), stale: false });
  } catch (err) {
    const { message, status } = groqErrorResponse(err);
    return Response.json({ error: message }, { status });
  }
}
