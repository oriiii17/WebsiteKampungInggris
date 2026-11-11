/**
 * Abstraksi & Manajemen Pembayaran (Disiapkan, Belum Diaktifkan)
 * Fitur flag: PAYMENT_ENABLED (default false)
 */

import { SITE_CONFIG } from "@/config/site";

export interface PaketProduk {
  id: string;
  nama: string;
  deskripsi: string;
  hargaIdr: number;
  durasiHari: number;
  badge?: string;
  fitur: string[];
  aktif: boolean;
}

export interface Pesanan {
  id: string;
  penggunaId: string;
  penggunaEmail: string;
  penggunaNama: string;
  produkId: string;
  totalIdr: number;
  metode: "QRIS" | "TRANSFER_BANK";
  status: "menunggu" | "dibayar" | "kedaluwarsa" | "dibatalkan";
  createdAt: string;
}

export interface Pembayaran {
  id: string;
  pesananId: string;
  metode: "QRIS" | "TRANSFER_BANK";
  referensi?: string;
  buktiTransferUrl?: string;
  status: "menunggu_verifikasi" | "berhasil" | "gagal";
  waktu: string;
}

export interface AksesMateri {
  id: string;
  penggunaId: string;
  produkId?: string;
  materiId?: string;
  berlakuSampai: string; // ISO String
  diberikanOleh: "sistem_pembayaran" | "admin_manual" | "warga_gratis";
  createdAt: string;
}

/**
 * Interface PaymentProvider untuk integrasi gateway di masa depan
 */
export interface PaymentProvider {
  name: string;
  createTransaction(order: Pesanan): Promise<{
    paymentId: string;
    instructions: string;
    qrUrl?: string;
    bankDetails?: { bank: string; accountNumber: string; accountHolder: string };
  }>;
  verifyTransaction(paymentId: string): Promise<boolean>;
}

/**
 * Stub Implementasi QRIS (Belum terhubung ke gateway riil)
 * Integrasi masa depan: Midtrans QRIS / Xendit QRIS / DOKU
 */
export class QrisPaymentProvider implements PaymentProvider {
  name = "QRIS";

  async createTransaction(order: Pesanan) {
    // TEMPAT INTEGRASI GATEWAY DI MASA DEPAN:
    // Panggil API QRIS Gateway riil di sini (contoh: POST https://api.midtrans.com/v2/charge dengan payment_type: "qris")
    return {
      paymentId: `qris-${order.id}-${Date.now()}`,
      instructions: SITE_CONFIG.qrisGuide,
      qrUrl: "/images/qris-placeholder.png",
    };
  }

  async verifyTransaction(paymentId: string) {
    // TEMPAT INTEGRASI NOTIFIKASI WEBHOOK:
    // Cek status transaksi ke gateway riil
    return false;
  }
}

/**
 * Stub Implementasi Transfer Bank Manual
 * Integrasi masa depan: Bank Virtual Account (BCA / Mandiri / BRI / BNI)
 */
export class BankTransferPaymentProvider implements PaymentProvider {
  name = "Transfer Bank";

  async createTransaction(order: Pesanan) {
    // TEMPAT INTEGRASI GATEWAY DI MASA DEPAN:
    // Buat Virtual Account otomatis melalui gateway
    const primaryBank = SITE_CONFIG.bankAccounts[0];
    return {
      paymentId: `bank-${order.id}-${Date.now()}`,
      instructions: `Silakan transfer tepat sebesar Rp ${order.totalIdr.toLocaleString("id-ID")} ke rekening tertera.`,
      bankDetails: primaryBank,
    };
  }

  async verifyTransaction(paymentId: string) {
    return false;
  }
}

/**
 * Daftar paket default untuk Sapen English
 */
export const DEFAULT_PAKET_LIST: PaketProduk[] = [
  {
    id: "paket-warga",
    nama: "Akses Komunitas & Peserta Khusus",
    deskripsi: "Akses pembelajaran penuh menggunakan kode akses belajar untuk peserta binaan dan mitra.",
    hargaIdr: 0,
    durasiHari: 365,
    badge: "Akses Khusus",
    fitur: [
      "Akses seluruh modul bacaan, dialog, dan latihan materi",
      "Ikuti sesi kuis live kelas interaktif dengan PIN",
      "Pencatatan skor dan progres belajar",
      "Masuk mudah langsung menggunakan Kode Akses",
    ],
    aktif: true,
  },
  {
    id: "paket-umum-1-bulan",
    nama: "Paket Belajar 1 Bulan",
    deskripsi: "Akses mandiri ke seluruh materi pembelajaran dan latihan interaktif selama 30 hari.",
    hargaIdr: 49000,
    durasiHari: 30,
    badge: "Paling Populer",
    fitur: [
      "Buka seluruh materi Grammar, Speaking, dan Kids",
      "Latihan interaktif dengan kunci jawaban lengkap",
      "Dukungan belajar mandiri fleksibel dari HP & Laptop",
      "Sertifikat penyelesaian program",
    ],
    aktif: true,
  },
  {
    id: "paket-umum-3-bulan",
    nama: "Paket Intensif 3 Bulan",
    deskripsi: "Program belajar intensif 90 hari untuk hasil maksimal dengan harga lebih hemat.",
    hargaIdr: 119000,
    durasiHari: 90,
    badge: "Hemat 20%",
    fitur: [
      "Semua fitur Paket 1 Bulan",
      "Akses prioritas modul baru dan kuis latihan berkala",
      "Masa aktif 90 hari penuh",
      "Konsultasi pembelajaran berkala",
    ],
    aktif: true,
  },
];
