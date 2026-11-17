# Design Notes — Sapen English Village

## Arah visual

Memperluas identitas **Buku Latihan Bersama** yang sudah dipakai produk: hangat seperti ruang belajar kampung, tegas dan mudah dibaca, dengan ilustrasi vektor orisinal yang mengambil bentuk rumah genteng, pohon, gang, dan aktivitas belajar. Pertahankan logo, karakter Fraunces + DM Sans, bahasa Indonesia, serta alur dan isi fungsional. Hindari hero yang hanya berupa bidang warna, grid kartu seragam, foto stok generik, dan ornamen yang mengganggu tugas.

## Token desain

- Kertas halaman: `#F3E9D5`; halaman dalam/kartu: `#FDF9F0`; tinta: `#20251F`; teks isi: `#3D4038`; teks pendukung: `#625F54`.
- Hijau hutan: `#244B3A`; hijau dalam: `#183B2D`; aksen aksi terakota: `#BA472F`; aksen kecil kunyit: `#E5BF4F`.
- Garis: `#D2C5AD`; garis kuat: `#B8AA8E`; hijau lembut: `#E6EADF`.
- Display: Fraunces, tracking judul dibuka ke rentang `-0.02em…0em`, line-height `1.06–1.15` untuk judul bertingkat. Isi dan kontrol: DM Sans, minimal `16px` untuk paragraf utama, line-height `1.55–1.7`.
- Skala ruang berbasis 4px; jarak konten `16/24/32/48/64px`; kontrol sentuh minimal `44px`; sudut kontrol `10–12px`, kartu `14–18px`.
- Admin tetap tenang dan padat; permukaan putih/kertas terang, garis tipis, hierarki hijau, dan ilustrasi hanya untuk header atau empty state yang membantu.

## Komposisi dan gerak

- Beranda: judul dan CTA tetap pertama dibaca; ilustrasi gang Sapen menjadi pasangan visual utama, disusul jalur belajar berbentuk indeks, kelompok RW, testimoni, dan FAQ dengan ritme yang bervariasi.
- Kelas: cover ilustrasi relevan pada setiap kelas; detail memakai hierarki dan permukaan yang sama dengan katalog, dengan isi program tetap utuh.
- Game: PIN menjadi tugas paling menonjol; ikon ilustratif berbeda menurut jenis permainan.
- Tentang, FAQ, keranjang, dan autentikasi: gunakan ilustrasi kecil yang membantu orientasi, status, atau empty state. Admin mengutamakan kepadatan dan keterbacaan.
- Gerak 150–300ms untuk respons kontrol; satu pengungkapan ringan untuk ilustrasi/section saat masuk viewport. Konten tetap terlihat tanpa JavaScript dan animasi spasial dikurangi lewat `prefers-reduced-motion`.

## Aset yang akan dibuat

SVG buatan sendiri di `public/images/`: ilustrasi hero gang belajar; tiga RW; cover kelas percakapan, tata bahasa, dan bacaan; ilustrasi PIN/kuis, jam, kartu kosakata, blok kata, petualangan cerita, dan pilihan ganda; ilustrasi kampung untuk Tentang, FAQ, serta keranjang kosong. Aset vektor ringan, tidak menggambarkan orang nyata, dan mudah diganti foto asli.

## Cakupan kerja

Beranda, katalog dan detail kelas, indeks/game, Tentang, FAQ, Keranjang, login peserta dan warga, login admin, serta tab operasional admin. Pertahankan routing, teks fungsional, alur autentikasi, skema, isi kelas, data uji, dan proses pembayaran. Copy pembayaran hanya boleh diperjelas sesuai brief, sementara mekanisme pembayaran tetap tidak berubah.

## QA

Ambil baseline dan hasil di desktop 1440px serta mobile 390px bila viewport browser tersedia. Audit teks panjang, data kosong, loading/error, focus keyboard, reduced motion, kontras WCAG AA, dan overflow horizontal. Jalankan lint/typecheck/build yang didukung proyek; catat area yang membutuhkan sesi admin atau koneksi Supabase untuk verifikasi.
