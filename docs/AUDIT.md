# Audit Repo: Game Builder dan Peserta Kelas Luar

Tanggal audit: 17 November 2026

## Ringkasan

- Aplikasi menggunakan Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, dan Supabase (Auth, Postgres, Storage). `xlsx` sudah tersedia untuk kebutuhan impor spreadsheet.
- Halaman dan API berada di `src/app`; UI game admin utamanya berada di `src/components/admin/AdminGameManager.tsx`.
- Data game tersimpan dalam tabel `games` dan `game_soal`; isi soal berupa JSONB tetapi belum memakai schema validator runtime. Data tipe aplikasi didefinisikan sebagai union `GameKind` dan `GameQuestion` di `src/lib/types.ts`.
- Autentikasi aplikasi memakai cookie sesi HMAC dan role `pengurus`, `developer`, `peserta`, `umum`. Tabel Supabase `profiles` mempunyai nilai role lain (`pengurus`, `developer`, `peserta`, `umum`) serta `origin_type` warga/luar. Belum ada role eksplisit `tutor`, `member`, atau `guest` seperti kebutuhan produk.
- Kelas berbayar dan enrollment sudah ada. Sesi game kelas memakai `game_sessions` dan `game_session_players` (migrasi `20261117130000_live_game_sessions.sql`) dengan endpoint join/answer/action dan stream SSE. Ini dapat menjadi dasar mode realtime; tidak perlu memperkenalkan layanan websocket baru.
- Belum ditemukan model sesi kelas tatap muka, formulir pendaftaran tamu per sesi, presensi QR/kode, kuota/approval sesi, maupun ekspor daftar hadir.

## Kondisi UI pembuat soal

`AdminGameManager` saat ini memakai dua tab/langkah: memilih game master, lalu mengedit soal. Jenis soal menentukan bidang editor; editor mendukung penambahan, penghapusan, pengurutan naik/turun, upload gambar, dan beberapa bentuk jawaban. Penyimpanan dilakukan manual ke API admin dan data disimpan di JSONB.

Bagian yang terasa kaku dibanding brief:

- Pemilihan berupa kartu untuk jenis game master yang telah dibuat, bukan memilih template lalu membuat game baru dengan metadata sendiri.
- Tidak ada informasi dasar game terpisah (CEFR, topik, bahasa, sampul), draft/terbit, autosave, duplikasi dari builder, atau berbagi QR.
- Pengurutan hanya tombol naik/turun; belum drag & drop, duplikasi item, undo/redo, atau impor massal.
- Opsi pilihan ganda di editor lama dibatasi empat dan tidak memiliki kontrol jumlah dinamis 2–5.
- Tidak ada pratinjau hidup split view, pengaturan permainan global, validasi inline berbasis skema, atau pustaka bank soal.
- Game yang tersedia adalah `GameKind` lama; belum sama dengan tujuh template generik yang diminta.

## Rencana bertahap

1. Tambahkan skema game tervalidasi dan definisi metadata/template, dengan adapter untuk membaca game lama tanpa merusak data yang sudah tersimpan.
2. Implementasikan engine mandiri dan dua template awal: pilihan ganda dan drag-and-sort. Tambahkan tiga data game contoh Sapen/Yogyakarta sebagai konten JSON.
3. Ganti alur editor kaku dengan Game Builder wizard berbahasa Indonesia, pratinjau responsive, validasi inline, impor, pengurutan/duplikasi soal, serta autosave draft. Pertahankan akses editor lama selama migrasi bila data/fiturnya belum setara.
4. Tambahkan template listen-and-choose, sentence-builder, matching, word-bank, dan word-search/crossword melalui renderer template yang sama.
5. Tambahkan alur sesi tatap muka, pendaftaran guest, kode/QR, presensi, pengaturan approval/kuota, dan dashboard tutor dengan ekspor CSV; minimalkan data pribadi dan batasi akses data guest.
6. Bangun katalog game publik dengan pencarian, filter, pengurutan, metadata, dan jumlah permainan.
7. Perluas sesi realtime yang sudah memakai SSE untuk nickname/avatar dan kompetisi tim bila struktur yang ada mendukungnya.
8. Lengkapi validasi dan dokumentasi README/DECISIONS, lalu jalankan pemeriksaan yang diminta brief pada tahap akhir.

## Keputusan implementasi awal

- Pertahankan App Router, TypeScript, Supabase, serta SSE yang telah dipakai; hindari migrasi stack atau layanan realtime baru.
- Gunakan JSON konten tervalidasi sebagai sumber template, dengan adapter/migrasi bertahap dari `game_soal.data` agar game lama tetap terbaca.
- Lakukan perubahan per tahap dan catat keputusan skema/role yang berdampak pada data di `docs/DECISIONS.md`.
- Verifikasi rute dan UI yang disentuh pada ukuran ponsel dan desktop sebelum menyatakan tahap UI selesai.

## Catatan cakupan

Brief meminta fitur lintas editor, runtime game, role, presensi, katalog, realtime, contoh data, dan dokumentasi. Audit ini mencatat fondasi serta celahnya; tiap tahap perlu tetap kompatibel dengan game, kelas, serta sesi realtime yang sudah berfungsi.
