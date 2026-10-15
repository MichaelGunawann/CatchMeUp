#!/usr/bin/env node
/**
 * One-off: extract and cache the text of every material that doesn't have
 * it yet (materials.content_text, migration 022), so Tanya AI can answer
 * from materials uploaded before text caching existed.
 *
 *   node scripts/backfill-material-text.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (env or
 * .env.local). Safe to re-run: only fills rows where content_text is empty.
 */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
class NoWebSocket { constructor() { throw new Error("realtime not used"); } }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }, realtime: { transport: NoWebSocket },
});

async function extract(buffer, name) {
  name = name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
    return text.map((p, i) => `[hal. ${i + 1}] ${p.replace(/\s+/g, " ").trim()}`).filter(p => p.length > 10).join("\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  return ""; // .pptx is handled by the app on first use
}

const { data: rows, error } = await db.from("materials").select("id, title, file_url, content_text").is("content_text", null);
if (error) { console.error("❌", error.message, "\n   (Sudah menjalankan migrasi 022?)"); process.exit(1); }
console.log(`${rows.length} materi belum punya teks.`);
for (const m of rows) {
  if (!m.file_url) { console.log(`- ${m.title}: tidak ada file, dilewati`); continue; }
  const t0 = Date.now();
  const { data, error: dlErr } = await db.storage.from("materials").download(m.file_url);
  if (dlErr || !data) { console.log(`- ${m.title}: gagal unduh (${dlErr?.message})`); continue; }
  const text = (await extract(Buffer.from(await data.arrayBuffer()), m.file_url)).slice(0, 400_000);
  if (!text) { console.log(`- ${m.title}: tidak ada teks terbaca`); continue; }
  const { error: upErr } = await db.from("materials").update({ content_text: text }).eq("id", m.id);
  console.log(`- ${m.title}: ${upErr ? "GAGAL " + upErr.message : `${text.length} karakter`} (${Math.round((Date.now() - t0) / 1000)} dtk)`);
}
console.log("Selesai.");
