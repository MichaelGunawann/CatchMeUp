import Groq from "groq-sdk";
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from "groq-sdk/resources/chat/completions";

// Two Groq models with separate quotas (limits are per model):
//  - SMART (gpt-oss-120b): anything where a mistake changes a student's
//    score - making questions/answer keys, essay checks, maths in the tutor
//  - FAST  (gpt-oss-20b, half the price): explanations/summaries where a
//    small slip is harmless - recommendations, result analysis, chit-chat
// Each call falls back to the other model when one is rate-limited, so a
// used-up quota on one model doesn't stop the feature.

export const SMART_MODEL = "openai/gpt-oss-120b";
export const FAST_MODEL = "openai/gpt-oss-20b";

export type AiTier = "smart" | "fast";

let _groq: Groq | null = null;
function groq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const isRateLimit = (err: unknown) => (err as { status?: number } | null)?.status === 429;

type Params = Omit<ChatCompletionCreateParamsNonStreaming, "model">;
type StreamParams = Omit<ChatCompletionCreateParamsStreaming, "model" | "stream">;

export async function aiChat(tier: AiTier, params: Params) {
  const [first, second] = tier === "smart" ? [SMART_MODEL, FAST_MODEL] : [FAST_MODEL, SMART_MODEL];
  try {
    return await groq().chat.completions.create({ ...params, model: first });
  } catch (err) {
    if (!isRateLimit(err)) throw err;
    return await groq().chat.completions.create({ ...params, model: second });
  }
}

export async function aiChatStream(tier: AiTier, params: StreamParams) {
  const [first, second] = tier === "smart" ? [SMART_MODEL, FAST_MODEL] : [FAST_MODEL, SMART_MODEL];
  try {
    return await groq().chat.completions.create({ ...params, model: first, stream: true });
  } catch (err) {
    if (!isRateLimit(err)) throw err;
    return await groq().chat.completions.create({ ...params, model: second, stream: true });
  }
}

/** Tutor questions that need the smart model: numbers/working, or long/complex. */
export function tutorTier(question: string): AiTier {
  const q = question.toLowerCase();
  if (/\d/.test(q) || /hitung|berapa|rumus|selesaikan|buktikan|jelaskan bab|kenapa|mengapa|bagaimana/.test(q) || q.length > 160) return "smart";
  return "fast";
}

// Vision (reading scanned/photographed materials, src/lib/ocr.ts). Groq's
// vision models change more often than the text ones, so several are tried
// in order (GROQ_VISION_MODEL first when set).
const VISION_MODELS = [
  process.env.GROQ_VISION_MODEL,
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
].filter((m): m is string => !!m);

export async function aiVision(imageDataUrl: string, instruction: string): Promise<string> {
  let lastErr: unknown = null;
  for (const model of VISION_MODELS) {
    try {
      const res = await groq().chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: 3000,
        messages: [{ role: "user", content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ] }],
      });
      return res.choices[0].message.content ?? "";
    } catch (err) {
      lastErr = err; // rate limit, retired model, image too large -> next model
    }
  }
  throw lastErr ?? new Error("Model AI pembaca gambar tidak tersedia");
}
