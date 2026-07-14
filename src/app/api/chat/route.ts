export const dynamic = "force-dynamic";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

export async function POST(req: Request) {
  const { messages, materials } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    materials?: { title: string; topic: string }[];
  };

  const systemInstruction = materials?.length
    ? `Kamu adalah AI Companion untuk siswa di platform Catch Up. Kamu HANYA boleh menjawab berdasarkan materi yang tersedia:\n${materials.map(m => `- ${m.title} (Topik: ${m.topic})`).join("\n")}\n\nJika pertanyaan di luar cakupan materi tersebut, katakan bahwa topik itu belum ada dalam materi yang diunggah guru.\n\nJawab dalam Bahasa Indonesia. Berikan penjelasan yang jelas dan mudah dipahami siswa SMA.`
    : `Kamu adalah AI Companion untuk siswa di platform Catch Up. Belum ada materi yang diunggah guru. Jawab dalam Bahasa Indonesia, berikan penjelasan umum yang membantu, dan anjurkan siswa untuk meminta gurunya mengunggah materi agar jawabanmu lebih spesifik.`;

  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage.content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
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
