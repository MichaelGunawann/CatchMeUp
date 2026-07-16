export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (_groq) return _groq;
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const NO_MATERIAL_MSG =
  "Maaf, kami belum bisa menjawab karena tidak ada materi ini di pustaka. Minta gurumu untuk mengunggah materi terlebih dahulu agar AI Companion dapat membantu.";

export async function POST(req: Request) {
  const { messages, materials } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    materials?: { title: string; topic: string }[];
  };

  if (!materials?.length) {
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

  const materialList = materials.map(m => `- ${m.title} (Topik: ${m.topic})`).join("\n");
  const systemPrompt = `Kamu adalah AI Companion untuk siswa di platform Catch Up Indonesia.

ATURAN KETAT:
1. Kamu HANYA boleh menjawab berdasarkan materi yang ada di daftar berikut. JANGAN menjawab topik yang tidak ada dalam daftar materi.
2. Jika pertanyaan tidak berkaitan dengan materi yang tersedia, jawab PERSIS dengan: "Maaf, kami belum bisa menjawab karena tidak ada materi ini di pustaka."
3. Setiap penjelasan HARUS mencantumkan sumber dokumen dengan format: [Sumber: Nama Dokumen, hal. X]
4. Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami siswa SMA.
5. Berikan penjelasan mendalam berdasarkan materi yang tersedia.

MATERI YANG TERSEDIA:
${materialList}`;

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
