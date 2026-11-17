import {
  ModuleItem,
  AccessCode,
  SubscriptionRecord,
  SubscriptionPlan,
  QuizQuestion,
  FlashcardItem,
  MatchingPair,
  WordChallenge,
  LeaderboardEntry,
  WargaRecord,
  LoginLogEntry,
  ClassItem,
  ClassEnrollment,
  TestimoniRecord,
  DatabaseSchema,
} from "./types";

export const mockModules: ModuleItem[] = [
  {
    id: "mod-vocab-wisata",
    slug: "vocab-wisata",
    title: "Kosakata Wisata Sapen",
    subtitle: "100 Ungkapan Praktis Menyambut Wisatawan Mancanegara",
    category: "Percakapan",
    level: "Pemula",
    durationLabel: "Selama 1 Bulan",
    scheduleLabel: "Fleksibel",
    targetAudience: "Pelajar SMP/SMA, Warga Sapen & Umum",
    quotaNote: "Gratis dengan Kode Warga Sapen",
    summary: "Belajar kosakata dan ungkapan dasar untuk berinteraksi dengan wisatawan asing di Kampung Sapen.",
    description: "Modul ini berisi 100 ungkapan praktis yang disusun berdasarkan situasi nyata di lingkungan pariwisata Kampung Sapen.",
    coverTheme: "emerald",
    totalPages: 24,
    hasCustomUploadedPages: false,
    syllabus: [
      { day: "Hari 1", topic: "Sapaan & Perkenalan Diri" },
      { day: "Hari 2", topic: "Menjawab Pertanyaan Wisatawan" },
      { day: "Hari 3", topic: "Memberikan Arah & Petunjuk" },
      { day: "Hari 4", topic: "Menjelaskan Budaya & Kuliner" },
      { day: "Hari 5", topic: "Penutup Ramah & Undul Kembali" },
    ],
    learningOutcomes: [
      { title: "Menguasai 100 kosakata kunci", description: "Kata-kata esensial untuk pariwisata" },
      { title: "Lancar menyapa tamu asing", description: "Percakapan pembuka yang natural" },
      { title: "Memberikan arah dengan jelas", description: "Preposisi lokasi & landmark" },
    ],
    benefits: [
      "Akses Flipbook 3D interaktif",
      "Audio pelafalan native speaker",
      "Kuis live mingguan dengan hadiah",
      "Sertifikat kelulusan digital",
    ],
    previewHighlights: [
      { badge: "GRATIS", title: "Untuk Warga Sapen", summary: "Kode akses RW 06/07/08" },
      { badge: "POPULER", title: "Modul Terfavorit", summary: "1.200+ pembaca bulanan" },
    ],
    seedPages: [],
    isPublished: true,
    createdAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "mod-telling-time",
    slug: "telling-time",
    title: "Membaca Jam & Waktu",
    subtitle: "Interaktif: Jam Analog, Digital & Ungkapan Waktu",
    category: "Dasar-Dasar",
    level: "Anak-Anak",
    durationLabel: "2 Minggu",
    scheduleLabel: "Setiap Hari 15 Menit",
    targetAudience: "Anak SD & Pemula",
    quotaNote: "Gratis untuk Semua",
    summary: "Belajar membaca jam dinding analog, jam digital, dan ungkapan waktu dalam Bahasa Inggris dengan game interaktif.",
    description: "Modul visual dengan animasi jam bergerak, latihan drag-and-drop, dan kuis cepat.",
    coverTheme: "sky",
    totalPages: 18,
    hasCustomUploadedPages: false,
    syllabus: [
      { day: "Hari 1", topic: "Bagian-bagian Jam Analog" },
      { day: "Hari 2", topic: "Membaca Jam Tepat (O'Clock)" },
      { day: "Hari 3", topic: "Membaca Jam Setengah & Seperempat" },
      { day: "Hari 4", topic: "Menit & Presisi Waktu" },
      { day: "Hari 5", topic: "Ungkapan Waktu Sehari-hari" },
    ],
    learningOutcomes: [
      { title: "Bisa baca jam analog & digital", description: "Tanpa bantuan orang tua" },
      { title: "Menguasai ungkapan waktu", description: "Past, to, quarter, half" },
    ],
    benefits: [
      "Game Telling Time interaktif",
      "Suara tik-tok jam real-time",
      "Badge pemenang mingguan",
    ],
    previewHighlights: [
      { badge: "GAME", title: "Termasuk Game Interaktif", summary: "TellingTimeGame built-in" },
    ],
    seedPages: [],
    isPublished: true,
    createdAt: "2026-02-20T08:00:00.000Z",
  },
  {
    id: "mod-grammar-tenses",
    slug: "grammar-tenses",
    title: "Tata Bahasa: 12 Tenses",
    subtitle: "Panduan Lengkap & Latihan Soal Pilihan Ganda",
    category: "Grammar",
    level: "Menengah",
    durationLabel: "6 Minggu",
    scheduleLabel: "2x Seminggu",
    targetAudience: "Pelajar SMA & Mahasiswa",
    quotaNote: "Rp 49.000 / Bulan",
    summary: "Pelajari semua 12 tenses Bahasa Inggris dengan rumus, contoh kalimat, dan 150+ soal latihan.",
    description: "Modul komprehensif untuk menguasai tenses dari Present Simple hingga Future Perfect Continuous.",
    coverTheme: "amber",
    totalPages: 42,
    hasCustomUploadedPages: true,
    syllabus: [
      { day: "Hari 1", topic: "Present Tenses (4 bentuk)" },
      { day: "Hari 2", topic: "Past Tenses (4 bentuk)" },
      { day: "Hari 3", topic: "Future Tenses (4 bentuk)" },
      { day: "Hari 4", topic: "Perbandingan & Kesalahan Umum" },
      { day: "Hari 5", topic: "Latihan Campuran & Kuis Akhir" },
    ],
    learningOutcomes: [
      { title: "Menguasai rumus 12 tenses", description: "S+V1, S+V2, will/shall, dll" },
      { title: "Membedakan fungsi waktu", description: "Kapan pakai mana" },
    ],
    benefits: [
      "Flipbook 3D halaman penuh",
      "150+ soal dengan pembahasan",
      "Akses 6 minggu penuh",
    ],
    previewHighlights: [
      { badge: "BAYAR", title: "Modul Premium", summary: "Butuh langganan aktif" },
    ],
    seedPages: [],
    isPublished: true,
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "mod-story-quest",
    slug: "story-quest",
    title: "Story Quest: Petualangan Budi",
    subtitle: "Baca Cerita, Jawab Pertanyaan, Kumpulkan Badge",
    category: "Membaca",
    level: "Pemula",
    durationLabel: "1 Minggu",
    scheduleLabel: "Harian 20 Menit",
    targetAudience: "Anak SD Kelas 4-6",
    quotaNote: "Gratis dengan Kode Warga Sapen",
    summary: "Cerita interaktif mengikuti petualangan Budi di Kampung Sapen. Setiap bab punya kuis pemahaman bacaan.",
    description: "Format choose-your-own-adventure ringan dengan skor dan leaderboard.",
    coverTheme: "violet",
    totalPages: 15,
    hasCustomUploadedPages: false,
    syllabus: [
      { day: "Hari 1", topic: "Bab 1: Budi & Burung Misterius" },
      { day: "Hari 2", topic: "Bab 2: Pintu Gaib di Tembok" },
      { day: "Hari 3", topic: "Bab 3: Kunci Emas di Kolam" },
      { day: "Hari 4", topic: "Bab 4: Teman Baru dari Luar Negeri" },
      { day: "Hari 5", topic: "Bab 5: Festival Bahasa Sapen" },
    ],
    learningOutcomes: [
      { title: "Meningkatkan reading comprehension", description: "5 cerita bertingkat" },
      { title: "Mengenal budaya lokal lewat bahasa Inggris", description: "Konteks Kampung Sapen" },
    ],
    benefits: [
      "Narasi bergambar penuh warna",
      "Kuis tiap bab (auto-graded)",
      "Badge koleksi karakter",
    ],
    previewHighlights: [
      { badge: "CERITA", title: "Format Novel Interaktif", summary: "Baca sambil main" },
    ],
    seedPages: [],
    isPublished: true,
    createdAt: "2026-04-05T08:00:00.000Z",
  },
];

export const mockAccessCodes: AccessCode[] = [];

export const mockWarga: WargaRecord[] = [];
export const mockLoginLog: LoginLogEntry[] = [];

export const mockExternalUsers = [];

export const mockPlans: SubscriptionPlan[] = [
  { id: "bulanan", name: "Paket Bulanan", durationDays: 30, priceIdr: 49000, badge: "Populer", description: "Akses penuh 30 hari ke semua modul premium", features: ["Semua modul premium", "Kuis live unlimited", "Sertifikat digital"], isActive: true },
  { id: "triwulan", name: "Paket 3 Bulan", durationDays: 90, priceIdr: 129000, badge: "Hemat 12%", description: "Akses 90 hari dengan diskon", features: ["Semua modul premium", "Kuis live unlimited", "Sertifikat digital", "Prioritas support"], isActive: true },
  { id: "tahunan", name: "Paket Tahunan", durationDays: 365, priceIdr: 450000, badge: "Best Value", description: "Akses 1 tahun penuh, paling hemat", features: ["Semua modul premium", "Kuis live unlimited", "Sertifikat digital", "Prioritas support", "Kelas eksklusif bulanan"], isActive: true },
];

export const mockSubscriptions: SubscriptionRecord[] = [
  { id: "sub-rina-bulanan", userEmail: "rina.anggraini@gmail.com", userName: "Rina Anggraini", planId: "bulanan", planName: "Paket Bulanan", amountIdr: 49000, status: "active", paymentMethod: "QRIS", orderId: "ORD-20260215-RINA", snapToken: "snap-token-1", startsAt: "2026-02-15T10:00:00.000Z", expiresAt: "2026-03-17T10:00:00.000Z", createdAt: "2026-02-15T10:00:00.000Z" },
  { id: "sub-budi-triwulan", userEmail: "budi.santoso@yahoo.com", userName: "Budi Santoso", planId: "triwulan", planName: "Paket 3 Bulan", amountIdr: 129000, status: "active", paymentMethod: "Transfer Bank", orderId: "ORD-20260310-BUDI", snapToken: "snap-token-2", startsAt: "2026-03-10T14:00:00.000Z", expiresAt: "2026-06-08T14:00:00.000Z", createdAt: "2026-03-10T14:00:00.000Z" },
  { id: "sub-maya-tahunan", userEmail: "maya.sari@outlook.com", userName: "Maya Sari", planId: "tahunan", planName: "Paket Tahunan", amountIdr: 450000, status: "active", paymentMethod: "QRIS", orderId: "ORD-20260405-MAYA", snapToken: "snap-token-3", startsAt: "2026-04-05T09:00:00.000Z", expiresAt: "2027-04-05T09:00:00.000Z", createdAt: "2026-04-05T09:00:00.000Z" },
  { id: "sub-andi-expired", userEmail: "andi.pratama@gmail.com", userName: "Andi Pratama", planId: "bulanan", planName: "Paket Bulanan", amountIdr: 49000, status: "expired", paymentMethod: "QRIS", orderId: "ORD-20260520-ANDI", snapToken: "snap-token-4", startsAt: "2026-05-20T11:00:00.000Z", expiresAt: "2026-06-19T11:00:00.000Z", createdAt: "2026-05-20T11:00:00.000Z" },
  { id: "sub-siti-pending", userEmail: "siti.nurhaliza@student.univ.ac.id", userName: "Siti Nurhaliza", planId: "bulanan", planName: "Paket Bulanan", amountIdr: 49000, status: "pending", paymentMethod: "QRIS", orderId: "ORD-20260612-SITI", snapToken: "snap-token-5", startsAt: "2026-06-12T16:00:00.000Z", expiresAt: "2026-07-12T16:00:00.000Z", createdAt: "2026-06-12T16:00:00.000Z" },
];

export const mockClasses: ClassItem[] = [
  {
    id: "class-conversation-starter",
    slug: "conversation-starter",
    title: "Kelas Percakapan & Kosakata Praktis",
    subtitle: "Kombinasi materi berbicara, menyapa turis, dan game interaktif",
    description: "Program kelas terpadu untuk melatih rasa percaya diri berbicara bahasa Inggris. Berisi modul interaktif lengkap dengan audio dan kuis live.",
    coverTheme: "emerald",
    priceIdr: 49000,
    durationDays: 30,
    moduleIds: ["mod-vocab-wisata", "mod-telling-time"],
    gameTemplateIds: ["telling-time", "word-match"],
    isPublished: true,
    createdAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "class-grammar-mastery",
    slug: "grammar-mastery",
    title: "Kelas Tata Bahasa & Struktur Kalimat",
    subtitle: "Pondasi tenses, penyusunan kalimat, dan latihan mandiri",
    description: "Kelas komprehensif mengupas tuntas tata bahasa Inggris dari dasar dengan penjelasan santai, latihan mandiri berbobot, dan tantangan kata.",
    coverTheme: "amber",
    priceIdr: 65000,
    durationDays: 60,
    moduleIds: ["mod-grammar-tenses"],
    gameTemplateIds: ["word-builder", "quick-quiz"],
    isPublished: true,
    createdAt: "2026-02-01T08:00:00.000Z",
  },
  {
    id: "class-story-adventure",
    slug: "story-adventure",
    title: "Kelas Membaca & Story Quest",
    subtitle: "Cerita interaktif, pemahaman bacaan, dan kreativitas",
    description: "Ikuti petualangan Budi sambil belajar membaca dan memahami teks Bahasa Inggris dengan cara yang menyenangkan.",
    coverTheme: "violet",
    priceIdr: 39000,
    durationDays: 21,
    moduleIds: ["mod-story-quest"],
    gameTemplateIds: ["story-quest"],
    isPublished: true,
    createdAt: "2026-04-10T08:00:00.000Z",
  },
];

export const mockEnrollments: ClassEnrollment[] = [
  { id: "enr-rina-conv", classId: "class-conversation-starter", userEmail: "rina.anggraini@gmail.com", userName: "Rina Anggraini", startsAt: "2026-02-15T10:00:00.000Z", expiresAt: "2026-03-17T10:00:00.000Z", status: "active", paidAmountIdr: 49000, paymentMethod: "QRIS", createdAt: "2026-02-15T10:00:00.000Z" },
  { id: "enr-budi-grammar", classId: "class-grammar-mastery", userEmail: "budi.santoso@yahoo.com", userName: "Budi Santoso", startsAt: "2026-03-10T14:00:00.000Z", expiresAt: "2026-05-09T14:00:00.000Z", status: "active", paidAmountIdr: 65000, paymentMethod: "Transfer Bank", createdAt: "2026-03-10T14:00:00.000Z" },
  { id: "enr-maya-story", classId: "class-story-adventure", userEmail: "maya.sari@outlook.com", userName: "Maya Sari", startsAt: "2026-04-05T09:00:00.000Z", expiresAt: "2026-04-26T09:00:00.000Z", status: "active", paidAmountIdr: 39000, paymentMethod: "QRIS", createdAt: "2026-04-05T09:00:00.000Z" },
  { id: "enr-andi-conv", classId: "class-conversation-starter", userEmail: "andi.pratama@gmail.com", userName: "Andi Pratama", startsAt: "2026-05-20T11:00:00.000Z", expiresAt: "2026-06-19T11:00:00.000Z", status: "expired", paidAmountIdr: 49000, paymentMethod: "QRIS", createdAt: "2026-05-20T11:00:00.000Z" },
  { id: "enr-siti-grammar", classId: "class-grammar-mastery", userEmail: "siti.nurhaliza@student.univ.ac.id", userName: "Siti Nurhaliza", startsAt: "2026-06-12T16:00:00.000Z", expiresAt: "2026-08-11T16:00:00.000Z", status: "active", paidAmountIdr: 65000, paymentMethod: "QRIS", createdAt: "2026-06-12T16:00:00.000Z" },
];

export const mockQuizzes: QuizQuestion[] = [
  { id: "q-1", moduleId: "mod-vocab-wisata", question: "How do you greet a tourist in the morning?", options: ["Good night", "Good morning", "Good afternoon", "Good evening"], correctIndex: 1, explanation: "Good morning adalah sapaan standar di pagi hari (sebelum jam 12 siang).", orderNum: 1 },
  { id: "q-2", moduleId: "mod-vocab-wisata", question: "What does 'Terima kasih' mean in English?", options: ["Please", "Sorry", "Thank you", "Excuse me"], correctIndex: 2, explanation: "Thank you adalah terjemahan langsung dari 'Terima kasih'.", orderNum: 2 },
  { id: "q-3", moduleId: "mod-vocab-wisata", question: "Which phrase asks for directions?", options: ["Where is the bathroom?", "I am hungry", "My name is Budi", "The weather is nice"], correctIndex: 0, explanation: "Where is... digunakan untuk menanyakan lokasi/tempat.", orderNum: 3 },
  { id: "q-4", moduleId: "mod-telling-time", question: "What time is it when the short hand points at 3 and long hand at 12?", options: ["3:00", "12:15", "3:30", "12:00"], correctIndex: 0, explanation: "Tangan pendek di 3, tangan panjang di 12 = 3:00 (three o'clock).", orderNum: 1 },
  { id: "q-5", moduleId: "mod-telling-time", question: "How do you say 15:45 in English?", options: ["Quarter to four", "Quarter past three", "Half past three", "Four fifteen"], correctIndex: 0, explanation: "15:45 = 45 menit lewat 3 = quarter to four (15 menit menuju 4).", orderNum: 2 },
  { id: "q-6", moduleId: "mod-grammar-tenses", question: "She ____ to school every day. (go)", options: ["go", "goes", "going", "went"], correctIndex: 1, explanation: "Subjek 'She' (dia - orang ke-3 tunggal) + present simple = goes.", orderNum: 1 },
  { id: "q-7", moduleId: "mod-grammar-tenses", question: "They ____ playing football yesterday. (be)", options: ["was", "were", "are", "is"], correctIndex: 1, explanation: "Subjek 'They' (mereka - jamak) + past simple = were.", orderNum: 2 },
  { id: "q-8", moduleId: "mod-story-quest", question: "What did Budi find behind the mysterious door?", options: ["A golden key", "A map", "A treasure chest", "A strange bird"], correctIndex: 0, explanation: "Pada Bab 2, Budi menemukan kunci emas di belakang pintu gaib.", orderNum: 1 },
];

export const mockFlashcards: FlashcardItem[] = [
  { id: "fc-1", moduleId: "mod-vocab-wisata", english: "Welcome", phonetic: "WEL-kum", indonesian: "Selamat datang", exampleEn: "Welcome to Kampung Sapen!", exampleId: "Selamat datang di Kampung Sapen!" },
  { id: "fc-2", moduleId: "mod-vocab-wisata", english: "Tourist", phonetic: "TUR-ist", indonesian: "Wisatawan", exampleEn: "The tourist asked for directions.", exampleId: "Wisatawan itu meminta petunjuk arah." },
  { id: "fc-3", moduleId: "mod-vocab-wisata", english: "Direction", phonetic: "di-REK-shen", indonesian: "Arah / Petunjuk", exampleEn: "Can you give me directions?", exampleId: "Bisakah kamu memberi saya petunjuk arah?" },
  { id: "fc-4", moduleId: "mod-telling-time", english: "Clock", phonetic: "KLOK", indonesian: "Jam dinding", exampleEn: "Look at the clock on the wall.", exampleId: "Lihat jam dinding di tembok itu." },
  { id: "fc-5", moduleId: "mod-telling-time", english: "Hour", phonetic: "AW-er", indonesian: "Jam (satuan waktu)", exampleEn: "The class lasts for one hour.", exampleId: "Kelas itu berlangsung selama satu jam." },
  { id: "fc-6", moduleId: "mod-grammar-tenses", english: "Tense", phonetic: "TENS", indonesian: "Kala / Tenses", exampleEn: "English has 12 tenses.", exampleId: "Bahasa Inggris memiliki 12 tenses." },
];

export const mockMatchingPairs: MatchingPair[] = [
  { id: "mp-1", moduleId: "mod-vocab-wisata", english: "Good morning", indonesian: "Selamat pagi" },
  { id: "mp-2", moduleId: "mod-vocab-wisata", english: "Thank you", indonesian: "Terima kasih" },
  { id: "mp-3", moduleId: "mod-vocab-wisata", english: "Excuse me", indonesian: "Permisi" },
  { id: "mp-4", moduleId: "mod-vocab-wisata", english: "How are you?", indonesian: "Apa kabar?" },
  { id: "mp-5", moduleId: "mod-telling-time", english: "Three o'clock", indonesian: "Jam 3 tepat" },
  { id: "mp-6", moduleId: "mod-telling-time", english: "Half past four", indonesian: "Jam 4.30" },
  { id: "mp-7", moduleId: "mod-telling-time", english: "Quarter to five", indonesian: "Jam 4.45" },
];

export const mockWordChallenges: WordChallenge[] = [
  { id: "wc-1", moduleId: "mod-vocab-wisata", challengeType: "scramble", clueId: "Greeting word", sentenceBlank: undefined, answer: "WELCOME", hint: "Starts with W, 7 letters" },
  { id: "wc-2", moduleId: "mod-vocab-wisata", challengeType: "scramble", clueId: "Tourist", sentenceBlank: undefined, answer: "TOURIST", hint: "Starts with T, 7 letters" },
  { id: "wc-3", moduleId: "mod-telling-time", challengeType: "fill_blank", clueId: "Time expression", sentenceBlank: "It is ____ past three.", answer: "HALF", hint: "30 minutes = half" },
  { id: "wc-4", moduleId: "mod-grammar-tenses", challengeType: "scramble", clueId: "Past tense of go", sentenceBlank: undefined, answer: "WENT", hint: "Irregular verb, 4 letters" },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: "lb-1", participantKey: "warga-joko", participantName: "Joko", originBadge: "Warga RW 07", moduleId: "mod-vocab-wisata", moduleTitle: "Kosakata Wisata Sapen", gameType: "Quiz Pilihan Ganda", score: 3580, weekLabel: "2026-W45", createdAt: "2026-11-08T10:00:00.000Z" },
  { id: "lb-2", participantKey: "warga-sari", participantName: "Sari", originBadge: "Warga RW 06", moduleId: "mod-vocab-wisata", moduleTitle: "Kosakata Wisata Sapen", gameType: "Quiz Pilihan Ganda", score: 3200, weekLabel: "2026-W45", createdAt: "2026-11-08T14:00:00.000Z" },
  { id: "lb-3", participantKey: "warga-hendra", participantName: "Hendra", originBadge: "Warga RW 06", moduleId: "mod-telling-time", moduleTitle: "Membaca Jam & Waktu", gameType: "Quiz Pilihan Ganda", score: 2850, weekLabel: "2026-W45", createdAt: "2026-11-07T16:00:00.000Z" },
  { id: "lb-4", participantKey: "warga-rina", participantName: "Rina", originBadge: "Warga RW 07", moduleId: "mod-story-quest", moduleTitle: "Story Quest: Petualangan Budi", gameType: "Quiz Pilihan Ganda", score: 2750, weekLabel: "2026-W45", createdAt: "2026-11-09T08:00:00.000Z" },
  { id: "lb-5", participantKey: "warga-maya", participantName: "Maya", originBadge: "Warga RW 06", moduleId: "mod-vocab-wisata", moduleTitle: "Kosakata Wisata Sapen", gameType: "Matching Kata", score: 2450, weekLabel: "2026-W45", createdAt: "2026-11-09T07:00:00.000Z" },
  { id: "lb-6", participantKey: "warga-andi", participantName: "Andi", originBadge: "Warga RW 06", moduleId: "mod-grammar-tenses", moduleTitle: "Tata Bahasa: 12 Tenses", gameType: "Quiz Pilihan Ganda", score: 2010, weekLabel: "2026-W45", createdAt: "2026-11-07T19:00:00.000Z" },
  { id: "lb-7", participantKey: "warga-budi", participantName: "Budi", originBadge: "Warga RW 06", moduleId: "mod-telling-time", moduleTitle: "Membaca Jam & Waktu", gameType: "Susun Kata & Rumpang", score: 1890, weekLabel: "2026-W45", createdAt: "2026-11-08T18:00:00.000Z" },
  { id: "lb-8", participantKey: "ext-rina", participantName: "Rina Anggraini", originBadge: "Peserta Umum", moduleId: "mod-grammar-tenses", moduleTitle: "Tata Bahasa: 12 Tenses", gameType: "Quiz Pilihan Ganda", score: 3100, weekLabel: "2026-W45", createdAt: "2026-11-08T11:00:00.000Z" },
  { id: "lb-9", participantKey: "ext-budi", participantName: "Budi Santoso", originBadge: "Peserta Umum", moduleId: "mod-vocab-wisata", moduleTitle: "Kosakata Wisata Sapen", gameType: "Matching Kata", score: 2600, weekLabel: "2026-W45", createdAt: "2026-11-08T15:00:00.000Z" },
];

export const mockTestimoni: TestimoniRecord[] = [
  { id: "testi-1", nama: "Hendra (RW 06)", rw: "RW 06", komentar: "Anak-anak jadi semangat belajar Inggris lewat game di HP. Flipbook-nya keren banget, kayak baca buku asli!", isApproved: true, createdAt: "2026-10-15T19:00:00.000Z" },
  { id: "testi-2", nama: "Sari (RW 06)", rw: "RW 06", komentar: "Gratis buat warga Sapen, cuma masukkin kode. Materinya lengkap, ada audio pula buat latihan ngomong.", isApproved: true, createdAt: "2026-10-20T08:30:00.000Z" },
  { id: "testi-3", nama: "Joko (Ketua RW 07)", rw: "RW 07", komentar: "Kuis live-nya seru buat acara RT. Warga main bareng sambil belajar. Recommended!", isApproved: true, createdAt: "2026-10-25T10:00:00.000Z" },
  { id: "testi-4", nama: "Rina Anggraini (Peserta Umum)", rw: "Luar Sapen", komentar: "Bayar terjangkau, akses langsung ke semua modul. Cocok buat belajar mandiri di rumah.", isApproved: true, createdAt: "2026-11-01T14:00:00.000Z" },
  { id: "testi-5", nama: "Budi (RW 06)", rw: "RW 06", komentar: "Minta dikasih modul TOEFL dong pak, biar anak siap kuliah nanti.", isApproved: false, createdAt: "2026-11-05T16:00:00.000Z" },
];

export const mockRwCodes = [
  { id: "rw-06-1", rw: "RW 06" as const, codeDisplay: "QTU-OP3", isActive: true, updatedAt: "2026-11-01T08:00:00.000Z", forceLogoutAt: undefined },
  { id: "rw-07-1", rw: "RW 07" as const, codeDisplay: "XJ4-KL9", isActive: true, updatedAt: "2026-11-01T08:00:00.000Z", forceLogoutAt: undefined },
  { id: "rw-08-1", rw: "RW 08" as const, codeDisplay: "PLM-7W1", isActive: false, updatedAt: "2026-11-01T08:00:00.000Z", forceLogoutAt: undefined },
];

export const mockStats = {
  totalModules: mockModules.length,
  totalCodes: mockAccessCodes.filter(c => c.isActive).length,
  activeSubscribers: mockSubscriptions.filter(s => s.status === "active").length,
  totalRevenueIdr: mockSubscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + s.amountIdr, 0),
  totalQuizQuestions: mockQuizzes.length,
  totalFlashcards: mockFlashcards.length,
  totalWarga: mockWarga.filter(w => !w.isBlocked).length,
  wargaRw06: mockWarga.filter(w => w.rw === "RW 06" && !w.isBlocked).length,
  wargaRw07: mockWarga.filter(w => w.rw === "RW 07" && !w.isBlocked).length,
  wargaRw08: mockWarga.filter(w => w.rw === "RW 08" && !w.isBlocked).length,
  activeToday: mockLoginLog.filter(l => new Date(l.loginAt).toDateString() === new Date().toDateString()).length,
  activeThisWeek: mockLoginLog.length,
  mostPlayedGame: "Kosakata Wisata Sapen",
  totalTestimoni: mockTestimoni.length,
  pendingTestimoni: mockTestimoni.filter(t => !t.isApproved).length,
};

export const mockDiagnostics = {
  supabaseConfigured: false,
  supabaseUrl: "Mode Lokal .data/db.json Aktif (Mock Data)",
  midtransConfigured: false,
  midtransEnvironment: "Sandbox / Simulator",
  privateStorageMode: "Server Private Folder (.data/private-pages) + Signed HMAC URL",
};

export const mockDbSchema: DatabaseSchema = {
  modules: mockModules,
  accessCodes: mockAccessCodes,
  plans: mockPlans,
  externalUsers: mockExternalUsers,
  subscriptions: mockSubscriptions,
  quizzes: mockQuizzes,
  flashcards: mockFlashcards,
  matchingPairs: mockMatchingPairs,
  wordChallenges: mockWordChallenges,
  leaderboard: mockLeaderboard,
  warga: mockWarga,
  loginLog: mockLoginLog,
  rwCodes: [],
  testimoni: mockTestimoni,
  classes: mockClasses,
  enrollments: mockEnrollments,
};
