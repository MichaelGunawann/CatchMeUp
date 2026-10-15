import { supabaseAdmin } from "@/lib/supabase/server";
import { extractPptxText } from "@/lib/office-text";

/**
 * Full text of teacher materials, for the student AI tutor.
 *
 * Text is extracted once per material and cached in materials.content_text
 * (migration 022). Page boundaries are kept as "[hal. N]" markers (PDF
 * pages / PPTX slides) so answers can cite the right page. If the column
 * doesn't exist yet, an in-memory cache per server instance is used.
 */

const memoryCache = new Map<string, string>();
const MAX_STORED_CHARS = 400_000; // ~ a 250-page textbook; keeps rows sane

export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
    return (text as string[])
      .map((page, i) => `[hal. ${i + 1}] ${page.replace(/\s+/g, " ").trim()}`)
      .filter(p => p.length > 10)
      .join("\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (name.endsWith(".pptx")) {
    // extractPptxText already labels slides "[Slide N]"; use the same marker
    // style as PDF pages so citations work uniformly.
    return extractPptxText(buffer).replace(/\[Slide (\d+)\]/g, "[hal. $1]");
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  return "";
}

type MaterialRef = { id: string; file_url: string | null; content_text?: string | null };

export async function getMaterialText(m: MaterialRef): Promise<string> {
  if (m.content_text) return m.content_text;
  const cached = memoryCache.get(m.id);
  if (cached !== undefined) return cached;
  if (!m.file_url) return "";

  let text = "";
  try {
    const { data, error } = await supabaseAdmin.storage.from("materials").download(m.file_url);
    if (error || !data) return "";
    text = (await extractTextFromBuffer(Buffer.from(await data.arrayBuffer()), m.file_url)).slice(0, MAX_STORED_CHARS);
  } catch (err) {
    console.error("Material text extraction failed:", m.id, err);
    return "";
  }

  memoryCache.set(m.id, text);
  // Persist so other server instances don't re-extract. Ignored if the
  // column doesn't exist yet (migration 022 not applied).
  await supabaseAdmin.from("materials").update({ content_text: text }).eq("id", m.id).then(() => {}, () => {});
  return text;
}

/** Saves already-extracted text (e.g. from the question-generation route). */
export async function cacheMaterialText(materialId: string, text: string) {
  const t = text.slice(0, MAX_STORED_CHARS);
  memoryCache.set(materialId, t);
  await supabaseAdmin.from("materials").update({ content_text: t }).eq("id", materialId).then(() => {}, () => {});
}
