import { deflateSync } from "zlib";
import { aiVision } from "@/lib/ai";

// Reading scanned / photographed files (a PDF that is only pictures, e.g. a
// phone photo of handwritten notes or a screenshot saved as PDF). They have
// no text layer, so materials made from them were empty: no "Impor soal",
// no AI questions, nothing for Tanya AI. Each page's picture is taken out of
// the PDF and read by a vision model once; the text is then cached with the
// material like any other.

const MAX_OCR_PAGES = 12;
const MAX_SIDE = 1500; // px; keeps one page well under the model's image limit

type RawImage = { data: Uint8ClampedArray | Uint8Array; width: number; height: number; channels: 1 | 3 | 4 };

/** True when a PDF's extracted text is (almost) empty for its page count. */
export function looksScanned(text: string, pages: number): boolean {
  const letters = text.replace(/\[hal\. \d+\]/g, "").replace(/\s+/g, "").length;
  return letters < Math.max(40, pages * 40);
}

/** The pictures of each page (largest first), as grayscale PNGs. */
export async function pdfPageImages(buffer: Buffer): Promise<Array<{ page: number; png: Buffer }>> {
  const { getDocumentProxy, extractImages } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const out: Array<{ page: number; png: Buffer }> = [];
  for (let p = 1; p <= Math.min(pdf.numPages, MAX_OCR_PAGES); p++) {
    let imgs: RawImage[] = [];
    try { imgs = (await extractImages(pdf, p)) as unknown as RawImage[]; } catch { continue; }
    imgs = imgs.filter(i => i.width >= 200 && i.height >= 200).sort((a, b) => b.width * b.height - a.width * a.height);
    if (!imgs.length) continue;
    const biggest = imgs[0].width * imgs[0].height;
    // A page can be cut into a few large pieces; small ones are logos/icons.
    for (const img of imgs.filter(i => i.width * i.height >= biggest * 0.2).slice(0, 3)) {
      out.push({ page: p, png: toGrayPng(img) });
    }
  }
  return out;
}

/** Reads the text in page pictures with the vision model ("[hal. N] ..."). */
export async function ocrPages(pages: Array<{ page: number; png: Buffer }>): Promise<string> {
  const parts: string[] = [];
  for (const { page, png } of pages) {
    const text = await aiVision(`data:image/png;base64,${png.toString("base64")}`,
      "Salin SEMUA teks pada gambar ini persis apa adanya (Bahasa Indonesia), urut dari atas ke bawah. " +
      "Termasuk tulisan tangan, nomor soal, pilihan jawaban, dan rumus. Tulis rumus sebagai teks biasa " +
      "(contoh: Un = a + (n - 1)b, x², √2, 3/4). Jangan menambah penjelasan atau komentar apa pun.");
    if (text.trim()) parts.push(`[hal. ${page}] ${text.trim()}`);
  }
  return parts.join("\n");
}

// ── tiny PNG encoder (grayscale, box-downscaled) ─────────────────────────

function toGrayPng(img: RawImage): Buffer {
  const { width: w, height: h, channels: ch, data } = img;
  const step = Math.max(1, Math.ceil(Math.max(w, h) / MAX_SIDE));
  const ow = Math.floor(w / step), oh = Math.floor(h / step);
  const raw = Buffer.alloc((ow + 1) * oh);
  for (let y = 0; y < oh; y++) {
    raw[y * (ow + 1)] = 0; // filter: none
    for (let x = 0; x < ow; x++) {
      let sum = 0;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const i = ((y * step + dy) * w + (x * step + dx)) * ch;
          sum += ch === 1 ? data[i] : (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
      }
      raw[y * (ow + 1) + 1 + x] = Math.round(sum / (step * step));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
