export const dynamic = "force-dynamic";
import Groq from "groq-sdk";

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "paste-your-groq-key-here") return Response.json({ error: "No GROQ_API_KEY in .env.local" });

  try {
    const groq = new Groq({ apiKey: key });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Say OK in one word." }],
      max_tokens: 10,
    });
    const text = completion.choices[0].message.content ?? "";
    return Response.json({ success: true, response: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: msg });
  }
}
