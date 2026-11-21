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

Menurut hasil yang dijalankan pengguna, 50 pemeriksaan awal berstatus READY, GAGAL=0, dan overflow dokumen=0. Saya membaca hasil DOM terbaru (20 pemeriksaan) dan memeriksa seluruh 20 screenshot full-page (10 tab × 360/390 px). Semua 20 menampilkan konten tab nyata, bukan loading/error. `documentElement.scrollWidth` tetap sama dengan viewport, tetapi elemen di dalam beberapa tabel/toolbar melewati tepi layar.

| Tab | Status sebelum perbaikan — temuan full-page + DOM |
|---|---|
| `dashboard` | **GAGAL** — dua tombol ikon header berukuran 42×44 px dan terdeteksi tanpa nama aksesibel; isi dashboard lain tersusun normal. |
| `classes` | **GAGAL** — toolbar Kelas Aktif memanjang hingga x=407 px (viewport 360/390); tab Aktif/Draft tetap berdampingan tetapi terbungkus ke baris terpisah dari filter/aksi; tombol Ekspor/Segarkan 36 px dan sebagian tombol aksi kartu 36×36 px; label stepper membungkus. |
| `warga` | **GAGAL** — tabel “Daftar Warga Terdaftar” tampil huruf-per-huruf pada judul kolom di full-page 360 dan 390; pada 360 tabel melewati batas hingga x=370; kontrol kelompok kode 20–26 px dan kotak kode 36 px lebar. |
| `testimoni` | **GAGAL** — tabel ulasan memiliki lebar sampai x=737 px pada kedua viewport; judul kolom dan empty state terpotong di dalam kartu. |
| `codes` | **GAGAL** — tabel user reguler melebar sampai x=734 px pada kedua viewport; kolom kelas terpotong, email patah di tengah alamat, dan badge jumlah tab Guest terpotong pada 360. |
| `games` | **GAGAL** — deskripsi Host kuis live membungkus dalam kolom sempit di sebelah tombol Muat ulang; dua tombol ikon header 42×44 px dan tanpa nama aksesibel. |
| `game-builder` | **GAGAL** — kartu draf game menampilkan teks rincian dalam kolom sangat sempit; DOM mengukur elemen teks 13×400 px pada 360 (terindikasi per huruf), sementara isi lain berupa daftar kartu satu kolom. |
| `sessions` | **GAGAL** — tombol Muat ulang sesi dan dua tombol ikon header lebarnya 42 px (di bawah target 44 px); dua tombol ikon header tanpa nama aksesibel. Isi form/stepper tidak terpotong di screenshot. |
| `public` | **GAGAL** — halaman selesai dirender tetapi area konten setelah judul dan deskripsi kosong total pada full-page 360 dan 390; tidak ada konten maupun empty state. |
| `payments` | **GAGAL** — tabel riwayat menampilkan judul kolom dan data huruf-per-huruf; mencapai x=412 px, melewati viewport 360/390; tombol aksi baris 24 px dan tombol utama 36 px. DOM mengukur satu nilai email 12×208 px. |

**Verifikasi wajib:** (a) Ya, full-page `admin-full-warga-360x640.png` dan `admin-full-warga-390x844.png` menunjukkan judul kolom tabel warga tersusun huruf-per-huruf. (b) Ya, `admin-full-classes-360x640.png` dan `admin-full-classes-390x844.png` menunjukkan baris toolbar Kelas Aktif melampaui sisi kanan; Aktif/Draft tidak bertumpuk satu di atas yang lain, melainkan berada berdampingan di baris tersendiri setelah toolbar/filter. (c) Ya, screenshot full-page tab `public` hanya memperlihatkan header admin, judul “Situs Publik”, deskripsi, lalu ruang kosong hingga bawah.

Temuan lintas tab: DOM melaporkan dua tombol ikon header bersama berukuran 42×44 px tanpa nama aksesibel di seluruh tab. Teks vertikal tidak terdeteksi sebagai `writing-mode`; screenshot warga dan pembayaran membuktikan efek tampilan serupa akibat kolom terlalu sempit. Semua temuan di atas berstatus **sebelum perbaikan**. Tidak ada UI aplikasi yang diubah.

Screenshot full-page yang ditinjau berada di `docs/screenshots/mobile-audit-2026-11-22/admin-full-{dashboard,classes,warga,testimoni,codes,games,game-builder,sessions,public,payments}-{360x640,390x844}.png`; data DOM di `admin-visual-results.json`.

## Skrip dan perlindungan file lokal

- `scripts/audit-mobile.cjs`: audit route dan overflow umum.
- `scripts/audit-admin-auth.cjs`: memuat kredensial dari `.env.local`, memakai route `/admin/masuk`, autentikasi sekali, menyimpan Playwright storage state lokal, lalu menunggu heading tab dan hilangnya teks “Memuat” sebelum screenshot/pengukuran pada lima viewport.
- `scripts/audit-admin-visual.cjs`: pemeriksaan DOM baca-saja berurutan memakai storage state untuk 10 tab pada 360/390 px; mengambil screenshot `fullPage: true` dan menyimpan hasil DOM beserta nama screenshot.
- `git check-ignore -v` mengonfirmasi aturan ignore: `.gitignore:27` untuk `.env.local` (`.env*.local`), `.gitignore:31` untuk `.playwright-auth/`, dan `.gitignore:32` untuk `docs/screenshots/mobile-audit-*/`. Storage state tersedia di `.playwright-auth/admin.storageState.json` dan diabaikan Git.
- Audit admin terdahulu membuka route dan mengirim form login; tidak menjalankan tombol Hapus, Simpan, Ekspor, atau aksi lain yang mengubah data. Pemeriksaan screenshot terbaru dilakukan hanya dengan melihat gambar yang sudah tersimpan.

## Yang dibutuhkan untuk melanjutkan

Hasil audit publik dan admin sudah dipisahkan. Tahap A selesai; saya berhenti di sini dan menunggu konfirmasi Anda sebelum Tahap B. Tidak ada perbaikan UI yang dikerjakan.
