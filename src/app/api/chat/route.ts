import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages, materials } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    materials?: { title: string; topic: string }[];
  };

  const materialContext = materials?.length
    ? `Kamu adalah AI Companion untuk siswa di platform Catch Up. Kamu HANYA boleh menjawab berdasarkan materi yang tersedia:\n${materials.map(m => `- ${m.title} (Topik: ${m.topic})`).join("\n")}\n\nJika pertanyaan di luar cakupan materi tersebut, katakan bahwa topik itu belum ada dalam materi yang diunggah guru.\n\nJawab dalam Bahasa Indonesia. Berikan penjelasan yang jelas dan mudah dipahami siswa SMA.`
    : `Kamu adalah AI Companion untuk siswa di platform Catch Up. Belum ada materi yang diunggah guru. Jawab dalam Bahasa Indonesia, berikan penjelasan umum yang membantu, dan anjurkan siswa untuk meminta gurunya mengunggah materi agar jawabanmu lebih spesifik.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: materialContext,
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
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
