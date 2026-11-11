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
    <div className="workbook-page min-h-screen py-10 sm:py-16">
      <div className="workbook-wrap">
        {/* Banner Hanya Tampil Jika Belum Login Sama Sekali */}
        {!session && (
          <div className="mb-10 flex flex-col justify-between gap-5 border-y border-rule-strong bg-paper-light p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="workbook-print-note font-bold text-leaf">
                Punya Kode Akses Program?
              </p>
              <p className="mt-0.5 text-xs sm:text-sm text-body">
                Peserta yang telah menerima kode akses resmi dapat langsung masuk tanpa biaya.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-earth px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-earth-dark sm:text-sm"
            >
              <KeyRound className="h-4 w-4" />
              Masuk dengan Kode Akses
            </Link>
          </div>
        )}

        {/* Judul Bagian Paket */}
        <div className="mb-12 max-w-3xl border-b-2 border-ink pb-8">
          <p className="workbook-print-note">Pilihan akses · paket belajar</p>
          <h1 className="mt-3 text-4xl sm:text-6xl">
            Akses belajar yang jelas.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-body">
            Tersedia pilihan kelas terstruktur dengan modul bacaan flipbook, latihan mandiri, dan game live interaktif.
          </p>
        </div>

        {/* Feature Flag Notice */}
        {!SITE_CONFIG.paymentEnabled && (
          <div className="mb-8 flex max-w-4xl items-start gap-3 border-y border-rule-strong bg-paper-light p-4 sm:p-5">
            <Clock className="mt-1 h-5 w-5 shrink-0 text-earth" />
            <div className="text-sm text-body">
              <strong>Informasi Sistem Pembayaran:</strong> Saat ini gerbang pembayaran online umum sedang dalam proses konfigurasi akhir dan akan <strong>segera dibuka</strong>. Pengguna umum dapat mendaftar akun terlebih dahulu.
            </div>
          </div>
        )}

        {/* Grid Paket */}
        <div className="border-y border-rule-strong">
          {DEFAULT_PAKET_LIST.map((pkt, index) => {
            const isGratis = pkt.hargaIdr === 0;
            return (
              <div
                key={pkt.id}
                className={`grid gap-5 border-b border-rule py-7 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center sm:gap-8 ${index === DEFAULT_PAKET_LIST.length - 1 ? "border-b-0" : ""}`}
              >
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-display text-3xl text-earth">{String(index + 1).padStart(2, "0")}</span>
                    {pkt.badge && (
                    <span
                      className={`inline-flex min-h-7 items-center whitespace-nowrap px-2.5 py-1 text-[11px] font-extrabold ${
                        isGratis
                          ? "bg-earth text-white"
                          : "bg-sunshine-soft text-ink border border-sunshine"
                      }`}
                    >
                      {pkt.badge}
                    </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-semibold sm:text-3xl">{pkt.nama}</h3>
                  <p className="mt-2 max-w-xl text-sm text-body leading-6">
                    {pkt.deskripsi}
                  </p>

                  <ul className="mt-5 grid gap-x-5 gap-y-2 text-sm text-body sm:grid-cols-2">
                    {pkt.fitur.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-leaf shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 border-t border-rule pt-4 sm:mt-0 sm:border-0 sm:pt-0">
                  <div className="mb-5">
                    {isGratis ? (
                      <p className="font-display text-3xl font-semibold text-leaf">GRATIS</p>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-1">
                        <span className="text-sm font-bold text-muted">Rp</span>
                        <span className="font-display text-3xl font-semibold text-ink">{pkt.hargaIdr.toLocaleString("id-ID")}</span>
                        <span className="text-xs text-muted">/ {pkt.durasiHari} hari</span>
                      </div>
                    )}
                  </div>
                  {isGratis ? (
                    <Link
                      href="/login"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-earth px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-earth-dark"
                    >
                      Masuk dengan Kode Akses
                    </Link>
                  ) : (
                    <Link
                      href="/kelas"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-earth px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-earth-dark"
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
        <div className="mt-16 border-t-2 border-ink pt-7">
          <h3 className="text-lg font-extrabold text-ink flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-white"><CreditCard className="h-4 w-4" /></span>
            Metode Pembayaran yang Disiapkan
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Dua metode resmi ini akan aktif segera setelah periode uji coba komunitas selesai:
          </p>

          <div className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {/* Opsi QRIS */}
            <div className="border-y border-rule py-5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-ink mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sunshine text-ink"><QrCode className="h-4 w-4" /></span>
                1. QRIS Nasional (GoPay, OVO, Dana, LinkAja & BCA/Mandiri Mobile)
              </div>
              <p className="text-xs text-body leading-relaxed">
                Scan kode QRIS instan dari layar HP atau laptop Anda. Verifikasi otomatis 24 jam.
              </p>
              <div className="mt-3 inline-block rounded-lg bg-paper-light px-2.5 py-1 text-[11px] font-bold text-muted border border-rule">
                Status: Tahap Integrasi API
              </div>
            </div>

            {/* Opsi Transfer Bank */}
            <div className="border-b border-rule py-5 sm:border-y">
              <div className="flex items-center gap-2 text-sm font-extrabold text-ink mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-leaf text-white"><CreditCard className="h-4 w-4" /></span>
                2. Transfer Bank Manual & Verifikasi Admin
              </div>
              <p className="text-xs text-body leading-relaxed">
                Tersedia rekening Bank Mandiri ({SITE_CONFIG.bankAccounts[0]?.accountNumber}) dan BCA. Unggah bukti transfer di halaman verifikasi.
              </p>
              <div className="mt-3 inline-block rounded-lg bg-paper-light px-2.5 py-1 text-[11px] font-bold text-muted border border-rule">
                Status: Siap diaktifkan via Admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
