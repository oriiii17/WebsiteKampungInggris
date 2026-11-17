# Keputusan Arsitektur

## Game Builder dan runtime

- Gunakan JSON Schema Draft 7 dan Ajv 6 untuk memvalidasi game sebelum disimpan; dependency Ajv sekarang dideklarasikan langsung.
- Simpan blueprint versi baru di tabel `game_blueprints`, terpisah dari `games`/`game_soal` yang menjadi format lama. Ini menghindari migrasi destruktif dan memungkinkan editor klasik tetap membuka data yang ada.
- Konten template dibaca dari satu blueprint JSON. Template baru menambahkan id dan struktur data yang tervalidasi, lalu renderer mengonsumsi blueprint yang sama.
- Sesi realtime tetap menggunakan SSE yang sudah ada. Untuk game mandiri, jawaban dan skor dikelola di client; skor solo bukan mekanisme kompetisi berhadiah atau anti-cheat.

## Sesi kelas offline dan presensi

- Kode sesi enam karakter memakai huruf/angka yang menghindari karakter yang mudah tertukar; QR hanya berisi URL lokal `/sesi/{kode}` dan tidak memakai layanan QR pihak ketiga.
- Peserta tamu mendaftar lewat nama dan WhatsApp. Persetujuan dan kuota dapat diaktifkan per sesi. Presensi dibuat saat tamu disetujui, sehingga pendaftar yang masih menunggu tidak dihitung hadir atau memenuhi kuota.
- Role yang dipakai di skema profile adalah `pengurus`/`developer` (admin), `tutor`, warga masuk sebagai `peserta` dengan `origin=warga_kode` (member), dan peserta tanpa akun memakai signed cookie berjangka 12 jam (guest). Pemetaan ini mempertahankan login warga dan peserta yang telah berjalan.
- Rate limit tamu memakai utilitas proses yang telah tersedia (`5` kiriman per alamat IP dalam `10` menit). Untuk deployment multi-instance, batas ini perlu dipindahkan ke limiter bersama.
- Catat nama dan nomor WhatsApp hanya untuk sesi yang diikuti. Daftar hadir CSV hanya memuat nama, tipe peserta, dan waktu presensi; nomor tetap berada pada catatan pendaftaran tamu untuk kebutuhan tutor.
