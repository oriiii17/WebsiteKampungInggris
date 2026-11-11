/**
 * Konfigurasi Utama Situs Kampung Inggris Sapen
 * Seluruh nama merek, kontak, wilayah, dan fitur flag dapat diubah terpusat di sini.
 */

export const SITE_CONFIG = {
  name: "Kampung Inggris Sapen",
  tagline: "Platform Belajar Bahasa Inggris Praktis & Profesional",
  shortDesc:
    "Belajar Bahasa Inggris praktis, menyenangkan, dan terstruktur dengan metode interaktif, modul digital, dan kuis kelas real-time.",
  location: "Yogyakarta, Indonesia",
  rwList: ["RW 06", "RW 07", "RW 08"] as const,

  // Feature Flag Pembayaran (Bagian 4: default false)
  paymentEnabled: process.env.PAYMENT_ENABLED === "true",

  // Kontak & Rekening Bank (untuk persiapan pembayaran)
  bankAccounts: [
    {
      bank: "Bank Mandiri",
      accountNumber: "137-00-1234567-8",
      accountHolder: "Kas Komunitas Kampung Inggris Sapen",
    },
    {
      bank: "BCA",
      accountNumber: "803-0123456",
      accountHolder: "Kas Komunitas Kampung Inggris Sapen",
    },
  ],

  qrisGuide: "Scan QRIS melalui aplikasi e-wallet (GoPay, OVO, Dana) atau Mobile Banking apa pun.",

  // Navigasi Standar
  navLinks: [
    { href: "/", label: "Beranda" },
    { href: "/materi", label: "Materi" },
    { href: "/game", label: "Game" },
    { href: "/paket", label: "Paket" },
    { href: "/#tentang", label: "Tentang" },
    { href: "/#faq", label: "FAQ" },
  ],
};
