export type UserRole = "admin" | "pengurus" | "developer" | "tutor" | "member" | "guest" | "peserta" | "umum";

// ============================================================
// WARGA RW - Model login khusus warga Kampung Sapen per RW
// ============================================================
export interface WargaRecord {
  id: string;
  namaPanggilan: string;
  rw: "RW 06" | "RW 07" | "RW 08";
  createdAt: string;
  lastLoginAt: string;
  isBlocked: boolean;
  totalGamesPlayed: number;
  highScore: number;
  avatarDataUrl?: string;
}

export interface LoginLogEntry {
  id: string;
  wargaId: string;
  namaPanggilan: string;
  rw: string;
  loginAt: string;
  ipHint?: string;
}

export interface RwCode {
  id: string;
  rw: "RW 06" | "RW 07" | "RW 08";
  codeHash: string;       // bcrypt hash dari kode asli
  codeDisplay: string;    // format tampilan, e.g. "QTU-OP3"
  isActive: boolean;
  updatedAt: string;
  forceLogoutAt?: string;
}

export interface TestimoniRecord {
  id: string;
  userId?: string;
  rating?: number;
  isi?: string;
  status?: "menunggu" | "terbit";
  avatarDataUrl?: string;
  nama: string;
  rw?: string;
  komentar: string;
  isApproved: boolean;
  createdAt: string;
}

export type AccessOrigin = "admin" | "tutor" | "guest" | "warga_kode" | "luar_langganan" | "luar_belum_aktif";

export interface SessionPayload {
  id: string;
  authUserId?: string;
  lastActivityAt?: number;
  name: string;
  email?: string;
  emailVerified?: boolean;
  role: UserRole;
  origin: AccessOrigin;
  codeUsed?: string;
  rtRw?: string;
  rw?: "RW 06" | "RW 07" | "RW 08";
  expiresAt?: string;
  watermarkText: string;
  avatarDataUrl?: string;
  guestRegistrationId?: string;
  guestSessionId?: string;
  guestClassHref?: string;
}

export interface SyllabusItem {
  day: string;
  topic: string;
}

export interface LearningOutcome {
  title: string;
  description: string;
}

export interface PreviewHighlight {
  badge: string;
  title: string;
  summary: string;
  samplePhrase?: string;
}

export interface SeedBookPage {
  pageNumber: number;
  kind: "cover" | "toc" | "lesson" | "dialogue" | "summary";
  heading: string;
  subheading: string;
  bullets: string[];
  exampleBox?: {
    en: string;
    id: string;
    note?: string;
  };
  tip?: string;
}

export interface KeyExpression {
  en: string;
  id: string;
  pronunciation?: string;
  note?: string;
}

export interface DialogueLine {
  speaker: string;
  en: string;
  id: string;
}

export interface PracticeExercise {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonDetail {
  id: string;
  lessonNumber: number;
  title: string;
  subtitle: string;
  intro: string;
  expressions: KeyExpression[];
  dialogue?: DialogueLine[];
  grammarTip?: { title: string; content: string; examples: string[] };
  practice: PracticeExercise[];
  summary: string;
}

export interface ModuleItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: "Pemula" | "Anak-Anak" | "Menengah" | "Lanjutan";
  durationLabel: string;
  scheduleLabel: string;
  targetAudience: string;
  quotaNote: string;
  summary: string;
  description: string;
  coverTheme: "emerald" | "amber" | "sky" | "rose" | "violet";
  totalPages: number;
  hasCustomUploadedPages?: boolean;
  syllabus: SyllabusItem[];
  learningOutcomes: LearningOutcome[];
  benefits: string[];
  previewHighlights: PreviewHighlight[];
  seedPages?: SeedBookPage[];
  lessons?: LessonDetail[];
  isPaidOnly?: boolean; // false / undefined = gratis untuk warga & umum preview; true = berbayar untuk luar Sapen
  priceIdr?: number; // Harga modul (ditentukan pengurus/developer)
  practiceEnabled?: boolean; // Apakah tugas / latihan mandiri diaktifkan oleh admin
  practiceQuestions?: PracticeExercise[]; // Soal & kunci jawaban latihan mandiri yang ditentukan admin
  isPublished: boolean;
  createdAt: string;
}

export interface ClassQuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

export interface ClassQuiz {
  id: string;
  moduleId?: string;
  kelasId: string;
  judul: string;
  soal: ClassQuizQuestion[];
  status: "terkunci" | "terbuka" | "selesai";
  dibukaPada?: string;
  ditutupPada?: string;
}

export interface ClassModule {
  id: string;
  kelasId: string;
  judulBebas: string;
  deskripsi: string;
  urutan: number;
  filePDF?: string;
  fileAsli?: string;
  fileAsliName?: string;
  fileType?: "pdf" | "ppt" | "pptx" | "other";
  status: "draft" | "terbit";
  quiz?: ClassQuiz | null;
}

export interface ClassItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  coverTheme: "emerald" | "amber" | "sky" | "rose" | "violet";
  priceIdr: number; // Harga kelas yang ditentukan pengurus/developer
  durationDays: number; // Durasi akses kelas dalam hari yang ditentukan pengurus/developer
  moduleIds: string[]; // Daftar ID modul yang termasuk dalam kelas (backward compat)
  modules?: ClassModule[]; // Struktur baru: modul per kelas
  gameTemplateIds: string[]; // Daftar template game interaktif yang dimasukkan ke kelas
  gameBlueprintIds?: string[];
  isPublished: boolean;
  createdAt: string;
  tingkat?: "Pemula" | "Menengah" | "Lanjutan";
  jadwal?: string;
  kodeAkses?: string;
  status?: "draft" | "berjalan" | "selesai";
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  userEmail: string;
  userName: string;
  startsAt: string;
  expiresAt?: string;
  status: "active" | "expired";
  paidAmountIdr: number;
  paymentMethod?: string;
  source?: "beli" | "gratis" | "admin" | "legacy";
  createdAt: string;
}

export interface AccessCode {
  id: string;
  code: string;
  label: string;
  rtRw: string;
  holderType: "keluarga" | "individu";
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  priceIdr: number;
  badge?: string;
  description: string;
  features: string[];
  isActive: boolean;
}

export interface ExternalUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatarDataUrl?: string;
}

export interface SubscriptionRecord {
  id: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  amountIdr: number;
  status: "pending" | "active" | "expired" | "failed";
  paymentMethod: string;
  orderId: string;
  snapToken?: string;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  moduleId: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  orderNum: number;
}

export interface FlashcardItem {
  id: string;
  moduleId: string;
  english: string;
  phonetic: string;
  indonesian: string;
  exampleEn: string;
  exampleId: string;
}

export interface MatchingPair {
  id: string;
  moduleId: string;
  english: string;
  indonesian: string;
}

export interface WordChallenge {
  id: string;
  moduleId: string;
  challengeType: "scramble" | "fill_blank";
  clueId: string;
  sentenceBlank?: string;
  answer: string;
  hint: string;
}

// ============================================================
// KELOLA GAME (DB-backed, editable) — 7 jenis game
// ============================================================
export type GameKind =
  | "kuis_live"        // 1) Kuis Live (Kahoot-style pilihan ganda)
  | "tebak_kata"       // 2) Tebak Kata
  | "pasangkan_kata"   // 3) Pasangkan Kata
  | "susun_kalimat"    // 4) Susun Kalimat
  | "tebak_gambar"     // 5) Tebak Gambar
  | "kata_hilang"      // 6) Kata Hilang (fill in the blank)
  | "duel_kata_cepat"; // 7) Duel Kata Cepat

export type GamePoints = "standard" | "double" | "none";
export type GameChoiceMode = "single" | "multiple";

export interface GameQuestionBase {
  id: string;
  prompt: string;          // pertanyaan / instruksi (max 120 di UI)
  timeLimitSec: number;    // 5/10/20/30/60
  points: GamePoints;      // standar/2x/tanpa poin
  choiceMode: GameChoiceMode; // tunggal/ganda (relevan kuis/tebak gambar/duel)
  explanation?: string;
}

export interface QuizLiveQuestion extends GameQuestionBase {
  type: "kuis_live";
  options: string[];            // 1-4 jawaban
  correctIndexes: number[];     // index benar (>=1, bisa ganda)
}

export interface TebakKataQuestion extends GameQuestionBase {
  type: "tebak_kata";
  hint?: string;
  answer: string;               // jawaban benar (teks)
  acceptAlternatives?: string[];
}

export interface PairItem { left: string; right: string; }
export interface PasangkanKataQuestion extends GameQuestionBase {
  type: "pasangkan_kata";
  pairs: PairItem[];            // pasangan kiri-kanan
}

export interface SusunKalimatQuestion extends GameQuestionBase {
  type: "susun_kalimat";
  words: string[];              // urutan kata benar
  sentence?: string;            // kalimat utuh (opsional, bisa diturunkan)
}

export interface TebakGambarQuestion extends GameQuestionBase {
  type: "tebak_gambar";
  options?: string[];           // opsional pilihan
  answer: string;               // jawaban benar
  acceptAlternatives?: string[];
}

export interface KataHilangQuestion extends GameQuestionBase {
  type: "kata_hilang";
  sentence: string;             // kalimat dengan blank, mis. "I ___ to school"
  answer: string;               // kata jawaban
  options?: string[];           // opsional bank/pilihan
  acceptAlternatives?: string[];
}

export interface DuelKataCepatQuestion extends GameQuestionBase {
  type: "duel_kata_cepat";
  hint?: string;
  answer: string;               // jawaban cepat
  acceptAlternatives?: string[];
}

export type GameQuestion =
  | QuizLiveQuestion
  | TebakKataQuestion
  | PasangkanKataQuestion
  | SusunKalimatQuestion
  | TebakGambarQuestion
  | KataHilangQuestion
  | DuelKataCepatQuestion;

export interface GameRecord {
  id: string;
  title: string;
  kind: GameKind;
  description?: string;
  questions: GameQuestion[];
  createdAt: string;
  updatedAt: string;
  migratedFromTemplateId?: string; // jejak migrasi template lama
}

export interface LeaderboardEntry {
  id: string;
  participantKey: string;
  participantName: string;
  originBadge: string;
  moduleId: string;
  moduleTitle: string;
  gameType: "Quiz Pilihan Ganda" | "Matching Kata" | "Susun Kata & Rumpang";
  score: number;
  weekLabel: string;
  createdAt: string;
}

export interface GameScoreHistoryEntry {
  id: string;
  participantId: string;
  gameId: string;
  gameTitle: string;
  gameType: string;
  score: number;
  createdAt: string;
}

export interface DatabaseSchema {
  modules: ModuleItem[];
  accessCodes: AccessCode[];
  plans: SubscriptionPlan[];
  externalUsers: ExternalUser[];
  subscriptions: SubscriptionRecord[];
  quizzes: QuizQuestion[];
  flashcards: FlashcardItem[];
  matchingPairs: MatchingPair[];
  wordChallenges: WordChallenge[];
  leaderboard: LeaderboardEntry[];
  gameScoreHistory?: GameScoreHistoryEntry[];
  // â”€â”€ Baru: warga RW, log login, kode RW, testimoni â”€â”€
  warga: WargaRecord[];
  loginLog: LoginLogEntry[];
  rwCodes: RwCode[];
  testimoni: TestimoniRecord[];
  // â”€â”€ Kelas & Pendaftaran Peserta Mandiri â”€â”€
  classes?: ClassItem[];
  enrollments?: ClassEnrollment[];
  // â”€â”€ Kelola Game (DB-backed, editable) â”€â”€
  games?: GameRecord[];
  gameBlueprints?: import("./game-blueprint").GameBlueprint[];
  classSessions?: import("./class-session").StoredClassSession[];
  classSessionGuests?: import("./class-session").StoredClassSessionGuest[];
  classSessionAttendance?: import("./class-session").ClassSessionAttendance[];
  classSessionGames?: { sessionId: string; gameId: string; livePin?: string | null; liveStatus?: string | null }[];
}
