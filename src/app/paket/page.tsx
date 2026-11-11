import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  KeyRound,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { DEFAULT_PAKET_LIST } from "@/lib/payment";
import { SITE_CONFIG } from "@/config/site";

export default async function PaketPage() {
  const session = await getServerSession();
  const isWarga = session?.origin === "warga_kode";

  return (
    <div className="bg-[#F9FAFB] min-h-screen py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Banner Hanya Tampil Jika Belum Login Sama Sekali */}
        {!session && (
          <div className="mb-10 rounded-2xl border border-green-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#14532D]">
                Punya Kode Akses Program?
              </p>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-600">
                Peserta yang telah menerima kode akses resmi dapat langsung masuk tanpa biaya.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] text-white px-5 py-2.5 text-xs sm:text-sm font-extrabold transition shadow-sm shrink-0 min-h-[44px]"
            >
              <KeyRound className="h-4 w-4" />
              Masuk dengan Kode Akses
            </Link>
          </div>
        )}

        {/* Judul Bagian Paket */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-extrabold text-[#14532D] uppercase tracking-wider">
            Pilihan Paket Belajar
          </span>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Paket Akses Belajar
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tersedia pilihan kelas terstruktur dengan modul bacaan flipbook, latihan mandiri, dan game live interaktif.
          </p>
        </div>

        {/* Feature Flag Notice */}
        {!SITE_CONFIG.paymentEnabled && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 flex items-center gap-3 max-w-3xl mx-auto">
            <Clock className="h-5 w-5 text-amber-700 shrink-0" />
            <div className="text-xs sm:text-sm text-amber-900">
              <strong>Informasi Sistem Pembayaran:</strong> Saat ini gerbang pembayaran online umum sedang dalam proses konfigurasi akhir dan akan <strong>segera dibuka</strong>. Pengguna umum dapat mendaftar akun terlebih dahulu.
            </div>
          </div>
        )}

        {/* Grid Paket */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {DEFAULT_PAKET_LIST.map((pkt) => {
            const isGratis = pkt.hargaIdr === 0;
            return (
              <div
                key={pkt.id}
                className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-8 bg-white transition shadow-sm hover:shadow-md ${
                  isGratis ? "border-green-300 ring-2 ring-green-500/20" : "border-[#E5E7EB]"
                }`}
              >
                <div>
                  {pkt.badge && (
                    <span
                      className={`inline-block text-[11px] font-extrabold px-3 py-1 rounded-full mb-3 ${
                        isGratis
                          ? "bg-[#14532D] text-white"
                          : "bg-amber-100 text-amber-900 border border-amber-200"
                      }`}
                    >
                      {pkt.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-extrabold text-gray-900">{pkt.nama}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed min-h-[36px]">
                    {pkt.deskripsi}
                  </p>

                  <div className="mt-6 pb-6 border-b border-[#E5E7EB]">
                    {isGratis ? (
                      <p className="text-3xl font-black text-[#14532D]">GRATIS</p>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-500">Rp</span>
                        <span className="text-3xl font-black text-gray-900">
                          {pkt.hargaIdr.toLocaleString("id-ID")}
                        </span>
                        <span className="text-xs text-gray-500">/ {pkt.durasiHari} hari</span>
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-gray-600">
                    {pkt.fitur.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-[#14532D] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isGratis ? (
                    <Link
                      href="/login"
                      className="block w-full rounded-xl bg-[#14532D] hover:bg-[#0F3F22] py-3 text-center text-xs sm:text-sm font-extrabold text-white transition shadow-sm min-h-[44px]"
                    >
                      Masuk dengan Kode Akses
                    </Link>
                  ) : (
                    <Link
                      href="/kelas"
                      className="block w-full rounded-xl bg-[#14532D] hover:bg-[#0F3F22] py-3 text-center text-xs sm:text-sm font-extrabold text-white transition shadow-sm min-h-[44px]"
                    >
                      Pilih &amp; Beli Kelas
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rincian Metode Pembayaran Disiapkan */}
        <div className="mt-16 rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#14532D]" />
            Metode Pembayaran yang Disiapkan
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Dua metode resmi ini akan aktif segera setelah periode uji coba komunitas selesai:
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Opsi QRIS */}
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-gray-50 p-5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900 mb-2">
                <QrCode className="h-4 w-4 text-[#14532D]" />
                1. QRIS Nasional (GoPay, OVO, Dana, LinkAja & BCA/Mandiri Mobile)
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Scan kode QRIS instan dari layar HP atau laptop Anda. Verifikasi otomatis 24 jam.
              </p>
              <div className="mt-3 inline-block rounded-lg bg-gray-200/80 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                Status: Tahap Integrasi API
              </div>
            </div>

            {/* Opsi Transfer Bank */}
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-gray-50 p-5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900 mb-2">
                <CreditCard className="h-4 w-4 text-[#14532D]" />
                2. Transfer Bank Manual & Verifikasi Admin
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tersedia rekening Bank Mandiri ({SITE_CONFIG.bankAccounts[0]?.accountNumber}) dan BCA. Unggah bukti transfer di halaman verifikasi.
              </p>
              <div className="mt-3 inline-block rounded-lg bg-gray-200/80 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                Status: Siap diaktifkan via Admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
