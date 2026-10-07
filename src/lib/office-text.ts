import { inflateRawSync } from "zlib";

/**
 * Minimal ZIP reader (central directory + stored/deflate entries) - enough
 * to pull slide XML out of a .pptx without adding a dependency. Office
 * Open XML files are plain ZIP archives.
 */
function readZipEntries(buf: Buffer, wanted: (name: string) => boolean): Map<string, Buffer> {
  // End of central directory record: scan backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("File bukan arsip Office yang valid");

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();

  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (!wanted(name)) continue;
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(start, start + compSize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
  }
  return out;
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Text of every slide in a .pptx, in slide order. */
export function extractPptxText(buffer: Buffer): string {
  const slides = readZipEntries(buffer, n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const ordered = [...slides.entries()].sort(
    (a, b) => Number(a[0].match(/(\d+)\.xml$/)![1]) - Number(b[0].match(/(\d+)\.xml$/)![1]),
  );
  return ordered
    .map(([, xml], i) => {
      const paragraphs = xml.toString("utf8").split(/<\/a:p>/).map(p =>
        [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => decodeXml(m[1])).join(""),
      ).filter(t => t.trim());
      return paragraphs.length ? `[Slide ${i + 1}] ${paragraphs.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Text budget for the question-generation prompt. Taking only the first N
 * characters of a textbook gives the AI the cover, preface and table of
 * contents and nothing else, so long documents are sampled evenly across
 * their whole length instead.
 */
export function sampleTextForPrompt(text: string, budget = 12000, slices = 6): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= budget) return clean;
  const sliceLen = Math.floor(budget / slices);
  // Skip the first ~3% (cover / front matter) when there's plenty of text.
  const start = Math.floor(clean.length * 0.03);
  const span = clean.length - start - sliceLen;
  const parts: string[] = [];
  for (let i = 0; i < slices; i++) {
    const at = start + Math.floor((span * i) / Math.max(1, slices - 1));
    parts.push(clean.slice(at, at + sliceLen));
  }
  return parts.join(" … ");
}

/**
 * The `segment`-th of `segments` equal parts of a document (0-based), so
 * batched generation can give each batch a different part of the material
 * instead of the same excerpt (which produced near-duplicate questions).
 */
export function documentSegment(text: string, segment: number, segments: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!segments || segments <= 1) return clean;
  const n = Math.max(1, Math.floor(segments));
  const i = Math.min(Math.max(0, Math.floor(segment)), n - 1);
  const size = Math.ceil(clean.length / n);
  return clean.slice(i * size, (i + 1) * size);
}
