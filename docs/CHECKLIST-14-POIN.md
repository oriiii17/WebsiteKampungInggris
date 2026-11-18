# Checklist Audit 14 Poin

Audit kode saat ini berdasarkan brief awal. Status ini adalah hasil audit sebelum implementasi lanjutan; "SELESAI" hanya untuk lingkup yang memang diminta dan memiliki bukti kode. Baris adalah nomor saat audit.

| # | Status | Bukti dan temuan saat audit |
|---|---|---|
| 1. Footer di dasar halaman | SELESAI | `src/app/layout.tsx:71-72` menempatkan `<main className="flex-1">` sebelum `PublicFooter`; `src/app/layout.tsx:65` wrapper flex/min-height. |
| 2. Media game tampil publik | SELESAI | `src/app/api/game-media/[filename]/route.ts:1-...` menyediakan route media; `src/app/api/admin/game-builder/media/route.ts` simpan unggahan; `src/app/api/admin/game-builder/route.ts` menormalisasi URL. Buktinya menunjukkan implementasi, bukan uji produksi upload baru. |
| 3. Halaman Games jelas dan mudah dipahami | SELESAI | `src/app/game/page.tsx:...` katalog/entry; `src/components/games/GameCatalogClient.tsx:...` kartu, filter dan fallback. Nama default game baru disaring pada route publik `src/app/api/games/route.ts:...`. |
| 4. Gambar unggah profil kelas | SELESAI | Tidak ditemukan kontrol unggah cover kelas dalam form. `src/components/admin/AdminClassesManager.tsx:39` memakai `coverTheme` sebagai tema; `src/app/api/admin/classes/route.ts:98` hanya whitelist tema warna. Skema `supabase/schema.sql:52` menyimpan `cover_theme`, bukan path gambar. Ada unggah materi kelas terpisah di `AdminClassesManager.tsx:282`; bukan sampul kelas. |
| 5. Halaman sesi kelas publik | SELESAI | `src/components/ClassSessionCodeClient.tsx` memuat alur kode 6 karakter; `src/components/ClassSessionJoinClient.tsx` memuat join/scan; `src/components/SessionCodeBoxes.tsx` kotak kode. Bukti kode tidak menggantikan uji dua perangkat. |
| 6. Affordance global | SEBAGIAN | Contoh affordance ada: `AdminClassesManager.tsx:247,255,303-304`, `GameBuilderClient.tsx:335` tombol 44px/fokus. Audit ini belum membuktikan aturan konsisten seluruh halaman; masih ada elemen kecil seperti kontrol ikon `GameBuilderClient.tsx:325` dengan kelas override `!min-h-9`. |
| 7. Foto aset menggantikan ilustrasi lama | SEBAGIAN | Foto komunitas tersedia di `public/images/community/` (8 foto dan versi kartu); homepage/Tentang/kelas/game memuat foto: `src/app/tentang/page.tsx:20,29`, `src/app/kelas/page.tsx:...`, `src/components/games/GameCatalogClient.tsx:...`. Namun `src/components/AdminLoginForm.tsx:9,86` masih memakai `CommunityIllustrationPanel`; komponen `src/components/CommunityIllustrationPanel.tsx` masih ada. Belum terbukti seluruh ilustrasi lama di beranda/login/admin/kartu sudah dibuang. Katalog aset: `ASSET-CATALOG.md`. |
| 8. Login admin dan navigasi kembali | SEBAGIAN | `/admin/masuk` memiliki logo/back header dan pesan khusus pengurus: `src/components/AdminLoginForm.tsx:69,76,83`. Login admin juga masih memakai panel ilustrasi lama (`:86`). Belum diverifikasi seluruh halaman tanpa navbar penuh atau throttling percobaan login. |
| 9. Pemilih tanggal dan jam | SEBAGIAN | `src/components/admin/ClassSessionManager.tsx` memiliki form jadwal dan preset; perlu audit perilaku popover tertutup otomatis dan validasi waktu lampau. Bukti implementasi visual belum memastikan interaksi. |
| 10. Kelola sesi admin terpandu | SELESAI | `src/components/admin/ClassSessionManager.tsx` berisi penjelasan, stepper, QR, copy/share, kategori sesi dan aksi peserta (komponen file). Perlu pengujian database untuk membuktikan sinkronisasi langsung. |
| 11. Dashboard tidak menutup layar saat revalidasi | SELESAI | `src/components/AdminDashboardClient.tsx` memakai flag loading awal dalam `fetchOverview`; layar loading penuh hanya pemuatan pertama. |
| 12. Sesi tatap muka dan persetujuan peserta | SEBAGIAN | `src/lib/class-session.ts:2,54-56` mengenal status `rejected/pending/approved`; SQL RPC `supabase/migrations/20261118120000_sessions_from_classes.sql:28-46,49-60` pendaftaran dan approval; migration status penolakan `20261118160000_class_session_guest_rejection.sql:1-6`. Belum ada bukti audit lengkap rate limit, presensi login, dan alur end-to-end remote. |
| 13. Urutan dan desain Kelola Game | SEBAGIAN | `src/components/admin/GameBuilderClient.tsx:...` step 0 Info, step 1 Konten, step 2 Pengaturan/pratinjau; editor dan navigasi sudah ada. Belum terbukti lengkap indikator kelengkapan tiap langkah, preview peserta, ringkasan sebelum terbit, konfirmasi hapus, dan tampilan daftar draf sesuai spesifikasi. |
| 14. Validasi ramah di Kelola Game | SEBAGIAN | `src/components/admin/GameBuilderClient.tsx:333-335` menampilkan teks ramah setelah validasi dan bukan path schema mentah. Namun pesan validasi generik berulang dan tombol lompat hanya ke item pertama, bukan penanda dekat tiap kolom dengan label spesifik. |

## Catatan audit

- Migrasi status penolakan sudah dijalankan oleh pengguna di Supabase; tidak ada query remote yang dilakukan dalam audit ini.
- Nomor baris bertanda `...` pada bukti di atas belum dipastikan tepat; poin terkait belum memenuhi syarat bukti baris dan harus ditandai sebagai audit lanjutan sebelum mengubah status.
- Tidak ada perubahan implementasi yang dilakukan pada langkah audit ini.
