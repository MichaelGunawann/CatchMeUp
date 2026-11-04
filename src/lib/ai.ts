import Groq from "groq-sdk";
import { supabaseAdmin } from "@/lib/supabase/server";
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

// TEMPORARY (token-usage measurement for the report): every AI call's token
// counts are written to ai_cache under "usage:*". Remove after measuring.
type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null | undefined;
async function recordUsage(model: string, usage: Usage, kind: string) {
  if (!usage) return;
  await supabaseAdmin.from("ai_cache").insert({
    key: `usage:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    input_hash: "usage",
    value: { model, kind, prompt: usage.prompt_tokens ?? 0, completion: usage.completion_tokens ?? 0, total: usage.total_tokens ?? 0 },
  }).then(() => {}, () => {});
}

const isRateLimit = (err: unknown) => (err as { status?: number } | null)?.status === 429;

type Params = Omit<ChatCompletionCreateParamsNonStreaming, "model">;
type StreamParams = Omit<ChatCompletionCreateParamsStreaming, "model" | "stream">;

export async function aiChat(tier: AiTier, params: Params) {
  const [first, second] = tier === "smart" ? [SMART_MODEL, FAST_MODEL] : [FAST_MODEL, SMART_MODEL];
  let res;
  try {
    res = await groq().chat.completions.create({ ...params, model: first });
  } catch (err) {
    if (!isRateLimit(err)) throw err;
    res = await groq().chat.completions.create({ ...params, model: second });
  }
  await recordUsage(res.model, res.usage, "chat");
  return res;
}

export async function aiChatStream(tier: AiTier, params: StreamParams) {
  const [first, second] = tier === "smart" ? [SMART_MODEL, FAST_MODEL] : [FAST_MODEL, SMART_MODEL];
  let stream;
  try {
    stream = await groq().chat.completions.create({ ...params, model: first, stream: true });
  } catch (err) {
    if (!isRateLimit(err)) throw err;
    stream = await groq().chat.completions.create({ ...params, model: second, stream: true });
  }
  const s = stream;
  return (async function* () {
    let usage: Usage = null, model = "";
    for await (const chunk of s) {
      const x = (chunk as unknown as { x_groq?: { usage?: Usage } }).x_groq;
      if (x?.usage) usage = x.usage;
      model = chunk.model ?? model;
      yield chunk;
    }
    await recordUsage(model, usage, "stream");
  })();
}

/** Tutor questions that need the smart model: numbers/working, or long/complex. */
export function tutorTier(question: string): AiTier {
  const q = question.toLowerCase();
  if (/\d/.test(q) || /hitung|berapa|rumus|selesaikan|buktikan|jelaskan bab|kenapa|mengapa|bagaimana/.test(q) || q.length > 160) return "smart";
  return "fast";
}

// Vision (reading scanned/photographed materials, src/lib/ocr.ts). Groq's
// vision models change more often than the text ones: known ids are tried
// in order (GROQ_VISION_MODEL first when set), then any vision-looking
// model the account's model list offers.
const VISION_MODELS = [
  process.env.GROQ_VISION_MODEL,
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
].filter((m): m is string => !!m);

let _visionModel: string | null = null; // the one that worked last time

async function visionCandidates(): Promise<string[]> {
  let listed: string[] = [];
  try {
    const res = await groq().models.list();
    listed = (res.data ?? []).map(m => m.id).filter(id => /vision|vl\b|-vl|scout|maverick|qwen3\.\d+-\d+b|gemma-?3/i.test(id));
  } catch { /* list unavailable - known ids only */ }
  return [...new Set([...(_visionModel ? [_visionModel] : []), ...VISION_MODELS, ...listed])];
}

export async function aiVision(imageDataUrl: string, instruction: string): Promise<string> {
  const errors: string[] = [];
  for (const model of await visionCandidates()) {
    try {
      const res = await groq().chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: 4000,
        messages: [{ role: "user", content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ] }],
      });
      _visionModel = model;
      await recordUsage(model, res.usage, "vision");
      // Some vision models think out loud first; keep only the answer.
      return (res.choices[0].message.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      errors.push(`${model}: ${status ?? ""} ${err instanceof Error ? err.message.slice(0, 120) : ""}`);
    }
  }
  throw new Error(`Tidak ada model AI pembaca gambar yang bisa dipakai (${errors.join(" | ")})`);
}
