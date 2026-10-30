// Question types beyond plain multiple choice (TKA formats), shared by the
// browser (authoring, exam, review) and the server (grading).
//
// Storage (questions table, migration 026):
//   pg           options {A..E}            correct_answer "A"           answer_key null
//   pg_kompleks  options {A..E}            correct_answer null          answer_key ["A","C"]
//   benar_salah  options {statements:[..]} correct_answer null          answer_key ["B","S",..]
//   menjodohkan  options {left:[..], right:[..]}                        answer_key [rightIdx per left]
//   esai         options {}                correct_answer null          answer_key {rubric} | null
//
// Student answers are always stored as one string:
//   pg "A" · pg_kompleks "A,C" · benar_salah '["B","S",null]' ·
//   menjodohkan '[2,0,null]' (indices into the ORIGINAL right list) · esai free text

export type QuestionType = "pg" | "pg_kompleks" | "benar_salah" | "menjodohkan" | "isian" | "esai";

export const QUESTION_TYPES: QuestionType[] = ["pg", "pg_kompleks", "benar_salah", "menjodohkan", "isian", "esai"];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  pg: "Pilihan Ganda",
  pg_kompleks: "PG Kompleks",
  benar_salah: "Benar / Salah",
  menjodohkan: "Menjodohkan",
  isian: "Isian Singkat",
  esai: "Esai",
};

export const QUESTION_TYPE_HINT: Record<QuestionType, string> = {
  pg: "Satu jawaban benar.",
  pg_kompleks: "Jawaban benar bisa lebih dari satu. Nilai parsial per opsi (dicentang/tidak dicentang dengan benar).",
  benar_salah: "Beberapa pernyataan, siswa menentukan Benar/Salah. Nilai parsial per pernyataan.",
  menjodohkan: "Siswa memasangkan item kiri dengan kanan. Nilai parsial per pasangan.",
  isian: "Jawaban singkat (angka/kata) yang dinilai OTOMATIS dengan kunci, misal 5040. Tidak perlu dicek guru.",
  esai: "Jawaban uraian, dinilai guru setelah dikumpulkan.",
};

export const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

export function questionTypeOf(q: { question_type?: string | null } | null | undefined): QuestionType {
  const t = q?.question_type;
  return (QUESTION_TYPES as string[]).includes(t ?? "") ? (t as QuestionType) : "pg";
}

/** Auto-graded types (everything except esai). */
export function isAutoGraded(type: QuestionType): boolean {
  return type !== "esai";
}

type AnyOptions = Record<string, unknown> | null | undefined;

export function statementsOf(options: AnyOptions): string[] {
  const s = (options as { statements?: unknown } | null)?.statements;
  return Array.isArray(s) ? s.map(String) : [];
}

export function matchingOf(options: AnyOptions): { left: string[]; right: string[] } {
  const o = (options ?? {}) as { left?: unknown; right?: unknown };
  return {
    left: Array.isArray(o.left) ? o.left.map(String) : [],
    right: Array.isArray(o.right) ? o.right.map(String) : [],
  };
}

export function letterOptions(options: AnyOptions): Array<{ key: string; text: string }> {
  const o = (options ?? {}) as Record<string, unknown>;
  return OPTION_LETTERS.filter(k => typeof o[k] === "string" && (o[k] as string).trim()).map(k => ({ key: k, text: o[k] as string }));
}

function parseArray(answer: string | null | undefined): unknown[] {
  if (!answer) return [];
  try { const v = JSON.parse(answer); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** The complex-PG key as a sorted letter list. */
export function complexKey(key: unknown): string[] {
  return Array.isArray(key) ? key.map(String).filter(k => (OPTION_LETTERS as readonly string[]).includes(k)).sort() : [];
}

export function encodeComplex(letters: string[]): string {
  return [...new Set(letters)].sort().join(",");
}
export function decodeComplex(answer: string | null | undefined): string[] {
  return (answer ?? "").split(",").map(s => s.trim()).filter(Boolean).sort();
}

export type QuestionLike = {
  question_type?: string | null;
  options: AnyOptions;
  correct_answer?: string | null;
  answer_key?: unknown;
};

/**
 * Has the student given an answer? For multi-part types every part must be
 * filled (used for the "soal belum dijawab" check before submitting).
 */
export function isAnswered(type: QuestionType, answer: string | null | undefined, partCount = 0): boolean {
  if (!answer || !answer.trim()) return false;
  if (type === "benar_salah" || type === "menjodohkan") {
    const arr = parseArray(answer);
    return arr.length >= partCount && arr.slice(0, partCount).every(v => v !== null && v !== undefined && v !== "");
  }
  return true;
}

export type GradeResult = {
  /** true/false when decided; null while an essay waits for the teacher */
  isCorrect: boolean | null;
  earned: number;
  pending: boolean;
};

/**
 * Grades one answer. Scoring rules:
 * - pg: exact letter
 * - pg_kompleks: partial per option - every option is one decision worth
 *   points / number of options: a key option ticked, or a non-key option
 *   left unticked, earns its share; a wrong decision earns 0 (no minus).
 *   Ticking nothing at all = 0 (not attempted).
 * - benar_salah: partial - share of statements judged correctly
 * - menjodohkan: partial - share of correctly matched pairs
 * - esai: waits for the teacher (0 points until graded); empty = 0
 */
export function gradeAnswer(q: QuestionLike, answer: string | null | undefined, points: number): GradeResult {
  const type = questionTypeOf(q);
  const ans = answer ?? "";
  switch (type) {
    case "pg_kompleks": {
      const key = complexKey(q.answer_key);
      const picked = decodeComplex(ans);
      const all = letterOptions(q.options).map(o => o.key);
      const decisionsRight = all.filter(k => key.includes(k) === picked.includes(k)).length;
      const ok = key.length > 0 && decisionsRight === all.length;
      if (picked.length === 0 || all.length === 0) return { isCorrect: false, earned: 0, pending: false };
      return { isCorrect: ok, earned: roundPoints(points * decisionsRight / all.length), pending: false };
    }
    case "benar_salah": {
      const key = Array.isArray(q.answer_key) ? q.answer_key.map(String) : [];
      const given = parseArray(ans).map(v => (v == null ? "" : String(v)));
      const right = key.filter((k, i) => given[i] === k).length;
      const ok = key.length > 0 && right === key.length;
      return { isCorrect: ok, earned: key.length ? roundPoints(points * right / key.length) : 0, pending: false };
    }
    case "menjodohkan": {
      const key = Array.isArray(q.answer_key) ? q.answer_key.map(Number) : [];
      const given = parseArray(ans).map(v => (v == null || v === "" ? -1 : Number(v)));
      const right = key.filter((k, i) => given[i] === k).length;
      const ok = key.length > 0 && right === key.length;
      const earned = key.length ? roundPoints(points * right / key.length) : 0;
      return { isCorrect: ok, earned, pending: false };
    }
    case "isian": {
      const ok = isianMatches(ans, isianKey(q.answer_key));
      return { isCorrect: ok, earned: ok ? points : 0, pending: false };
    }
    case "esai": {
      if (!ans.trim()) return { isCorrect: false, earned: 0, pending: false };
      return { isCorrect: null, earned: 0, pending: true };
    }
    default: {
      const ok = !!ans && ans === q.correct_answer;
      return { isCorrect: ok, earned: ok ? points : 0, pending: false };
    }
  }
}

/** Accepted answers of a short-answer question ({accepted: [...]}). */
export function isianKey(key: unknown): string[] {
  const acc = (key as { accepted?: unknown } | null)?.accepted;
  return Array.isArray(acc) ? acc.map(String).map(x => x.trim()).filter(Boolean) : [];
}

/**
 * Normalises a short answer for comparison: case, spaces and punctuation
 * don't matter, and numbers are compared by value - "5.040", "5040",
 * "5,040 cara" and "5040 susunan" all equal 5040; "0,5" equals "0.5".
 */
function normalizeShort(s: string): { num: number | null; text: string; letters: string } {
  const t = s.toLowerCase().trim();
  // A minus counts only as a sign, not as a hyphen ("abad ke-15" is 15).
  const m = t.match(/(?<![\p{L}\p{N}.,-])-?\d[\d.,\s]*/u) ?? t.match(/\d[\d.,\s]*/);
  let num: number | null = null;
  if (m) {
    let d = m[0].replace(/\s/g, "").replace(/[.,]$/, "");
    // 1.234.567 / 1,234 thousands separators vs 0,5 / 2.5 decimals
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(d)) d = d.replace(/[.,]/g, "");
    else d = d.replace(",", ".");
    const v = Number(d);
    if (Number.isFinite(v)) num = v;
  }
  return { num, text: t.replace(/[^\p{L}\p{N}]+/gu, ""), letters: t.replace(/[^\p{L}]+/gu, "") };
}

export function isianMatches(answer: string, accepted: string[]): boolean {
  if (!answer.trim() || accepted.length === 0) return false;
  const a = normalizeShort(answer);
  return accepted.some(k => {
    const b = normalizeShort(k);
    if (a.num === null || b.num === null) return a.text.length > 0 && a.text === b.text;
    if (Math.abs(a.num - b.num) >= 1e-9) return false;
    // Same number: a plain-number key accepts "5040 cara"; a key with words
    // ("H2O", "abad ke-15") also needs those words, so "CO2" isn't "H2O".
    return !b.letters || a.letters.includes(b.letters) || (a.letters.length >= 3 && b.letters.includes(a.letters));
  });
}

function roundPoints(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human-readable student answer ("A, C", "1. Benar · 2. Salah", "Paris → Prancis"). */
export function describeAnswer(q: QuestionLike, answer: string | null | undefined): string {
  const type = questionTypeOf(q);
  if (!answer || !answer.trim()) return "Tidak dijawab";
  switch (type) {
    case "pg_kompleks":
      return decodeComplex(answer).join(", ") || "Tidak dijawab";
    case "benar_salah":
      return parseArray(answer).map((v, i) => `${i + 1}. ${v === "B" ? "Benar" : v === "S" ? "Salah" : "-"}`).join(" · ");
    case "menjodohkan": {
      const { left, right } = matchingOf(q.options);
      return parseArray(answer).map((v, i) => `${left[i] ?? i + 1} → ${v == null || v === "" ? "-" : right[Number(v)] ?? "-"}`).join(" · ");
    }
    case "esai":
    case "isian":
      return answer;
    default: {
      const text = (q.options as Record<string, unknown> | null)?.[answer];
      return typeof text === "string" ? `${answer}. ${text}` : answer;
    }
  }
}

/** Human-readable answer key. */
export function describeKey(q: QuestionLike): string {
  const type = questionTypeOf(q);
  switch (type) {
    case "pg_kompleks":
      return complexKey(q.answer_key).join(", ");
    case "benar_salah":
      return (Array.isArray(q.answer_key) ? q.answer_key : []).map((v, i) => `${i + 1}. ${v === "B" ? "Benar" : "Salah"}`).join(" · ");
    case "menjodohkan": {
      const { left, right } = matchingOf(q.options);
      return (Array.isArray(q.answer_key) ? q.answer_key : []).map((r, i) => `${left[i] ?? i + 1} → ${right[Number(r)] ?? "-"}`).join(" · ");
    }
    case "isian":
      return isianKey(q.answer_key).join(" / ") || "-";
    case "esai": {
      const k = (q.answer_key ?? {}) as { rubric?: string; keywords?: string[] };
      const parts = [k.keywords?.length ? `Kata kunci: ${k.keywords.join(", ")}` : "", k.rubric ? `Pedoman: ${k.rubric}` : ""].filter(Boolean);
      return parts.length ? parts.join(" · ") : "Dinilai guru";
    }
    default: {
      const k = q.correct_answer ?? "";
      const text = (q.options as Record<string, unknown> | null)?.[k];
      return typeof text === "string" ? `${k}. ${text}` : k;
    }
  }
}

/** Deterministic shuffle (same seed -> same order), used for matching's right column. */
export function seededOrder(n: number, seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Types used in self-paced practice (auto-graded; essays need a teacher). */
export const PRACTICE_TYPES: QuestionType[] = ["pg", "pg_kompleks", "benar_salah", "menjodohkan", "isian"];

/**
 * What a student sees for a question (no answer key). Matching's right
 * column is shuffled with `seed` (answers keep the ORIGINAL indices).
 */
export function displayPayload(q: QuestionLike & { question: string }, seed: string, optionOrder?: (keys: string[]) => string[]) {
  const type = questionTypeOf(q);
  if (type === "benar_salah") return { type, displayOptions: [] as { key: string; text: string }[], statements: statementsOf(q.options) };
  if (type === "menjodohkan") {
    const { left, right } = matchingOf(q.options);
    const order = seededOrder(right.length, seed);
    return { type, displayOptions: [] as { key: string; text: string }[], matchLeft: left, matchRight: order.map(i => ({ index: i, text: right[i] })) };
  }
  if (type === "esai" || type === "isian") return { type, displayOptions: [] as { key: string; text: string }[] };
  const opts = letterOptions(q.options);
  const keys = optionOrder ? optionOrder(opts.map(o => o.key)) : opts.map(o => o.key);
  const textOf = Object.fromEntries(opts.map(o => [o.key, o.text]));
  return { type, displayOptions: keys.map(k => ({ key: k, text: textOf[k] })) };
}
