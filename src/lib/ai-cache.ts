import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

// Stored AI results (table ai_cache, migration 030), reused while the
// input they were made from is unchanged. Every helper degrades to "no
// cache" if the table doesn't exist yet, so the feature keeps working.

export function hashInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
}

export async function readCache<T>(key: string): Promise<{ value: T; inputHash: string; updatedAt: string } | null> {
  const { data, error } = await supabaseAdmin.from("ai_cache").select("value, input_hash, updated_at").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return { value: data.value as T, inputHash: data.input_hash as string, updatedAt: data.updated_at as string };
}

export async function writeCache(key: string, inputHash: string, value: unknown): Promise<void> {
  await supabaseAdmin.from("ai_cache").upsert({ key, input_hash: inputHash, value, updated_at: new Date().toISOString() });
}
