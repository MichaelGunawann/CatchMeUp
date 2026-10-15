/**
 * Lightweight passage retrieval for the student AI tutor: split materials
 * into page-aware chunks and pick the ones most relevant to the question,
 * so the model answers from the actual book content (previously it only
 * ever saw material TITLES and could not explain anything inside them).
 *
 * Keyword scoring (TF-IDF-ish) plus special handling for chapter references
 * ("bab 1", "BAB I", "bab satu"), which are how students usually ask.
 */

export type Chunk = { materialTitle: string; page: number | null; text: string };

const STOPWORDS = new Set(("yang dan di ke dari ini itu untuk dengan pada adalah atau juga tidak akan dalam " +
  "apa apakah bagaimana kenapa mengapa jelaskan tolong bisa saya aku kamu kita mau ingin tentang soal " +
  "materi buku tolong dong ya kak bu pak the of and to in").split(" "));

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
const WORDS: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10 };
const TO_ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

/** Chapter number the student is asking about, if any ("bab 1", "bab I", "bab satu"). */
export function requestedChapter(question: string): number | null {
  const m = question.toLowerCase().match(/\b(?:bab|chapter|unit|tema)\s+([0-9]+|[ivx]+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/);
  if (!m) return null;
  const v = m[1];
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return ROMAN[v] ?? WORDS[v] ?? null;
}

export function chunkMaterial(title: string, text: string, size = 1400): Chunk[] {
  const chunks: Chunk[] = [];
  // Split on page markers "[hal. N]" when present.
  const parts = text.split(/(?=\[hal\. \d+\])/);
  for (const part of parts) {
    const pm = part.match(/^\[hal\. (\d+)\]\s*/);
    const page = pm ? parseInt(pm[1], 10) : null;
    const body = (pm ? part.slice(pm[0].length) : part).replace(/\s+/g, " ").trim();
    for (let i = 0; i < body.length; i += size) {
      const piece = body.slice(i, i + size + 150); // small overlap
      if (piece.length > 40) chunks.push({ materialTitle: title, page, text: piece });
    }
  }
  return chunks;
}

/** Picks the chunks most relevant to `query`, within a character budget, in document order. */
export function retrieve(chunks: Chunk[], query: string, budget = 9000): Chunk[] {
  if (chunks.length === 0) return [];
  const qTerms = [...new Set(tokenize(query))];
  const chapter = requestedChapter(query);

  // Document frequency for IDF.
  const df = new Map<string, number>();
  const chunkTokens = chunks.map(c => {
    const toks = tokenize(c.text);
    for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
    return toks;
  });
  const N = chunks.length;

  const chapterPatterns = chapter
    ? [new RegExp(`\\b(bab|chapter|unit|tema)\\s+(${chapter}|${TO_ROMAN[chapter] ?? "x^"})\\b`, "i")]
    : [];

  const scored = chunks.map((c, i) => {
    let score = 0;
    const toks = chunkTokens[i];
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const q of qTerms) {
      const f = tf.get(q) ?? 0;
      if (f > 0) score += (1 + Math.log(f)) * Math.log(1 + N / (df.get(q) ?? 1));
    }
    if (chapterPatterns.some(re => re.test(c.text))) score += 25;
    return { c, i, score };
  });

  let picked = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // A chapter was asked for: also take the chunks right AFTER the best
  // chapter heading - the chapter's content follows its title.
  if (chapter && picked.length > 0 && chapterPatterns.some(re => re.test(picked[0].c.text))) {
    const start = picked[0].i;
    const follow = scored.slice(start, start + 6);
    picked = [...follow, ...picked.filter(p => p.i < start || p.i >= start + 6)];
  }

  // Nothing matched (e.g. "jelaskan materinya"): give an overview from the
  // start of each material, skipping the first pages (cover, preface).
  if (picked.length === 0) {
    const byTitle = new Map<string, typeof scored>();
    for (const s of scored) byTitle.set(s.c.materialTitle, [...(byTitle.get(s.c.materialTitle) ?? []), s]);
    picked = [...byTitle.values()].flatMap(list => list.slice(Math.min(3, Math.floor(list.length * 0.05)), Math.min(3, Math.floor(list.length * 0.05)) + 3));
  }

  const out: typeof scored = [];
  let used = 0;
  for (const p of picked) {
    if (used + p.c.text.length > budget) continue;
    if (out.some(o => o.i === p.i)) continue;
    out.push(p);
    used += p.c.text.length;
  }
  return out.sort((a, b) => a.i - b.i).map(o => o.c);
}
