export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { supabaseAdmin } from "@/lib/supabase/server";
import { groqErrorResponse } from "@/lib/groq-error";
import { getMaterialText } from "@/lib/material-text";
import { chunkMaterial, retrieve, type Chunk } from "@/lib/retrieval";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

type TeachingStyle = "socratic" | "explicit" | "analogy";

const STYLE_INSTRUCTIONS: Record<TeachingStyle, string> = {
  socratic:
    "Gaya mengajar: Socratic. Untuk soal/latihan, jangan langsung memberi jawaban akhir - pandu dengan 1-2 pertanyaan penuntun dan petunjuk kecil, lalu ajak siswa mencoba. Untuk permintaan penjelasan materi, tetap jelaskan dengan jelas lalu ajukan satu pertanyaan cek pemahaman.",
  explicit:
    "Gaya mengajar: Eksplisit. Jelaskan langsung langkah demi langkah (Langkah 1, Langkah 2, ...), lalu tutup dengan ringkasan singkat.",
  analogy:
    "Gaya mengajar: Analogi. Mulai dengan perumpamaan dari kehidupan sehari-hari anak, lalu hubungkan ke konsep di materi.",
};

type Ctx = {
  style: TeachingStyle;
  groundingRequired: boolean;
  materials: Array<{ id: string; title: string; subject: string; chapter: string | null; file_url: string | null; content_text?: string | null }>;
};

/**
 * Resolves the signed-in student, their class's teacher AI settings and the
 * class materials (server-side - the client used to send only material
 * titles, so the model never saw any actual content).
 */
async function loadContext(req: Request): Promise<Ctx | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!authData.user) return null;
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (!profile || profile.role !== "STUDENT") return null;
  const { data: student } = await supabaseAdmin
    .from("students").select("school_id, class_id, status").eq("user_profile_id", profile.id).single();
  if (!student || student.status !== "ACTIVE") return null;

  const [{ data: assignments }, { data: mats }] = await Promise.all([
    student.class_id
      ? supabaseAdmin.from("teacher_assignments").select("teacher_id").eq("class_id", student.class_id)
      : Promise.resolve({ data: [] as Array<{ teacher_id: string }> }),
    supabaseAdmin.from("materials").select("*, subjects(name)")
      .eq("school_id", student.school_id).eq("status", "active")
      .or(student.class_id ? `class_id.eq.${student.class_id},class_id.is.null` : "class_id.is.null"),
  ]);

  let style: TeachingStyle = "socratic";
  let groundingRequired = true;
  const teacherIds = [...new Set((assignments ?? []).map(a => a.teacher_id as string))];
  if (teacherIds.length > 0) {
    const { data: settings } = await supabaseAdmin
      .from("teacher_ai_settings").select("active_style, grounding_required")
      .in("teacher_id", teacherIds).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (settings) {
      if (["socratic", "explicit", "analogy"].includes(settings.active_style)) style = settings.active_style as TeachingStyle;
      groundingRequired = settings.grounding_required !== false;
    }
  }

  return {
    style,
    groundingRequired,
    materials: ((mats ?? []) as Array<Record<string, unknown> & { subjects: { name: string } | null }>).map(m => ({
      id: m.id as string,
      title: m.title as string,
      subject: m.subjects?.name ?? "Umum",
      chapter: (m.chapter as string | null) ?? null,
      file_url: (m.file_url as string | null) ?? null,
      content_text: (m.content_text as string | null | undefined) ?? null,
    })),
  };
}

function excerptBlock(chunks: Chunk[]): string {
  return chunks.map(c => `<<${c.materialTitle}${c.page ? `, hal. ${c.page}` : ""}>>\n${c.text}`).join("\n\n");
}

function sse(text: string) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  }), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: { role: "user" | "assistant"; content: string }[] };
  const ctx = await loadContext(req);
  if (!ctx) return sse("Sesi kamu sudah habis. Silakan muat ulang halaman atau masuk lagi, ya.");

  const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  // Follow-ups ("lanjutkan", "contohnya?") need the previous question's topic too.
  const prevUser = messages.filter(m => m.role === "user").slice(-2, -1)[0]?.content ?? "";
  const query = `${lastUser} ${lastUser.length < 40 ? prevUser : ""}`;

  // Read the class materials and pick the passages relevant to the question.
  // A material not read yet (uploaded before text caching existed) is read
  // now, but never holds the reply hostage: after 20s it is skipped for this
  // answer (extraction keeps going and is cached for the next one).
  const withTimeout = (p: Promise<string>) =>
    Promise.race([p, new Promise<string>(resolve => setTimeout(() => resolve(""), 20_000))]);
  const texts = await Promise.all(ctx.materials.map(async m => ({ m, text: await withTimeout(getMaterialText(m)) })));
  const chunks = texts.flatMap(({ m, text }) => chunkMaterial(m.title, text));
  const excerpts = retrieve(chunks, query);
  const unreadable = texts.filter(t => !t.text).map(t => t.m.title);

  const materialList = ctx.materials.length
    ? ctx.materials.map(m => `- "${m.title}" (mapel: ${m.subject}${m.chapter ? `, bab/topik: ${m.chapter}` : ""})`).join("\n")
    : "(guru belum mengunggah materi)";

  const groundingRules = ctx.groundingRequired
    ? `- Untuk isi pelajaran, jawab HANYA berdasarkan KUTIPAN MATERI di bawah. Jangan mengarang fakta yang tidak ada di kutipan.
- Jika jawabannya tidak ada di kutipan, katakan dengan ramah bahwa bagian itu belum ada di materi dari guru, sebutkan materi apa saja yang tersedia, dan sarankan bertanya ke guru. Jangan menjawab dari pengetahuan umum.`
    : `- Utamakan KUTIPAN MATERI di bawah. Jika tidak ada di kutipan, boleh menjelaskan dari pengetahuan umum, tetapi katakan bahwa penjelasan itu bukan dari materi guru.`;

  const systemPrompt = `Kamu adalah "Kak AI", teman belajar yang ramah untuk siswa sekolah di Indonesia (termasuk anak SD). Kamu berbicara dalam Bahasa Indonesia yang hangat, sederhana, dan jelas.

CARA MENGOBROL:
- Boleh membalas sapaan, basa-basi singkat, dan pertanyaan lanjutan dengan wajar. Ingat isi percakapan sebelumnya.
- Jika siswa meminta "jelaskan bab X", ringkas isi bab itu dari kutipan: poin-poin utamanya, satu contoh sederhana, lalu tanyakan bagian mana yang ingin dibahas lebih dalam.
- Kalimat pendek. Pakai poin-poin atau langkah bernomor bila membantu. Boleh **menebalkan** istilah penting. Maksimal sekitar 200 kata kecuali siswa minta lebih panjang.
- Jangan membahas daftar dokumen atau cara kerja sistem kecuali ditanya.
- Tolak dengan sopan topik yang tidak pantas atau tidak berhubungan dengan belajar.

ATURAN MATERI:
${groundingRules}
- Setiap kali memakai isi kutipan, sebutkan sumbernya dengan format persis: [Sumber: Judul Materi, hal. N] (pakai nomor halaman dari tanda <<Judul, hal. N>>).

${STYLE_INSTRUCTIONS[ctx.style]}

MATERI DARI GURU UNTUK KELAS INI:
${materialList}${unreadable.length ? `\n(Teks materi berikut belum bisa dibaca, misalnya PDF hasil scan: ${unreadable.join(", ")})` : ""}

KUTIPAN MATERI YANG RELEVAN DENGAN PERTANYAAN:
${excerpts.length ? excerptBlock(excerpts) : "(tidak ada kutipan yang cocok dengan pertanyaan ini)"}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await getGroq().chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
          stream: true,
          temperature: 0.4,
          max_tokens: 2048,
        });
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const { message } = groqErrorResponse(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
