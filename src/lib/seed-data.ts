import { DatabaseSchema } from "./types";
import { createRwCodeRecord } from "./rw-auth";

export function getCurrentWeekLabel(date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function createInitialSeedData(): DatabaseSchema {
  const week = getCurrentWeekLabel();

  return {
    plans: [
      {
        id: "plan-1-bulan",
        name: "Paket Belajar 1 Bulan",
        durationDays: 30,
        priceIdr: 49000,
        badge: "Populer untuk Pemula",
        description:
          "Akses penuh ke seluruh modul flipbook Kampung Inggris Sapen, latihan quiz, flashcard suara, dan game kosakata selama 30 hari.",
        features: [
          "Buka semua modul Flipbook Bahasa Inggris (Dasar s/d TOEFL)",
          "Akses penuh Quiz Pilihan Ganda + Pembahasan Lengkap",
          "Mainkan Flashcard Suara, Matching Kata & Susun Kalimat",
          "Ikut berkompetisi di Leaderboard Mingguan",
          "Aktivasi otomatis via QRIS / Virtual Account Bank",
        ],
        isActive: true,
      },
      {
        id: "plan-3-bulan",
        name: "Paket Hemat 3 Bulan",
        durationDays: 90,
        priceIdr: 119000,
        badge: "Hemat Rp 28.000",
        description:
          "Belajar lebih tenang dan konsisten selama 90 hari penuh dengan akses tanpa batas ke seluruh modul dan pembaruan materi terbaru.",
        features: [
          "Semua fasilitas Paket 1 Bulan selama 90 hari penuh",
          "Otomatis mendapat modul baru yang diunggah pengurus",
          "Bebas ulangi seluruh Quiz & Game tanpa batas",
          "Lebih hemat untuk belajar mandiri dari nol sampai lancar",
          "Aktivasi instan 24 jam via QRIS & Transfer Bank",
        ],
        isActive: true,
      },
    ],

    modules: [
      {
        id: "mod-grammar-basic",
        slug: "grammar-basic",
        title: "Kelas Grammar Basic",
        subtitle: "Langkah Jitu Menyusun Kalimat Bahasa Inggris dari Nol",
        category: "Basic Foundation",
        level: "Pemula",
        durationLabel: "Selama 1 Bulan (20 Materi Inti)",
        scheduleLabel: "Jam belajar fleksibel (Mandiri 24 Jam)",
        targetAudience: "Pemula dari NOL (Pelajar SMP/SMA, Mahasiswa, Bapak/Ibu Warga & Umum)",
        quotaNote: "Gratis dengan Kode Warga Sapen • Tersedia untuk Umum",
        summary:
          "Kuasai pondasi tata bahasa Inggris mulai dari jenis kata, kalimat positif/negatif/tanya, hingga rumus Tenses harian dengan bahasa penjelasan yang sangat santai.",
        description:
          "Modul Grammar Basic dirancang khusus oleh tim pengajar Kampung Inggris Sapen agar siapa pun yang belum pernah belajar bahasa Inggris tidak merasa takut dengan rumus. Setiap halaman flipbook dilengkapi contoh kejadian sehari-hari, tabel ringkas berwarna, dan langsung diikuti latihan interaktif.",
        coverTheme: "emerald",
        totalPages: 8,
        syllabus: [
          { day: "Materi 1", topic: "Komponen Bahasa & Noun (Kata Benda di Sekitar Kita)" },
          { day: "Materi 2", topic: "Pronoun (Kata Ganti Orang: I, You, They, We, He, She, It)" },
          { day: "Materi 3", topic: "Verbs (Kata Kerja Harian) & Adjectives (Kata Sifat)" },
          { day: "Materi 4", topic: "To Be (Am, Is, Are) untuk Kalimat Tanpa Kata Kerja" },
          { day: "Materi 5", topic: "Simple Present Tense (Kebiasaan Sehari-hari)" },
          { day: "Materi 6", topic: "Present Continuous (Sedang Dilakukan Sekarang)" },
          { day: "Materi 7", topic: "Simple Past Tense (Menceritakan Kejadian Kemarin)" },
          { day: "Materi 8", topic: "Simple Future & Modals (Can, Must, Should)" },
          { day: "Materi 9", topic: "Menyusun Pertanyaan 5W + 1H (What, Where, When, Why, How)" },
          { day: "Materi 10", topic: "Rangkuman Rumus Cepat & Evaluasi Terpadu" },
        ],
        learningOutcomes: [
          {
            title: "Komponen Dasar Bahasa",
            description:
              "Memahami cara kerja subjek, kata kerja, kata sifat, dan keterangan dari kata sederhana hingga kalimat utuh.",
          },
          {
            title: "Rumus Tenses Tanpa Menghafal Rumit",
            description:
              "Bisa membedakan kapan memakai V1, V-ing, dan V2 sesuai waktu kejadian hari ini, sedang berlangsung, atau masa lalu.",
          },
          {
            title: "Sentence Structure Mandiri",
            description:
              "Mampu membuat kalimat versi sendiri baik kalimat positif (+), negatif (-), maupun kalimat tanya (?).",
          },
          {
            title: "Word Choice Tepat",
            description:
              "Tidak bingung lagi kapan harus menambah akhiran -s/-es, -ing, atau memakai am/is/are.",
          },
        ],
        benefits: [
          "Modul Flipbook eksklusif bergaya buku cetak interaktif (nyaman di HP & Laptop)",
          "Quiz Pilihan Ganda lengkap dengan skor langsung & pembahasan jawaban",
          "Flashcard Kosakata bersuara (klik untuk dengar cara baca)",
          "Game Mencocokkan Kata & Susun Kalimat Rumpang",
          "Gratis 100% bagi pemegang Kode Akses Warga Kampung Sapen",
        ],
        previewHighlights: [
          {
            badge: "Topik Pembuka",
            title: "Membedakan Kalimat Verbal vs Nominal",
            summary:
              "Kunci utama supaya tidak salah menaruh 'am / is / are' saat sudah ada kata kerja seperti eat, go, study.",
            samplePhrase: "She is happy (Nominal) vs She studies English (Verbal)",
          },
          {
            badge: "Jembatan Keledai",
            title: "Trik 'He-She-It Suka Es'",
            summary:
              "Cara mudah mengingat penambahan akhiran -s/-es pada Simple Present Tense untuk subjek tunggal.",
            samplePhrase: "He works every morning • My mother cooks delicious soup",
          },
          {
            badge: "Latihan Praktis",
            title: "Mengubah Kalimat Positif Jadi Tanya dalam 5 Detik",
            summary:
              "Langkah praktis memindahkan Do / Does / Is / Are ke depan kalimat untuk bertanya dengan sopan.",
            samplePhrase: "Do you live in Sapen? — Yes, I do!",
          },
        ],
        seedPages: [
          {
            pageNumber: 1,
            kind: "cover",
            heading: "MODUL GRAMMAR BASIC",
            subheading: "Panduan Praktis Menyusun Kalimat Bahasa Inggris dari Nol",
            bullets: [
              "Disusun khusus untuk Warga Kampung Sapen & Pembelajar Pemula",
              "Metode jembatan keledai mudah diingat tanpa hafalan rumit",
              "Dilengkapi contoh kalimat keseharian di lingkungan kampung",
            ],
            tip: "Gunakan tombol panah kanan/kiri atau geser ujung halaman untuk membuka lembar berikutnya.",
          },
          {
            pageNumber: 2,
            kind: "toc",
            heading: "PETA BELAJAR MODUL INI",
            subheading: "Urutan materi dari pengenalan kata hingga mahir membuat kalimat tanya",
            bullets: [
              "Halaman 3: Kenalan dengan Pronoun (Subjek Kalimat)",
              "Halaman 4: Rahasia To Be (Am, Is, Are) pada Kalimat Nominal",
              "Halaman 5: Simple Present Tense ('He-She-It Suka Es')",
              "Halaman 6: Present Continuous (Kejadian Sedang Berlangsung)",
              "Halaman 7: Dialog Praktis & Kalimat Tanya 5W+1H",
              "Halaman 8: Rangkuman Kilat Sebelum Mengerjakan Quiz",
            ],
            tip: "Tips Belajar: Cukup pelajari 2 halaman per hari lalu langsung coba Flashcard & Quiz!",
          },
          {
            pageNumber: 3,
            kind: "lesson",
            heading: "BAB 1: PRONOUN (KATA GANTI ORANG)",
            subheading: "Setiap kalimat bahasa Inggris selalu dimulai dari Subjek (Pelaku)",
            bullets: [
              "I = Saya (pasangannya AM)",
              "You, They, We = Kamu, Mereka, Kita/Kami (pasangannya ARE)",
              "He, She = Dia laki-laki, Dia perempuan (pasangannya IS)",
              "It = Benda / Hewan / Cuaca tunggal (pasangannya IS)",
            ],
            exampleBox: {
              en: "We are proud residents of Kampung Sapen.",
              id: "Kami adalah warga Kampung Sapen yang bangga.",
              note: "Subjek 'We' selalu berpasangan dengan 'are' jika diikuti kata sifat/benda.",
            },
            tip: "Ingat singkatan: I-AM, Ayu-Dewi (You-They-We) pakai ARE, He-She-It pakai IS!",
          },
          {
            pageNumber: 4,
            kind: "lesson",
            heading: "BAB 2: KALIMAT NOMINAL (PAKAI TO BE)",
            subheading: "Gunakan Am / Is / Are saat kalimat TIDAK memiliki kata kerja fisik",
            bullets: [
              "Rumus A-N-A: Adjective (Kata Sifat), Noun (Kata Benda), Adverb (Tempat/Waktu)",
              "Positif (+): Subject + am/is/are + A/N/A",
              "Negatif (-): Subject + am/is/are + not + A/N/A",
              "Tanya (?): Am/Is/Are + Subject + A/N/A?",
            ],
            exampleBox: {
              en: "Is Mrs. Ratna in the community hall? — Yes, she is.",
              id: "Apakah Ibu Ratna ada di balai warga? — Ya, benar.",
              note: "'in the community hall' adalah keterangan tempat (Adverb), jadi memakai 'Is'.",
            },
            tip: "Jangan gabungkan 'am/is/are' langsung dengan kata kerja murni! Contoh SALAH: 'I am study'.",
          },
          {
            pageNumber: 5,
            kind: "lesson",
            heading: "BAB 3: SIMPLE PRESENT TENSE",
            subheading: "Menceritakan kebiasaan rutin dan fakta sehari-hari",
            bullets: [
              "Subjek I / You / They / We -> Gunakan Verb 1 murni (study, eat, work)",
              "Subjek He / She / It -> Gunakan Verb 1 + s/es (studies, eats, works)",
              "Kalimat negatif menggunakan don't (I/You/They/We) atau doesn't (He/She/It)",
              "Setelah kata 'doesn't', kata kerja kembali murni tanpa -s!",
            ],
            exampleBox: {
              en: "Mr. Joko opens his coffee stall at 6 AM every morning.",
              id: "Pak Joko membuka warung kopinya jam 6 pagi setiap hari.",
              note: "Karena Mr. Joko = He, maka kata 'open' ditambah '-s' menjadi 'opens'.",
            },
            tip: "Jembatan Keledai: 'He, She, It suka minum ES (-s/-es)!'",
          },
          {
            pageNumber: 6,
            kind: "lesson",
            heading: "BAB 4: PRESENT CONTINUOUS TENSE",
            subheading: "Menyatakan aktivitas yang SEDANG dilakukan tepat saat berbicara",
            bullets: [
              "Rumus Utama: Subject + am / is / are + Verb-ing",
              "Keterangan waktu khas: now (sekarang), right now (saat ini), at the moment",
              "I am reading = Saya sedang membaca",
              "The children are practicing English = Anak-anak sedang berlatih bahasa Inggris",
            ],
            exampleBox: {
              en: "Look! The kids are playing vocabulary games together.",
              id: "Lihat! Anak-anak sedang bermain game kosakata bersama.",
              note: "Kata 'The kids' jamak (= They), sehingga memakai 'are + playing'.",
            },
            tip: "Kalau ada artinya 'SEDANG', pastikan ada paket lengkap: To Be + Verb-ing!",
          },
          {
            pageNumber: 7,
            kind: "dialogue",
            heading: "BAB 5: DIALOG HARIAN & KALIMAT TANYA",
            subheading: "Praktik menggabungkan Grammar ke dalam obrolan tetangga",
            bullets: [
              "Rina: Good morning, Mas Adi! Where are you going?",
              "Adi: Morning, Mbak Rina! I am going to the market. Do you need anything?",
              "Rina: Oh, does the fruit shop open early today?",
              "Adi: Yes, it opens at 6:30 AM. Let's go together!",
            ],
            exampleBox: {
              en: "What time do you usually study English?",
              id: "Jam berapa kamu biasanya belajar bahasa Inggris?",
              note: "Urutan bertanya: Kata Tanya (What time) + do/does + Subject + Verb 1.",
            },
            tip: "Bacalah dialog di atas dengan suara lantang 2 kali agar lidah makin terbiasa!",
          },
          {
            pageNumber: 8,
            kind: "summary",
            heading: "RANGKUMAN KILAT & SIAP QUIZ!",
            subheading: "Cek 4 poin emas ini sebelum lanjut ke halaman Quiz & Game",
            bullets: [
              "1. Tidak ada kata kerja? Pakai Am / Is / Are (contoh: I am ready).",
              "2. Kegiatan rutin? Pakai Verb 1, tambah -s/-es untuk He/She/It.",
              "3. Sedang berlangsung sekarang? Pakai Am/Is/Are + Verb-ing.",
              "4. Bertanya kebiasaan? Taruh Do atau Does di depan subjek.",
            ],
            exampleBox: {
              en: "Congratulations! You have finished Grammar Basic Module!",
              id: "Selamat! Anda telah menyelesaikan bacaan Modul Grammar Basic!",
              note: "Klik tab 'Quiz & Game' di atas untuk menguji pemahaman dan meraih skor Leaderboard!",
            },
            tip: "Skor dari Quiz Pilihan Ganda dan Game akan langsung masuk ke Leaderboard Mingguan Sapen!",
          },
        ],
        isPublished: true,
        createdAt: "2026-11-01T08:00:00.000Z",
      },

      {
        id: "mod-speaking-sapen",
        slug: "speaking-percakapan-harian",
        title: "Kelas Speaking & Pronunciation",
        subtitle: "Percakapan Sehari-hari, Sapa Tamu & Kepercayaan Diri Bicara",
        category: "Conversation",
        level: "Pemula",
        durationLabel: "Selama 1 Bulan (16 Topik Praktis)",
        scheduleLabel: "Jam belajar fleksibel + Audio Pengucapan",
        targetAudience: "Warga Kampung Sapen, Pelaku UMKM, Pemandu Tamu & Pelajar Umum",
        quotaNote: "Gratis dengan Kode Warga Sapen • Tersedia untuk Umum",
        summary:
          "Berani menyapa, berkenalan, menunjukkan arah jalan, melayani pembeli asing, dan mengobrol santai dalam bahasa Inggris dengan pengucapan yang jelas.",
        description:
          "Tidak perlu menunggu grammar sempurna untuk mulai bicara! Modul Speaking Kampung Sapen fokus pada ungkapan siap pakai (daily expressions) mulai dari menyapa tamu yang berkunjung ke Sapen, menjelaskan kuliner lokal, menanyakan kabar, hingga tips pengucapan kata yang sering keliru.",
        coverTheme: "amber",
        totalPages: 6,
        syllabus: [
          { day: "Topik 1", topic: "Greetings & Warm Introduction (Menyapa & Perkenalan Hangat)" },
          { day: "Topik 2", topic: "Asking & Giving Directions (Menunjukkan Jalan di Kampung)" },
          { day: "Topik 3", topic: "At the Culinary Stall (Jual Beli Makanan & Harga)" },
          { day: "Topik 4", topic: "Small Talk: Weather, Hobbies & Family" },
          { day: "Topik 5", topic: "Polite Expressions: Please, Excuse Me, Could You..." },
          { day: "Topik 6", topic: "Pronunciation Clinic: Kata yang Sering Salah Ucap" },
        ],
        learningOutcomes: [
          {
            title: "Sapaan Alami (Natural Greetings)",
            description:
              "Mengenal variasi sapaan ramah selain 'How are you? I am fine thank you and you'.",
          },
          {
            title: "Menunjukkan Arah dengan Jelas",
            description:
              "Lancar mengarahkan tamu memakai ungkapan turn left, go straight, across from, dan next to.",
          },
          {
            title: "Bahasa Inggris UMKM & Kuliner",
            description:
              "Mampu menjelaskan rasa makanan, bahan, dan menyebutkan nominal harga Rupiah dalam bahasa Inggris.",
          },
          {
            title: "Pronunciation Percaya Diri",
            description:
              "Berlatih pengucapan kata populer lewat fitur tombol suara di Flashcard Kosakata.",
          },
        ],
        benefits: [
          "Ungkapan pendek siap pakai tanpa pusing memikirkan rumus panjang",
          "Contoh dialog nyata di lingkungan Kampung Sapen (warung, balai warga, jalan kampung)",
          "Fitur Audio Pengucapan langsung di Flashcard Kosakata",
          "Latihan mencocokkan ungkapan dan menyusun kalimat percakapan",
        ],
        previewHighlights: [
          {
            badge: "Menyambut Tamu",
            title: "Ramah Menyapa Wisatawan / Pengunjung",
            summary:
              "Kalimat pembuka yang sopan dan hangat ketika bertemu tamu yang berkunjung ke lingkungan kampung.",
            samplePhrase: "Welcome to Kampung Sapen! Can I help you find something?",
          },
          {
            badge: "Petunjuk Arah",
            title: "3 Kalimat Kunci Penunjuk Lokasi",
            summary:
              "Cukup kuasai go straight, turn right/left, dan it's on your left untuk membantu siapa saja.",
            samplePhrase: "Go straight about fifty meters, and the mosque is on your right.",
          },
        ],
        seedPages: [
          {
            pageNumber: 1,
            kind: "cover",
            heading: "SPEAKING & PRONUNCIATION",
            subheading: "Panduan Ngobrol Santai & Menyambut Tamu di Kampung Sapen",
            bullets: [
              "Fokus keberanian bicara (Confidence First!)",
              "Ungkapan sopan untuk menyapa, mengarahkan jalan, dan bertransaksi",
              "Tips cara baca (pronunciation) yang mudah diikuti lidah Indonesia",
            ],
            tip: "Kunci Speaking adalah suara keluar dari mulut: ucapkan setiap kalimat minimal 3 kali!",
          },
          {
            pageNumber: 2,
            kind: "lesson",
            heading: "TOPIK 1: MENYAPA LEBIH ALAMI",
            subheading: "Variasi sapaan ramah agar terdengar luwes dan bersahabat",
            bullets: [
              "Good morning! How's your day going? = Selamat pagi! Bagaimana harimu?",
              "Pretty good, thanks! How about you? = Sangat baik, terima kasih! Kalau kamu?",
              "Nice to meet you! Welcome to Sapen. = Senang bertemu Anda! Selamat datang di Sapen.",
              "Please make yourself at home. = Silakan anggap seperti di rumah sendiri.",
            ],
            exampleBox: {
              en: "Hello! Welcome to Kampung Sapen. My name is Sari, nice to meet you!",
              id: "Halo! Selamat datang di Kampung Sapen. Nama saya Sari, senang bertemu Anda!",
              note: "Senyum hangat + kontak mata membuat bahasa Inggris sederhana terasa sangat profesional.",
            },
            tip: "Cara baca 'Welcome': WEL-kam (bukan wel-kom).",
          },
          {
            pageNumber: 3,
            kind: "lesson",
            heading: "TOPIK 2: MENUNJUKKAN ARAH JALAN",
            subheading: "Ungkapan praktis saat ada tamu bertanya lokasi",
            bullets: [
              "Go straight ahead = Jalan lurus terus",
              "Turn left at the crossroads = Belok kiri di perempatan",
              "Turn right at the T-junction = Belok kanan di pertigaan",
              "It is right next to the school = Lokasinya tepat di sebelah sekolah",
            ],
            exampleBox: {
              en: "Excuse me, where is the nearest ATM? — Go straight and turn left at the corner.",
              id: "Permisi, di mana ATM terdekat? — Jalan lurus lalu belok kiri di tikungan.",
              note: "Gunakan gerakan tangan ringan agar lawan bicara semakin mudah memahami arah.",
            },
            tip: "Cara baca 'Straight': STREIT (huruf 'gh' tidak dibaca!).",
          },
          {
            pageNumber: 4,
            kind: "lesson",
            heading: "TOPIK 3: KULINER & UMKM LOKAL",
            subheading: "Menjelaskan makanan khas dan harga kepada pembeli",
            bullets: [
              "Would you like to try our traditional snack? = Mau coba jajanan tradisional kami?",
              "It is savory, crispy, and a little spicy. = Rasanya gurih, renyah, dan sedikit pedas.",
              "One portion is fifteen thousand Rupiah. = Satu porsinya 15 ribu Rupiah.",
              "You can pay by cash or QRIS. = Anda bisa membayar tunai atau pakai QRIS.",
            ],
            exampleBox: {
              en: "This fried tempeh is freshly made and still warm!",
              id: "Tempe goreng ini baru saja matang dan masih hangat!",
              note: "Kata 'thousand' = ribu. Contoh: 10.000 = ten thousand, 25.000 = twenty-five thousand.",
            },
            tip: "Cara baca 'Delicious' (lezat): di-LI-syes.",
          },
          {
            pageNumber: 5,
            kind: "dialogue",
            heading: "TOPIK 4: KLINIK PENGUCAPAN POPULER",
            subheading: "10 kata sehari-hari yang sering mengecoh cara bacanya",
            bullets: [
              "Wednesday -> dibaca: WENS-dei (huruf 'd' pertama bisu)",
              "Listen -> dibaca: LI-sen (huruf 't' bisu)",
              "Knife / Know -> dibaca: NAIF / NOU (huruf 'k' di depan bisu)",
              "Vegetable -> dibaca: VEJ-te-bel (bukan ve-ge-ta-bel)",
            ],
            exampleBox: {
              en: "Please listen carefully and repeat after me.",
              id: "Tolong dengarkan baik-baik dan ulangi setelah saya.",
              note: "Jangan malu kalau masih berlogat Jawa/Indonesia — yang terpenting pengucapan jelas!",
            },
            tip: "Gunakan menu Flashcard Kosakata untuk mendengar audio pengucapan otomatis!",
          },
          {
            pageNumber: 6,
            kind: "summary",
            heading: "SIAP PRAKTIK BICARA HARI INI!",
            subheading: "Tantangan kecil bersama keluarga atau tetangga di Sapen",
            bullets: [
              "Sapa minimal 1 anggota keluarga pagi ini dengan 'Good morning, how's your day?'",
              "Latih penyebutan angka ribuan (5 thousand, 10 thousand, 20 thousand)",
              "Buka tab Quiz & Game untuk mengetes daya ingat ungkapan percakapanmu!",
            ],
            exampleBox: {
              en: "Practice makes progress — speak a little English every single day!",
              id: "Latihan membawa kemajuan — ucapkan sedikit bahasa Inggris setiap hari!",
            },
            tip: "Lanjutkan ke Quiz Pilihan Ganda untuk mengumpulkan poin mingguanmu!",
          },
        ],
        isPublished: true,
        createdAt: "2026-11-02T08:00:00.000Z",
      },

      {
        id: "mod-english-kids",
        slug: "english-for-kids",
        title: "English for Kids Ceria",
        subtitle: "Belajar Kosakata, Warna, Hewan & Kalimat Sederhana Anak",
        category: "Kids Program",
        level: "Anak-Anak",
        durationLabel: "12 Tema Bergambar Ceria",
        scheduleLabel: "Belajar santai didampingi Orang Tua / Mandiri",
        targetAudience: "Anak usia 6 – 13 tahun (SD s/d awal SMP)",
        quotaNote: "Cocok dipakai bersama 1 Kode Akses Keluarga",
        summary:
          "Modul ramah anak dengan kalimat pendek, kosakata benda sekitar rumah, keluarga, warna, angka, dan permainan kata seru agar anak suka bahasa Inggris sejak dini.",
        description:
          "Dirancang khusus agar anak-anak di Kampung Sapen maupun luar kampung merasa belajar bahasa Inggris itu seperti bermain game! Materinya penuh kosakata visual dekat keseharian anak dan langsung terhubung dengan game Mencocokkan Kata serta Susun Huruf.",
        coverTheme: "sky",
        totalPages: 5,
        syllabus: [
          { day: "Tema 1", topic: "My Family & My Home (Keluarga & Rumahku)" },
          { day: "Tema 2", topic: "Colors, Numbers & Shapes (Warna, Angka & Bentuk)" },
          { day: "Tema 3", topic: "Animals & Nature (Hewan Lucu & Alam Sekitar)" },
          { day: "Tema 4", topic: "School Bag & Classroom (Benda di Tas Sekolah)" },
          { day: "Tema 5", topic: "Magic Words: Thank You, Sorry & Please!" },
        ],
        learningOutcomes: [
          {
            title: "100+ Kosakata Dasar Anak",
            description: "Mengenal nama benda di rumah, sekolah, hewan, buah, dan anggota tubuh.",
          },
          {
            title: "3 Kata Ajaib Sopan Santun",
            description: "Membiasakan anak mengucapkan Please, Thank you, dan I'm sorry.",
          },
          {
            title: "Belajar Lewat Game Interaktif",
            description: "Anak betah mengulang materi lewat game Matching Kartu dan Susun Kata.",
          },
        ],
        benefits: [
          "Bisa diakses dari HP/Tablet keluarga dengan 1 Kode Keluarga Warga",
          "Tampilan huruf jelas, penuh warna, dan tidak membosankan",
          "Tombol suara membantu anak menirukan bunyi kata bahasa Inggris",
        ],
        previewHighlights: [
          {
            badge: "Kata Ajaib Anak",
            title: "Three Magic Words (Tiga Kata Sopan)",
            summary: "Mengenalkan sopan santun berbahasa Inggris sejak kecil lewat lagu dan kalimat pendek.",
            samplePhrase: "May I borrow your pencil, please? — Here you are! — Thank you!",
          },
          {
            badge: "Tebak Kosakata",
            title: "Animals Around Us",
            summary: "Menghubungkan ciri-ciri hewan dengan namanya dalam bahasa Inggris.",
            samplePhrase: "A cat says meow • A bird can fly high in the sky!",
          },
        ],
        seedPages: [
          {
            pageNumber: 1,
            kind: "cover",
            heading: "ENGLISH FOR KIDS CERIA",
            subheading: "Petualangan Seru Mengenal Kosakata & Kalimat Pertamaku!",
            bullets: [
              "Khusus adik-adik SD & SMP awal",
              "Kalimat pendek yang mudah diucapkan dan diingat",
              "Ayo baca lalu mainkan Game Mencocokkan Kata!",
            ],
            tip: "Ayah/Bunda bisa ikut mendampingi sambil menekan tombol suara di Flashcard!",
          },
          {
            pageNumber: 2,
            kind: "lesson",
            heading: "TEMA 1: MY LOVELY FAMILY",
            subheading: "Mengenal panggilan anggota keluarga di rumah",
            bullets: [
              "Father / Dad = Ayah",
              "Mother / Mom = Ibu",
              "Brother = Saudara laki-laki (Kakak/Adik)",
              "Sister = Saudara perempuan (Kakak/Adik)",
              "Grandfather & Grandmother = Kakek & Nenek",
            ],
            exampleBox: {
              en: "I love my mother and my father very much!",
              id: "Aku sangat menyayangi ibu dan ayahku!",
            },
            tip: "Coba sebutkan siapa saja yang ada di rumahmu memakai bahasa Inggris!",
          },
          {
            pageNumber: 3,
            kind: "lesson",
            heading: "TEMA 2: COLORS & ANIMALS",
            subheading: "Menggabungkan warna dengan nama hewan",
            bullets: [
              "A white rabbit = Seekor kelinci putih",
              "A yellow bird = Seekor burung kuning",
              "A brown cat = Seekor kucing cokelat",
              "A green frog = Seekor katak hijau",
            ],
            exampleBox: {
              en: "Look! I have a cute orange cat at home.",
              id: "Lihat! Aku punya seekor kucing oranye yang lucu di rumah.",
              note: "Dalam bahasa Inggris, sebutkan WARNANYA dulu baru BENDANYA ya! (orange cat).",
            },
            tip: "Ingat urutannya: Warna dulu + Hewan/Benda (Blue bag = Tas biru)!",
          },
          {
            pageNumber: 4,
            kind: "dialogue",
            heading: "TEMA 3: THREE MAGIC WORDS",
            subheading: "Tiga kata sopan yang membuat semua orang senang",
            bullets: [
              "PLEASE (Tolong) -> 'Help me, please!'",
              "THANK YOU (Terima kasih) -> 'Thank you for the book!'",
              "I AM SORRY (Maaf) -> 'I am sorry, I am late.'",
              "YOU ARE WELCOME (Sama-sama) -> Jawaban saat teman bilang Thank you!",
            ],
            exampleBox: {
              en: "Bima: Can I have some water, Mom, please? — Mom: Sure, here you go!",
              id: "Bima: Boleh minta air minum, Bu, tolong? — Ibu: Tentu, ini dia!",
            },
            tip: "Anak hebat selalu ingat bilang 'Please' dan 'Thank you' setiap hari!",
          },
          {
            pageNumber: 5,
            kind: "summary",
            heading: "HEBAT! KAMU SUDAH SELESAI BACA!",
            subheading: "Saatnya mengumpulkan bintang di halaman Quiz & Game!",
            bullets: [
              "1. Father & Mother = Ayah & Ibu",
              "2. Warna disebutkan sebelum benda (Red apple = Apel merah)",
              "3. Tiga kata ajaib: Please, Thank you, I'm sorry!",
            ],
            exampleBox: {
              en: "You are a superstar learner! Let's play the quiz now!",
              id: "Kamu pelajar bintang super! Ayo mainkan kuisnya sekarang!",
            },
            tip: "Klik tombol 'Mainkan Quiz & Game' untuk naik ke puncak Leaderboard!",
          },
        ],
        isPublished: true,
        createdAt: "2026-11-03T08:00:00.000Z",
      },

      {
        id: "mod-toefl-prep",
        slug: "toefl-reading-structure",
        title: "Kelas Persiapan TOEFL",
        subtitle: "Strategi Cepat Structure, Written Expression & Reading Comprehension",
        category: "Exam Preparation",
        level: "Lanjutan",
        durationLabel: "Selama 1 Bulan (16 Strategi Inti)",
        scheduleLabel: "Jam belajar fleksibel + Pembahasan Trik Soal",
        targetAudience: "SMA/SMK, Mahasiswa, Pencari Kerja & Beasiswa",
        quotaNote: "Tersedia Pembahasan Detail Tiap Soal",
        summary:
          "Bongkar pola soal jebakan TOEFL ITP/Prediction tanpa harus mengartikan seluruh paragraf panjang satu per satu.",
        description:
          "Bagi pemuda Kampung Sapen, mahasiswa, maupun peserta umum yang sedang menyiapkan syarat kelulusan kampus, melamar kerja BUMN/swasta, atau beasiswa, modul ini merangkum pola soal Structure dan teknik skimming-scanning Reading yang paling sering keluar.",
        coverTheme: "violet",
        totalPages: 5,
        syllabus: [
          { day: "Strategi 1", topic: "Pastikan Setiap Kalimat Punya 1 Subject & 1 Verb Utama" },
          { day: "Strategi 2", topic: "Hati-hati Jebakan Object of Preposition (in, on, at, of, by)" },
          { day: "Strategi 3", topic: "Appositives: Keterangan Tambahan di Antara Dua Koma" },
          { day: "Strategi 4", topic: "Subject-Verb Agreement pada Kalimat Panjang" },
          { day: "Strategi 5", topic: "Teknik Skimming Ide Pokok Reading dalam 20 Detik" },
        ],
        learningOutcomes: [
          {
            title: "Deteksi Cepat Subject & Verb",
            description: "Menemukan inti kalimat dalam 5 detik meski kalimatnya panjang 3 baris.",
          },
          {
            title: "Menghindari Jebakan Preposisi",
            description: "Tidak terkecoh mengira kata benda setelah 'in/of/with' sebagai subjek kalimat.",
          },
          {
            title: "Reading Tanpa Terjemah Semua Kata",
            description: "Menjawab soal Main Idea dan Stated Detail dengan membaca baris kunci.",
          },
        ],
        benefits: [
          "Ringkasan trik cepat bergaya catatan bimbingan tes",
          "Latihan soal setara TOEFL Structure lengkap dengan analisis alasan salah/benar",
          "Kosakata akademik penting di fitur Flashcard & Matching",
        ],
        previewHighlights: [
          {
            badge: "Skill Emas #1",
            title: "Rumus Wajib 1 Subject + 1 Verb",
            summary: "80% soal TOEFL Structure selesai hanya dengan memeriksa apakah kalimat kehilangan Subject atau Verb.",
            samplePhrase: "The traffic on Malioboro Street [is] very busy every weekend.",
          },
        ],
        seedPages: [
          {
            pageNumber: 1,
            kind: "cover",
            heading: "STRATEGI CEPAT TOEFL",
            subheading: "Taktik Menaklukkan Structure & Reading Tanpa Panik Waktu",
            bullets: [
              "Dirancang untuk mahasiswa, pencari beasiswa & pelamar kerja",
              "Fokus pola berulang yang paling sering muncul di ujian",
              "Disertai contoh analisis kalimat langkah demi langkah",
            ],
            tip: "Dalam TOEFL Structure, Anda punya rata-rata 35 detik per soal — gunakan rumus pola!",
          },
          {
            pageNumber: 2,
            kind: "lesson",
            heading: "SKILL 1: PASTIKAN ADA SUBJECT & VERB",
            subheading: "Setiap kalimat bahasa Inggris wajib memiliki minimal 1 Subject dan 1 Verb",
            bullets: [
              "Cek dulu apakah kalimat sudah punya Subject? Apakah sudah punya Verb?",
              "Jika keduanya sudah ada dan tidak ada kata hubung, jangan pilih jawaban yang menambah Verb baru!",
              "Jika belum ada Subject, carilah kata benda tunggal/jamak yang sesuai dengan Verb-nya.",
            ],
            exampleBox: {
              en: "Last week [went] fishing at the river. -> SALAH (Tidak ada Subject!)",
              id: "Perbaikan: Last week [my brother] went fishing at the river.",
              note: "'Last week' hanyalah keterangan waktu, BUKAN Subject!",
            },
            tip: "Coret keterangan waktu di awal kalimat agar Subject asli langsung terlihat!",
          },
          {
            pageNumber: 3,
            kind: "lesson",
            heading: "SKILL 2: JEBAKAN OBJECT OF PREPOSITION",
            subheading: "Kata benda setelah in, at, of, to, by, behind, with BUKANLAH Subject!",
            bullets: [
              "Contoh preposisi: in, on, at, of, from, with, by, during, among",
              "Jika kalimat dimulai preposisi + benda tanpa koma, itu bukan Subject.",
              "Jebakan Agreement: Verb harus mengikuti Subject di DEPAN 'of', bukan benda sesudah 'of'!",
            ],
            exampleBox: {
              en: "The key to the classrooms [is] on the reception desk.",
              id: "Kunci menuju ruang-ruang kelas itu ada di meja resepsionis.",
              note: "Subject aslinya adalah 'The key' (tunggal -> is), bukan 'classrooms'!",
            },
            tip: "Kurung setiap frasa berawalan 'of / in / on' dalam pikiran Anda!",
          },
          {
            pageNumber: 4,
            kind: "lesson",
            heading: "SKILL 3: READING MAIN IDEA 20 DETIK",
            subheading: "Jangan baca seluruh teks dari kata pertama sampai titik terakhir!",
            bullets: [
              "Pertanyaan 'What is the main idea / primary topic?' -> Baca kalimat PERTAMA tiap paragraf!",
              "Hindari pilihan jawaban yang terlalu sempit (hanya membahas 1 detail kecil).",
              "Hindari pilihan jawaban yang terlalu luas atau bertentangan dengan kalimat pembuka.",
            ],
            exampleBox: {
              en: "Tip: Read the first sentence of each paragraph to capture the blueprint.",
              id: "Tips: Baca kalimat pertama tiap paragraf untuk menangkap kerangka utamanya.",
            },
            tip: "Simpan soal kosakata ('closest in meaning') untuk dijawab lewat konteks kalimat sekitarnya.",
          },
          {
            pageNumber: 5,
            kind: "summary",
            heading: "EVALUASI SKILL TOEFL ANDA!",
            subheading: "Uji ketelitian mata Anda di simulasi Quiz Structure sekarang",
            bullets: [
              "1. Cari Verb utama terlebih dahulu.",
              "2. Abaikan Object of Preposition saat menentukan tunggal/jamak.",
              "3. Baca kalimat pertama tiap paragraf untuk soal Main Idea.",
            ],
            exampleBox: {
              en: "Ready to test your score? Head over to the Quiz & Games tab!",
              id: "Siap menguji skor Anda? Buka tab Quiz & Game sekarang!",
            },
            tip: "Baca pembahasan setiap nomor setelah submit quiz agar paham letak pengecohnya!",
          },
        ],
        isPublished: true,
        createdAt: "2026-11-04T08:00:00.000Z",
      },
    ],

    accessCodes: [
      {
        id: "code-1",
        code: "SAPEN-RT01-KK01",
        label: "Keluarga Bpk. Slamet Riyadi",
        rtRw: "RT 01 / RW 01",
        holderType: "keluarga",
        maxDevices: 4,
        expiresAt: "2027-12-31T23:59:59.000Z",
        isActive: true,
        createdBy: "Pengurus Sapen",
        createdAt: "2026-11-01T09:00:00.000Z",
        devices: [
          {
            deviceId: "seed-dev-1",
            participantName: "Rizky Saputra",
            deviceLabel: "Android Chrome",
            lastSeenAt: "2026-11-07T10:15:00.000Z",
            createdAt: "2026-11-03T10:15:00.000Z",
          },
        ],
      },
      {
        id: "code-2",
        code: "SAPEN-RT02-KK08",
        label: "Keluarga Ibu Siti Rahayu",
        rtRw: "RT 02 / RW 01",
        holderType: "keluarga",
        maxDevices: 4,
        expiresAt: "2027-12-31T23:59:59.000Z",
        isActive: true,
        createdBy: "Pengurus Sapen",
        createdAt: "2026-11-02T09:00:00.000Z",
        devices: [],
      },
      {
        id: "code-3",
        code: "SAPEN-PEMUDA",
        label: "Karang Taruna Kampung Sapen",
        rtRw: "RW 01 - RW 03",
        holderType: "keluarga",
        maxDevices: 15,
        expiresAt: "2027-06-30T23:59:59.000Z",
        isActive: true,
        createdBy: "Pengurus Sapen",
        createdAt: "2026-11-03T09:00:00.000Z",
        devices: [],
      },
    ],

    externalUsers: [],
    subscriptions: [],

    quizzes: [
      // Grammar Basic
      {
        id: "qz-gb-1",
        moduleId: "mod-grammar-basic",
        question: "Pilih kalimat yang BENAR untuk menyatakan kegiatan rutin setiap pagi:",
        options: [
          "My father drink coffee every morning.",
          "My father drinks coffee every morning.",
          "My father is drink coffee every morning.",
          "My father drinking coffee every morning.",
        ],
        correctIndex: 1,
        explanation:
          "Karena 'My father' setara dengan kata ganti tunggal 'He' pada kalimat kebiasaan (Simple Present Tense), kata kerja 'drink' wajib ditambah akhiran '-s' menjadi 'drinks'.",
        orderNum: 1,
      },
      {
        id: "qz-gb-2",
        moduleId: "mod-grammar-basic",
        question: "We ___ very happy to learn English together in Kampung Sapen.",
        options: ["am", "is", "are", "does"],
        correctIndex: 2,
        explanation:
          "Kata 'happy' adalah kata sifat (Adjective), bukan kata kerja. Untuk subjek 'We', pasangan To Be yang tepat adalah 'are'.",
        orderNum: 2,
      },
      {
        id: "qz-gb-3",
        moduleId: "mod-grammar-basic",
        question: "Look! The children ___ English flashcards in the hall right now.",
        options: ["read", "reads", "is reading", "are reading"],
        correctIndex: 3,
        explanation:
          "Ada penanda waktu 'Look!' dan 'right now' (sedang berlangsung sekarang / Present Continuous). 'The children' adalah bentuk jamak (anak-anak = they), jadi memakai 'are + Verb-ing' -> 'are reading'.",
        orderNum: 3,
      },
      {
        id: "qz-gb-4",
        moduleId: "mod-grammar-basic",
        question: "___ Mrs. Ratna teach English on Saturday afternoon?",
        options: ["Do", "Does", "Is", "Are"],
        correctIndex: 1,
        explanation:
          "Kalimat ini memiliki kata kerja murni 'teach' dan subjek tunggal 'Mrs. Ratna' (She), sehingga kata bantu tanya yang benar adalah 'Does'.",
        orderNum: 4,
      },

      // Speaking Sapen
      {
        id: "qz-sp-1",
        moduleId: "mod-speaking-sapen",
        question: "Ada wisatawan bertanya lokasi masjid yang tinggal jalan lurus lalu di sebelah kanan. Kalimat mana yang paling tepat?",
        options: [
          "Go straight ahead, and the mosque is on your right.",
          "Turn back, and the mosque is under the street.",
          "Go sleep ahead, and the mosque on right.",
          "Walk left circle, mosque is behind.",
        ],
        correctIndex: 0,
        explanation:
          "'Go straight ahead' berarti jalan lurus ke depan, dan 'on your right' berarti berada di sebelah kanan Anda.",
        orderNum: 1,
      },
      {
        id: "qz-sp-2",
        moduleId: "mod-speaking-sapen",
        question: "Bagaimana menyebutkan harga 'Rp 25.000' dalam bahasa Inggris kepada pembeli?",
        options: [
          "Two five hundred Rupiah",
          "Twenty-five thousand Rupiah",
          "Twenty-five million Rupiah",
          "Twelve thousand five Rupiah",
        ],
        correctIndex: 1,
        explanation:
          "25 = twenty-five, dan ribuan = thousand. Jadi Rp 25.000 diucapkan 'Twenty-five thousand Rupiah'.",
        orderNum: 2,
      },
      {
        id: "qz-sp-3",
        moduleId: "mod-speaking-sapen",
        question: "Kata 'Listen' (dengarkan) memiliki satu huruf yang TIDAK dibaca (silent letter), yaitu huruf...",
        options: ["Huruf L", "Huruf S", "Huruf T", "Huruf N"],
        correctIndex: 2,
        explanation:
          "Kata 'Listen' diucapkan 'LI-sen' tanpa membunyikan huruf 't' di tengahnya.",
        orderNum: 3,
      },

      // Kids
      {
        id: "qz-kd-1",
        moduleId: "mod-english-kids",
        question: "Bagaimana bahasa Inggris dari 'Seekor kucing oranye'?",
        options: ["A cat orange", "An orange cat", "A green frog", "An apple red"],
        correctIndex: 1,
        explanation:
          "Dalam bahasa Inggris, warna disebutkan lebih dulu sebelum nama hewannya: 'An orange cat'.",
        orderNum: 1,
      },
      {
        id: "qz-kd-2",
        moduleId: "mod-english-kids",
        question: "Saat kita meminta tolong kepada Ibu atau teman, kata ajaib apa yang kita ucapkan?",
        options: ["Goodbye", "Sleepy", "Please", "Angry"],
        correctIndex: 2,
        explanation:
          "'Please' adalah kata ajaib untuk meminta tolong dengan sopan!",
        orderNum: 2,
      },

      // TOEFL
      {
        id: "qz-tf-1",
        moduleId: "mod-toefl-prep",
        question: "The schedule of the online English classes ___ posted on the announcement board.",
        options: ["are", "is", "were", "have"],
        correctIndex: 1,
        explanation:
          "Subject utama kalimat adalah 'The schedule' (tunggal), sedangkan 'of the online English classes' hanyalah Object of Preposition. Karena tunggal, Verb yang tepat adalah 'is'.",
        orderNum: 1,
      },
      {
        id: "qz-tf-2",
        moduleId: "mod-toefl-prep",
        question: "Yesterday morning ___ practiced English conversation at the village hall.",
        options: ["enthusiastically", "in the hall", "the students", "were"],
        correctIndex: 2,
        explanation:
          "'Yesterday morning' hanyalah keterangan waktu dan kalimat sudah memiliki Verb 'practiced', sehingga bagian kosong membutuhkan Subject berupa kata benda: 'the students'.",
        orderNum: 2,
      },
    ],

    flashcards: [
      {
        id: "fc-1",
        moduleId: "mod-grammar-basic",
        english: "Resident",
        phonetic: "/ˈrez.ɪ.dənt/",
        indonesian: "Warga / Penduduk",
        exampleEn: "Every resident of Kampung Sapen can study for free.",
        exampleId: "Setiap warga Kampung Sapen bisa belajar secara gratis.",
      },
      {
        id: "fc-2",
        moduleId: "mod-grammar-basic",
        english: "Habit",
        phonetic: "/ˈhæb.ɪt/",
        indonesian: "Kebiasaan rutin",
        exampleEn: "Reading ten minutes a day is a great habit.",
        exampleId: "Membaca sepuluh menit sehari adalah kebiasaan yang hebat.",
      },
      {
        id: "fc-3",
        moduleId: "mod-grammar-basic",
        english: "confident",
        phonetic: "/ˈkɒn.fɪ.dənt/",
        indonesian: "Percaya diri",
        exampleEn: "She feels confident speaking English now.",
        exampleId: "Dia merasa percaya diri berbicara bahasa Inggris sekarang.",
      },
      {
        id: "fc-4",
        moduleId: "mod-grammar-basic",
        english: "Neighborhood",
        phonetic: "/ˈneɪ.bə.hʊd/",
        indonesian: "Lingkungan sekitar / Ketetanggaan",
        exampleEn: "Our neighborhood is clean, friendly, and welcoming.",
        exampleId: "Lingkungan kampung kita bersih, ramah, dan hangat menyambut tamu.",
      },
      {
        id: "fc-5",
        moduleId: "mod-speaking-sapen",
        english: "Straight ahead",
        phonetic: "/streɪt əˈhed/",
        indonesian: "Lurus terus ke depan",
        exampleEn: "Just walk straight ahead for two minutes.",
        exampleId: "Cukup jalan lurus ke depan selama dua menit.",
      },
      {
        id: "fc-6",
        moduleId: "mod-speaking-sapen",
        english: "Delicious",
        phonetic: "/dɪˈlɪʃ.əs/",
        indonesian: "Lezat / Enak sekali",
        exampleEn: "This traditional gudeg tastes so delicious!",
        exampleId: "Gudeg tradisional ini rasanya sangat lezat!",
      },
      {
        id: "fc-7",
        moduleId: "mod-english-kids",
        english: "Butterfly",
        phonetic: "/ˈbʌt.ə.flaɪ/",
        indonesian: "Kupu-kupu",
        exampleEn: "There is a colorful butterfly in the garden.",
        exampleId: "Ada seekor kupu-kupu warna-warni di taman.",
      },
      {
        id: "fc-8",
        moduleId: "mod-toefl-prep",
        english: "Significant",
        phonetic: "/sɪɡˈnɪf.ɪ.kənt/",
        indonesian: "Penting / Berarti besar",
        exampleEn: "Daily practice brings a significant improvement.",
        exampleId: "Latihan harian membawa peningkatan yang besar.",
      },
    ],

    matchingPairs: [
      { id: "mp-1", moduleId: "mod-grammar-basic", english: "Every morning", indonesian: "Setiap pagi" },
      { id: "mp-2", moduleId: "mod-grammar-basic", english: "Right now", indonesian: "Saat ini juga" },
      { id: "mp-3", moduleId: "mod-grammar-basic", english: "Community hall", indonesian: "Balai warga" },
      { id: "mp-4", moduleId: "mod-grammar-basic", english: "Together", indonesian: "Bersama-sama" },
      { id: "mp-5", moduleId: "mod-grammar-basic", english: "Question", indonesian: "Pertanyaan" },
      { id: "mp-6", moduleId: "mod-speaking-sapen", english: "Turn left", indonesian: "Belok kiri" },
      { id: "mp-7", moduleId: "mod-speaking-sapen", english: "Crossroads", indonesian: "Perempatan jalan" },
      { id: "mp-8", moduleId: "mod-speaking-sapen", english: "Savory", indonesian: "Gurih" },
      { id: "mp-9", moduleId: "mod-speaking-sapen", english: "Change", indonesian: "Uang kembalian" },
      { id: "mp-10", moduleId: "mod-english-kids", english: "Grandmother", indonesian: "Nenek" },
      { id: "mp-11", moduleId: "mod-english-kids", english: "Rainbow", indonesian: "Pelangi" },
      { id: "mp-12", moduleId: "mod-english-kids", english: "Thank you", indonesian: "Terima kasih" },
      { id: "mp-13", moduleId: "mod-toefl-prep", english: "Acquire", indonesian: "Memperoleh" },
      { id: "mp-14", moduleId: "mod-toefl-prep", english: "Sufficient", indonesian: "Cukup / Memadai" },
      { id: "mp-15", moduleId: "mod-toefl-prep", english: "Primary", indonesian: "Utama / Pokok" },
    ],

    wordChallenges: [
      {
        id: "wc-1",
        moduleId: "mod-grammar-basic",
        challengeType: "scramble",
        clueId: "Susun huruf ini menjadi kata bahasa Inggris yang artinya: 'BELAJAR'",
        answer: "STUDY",
        hint: "Dimulai huruf S dan diakhiri huruf Y (5 huruf)",
      },
      {
        id: "wc-2",
        moduleId: "mod-grammar-basic",
        challengeType: "fill_blank",
        clueId: "Lengkapi kalimat kebiasaan ini untuk subjek tunggal 'She':",
        sentenceBlank: "She ___ to school by bicycle every day.",
        answer: "GOES",
        hint: "Kata dasar 'go' ditambah akhiran '-es'",
      },
      {
        id: "wc-3",
        moduleId: "mod-speaking-sapen",
        challengeType: "scramble",
        clueId: "Susun huruf menjadi kata sambutan: 'SELAMAT DATANG'",
        answer: "WELCOME",
        hint: "Diawali WEL...",
      },
      {
        id: "wc-4",
        moduleId: "mod-speaking-sapen",
        challengeType: "fill_blank",
        clueId: "Lengkapi kalimat penunjuk jalan lurus:",
        sentenceBlank: "Go ___ ahead about fifty meters.",
        answer: "STRAIGHT",
        hint: "Artinya lurus (S-T-R-A-I-G-H-T)",
      },
      {
        id: "wc-5",
        moduleId: "mod-english-kids",
        challengeType: "scramble",
        clueId: "Susun huruf menjadi kata ajaib: 'TOLONG'",
        answer: "PLEASE",
        hint: "6 huruf, diawali P",
      },
      {
        id: "wc-6",
        moduleId: "mod-toefl-prep",
        challengeType: "fill_blank",
        clueId: "Lengkapi kata kerja tunggal yang sesuai dengan Subject 'The list':",
        sentenceBlank: "The list of participants ___ on the table.",
        answer: "IS",
        hint: "To be untuk benda tunggal sekarang",
      },
    ],

    leaderboard: [
      {
        id: "lb-1",
        participantKey: "warga-rizky",
        participantName: "Rizky Saputra",
        originBadge: "Warga Sapen • RT 01",
        moduleId: "mod-grammar-basic",
        moduleTitle: "Kelas Grammar Basic",
        gameType: "Quiz Pilihan Ganda",
        score: 100,
        weekLabel: week,
        createdAt: "2026-11-06T13:20:00.000Z",
      },
      {
        id: "lb-2",
        participantKey: "warga-nabila",
        participantName: "Nabila Putri",
        originBadge: "Warga Sapen • RT 02",
        moduleId: "mod-speaking-sapen",
        moduleTitle: "Kelas Speaking & Pronunciation",
        gameType: "Matching Kata",
        score: 95,
        weekLabel: week,
        createdAt: "2026-11-06T15:10:00.000Z",
      },
      {
        id: "lb-3",
        participantKey: "umum-dimas",
        participantName: "Dimas Pratama",
        originBadge: "Peserta Umum",
        moduleId: "mod-grammar-basic",
        moduleTitle: "Kelas Grammar Basic",
        gameType: "Susun Kata & Rumpang",
        score: 90,
        weekLabel: week,
        createdAt: "2026-11-07T08:40:00.000Z",
      },
      {
        id: "lb-4",
        participantKey: "warga-sari",
        participantName: "Ibu Sari Wulandari",
        originBadge: "Warga Sapen • RT 03",
        moduleId: "mod-speaking-sapen",
        moduleTitle: "Kelas Speaking & Pronunciation",
        gameType: "Quiz Pilihan Ganda",
        score: 85,
        weekLabel: week,
        createdAt: "2026-11-07T09:30:00.000Z",
      },
      {
        id: "lb-5",
        participantKey: "warga-fajar",
        participantName: "Adik Fajar",
        originBadge: "Warga Sapen • RT 01",
        moduleId: "mod-english-kids",
        moduleTitle: "English for Kids Ceria",
        gameType: "Matching Kata",
        score: 80,
        weekLabel: week,
        createdAt: "2026-11-07T11:00:00.000Z",
      },
    ],

    // ── Kode RW: 1 kode bersama per RW ──
    rwCodes: [
      createRwCodeRecord("RW 06", "QTU-OP3"),
      createRwCodeRecord("RW 07", "MXR-7KA"),
      createRwCodeRecord("RW 08", "BNJ-5WF"),
    ],

    // ── Warga terdaftar (kosong saat seed, akan terisi dari login) ──
    warga: [],

    // ── Log login (kosong) ──
    loginLog: [],

    // ── Testimoni (kosong, diisi admin) ──
    testimoni: [],
  };
}
