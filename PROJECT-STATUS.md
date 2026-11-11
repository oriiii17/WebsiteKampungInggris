# STATUS PROYEK: SAPEN ENGLISH (WEBSITE KAMPUNG INGGRIS SAPEN)

Dokumen ini adalah dokumentasi resmi dan status terlengkap dari platform **Sapen English**. Dokumen ini wajib dibaca oleh developer, tim pengurus, maupun asisten AI sebelum melakukan tindakan apa pun pada repositori ini.

---

## 1. NAMA & TUJUAN WEBSITE

### Nama Platform
**Sapen English** (*Platform Pembelajaran Bahasa Inggris Komunitas Kampung Sapen*)

### Tujuan Pembuatan
Website ini dibuat untuk menyediakan platform pembelajaran Bahasa Inggris yang modern, interaktif, praktis, cepat, dan *mobile-first* (ramah ponsel pintar). Website ini dirancang untuk menyelesaikan kesenjangan akses belajar bahasa asing berkualitas melalui perpaduan modul bacaan digital (flipbook), latihan mandiri, dan sesi kuis kelas interaktif *real-time* ala Kahoot.

### Target Pengguna
1. **Warga Kampung Sapen (Yogyakarta)**:
   - Mencakup warga dari **RW 06, RW 07, dan RW 08** (Kelurahan Demangan, Kemantren Gondokusuman, Kota Yogyakarta).
   - Mendapatkan **akses 100% gratis tanpa batas** ke seluruh modul materi, kelas, dan game interaktif cukup dengan memasukkan *Nama Panggilan* dan *Kode Akses Warga* (tanpa email dan tanpa kata sandi).
2. **Anak-anak & Pelajar**:
   - Anak-anak usia SD hingga remaja SMP/SMA yang membutuhkan materi pengenalan kosakata bergambar, permainan susun kalimat, pengucapan jam & waktu (*Telling Time*), serta kuis live kelas yang menyenangkan.
3. **Masyarakat Umum & Peserta Luar Sapen**:
   - Pengguna umum dari luar wilayah Sapen yang ingin belajar mandiri dengan mendaftar menggunakan email dan nama lengkap, serta dapat mengakses kelas dan modul materi secara terstruktur.
4. **Peserta KKN & Pengajar Relawan**:
   - Mahasiswa KKN atau pengajar komunitas yang bertindak sebagai **Host** untuk memandu jalannya kuis interaktif di depan kelas atau balai RW menggunakan proyektor/laptop, sementara murid menjawab serentak menggunakan ponsel masing-masing.
5. **Pengurus & Developer Sistem**:
   - Pengelola platform yang memegang kendali penuh atas manajemen kelas, pengunggahan PDF modul, pembuatan bank soal kuis/game, pemantauan peserta, verifikasi kode akses, dan moderasi ulasan pengguna.

---

## 2. TECH STACK

Daftar teknologi, pustaka, dan bahasa pemrograman yang digunakan (berdasarkan `package.json` dan struktur proyek):

- **Framework Utama**: [Next.js](https://nextjs.org/) versi **15.3.0** (App Router architecture, React Server Components & Server Actions).
- **Bahasa Pemrograman**: [TypeScript](https://www.typescriptlang.org/) versi **5.7.3** (Strict type-checking aktif, zero compile errors).
- **Library UI / View**: [React](https://react.dev/) versi **19.0.0** & **React-DOM** 19.0.0.
- **Styling & CSS**:
  - [Tailwind CSS](https://tailwindcss.com/) versi **3.4.17** dengan plugin utilitas kustom.
  - [PostCSS](https://postcss.org/) & [Autoprefixer](https://github.com/postcss/autoprefixer).
- **Ikonografi**: [Lucide React](https://lucide.dev/) versi **0.475.0** (set ikon SVG profesional, konsisten di seluruh antarmuka).
- **Mesin Flipbook 3D**: [page-flip](https://github.com/Nodlik/StPageFlip) versi **2.0.7** (efek simulasi buku fisik pada canvas, drag sudut halaman, responsif mobile/desktop).
- **Pengolahan & Konversi Dokumen PDF**:
  - [pdfjs-dist](https://github.com/mozilla/pdf.js) versi **4.10.38** (rendering client-side PDF ke gambar WebP beresolusi tinggi).
  - [jszip](https://stuk.github.io/jszip/) versi **3.10.2** (pengemasan otomatis semua halaman flipbook ke arsip ZIP saat diunduh peserta).
- **Efek Gamifikasi**: [canvas-confetti](https://github.com/catdad/canvas-confetti) versi **1.9.3** (animasi konfeti perayaan kemenangan kuis dan podium leaderboard).
- **Real-Time Communication**: Native **Server-Sent Events (SSE)** melalui HTTP Streaming Next.js (sinkronisasi host-player sesi game live kuis tanpa ketergantungan WebSocket pihak ketiga).
- **Audio Synthesizer**: Native Web Audio API (efek suara gemerisik kertas saat halaman flipbook dibalik secara dinamis tanpa aset file audio statis berat).
- **Database & Penyimpanan Data**:
  - **Local Persistence (Default & Fallback)**: File-based JSON Database tersimpan di `.data/db.json` dengan locking aman.
  - **Private Storage**: Folder lokal `.data/private-pages/` untuk menyimpan lembar halaman WebP hasil konversi PDF modul berproteksi.
  - **Cloud Database (Opsional)**: [@supabase/supabase-js](https://supabase.com/) versi **2.49.1** (konektor PostgreSQL dan Supabase Storage jika environment variable cloud diaktifkan).
- **Autentikasi & Keamanan**:
  - Signed HMAC-SHA256 URL token untuk mencegah pembajakan dan hotlinking file materi (`createSignedPageUrl`).
  - Sesi Cookie HTTP-Only dengan masa kedaluwarsa otomatis.
  - Proteksi cetak CSS `@media print` dan watermark otomatis nama peserta untuk mencegah pembocoran dokumen.

---

## 3. STRUKTUR FOLDER

Berikut struktur direktori utama proyek beserta penjelasan fungsi setiap bagian:

```text
WebsiteKampungInggris/
├── .data/                                # Folder database lokal & file privat
│   ├── db.json                           # Database lokal utama (modul, kelas, kode, warga, testimoni)
│   └── private-pages/                    # Direktori penyimpanan gambar halaman WebP hasil upload PDF
├── public/                               # File statis publik (favicon, foto ilustrasi, banner)
├── src/                                  # Kode sumber aplikasi
│   ├── app/                              # Next.js App Router (Routing, Layout, dan API Endpoints)
│   │   ├── admin/                        # Panel kendali Pengurus & Developer
│   │   │   ├── login/page.tsx            # Halaman login khusus pengurus & developer
│   │   │   └── page.tsx                  # Halaman dasbor admin utama (sinkronisasi query tab)
│   │   ├── api/                          # REST API Endpoints & Server-Sent Events
│   │   │   ├── admin/                    # Endpoint khusus admin (classes, modules, games, warga, dll)
│   │   │   ├── auth/                     # Autentikasi warga RW, member umum, admin, dan sesi
│   │   │   ├── checkout/enroll/          # Pendaftaran mandiri kelas belajar oleh peserta umum
│   │   │   ├── game/live/                # Endpoint kuis live SSE (create, join, action, answer, stream)
│   │   │   ├── leaderboard/              # Data peringkat kuis mingguan
│   │   │   ├── payments/                 # Konfirmasi & pembuatan transaksi pembayaran
│   │   │   ├── reader/[slug]/            # Pengambilan metadata pembaca & signed page URLs
│   │   │   └── secure-page/[moduleId]/   # Pengiriman gambar halaman materi berproteksi HMAC
│   │   ├── game/                         # Modul permainan edukatif
│   │   │   ├── [gameId]/page.tsx         # 5 Game mandiri (telling-time, word-match, dll)
│   │   │   ├── host/                     # Halaman host kuis live (layar laptop/proyektor kelas)
│   │   │   ├── join/page.tsx             # Halaman bergabung game via PIN
│   │   │   ├── play/[pin]/page.tsx       # Layar kendali tombol jawaban player di HP
│   │   │   └── page.tsx                  # Beranda portal game interaktif
│   │   ├── kelas/                        # Modul Program Kelas Terpadu
│   │   │   ├── [slug]/page.tsx           # Rincian kelas, silabus modul, & form checkout mandiri
│   │   │   └── page.tsx                  # Katalog seluruh kelas yang tersedia
│   │   ├── leaderboard/page.tsx          # Papan skor dan peringkat mingguan peserta
│   │   ├── login/page.tsx                # Halaman masuk (Tab 1: Warga Sapen, Tab 2: Peserta Umum)
│   │   ├── masuk/page.tsx                # Alias pengalihan rute login
│   │   ├── materi/                       # Modul Materi Belajar
│   │   │   ├── [slug]/page.tsx           # Pembaca materi cerdas (Flipbook 3D atau Teks HTML)
│   │   │   └── page.tsx                  # Katalog materi dengan filter level & pencarian
│   │   ├── modul/                        # Alias pengalihan rute materi
│   │   ├── paket/page.tsx                # Daftar paket langganan & informasi rekening kas warga
│   │   ├── globals.css                   # Pengaturan CSS global, proteksi cetak, dan tipografi
│   │   ├── layout.tsx                    # Root layout (Navbar, Footer, font Nunito, Suspense boundary)
│   │   ├── loading.tsx                   # Loading state global saat pergantian rute
│   │   ├── not-found.tsx                 # Halaman error 404 ramah pengguna
│   │   └── page.tsx                      # Beranda publik (Hero, Unggulan, Statistik, FAQ, Testimoni)
│   ├── components/                       # Komponen antarmuka React (Reusable UI)
│   │   ├── admin/                        # Komponen khusus panel admin
│   │   │   ├── AdminClassesManager.tsx   # Pengelola program kelas, modul gabungan, & durasi hari
│   │   │   ├── AdminTestimoniManager.tsx # Moderasi & persetujuan ulasan pengguna
│   │   │   └── AdminWargaManager.tsx     # Pemantauan data warga, peserta aktif, & reset sesi
│   │   ├── game/                         # Komponen kuis live real-time
│   │   │   ├── GamePinForm.tsx           # Input PIN 6 digit responsif di HP
│   │   │   ├── HostCreateClient.tsx      # Pemilihan template soal kuis live untuk host
│   │   │   ├── HostLiveSessionClient.tsx # Layar utama host kuis live (timer, soal, podium)
│   │   │   ├── JoinGameClient.tsx        # Alur bergabung player ke kuis live
│   │   │   └── PlayerLiveGameClient.tsx  # 4 Tombol warna-warni jawaban di layar ponsel player
│   │   ├── games/                        # 5 Komponen permainan single-player
│   │   │   ├── QuickQuizGame.tsx         # Kuis pilihan ganda kilat
│   │   │   ├── StoryQuestGame.tsx        # Membaca cerita pendek & menjawab pemahaman bacaan
│   │   │   ├── TellingTimeGame.tsx       # Latihan interaktif membaca jam dinding & waktu
│   │   │   ├── WordBuilderGame.tsx       # Menyusun huruf acak menjadi kata utuh
│   │   │   └── WordMatchGame.tsx         # Mencocokkan pasangan kata Bahasa Inggris & Artinya
│   │   ├── AdminDashboardClient.tsx      # Komponen utama Dasbor Pengurus/Developer
│   │   ├── FaqAccordion.tsx              # Accordion tanya-jawab interaktif di beranda
│   │   ├── FlipbookViewer.tsx            # Penampil buku digital 3D dengan suara balik kertas
│   │   ├── Footer.tsx                    # Footer multi-kolom informasi platform & kontak
│   │   ├── InteractiveGamesSuite.tsx     # Hub mini-game kosakata dan flashcard suara
│   │   ├── MateriReader.tsx              # Pembaca materi HTML responsif teks, audio TTS, & latihan
│   │   ├── ModulCatalogFilter.tsx        # Filter tingkat kesulitan & pencarian modul materi
│   │   ├── ModuleCatalogCard.tsx         # Kartu tampilan ringkas modul materi
│   │   ├── Navbar.tsx                    # Header navigasi sticky adaptif (publik vs admin)
│   │   ├── SubscriptionCheckoutClient.tsx# Antarmuka pembayaran & aktivasi paket belajar
│   │   └── TestimoniSection.tsx          # Form ulasan (khusus user login) & carousel testimoni
│   ├── config/
│   │   └── site.ts                       # Konfigurasi terpusat nama platform, kontak, & feature flags
│   └── lib/                              # Utilitas logika backend, autentikasi, & basis data
│       ├── auth.ts                       # Validasi token sesi, HMAC signer, & otorisasi hak akses
│       ├── db.ts                         # Layer abstraksi database (JSON lokal & Supabase)
│       ├── game-session.ts               # In-memory broker & state machine sesi kuis live SSE
│       ├── page-svg.ts                   # Generator vektor visual buku digital bawaan (seed)
│       ├── payment.ts                    # Logika checkout, Midtrans Snap SDK, & rekening komunitas
│       ├── rw-auth.ts                    # Verifikasi kode akses RW 06, RW 07, RW 08
│       ├── seed-data.ts                  # Data awal modul pembelajaran, bank soal, dan paket
│       ├── supabase.ts                   # Klien inisialisasi Supabase cloud
│       └── types.ts                      # Definisi tipe TypeScript lengkap seluruh model platform
├── supabase/                             # Skrip skema database PostgreSQL
├── package.json                          # Manifest dependensi dan skrip proyek
├── tailwind.config.ts                    # Konfigurasi token warna, font, dan animasi Tailwind
└── tsconfig.json                         # Konfigurasi compiler TypeScript
```

---

## 4. FITUR YANG SUDAH JADI (100% Selesai)

Berikut adalah daftar fitur yang sudah selesai dikerjakan, teruji fungsional, dan berjalan stabil di mode produksi:

1. **Halaman Beranda Publik (`src/app/page.tsx`)**:
   - Hero section ramah pengguna dengan sapaan komunitas, judul utama terarah, dan 2 tombol aksi utama (*Mulai Belajar* & *Gabung Game*).
   - Katalog materi unggulan dengan indikator status akses (gratis untuk warga / terkunci).
   - Bagian 4 keunggulan platform dengan ikon visual SVG konsisten.
   - Papan statistik interaktif berbasis data riil dari database (bukan angka buatan).
   - Daftar paket belajar dengan status pembayaran transparan.
   - Accordion FAQ interaktif (`src/components/FaqAccordion.tsx`).
   - Bagian testimoni riil (`src/components/TestimoniSection.tsx`) yang terhubung langsung dengan sistem moderasi admin.
2. **Navigasi Sticky Adaptif (`src/components/Navbar.tsx`)**:
   - **Mode Publik**: Menu Beranda, Kelas, Materi, Game, Paket, Tentang, FAQ, serta tombol Masuk.
   - **Mode Pengurus & Developer**: Mengubah menu secara otomatis menjadi 7 navigasi kerja dasbor admin (*Program Kelas, Upload PDF, Soal & Game, Peserta, Ulasan, Sistem & Langganan, Kode Akses*) lengkap dengan tombol pintas *Kuis Live* dan *Pratinjau Web*.
   - Badge profil pengguna menampilkan nama lengkap (tidak terpotong) beserta indikator peran resmi.
   - Navigasi laci (*hamburger drawer*) dan bar navigasi bawah khusus ponsel pintar.
3. **Sistem Login Ganda (`src/app/login/page.tsx`)**:
   - **Jalur Warga Sapen**: Login instan hanya dengan *Nama Panggilan* dan *Kode Akses Warga* (format 3 huruf-tanda hubung-3 huruf, contoh: `QTU-OP3`). Tanda hubung opsional dan tidak peka huruf besar/kecil. Penentuan RW dilakukan otomatis di sisi server tanpa menuntut warga memilih RT/RW di layar.
   - **Jalur Peserta Umum**: Login cepat menggunakan Nama Lengkap dan Alamat Email.
4. **Login Khusus Pengurus & Developer (`src/app/admin/login/page.tsx`)**:
   - Form kredensial aman untuk akun `pengurus@kampungsapen.id` dan `dev@kampungsapen.id`.
   - Pembatasan hak akses (*auth guard*) ketat; pengguna biasa atau umum otomatis dialihkan jika mencoba membuka rute `/admin`.
5. **Penampil Buku Digital Flipbook 3D (`src/components/FlipbookViewer.tsx`)**:
   - Menggunakan engine canvas `page-flip` berukuran besar yang nyaman dibaca di layar laptop maupun ponsel.
   - Efek suara gemerisik saat membalik halaman menggunakan Web Audio API (dapat dinyalakan/dibisukan).
   - Mode Layar Penuh (*Fullscreen*) dan indikator halaman aktif.
   - Tombol unduh semua halaman buku menjadi 1 file ZIP utuh (`jszip`).
   - Proteksi cetak CSS `@media print` dan pencegahan seleksi/drag gambar materi.
6. **Pembaca Materi Teks HTML Responsif (`src/components/MateriReader.tsx`)**:
   - Penyajian materi tanpa gambar berat: bab terstruktur, tabel kosakata, dialog dua orang, dan catatan tips bahasa Inggris.
   - Fitur pelafalan suara Text-to-Speech (TTS) langsung dari browser untuk melatih pendengaran peserta.
   - Bagian Tugas & Latihan Mandiri dinamis (hanya muncul jika admin mengaktifkan tugas pada modul tersebut).
7. **Katalog Materi & Filter Cerdas (`src/app/materi/page.tsx`)**:
   - Pencarian materi berdasarkan judul dan topik.
   - Filter cepat berdasarkan tingkat kemahiran (*Semua Level, Pemula, Menengah, Mahir*).
   - Kartu materi dinamis (`src/components/ModuleCatalogCard.tsx`) dengan lencana kategori dan tema warna khusus.
8. **Pengelolaan Program Kelas Terpadu (`src/app/kelas/page.tsx` & `src/components/admin/AdminClassesManager.tsx`)**:
   - Admin dapat membuat program kelas yang menampung banyak modul materi dan template kuis live.
   - Penentuan harga kelas (IDR) dan durasi masa aktif belajar (jumlah hari) oleh pengurus/developer.
   - Halaman detail kelas (`src/app/kelas/[slug]/page.tsx`) dengan alur pendaftaran mandiri (*Self-Enrollment*) bagi peserta umum.
9. **Kuis Live Real-Time ala Kahoot (`src/app/game/...`)**:
   - Arsitektur berbasis Server-Sent Events (SSE) tanpa ketergantungan server luar.
   - **Layar Host (`/game/host/[pin]`)**: Dibatasi hanya untuk pengurus/developer. Menampilkan PIN 6 angka, daftar murid yang bergabung secara live, timer countdown, pembahasan soal, dan panggung podium juara 1, 2, dan 3.
   - **Layar Player Mobile (`/game/play/[pin]`)**: Tampilan 4 tombol geometris warna-warni (Segitiga Merah, Wajik Biru, Lingkaran Kuning, Kotak Hijau) yang responsif dengan feedback getar/skor langsung.
10. **5 Game Mandiri Single-Player (`src/app/game/[gameId]/page.tsx`)**:
    - *Telling the Time*: Latihan membaca dan menebak waktu pada jam dinding.
    - *Vocabulary Match*: Menjodohkan kartu kosakata Bahasa Inggris dengan padanan Bahasa Indonesia.
    - *Word Builder*: Menyusun huruf teracak (*anagram*) menjadi kata yang benar.
    - *Story Quest*: Membaca narasi pendek dan menjawab pertanyaan komprehensif.
    - *Quick Quiz*: Kuis kilat pilihan ganda tata bahasa dengan skor langsung.
11. **Papan Peringkat / Leaderboard Komunitas (`src/app/leaderboard/page.tsx`)**:
    - Menampilkan peringkat mingguan per modul/game dari peserta warga maupun peserta umum.
12. **Moderasi Ulasan / Testimoni (`src/components/admin/AdminTestimoniManager.tsx`)**:
    - Form pemberian ulasan hanya muncul di beranda jika peserta sudah dalam keadaan login.
    - Form ulasan netral (tanpa memaksa input RT/RW).
    - Panel admin untuk menyetujui (*Approve*) atau menghapus ulasan sebelum ditampilkan ke publik.
13. **Generator & Validasi Kode Akses RW (`src/app/api/admin/rw-codes/route.ts`)**:
    - Panel admin untuk melihat dan me-regenerate kode akses RW 06, RW 07, dan RW 08 secara acak dan terenkripsi HMAC.
14. **Proteksi Hak Akses & Keamanan Berkas (`src/lib/auth.ts` & `/api/secure-page/...`)**:
    - Setiap gambar halaman materi dilindungi Signed URL berbatas waktu (TTL).
    - Pencegahan akses dokumen secara langsung via tab browser tanpa melalui flipbook reader.

---

## 5. FITUR YANG BELUM JADI / SETENGAH JADI (50% / 0%)

Bagian ini mencatat hal-hal yang belum selesai, masih bersifat *dummy*, atau membutuhkan penyempurnaan di masa mendatang:

### A. Fitur Setengah Jadi (50%)
1. **Fitur Pembayaran Otomatis Payment Gateway (Status: 50% - Dimatikan Sementara)**:
   - **Kondisi Saat Ini**: Feature flag `PAYMENT_ENABLED = false` diatur di `src/config/site.ts`. Tombol checkout otomatis di halaman paket bertuliskan *"Pembayaran segera dibuka"*.
   - **Yang Sudah Ada**: Struktur kode integrasi Midtrans Snap (`src/lib/payment.ts`, `/api/payments/create`, `/api/payments/confirm`) sudah tersedia di codebase.
   - **Yang Belum**: Kredensial produksi Midtrans (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`) belum dipasang di environment produksi (saat ini masih bernilai dummy). Pengurus saat ini menerima pembayaran transfer manual ke rekening kas komunitas atau memberikan akses via form admin manual.
2. **Sinkronisasi Database Cloud Supabase (Status: 50% - Menggunakan Fallback JSON Lokal)**:
   - **Kondisi Saat Ini**: Aplikasi berjalan stabil menggunakan database file lokal `.data/db.json` dan penyimpanan folder `.data/private-pages/`.
   - **Yang Sudah Ada**: Berkas skema SQL migrasi (`supabase/migrations/`) dan wrapper klien Supabase (`src/lib/supabase.ts`) sudah dibuat.
   - **Yang Belum**: Sinkronisasi data otomatis antara `.data/db.json` lokal dengan tabel cloud Supabase belum ada jika suatu saat sistem dipindahkan secara permanen ke Supabase managed Postgres.
3. **Otomatisasi Konversi Dokumen PDF di Sisi Server (Status: 50%)**:
   - **Kondisi Saat Ini**: Pengurus mengunggah file PDF melalui browser, kemudian browser me-render canvas per halaman menggunakan `pdfjs-dist` dan mengunggah lembar gambar WebP satu demi satu ke server.
   - **Yang Belum**: Worker background server-side (misal menggunakan tool backend) untuk mengolah berkas PDF yang sangat tebal (di atas 100 halaman) secara asinkron di server tanpa membebani browser laptop pengurus.

### B. Fitur yang Belum Dikerjakan (0%)
1. **Ekspor Laporan & Rekapitulasi Data (Status: 0%)**:
   - Belum tersedia tombol *Export to Excel/CSV* atau cetak PDF rekapitulasi data pada panel admin (misalnya: ekspor daftar warga terdaftar, absensi perangkat login, dan riwayat siswa kelas).
2. **Integrasi Notifikasi Otomatis WhatsApp / Email (Status: 0%)**:
   - Belum ada integrasi gateway pengiriman email (seperti Nodemailer/Resend) atau WhatsApp API (seperti Fonnte/Waha) untuk mengirimkan notifikasi kwitansi pembayaran kelas atau pengingat sisa masa aktif belajar kepada peserta umum.
3. **Sertifikat Digital Otomatis (Status: 0%)**:
   - Belum ada generator sertifikat digital otomatis (PDF/gambar bertanda tangan pengurus) saat peserta menyelesaikan 100% materi dan lulus tugas mandiri di suatu kelas.

---

## 6. DESIGN SYSTEM YANG SUDAH DIPAKAI

Untuk menjaga konsistensi visual dan menghindari tampilan yang berantakan atau terlihat seperti *template AI*, aturan desain berikut **wajib dipatuhi**:

### Palet Warna Resmi
- **Warna Utama (Primary)**:
  - Hijau Hutan (*Forest/Emerald Green*): `#14532D` (Tailwind: `sapen-900` / `primary`)
  - Varian Gelap (Hover/Active): `#0F3F22` (Tailwind: `primary-dark`)
  - Varian Sangat Muda (Background lembut/Badge): `#F0FDF4` (Tailwind: `green-50` / `sapen-50`)
- **Warna Aksen (Accent)**:
  - Amber / Emas Hangat: `#F59E0B` (Tailwind: `accent`)
  - Varian Aksen Hover: `#D97706` (Tailwind: `accent-hover`)
- **Warna Netral & Latar Belakang**:
  - Latar Halaman: Putih `#FFFFFF` dan Abu-abu Terang `#F9FAFB` / `#F3F4F6`.
  - Garis Pembatas (Border): `#E5E7EB` (Tailwind: `border-gray-200`) atau `#DCFCE7` (garis hijau muda).
  - Teks Utama (Headings): `#111827` (Gray 900) dengan `font-extrabold` atau `font-black`.
  - Teks Isi Paragraf: `#4B5563` (Gray 600) dengan ukuran standar minimal `16px` di HP.
- **Warna Flipbook Reader (Dark Mode Khusus Pembaca)**:
  - Latar Reader: `#0D1117` / `#0F172A` (Slate/Dark 950) agar mata pembaca nyaman dan kontras modul terlihat jelas.

### Tipografi
- **Font Utama**: **Nunito** (`system-ui, -apple-system, sans-serif`), dimuat via Google Fonts di `src/app/layout.tsx`.
- Karakter huruf: Bersahabat, membulat (*rounded terminals*), jelas dibaca di layar ponsel, dan tidak kaku.
- **Dilarang keras**: Menambahkan font pihak ketiga baru yang membuat waktu unduh halaman bertambah lambat.

### Karakteristik Komponen UI
- **Sudut Lengkung (Border Radius)**: Konsisten menggunakan `rounded-xl` (12px) untuk tombol dan input form, serta `rounded-2xl` atau `rounded-3xl` (16px–24px) untuk kartu (*card*) dan kontainer.
- **Style Tombol**:
  - Tombol Primer: Latar `#14532D`, teks putih, `font-extrabold`, efek transisi hover `#0F3F22`, bayangan tipis `shadow-sm`.
  - Tombol Sekunder: Latar putih, border garis 2px `#14532D`, teks `#14532D`, hover `bg-green-50`.
  - Tombol Aksi Kuis/CTA: Latar `#F59E0B`, teks gelap `text-gray-900`, `font-extrabold`.
  - Ukuran Sentuh (*Touch Target*): Wajib memiliki tinggi minimal `44px` (`min-h-[44px]` atau `py-2.5` ke atas) agar mudah ditekan di layar sentuh HP.
- **Style Kartu (*Card*)**:
  - Latar belakang putih solid, border halus 1px `#E5E7EB`, sudut melengkung `rounded-2xl`, bantalan dalam lega (`p-5` hingga `p-7`), dan bayangan tipis (`shadow-sm`).
- **Ikonografi**:
  - Seluruh ikon wajib menggunakan **Lucide React** (`lucide-react`) dalam bentuk vektor monokromatik. Dilarang mengganti ikon dengan emoji karakter biasa pada tombol utama.

---

## 7. CARA MENJALANKAN PROJECT

Panduan menjalankan website pada sistem operasi Windows menggunakan PowerShell atau Command Prompt:

### Kebutuhan Sistem
- **Node.js**: Versi 18.18.0 atau lebih baru (Disarankan Node.js LTS v20.x atau v22.x).
- **Package Manager**: `npm` (bawaan Node.js).

### 1. Instalasi Dependensi
```powershell
# Masuk ke direktori proyek
cd "C:\Users\Orikonba Ronsumbre\Documents\WebsiteKampungInggris"

# Install seluruh paket dependensi
npm install
```

### 2. Menjalankan Mode Produksi (Sangat Direkomendasikan)
*Mode produksi telah teroptimasi dengan kompresi gzip/brotli, code-splitting otomatis, dan waktu muat halaman < 3 detik.*
```powershell
# 1. Bangun berkas produksi teroptimasi
npm run build

# 2. Jalankan server produksi di Port 3000
npm run start -- -p 3000
```
Buka browser Anda di: **`http://localhost:3000`**

### 3. Menjalankan Mode Pengembangan (Development)
*Gunakan mode ini hanya jika Anda sedang aktif mengedit kode sumber:*
```powershell
npm run dev -- -p 3000
```

### 4. Pengecekan Error TypeScript
Sebelum melakukan commit atau rilis, selalu pastikan tidak ada kesalahan tipe:
```powershell
npx tsc --noEmit
```

---

## 8. CATATAN PENTING UNTUK AI BERIKUTNYA

> [!CAUTION]
> **5 ATURAN WAJIB BAGI ASISTEN AI / DEVELOPER SELANJUTNYA:**
>
> 1. **JANGAN MENGUBAH FILE YANG SUDAH JADI TANPA IZIN SPESIFIK**:
>    Dilarang merombak ulang (*rewrite*) arsitektur yang sudah berjalan stabil (misal: FlipbookViewer, SSE Game Session, Sistem Login Warga RW, Navbar Admin).
> 2. **JANGAN MENGUBAH WARNA, FONT, ATAU DESAIN YANG SUDAH KONSISTEN**:
>    Tetap gunakan warna utama `#14532D`, aksen `#F59E0B`, dan font `Nunito`. Dilarang menambahkan gradien ungu-biru neon, efek glassmorphism berlebihan, atau gaya visual yang merusak identitas profesional platform.
> 3. **JIKA MAU MENAMBAH FITUR BARU, BUAT FILE BARU, JANGAN TIMPA FILE LAMA**:
>    Gunakan pemisahan komponen modular. Buat file baru di subfolder yang sesuai (`src/components/` atau `src/lib/`) dan impor dengan rapi.
> 4. **SELALU CEK FILE INI (`PROJECT-STATUS.md`) SEBELUM MULAI BEKERJA**:
>    Pahami fitur mana yang sudah 100% selesai dan fitur mana yang masih tertunda agar tidak mengulang pekerjaan yang sudah ada.
> 5. **KERJAKAN 1 FITUR DALAM 1 SESI, JANGAN SEKALIGUS**:
>    Fokus menyelesaikan satu tugas spesifik hingga teruji bebas error (`npx tsc --noEmit` & `npm run build`), jangan mencoba merombak banyak file sekaligus dalam satu giliran.

---

## 9. LANGKAH SELANJUTNYA YANG DISARANKAN

Urutan 5 prioritas tugas pengembangan berikutnya dari yang paling penting:

1. **Aktivasi Gateway Pembayaran Midtrans Produksi**:
   - Jika pengurus telah siap menerima pembayaran otomatis dari peserta luar/umum, masukkan kredensial `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY` ke `.env.local` dan ubah `PAYMENT_ENABLED = true` di `src/config/site.ts`.
2. **Fitur Ekspor Rekapitulasi Data (Excel/CSV)**:
   - Menambahkan tombol unduh laporan data peserta warga, status kelas aktif, dan riwayat nilai kuis dalam format CSV/Excel pada tab *Peserta & Akses* di dasbor admin.
3. **Penyempurnaan Form Tambah Soal Game Kuis**:
   - Melengkapi antarmuka admin untuk menambahkan variasi soal bergambar pada modul *Story Quest* dan *Telling the Time* secara visual dari dasbor.
4. **Sistem Notifikasi Pengingat Masa Aktif**:
   - Mengimplementasikan pengiriman email notifikasi otomatis (misal menggunakan Resend/Nodemailer) saat masa akses kelas peserta umum tersisa 3 hari.
5. **Generator Sertifikat Kelulusan Digital**:
   - Membuat halaman atau generator sertifikat PDF ber-QR code verifikasi setelah peserta menyelesaikan seluruh modul dan latihan mandiri dalam sebuah kelas.

---
*Dokumen ini diperbarui secara otomatis pada tanggal 9 November 2026.*
