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

/**
 * Rules every question prompt appends: questions must stand on their own.
 * Students never see the teacher's file, so "menurut slide 4..." or
 * "lihat halaman 12" is unanswerable, and an explanation that only points
 * at a page teaches nothing.
 */
export const QUESTION_QUALITY_RULES = `
ATURAN KUALITAS SOAL (WAJIB):
- Siswa TIDAK melihat file materinya. Soal harus bisa dijawab tanpa membuka file: JANGAN menyebut "PPT", "slide", "halaman", "hal.", "materi ini", "teks di atas", "gambar di atas", "menurut buku", atau "pada materi disebutkan". Tulis faktanya langsung di soal bila perlu.
- Pilihan jawaban tidak boleh "semua benar"/"semua salah", dan hanya SATU yang benar.
- "explanation" berisi penjelasan isinya secara langsung (1-3 kalimat): kenapa jawaban itu benar dan, bila perlu, kenapa pengecoh salah. JANGAN menunjuk halaman, slide, atau "lihat materi".
- Bahasa sederhana dan sesuai tingkat kelas siswa.`;

// Soal that only make sense next to the original file ("menurut slide 3").
const FILE_REFERENCE = /\b(ppt|power ?point|(slide|salindia|halaman)\s*(ke-?)?\s*(\d|ini|di atas|tersebut|sebelumnya)|hal\.\s*\d|materi (ini|di atas|tersebut)|teks (di atas|tersebut)|gambar (di atas|berikut|tersebut)|menurut (materi|buku|modul|presentasi|teks|bacaan)|(dalam|di|oleh) (materi|presentasi|modul)\b|materi (menggambarkan|menjelaskan|menyebutkan|membahas|disebutkan)|disebutkan (dalam|di) (materi|teks|buku)|secara eksplisit|pada (materi|presentasi|modul) (ini|disebutkan|dijelaskan))/i;

// Strips "(hal. 4)", "[Sumber: ...]", "Lihat slide 3." from an explanation.
function cleanExplanation(text: string | undefined): string {
  return (text ?? "")
    .replace(/\[Sumber:[^\]]*\]/gi, "")
    .replace(/\(\s*(hal(aman)?\.?|slide)\s*\d+[^)]*\)/gi, "")
    .replace(/[^.!?]*\b(lihat|baca|cek|perhatikan)\b[^.!?]*\b(halaman|hal\.|slide|ppt|materi)\b[^.!?]*[.!?]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
      if (Array.isArray(parsed)) return polish(parsed.filter(isQuestion));
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
  return polish(out);
}

/** False for a question that only makes sense next to its source file ("menurut slide 3..."). */
export function isSelfContained(q: { question: string; options: Record<string, string> | unknown }): boolean {
  return !FILE_REFERENCE.test(q.question) &&
    !Object.values((q.options ?? {}) as Record<string, string>).some(o => FILE_REFERENCE.test(String(o)));
}

/** Drops questions that reference the source file and cleans explanations. */
function polish(qs: RawQuestion[]): RawQuestion[] {
  return qs
    .filter(isSelfContained)
    .map(q => ({ ...q, explanation: cleanExplanation(q.explanation) }));
}

/** Prompt fragment listing already-generated questions to avoid duplicates. */
export function avoidListPrompt(avoid: string[] | undefined): string {
  const list = (avoid ?? []).filter(Boolean).slice(-30).map(q => `- ${q.replace(/\s+/g, " ").slice(0, 140)}`);
  return list.length
    ? `\n\nJANGAN membuat soal yang sama atau mirip dengan soal-soal yang sudah ada berikut:\n${list.join("\n")}`
    : "";
}
