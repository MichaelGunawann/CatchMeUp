import { supabaseAdmin } from "@/lib/supabase/server";
import { extractPptxText } from "@/lib/office-text";
import { looksScanned, ocrPages, pdfPageImages } from "@/lib/ocr";

/**
 * Full text of teacher materials, for the student AI tutor.
 *
 * Text is extracted once per material and cached in materials.content_text
 * (migration 022). Page boundaries are kept as "[hal. N]" markers (PDF
 * pages / PPTX slides) so answers can cite the right page. If the column
 * doesn't exist yet, an in-memory cache per server instance is used.
 */

const memoryCache = new Map<string, string>();
/** Why reading a scanned file failed (by file name), for the upload route's message. */
export const ocrErrors = new Map<string, string>();
const MAX_STORED_CHARS = 400_000; // ~ a 250-page textbook; keeps rows sane

export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
    const joined = (text as string[])
      .map((page, i) => `[hal. ${i + 1}] ${page.replace(/\s+/g, " ").trim()}`)
      .filter(p => p.length > 10)
      .join("\n");
    // Scanned / photographed PDF (pictures only): read the pictures.
    if (looksScanned(joined, (text as string[]).length)) {
      try {
        const images = await pdfPageImages(buffer);
        if (!images.length) throw new Error("tidak ada gambar halaman yang bisa diambil dari PDF");
        const ocr = await ocrPages(images);
        if (ocr.trim()) return ocr;
        throw new Error("AI tidak menemukan teks pada gambar");
      } catch (err) {
        console.error("OCR failed:", fileName, err);
        ocrErrors.set(fileName, err instanceof Error ? err.message : String(err));
      }
    }
    return joined;
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

type MaterialRef = { id: string; file_url: string | null; content_text?: string | null; title?: string };

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

  if (!text.trim()) return ""; // nothing read: try again next time, don't cache
  memoryCache.set(m.id, text);
  // Persist so other server instances don't re-extract. Ignored if the
  // column doesn't exist yet (migration 022 not applied).
  await supabaseAdmin.from("materials").update({ content_text: text }).eq("id", m.id).then(() => {}, () => {});
  // Flag quiz sheets (migration 031; ignored before it runs).
  if (isQuestionSheet(text, m.title ?? "")) await supabaseAdmin.from("materials").update({ is_question_sheet: true }).eq("id", m.id).then(() => {}, () => {});
  return text;
}

/**
 * True for a quiz/worksheet (numbered questions, option lists, Google-Form
 * prints) rather than learning material. Signals, calibrated on real
 * uploads: question stems ending in "…" / "..." / "?" per 1000 characters
 * (worksheets ~1.3-4+, books/slides/articles <= ~1.1), "Mark only one oval"
 * / "N points" form prints, and a title such as "Kuis", "Soal", "Try Out".
 */
export function isQuestionSheet(text: string, title = ""): boolean {
  const t = text.replace(/\[hal\. \d+\]/g, "\n");
  if (t.length < 300 || t.length > 80_000) return false; // whole books aren't worksheets
  const per1k = (n: number) => (n * 1000) / t.length;
  // A stem marker followed by a line break, an option ("A. ") or the next
  // question number ("2 Banyak ...") - PDFs lose their line breaks.
  const stems = (t.match(/(…|\.\.\.|\?|\.{4,})(?=\s*(\n|$|[A-Ea-e][.)]\s|\d{1,3}[.)]?\s+[A-Z]))/g) ?? []).length;
  const formPrint = (t.match(/mark only one oval|pilih satu jawaban|\b\d+\s*(points|poin)\b/gi) ?? []).length;
  const titled = /kuis|quiz|soal|try ?out|ulangan|ujian|latihan|\blks\b|\bpts\b|\bpas\b|\buts\b|\buas\b|\btes\b|\btest\b/i.test(title);
  const score = per1k(stems) + (per1k(formPrint) >= 2 ? 2 : 0) + (titled ? 1 : 0);
  return stems >= 4 && score >= 2;
}
/** Saves already-extracted text (e.g. from the question-generation route). */
export async function cacheMaterialText(materialId: string, text: string) {
  const t = text.slice(0, MAX_STORED_CHARS);
  memoryCache.set(materialId, t);
  await supabaseAdmin.from("materials").update({ content_text: t }).eq("id", materialId).then(() => {}, () => {});
}
