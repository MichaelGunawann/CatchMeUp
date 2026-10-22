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

export type QuestionType = "pg" | "pg_kompleks" | "benar_salah" | "menjodohkan" | "esai";

export const QUESTION_TYPES: QuestionType[] = ["pg", "pg_kompleks", "benar_salah", "menjodohkan", "esai"];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  pg: "Pilihan Ganda",
  pg_kompleks: "PG Kompleks",
  benar_salah: "Benar / Salah",
  menjodohkan: "Menjodohkan",
  esai: "Esai",
};

export const QUESTION_TYPE_HINT: Record<QuestionType, string> = {
  pg: "Satu jawaban benar.",
  pg_kompleks: "Jawaban benar bisa lebih dari satu - siswa mencentang semua yang benar.",
  benar_salah: "Beberapa pernyataan; siswa menentukan Benar atau Salah untuk tiap pernyataan.",
  menjodohkan: "Siswa memasangkan setiap item kiri dengan pasangan yang tepat di kanan.",
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
 * - pg_kompleks, benar_salah: full points only when every part is right
 *   (partial-credit policy for these is still to be decided - change it here)
 * - menjodohkan: points in proportion to correctly matched pairs
 * - esai: waits for the teacher (0 points until graded); empty = 0
 */
export function gradeAnswer(q: QuestionLike, answer: string | null | undefined, points: number): GradeResult {
  const type = questionTypeOf(q);
  const ans = answer ?? "";
  switch (type) {
    case "pg_kompleks": {
      const key = complexKey(q.answer_key);
      const ok = key.length > 0 && encodeComplex(decodeComplex(ans)) === encodeComplex(key);
      return { isCorrect: ok, earned: ok ? points : 0, pending: false };
    }
    case "benar_salah": {
      const key = Array.isArray(q.answer_key) ? q.answer_key.map(String) : [];
      const given = parseArray(ans).map(v => (v == null ? "" : String(v)));
      const ok = key.length > 0 && key.every((k, i) => given[i] === k);
      return { isCorrect: ok, earned: ok ? points : 0, pending: false };
    }
    case "menjodohkan": {
      const key = Array.isArray(q.answer_key) ? q.answer_key.map(Number) : [];
      const given = parseArray(ans).map(v => (v == null || v === "" ? -1 : Number(v)));
      const right = key.filter((k, i) => given[i] === k).length;
      const ok = key.length > 0 && right === key.length;
      const earned = key.length ? Math.round((points * right / key.length) * 100) / 100 : 0;
      return { isCorrect: ok, earned, pending: false };
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
    case "esai": {
      const rubric = (q.answer_key as { rubric?: string } | null)?.rubric;
      return rubric ? `Pedoman: ${rubric}` : "Dinilai guru";
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
