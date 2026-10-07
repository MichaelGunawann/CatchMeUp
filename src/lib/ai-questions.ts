// Shared helpers for the AI question-generation routes.

/** Max questions a single model call is asked for - larger requests ran
 *  past the 60s function limit or got cut off mid-JSON. Callers batch. */
export const MAX_QUESTIONS_PER_CALL = 10;

export type RawQuestion = {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  sourceTitle?: string;
  sourcePage?: number;
};

function isQuestion(q: unknown): q is RawQuestion {
  const o = q as RawQuestion | null;
  return !!o && typeof o.question === "string" && !!o.question.trim() &&
    !!o.options && typeof o.options === "object" &&
    ["A", "B", "C", "D"].every(k => typeof o.options[k] === "string" && o.options[k].trim()) &&
    typeof o.correctAnswer === "string";
}

/**
 * Parses the model's JSON array of questions. If the array is malformed or
 * truncated (output hit the token limit), every complete top-level {...}
 * object is still recovered individually instead of discarding them all.
 */
export function parseQuestionsJson(text: string): RawQuestion[] {
  const start = text.indexOf("[");
  if (start < 0) return [];
  const end = text.lastIndexOf("]");
  if (end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed.filter(isQuestion);
    } catch { /* fall through to per-object recovery */ }
  }

  const out: RawQuestion[] = [];
  let depth = 0, objStart = -1, inString = false, escaped = false;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") { if (depth === 0) objStart = i; depth++; }
    else if (c === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          const obj = JSON.parse(text.slice(objStart, i + 1));
          if (isQuestion(obj)) out.push(obj);
        } catch { /* skip malformed object */ }
        objStart = -1;
      }
    }
  }
  return out;
}

/** Prompt fragment listing already-generated questions to avoid duplicates. */
export function avoidListPrompt(avoid: string[] | undefined): string {
  const list = (avoid ?? []).filter(Boolean).slice(-30).map(q => `- ${q.replace(/\s+/g, " ").slice(0, 140)}`);
  return list.length
    ? `\n\nJANGAN membuat soal yang sama atau mirip dengan soal-soal yang sudah ada berikut:\n${list.join("\n")}`
    : "";
}
