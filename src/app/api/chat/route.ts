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

type LanguageStyle = "santai" | "baku";
type HelpLevel = "petunjuk" | "bertahap" | "lengkap";

const LANGUAGE_INSTRUCTIONS: Record<LanguageStyle, string> = {
  santai: "Gaya bahasa: santai dan akrab seperti kakak kelas yang ramah (boleh \"kamu\", sesekali emoji), tetap sopan.",
  baku: "Gaya bahasa: Bahasa Indonesia baku dan sopan seperti guru di kelas. Jangan memakai bahasa gaul, singkatan chat, atau emoji.",
};

const HELP_INSTRUCTIONS: Record<HelpLevel, string> = {
  petunjuk: "Tingkat bantuan: HANYA PETUNJUK. Untuk soal atau tugas, jangan pernah menuliskan jawaban akhir atau hasil hitungan akhir - beri petunjuk, langkah pertama, atau pertanyaan penuntun saja, lalu minta siswa mencoba sendiri.",
  bertahap: "Tingkat bantuan: BERTAHAP. Untuk soal, pandu dulu dengan petunjuk dan minta siswa mencoba. Berikan jawaban lengkap hanya setelah siswa mencoba atau masih bingung setelah dibantu.",
  lengkap: "Tingkat bantuan: LENGKAP. Boleh memberi pembahasan lengkap sampai jawaban akhir, tetapi selalu jelaskan langkah dan alasannya agar siswa paham.",
};

type Persona = { name: string; style: TeachingStyle; language: LanguageStyle; help: HelpLevel; groundingRequired: boolean };

type Ctx = Persona & {
  /** Explanations from the class question bank, as extra grounding. */
  bankChunks: Chunk[];
  materials: Array<{ id: string; title: string; subject: string; chapter: string | null; file_url: string | null; content_text?: string | null }>;
};

const DEFAULT_PERSONA: Persona = { name: "Kak AI", style: "socratic", language: "santai", help: "bertahap", groundingRequired: true };

/** The AI persona configured by the class's teachers (most recently updated settings win). */
async function loadPersona(teacherIds: string[]): Promise<Persona> {
  if (teacherIds.length === 0) return DEFAULT_PERSONA;
  // select("*"): persona columns (migration 023) may not exist yet.
  const { data } = await supabaseAdmin
    .from("teacher_ai_settings").select("*")
    .in("teacher_id", teacherIds).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return DEFAULT_PERSONA;
  const name = typeof data.persona_name === "string" && data.persona_name.trim() ? data.persona_name.trim().slice(0, 40) : DEFAULT_PERSONA.name;
  return {
    name,
    style: ["socratic", "explicit", "analogy"].includes(data.active_style) ? data.active_style as TeachingStyle : DEFAULT_PERSONA.style,
    language: data.language_style === "baku" ? "baku" : "santai",
    help: ["petunjuk", "bertahap", "lengkap"].includes(data.help_level) ? data.help_level as HelpLevel : DEFAULT_PERSONA.help,
    groundingRequired: data.grounding_required !== false,
  };
}

const BANK_TITLE = "Pembahasan soal dari guru";

/**
 * The class's question bank (question + correct answer + explanation) as
 * retrievable passages, so a concept asked in a quiz ("apa itu
 * mitokondria?") can be explained even when no uploaded file covers it.
 * Questions of assessments that are still open and that this student
 * hasn't submitted yet are left out - the tutor must never hold the answer
 * key of an exam the student can still take.
 */
async function loadBankChunks(classId: string, studentId: string): Promise<Chunk[]> {
  const nowIso = new Date().toISOString();
  const [{ data: qs }, { data: openAssessments }] = await Promise.all([
    supabaseAdmin.from("questions").select("id, question, options, correct_answer, explanation, topic")
      .eq("class_id", classId).eq("status", "active").order("created_at", { ascending: false }).limit(400),
    supabaseAdmin.from("assessments").select("id").eq("class_id", classId).eq("status", "published")
      .or(`close_at.is.null,close_at.gt.${nowIso}`),
  ]);
  const { data: submitted } = await supabaseAdmin.from("assessment_attempts").select("assessment_id")
    .eq("student_id", studentId).in("status", ["submitted", "graded"]);
  const done = new Set((submitted ?? []).map(a => a.assessment_id as string));
  const openIds = (openAssessments ?? []).map(a => a.id as string).filter(id => !done.has(id));
  const { data: inOpen } = openIds.length
    ? await supabaseAdmin.from("assessment_questions").select("question_id").in("assessment_id", openIds)
    : { data: [] as Array<{ question_id: string }> };
  const blocked = new Set((inOpen ?? []).map(r => r.question_id as string));
  return ((qs ?? []) as Array<{ id: string; question: string; options: Record<string, string>; correct_answer: string; explanation: string | null; topic: string | null }>)
    .filter(q => !blocked.has(q.id) && q.explanation)
    .map(q => ({
      materialTitle: BANK_TITLE,
      page: null,
      text: `Topik: ${q.topic ?? "-"}. Pertanyaan: ${q.question} Jawaban: ${q.options?.[q.correct_answer] ?? q.correct_answer}. Penjelasan: ${q.explanation}`,
    }));
}

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
    .from("students").select("id, school_id, class_id, status").eq("user_profile_id", profile.id).single();
  if (!student || student.status !== "ACTIVE") return null;

  const [{ data: assignments }, { data: mats }] = await Promise.all([
    student.class_id
      ? supabaseAdmin.from("teacher_assignments").select("teacher_id").eq("class_id", student.class_id)
      : Promise.resolve({ data: [] as Array<{ teacher_id: string }> }),
    supabaseAdmin.from("materials").select("*, subjects(name)")
      .eq("school_id", student.school_id).eq("status", "active")
      .or(student.class_id ? `class_id.eq.${student.class_id},class_id.is.null` : "class_id.is.null"),
  ]);

  const teacherIds = [...new Set((assignments ?? []).map(a => a.teacher_id as string))];
  const [persona, bankChunks] = await Promise.all([
    loadPersona(teacherIds),
    student.class_id ? loadBankChunks(student.class_id, student.id) : Promise.resolve([] as Chunk[]),
  ]);
  return {
    ...persona,
    bankChunks,
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

/** GET /api/chat - the persona name to show in the student's chat header. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!authData.user) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("id").eq("auth_user_id", authData.user.id).single();
  const { data: student } = profile
    ? await supabaseAdmin.from("students").select("class_id").eq("user_profile_id", profile.id).maybeSingle()
    : { data: null };
  const { data: assignments } = student?.class_id
    ? await supabaseAdmin.from("teacher_assignments").select("teacher_id").eq("class_id", student.class_id)
    : { data: [] as Array<{ teacher_id: string }> };
  const persona = await loadPersona([...new Set((assignments ?? []).map(a => a.teacher_id as string))]);
  return Response.json({ name: persona.name });
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
  const chunks = [...texts.flatMap(({ m, text }) => chunkMaterial(m.title, text)), ...ctx.bankChunks];
  const excerpts = retrieve(chunks, query);
  const unreadable = texts.filter(t => !t.text).map(t => t.m.title);

  const materialList = ctx.materials.length
    ? ctx.materials.map(m => `- "${m.title}" (mapel: ${m.subject}${m.chapter ? `, bab/topik: ${m.chapter}` : ""})`).join("\n")
    : "(guru belum mengunggah materi)";

  const groundingRules = ctx.groundingRequired
    ? `- Untuk isi pelajaran, jawab HANYA berdasarkan KUTIPAN MATERI di bawah. Jangan mengarang fakta yang tidak ada di kutipan.
- Jika jawabannya tidak ada di kutipan, katakan dengan ramah bahwa bagian itu belum ada di materi dari guru, sebutkan materi apa saja yang tersedia, dan sarankan bertanya ke guru. Jangan menjawab dari pengetahuan umum.`
    : `- Utamakan KUTIPAN MATERI di bawah. Jika tidak ada di kutipan, boleh menjelaskan dari pengetahuan umum, tetapi katakan bahwa penjelasan itu bukan dari materi guru.`;

  const systemPrompt = `Namamu "${ctx.name}" (nama ini diberikan oleh guru; pakai nama ini bila memperkenalkan diri). Kamu teman belajar yang ramah untuk siswa sekolah di Indonesia (termasuk anak SD). Kamu berbicara dalam Bahasa Indonesia yang hangat, sederhana, dan jelas.

CARA MENGOBROL:
- Boleh membalas sapaan, basa-basi singkat, dan pertanyaan lanjutan dengan wajar. Ingat isi percakapan sebelumnya.
- Jika siswa meminta "jelaskan bab X", ringkas isi bab itu dari kutipan: poin-poin utamanya, satu contoh sederhana, lalu tanyakan bagian mana yang ingin dibahas lebih dalam.
- Jangan pernah memakai LaTeX atau notasi seperti \\( \\frac{3}{5} \\). Tulis pecahan sebagai 3/5, perkalian dengan ×, pembagian dengan :, pangkat dengan ² atau "pangkat".
- Kalimat pendek. Pakai poin-poin atau langkah bernomor bila membantu. Boleh **menebalkan** istilah penting. Maksimal sekitar 200 kata kecuali siswa minta lebih panjang.
- Jangan membahas daftar dokumen atau cara kerja sistem kecuali ditanya.
- Tolak dengan sopan topik yang tidak pantas atau tidak berhubungan dengan belajar.
- Jika siswa bilang sedang ujian/asesmen/ulangan lalu meminta jawaban atau kunci jawaban, JANGAN beri jawaban atau huruf pilihannya - berapa pun tingkat bantuannya. Ingatkan dengan ramah bahwa itu harus dikerjakan sendiri, lalu tawarkan menjelaskan konsepnya setelah ujian selesai.

ATURAN MATERI:
${groundingRules}
- Setiap kali memakai isi kutipan, sebutkan sumbernya dengan format persis: [Sumber: Judul Materi, hal. N] (pakai nomor halaman dari tanda <<Judul, hal. N>>). Kutipan bertanda <<${BANK_TITLE}>> juga boleh dipakai untuk menjelaskan, tetapi JANGAN ditulis sebagai [Sumber: ...].

${STYLE_INSTRUCTIONS[ctx.style]}
${LANGUAGE_INSTRUCTIONS[ctx.language]}
${HELP_INSTRUCTIONS[ctx.help]}

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
