export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { supabaseAdmin } from "@/lib/supabase/server";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const NO_MATERIAL_MSG =
  "Maaf, kami belum bisa menjawab karena tidak ada materi ini di pustaka. Minta gurumu untuk mengunggah materi terlebih dahulu agar AI Companion dapat membantu.";

type TeachingStyle = "socratic" | "explicit" | "analogy";
type StudentAiSettings = { style: TeachingStyle; groundingRequired: boolean };

const DEFAULT_SETTINGS: StudentAiSettings = { style: "socratic", groundingRequired: true };

const STYLE_INSTRUCTIONS: Record<TeachingStyle, string> = {
  socratic:
    "GAYA MENGAJAR: Socratic. Jangan langsung memberi jawaban akhir. Pandu siswa dengan 1-3 pertanyaan penuntun bertahap, beri petunjuk kecil, dan minta siswa mencoba langkah berikutnya sendiri.",
  explicit:
    "GAYA MENGAJAR: Eksplisit. Jelaskan langsung langkah demi langkah secara terstruktur dan bernomor (Langkah 1, Langkah 2, ...), lalu tutup dengan ringkasan jawaban.",
  analogy:
    "GAYA MENGAJAR: Analogi. Jelaskan konsep dengan perumpamaan dari kehidupan sehari-hari terlebih dahulu, baru hubungkan kembali ke konsep formalnya.",
};

// The teacher's "Konfigurasi AI" (teacher_ai_settings) for the signed-in
// student's class. A class can have several teachers (one per subject);
// the most recently updated setting wins. Falls back to the defaults for
// anonymous/non-student callers or when no teacher has saved settings yet.
async function loadStudentAiSettings(req: Request): Promise<StudentAiSettings> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return DEFAULT_SETTINGS;
    const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (!authData.user) return DEFAULT_SETTINGS;
    const { data: profile } = await supabaseAdmin
      .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
    if (!profile || profile.role !== "STUDENT") return DEFAULT_SETTINGS;
    const { data: student } = await supabaseAdmin
      .from("students").select("class_id").eq("user_profile_id", profile.id).single();
    if (!student?.class_id) return DEFAULT_SETTINGS;
    const { data: assignments } = await supabaseAdmin
      .from("teacher_assignments").select("teacher_id").eq("class_id", student.class_id);
    const teacherIds = [...new Set((assignments ?? []).map(a => a.teacher_id as string))];
    if (teacherIds.length === 0) return DEFAULT_SETTINGS;
    const { data: settings } = await supabaseAdmin
      .from("teacher_ai_settings")
      .select("active_style, grounding_required")
      .in("teacher_id", teacherIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!settings) return DEFAULT_SETTINGS;
    return {
      style: (["socratic", "explicit", "analogy"].includes(settings.active_style) ? settings.active_style : "socratic") as TeachingStyle,
      groundingRequired: settings.grounding_required !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function POST(req: Request) {
  const { messages, materials } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    materials?: { title: string; topic: string }[];
  };
  const settings = await loadStudentAiSettings(req);

  if (!materials?.length && settings.groundingRequired) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: NO_MATERIAL_MSG })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  const materialList = (materials ?? []).map(m => `- ${m.title} (Topik: ${m.topic})`).join("\n");
  const rules = settings.groundingRequired
    ? `ATURAN KETAT:
1. Kamu HANYA boleh menjawab berdasarkan materi yang ada di daftar berikut. JANGAN menjawab topik yang tidak ada dalam daftar materi.
2. Jika pertanyaan tidak berkaitan dengan materi yang tersedia, jawab PERSIS dengan: "Maaf, kami belum bisa menjawab karena tidak ada materi ini di pustaka."
3. Setiap penjelasan HARUS mencantumkan sumber dokumen dengan format: [Sumber: Nama Dokumen, hal. X]
4. Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami siswa.`
    : `ATURAN:
1. Utamakan materi dari daftar berikut. Jika jawabanmu berasal dari materi tersebut, cantumkan sumber dengan format: [Sumber: Nama Dokumen, hal. X]
2. Untuk pertanyaan pelajaran di luar daftar materi, kamu boleh menjawab dari pengetahuan umum, tetapi sebutkan bahwa jawaban tersebut tidak berasal dari materi guru.
3. Tolak dengan sopan pertanyaan yang tidak berkaitan dengan pelajaran sekolah.
4. Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami siswa.`;
  const systemPrompt = `Kamu adalah AI Companion untuk siswa di platform Catch Up Indonesia.

${rules}

${STYLE_INSTRUCTIONS[settings.style]}

MATERI YANG TERSEDIA:
${materialList || "(belum ada materi yang diunggah guru)"}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await getGroq().chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
          stream: true,
          max_tokens: 1024,
        });

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
