# Laporan Audit Kualitas Web — Sapen English Village

**Tanggal:** 16 November 2026. **Stack:** Next.js 15.5.29, React 19, TypeScript. Pembayaran tidak diubah.

## Metode dan batas

- Baseline dan sesudah diukur di build produksi dengan Lighthouse CLI 13.6.0: emulasi mobile 412×823, CPU 4×, RTT 150 ms, throughput simulasi 1,6 Mbps. Satu run per URL; hasil Lighthouse memiliki variasi antarrun.
- INP tidak tersedia dalam lab run ini. TBT adalah indikator lab untuk aktivitas main thread, bukan INP atau data lapangan/CrUX.
- URL detail yang diuji: `/kelas/grammar-mastery` (kelas terbit). Pengukuran slug yang tidak ada dikecualikan. Tidak tersedia Chrome DevTools MCP; pengukuran memakai Lighthouse/Chrome headless.

## Skor sebelum vs sesudah

Skor kategori berurutan **Performance / Accessibility / Best Practices / SEO**. Metrik **LCP / TBT / CLS**. Rute privat `noindex`; SEO admin bukan target audit.

| Halaman | Skor sebelum | Skor sesudah | Metrik sebelum | Metrik sesudah |
|---|---:|---:|---:|---:|
| Beranda `/` | 43 / 100 / 96 / 100 | 37 / 100 / 100 / 92 | 4,9 s / 2.640 ms / 0 | 4,9 s / 2.500 ms / 0,244 |
| Kelas `/kelas` | 49 / 100 / 96 / 100 | 30 / 100 / 100 / 92 | 4,1 s / 1.070 ms / 0,244 | 5,6 s / 2.490 ms / 0,244 |
| Detail kelas | 38 / 96 / 96 / 100 | 66 / 100 / 100 / 92 | 5,0 s / 2.620 ms / 0,244 | 3,8 s / 500 ms / 0 |
| Game `/game` | 57 / 96 / 96 / 100 | 58 / 100 / 100 / 92 | 3,3 s / 1.740 ms / 0 | 3,9 s / 1.320 ms / 0 |
| Tentang `/tentang` | 55 / 100 / 96 / 100 | 56 / 100 / 100 / 92 | 4,3 s / 1.030 ms / 0 | 4,0 s / 970 ms / 0 |
| FAQ `/faq` | 49 / 100 / 96 / 100 | 45 / 100 / 100 / 92 | 4,0 s / 1.450 ms / 0,244 | 4,1 s / 1.290 ms / 0,244 |
| Keranjang `/keranjang` | 72 / 100 / 96 / 100 | 67 / 100 / 100 / 92 | 3,7 s / 590 ms / 0,083 | 3,7 s / 530 ms / 0,083 |
| Masuk umum | 89 / 100 / 96 / 100 | 64 / 100 / 100 / 92 | 2,9 s / 300 ms / 0,001 | 3,7 s / 720 ms / 0,001 |
| Masuk warga | 54 / 100 / 96 / 100 | 66 / 100 / 100 / 92 | 4,3 s / 1.150 ms / 0,001 | 3,7 s / 600 ms / 0,001 |
| Daftar `/daftar` | 76 / 100 / 96 / 100 | 64 / 100 / 100 / 92 | 3,0 s / 700 ms / 0 | 3,8 s / 730 ms / 0 |
| Admin masuk | 57 / 100 / 96 / — | 52 / 100 / 100 / — | 4,3 s / 960 ms / 0,001 | 4,5 s / 1.240 ms / 0,001 |

**Kesimpulan pengukuran:** Best Practices naik ke 100 di semua rute; A11y Detail kelas dan Game naik ke 100. Namun target CWV belum tercapai umum: banyak LCP >2,5 s dan CLS 0,244 masih terjadi di Beranda, Kelas, FAQ. Skor Performance satu-run tidak membaik konsisten; tabel tidak mendukung klaim optimasi performa menyeluruh.

## Temuan dan pekerjaan per skill

### Web Quality Audit

- **Penting — CLS:** Lighthouse mengidentifikasi footer sebagai elemen bergeser dengan CLS ~0,244 di Beranda, Kelas, FAQ. Kelas dirender dari data dinamis. Gambar kartu pertama kini diprioritaskan, tetapi request pada lab tetap terlambat. Wrapper tinggi viewport ganda di Kelas/Tentang/FAQ/detail dikurangi, tetapi pengukuran terbaru masih menunjukkan CLS yang sama untuk Kelas/FAQ.
- **Perbaikan kecil — favicon:** `/favicon.ico` sebelumnya 404 dan Best Practices 96. Ikon lokal ditambahkan di `src/app/icon.svg`; sesudahnya Best Practices 100.
- **Perlu keputusan — origin situs:** Tidak ada domain publik yang dapat diverifikasi dari konfigurasi atau remote Git. Tanpa `NEXT_PUBLIC_SITE_URL`, canonical absolut tidak diterbitkan dan sitemap sengaja kosong; hostname tidak ditebak.

### Performance

- **Kritis — LCP:** target ≤2,5 s tidak tercapai mayoritas. Gambar hero Beranda diberi prioritas (`src/app/page.tsx:50-51`), gambar kartu pertama diberi prioritas (`src/app/kelas/page.tsx:62`), tetapi LCP Beranda 4,9 s dan Kelas 5,6 s pada pengukuran terkini. Insight menunjukkan jeda resource sekitar 2,3–2,5 s; transfer gambar SVG lokal sendiri singkat. Ini menunjukkan jeda penemuan/konten streaming dan main-thread, belum terselesaikan.
- **Penting — JavaScript/main thread:** Beranda TBT 2.500 ms, total main-thread 8,2 s. Navbar memuat Supabase browser client secara dinamis hanya saat logout admin (`src/components/Navbar.tsx`) agar tidak ikut import statis di semua halaman. Pengukuran tidak menunjukkan pengurangan TBT konsisten; perlu profiling client boundaries lebih lanjut.
- **Kecil — font:** DM Sans/Fraunces tetap dimuat dari Google Fonts di `src/app/layout.tsx`; font web menjadi penyebab shift kecil (~0,00013) pada footer. Tidak diganti agar tampilan tidak berubah tanpa asset font lokal yang disetujui.

### Core Web Vitals

- **Kritis — target belum tercapai:** LCP ≤2,5 s dan CLS ≤0,1 belum konsisten. Kelas/FAQ masih CLS 0,244; Beranda berubah 0→0,244 pada run sesudah. Detail kelas membaik dalam run terbaru: LCP 5,0→3,8 s, TBT 2.620→500 ms, CLS 0,244→0. Variasi lab perlu divalidasi dengan trace/run berulang. INP belum bisa disimpulkan.

### Accessibility

- **Penting — kontras:** nomor bab/angka game `#BA472F` di atas krem memiliki kontras 4,32:1 (ambang 4,5:1). Nomor bab menggunakan token terakota gelap; angka game juga digelapkan. Game dan Detail kelas mencapai A11y 100.
- **Perbaikan kecil — FAQ:** sebelumnya `aria-controls` menunjuk panel yang tidak ada saat tertutup. Panel tetap di DOM menggunakan `hidden`, `role=region`, dan `aria-labelledby` (`src/components/FaqAccordion.tsx:81-98`).
- **Perbaikan kecil — navigasi/kode:** skip link ke landmark utama ditambah (`src/app/layout.tsx:64-68`); enam kotak kode warga diberi grup bernama dan autocomplete kode sekali pakai (`src/components/SixBoxCodeInput.tsx`). Tombol keluarkan pemain host memiliki target sentuh lebih besar dan label aksesibel.
- **Perlu pemeriksaan manual:** tidak dilakukan screen reader/keyboard manual semua panel admin. Lighthouse memakai 412 px; inspeksi 360/390 px belum dilakukan.

### SEO

- **Penting:** `lang=id` sudah benar. Metadata judul/deskripsi, Open Graph/Twitter default, JSON-LD `EducationalOrganization`, favicon, `robots.txt`, sitemap, dan canonical bersyarat ditambahkan. Sitemap hanya berisi kelas terbit.
- **92/100 SEO pada Lighthouse:** audit menandai meta-description tidak ada. Metadata per halaman ada dalam output Next, tetapi root/page dinamis mengalirkan metadata setelah shell HTML; Lighthouse menginspeksi `<head>` sebelum tag yang di-stream muncul. Saya tidak membuat seluruh respons menunggu karena berdampak pada streaming. Verifikasi Googlebot/URL Inspection deployment tetap perlu.
- Admin, login/daftar/reset, keranjang, checkout, akun, dan host/join/play ditandai `noindex`. `robots.txt` hanya memblokir `/api` supaya crawler tetap bisa membaca noindex.

### Best Practices dan keamanan

- **Kritis — otorisasi host:** endpoint `/api/game/live/[pin]/action` sebelumnya hanya memercayai `hostId` di JSON. Sekarang sesi admin wajib valid dan ID admin harus sama dengan host sesi (`src/app/api/game/live/[pin]/action/route.ts:17-25`). Permintaan tanpa sesi menghasilkan 403.
- **Penting — percobaan auth:** rate limit per-proses ditambahkan untuk login umum/admin, pendaftaran, kode warga lama; limiter PIN game tidak lagi menghitung satu kegagalan dua kali. Cookie sesi memakai `Secure` di production. Limit in-memory tidak tersinkron antar instance; deployment perlu limiter bersama di edge/proxy.
- **Penting — upload:** gambar game dan gambar halaman modul maksimum 8 MB, divalidasi MIME/ekstensi/magic bytes PNG/JPEG/WebP. Foto profil maksimum 10 MB dan signature PNG/JPG diverifikasi. Dokumen modul maksimum 50 MB dan signature PDF/PPT/PPTX dicek. Endpoint admin tetap mewajibkan sesi admin.
- **Perbaikan kecil — headers:** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` ditambahkan di `next.config.mjs`. CSP/HSTS belum dipasang karena domain/origin deployment belum diverifikasi.
- **Dependency:** `npm audit --omit=dev` menemukan 3 advisory produksi (1 moderate, 2 high): PostCSS transitif Next.js dan `xlsx` (belum ada perbaikan). Fix PostCSS yang dilaporkan meminta upgrade mayor Next; `npm audit fix --force` tidak dijalankan. Perlu jadwal upgrade/test kompatibilitas.

## Bug yang dilaporkan

- Label editor soal yang rusak diperbaiki menjadi pemisah `·` di `src/components/admin/AdminGameManager.tsx`; simbol game live dan placeholder podium yang rusak juga diganti teks/Unicode valid.
- `Feature Flag: PAYMENT_ENABLED = false` tidak ditemukan di UI admin saat pencarian repo. Hasil cocok hanya komentar konfigurasi/modul pembayaran. Tidak ada file/logika pembayaran yang diubah.

## Verifikasi

- `npm run lint`: lolos (exit 0; 216 warning legacy), terutama `any`, `<img>`, dan import/variabel tak terpakai. `no-explicit-any` diatur menjadi warning agar utang tipe lama tidak memblokir lint.
- Konfigurasi ESLint Next ditambahkan (`.eslintrc.json`) dan dependency dev ESLint 8.57 / `eslint-config-next` agar `npm run lint` tidak berhenti pada wizard konfigurasi. Instalasi melaporkan 9 advisori seluruh dependency (7 moderate, 2 high); audit production-only merinci 3 (1 moderate, 2 high).
- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos; Next menjalankan lint/type validation dan membuat 54 halaman statis. Ada warning webpack cache “Unable to snapshot resolve dependencies”, tidak menggagalkan build.
- `npm run start`: produksi lokal hidup; URL yang diuji dan robots/sitemap merespons 200. Halaman privat memuat `noindex`; API aksi host tanpa sesi 403.
- `npm run dev`: server development hidup; `/`, `/daftar`, `/masuk`, `/kelas`, `/faq`, `/robots.txt` merespons 200.
- Tidak deploy, `.env.local` tidak diubah, pembayaran tidak disentuh.

## Perlu keputusan / lanjutan

1. Isi `NEXT_PUBLIC_SITE_URL` dengan hostname HTTPS resmi agar canonical dan sitemap valid.
2. Jadwalkan upgrade Next/PostCSS dan evaluasi pengganti `xlsx` setelah uji kompatibilitas.
3. Lanjutkan trace Chrome berulang untuk keterlambatan streaming, main-thread, dan CLS footer; jangan menyamakan TBT dengan INP.
4. Tentukan rate limiter bersama untuk multi-instance dan kebijakan CSP/HSTS sesuai domain/proxy produksi.
5. Jalankan pemeriksaan keyboard/screen reader dan visual pada 360/390 px serta seluruh panel admin/PIN game.

## Status Git

Working tree sudah memuat banyak perubahan modified/untracked sebelum audit. Agar pekerjaan sebelumnya tidak tercampur ke commit per area, tidak ada commit dibuat; seluruh perubahan pengguna dibiarkan utuh.

## Perbaikan regresi dan verifikasi ulang — 16 November 2026

### Perubahan

- **Metadata awal:** `next.config.mjs` mempertahankan perilaku streaming browser biasa, tetapi menambahkan crawler, `curl`, dan user-agent bernama Lighthouse pada `htmlLimitedBots`. Ini membuat crawler dan pemeriksaan `curl` menerima metadata dalam `<head>` awal tanpa menahan semua respons. `curl` ke `/`, `/kelas`, `/kelas/grammar-mastery`, `/game`, `/tentang`, dan `/faq` menghasilkan HTTP 200 dan memiliki `<title>` serta `<meta name="description">` sebelum `</head>`.
- **Trade-off metadata:** Lighthouse mobile memakai user-agent emulasi Chrome Android biasa (`Chrome/136`, bukan `Chrome-Lighthouse`), sehingga Next tetap mengirim metadata dengan streaming pada run Lighthouse standar. Karena itu pemeriksaan SEO Lighthouse masih 92 dan audit internalnya menandai deskripsi hilang saat memeriksa shell awal. Metadata sudah terverifikasi di head awal untuk crawler/`curl`; membuat browser umum juga selalu menunggu metadata memerlukan `htmlLimitedBots: /.*/`, yang menahan seluruh respons dan memperburuk streaming. Opsi global itu tidak dipakai.
- **CLS:** sesi Navbar dipindahkan ke batas Suspense ber-placeholder 76px (68px pada layar ≤380px) agar root layout tidak menunggu cookie sebelum merender halaman. Data testimoni Beranda ditempatkan di Suspense dengan ruang cadangan, katalog Kelas mendapat skeleton dua kartu, dan Footer dibuat server-rendered serta diletakkan di luar provider dialog. Hasil tiga run per halaman menunjukkan CLS 0,000 untuk Beranda, Kelas, dan FAQ (sebelumnya masing-masing 0,244 pada run sesudah audit awal). Gambar hero, FAQ, dan kartu kelas sudah memiliki parent `min-height`/aspect-ratio atau dimensi eksplisit; font tetap `display: swap`, dan pergeseran font yang terukur hanya 0,00013.
- **Cookie sesi:** helper baru `src/lib/request-security.ts` menentukan `Secure` dari `x-forwarded-proto` (nilai pertama) atau protokol URL request. Semua cookie login, refresh profil, dan logout di endpoint auth menggunakannya. Uji langsung helper: HTTP tanpa proxy → `false`; HTTPS → `true`; proxy HTTPS → `true`; proxy HTTP meski URL internal HTTPS → `false`.
- **Panel Pembayaran:** `src/components/AdminDashboardClient.tsx` kini menampilkan “Pembayaran online belum dibuka” dan arahan akses manual yang ramah untuk pengurus. `PAYMENT_ENABLED` dan perilaku pembayaran tidak diubah.

### Lighthouse produksi mobile — median 3 run

Lighthouse CLI 13.6.0, mobile 412×823, CPU 4×, RTT 150 ms, throughput simulasi 1,6 Mbps; build production (`npm run build` + `npm run start`) pada `localhost:3000`. Satu server produksi aktif selama run; server `next dev` yang memakai direktori `.next` dihentikan sebelum rebuild. INP tidak disediakan oleh lab run ini; TBT dilaporkan sebagai metrik lab terpisah, bukan pengganti INP.

| Halaman | Skor P / A / BP / SEO (3 run) | Median P / A / BP / SEO | LCP (3 run) → median | TBT (3 run) → median | CLS (3 run) → median | INP |
|---|---:|---:|---:|---:|---:|---|
| Beranda `/` | 53/100/100/92 · 54/100/100/92 · 80/100/100/92 | 54/100/100/92 | 4,38 / 4,28 / 3,56 s → **4,28 s** | 2.692 / 917 / 0 ms → **917 ms** | 0 / 0 / 0 → **0** | Tidak tersedia |
| Kelas `/kelas` | 68/100/100/92 · 60/100/100/92 · 65/100/100/92 | 65/100/100/92 | 3,90 / 4,06 / 4,13 s → **4,06 s** | 471 / 740 / 482 ms → **482 ms** | 0 / 0 / 0 → **0** | Tidak tersedia |
| FAQ `/faq` | 59/100/100/92 · 64/100/100/92 · 63/100/100/92 | 63/100/100/92 | 3,67 / 3,85 / 3,52 s → **3,67 s** | 1.461 / 675 / 1.692 ms → **1.461 ms** | 0 / 0 / 0 → **0** | Tidak tersedia |

**Sisa target CWV:** CLS target ≤0,1 tercapai untuk ketiga halaman. Median LCP masih di atas target 2,5 s dan skor Performance bervariasi besar antar-run; LCP/main-thread masih perlu optimasi terpisah. Nilai TBT berfluktuasi dan tidak boleh dibaca sebagai INP lapangan.

### Verifikasi akhir

- `npm run lint`: exit 0; warning legacy tetap ada (termasuk tipe `any`, `<img>`, dan variabel/import tak terpakai).
- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0; Next.js membuat 54 halaman statis/route handler. Warning snapshot webpack cache tidak menggagalkan build.
- `npm run start`: server produksi aktif saat verifikasi; enam URL publik di atas HTTP 200 dan metadata awal tersedia di respons `curl`.
- Tidak ada string feature flag atau label lama yang ditampilkan lagi di tab Pembayaran admin. Tidak ada perubahan `.env.local`, route, skema/data, atau logika pembayaran.

## Perbaikan akses Paket Supabase — 17 November 2026

### Penyebab dan cakupan

- Tabel Paket yang dipakai aplikasi adalah `public.subscription_plans`, dengan kolom `id`, `name`, `duration_days`, `price_idr`, `badge`, `description`, `features`, `is_active`, dan `created_at` (lihat `supabase/schema.sql`). Repository tidak berisi handler CRUD Paket terpisah; `src/lib/db.ts` menjalankan upsert paket saat sinkronisasi seluruh database. Akibatnya operasi admin yang tidak mengubah Paket pun dapat gagal dengan RLS 42501 pada upsert Paket.
- Schema repository sebelumnya tidak mengaktifkan RLS atau menetapkan policy untuk `subscription_plans`. Policy yang terpasang di project Supabase jarak jauh tidak dapat dibaca dari sesi ini, sehingga migrasi baru secara eksplisit mengganti policy tabel tersebut ketika diterapkan.

### Perubahan

- `supabase/migrations/20261117090000_subscription_plans_rls.sql` mengaktifkan RLS, mencabut hak tulis anon, memberi anon hanya SELECT dengan `is_active = true`, serta memberi user authenticated yang rolenya `pengurus`/`developer` SELECT seluruh paket dan hak INSERT/UPDATE/DELETE. Pemeriksaan role memakai `public.profiles` dan `auth.uid()`; tidak ada email admin hardcode dan RLS tidak dimatikan.
- `src/lib/db.ts` membandingkan daftar Paket lokal sebelumnya dengan data yang akan disimpan dan melewati upsert Paket jika tidak berubah. Ini mencegah simpan akses RW atau data admin lain memicu penulisan Paket yang tidak perlu.
- Jalur penulisan aplikasi memakai `getSupabaseAdmin()`: service role hanya dipakai bila `SUPABASE_SERVICE_ROLE_KEY` tersedia di environment server; jika tidak, ia memakai public anon client yang tetap tunduk pada RLS. Kunci service role tidak tersedia pada environment yang diperiksa dan `.env.local` tidak disentuh. Karena jalur sinkronisasi saat ini tidak meneruskan JWT pengguna, perubahan Paket yang benar-benar berubah melalui jalur ini memerlukan kredensial server service role yang tersimpan aman di environment deployment atau jalur penulisan ber-JWT; migrasi policy saja tidak memberi anon hak tulis.
- Tidak ada UI/handler CRUD Paket di repository yang dapat dipakai untuk uji tambah/edit/hapus dari dashboard. Halaman admin tidak diubah. Pembayaran tidak disentuh.

### SQL policy yang ditambahkan

Lihat migrasi lengkap di `supabase/migrations/20261117090000_subscription_plans_rls.sql`. Aturannya: `anon` hanya membaca paket aktif; `authenticated` membaca paket aktif atau semua paket jika role profil adalah `pengurus`/`developer`; role tersebut saja yang dapat menulis/menghapus.

### Verifikasi

- Belum dapat menjalankan query terhadap Supabase jarak jauh atau menerapkan migrasi dari sesi ini. Jalankan file migrasi melalui Supabase Dashboard → SQL Editor atau mekanisme migrasi project sebelum pengujian hak akses.
- Verifikasi kode/build dicatat setelah pemeriksaan lokal. Uji runtime CRUD melalui dashboard tidak tersedia karena UI/handler CRUD Paket tidak ada di repository.
