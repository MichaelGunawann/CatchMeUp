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

const studentNames = [
  "Sari Dewi", "Budi Santoso", "Citra Lestari", "Deni Rahmat", "Eko Prasetyo",
  "Fira Nanda", "Gilang Ramadhan", "Hana Pertiwi", "Ilham Nugroho", "Joko Susanto",
  "Kartika Wulandari", "Lukman Hakim", "Maya Indah", "Nanda Putra", "Okta Firmansyah",
  "Putri Rahayu", "Rizki Maulana", "Sinta Maharani", "Teguh Wibowo", "Ulfa Rosyidah",
  "Vino Setiawan", "Andi Pratama", "Wahyu Hidayat", "Xena Permata", "Yudi Prasetyo",
  "Zara Ananda", "Arif Budiman", "Bella Safitri", "Candra Kusuma", "Dewi Ratnasari",
  "Erwin Cahyono", "Fauzi Rizaldi",
];

const rawScores = [94, 91, 88, 87, 84, 83, 81, 79, 78, 76, 75, 73, 72, 71, 70, 68, 67, 65, 64, 63, 63, 85, 58, 56, 55, 53, 52, 51, 50, 47, 43, 38];
const rawXP =    [2400,2200,2050,1980,1870,1820,1760,1680,1620,1540,1490,1430,1380,1340,1290,1240,1190,1140,1090,1050,1040,1850,980,940,890,840,800,770,740,690,640,580];

function getStatus(score: number): StudentStatus {
  if (score >= 63) return "On Track";
  if (score >= 50) return "Need Review";
  return "At Risk";
}

export const students: Student[] = studentNames.map((name, i) => ({
  id: `s${i + 1}`,
  name,
  initials: makeInitials(name),
  nis: `${220000 + i + 1}`,
  classId: "cls1",
  className: "XI IPA 2",
  avgScore: rawScores[i],
  status: getStatus(rawScores[i]),
  xp: rawXP[i],
  streak: [7, 5, 12, 3, 8, 4, 6, 2, 9, 11, 5, 3, 7, 4, 2, 5, 1, 3, 6, 2, 4, 7, 1, 2, 0, 3, 1, 2, 0, 1, 0, 0][i] ?? 0,
  rank: i + 1,
  totalAssessments: [12, 12, 12, 11, 12, 11, 12, 10, 11, 12, 11, 10, 12, 11, 12, 11, 10, 12, 11, 10, 11, 12, 10, 9, 10, 9, 8, 9, 8, 7, 6, 5][i] ?? 8,
}));

export const studentProfile = students.find(s => s.name === "Andi Pratama") ?? students[21];

// On Track: scores ≥ 63 → 22 students; Need Review: 50-62 → 7; At Risk: <50 → 3
export const classStats = {
  total: students.length,
  onTrack: students.filter(s => s.status === "On Track").length,
  needReview: students.filter(s => s.status === "Need Review").length,
  atRisk: students.filter(s => s.status === "At Risk").length,
  avgScore: Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length),
};

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
  publisher?: string; chapter?: string; year?: number;
  uploadedAt: string; pages: number; status: "Aktif" | "Draf" | "Diproses";
  aiProcessed: boolean; questionsGenerated: number;
};

export const materials: Material[] = [
  { id: "mat1", title: "Buku Teks Matematika XI (Erlangga)", type: "Buku Teks", subject: "Matematika XI", publisher: "Erlangga", year: 2023, uploadedAt: "3 Sep 2025", pages: 312, status: "Aktif", aiProcessed: true, questionsGenerated: 284 },
  { id: "mat2", title: "Modul Ajar – Fungsi Kuadrat", type: "Modul Ajar", subject: "Matematika XI", uploadedAt: "10 Sep 2025", pages: 24, status: "Aktif", aiProcessed: true, questionsGenerated: 48 },
  { id: "mat3", title: "PPT Persamaan & Fungsi Kuadrat", type: "PPT", subject: "Matematika XI", uploadedAt: "12 Sep 2025", pages: 42, status: "Aktif", aiProcessed: true, questionsGenerated: 36 },
  { id: "mat4", title: "RPP Kuadrat Semester 1 (Revisi K13)", type: "RPP", subject: "Matematika XI", uploadedAt: "5 Sep 2025", pages: 18, status: "Aktif", aiProcessed: true, questionsGenerated: 0 },
  { id: "mat5", title: "Lembar Latihan Diskriminan & Vieta", type: "Soal Latihan", subject: "Matematika XI", uploadedAt: "20 Okt 2025", pages: 6, status: "Aktif", aiProcessed: true, questionsGenerated: 24 },
  { id: "mat6", title: "Kunci Jawaban UTS Matematika 2025", type: "Kunci Jawaban", subject: "Matematika XI", uploadedAt: "20 Nov 2025", pages: 4, status: "Aktif", aiProcessed: false, questionsGenerated: 0 },
  { id: "mat7", title: "RPP Barisan & Deret Aritmetika", type: "RPP", subject: "Matematika XI", uploadedAt: "1 Nov 2025", pages: 16, status: "Aktif", aiProcessed: true, questionsGenerated: 32 },
  { id: "mat8", title: "PPT Barisan Geometri – Visualisasi", type: "PPT", subject: "Matematika XI", uploadedAt: "3 Nov 2025", pages: 28, status: "Diproses", aiProcessed: false, questionsGenerated: 0 },
  { id: "mat9", title: "Modul Ajar – Trigonometri Dasar", type: "Modul Ajar", subject: "Matematika XI", uploadedAt: "10 Nov 2025", pages: 30, status: "Draf", aiProcessed: false, questionsGenerated: 0 },
  { id: "mat10", title: "Buku Teks Fisika X (Grafindo)", type: "Buku Teks", subject: "Fisika X", publisher: "Grafindo", year: 2022, uploadedAt: "5 Sep 2025", pages: 288, status: "Aktif", aiProcessed: true, questionsGenerated: 198 },
];

// ── Assessment Style Corpus ────────────────────────────────────────────
export type AssessmentStyleCorpus = {
  id: string; name: string; styleType: AssessmentStyleType;
  year: number; papersCount: number; questionsCount: number;
  subject: string; status: "Aktif" | "Draf";
};

export const assessmentStyles: AssessmentStyleCorpus[] = [
  { id: "as1", name: "TKA Matematika 2024", styleType: "TKA", year: 2024, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif" },
  { id: "as2", name: "TKA Matematika 2023", styleType: "TKA", year: 2023, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif" },
  { id: "as3", name: "TKA Matematika 2022", styleType: "TKA", year: 2022, papersCount: 4, questionsCount: 200, subject: "Matematika", status: "Aktif" },
  { id: "as4", name: "UTS SMA Negeri 1 Bandung 2024", styleType: "UTS", year: 2024, papersCount: 3, questionsCount: 120, subject: "Matematika", status: "Aktif" },
  { id: "as5", name: "UAS Gabungan Bandung 2023", styleType: "UAS", year: 2023, papersCount: 4, questionsCount: 160, subject: "Matematika", status: "Aktif" },
  { id: "as6", name: "Tryout Nasional SNBT 2024", styleType: "Tryout", year: 2024, papersCount: 3, questionsCount: 120, subject: "Matematika", status: "Aktif" },
  { id: "as7", name: "Kuis Harian Matematika (Internal)", styleType: "Kuis", year: 2025, papersCount: 8, questionsCount: 80, subject: "Matematika", status: "Draf" },
];

export const pastPaperTopics = [
  { topic: "Fungsi Kuadrat", frequency2023: 4, frequency2024: 5, frequency2025: 6, trend: "naik" as const },
  { topic: "Persamaan Kuadrat", frequency2023: 6, frequency2024: 6, frequency2025: 5, trend: "stabil" as const },
  { topic: "Diskriminan", frequency2023: 2, frequency2024: 3, frequency2025: 4, trend: "naik" as const },
  { topic: "Rumus Vieta", frequency2023: 3, frequency2024: 2, frequency2025: 2, trend: "stabil" as const },
  { topic: "Transformasi Grafik", frequency2023: 1, frequency2024: 3, frequency2025: 4, trend: "naik" as const },
  { topic: "Barisan Aritmetika", frequency2023: 5, frequency2024: 5, frequency2025: 5, trend: "stabil" as const },
  { topic: "Barisan Geometri", frequency2023: 3, frequency2024: 4, frequency2025: 5, trend: "naik" as const },
];

// ── Question Bank ──────────────────────────────────────────────────────
export type QuestionBankEntry = {
  id: string; question: string; topic: string; subtopic: string;
  bloom: BloomLevel; difficulty: Difficulty; styleType: AssessmentStyleType;
  source: string; usageCount: number; successRate: number;
  status: QuestionStatus; isLocked: boolean;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
};

export const questionBank: QuestionBankEntry[] = [
  { id: "qb1", question: "Jika f(x) = (x − 3)², maka titik puncak grafik berada di koordinat...", topic: "Fungsi Kuadrat", subtopic: "Titik Puncak", bloom: "Memahami", difficulty: "Sedang", styleType: "TKA", source: "Modul Matematika, hal. 8", usageCount: 7, successRate: 74, status: "Disetujui", isLocked: false, options: { A: "(3, 0)", B: "(−3, 0)", C: "(0, 3)", D: "(0, −3)" }, correctAnswer: "A", explanation: "Bentuk f(x) = (x − a)² memiliki titik puncak di (a, 0). Karena a = 3, titik puncaknya adalah (3, 0)." },
  { id: "qb2", question: "Akar-akar persamaan x² − 5x + 6 = 0 adalah...", topic: "Persamaan Kuadrat", subtopic: "Pemfaktoran", bloom: "Menerapkan", difficulty: "Mudah", styleType: "TKA", source: "Modul Matematika, hal. 15", usageCount: 9, successRate: 82, status: "Disetujui", isLocked: true, options: { A: "x = 1 dan x = 6", B: "x = 2 dan x = 3", C: "x = −2 dan x = −3", D: "x = −1 dan x = 6" }, correctAnswer: "B", explanation: "Faktorkan: (x − 2)(x − 3) = 0, sehingga x = 2 atau x = 3." },
  { id: "qb3", question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...", topic: "Diskriminan", subtopic: "Perhitungan D", bloom: "Menerapkan", difficulty: "Sedang", styleType: "UTS", source: "Modul Matematika, hal. 18", usageCount: 6, successRate: 38, status: "Perlu Ditinjau", isLocked: false, options: { A: "9", B: "31", C: "41", D: "49" }, correctAnswer: "D", explanation: "D = b² − 4ac = 3² − 4(2)(−5) = 9 + 40 = 49." },
  { id: "qb4", question: "Jika jumlah akar persamaan x² + px + 12 = 0 adalah 7, maka nilai p adalah...", topic: "Rumus Vieta", subtopic: "Jumlah Akar", bloom: "Menganalisis", difficulty: "Sulit", styleType: "TKA", source: "Modul Matematika, hal. 20", usageCount: 4, successRate: 42, status: "Disetujui", isLocked: false, options: { A: "−7", B: "7", C: "−12", D: "12" }, correctAnswer: "A", explanation: "Rumus Vieta: x₁ + x₂ = −p/a = −p. Jika jumlah akar = 7, maka −p = 7 → p = −7." },
  { id: "qb5", question: "Titik puncak dari parabola y = −x² + 4x − 1 adalah...", topic: "Fungsi Kuadrat", subtopic: "Titik Puncak", bloom: "Menerapkan", difficulty: "Sedang", styleType: "TKA", source: "Modul Matematika, hal. 10", usageCount: 8, successRate: 71, status: "Disetujui", isLocked: false, options: { A: "(2, 3)", B: "(−2, 3)", C: "(2, −3)", D: "(4, −1)" }, correctAnswer: "A", explanation: "x puncak = −b/(2a) = −4/(2×(−1)) = 2. y puncak = −4 + 8 − 1 = 3. Jadi (2, 3)." },
  { id: "qb6", question: "Grafik y = (x − 2)² bergeser ke mana dibandingkan y = x²?", topic: "Transformasi Grafik", subtopic: "Pergeseran Horizontal", bloom: "Memahami", difficulty: "Mudah", styleType: "UTS", source: "Modul Matematika, hal. 12", usageCount: 10, successRate: 61, status: "Disetujui", isLocked: false, options: { A: "2 satuan ke kanan", B: "2 satuan ke kiri", C: "2 satuan ke atas", D: "2 satuan ke bawah" }, correctAnswer: "A", explanation: "Substitusi x − 2 menggeser grafik ke kanan sejauh 2 satuan." },
  { id: "qb7", question: "Suku ke-n barisan aritmetika dengan suku pertama 3 dan beda 4 adalah...", topic: "Barisan Aritmetika", subtopic: "Rumus Suku ke-n", bloom: "Menerapkan", difficulty: "Mudah", styleType: "UTS", source: "Buku Teks Matematika XI, hal. 142", usageCount: 5, successRate: 78, status: "Disetujui", isLocked: false, options: { A: "4n − 1", B: "4n + 3", C: "3n + 4", D: "4n − 3" }, correctAnswer: "A", explanation: "Uₙ = a + (n−1)b = 3 + (n−1)·4 = 3 + 4n − 4 = 4n − 1." },
  { id: "qb8", question: "Barisan geometri 2, 6, 18, 54, ... memiliki rasio...", topic: "Barisan Geometri", subtopic: "Rasio", bloom: "Mengingat", difficulty: "Mudah", styleType: "Kuis", source: "Buku Teks Matematika XI, hal. 158", usageCount: 6, successRate: 89, status: "Disetujui", isLocked: false, options: { A: "2", B: "3", C: "4", D: "6" }, correctAnswer: "B", explanation: "r = U₂/U₁ = 6/2 = 3." },
];

// ── Pending AI Questions ───────────────────────────────────────────────
export type PendingQuestion = {
  id: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: "A" | "B" | "C" | "D"; explanation: string; topic: string; difficulty: Difficulty;
  sourceRef: string; status: QuestionStatus;
};

export const pendingQuestions: PendingQuestion[] = [
  { id: "pq1", question: "Nilai diskriminan dari persamaan 3x² − 7x + 2 = 0 adalah...", optionA: "25", optionB: "37", optionC: "49", optionD: "61", correctAnswer: "A", explanation: "D = b² − 4ac = 49 − 24 = 25.", topic: "Diskriminan", difficulty: "Sedang", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 18", status: "Perlu Ditinjau" },
  { id: "pq2", question: "Jika akar-akar persamaan 2x² − 8x + k = 0 adalah sama, maka nilai k adalah...", optionA: "4", optionB: "6", optionC: "8", optionD: "10", correctAnswer: "C", explanation: "Akar sama → D = 0. D = 64 − 8k = 0 → k = 8.", topic: "Diskriminan", difficulty: "Sulit", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 19", status: "Perlu Ditinjau" },
  { id: "pq3", question: "Hasil kali akar-akar dari x² − 6x + 5 = 0 adalah...", optionA: "5", optionB: "6", optionC: "−5", optionD: "−6", correctAnswer: "A", explanation: "Hasil kali akar = c/a = 5/1 = 5.", topic: "Rumus Vieta", difficulty: "Mudah", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 20", status: "Perlu Ditinjau" },
  { id: "pq4", question: "Persamaan kuadrat yang akar-akarnya 3 dan −5 adalah...", optionA: "x² + 2x − 15 = 0", optionB: "x² − 2x − 15 = 0", optionC: "x² + 2x + 15 = 0", optionD: "x² − 2x + 15 = 0", correctAnswer: "A", explanation: "Jumlah akar = 3 + (−5) = −2, hasil kali = 3×(−5) = −15. Jadi x² − (−2)x + (−15) = x² + 2x − 15 = 0.", topic: "Persamaan Kuadrat", difficulty: "Sedang", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 22", status: "Perlu Ditinjau" },
  { id: "pq5", question: "Grafik y = x² + 6x + 9 adalah parabola yang melalui titik puncak...", optionA: "(−3, 0)", optionB: "(3, 0)", optionC: "(0, 9)", optionD: "(−3, 9)", correctAnswer: "A", explanation: "y = (x + 3)² → puncak di (−3, 0).", topic: "Fungsi Kuadrat", difficulty: "Sedang", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 10", status: "Disetujui" },
];

// ── Assessments ────────────────────────────────────────────────────────
export type Assessment = {
  id: string; title: string; type: AssessmentType; subject: string;
  classId: string; totalQuestions: number; duration: number;
  scheduledFor: string; avgScore?: number; participants?: number;
  status: "Terjadwal" | "Berlangsung" | "Selesai";
  createdAt: string;
};

export const assessments: Assessment[] = [
  { id: "a1", title: "UTS Matematika XI – Semester 1 2025", type: "UTS", subject: "Matematika XI", classId: "cls1", totalQuestions: 40, duration: 90, scheduledFor: "15 Nov 2025", avgScore: 76, participants: 32, status: "Selesai", createdAt: "1 Nov 2025" },
  { id: "a2", title: "Kuis Fungsi Kuadrat", type: "Kuis Guru", subject: "Matematika XI", classId: "cls1", totalQuestions: 15, duration: 30, scheduledFor: "22 Nov 2025", avgScore: 82, participants: 30, status: "Selesai", createdAt: "20 Nov 2025" },
  { id: "a3", title: "Kuis Diskriminan & Vieta", type: "Kuis Guru", subject: "Matematika XI", classId: "cls1", totalQuestions: 10, duration: 20, scheduledFor: "29 Okt 2025", avgScore: 68, participants: 31, status: "Selesai", createdAt: "27 Okt 2025" },
  { id: "a4", title: "Tes Diagnostik Fungsi Kuadrat", type: "Tes Diagnostik", subject: "Matematika XI", classId: "cls1", totalQuestions: 20, duration: 45, scheduledFor: "5 Sep 2025", avgScore: 72, participants: 32, status: "Selesai", createdAt: "3 Sep 2025" },
  { id: "a5", title: "Tes Diagnostik Fisika", type: "Tes Diagnostik", subject: "Fisika XI", classId: "cls1", totalQuestions: 20, duration: 45, scheduledFor: "28 Nov 2025", status: "Terjadwal", createdAt: "24 Nov 2025" },
  { id: "a6", title: "UAS Biologi XII", type: "UAS", subject: "Biologi XII", classId: "cls3", totalQuestions: 50, duration: 120, scheduledFor: "5 Des 2025", status: "Terjadwal", createdAt: "20 Nov 2025" },
  { id: "a7", title: "Tryout Matematika – Persiapan SNBT", type: "Tryout", subject: "Matematika XI", classId: "cls1", totalQuestions: 30, duration: 60, scheduledFor: "12 Des 2025", status: "Terjadwal", createdAt: "25 Nov 2025" },
];

// ── Student Assessment Results ─────────────────────────────────────────
export type StudentResult = {
  id: string; assessmentId: string; assessmentTitle: string; type: AssessmentType;
  date: string; score: number; totalQuestions: number; correct: number;
  wrong: number; unanswered: number; duration: number; rank?: number; classAvg?: number;
};

export const studentResults: StudentResult[] = [
  { id: "sr1", assessmentId: "a1", assessmentTitle: "UTS Matematika XI – Semester 1 2025", type: "UTS", date: "15 Nov 2025", score: 85, totalQuestions: 40, correct: 34, wrong: 5, unanswered: 1, duration: 82, rank: 6, classAvg: 76 },
  { id: "sr2", assessmentId: "a2", assessmentTitle: "Kuis Fungsi Kuadrat", type: "Kuis Guru", date: "22 Nov 2025", score: 87, totalQuestions: 15, correct: 13, wrong: 2, unanswered: 0, duration: 22, rank: 4, classAvg: 82 },
  { id: "sr3", assessmentId: "a3", assessmentTitle: "Kuis Diskriminan & Vieta", type: "Kuis Guru", date: "29 Okt 2025", score: 70, totalQuestions: 10, correct: 7, wrong: 3, unanswered: 0, duration: 18, rank: 10, classAvg: 68 },
  { id: "sr4", assessmentId: "a4", assessmentTitle: "Tes Diagnostik Fungsi Kuadrat", type: "Tes Diagnostik", date: "5 Sep 2025", score: 75, totalQuestions: 20, correct: 15, wrong: 4, unanswered: 1, duration: 38, rank: 9, classAvg: 72 },
];

// ── Weak Topics ────────────────────────────────────────────────────────
export type WeakTopic = {
  id: string; topic: string; subject: string; mastery: MasteryLevel;
  accuracyRate: number; questionsAttempted: number;
  lastPracticed: string; recommendedAction: string;
};

export const weakTopics: WeakTopic[] = [
  { id: "wt1", topic: "Diskriminan Persamaan Kuadrat", subject: "Matematika", mastery: "Perlu Bantuan", accuracyRate: 38, questionsAttempted: 13, lastPracticed: "3 hari lalu", recommendedAction: "Kerjakan 10 soal latihan diskriminan level Mudah" },
  { id: "wt2", topic: "Rumus Vieta (Jumlah & Hasil Kali Akar)", subject: "Matematika", mastery: "Perlu Bantuan", accuracyRate: 42, questionsAttempted: 12, lastPracticed: "5 hari lalu", recommendedAction: "Pelajari kembali hubungan akar dan koefisien" },
  { id: "wt3", topic: "Transformasi Grafik Kuadrat", subject: "Matematika", mastery: "Berkembang", accuracyRate: 61, questionsAttempted: 18, lastPracticed: "2 hari lalu", recommendedAction: "Fokus pada pergeseran horizontal dan vertikal" },
  { id: "wt4", topic: "Hukum Newton II", subject: "Fisika", mastery: "Berkembang", accuracyRate: 65, questionsAttempted: 11, lastPracticed: "1 minggu lalu", recommendedAction: "Latih soal aplikasi F = ma dengan satuan berbeda" },
  { id: "wt5", topic: "Barisan Geometri", subject: "Matematika", mastery: "Berkembang", accuracyRate: 68, questionsAttempted: 9, lastPracticed: "4 hari lalu", recommendedAction: "Review konsep rasio dan suku ke-n" },
];

// ── Incorrect Questions ────────────────────────────────────────────────
export type IncorrectQuestion = {
  id: string; question: string; yourAnswer: string; correctAnswer: string;
  explanation: string; topic: string; assessmentTitle: string;
  date: string; difficulty: Difficulty; confidenceDiagnosis: ConfidenceDiagnosis;
};

export const incorrectQuestions: IncorrectQuestion[] = [
  { id: "iq1", question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...", yourAnswer: "C (41)", correctAnswer: "D (49)", explanation: "D = b² − 4ac = 3² − 4(2)(−5) = 9 + 40 = 49. Perhatikan tanda minus pada c = −5.", topic: "Diskriminan", assessmentTitle: "Kuis Diskriminan & Vieta", date: "29 Okt 2025", difficulty: "Sedang", confidenceDiagnosis: "Miskonsepsi" },
  { id: "iq2", question: "Jika jumlah akar x² + px + 12 = 0 adalah 7, maka p adalah...", yourAnswer: "B (7)", correctAnswer: "A (−7)", explanation: "Rumus Vieta: x₁ + x₂ = −b/a = −p. Jika jumlah = 7, maka −p = 7, p = −7.", topic: "Rumus Vieta", assessmentTitle: "Kuis Diskriminan & Vieta", date: "29 Okt 2025", difficulty: "Sulit", confidenceDiagnosis: "Celah Pengetahuan" },
  { id: "iq3", question: "Grafik y = (x − 2)² bergeser ke mana dibandingkan y = x²?", yourAnswer: "B (2 satuan ke kiri)", correctAnswer: "A (2 satuan ke kanan)", explanation: "Substitusi (x − 2) menggeser grafik ke kanan. Tanda minus dalam kurung → ke kanan.", topic: "Transformasi Grafik", assessmentTitle: "UTS Matematika XI", date: "15 Nov 2025", difficulty: "Mudah", confidenceDiagnosis: "Miskonsepsi" },
  { id: "iq4", question: "Persamaan yang akar-akarnya 3 dan −5 adalah...", yourAnswer: "B (x² − 2x − 15 = 0)", correctAnswer: "A (x² + 2x − 15 = 0)", explanation: "Jumlah akar = −2, hasil kali = −15. Persamaan: x² − (jumlah)x + (kali) = x² + 2x − 15 = 0.", topic: "Persamaan Kuadrat", assessmentTitle: "UTS Matematika XI", date: "15 Nov 2025", difficulty: "Sedang", confidenceDiagnosis: "Celah Pengetahuan" },
];

// ── Teaching Recommendations ───────────────────────────────────────────
export type TeachingRecommendation = {
  id: string; topic: string; issue: string;
  affectedStudents: number; priority: Priority;
  suggestion: string; estimatedTime: string;
};

export const teachingRecommendations: TeachingRecommendation[] = [
  { id: "tr1", topic: "Diskriminan", issue: "58% siswa menjawab salah di soal diskriminan dengan konstanta negatif. Miskonsepsi pada operasi −4ac.", affectedStudents: 18, priority: "Tinggi", suggestion: "Tambahkan sesi khusus 20 mnt dengan contoh bergantian antara konstanta positif dan negatif. Gunakan warna berbeda untuk menandai tanda konstanta.", estimatedTime: "20 menit" },
  { id: "tr2", topic: "Rumus Vieta", issue: "Siswa sering membalik tanda pada jumlah akar. Mencampuradukkan −b/a dengan b/a.", affectedStudents: 14, priority: "Tinggi", suggestion: "Buat mnemonic: 'Jumlah akar berlawanan dengan b'. Gunakan papan tulis untuk menuliskan rumus lengkap setiap kali masuk kelas.", estimatedTime: "15 menit" },
  { id: "tr3", topic: "Transformasi Grafik", issue: "Kebingungan arah pergeseran horizontal masih tinggi (61% salah). Siswa mengira minus = ke kiri.", affectedStudents: 10, priority: "Sedang", suggestion: "Gunakan Desmos.com untuk demonstrasi interaktif langsung di kelas. Biarkan siswa menggerakkan grafik secara mandiri.", estimatedTime: "10 menit" },
  { id: "tr4", topic: "Barisan Geometri", issue: "Siswa kesulitan membedakan barisan aritmetika dan geometri saat soal tidak eksplisit.", affectedStudents: 8, priority: "Sedang", suggestion: "Buat worksheet perbandingan berdampingan. Fokus pada identifikasi pola beda (d) vs rasio (r).", estimatedTime: "25 menit" },
];

// ── Analytics ──────────────────────────────────────────────────────────
export const topicAccuracy = [
  { label: "Fungsi Kuadrat", value: 82, trend: "naik" as const },
  { label: "Persamaan Kuadrat", value: 74, trend: "stabil" as const },
  { label: "Diskriminan", value: 38, trend: "turun" as const },
  { label: "Rumus Vieta", value: 42, trend: "stabil" as const },
  { label: "Transformasi Grafik", value: 61, trend: "naik" as const },
  { label: "Barisan Aritmetika", value: 75, trend: "naik" as const },
  { label: "Barisan Geometri", value: 68, trend: "stabil" as const },
];

export const scoreDistribution = [2, 4, 7, 11, 5, 3];
export const scoreDistributionLabels = ["< 50", "50–59", "60–69", "70–79", "80–89", "90–100"];

export const teacherAnalyticsStats = [
  { label: "Asesmen selesai", value: "4", detail: "Semester ini · 2 kuis, 1 UTS, 1 diagnostik", tone: "primary" as const },
  { label: "Rata-rata nilai kelas", value: "76", detail: "Naik 4 poin dari UTS sebelumnya", tone: "success" as const },
  { label: "Topik paling lemah", value: "Diskriminan", detail: "38% akurasi rata-rata kelas", tone: "warning" as const },
  { label: "Soal AI tersedia", value: "142", detail: "87% disetujui guru · 18 menunggu", tone: "neutral" as const },
];

export const subjectMastery = [
  { label: "Fungsi Kuadrat", value: 82, tone: "success" as const },
  { label: "Persamaan Kuadrat", value: 74, tone: "primary" as const },
  { label: "Diskriminan", value: 38, tone: "warning" as const },
  { label: "Rumus Vieta", value: 42, tone: "warning" as const },
  { label: "Transformasi Grafik", value: 61, tone: "primary" as const },
];

export const scoreTrend = [70, 74, 72, 78, 80, 83, 85];
export const scoreTrendLabels = ["Sep", "Okt", "Okt", "Nov", "Nov", "Nov", "Skrg"];

export const studentProgressStats = [
  { label: "Asesmen diikuti", value: "12", detail: "Semester ini", tone: "primary" as const },
  { label: "Rata-rata nilai", value: "79", detail: "Naik 4 poin dari bulan lalu", tone: "success" as const },
  { label: "Soal dikerjakan", value: "340", detail: "Latihan + asesmen", tone: "neutral" as const },
  { label: "Topik lemah aktif", value: "2", detail: "Diskriminan & Rumus Vieta", tone: "warning" as const },
];

export const adminStats = [
  { label: "Asesmen aktif", value: "24", detail: "4 berlangsung minggu ini", tone: "primary" as const },
  { label: "Guru terdaftar", value: "48", detail: "Aktif menggunakan platform", tone: "neutral" as const },
  { label: "Siswa aktif", value: "1.240", detail: "Dari total 1.312 siswa", tone: "success" as const },
  { label: "Soal dalam bank", value: "3.820", detail: "Dari 12 mata pelajaran", tone: "warning" as const },
];

// ── Simulator Questions ────────────────────────────────────────────────
export type SimulatorQuestion = {
  id: string; number: number; question: string; optionA: string; optionB: string;
  optionC: string; optionD: string; optionE: string; correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string; topic: string; difficulty: Difficulty;
};

export const simulatorQuestions: SimulatorQuestion[] = [
  { id: "sq1", number: 1, question: "Diketahui f(x) = 2x² − 3x + 1. Nilai f(−2) adalah...", optionA: "15", optionB: "11", optionC: "3", optionD: "−3", optionE: "−11", correctAnswer: "A", explanation: "f(−2) = 2(4) + 6 + 1 = 15.", topic: "Fungsi Kuadrat", difficulty: "Mudah" },
  { id: "sq2", number: 2, question: "Akar-akar persamaan x² − 5x + 6 = 0 adalah...", optionA: "x = 1 dan x = 6", optionB: "x = 2 dan x = 3", optionC: "x = −2 dan x = −3", optionD: "x = −1 dan x = 6", optionE: "x = 1 dan x = −6", correctAnswer: "B", explanation: "(x − 2)(x − 3) = 0.", topic: "Persamaan Kuadrat", difficulty: "Mudah" },
  { id: "sq3", number: 3, question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...", optionA: "9", optionB: "31", optionC: "41", optionD: "49", optionE: "−31", correctAnswer: "D", explanation: "D = 9 + 40 = 49.", topic: "Diskriminan", difficulty: "Sedang" },
  { id: "sq4", number: 4, question: "Titik puncak dari y = −x² + 4x − 1 adalah...", optionA: "(2, 3)", optionB: "(−2, 3)", optionC: "(2, −3)", optionD: "(4, −1)", optionE: "(1, 2)", correctAnswer: "A", explanation: "x puncak = 2, y puncak = 3.", topic: "Titik Puncak Parabola", difficulty: "Sedang" },
  { id: "sq5", number: 5, question: "Jumlah akar dari x² + px + 12 = 0 adalah 7, maka p = ...", optionA: "−7", optionB: "7", optionC: "−12", optionD: "12", optionE: "5", correctAnswer: "A", explanation: "−p = 7 → p = −7.", topic: "Rumus Vieta", difficulty: "Sulit" },
];

// ── AI Tutor ───────────────────────────────────────────────────────────
export type ChatMessage = {
  id: string; role: "assistant" | "user";
  content: string; sources?: string[]; grounded?: boolean;
  timestamp?: string;
};

export const assistantGreeting: ChatMessage = {
  id: "greeting", role: "assistant", grounded: true, timestamp: "Baru saja",
  content: "Halo Andi! Saya AI Companion kamu. Tanyakan apapun tentang materi yang sudah gurumu upload — saya hanya menjawab berdasarkan materi tersebut dengan referensi halaman yang jelas.",
};

export const suggestedPrompts = [
  "Jelaskan cara mencari diskriminan persamaan kuadrat",
  "Apa itu rumus Vieta dan kapan digunakan?",
  "Mengapa grafik y = (x − 3)² bergeser ke kanan?",
  "Bedakan barisan aritmetika dan geometri",
  "Bagaimana cara membentuk persamaan dari akar-akarnya?",
  "Apa ibu kota Prancis?",
];

const NOT_COVERED_MESSAGE = "Topik ini tidak tercakup dalam materi yang disediakan gurumu. Coba tanya tentang materi Matematika XI yang sudah diunggah.";

const groundedReplies: { match: RegExp; content: string; sources: string[] }[] = [
  { match: /diskriminan|discriminant/i, content: "Dari Modul Matematika hal. 18: Diskriminan D = b² − 4ac. Jika D > 0 → dua akar real berbeda. Jika D = 0 → satu akar kembar. Jika D < 0 → tidak ada akar real. Perhatikan tanda konstanta c saat menghitung −4ac.", sources: ["Modul Matematika – Fungsi Kuadrat, hal. 18"] },
  { match: /vieta|jumlah akar|hasil kali akar/i, content: "Dari Modul Matematika hal. 20: Untuk ax² + bx + c = 0, berlaku: x₁ + x₂ = −b/a (jumlah akar) dan x₁ · x₂ = c/a (hasil kali akar). Ingat tanda negatif pada rumus jumlah akar!", sources: ["Modul Matematika – Fungsi Kuadrat, hal. 20"] },
  { match: /kanan|kiri|bergeser|shift|transformasi|grafik/i, content: "Dari Modul Matematika hal. 12: y = (x − a)² → bergeser a satuan ke KANAN. y = (x + a)² → bergeser a satuan ke KIRI. Ingat: tanda minus dalam kurung → ke kanan.", sources: ["Modul Matematika – Fungsi Kuadrat, hal. 12"] },
  { match: /barisan|deret|aritmetika|geometri|rasio|beda/i, content: "Dari Buku Teks Matematika XI hal. 140–165: Barisan Aritmetika: selisih antar suku (beda) tetap. Uₙ = a + (n−1)d. Barisan Geometri: rasio antar suku tetap. Uₙ = a · rⁿ⁻¹.", sources: ["Buku Teks Matematika XI (Erlangga), hal. 140", "Buku Teks Matematika XI (Erlangga), hal. 158"] },
  { match: /akar.*(persamaan|terbentuk|membentuk)|persamaan.*akar/i, content: "Dari Modul Matematika hal. 22: Jika akar-akarnya x₁ dan x₂, persamaan kuadratnya adalah: x² − (x₁+x₂)x + (x₁·x₂) = 0. Gunakan Rumus Vieta terbalik.", sources: ["Modul Matematika – Fungsi Kuadrat, hal. 22"] },
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
  { id: "ach1", title: "Streak 7 Hari", description: "Belajar 7 hari berturut-turut", category: "streak", xp: 100, earned: true, earnedAt: "8 Nov 2025", icon: "🔥" },
  { id: "ach2", title: "Top 5 Kelas", description: "Masuk 5 besar peringkat kelas", category: "rank", xp: 150, earned: true, earnedAt: "22 Nov 2025", icon: "⭐" },
  { id: "ach3", title: "Rajin Berlatih", description: "Kerjakan 100 soal latihan", category: "practice", xp: 50, earned: true, earnedAt: "20 Nov 2025", icon: "📚" },
  { id: "ach4", title: "Nilai Sempurna", description: "Skor 100 dalam satu asesmen", category: "score", xp: 200, earned: false, icon: "💎" },
  { id: "ach5", title: "Ahli Tiga Topik", description: "Capai Mahir di 3 topik berbeda", category: "mastery", xp: 300, earned: false, icon: "🎓" },
  { id: "ach6", title: "Comeback King", description: "Tingkatkan nilai 20+ poin dari asesmen sebelumnya", category: "score", xp: 250, earned: false, icon: "⚡" },
  { id: "ach7", title: "Streak 30 Hari", description: "Belajar 30 hari berturut-turut", category: "streak", xp: 500, earned: false, icon: "🏆" },
  { id: "ach8", title: "Juara Kelas", description: "Raih peringkat 1 dalam asesmen manapun", category: "rank", xp: 400, earned: false, icon: "👑" },
];

export const leaderboard = [
  { rank: 1, studentId: "s1", name: "Sari Dewi", initials: "SD", avgScore: 94, xp: 2400, streak: 12, isCurrentUser: false },
  { rank: 2, studentId: "s2", name: "Budi Santoso", initials: "BS", avgScore: 91, xp: 2200, streak: 5, isCurrentUser: false },
  { rank: 3, studentId: "s3", name: "Citra Lestari", initials: "CL", avgScore: 88, xp: 2050, streak: 12, isCurrentUser: false },
  { rank: 4, studentId: "s4", name: "Deni Rahmat", initials: "DR", avgScore: 87, xp: 1980, streak: 3, isCurrentUser: false },
  { rank: 5, studentId: "s22", name: "Andi Pratama", initials: "AP", avgScore: 85, xp: 1850, streak: 7, isCurrentUser: true },
];

// ── Notifications ──────────────────────────────────────────────────────
export type AppNotification = {
  id: string; title: string; description: string;
  time: string; read: boolean;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
  href?: string;
};

export const teacherNotifications: AppNotification[] = [
  { id: "tn1", title: "18 soal menunggu tinjauan", description: "AI menghasilkan 18 soal baru dari Modul Fungsi Kuadrat. Tinjau dan setujui sebelum diterbitkan.", time: "10 menit lalu", read: false, tone: "primary", href: "/teacher/question-review" },
  { id: "tn2", title: "Diskriminan: perlu perhatian segera", description: "58% siswa XI IPA 2 gagal di topik Diskriminan. Rekomendasi remedial telah dibuat.", time: "1 jam lalu", read: false, tone: "warning", href: "/teacher/recommendations" },
  { id: "tn3", title: "3 siswa berisiko tertinggal", description: "Dewi, Erwin, dan Fauzi konsisten di bawah 50 selama 3 asesmen berturut-turut.", time: "3 jam lalu", read: false, tone: "danger", href: "/teacher/analytics" },
  { id: "tn4", title: "UTS Matematika selesai dinilai", description: "Semua 32 lembar jawaban telah diproses. Rata-rata kelas: 76. Lihat analitik lengkap.", time: "Kemarin, 14:32", read: true, tone: "success", href: "/teacher/results" },
  { id: "tn5", title: "Materi PPT berhasil diproses", description: "PPT Fungsi Kuadrat (42 hal.) selesai dianalisis. 36 soal siap diekstrak.", time: "Kemarin, 09:15", read: true, tone: "neutral" },
  { id: "tn6", title: "Tes Diagnostik Fisika dikonfirmasi", description: "Terjadwal 28 November 2025, pukul 13.00 WIB. 20 soal · 45 menit.", time: "2 hari lalu", read: true, tone: "neutral" },
];

export const studentNotifications: AppNotification[] = [
  { id: "sn1", title: "Asesmen baru tersedia", description: "Tes Diagnostik Fisika dijadwalkan 28 November, pukul 13.00. Persiapkan dirimu!", time: "5 menit lalu", read: false, tone: "primary", href: "/student/simulator" },
  { id: "sn2", title: "Topik lemah: Diskriminan 38%", description: "Akurasi kamu masih rendah. Latihan adaptif telah disiapkan khusus untukmu.", time: "2 jam lalu", read: false, tone: "warning", href: "/student/adaptive" },
  { id: "sn3", title: "Hasil Kuis Fungsi Kuadrat", description: "Selamat! Kamu meraih skor 87 — di atas rata-rata kelas (82). Peringkat ke-4.", time: "Kemarin", read: true, tone: "success", href: "/student/review" },
  { id: "sn4", title: "Materi baru: Barisan & Deret", description: "Bu Ratna menambahkan modul baru. Pelajari sebelum kuis minggu depan.", time: "2 hari lalu", read: true, tone: "neutral", href: "/student/dashboard" },
  { id: "sn5", title: "Pencapaian: Streak 7 Hari!", description: "Kamu sudah belajar 7 hari berturut-turut dan mendapat +100 XP. Pertahankan!", time: "3 hari lalu", read: true, tone: "success", href: "/student/achievements" },
];

export const parentNotifications: AppNotification[] = [
  { id: "pn1", title: "Hasil Kuis Fungsi Kuadrat", description: "Andi mendapat nilai 87 — di atas rata-rata kelas (82). Peringkat ke-4 dari 30 peserta.", time: "1 jam lalu", read: false, tone: "success", href: "/parent/assessments" },
  { id: "pn2", title: "Topik yang perlu perhatian", description: "Andi masih kesulitan di Diskriminan (38% akurasi). Bu Ratna menyarankan latihan tambahan.", time: "3 jam lalu", read: false, tone: "warning", href: "/parent/recommendations" },
  { id: "pn3", title: "⚠️ Asesmen belum dikerjakan", description: "Tes Diagnostik Fisika (28 Nov) belum dikerjakan Andi. Ingatkan segera!", time: "Kemarin", read: false, tone: "danger", href: "/parent/assessments" },
  { id: "pn4", title: "Streak belajar 7 hari", description: "Andi telah belajar konsisten 7 hari berturut-turut. Semangat belajarnya sangat baik!", time: "3 hari lalu", read: true, tone: "success", href: "/parent/progress" },
];

export const adminNotifications: AppNotification[] = [
  { id: "an1", title: "3 guru belum aktif minggu ini", description: "Pak Doni, Bu Wulan, dan 1 guru lain belum login sejak Senin.", time: "2 jam lalu", read: false, tone: "warning" },
  { id: "an2", title: "Penyimpanan 78% penuh", description: "Media penyimpanan telah terpakai 78%. Pertimbangkan peningkatan kapasitas.", time: "Kemarin", read: false, tone: "danger" },
  { id: "an3", title: "24 asesmen aktif minggu ini", description: "Total 24 asesmen berjalan di 8 kelas berbeda. Pantau progres dari dasbor.", time: "2 hari lalu", read: true, tone: "primary" },
];

// ── Navigation ─────────────────────────────────────────────────────────
export const teacherNav: NavItem[] = [
  { title: "Dasbor", href: "/teacher/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Pustaka Materi", href: "/teacher/materials", icon: Library, group: "KONTEN" },
  { title: "Gaya Asesmen", href: "/teacher/assessment-styles", icon: BookMarked, group: "KONTEN" },
  { title: "Bank Soal", href: "/teacher/question-bank", icon: Database, group: "SOAL" },
  { title: "Tinjau Soal AI", href: "/teacher/question-review", icon: ShieldCheck, group: "SOAL" },
  { title: "Buat Asesmen", href: "/teacher/assessment-builder", icon: FilePlus2, group: "ASESMEN" },
  { title: "Hasil Asesmen", href: "/teacher/results", icon: BarChart3, group: "ASESMEN" },
  { title: "Analitik Kelas", href: "/teacher/analytics", icon: TrendingUp, group: "ANALITIK" },
  { title: "Rekomendasi", href: "/teacher/recommendations", icon: Lightbulb, group: "ANALITIK" },
  { title: "Konfigurasi AI", href: "/teacher/ai-config", icon: Settings2, group: "SISTEM" },
];

export const studentNav: NavItem[] = [
  { title: "Dasbor", href: "/student/dashboard", icon: Home, group: "OVERVIEW" },
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
