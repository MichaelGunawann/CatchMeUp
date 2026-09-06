export const dynamic = "force-dynamic";
export const maxDuration = 60;
import Groq from "groq-sdk";
import { groqErrorResponse } from "@/lib/groq-error";

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "paste-your-groq-key-here") return Response.json({ error: "No GROQ_API_KEY in .env.local" });

  try {
    const groq = new Groq({ apiKey: key });
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say OK in one word." }],
      // gpt-oss models spend a variable, non-deterministic amount of the
      // token budget on internal reasoning before the visible answer even
      // for a trivial prompt (observed 30-64 reasoning tokens across
      // identical calls) - 200 gives enough headroom that an empty
      // response reliably means a real problem, not reasoning variance.
      max_tokens: 200,
    });
    const text = completion.choices[0].message.content ?? "";
    return Response.json({ success: true, response: text });
  } catch (err) {
    const { message } = groqErrorResponse(err);
    return Response.json({ success: false, error: message });
  }
}
