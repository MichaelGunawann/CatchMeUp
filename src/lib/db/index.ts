/**
 * Catch Up — Structured Fake Database Layer
 * Single source of truth for all mock data.
 * Organized by domain model for easy future backend migration.
 */

import {
  AlertCircle, BarChart3, BookMarked, BookOpen, ClipboardList,
  Database, FilePlus2, FileSearch, GraduationCap, Home, Library,
  Lightbulb, LineChart, LucideIcon, MessageSquare, Monitor,
  School, Settings, Settings2, ShieldCheck, Trophy, TrendingUp,
  Users, XCircle, Zap,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export type NavItem = { title: string; href: string; icon: LucideIcon; group?: string };

export type MasteryLevel = "Mahir" | "Berkembang" | "Perlu Bantuan" | "Belum Diukur";
export type StudentStatus = "On Track" | "Need Review" | "At Risk";
export type AssessmentType = "TKA" | "UTS" | "UAS" | "Ujian Sekolah" | "Kuis Guru" | "Tes Diagnostik" | "Tryout" | "PR";
export type AssessmentStyleType = "TKA" | "Ujian Sekolah" | "UTS" | "UAS" | "Tryout" | "Kuis";
export type MaterialType = "Buku Teks" | "PPT" | "RPP" | "Modul Ajar" | "Soal Latihan" | "Kunci Jawaban" | "Past Paper";
export type BloomLevel = "Mengingat" | "Memahami" | "Menerapkan" | "Menganalisis" | "Mengevaluasi" | "Mencipta";
export type ConfidenceDiagnosis = "Miskonsepsi" | "Celah Pengetahuan" | "Perlu Pengulangan" | "Mahir";
export type QuestionStatus = "Disetujui" | "Perlu Ditinjau" | "Ditolak";
export type Difficulty = "Mudah" | "Sedang" | "Sulit";
export type Priority = "Tinggi" | "Sedang" | "Rendah";

export const masteryTone: Record<MasteryLevel, "success" | "primary" | "warning" | "neutral"> = {
  Mahir: "success", Berkembang: "primary", "Perlu Bantuan": "warning", "Belum Diukur": "neutral"
};


// ── School ─────────────────────────────────────────────────────────────
export type School = { id: string; name: string; city: string; province: string; npsn: string; since: number };

export const school: School = {
  id: "sch1", name: "SMA Negeri 1 Bandung", city: "Bandung",
  province: "Jawa Barat", npsn: "20219488", since: 1963
};

// ── Teachers ───────────────────────────────────────────────────────────
export type Teacher = { id: string; name: string; initials: string; subject: string; nip: string; email: string; classes: string[] };

export const teachers: Teacher[] = [
  { id: "t1", name: "Bu Ratna Dewi", initials: "RD", subject: "Matematika", nip: "198703122010012005", email: "ratna@sman1bdg.sch.id", classes: ["XI IPA 1", "XI IPA 2", "XI IPA 3"] },
  { id: "t2", name: "Pak Budi Santoso", initials: "BS", subject: "Fisika", nip: "197805242005011003", email: "budi@sman1bdg.sch.id", classes: ["X IPA 1", "X IPA 2", "XI IPA 2"] },
  { id: "t3", name: "Bu Sari Lestari", initials: "SL", subject: "Biologi", nip: "198501152008012002", email: "sari@sman1bdg.sch.id", classes: ["XII IPA 1", "XII IPA 2"] },
  { id: "t4", name: "Pak Doni Prayoga", initials: "DP", subject: "Kimia", nip: "197912082007011004", email: "doni@sman1bdg.sch.id", classes: ["X IPA 1", "XI IPA 1"] },
  { id: "t5", name: "Bu Wulan Sari", initials: "WS", subject: "Bahasa Indonesia", nip: "198204152006012001", email: "wulan@sman1bdg.sch.id", classes: ["XI IPA 2", "XI IPA 3"] },
];

export const currentTeacher = teachers[0];

export const currentSemester = "Semester Ganjil 2025/2026";

// ── Students ───────────────────────────────────────────────────────────
export type Student = {
  id: string; name: string; initials: string; nis: string;
  classId: string; className: string; avgScore: number;
  status: StudentStatus; xp: number; streak: number;
  rank: number; totalAssessments: number;
};

function makeInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function getStatus(score: number): StudentStatus {
  if (score >= 63) return "On Track";
  if (score >= 50) return "Need Review";
  return "At Risk";
}

function buildStudents(
  names: string[], scores: number[], xps: number[],
  streaks: number[], totals: number[],
  classId: string, className: string, idPrefix: string
): Student[] {
  const rankMap = new Map(
    [...Array(scores.length).keys()]
      .sort((a, b) => scores[b] - scores[a])
      .map((idx, pos) => [idx, pos + 1])
  );
  return names.map((name, i) => ({
    id: `${idPrefix}${i + 1}`,
    name,
    initials: makeInitials(name),
    nis: `${220000 + parseInt(idPrefix.replace(/\D/g, "") || "0") * 100 + i + 1}`,
    classId,
    className,
    avgScore: scores[i],
    status: getStatus(scores[i]),
    xp: xps[i],
    streak: streaks[i] ?? 0,
    rank: rankMap.get(i) ?? i + 1,
    totalAssessments: totals[i] ?? 8,
  }));
}

// ── XI IPA 2 (cls1) — 32 students ──
const cls1Students = buildStudents(
  ["Sari Dewi","Budi Santoso","Citra Lestari","Deni Rahmat","Eko Prasetyo","Fira Nanda","Gilang Ramadhan","Hana Pertiwi","Ilham Nugroho","Joko Susanto","Kartika Wulandari","Lukman Hakim","Maya Indah","Nanda Putra","Okta Firmansyah","Putri Rahayu","Rizki Maulana","Sinta Maharani","Teguh Wibowo","Ulfa Rosyidah","Vino Setiawan","Andi Pratama","Wahyu Hidayat","Xena Permata","Yudi Prasetyo","Zara Ananda","Arif Budiman","Bella Safitri","Candra Kusuma","Dewi Ratnasari","Erwin Cahyono","Fauzi Rizaldi"],
  [94,91,88,87,84,83,81,79,78,76,75,73,72,71,70,68,67,65,64,63,63,85,58,56,55,53,52,51,50,47,43,38],
  [2400,2200,2050,1980,1870,1820,1760,1680,1620,1540,1490,1430,1380,1340,1290,1240,1190,1140,1090,1050,1040,1850,980,940,890,840,800,770,740,690,640,580],
  [7,5,12,3,8,4,6,2,9,11,5,3,7,4,2,5,1,3,6,2,4,7,1,2,0,3,1,2,0,1,0,0],
  [12,12,12,11,12,11,12,10,11,12,11,10,12,11,12,11,10,12,11,10,11,12,10,9,10,9,8,9,8,7,6,5],
  "cls1", "XI IPA 2", "s"
);

// ── XI IPA 1 (cls2) — 34 students, avg ≈ 74 ──
const cls2Students = buildStudents(
  ["Ahmad Fauzi","Anisa Rahma","Bagus Setiawan","Cantika Dewi","Daffa Putra","Erika Yuliana","Fadhil Rahman","Gita Safira","Hendra Gunawan","Indira Sari","Joni Perdana","Kartini Wahyu","Luthfi Hakim","Mia Zulfatun","Nabil Mustofa","Ovi Lestari","Pandu Nugroho","Qonita Firdaus","Raka Wirawan","Salsabila Putri","Taufik Hidayat","Ummu Kultsum","Vicky Ramadhan","Winda Astuti","Yovanka Putri","Zaid Maulana","Alfian Hidayat","Bunga Pratiwi","Cahyo Nugroho","Dinda Maharani","Erfan Budi","Faiza Humaira","Gilang Saputra","Hanifah Zahra"],
  [96,93,91,89,87,85,84,82,81,80,79,77,76,75,74,73,71,70,69,68,67,66,65,63,62,60,58,56,54,52,50,48,45,43],
  [2500,2350,2180,2060,1950,1880,1800,1720,1660,1590,1530,1460,1400,1350,1300,1250,1200,1150,1100,1060,1010,980,940,900,860,820,780,740,700,660,620,580,540,500],
  [9,6,14,4,10,5,7,3,11,12,6,4,8,5,3,6,2,4,7,3,5,8,2,3,1,4,2,3,1,2,1,0,1,0],
  [12,12,12,12,11,12,12,11,11,12,11,11,12,11,12,11,11,12,11,11,12,11,10,10,10,9,9,8,9,8,7,7,6,5],
  "cls2", "XI IPA 1", "c2s"
);

// ── XI IPA 3 (cls3) — 30 students, avg ≈ 61 ──
const cls3Students = buildStudents(
  ["Aditya Pranata","Berliana Sari","Ciko Ramadhan","Dhea Anjani","Evan Naufal","Feby Andriani","Galih Permana","Hesty Wulandari","Irfan Setyawan","Jenni Rahayu","Kevin Ardian","Lana Krisna","Mutiara Dewi","Naufal Syarif","Olivia Pramesti","Pio Satria","Qisthi Amalia","Rendy Prabowo","Suci Romadhoni","Tri Wahyuni","Ulfatun Hasanah","Vela Sita","Wahyu Prasetia","Xandra Maulida","Yoga Pratama","Zelika Amanda","Andri Setiawan","Bintang Ramdhan","Cantiq Safira","Dion Purnama"],
  [88,85,82,79,77,74,72,70,68,66,64,62,61,60,58,57,55,53,51,49,47,45,43,41,39,37,35,33,30,27],
  [2200,2000,1830,1700,1600,1510,1440,1370,1300,1230,1170,1100,1060,1010,960,920,870,830,780,740,700,660,620,580,540,500,460,420,380,340],
  [6,4,9,2,7,3,5,1,8,9,4,2,6,3,1,4,0,2,5,1,3,6,0,1,0,2,0,1,0,0],
  [11,11,11,10,11,10,11,9,10,11,10,9,11,10,11,10,9,10,10,9,10,9,8,8,9,8,7,7,6,5],
  "cls3", "XI IPA 3", "c3s"
);

export const students: Student[] = [...cls1Students, ...cls2Students, ...cls3Students];

export const studentProfile = students.find(s => s.name === "Andi Pratama") ?? cls1Students[21];

export function getClassStats(classId: string) {
  const cls = students.filter(s => s.classId === classId);
  return {
    total: cls.length,
    onTrack: cls.filter(s => s.status === "On Track").length,
    needReview: cls.filter(s => s.status === "Need Review").length,
    atRisk: cls.filter(s => s.status === "At Risk").length,
    avgScore: cls.length ? Math.round(cls.reduce((sum, s) => sum + s.avgScore, 0) / cls.length) : 0,
  };
}

export const classStats = getClassStats("cls1");

// ── Parents ────────────────────────────────────────────────────────────
export type Parent = { id: string; name: string; initials: string; studentId: string; phone: string };

export const parents: Parent[] = [
  { id: "p1", name: "Bpk. Hari Pratama", initials: "HP", studentId: "s22", phone: "0812-3456-7890" },
];

export const currentParent = parents[0];

// ── Classes & Subjects ─────────────────────────────────────────────────
export type Class = { id: string; name: string; grade: number; major: string; studentCount: number; teacherId: string };
export type Subject = { id: string; name: string; code: string; weeklyHours: number };

export const classes: Class[] = [
  { id: "cls1", name: "XI IPA 2", grade: 11, major: "IPA", studentCount: 32, teacherId: "t1" },
  { id: "cls2", name: "XI IPA 1", grade: 11, major: "IPA", studentCount: 34, teacherId: "t1" },
  { id: "cls3", name: "XI IPA 3", grade: 11, major: "IPA", studentCount: 30, teacherId: "t1" },
];

export const subjects: Subject[] = [
  { id: "sub1", name: "Matematika Wajib", code: "MAT", weeklyHours: 4 },
  { id: "sub2", name: "Fisika", code: "FIS", weeklyHours: 4 },
  { id: "sub3", name: "Biologi", code: "BIO", weeklyHours: 4 },
  { id: "sub4", name: "Kimia", code: "KIM", weeklyHours: 4 },
  { id: "sub5", name: "Bahasa Indonesia", code: "BIN", weeklyHours: 4 },
];

// ── Materials (Knowledge Corpus) ───────────────────────────────────────
export type Material = {
  id: string; title: string; type: MaterialType; subject: string;
  classId?: string; className?: string;
  publisher?: string; chapter?: string; year?: number;
  uploadedAt: string; pages: number; status: "Aktif" | "Draf" | "Diproses";
  aiProcessed: boolean; questionsGenerated: number;
};

export const materials: Material[] = [];

// ── Assessment Style Corpus ────────────────────────────────────────────
export type AssessmentStyleCorpus = {
  id: string; name: string; styleType: AssessmentStyleType;
  year: number; papersCount: number; questionsCount: number;
  subject: string; status: "Aktif" | "Draf"; description?: string;
};

export const assessmentStyles: AssessmentStyleCorpus[] = [
  { id: "as1", name: "TKA Matematika 2024", styleType: "TKA", year: 2024, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif", description: "Format soal TKA resmi 2024 — 45 soal pilihan ganda (5 opsi), durasi 90 menit. Penekanan pada pemahaman konseptual dan penerapan." },
  { id: "as2", name: "TKA Matematika 2023", styleType: "TKA", year: 2023, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif", description: "Format soal TKA resmi 2023 — 45 soal pilihan ganda (5 opsi), durasi 90 menit. Banyak soal berbasis grafik dan konteks nyata." },
  { id: "as3", name: "TKA Matematika 2022", styleType: "TKA", year: 2022, papersCount: 4, questionsCount: 200, subject: "Matematika", status: "Aktif", description: "Format soal TKA resmi 2022 — 40 soal pilihan ganda (5 opsi), durasi 75 menit. Cocok untuk simulasi awal sebelum latihan soal terbaru." },
  { id: "as4", name: "UTS SMA Negeri 1 Bandung 2024", styleType: "UTS", year: 2024, papersCount: 3, questionsCount: 120, subject: "Matematika", status: "Aktif", description: "Soal UTS internal SMAN 1 Bandung — 40 soal pilihan ganda + 5 uraian singkat, durasi 90 menit. Mencerminkan standar soal gurumu." },
  { id: "as5", name: "UAS Gabungan Bandung 2023", styleType: "UAS", year: 2023, papersCount: 4, questionsCount: 160, subject: "Matematika", status: "Aktif", description: "Soal UAS gabungan sekolah-sekolah Bandung — 50 soal pilihan ganda + uraian, durasi 120 menit. Tingkat kesulitan lebih tinggi dari UTS." },
  { id: "as6", name: "Tryout Nasional SNBT 2024", styleType: "Tryout", year: 2024, papersCount: 3, questionsCount: 120, subject: "Matematika", status: "Aktif", description: "Paket tryout SNBT nasional — mengikuti format resmi, 40 soal per sesi. Cocok untuk persiapan seleksi perguruan tinggi negeri." },
  { id: "as7", name: "Kuis Harian Matematika (Internal)", styleType: "Kuis", year: 2025, papersCount: 8, questionsCount: 80, subject: "Matematika", status: "Draf", description: "Kuis harian internal — 10 soal, durasi 20 menit. Dirancang untuk asesmen formatif cepat setiap awal atau akhir pertemuan." },
];

export const pastPaperTopics: { topic: string; frequency2023: number; frequency2024: number; frequency2025: number; trend: "naik" | "turun" | "stabil" }[] = [];

// ── Question Bank ──────────────────────────────────────────────────────
export type QuestionBankEntry = {
  id: string; question: string; topic: string; subtopic: string;
  bloom: BloomLevel; difficulty: Difficulty; styleType: AssessmentStyleType;
  source: string; usageCount: number; successRate: number;
  status: QuestionStatus; isLocked: boolean;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  sourceTitle?: string; sourcePage?: number;
  classId?: string;
};

export const questionBank: QuestionBankEntry[] = [];

// ── Pending AI Questions ───────────────────────────────────────────────
export type PendingQuestion = {
  id: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: "A" | "B" | "C" | "D"; explanation: string; topic: string; difficulty: Difficulty;
  sourceRef: string; status: QuestionStatus;
};

export const pendingQuestions: PendingQuestion[] = [];

// ── Assessments ────────────────────────────────────────────────────────
export type Assessment = {
  id: string; title: string; type: AssessmentType; subject: string;
  classId: string; totalQuestions: number; duration: number;
  scheduledFor: string; avgScore?: number; participants?: number;
  status: "Terjadwal" | "Berlangsung" | "Selesai";
  createdAt: string;
};

export const assessments: Assessment[] = [];

// Helper: map class name → class id
export const classIdByName: Record<string, string> = {
  "XI IPA 1": "cls2",
  "XI IPA 2": "cls1",
  "XI IPA 3": "cls3",
};

// ── Student Assessment Results ─────────────────────────────────────────
export type StudentResult = {
  id: string; assessmentId: string; assessmentTitle: string; type: AssessmentType;
  date: string; score: number; totalQuestions: number; correct: number;
  wrong: number; unanswered: number; duration: number; rank?: number; classAvg?: number;
};

export const studentResults: StudentResult[] = [];

// ── Weak Topics ────────────────────────────────────────────────────────
export type WeakTopic = {
  id: string; topic: string; subject: string; mastery: MasteryLevel;
  accuracyRate: number; questionsAttempted: number;
  lastPracticed: string; recommendedAction: string;
};

export const weakTopics: WeakTopic[] = [];

// ── Incorrect Questions ────────────────────────────────────────────────
export type IncorrectQuestion = {
  id: string; question: string; yourAnswer: string; correctAnswer: string;
  explanation: string; topic: string; assessmentTitle: string;
  date: string; difficulty: Difficulty; confidenceDiagnosis: ConfidenceDiagnosis;
};

export const incorrectQuestions: IncorrectQuestion[] = [];

// ── Teaching Recommendations ───────────────────────────────────────────
export type TeachingRecommendation = {
  id: string; topic: string; issue: string;
  affectedStudents: number; wrongCount: number; priority: Priority;
  suggestion: string; estimatedTime: string;
};

export const teachingRecommendations: TeachingRecommendation[] = [];

// ── Analytics ──────────────────────────────────────────────────────────
export const topicAccuracy: { label: string; value: number; trend: "naik" | "turun" | "stabil" }[] = [];
export const scoreDistribution: number[] = [];
export const scoreDistributionLabels: string[] = [];
export const teacherAnalyticsStats: { label: string; value: string; detail: string; tone: "primary" | "success" | "warning" | "neutral" }[] = [];
export const subjectMastery: { label: string; value: number; tone: "success" | "primary" | "warning" | "neutral" }[] = [];
export const scoreTrend: number[] = [];
export const scoreTrendLabels: string[] = [];

export const studentProgressStats = [
  { label: "Rata-rata nilai", value: `${studentProfile.avgScore}`, detail: "Berdasarkan data kelas", tone: "success" as const },
  { label: "XP terkumpul", value: `${studentProfile.xp.toLocaleString("id-ID")}`, detail: "Poin pengalaman belajar", tone: "primary" as const },
  { label: "Streak belajar", value: `${studentProfile.streak} hari`, detail: "Konsistensi belajar harian", tone: "neutral" as const },
  { label: "Peringkat kelas", value: `#${studentProfile.rank}`, detail: studentProfile.className, tone: "warning" as const },
];

export const adminStats: { label: string; value: string; detail: string; tone: "primary" | "success" | "warning" | "neutral" }[] = [];

// ── Simulator Questions ────────────────────────────────────────────────
export type SimulatorQuestion = {
  id: string; number: number; question: string; optionA: string; optionB: string;
  optionC: string; optionD: string; optionE: string; correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string; topic: string; difficulty: Difficulty;
};

export const simulatorQuestions: SimulatorQuestion[] = [];

// ── AI Tutor ───────────────────────────────────────────────────────────
export type ChatMessage = {
  id: string; role: "assistant" | "user";
  content: string; sources?: string[]; grounded?: boolean;
  timestamp?: string;
};

export const assistantGreeting: ChatMessage = {
  id: "greeting", role: "assistant", grounded: true, timestamp: "Baru saja",
  content: "Halo! Saya AI Companion kamu. Tanyakan apapun tentang materi yang sudah gurumu unggah — saya akan menjawab berdasarkan dokumen tersebut.",
};

export const suggestedPrompts = [
  "Jelaskan cara mencari diskriminan persamaan kuadrat",
  "Apa itu rumus Vieta dan kapan digunakan?",
  "Mengapa grafik y = (x − 3)² bergeser ke kanan?",
  "Bedakan barisan aritmetika dan geometri",
  "Bagaimana cara membentuk persamaan dari akar-akarnya?",
  "Apa ibu kota Prancis?",
];

const NOT_COVERED_MESSAGE = "Topik ini belum tersedia dalam materi yang diunggah gurumu. Coba tanyakan tentang topik lain atau minta gurumu mengunggah materi terkait.";

const groundedReplies: { match: RegExp; content: string; sources: string[] }[] = [
  { match: /diskriminan|discriminant/i, content: "Diskriminan D = b² − 4ac. Jika D > 0 → dua akar real berbeda. Jika D = 0 → satu akar kembar. Jika D < 0 → tidak ada akar real. Perhatikan tanda konstanta c saat menghitung −4ac.", sources: [] },
  { match: /vieta|jumlah akar|hasil kali akar/i, content: "Untuk ax² + bx + c = 0, berlaku: x₁ + x₂ = −b/a (jumlah akar) dan x₁ · x₂ = c/a (hasil kali akar). Ingat tanda negatif pada rumus jumlah akar!", sources: [] },
  { match: /kanan|kiri|bergeser|shift|transformasi|grafik/i, content: "y = (x − a)² → bergeser a satuan ke KANAN. y = (x + a)² → bergeser a satuan ke KIRI. Ingat: tanda minus dalam kurung → ke kanan.", sources: [] },
  { match: /barisan|deret|aritmetika|geometri|rasio|beda/i, content: "Barisan Aritmetika: selisih antar suku (beda) tetap. Uₙ = a + (n−1)d. Barisan Geometri: rasio antar suku tetap. Uₙ = a · rⁿ⁻¹.", sources: [] },
  { match: /akar.*(persamaan|terbentuk|membentuk)|persamaan.*akar/i, content: "Jika akar-akarnya x₁ dan x₂, persamaan kuadratnya adalah: x² − (x₁+x₂)x + (x₁·x₂) = 0. Gunakan Rumus Vieta terbalik.", sources: [] },
];

export function getAssistantReply(prompt: string): { content: string; sources?: string[]; grounded: boolean } {
  const match = groundedReplies.find(r => r.match.test(prompt));
  if (match) return { content: match.content, sources: match.sources, grounded: true };
  return { content: NOT_COVERED_MESSAGE, grounded: false };
}

// ── AI Configuration ───────────────────────────────────────────────────
export type AIStyleOption = { id: string; label: string; description: string; example: string; active: boolean };

export const aiStyleOptions: AIStyleOption[] = [
  { id: "s1", label: "Socratic", description: "AI memandu siswa dengan pertanyaan, bukan langsung memberi jawaban. Cocok untuk topik yang perlu pemahaman konseptual mendalam.", example: "\"Apa yang terjadi pada nilai x saat ekspresi dalam kurung sama dengan nol?\"", active: true },
  { id: "s2", label: "Eksplisit", description: "AI menjelaskan langkah demi langkah secara langsung dan terstruktur. Cocok untuk siswa yang perlu panduan konkret.", example: "\"Langkah 1: Identifikasi a, b, c. Langkah 2: Masukkan ke D = b² − 4ac.\"", active: false },
  { id: "s3", label: "Analogi", description: "AI menggunakan perumpamaan kehidupan sehari-hari untuk menjelaskan konsep abstrak.", example: "\"Bayangkan grafik bergerak seperti orang berjalan — tanda kurung menentukan arahnya.\"", active: false },
];

// ── Gamification ───────────────────────────────────────────────────────
export type Achievement = {
  id: string; title: string; description: string;
  category: "streak" | "score" | "mastery" | "rank" | "practice";
  xp: number; earned: boolean; earnedAt?: string;
  icon: string;
};

export const achievements: Achievement[] = [
  { id: "ach1", title: "Streak 7 Hari", description: "Belajar 7 hari berturut-turut", category: "streak", xp: 100, earned: false, icon: "🔥" },
  { id: "ach2", title: "Top 5 Kelas", description: "Masuk 5 besar peringkat kelas", category: "rank", xp: 150, earned: false, icon: "⭐" },
  { id: "ach3", title: "Rajin Berlatih", description: "Kerjakan 100 soal latihan", category: "practice", xp: 50, earned: false, icon: "📚" },
  { id: "ach4", title: "Nilai Sempurna", description: "Skor 100 dalam satu asesmen", category: "score", xp: 200, earned: false, icon: "💎" },
  { id: "ach5", title: "Ahli Tiga Topik", description: "Capai Mahir di 3 topik berbeda", category: "mastery", xp: 300, earned: false, icon: "🎓" },
  { id: "ach6", title: "Comeback King", description: "Tingkatkan nilai 20+ poin dari asesmen sebelumnya", category: "score", xp: 250, earned: false, icon: "⚡" },
  { id: "ach7", title: "Streak 30 Hari", description: "Belajar 30 hari berturut-turut", category: "streak", xp: 500, earned: false, icon: "🏆" },
  { id: "ach8", title: "Juara Kelas", description: "Raih peringkat 1 dalam asesmen manapun", category: "rank", xp: 400, earned: false, icon: "👑" },
];

export const leaderboard = [...students]
  .sort((a, b) => b.avgScore - a.avgScore)
  .slice(0, 10)
  .map((s, i) => ({
    rank: i + 1, studentId: s.id, name: s.name, initials: s.initials,
    avgScore: s.avgScore, xp: s.xp, streak: s.streak,
    isCurrentUser: s.name === "Andi Pratama",
  }));

// ── Notifications ──────────────────────────────────────────────────────
export type AppNotification = {
  id: string; title: string; description: string;
  time: string; read: boolean;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
  href?: string;
};

export const teacherNotifications: AppNotification[] = [];

export const studentNotifications: AppNotification[] = [];

export const parentNotifications: AppNotification[] = [];

export const adminNotifications: AppNotification[] = [];

// ── Navigation ─────────────────────────────────────────────────────────
export const teacherNav: NavItem[] = [
  { title: "Dasbor", href: "/teacher/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Pustaka Materi", href: "/teacher/materials", icon: Library, group: "KONTEN" },
  { title: "Gaya Asesmen", href: "/teacher/assessment-styles", icon: BookMarked, group: "KONTEN" },
  { title: "Bank Soal", href: "/teacher/question-bank", icon: Database, group: "SOAL" },
  { title: "Tinjau Soal AI", href: "/teacher/question-review", icon: ShieldCheck, group: "SOAL" },
  { title: "Buat Asesmen", href: "/teacher/assessment-builder", icon: FilePlus2, group: "ASESMEN" },
  { title: "List Asesmen", href: "/teacher/results", icon: BarChart3, group: "ASESMEN" },
  { title: "Analitik Kelas", href: "/teacher/analytics", icon: TrendingUp, group: "ANALITIK" },
  { title: "Rekomendasi", href: "/teacher/recommendations", icon: Lightbulb, group: "ANALITIK" },
  { title: "Konfigurasi AI", href: "/teacher/ai-config", icon: Settings2, group: "SISTEM" },
];

export const studentNav: NavItem[] = [
  { title: "Dasbor", href: "/student/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Materi Guru", href: "/student/materials", icon: BookOpen, group: "BELAJAR" },
  { title: "Simulasi Ujian", href: "/student/simulator", icon: Monitor, group: "LATIHAN" },
  { title: "Latihan Adaptif", href: "/student/adaptive", icon: Zap, group: "LATIHAN" },
  { title: "Review Asesmen", href: "/student/review", icon: FileSearch, group: "REVIEW" },
  { title: "Topik Lemah", href: "/student/weak-topics", icon: AlertCircle, group: "REVIEW" },
  { title: "Soal yang Salah", href: "/student/incorrect", icon: XCircle, group: "REVIEW" },
  { title: "AI Companion", href: "/student/tutor", icon: MessageSquare, group: "BELAJAR" },
  { title: "Progres Belajar", href: "/student/progress", icon: LineChart, group: "BELAJAR" },
  { title: "Pencapaian", href: "/student/achievements", icon: Trophy, group: "BELAJAR" },
];

export const parentNav: NavItem[] = [
  { title: "Dasbor", href: "/parent/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Progres Andi", href: "/parent/progress", icon: TrendingUp, group: "PEMANTAUAN" },
  { title: "Riwayat Asesmen", href: "/parent/assessments", icon: ClipboardList, group: "PEMANTAUAN" },
  { title: "Rekomendasi Pengajaran", href: "/parent/recommendations", icon: Lightbulb, group: "PEMANTAUAN" },
];

export const adminNav: NavItem[] = [
  { title: "Dasbor", href: "/admin/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Sekolah", href: "/admin/schools", icon: School, group: "KELOLA" },
  { title: "Guru", href: "/admin/teachers", icon: GraduationCap, group: "KELOLA" },
  { title: "Siswa", href: "/admin/students", icon: Users, group: "KELOLA" },
  { title: "Kelas", href: "/admin/classes", icon: BookOpen, group: "KELOLA" },
  { title: "Asesmen", href: "/admin/assessments", icon: ClipboardList, group: "KELOLA" },
  { title: "Analitik Platform", href: "/admin/analytics", icon: LineChart, group: "ANALITIK" },
  { title: "Pengaturan", href: "/admin/settings", icon: Settings, group: "SISTEM" },
];

export { type AppNotification as Notification };
