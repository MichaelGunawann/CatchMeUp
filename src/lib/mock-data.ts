import {
  AlertCircle,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  ClipboardList,
  Database,
  FilePlus2,
  FileSearch,
  GraduationCap,
  Home,
  Library,
  Lightbulb,
  LineChart,
  LucideIcon,
  MessageSquare,
  Monitor,
  School,
  Settings,
  Settings2,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

// ─── Domain Types ──────────────────────────────────────────────────────────────

export type MasteryLevel = "Mahir" | "Berkembang" | "Perlu Bantuan" | "Belum Diukur";
export type AssessmentType = "TKA" | "UTS" | "UAS" | "Ujian Sekolah" | "Kuis Guru" | "Tes Diagnostik" | "Tryout";
export type Difficulty = "Mudah" | "Sedang" | "Sulit";
export type MaterialType = "RPP" | "Modul Ajar" | "PPT" | "Soal Latihan" | "Kunci Jawaban";
export type QuestionStatus = "Disetujui" | "Perlu Ditinjau" | "Ditolak";
export type BloomLevel = "Mengingat" | "Memahami" | "Menerapkan" | "Menganalisis" | "Mengevaluasi" | "Mencipta";
export type ConfidenceDiagnosis = "Misconception" | "Knowledge Gap" | "Needs Reinforcement" | "Mastery";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: string;
};

// ─── Navigation ────────────────────────────────────────────────────────────────

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
  { title: "Soal Salah", href: "/student/incorrect", icon: XCircle, group: "REVIEW" },
  { title: "AI Companion", href: "/student/tutor", icon: MessageSquare, group: "BELAJAR" },
  { title: "Progres", href: "/student/progress", icon: LineChart, group: "BELAJAR" },
  { title: "Pencapaian", href: "/student/achievements", icon: Trophy, group: "BELAJAR" },
];

export const parentNav: NavItem[] = [
  { title: "Dasbor", href: "/parent/dashboard", icon: Home },
  { title: "Progres Anak", href: "/parent/progress", icon: TrendingUp },
  { title: "Riwayat Asesmen", href: "/parent/assessments", icon: ClipboardList },
  { title: "Rekomendasi", href: "/parent/recommendations", icon: Lightbulb },
  { title: "Notifikasi", href: "/parent/notifications", icon: Bell },
];

export const adminNav: NavItem[] = [
  { title: "Dasbor", href: "/admin/dashboard", icon: Home, group: "OVERVIEW" },
  { title: "Sekolah", href: "/admin/schools", icon: School, group: "KELOLA" },
  { title: "Guru", href: "/admin/teachers", icon: GraduationCap, group: "KELOLA" },
  { title: "Siswa", href: "/admin/students", icon: Users, group: "KELOLA" },
  { title: "Kelas", href: "/admin/classes", icon: BookOpen, group: "KELOLA" },
  { title: "Asesmen", href: "/admin/assessments", icon: ClipboardList, group: "KELOLA" },
  { title: "Analitik", href: "/admin/analytics", icon: LineChart, group: "ANALITIK" },
  { title: "Pengaturan", href: "/admin/settings", icon: Settings, group: "SISTEM" },
];

// ─── Mastery ───────────────────────────────────────────────────────────────────

export const masteryTone: Record<MasteryLevel, "success" | "primary" | "warning" | "neutral"> = {
  Mahir: "success",
  Berkembang: "primary",
  "Perlu Bantuan": "warning",
  "Belum Diukur": "neutral"
};

// ─── Materials (Knowledge Corpus) ─────────────────────────────────────────────

export type Material = {
  id: string;
  title: string;
  type: MaterialType;
  subject: string;
  uploadedAt: string;
  pages: number;
  status: "Aktif" | "Draf";
};

export const materials: Material[] = [
  { id: "m1", title: "Modul Matematika – Fungsi Kuadrat", type: "Modul Ajar", subject: "Matematika XI", uploadedAt: "2 hari lalu", pages: 24, status: "Aktif" },
  { id: "m2", title: "RPP Hukum Newton", type: "RPP", subject: "Fisika X", uploadedAt: "5 hari lalu", pages: 12, status: "Aktif" },
  { id: "m3", title: "Presentasi Sistem Pernapasan", type: "PPT", subject: "Biologi XII", uploadedAt: "1 minggu lalu", pages: 38, status: "Aktif" },
  { id: "m4", title: "Soal Latihan Trigonometri", type: "Soal Latihan", subject: "Matematika XI", uploadedAt: "2 minggu lalu", pages: 6, status: "Aktif" },
  { id: "m5", title: "Kunci Jawaban UTS Fisika", type: "Kunci Jawaban", subject: "Fisika X", uploadedAt: "3 minggu lalu", pages: 4, status: "Draf" }
];

// ─── Assessment Style Corpus ───────────────────────────────────────────────────

export type AssessmentStyleType = "TKA" | "Ujian Sekolah" | "UTS" | "UAS" | "Tryout" | "Kuis";

export type AssessmentStyleCorpus = {
  id: string;
  name: string;
  styleType: AssessmentStyleType;
  year: number;
  papersCount: number;
  questionsCount: number;
  subject: string;
  status: "Aktif" | "Draf";
};

export const assessmentStyles: AssessmentStyleCorpus[] = [
  { id: "as1", name: "TKA Matematika 2024", styleType: "TKA", year: 2024, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif" },
  { id: "as2", name: "TKA Matematika 2023", styleType: "TKA", year: 2023, papersCount: 5, questionsCount: 250, subject: "Matematika", status: "Aktif" },
  { id: "as3", name: "TKA Matematika 2022", styleType: "TKA", year: 2022, papersCount: 4, questionsCount: 200, subject: "Matematika", status: "Aktif" },
  { id: "as4", name: "UTS SMA Negeri 1 Bandung 2024", styleType: "UTS", year: 2024, papersCount: 3, questionsCount: 120, subject: "Matematika", status: "Aktif" },
  { id: "as5", name: "UAS Gabungan 2023", styleType: "UAS", year: 2023, papersCount: 4, questionsCount: 160, subject: "Matematika", status: "Aktif" },
  { id: "as6", name: "Tryout Nasional 2024", styleType: "Tryout", year: 2024, papersCount: 2, questionsCount: 80, subject: "Matematika", status: "Draf" },
];

// ─── Question Bank ─────────────────────────────────────────────────────────────

export type QuestionBankEntry = {
  id: string;
  question: string;
  topic: string;
  subtopic: string;
  bloom: BloomLevel;
  difficulty: Difficulty;
  styleType: AssessmentStyleType;
  source: string;
  usageCount: number;
  successRate: number;
  status: QuestionStatus;
  isLocked: boolean;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
};

export const questionBank: QuestionBankEntry[] = [
  {
    id: "qb1", question: "Jika f(x) = (x − 3)², maka titik puncak grafik berada di koordinat...",
    topic: "Fungsi Kuadrat", subtopic: "Titik Puncak", bloom: "Memahami", difficulty: "Sedang",
    styleType: "TKA", source: "Modul Matematika, hal. 8", usageCount: 4, successRate: 74,
    status: "Disetujui", isLocked: false,
    options: { A: "(3, 0)", B: "(−3, 0)", C: "(0, 3)", D: "(0, −3)" }, correctAnswer: "A",
    explanation: "Bentuk f(x) = (x − a)² memiliki titik puncak di (a, 0). Karena a = 3, titik puncaknya adalah (3, 0)."
  },
  {
    id: "qb2", question: "Akar-akar persamaan x² − 5x + 6 = 0 adalah...",
    topic: "Persamaan Kuadrat", subtopic: "Pemfaktoran", bloom: "Menerapkan", difficulty: "Mudah",
    styleType: "TKA", source: "Modul Matematika, hal. 15", usageCount: 7, successRate: 82,
    status: "Disetujui", isLocked: true,
    options: { A: "x = 1 dan x = 6", B: "x = 2 dan x = 3", C: "x = −2 dan x = −3", D: "x = −1 dan x = 6" }, correctAnswer: "B",
    explanation: "Faktorkan: (x − 2)(x − 3) = 0, sehingga x = 2 atau x = 3."
  },
  {
    id: "qb3", question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...",
    topic: "Diskriminan", subtopic: "Perhitungan D", bloom: "Menerapkan", difficulty: "Sedang",
    styleType: "UTS", source: "Modul Matematika, hal. 18", usageCount: 5, successRate: 38,
    status: "Perlu Ditinjau", isLocked: false,
    options: { A: "9", B: "31", C: "41", D: "49" }, correctAnswer: "D",
    explanation: "D = b² − 4ac = 3² − 4(2)(−5) = 9 + 40 = 49."
  },
  {
    id: "qb4", question: "Jika jumlah akar persamaan x² + px + 12 = 0 adalah 7, maka nilai p adalah...",
    topic: "Rumus Vieta", subtopic: "Jumlah Akar", bloom: "Menganalisis", difficulty: "Sulit",
    styleType: "TKA", source: "Modul Matematika, hal. 20", usageCount: 3, successRate: 42,
    status: "Disetujui", isLocked: false,
    options: { A: "−7", B: "7", C: "−12", D: "12" }, correctAnswer: "A",
    explanation: "Rumus Vieta: x₁ + x₂ = −p/a = −p. Jika jumlah akar = 7, maka −p = 7 → p = −7."
  },
  {
    id: "qb5", question: "Titik puncak dari parabola y = −x² + 4x − 1 adalah...",
    topic: "Fungsi Kuadrat", subtopic: "Titik Puncak", bloom: "Menerapkan", difficulty: "Sedang",
    styleType: "TKA", source: "Modul Matematika, hal. 10", usageCount: 6, successRate: 71,
    status: "Disetujui", isLocked: false,
    options: { A: "(2, 3)", B: "(−2, 3)", C: "(2, −3)", D: "(4, −1)" }, correctAnswer: "A",
    explanation: "x puncak = −b/(2a) = −4/(2×(−1)) = 2. y puncak = −4 + 8 − 1 = 3. Jadi titik puncaknya (2, 3)."
  },
  {
    id: "qb6", question: "Grafik y = (x − 2)² bergeser ke mana dibandingkan y = x²?",
    topic: "Transformasi Grafik", subtopic: "Pergeseran Horizontal", bloom: "Memahami", difficulty: "Mudah",
    styleType: "UTS", source: "Modul Matematika, hal. 12", usageCount: 8, successRate: 61,
    status: "Perlu Ditinjau", isLocked: false,
    options: { A: "2 satuan ke kanan", B: "2 satuan ke kiri", C: "2 satuan ke atas", D: "2 satuan ke bawah" }, correctAnswer: "A",
    explanation: "Substitusi x − 2 dalam tanda kurung menggeser grafik ke kanan sejauh 2 satuan."
  },
];

// ─── AI-Generated Questions (Pending Review) ──────────────────────────────────

export type PendingQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
  difficulty: Difficulty;
  sourceRef: string;
  status: QuestionStatus;
};

export const pendingQuestions: PendingQuestion[] = [
  {
    id: "q1", question: "Jika f(x) = (x − 3)², maka titik puncak grafik berada di koordinat...",
    optionA: "(3, 0)", optionB: "(−3, 0)", optionC: "(0, 3)", optionD: "(0, −3)",
    correctAnswer: "A",
    explanation: "Bentuk f(x) = (x − a)² memiliki titik puncak di (a, 0). Karena a = 3, titik puncaknya adalah (3, 0).",
    topic: "Fungsi Kuadrat", difficulty: "Sedang", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 8",
    status: "Perlu Ditinjau"
  },
  {
    id: "q2", question: "Grafik y = (x − 2)² bergeser ke mana dibandingkan y = x²?",
    optionA: "2 satuan ke kanan", optionB: "2 satuan ke kiri", optionC: "2 satuan ke atas", optionD: "2 satuan ke bawah",
    correctAnswer: "A",
    explanation: "Substitusi x − 2 dalam tanda kurung menggeser grafik ke kanan sejauh 2 satuan. Tanda minus berarti pergeseran ke kanan.",
    topic: "Transformasi Grafik", difficulty: "Mudah", sourceRef: "Modul Matematika – Fungsi Kuadrat, hal. 12",
    status: "Perlu Ditinjau"
  },
  {
    id: "q3", question: "Gaya resultan pada benda yang bergerak dengan percepatan 4 m/s² dan massa 5 kg adalah...",
    optionA: "20 N", optionB: "0.8 N", optionC: "1.25 N", optionD: "9 N",
    correctAnswer: "A",
    explanation: "Menggunakan Hukum Newton II: F = m × a = 5 × 4 = 20 N.",
    topic: "Hukum Newton", difficulty: "Mudah", sourceRef: "RPP Hukum Newton, hal. 5",
    status: "Disetujui"
  },
  {
    id: "q4", question: "Proses pertukaran gas pada paru-paru manusia terjadi di...",
    optionA: "Alveolus", optionB: "Bronkus", optionC: "Trakea", optionD: "Pleura",
    correctAnswer: "A",
    explanation: "Alveolus adalah kantong udara kecil di paru-paru tempat terjadinya difusi O₂ ke darah dan CO₂ dari darah.",
    topic: "Sistem Pernapasan", difficulty: "Mudah", sourceRef: "Presentasi Sistem Pernapasan, hal. 15",
    status: "Ditolak"
  }
];

// ─── Assessments ───────────────────────────────────────────────────────────────

export type Assessment = {
  id: string;
  title: string;
  type: AssessmentType;
  subject: string;
  totalQuestions: number;
  duration: number;
  scheduledFor: string;
  avgScore?: number;
  participants?: number;
  status: "Terjadwal" | "Berlangsung" | "Selesai";
};

export const assessments: Assessment[] = [
  { id: "a1", title: "UTS Matematika XI – Semester 1", type: "UTS", subject: "Matematika XI", totalQuestions: 40, duration: 90, scheduledFor: "15 Nov 2025", avgScore: 76, participants: 32, status: "Selesai" },
  { id: "a2", title: "Kuis Fungsi Kuadrat", type: "Kuis Guru", subject: "Matematika XI", totalQuestions: 15, duration: 30, scheduledFor: "22 Nov 2025", avgScore: 82, participants: 30, status: "Selesai" },
  { id: "a3", title: "Tes Diagnostik Fisika", type: "Tes Diagnostik", subject: "Fisika X", totalQuestions: 20, duration: 45, scheduledFor: "28 Nov 2025", status: "Terjadwal" },
  { id: "a4", title: "UAS Biologi XII", type: "UAS", subject: "Biologi XII", totalQuestions: 50, duration: 120, scheduledFor: "5 Des 2025", status: "Terjadwal" }
];

// ─── Simulator Questions (TKA-style) ──────────────────────────────────────────

export type SimulatorQuestion = {
  id: string;
  number: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  topic: string;
  difficulty: Difficulty;
};

export const simulatorQuestions: SimulatorQuestion[] = [
  { id: "sq1", number: 1, question: "Diketahui f(x) = 2x² − 3x + 1. Nilai f(−2) adalah...", optionA: "15", optionB: "11", optionC: "3", optionD: "−3", optionE: "−11", correctAnswer: "A", explanation: "f(−2) = 2(−2)² − 3(−2) + 1 = 2(4) + 6 + 1 = 8 + 6 + 1 = 15.", topic: "Fungsi Kuadrat", difficulty: "Mudah" },
  { id: "sq2", number: 2, question: "Akar-akar persamaan x² − 5x + 6 = 0 adalah...", optionA: "x = 1 dan x = 6", optionB: "x = 2 dan x = 3", optionC: "x = −2 dan x = −3", optionD: "x = −1 dan x = 6", optionE: "x = 1 dan x = −6", correctAnswer: "B", explanation: "Faktorkan: (x − 2)(x − 3) = 0, sehingga x = 2 atau x = 3.", topic: "Persamaan Kuadrat", difficulty: "Mudah" },
  { id: "sq3", number: 3, question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...", optionA: "9", optionB: "31", optionC: "41", optionD: "49", optionE: "−31", correctAnswer: "D", explanation: "D = b² − 4ac = 3² − 4(2)(−5) = 9 + 40 = 49.", topic: "Diskriminan", difficulty: "Sedang" },
  { id: "sq4", number: 4, question: "Titik puncak dari parabola y = −x² + 4x − 1 adalah...", optionA: "(2, 3)", optionB: "(−2, 3)", optionC: "(2, −3)", optionD: "(4, −1)", optionE: "(1, 2)", correctAnswer: "A", explanation: "x puncak = −b/(2a) = −4/(2×(−1)) = 2. y puncak = −4 + 8 − 1 = 3. Jadi titik puncaknya (2, 3).", topic: "Titik Puncak Parabola", difficulty: "Sedang" },
  { id: "sq5", number: 5, question: "Jika jumlah akar persamaan x² + px + 12 = 0 adalah 7, maka nilai p adalah...", optionA: "−7", optionB: "7", optionC: "−12", optionD: "12", optionE: "5", correctAnswer: "A", explanation: "Menurut hubungan Vieta, jumlah akar = −p/a = −p. Jika jumlah akar = 7, maka −p = 7 → p = −7.", topic: "Rumus Vieta", difficulty: "Sulit" }
];

// ─── Student Assessment Results ────────────────────────────────────────────────

export type StudentResult = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  type: AssessmentType;
  date: string;
  score: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  duration: number;
  rank?: number;
  classAvg?: number;
};

export const studentResults: StudentResult[] = [
  { id: "sr1", assessmentId: "a1", assessmentTitle: "UTS Matematika XI – Semester 1", type: "UTS", date: "15 Nov 2025", score: 78, totalQuestions: 40, correct: 31, wrong: 7, unanswered: 2, duration: 82, rank: 8, classAvg: 76 },
  { id: "sr2", assessmentId: "a2", assessmentTitle: "Kuis Fungsi Kuadrat", type: "Kuis Guru", date: "22 Nov 2025", score: 87, totalQuestions: 15, correct: 13, wrong: 2, unanswered: 0, duration: 22, rank: 4, classAvg: 82 },
  { id: "sr3", assessmentId: "sim1", assessmentTitle: "Simulasi TKA Matematika", type: "TKA", date: "25 Nov 2025", score: 72, totalQuestions: 5, correct: 3, wrong: 2, unanswered: 0, duration: 18, classAvg: 68 }
];

// ─── Weak Topics ───────────────────────────────────────────────────────────────

export type WeakTopic = {
  id: string;
  topic: string;
  subject: string;
  mastery: MasteryLevel;
  accuracyRate: number;
  questionsAttempted: number;
  lastPracticed: string;
  recommendedAction: string;
};

export const weakTopics: WeakTopic[] = [
  { id: "wt1", topic: "Diskriminan Persamaan Kuadrat", subject: "Matematika", mastery: "Perlu Bantuan", accuracyRate: 38, questionsAttempted: 13, lastPracticed: "3 hari lalu", recommendedAction: "Kerjakan 10 soal latihan diskriminan level Mudah" },
  { id: "wt2", topic: "Rumus Vieta", subject: "Matematika", mastery: "Perlu Bantuan", accuracyRate: 42, questionsAttempted: 12, lastPracticed: "5 hari lalu", recommendedAction: "Pelajari kembali hubungan akar dan koefisien" },
  { id: "wt3", topic: "Transformasi Grafik Kuadrat", subject: "Matematika", mastery: "Berkembang", accuracyRate: 61, questionsAttempted: 18, lastPracticed: "2 hari lalu", recommendedAction: "Fokus pada pergeseran horizontal dan vertikal" },
  { id: "wt4", topic: "Hukum Newton II", subject: "Fisika", mastery: "Berkembang", accuracyRate: 65, questionsAttempted: 11, lastPracticed: "1 minggu lalu", recommendedAction: "Latih soal aplikasi F = ma dengan satuan berbeda" }
];

// ─── Incorrect Questions History ───────────────────────────────────────────────

export type IncorrectQuestion = {
  id: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  topic: string;
  assessmentTitle: string;
  date: string;
  difficulty: Difficulty;
  confidenceDiagnosis: ConfidenceDiagnosis;
};

export const incorrectQuestions: IncorrectQuestion[] = [
  {
    id: "iq1", question: "Diskriminan dari 2x² + 3x − 5 = 0 adalah...",
    yourAnswer: "C (41)", correctAnswer: "D (49)",
    explanation: "D = b² − 4ac = 3² − 4(2)(−5) = 9 + 40 = 49. Perhatikan tanda minus pada c = −5 yang membuat −4ac menjadi positif.",
    topic: "Diskriminan", assessmentTitle: "Simulasi TKA Matematika", date: "25 Nov 2025", difficulty: "Sedang",
    confidenceDiagnosis: "Misconception"
  },
  {
    id: "iq2", question: "Jika jumlah akar persamaan x² + px + 12 = 0 adalah 7, maka nilai p adalah...",
    yourAnswer: "B (7)", correctAnswer: "A (−7)",
    explanation: "Rumus Vieta: x₁ + x₂ = −b/a = −p. Jika jumlah akar = 7, maka −p = 7, sehingga p = −7. Perhatikan tanda negatif.",
    topic: "Rumus Vieta", assessmentTitle: "Simulasi TKA Matematika", date: "25 Nov 2025", difficulty: "Sulit",
    confidenceDiagnosis: "Knowledge Gap"
  },
  {
    id: "iq3", question: "Grafik y = (x − 2)² bergeser ke mana dibandingkan y = x²?",
    yourAnswer: "B (2 satuan ke kiri)", correctAnswer: "A (2 satuan ke kanan)",
    explanation: "Substitusi (x − 2) menggeser grafik ke kanan. Ingat: tanda minus di dalam kurung berarti pergeseran ke kanan, bukan ke kiri.",
    topic: "Transformasi Grafik", assessmentTitle: "UTS Matematika XI – Semester 1", date: "15 Nov 2025", difficulty: "Mudah",
    confidenceDiagnosis: "Misconception"
  }
];

// ─── Student Profile ───────────────────────────────────────────────────────────

export const studentProfile = {
  name: "Andi Pratama",
  initials: "AP",
  class: "XI IPA 2",
  school: "SMA Negeri 1 Bandung",
  gradeLevel: "Kelas 11",
  overallMastery: "Berkembang" as MasteryLevel,
  avgScore: 79,
  rank: 8,
  totalStudents: 32,
  streak: 7,
  xp: 1850,
  totalAssessments: 12
};

// ─── Achievements & Gamification ──────────────────────────────────────────────

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: "streak" | "score" | "mastery" | "rank" | "practice";
  xp: number;
  earned: boolean;
  earnedAt?: string;
};

export const achievements: Achievement[] = [
  { id: "ach1", title: "Streak 7 Hari", description: "Belajar 7 hari berturut-turut", category: "streak", xp: 100, earned: true, earnedAt: "8 Nov 2025" },
  { id: "ach2", title: "Nilai Sempurna", description: "Skor 100 dalam satu asesmen", category: "score", xp: 200, earned: false },
  { id: "ach3", title: "Ahli Tiga Topik", description: "Capai Mahir di 3 topik berbeda", category: "mastery", xp: 300, earned: false },
  { id: "ach4", title: "Top 5 Kelas", description: "Masuk 5 besar peringkat kelas", category: "rank", xp: 150, earned: true, earnedAt: "22 Nov 2025" },
  { id: "ach5", title: "Rajin Berlatih", description: "Kerjakan 100 soal latihan", category: "practice", xp: 50, earned: true, earnedAt: "20 Nov 2025" },
  { id: "ach6", title: "Comeback King", description: "Tingkatkan nilai 20+ poin dari asesmen sebelumnya", category: "score", xp: 250, earned: false },
];

export const leaderboard = [
  { rank: 1, name: "Sari Dewi", initials: "SD", score: 94, xp: 2400, isCurrentUser: false },
  { rank: 2, name: "Budi Santoso", initials: "BS", score: 91, xp: 2200, isCurrentUser: false },
  { rank: 3, name: "Citra Lestari", initials: "CL", score: 88, xp: 2050, isCurrentUser: false },
  { rank: 4, name: "Deni Rahmat", initials: "DR", score: 87, xp: 1980, isCurrentUser: false },
  { rank: 5, name: "Andi Pratama", initials: "AP", score: 85, xp: 1850, isCurrentUser: true },
];

// ─── Teaching Recommendations ──────────────────────────────────────────────────

export type TeachingRecommendation = {
  id: string;
  topic: string;
  issue: string;
  affectedStudents: number;
  priority: "Tinggi" | "Sedang" | "Rendah";
  suggestion: string;
  estimatedTime: string;
};

export const teachingRecommendations: TeachingRecommendation[] = [
  { id: "tr1", topic: "Diskriminan", issue: "58% siswa menjawab salah di soal diskriminan dengan konstanta negatif", affectedStudents: 18, priority: "Tinggi", suggestion: "Tambahkan satu sesi khusus dengan contoh soal bergantian antara konstanta positif dan negatif", estimatedTime: "20 menit" },
  { id: "tr2", topic: "Rumus Vieta", issue: "Siswa sering membalik tanda pada jumlah dan hasil kali akar", affectedStudents: 14, priority: "Tinggi", suggestion: "Gunakan mnemonic visual: 'jumlah akar = −b (berlawanan tanda b)'", estimatedTime: "15 menit" },
  { id: "tr3", topic: "Transformasi Grafik", issue: "Kebingungan arah pergeseran horizontal masih terjadi", affectedStudents: 10, priority: "Sedang", suggestion: "Gunakan desmos.com untuk demonstrasi interaktif secara langsung di kelas", estimatedTime: "10 menit" }
];

// ─── AI Teaching Style Options ─────────────────────────────────────────────────

export type AIStyleOption = {
  id: string;
  label: string;
  description: string;
  example: string;
  active: boolean;
};

export const aiStyleOptions: AIStyleOption[] = [
  { id: "s1", label: "Socratic", description: "AI memandu siswa dengan pertanyaan, bukan langsung memberi jawaban", example: "\"Apa yang terjadi pada nilai x saat ekspresi dalam kurung sama dengan nol?\"", active: true },
  { id: "s2", label: "Eksplisit", description: "AI menjelaskan langkah demi langkah secara langsung dan terstruktur", example: "\"Langkah 1: Identifikasi nilai a, b, c. Langkah 2: Masukkan ke rumus D = b² − 4ac.\"", active: false },
  { id: "s3", label: "Analogi", description: "AI menggunakan perumpamaan kehidupan sehari-hari untuk menjelaskan konsep abstrak", example: "\"Bayangkan grafik bergerak seperti orang berjalan — tanda kurung menentukan ke mana ia melangkah.\"", active: false }
];

// ─── Past Paper Topics ─────────────────────────────────────────────────────────

export const pastPaperTopics = [
  { topic: "Fungsi Kuadrat", frequency2023: 4, frequency2024: 5, frequency2025: 6, trend: "naik" as const },
  { topic: "Persamaan Kuadrat", frequency2023: 6, frequency2024: 6, frequency2025: 5, trend: "stabil" as const },
  { topic: "Diskriminan", frequency2023: 2, frequency2024: 3, frequency2025: 4, trend: "naik" as const },
  { topic: "Rumus Vieta", frequency2023: 3, frequency2024: 2, frequency2025: 2, trend: "stabil" as const },
  { topic: "Transformasi Grafik", frequency2023: 1, frequency2024: 3, frequency2025: 4, trend: "naik" as const }
];

// ─── Analytics ─────────────────────────────────────────────────────────────────

export const teacherAnalyticsStats = [
  { label: "Asesmen selesai", value: "8", detail: "Semester ini", tone: "primary" as const },
  { label: "Rata-rata nilai kelas", value: "76", detail: "Naik 4 poin dari UTS sebelumnya", tone: "success" as const },
  { label: "Topik paling lemah", value: "Diskriminan", detail: "38% akurasi rata-rata", tone: "warning" as const },
  { label: "Soal AI disetujui", value: "142", detail: "87% dari total yang dibuat", tone: "neutral" as const }
];

export const scoreDistribution = [45, 62, 78, 82, 76, 88, 70];
export const scoreDistributionLabels = ["< 50", "50–59", "60–69", "70–79", "80–89", "90–100", "Avg"];

export const topicAccuracy = [
  { label: "Fungsi Kuadrat", value: 82 },
  { label: "Persamaan Kuadrat", value: 74 },
  { label: "Diskriminan", value: 38 },
  { label: "Rumus Vieta", value: 42 },
  { label: "Transformasi Grafik", value: 61 }
];

export const adminStats = [
  { label: "Asesmen aktif", value: "24", tone: "primary" },
  { label: "Guru terdaftar", value: "48", tone: "neutral" },
  { label: "Siswa aktif", value: "1.240", tone: "success" },
  { label: "Soal dalam bank", value: "3.820", tone: "warning" }
];

// ─── Student Progress ──────────────────────────────────────────────────────────

export const studentProgressStats = [
  { label: "Asesmen diikuti", value: "12", detail: "Semester ini", tone: "primary" as const },
  { label: "Rata-rata nilai", value: "79", detail: "Naik dari 74 bulan lalu", tone: "success" as const },
  { label: "Soal dikerjakan", value: "340", detail: "Latihan + asesmen", tone: "neutral" as const },
  { label: "Topik lemah aktif", value: "2", detail: "Perlu perhatian", tone: "warning" as const }
];

export const scoreTrend = [70, 74, 72, 78, 79, 82, 84];
export const scoreTrendLabels = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"];

export const subjectMastery = [
  { label: "Fungsi Kuadrat", value: 82, tone: "success" as const },
  { label: "Persamaan Kuadrat", value: 74, tone: "primary" as const },
  { label: "Diskriminan", value: 38, tone: "warning" as const },
  { label: "Rumus Vieta", value: 42, tone: "warning" as const },
  { label: "Transformasi Grafik", value: 61, tone: "primary" as const }
];

// ─── AI Tutor ──────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  sources?: string[];
  grounded?: boolean;
};

export const assistantGreeting: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content: "Halo Andi! Saya AI Companion kamu. Kamu bisa tanya apa saja tentang materi yang sudah gurumu upload. Saya hanya menjawab berdasarkan materi tersebut — dengan referensi halaman yang jelas.",
  grounded: true
};

export const NOT_COVERED_MESSAGE = "Topik ini tidak tercakup dalam materi yang disediakan oleh gurumu.";

export const suggestedPrompts = [
  "Jelaskan cara mencari diskriminan persamaan kuadrat",
  "Apa itu rumus Vieta dan kapan digunakan?",
  "Mengapa grafik y = (x − 3)² bergeser ke kanan?",
  "Apa ibu kota Prancis?"
];

const groundedReplies: { match: RegExp; content: string; sources: string[] }[] = [
  {
    match: /diskriminan|discriminant/i,
    content: "Dari Modul Matematika hal. 18: Diskriminan D = b² − 4ac. Jika D > 0, dua akar real berbeda. Jika D = 0, satu akar kembar. Jika D < 0, tidak ada akar real. Perhatikan tanda konstanta c saat menghitung −4ac.",
    sources: ["Modul Matematika – Fungsi Kuadrat, hal. 18"]
  },
  {
    match: /vieta|jumlah akar|hasil kali akar/i,
    content: "Dari Modul Matematika hal. 20: Untuk ax² + bx + c = 0 dengan akar x₁ dan x₂, berlaku: x₁ + x₂ = −b/a (jumlah akar) dan x₁ · x₂ = c/a (hasil kali akar). Perhatikan tanda negatif pada rumus jumlah akar.",
    sources: ["Modul Matematika – Fungsi Kuadrat, hal. 20"]
  },
  {
    match: /kanan|kiri|bergeser|shift|transformasi|grafik/i,
    content: "Dari Modul Matematika hal. 12: Untuk y = (x − a)², grafik bergeser a satuan ke kanan. Untuk y = (x + a)², bergeser a satuan ke kiri. Ingat: tanda minus dalam kurung → ke kanan, tanda plus → ke kiri.",
    sources: ["Modul Matematika – Fungsi Kuadrat, hal. 12"]
  }
];

export function getAssistantReply(prompt: string): { content: string; sources?: string[]; grounded: boolean } {
  const match = groundedReplies.find((reply) => reply.match.test(prompt));
  if (match) return { content: match.content, sources: match.sources, grounded: true };
  return { content: NOT_COVERED_MESSAGE, grounded: false };
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
};

export const studentNotifications: AppNotification[] = [
  { id: "sn1", title: "Asesmen baru tersedia", description: "Tes Diagnostik Fisika dijadwalkan 28 November. Mulai persiapan sekarang.", time: "5 menit lalu", read: false, tone: "primary" },
  { id: "sn2", title: "Topik lemah terdeteksi", description: "Akurasi kamu di Diskriminan hanya 38%. Latihan adaptif tersedia.", time: "2 jam lalu", read: false, tone: "warning" },
  { id: "sn3", title: "Hasil simulasi tersedia", description: "Kamu menyelesaikan Simulasi TKA dengan skor 72. Tinjau pembahasannya.", time: "Kemarin", read: true, tone: "neutral" },
  { id: "sn4", title: "Materi baru diunggah", description: "Gurumu menambahkan Soal Latihan Trigonometri.", time: "2 hari lalu", read: true, tone: "neutral" },
  { id: "sn5", title: "Pencapaian: Streak 7 hari", description: "Kamu sudah belajar 7 hari berturut-turut. Pertahankan!", time: "3 hari lalu", read: true, tone: "success" }
];

export const teacherNotifications: AppNotification[] = [
  { id: "tn1", title: "18 soal menunggu tinjauan", description: "AI menghasilkan soal baru dari Modul Fungsi Kuadrat.", time: "10 menit lalu", read: false, tone: "primary" },
  { id: "tn2", title: "Diskriminan: perlu perhatian", description: "58% siswa gagal di topik ini. Rekomendasi pengajaran telah dibuat.", time: "1 jam lalu", read: false, tone: "warning" },
  { id: "tn3", title: "UTS selesai dinilai", description: "Semua 32 lembar jawaban telah diproses. Rata-rata: 76.", time: "3 jam lalu", read: true, tone: "success" },
  { id: "tn4", title: "Materi berhasil diproses", description: "Modul Matematika – Fungsi Kuadrat siap digunakan AI.", time: "Kemarin", read: true, tone: "neutral" },
  { id: "tn5", title: "Asesmen dijadwalkan", description: "Tes Diagnostik Fisika dikonfirmasi untuk 28 November.", time: "2 hari lalu", read: true, tone: "neutral" }
];

export const parentNotifications: AppNotification[] = [
  { id: "pn1", title: "Hasil asesmen tersedia", description: "Andi mendapat nilai 87 di Kuis Fungsi Kuadrat. Di atas rata-rata kelas.", time: "1 jam lalu", read: false, tone: "success" },
  { id: "pn2", title: "Topik yang perlu perhatian", description: "Andi masih kesulitan di Diskriminan (38% akurasi). Guru menyarankan latihan tambahan.", time: "3 jam lalu", read: false, tone: "warning" },
  { id: "pn3", title: "Asesmen baru dijadwalkan", description: "Tes Diagnostik Fisika pada 28 November 2025.", time: "Kemarin", read: true, tone: "neutral" },
  { id: "pn4", title: "Streak belajar 7 hari", description: "Andi telah belajar konsisten selama 7 hari. Terus dukung semangat belajarnya!", time: "3 hari lalu", read: true, tone: "success" },
  { id: "pn5", title: "Laporan bulanan siap", description: "Laporan kemajuan Andi bulan November sudah tersedia.", time: "1 minggu lalu", read: true, tone: "neutral" }
];

export const adminNotifications: AppNotification[] = [
  { id: "an1", title: "1.240 siswa aktif bulan ini", description: "Naik 12% dari bulan Oktober.", time: "Hari ini", read: false, tone: "success" },
  { id: "an2", title: "Guru baru perlu verifikasi", description: "3 akun guru menunggu verifikasi admin.", time: "2 jam lalu", read: false, tone: "warning" },
  { id: "an3", title: "Bank soal mencapai 3.820", description: "Pertumbuhan 8% dari minggu lalu.", time: "Kemarin", read: true, tone: "neutral" }
];

// ─── Adaptive Practice Queue ───────────────────────────────────────────────────

export const adaptiveQueue = [
  { id: "aq1", question: "Hitung diskriminan dari x² − 6x + 9 = 0", optionA: "0", optionB: "27", optionC: "−9", optionD: "9", optionE: "−27", correctAnswer: "A" as const, topic: "Diskriminan", difficulty: "Mudah" as Difficulty, explanation: "D = (−6)² − 4(1)(9) = 36 − 36 = 0. Diskriminan nol berarti satu akar kembar." },
  { id: "aq2", question: "Jika x₁ + x₂ = 5 dan x₁ · x₂ = 6, tentukan persamaan kuadratnya", optionA: "x² − 5x + 6 = 0", optionB: "x² + 5x + 6 = 0", optionC: "x² − 5x − 6 = 0", optionD: "x² + 5x − 6 = 0", optionE: "x² − 6x + 5 = 0", correctAnswer: "A" as const, topic: "Rumus Vieta", difficulty: "Sedang" as Difficulty, explanation: "Gunakan bentuk x² − (x₁+x₂)x + x₁·x₂ = 0 → x² − 5x + 6 = 0." }
];

// ─── Class Rankings ────────────────────────────────────────────────────────────

export const classRankings = [
  { rank: 1, name: "XI IPA 1", avgScore: 83, students: 33, topTopic: "Fungsi Kuadrat" },
  { rank: 2, name: "XI IPA 2", avgScore: 76, students: 32, topTopic: "Persamaan Kuadrat" },
  { rank: 3, name: "XI IPS 1", avgScore: 71, students: 30, topTopic: "Statistika" },
  { rank: 4, name: "X IPA 1", avgScore: 69, students: 34, topTopic: "Hukum Newton" }
];
