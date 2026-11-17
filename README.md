# Sapen English — Platform Belajar Bahasa Inggris Warga Kampung Sapen

## Fitur Game Builder dan sesi tatap muka

- Buka **/admin** → **Kelola Game** untuk membuat game dari tujuh template. Draf divalidasi dengan `src/lib/game.schema.json`, autosave ke tabel Supabase `game_blueprints`, dan bisa diterbitkan ke katalog **/games**. Jika Supabase belum dikonfigurasi, data tersimpan pada database lokal aplikasi.
- Satu baris CSV/Excel berisi satu soal. Untuk template pilihan ganda, gunakan urutan kolom: pertanyaan, pilihan A–E, indeks jawaban benar (indeks dimulai dari `0`). Teks juga dapat ditempel langsung di editor.
- Runtime menerima blueprint JSON, bukan komponen khusus per game. Tambahkan template dengan memperbarui enum dan `allOf` di `src/lib/game.schema.json`, tipe/template di `src/lib/game-blueprint.ts`, editor dan renderer di `GameBuilderClient.tsx` serta `BlueprintGameClient.tsx`, lalu sertakan data contoh tervalidasi.
- Tiga contoh data siap digunakan ada di `data/games/`: **Telling the Time**, **Sort It Out: Around Sapen**, dan **Describing a Place in Jogja**.
- Tutor membuka **/tutor/sesi** (atau Pengurus → **Sesi Tatap Muka**) untuk membuat sesi, membagikan kode/QR, mengatur persetujuan, dan mengekspor CSV. Sesi terhubung ke Kelas terbit; materi dan game dibuka dari kelas induk. Terapkan migrasi di Supabase SQL Editor berurutan: `20261117150000_game_blueprints.sql`, `20261117160000_class_sessions_and_attendance.sql`, `20261117170000_live_game_avatars_teams.sql`, lalu `20261118120000_sessions_from_classes.sql`. Migrasi terakhir mempertahankan sesi/presensi lama; baris sesi lama tanpa kelas perlu dipetakan manual ke Kelas sebelum dibagikan. Sesi live `/game/host` membagi peserta ke tim Daun dan Mentari, menampilkan avatar, dan membatasi sesi hingga 50 peserta.
- Jalankan pemeriksaan skema dan logika yang tersedia dengan `npm test`; tipe dengan `npx tsc --noEmit`; lint dengan `npm run lint`.

Platform pembelajaran Bahasa Inggris modern, cepat, dan mobile-first untuk warga Kampung Sapen (RW 06, RW 07, RW 08, Kelurahan Demangan, Gondokusuman, Yogyakarta) dan pembelajar umum.

---

## 🚀 Panduan Menjalankan Website (Mode Produksi & Mode Pengembangan)

### Mode Produksi (Sangat Direkomendasikan untuk Kecepatan Maksimal <3 Detik)
Mode produksi mengaktifkan kompresi gzip/brotli, code-splitting otomatis, optimasi bundle JavaScript (hanya ~103 kB), dan caching aset statis 1 tahun:

```bash
# 1. Masuk ke direktori project
cd "C:\Users\Orikonba Ronsumbre\Documents\WebsiteKampungInggris"

# 2. Bangun aset produksi yang teroptimasi
npm run build

# 3. Jalankan server produksi di port 3000
npm run start -- -p 3000
```
Buka browser di: **http://localhost:3000**

### Mode Pengembangan (Development)
```bash
npm run dev
```

---

## ⚡ Hasil Uji Kecepatan & Benchmark Performa

| Halaman | URL Resmi | Waktu Respon | Ukuran Transfer | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Beranda** | `/` | **3.0 s** | 113 KB | 200 OK |
| **Login Warga & Umum** | `/login` | **0.6 s** | 29 KB | 200 OK |
| **Katalog Materi** | `/materi` | **1.0 s** | 72 KB | 200 OK |
| **Pembaca Materi HTML** | `/materi/grammar-basic` | **0.6 s** | 45 KB | 200 OK |
| **Live Game (PIN Kuis)**| `/game` | **0.7 s** | 56 KB | 200 OK |
| **Layar Player Mobile** | `/game/join` | **0.3 s** | 29 KB | 200 OK |
| **Layar Host Proyektor**| `/game/host` | **0.4 s** | 35 KB | 200 OK |
| **Daftar Paket Belajar**| `/paket` | **0.9 s** | 61 KB | 200 OK |
| **Panel Login Admin**   | `/admin/login` | **0.4 s** | 28 KB | 200 OK |

*Catatan: Pembaca materi HTML teks responsif (`MateriReader.tsx`) menggantikan canvas flipbook gambar yang berat, sehingga konsumsi memori di ponsel berkurang hingga 85%.*

---

## 🔑 Sistem Login & Hak Akses

### 1. Warga Kampung Sapen (100% Akses Gratis)
Warga tidak perlu mengingat email atau kata sandi. Cukup memasukkan **Nama Panggilan** dan **Kode Akses RW**:
- **RW 06**: `QTU-OP3` (atau `qtuop3`, tanda hubung opsional)
- **RW 07**: `MXR-7KA`
- **RW 08**: `BNJ-5WF`

*Setiap warga yang login otomatis terdaftar di database, memiliki profil tersendiri, dan mendapatkan akses gratis tanpa batas ke seluruh modul pembelajaran.*

### 2. Akun Admin / Pengurus
- URL: **http://localhost:3000/admin/login**
- **Pengurus**: `pengurus@kampungsapen.id` / Sandi: `sapen2026`
- **Developer**: `dev@kampungsapen.id` / Sandi: `devsapen2026`

---

## 🎮 Game Kuis Kelas Real-Time ala Kahoot

Sistem game dirancang khusus untuk interaksi kelas antara pengajar (host) dan warga/murid (player) menggunakan teknologi **Server-Sent Events (SSE)** tanpa memerlukan server WebSocket eksternal.

### Alur Host (Pengajar / Layar TV Proyektor):
1. Buka **/game/host** di laptop atau komputer depan kelas.
2. Pilih 1 dari 5 template kuis:
   - *Telling the Time* (Waktu & Jam)
   - *Vocabulary Match* (Kosakata Harian)
   - *Word Builder* (Menyusun Kalimat)
   - *Story Quest* (Membaca & Memahami Teks)
   - *Quick Quiz* (Kuis Kilat Tata Bahasa)
3. Klik **"Buka Layar Sesi Live Sekarang"**.
4. Sistem menampilkan **PIN 6 Angka** besar, tautan cepat, dan daftar peserta yang terhubung secara langsung.
5. Host mengontrol jalannya soal, countdown timer, pembahasan (reveal), dan layar podium juara 1, 2, dan 3.

### Alur Player (Warga / Murid di HP):
1. Buka **/game** atau **/game/join** di browser HP.
2. Masukkan PIN 6 digit dan nama panggilan.
3. Saat soal dimulai, layar HP berubah menjadi 4 tombol warna-warni berukuran besar:
   - ▲ Segitiga Merah
   - ◆ Wajik Biru
   - ● Lingkaran Kuning
   - ■ Kotak Hijau
4. Kirim jawaban secepat mungkin untuk mendapatkan bonus kecepatan dan menduduki puncak podium.

---

## 💳 Pengelolaan Pembayaran & Paket Belajar

- **Status Saat Ini**: `PAYMENT_ENABLED = false` (Fitur pembayaran otomatis sementara ditutup, tombol publik bertuliskan *"Pembayaran segera dibuka"*).
- **Pemberian Akses Manual**: Pengurus dapat memberikan akses materi berbayar kepada murid les umum atau donatur secara manual melalui menu **Panel Admin (/admin) -> Tab Transaksi & Pembayaran -> Form Beri Akses Materi Manual**.
