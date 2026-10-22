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

// ── Typed AI questions (TKA formats) ────────────────────────────────────────

export type AiQuestionType = "pg" | "pg_kompleks" | "benar_salah" | "menjodohkan" | "esai";

/** A generated question in the shape the questions table stores (see src/lib/question-types.ts). */
export type TypedQuestion = {
  questionType: AiQuestionType;
  question: string;
  options: Record<string, unknown>;
  correctAnswer: string | null;
  answerKey: unknown;
  explanation: string;
  topic?: string;
  difficulty?: string;
  sourceTitle?: string;
  sourcePage?: number;
};

/** The JSON format + rules the model must follow for one question type. */
export function typedFormatPrompt(type: AiQuestionType, count: number): string {
  const common = `"explanation":"","topic":"","difficulty":"Sedang"`;
  switch (type) {
    case "pg_kompleks":
      return `Buat ${count} soal PILIHAN GANDA KOMPLEKS: 4 atau 5 pilihan (A-E), dengan 2 atau 3 jawaban yang benar (tidak boleh semua benar).
Jawab HANYA JSON array: [{"question":"...","options":{"A":"","B":"","C":"","D":"","E":""},"correctAnswers":["A","C"],${common}}]
Kalimat soal harus menyebut bahwa jawaban benar lebih dari satu (misalnya "Pilih semua pernyataan yang benar").`;
    case "benar_salah":
      return `Buat ${count} soal BENAR/SALAH: setiap soal berisi 3-5 pernyataan tentang satu topik, campuran benar dan salah.
Jawab HANYA JSON array: [{"question":"Tentukan benar atau salah setiap pernyataan berikut!","statements":["",""],"answers":["B","S"],${common}}]
"answers" sejajar dengan "statements": "B" = benar, "S" = salah.`;
    case "menjodohkan":
      return `Buat ${count} soal MENJODOHKAN: setiap soal berisi 3-5 pasangan (kiri -> kanan) dan 1-2 pengecoh (jawaban kanan tanpa pasangan). Semua jawaban kanan harus berbeda.
Jawab HANYA JSON array: [{"question":"Pasangkan ... dengan ... yang tepat!","pairs":[{"left":"","right":""}],"distractors":[""],${common}}]`;
    case "esai":
      return `Buat ${count} soal ESAI (uraian singkat) yang menguji pemahaman, bukan hafalan kata per kata.
Jawab HANYA JSON array: [{"question":"","modelAnswer":"contoh jawaban benar yang lengkap","rubric":"poin-poin yang harus ada di jawaban siswa",${common}}]`;
    default:
      return `Buat ${count} soal PILIHAN GANDA dengan 4 pilihan (A-D) dan tepat satu jawaban benar.
Jawab HANYA JSON array: [{"question":"","options":{"A":"","B":"","C":"","D":""},"correctAnswer":"A",${common}}]`;
  }
}

function extractObjects(text: string): unknown[] {
  const start = text.indexOf("[");
  if (start < 0) return [];
  const end = text.lastIndexOf("]");
  if (end > start) {
    try { const v = JSON.parse(text.slice(start, end + 1)); if (Array.isArray(v)) return v; } catch { /* recover below */ }
  }
  const out: unknown[] = [];
  let depth = 0, objStart = -1, inString = false, escaped = false;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; continue; }
    if (c === '"') inString = true;
    else if (c === "{") { if (depth === 0) objStart = i; depth++; }
    else if (c === "}") { depth--; if (depth === 0 && objStart >= 0) { try { out.push(JSON.parse(text.slice(objStart, i + 1))); } catch { /* skip */ } objStart = -1; } }
  }
  return out;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Parses + validates the model's output for one type; drops anything malformed or file-referencing. */
export function parseTypedQuestions(text: string, type: AiQuestionType): TypedQuestion[] {
  if (type === "pg") {
    return parseQuestionsJson(text).map(q => ({
      questionType: "pg", question: q.question, options: q.options, correctAnswer: q.correctAnswer, answerKey: null,
      explanation: q.explanation ?? "", topic: q.topic, difficulty: q.difficulty, sourceTitle: q.sourceTitle, sourcePage: q.sourcePage,
    }));
  }
  const out: TypedQuestion[] = [];
  for (const raw of extractObjects(text)) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const question = str(o.question);
    if (!question || FILE_REFERENCE.test(question)) continue;
    const base = { questionType: type, question, explanation: cleanExplanation(str(o.explanation)), topic: str(o.topic) || undefined, difficulty: str(o.difficulty) || undefined, correctAnswer: null };
    if (type === "pg_kompleks") {
      const opts = (o.options ?? {}) as Record<string, unknown>;
      const letters = ["A", "B", "C", "D", "E"].filter(k => str(opts[k]));
      const keys = [...new Set((Array.isArray(o.correctAnswers) ? o.correctAnswers : []).map(String))].filter(k => letters.includes(k)).sort();
      if (letters.length < 4 || keys.length < 2 || keys.length >= letters.length) continue;
      if (letters.some(k => FILE_REFERENCE.test(str(opts[k])))) continue;
      out.push({ ...base, options: Object.fromEntries(letters.map(k => [k, str(opts[k])])), answerKey: keys });
    } else if (type === "benar_salah") {
      const st = (Array.isArray(o.statements) ? o.statements : []).map(str);
      const ans = (Array.isArray(o.answers) ? o.answers : []).map(a => (str(a).toUpperCase().startsWith("B") ? "B" : "S"));
      if (st.length < 2 || st.some(x => !x) || ans.length !== st.length) continue;
      out.push({ ...base, options: { statements: st }, answerKey: ans });
    } else if (type === "menjodohkan") {
      const pairs = (Array.isArray(o.pairs) ? o.pairs : []).map(p => ({ left: str((p as Record<string, unknown>)?.left), right: str((p as Record<string, unknown>)?.right) }))
        .filter(p => p.left && p.right);
      const extras = (Array.isArray(o.distractors) ? o.distractors : []).map(str).filter(Boolean);
      const right = [...pairs.map(p => p.right), ...extras];
      if (pairs.length < 2 || new Set(right.map(r => r.toLowerCase())).size !== right.length) continue;
      out.push({ ...base, options: { left: pairs.map(p => p.left), right }, answerKey: pairs.map((_, i) => i) });
    } else if (type === "esai") {
      const model = str(o.modelAnswer);
      const rubric = str(o.rubric);
      out.push({ ...base, options: {}, answerKey: rubric ? { rubric } : null, explanation: model || base.explanation });
    }
  }
  return out;
}
