// Cheap first pass for essay answers (no AI): which teacher keywords appear
// literally (or almost - typos, Indonesian affixes) and how much the answer
// overlaps the example answer. Clearly empty/off-topic answers get a
// suggestion without calling the AI; the rest go to the AI with this report
// so it checks MEANING and CONTEXT, not just whether a word is present.

const STOP = new Set(("yang dan di ke dari ini itu untuk dengan pada adalah atau juga tidak akan dalam karena sehingga " +
  "oleh maka jika agar bisa dapat ada lebih sangat saya aku kamu kita mereka dia ia nya pun sudah telah").split(" "));

function stem(w: string): string {
  let x = w;
  x = x.replace(/(nya|lah|kah|pun)$/, "");
  x = x.replace(/^(meng|meny|mem|men|me|peng|peny|pem|pen|pe|ber|be|ter|te|di|ke|se)(?=[a-z]{4,})/, "");
  x = x.replace(/(kan|an|i)$/, m => (x.length - m.length >= 4 ? "" : m));
  return x;
}

export function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 2 && !STOP.has(w)).map(stem);
}

function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  // edit distance <= 1
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export type EssayPrecheck = {
  words: number;
  hits: string[];      // keywords found literally / nearly
  missing: string[];   // keywords not found literally (may still be paraphrased)
  exampleOverlap: number; // 0..1 share of the example answer's content words present
};

export function precheckEssay(answer: string, keywords: string[], example: string): EssayPrecheck {
  const ans = tokens(answer);
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const has = (kw: string) => {
    const kt = tokens(kw);
    return kt.length > 0 && kt.every(k => ans.some(a => near(a, k)));
  };
  const hits = keywords.filter(has);
  const ex = [...new Set(tokens(example))];
  const exampleOverlap = ex.length ? ex.filter(t => ans.some(a => near(a, t))).length / ex.length : 0;
  return { words, hits, missing: keywords.filter(k => !hits.includes(k)), exampleOverlap };
}

/** A suggestion that needs no AI, or null when the AI should judge it. */
export function obviousSuggestion(p: EssayPrecheck, hasKeywords: boolean, hasExample: boolean): { points: 0; reason: string } | null {
  if (p.words < 3) return { points: 0, reason: "Jawaban kosong atau terlalu singkat (dicek otomatis, tanpa AI)." };
  if (hasKeywords && p.hits.length === 0 && (!hasExample || p.exampleOverlap < 0.1) && p.words < 12) {
    return { points: 0, reason: "Tidak menyinggung satu pun kata kunci/konsep yang diminta (dicek otomatis, tanpa AI)." };
  }
  return null;
}
