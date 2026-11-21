# Audit Mobile Kampung Inggris Sapen

Tanggal: 22 November 2026  
Browser: Google Chrome melalui Playwright  
Viewport: 360×640, 390×844, 412×915, 768×1024, dan 1280×800  
Mode: audit baca-saja; tidak menekan aksi pengelolaan data.

## Hasil publik dan peserta

Skrip audit umum membuat 270 screenshot viewport dari 54 route/variasi route. Pemeriksaan `document.documentElement.scrollWidth <= window.innerWidth` tidak menemukan overflow pada pengukuran yang berhasil untuk route publik/peserta. Tidak ada klaim overflow untuk halaman admin terlindungi di bagian ini. Screenshot per route dan lebar berada di `docs/screenshots/mobile-audit-2026-11-22/`; data pengukuran awal tersedia di `results.json`.

| Route/halaman | Temuan visual atau batas verifikasi |
|---|---|
| `/masuk` (360×640) | Form panjang mencapai fixed bottom navigation; tombol Masuk tampak tertutup sebagian pada posisi scroll awal. Perlu cek posisi akhir scroll untuk memastikan semua tautan bawah dapat dijangkau. |
| `/kelas` (360×640) | Awal kartu kelas berada di bawah viewport dan tertutup sebagian oleh fixed bottom navigation pada posisi awal; area akhir halaman belum dinilai melalui full-page capture. |
| `/sesi` (360×640) | Konten form presensi mencapai fixed bottom navigation dan tombol aksi tampak terpotong pada posisi awal. |
| `/faq` (390×844) | Baris accordion berikutnya tertutup sebagian oleh fixed bottom navigation pada posisi awal. |
| `/games` (390×844) | Kartu berikutnya bertemu fixed bottom navigation pada tepi bawah viewport; screenshot hanya menangkap viewport, bukan full-page. |
| `/kelas` | Satu page error server component tercatat selama audit; halaman merespons HTTP 200, tetapi hasil render perlu verifikasi ulang terpisah. |
| `/game/play/[pin]` (sampel `/game/play/123456`) | Empat page error React minified #419 tercatat pada viewport yang diuji; kondisi ini perlu direproduksi pada sesi permainan valid. |
| `/akun`, `/modul`, `/materi`, `/belajar/[slug]`, `/sesi/kelola`, `/paket`, `/login` | Sebagian route mengalihkan ke halaman masuk/katalog saat dibuka tanpa sesi atau data yang diperlukan; pengukuran hanya mewakili tujuan redirect, bukan konten terlindungi. |

Catatan audit visual: tangkapan layar bersifat viewport, bukan full-page. Daftar di atas hanya mencatat masalah yang terlihat langsung pada screenshot yang diperiksa; seluruh halaman belum diperiksa manual satu per satu untuk tumpang-tindih konten di bawah lipatan.

## Route yang ditemukan di kode

### Publik

`/`, `/kelas`, `/kelas/[slug]`, `/kelas/[slug]/modul/[moduleId]`, `/games`, `/games/[gameId]`, `/sesi`, `/sesi/[code]`, `/tentang`, `/faq`, `/keranjang`, `/masuk`, `/daftar`, `/lupa-password`, `/reset-password`, `/login`, `/berlangganan`, `/paket`, `/checkout`, `/leaderboard`.

Sampel dinamis yang dibuka: `/kelas/grammar-basic`, `/kelas/speaking-percakapan-harian`, `/kelas/english-for-kids`, `/kelas/toefl-reading-structure`, `/kelas/grammar-basic/modul/mod-grammar-basic`, `/games/audit-sample`, dan `/sesi/XT2PA7`.

### Peserta, warga, tutor, materi, dan permainan

`/akun`, `/modul`, `/modul/[slug]`, `/materi`, `/materi/[slug]`, `/belajar/[slug]`, `/sesi/kelola`, `/game`, `/game/[gameId]`, `/game/join`, `/game/host`, `/game/host/[pin]`, `/game/play/[pin]`.

Sampel yang dibuka: `/modul/grammar-basic`, `/materi/grammar-basic`, `/belajar/grammar-basic`, `/game/telling-time`, `/game/word-match`, `/game/word-builder`, `/game/story-quest`, `/game/quick-quiz`, `/game/join?pin=123456`, `/game/host/123456`, dan `/game/play/123456`. Route yang membutuhkan login/entri permainan valid hanya terukur pada halaman tujuan redirect atau state tanpa sesi.

### Admin

- Halaman login kanonis: `/admin/masuk`.
- Dashboard: `/admin`.
- Tab yang didefinisikan oleh `ADMIN_TABS` di `src/components/AdminDashboardClient.tsx:95`: `/admin?tab=dashboard`, `classes`, `warga`, `testimoni`, `codes`, `games`, `game-builder`, `sessions`, `public`, dan `payments`.
- `/admin/login` ada sebagai alias yang mengalihkan ke `/admin/masuk`; skrip audit memakai route kanonis.

## Hasil audit admin terautentikasi

**GAGAL — audit admin belum dapat dilanjutkan.** Skrip memuat `.env.local` menggunakan `process.loadEnvFile('.env.local')` tanpa mencetak nilainya, membuka `/admin/masuk`, lalu mencoba login satu kali. UI mengembalikan pesan **“Email / kata sandi salah”**. Sesuai instruksi, proses dihentikan; tidak ada percobaan login lain, pembuatan akun, atau perubahan data.

| Route | Hasil |
|---|---|
| `/admin/masuk` | Halaman login dapat dibuka dan screenshot login tersimpan pada lima viewport; autentikasi gagal dengan pesan di atas. |
| `/admin`, `/admin?tab=dashboard`, `/admin?tab=classes`, `/admin?tab=warga`, `/admin?tab=testimoni`, `/admin?tab=codes`, `/admin?tab=games`, `/admin?tab=game-builder`, `/admin?tab=sessions`, `/admin?tab=public`, `/admin?tab=payments` | **Tidak dapat diaudit sebagai halaman admin yang sebenarnya** karena login gagal. Screenshot lama tanpa autentikasi yang menampilkan “Dashboard belum dapat dibuka / Sesi admin tidak ditemukan atau sudah berakhir” ditandai **GAGAL** dan tidak dipakai untuk menyimpulkan responsivitas tab admin. Overflow admin belum dinilai. |

Temuan UI pada layar fallback yang terlihat tanpa sesi: konten berada di bagian atas dengan ruang kosong besar di bawah, tombol tidak melebar penuh pada mobile, dan aksi “Coba lagi” serta “Masuk kembali” tampil bersamaan untuk kondisi sesi hilang. Ini bukan hasil audit tab admin terautentikasi dan belum diperbaiki; menunggu konfirmasi setelah laporan ini.

## Skrip dan perlindungan file lokal

- `scripts/audit-mobile.cjs`: audit route dan overflow umum.
- `scripts/audit-admin-auth.cjs`: memuat kredensial dari `.env.local` atau environment, memakai route `/admin/masuk`, autentikasi sekali, menyimpan Playwright storage state lokal, lalu mengukur dan mengambil screenshot semua tab admin pada lima viewport. Setiap redirect ke halaman login atau layar fallback akan ditandai GAGAL.
- `git check-ignore -v` mengonfirmasi aturan ignore: `.gitignore:27` untuk `.env.local` (`.env*.local`), `.gitignore:31` untuk `.playwright-auth/`, dan `.gitignore:32` untuk `docs/screenshots/mobile-audit-*/`. Storage state tidak berhasil dibuat karena login gagal.
- Audit hanya membuka route dan mengirim form login; tidak menjalankan tombol Hapus, Simpan, Ekspor, atau aksi lain yang mengubah data.

## Yang dibutuhkan untuk melanjutkan

Periksa bahwa `ADMIN_EMAIL` dan `ADMIN_PASSWORD` adalah kredensial akun pengurus yang dapat login pada proyek Supabase yang digunakan server lokal, lalu minta audit dilanjutkan. Jangan kirim nilainya di chat; cukup perbarui `.env.local` secara lokal dan konfirmasi.
