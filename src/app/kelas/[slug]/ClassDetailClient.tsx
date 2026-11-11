"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  Gamepad2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Mail,
} from "lucide-react";
import { ClassItem, ModuleItem, SessionPayload } from "@/lib/types";

interface Props {
  classItem: ClassItem;
  includedModules: ModuleItem[];
  isEnrolled: boolean;
  sessionUser: SessionPayload | null;
}

export default function ClassDetailClient({
  classItem,
  includedModules,
  isEnrolled,
  sessionUser,
}: Props) {
  const router = useRouter();

  // Self-checkout form states
  const [showCheckout, setShowCheckout] = useState(false);
  const [name, setName] = useState(sessionUser?.name || "");
  const [email, setEmail] = useState(sessionUser?.email || "");
  const [password, setPassword] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "transfer">("qris");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/checkout/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classItem.id,
          name,
          email,
          password,
          paymentMethod: paymentMethod === "qris" ? "QRIS Instan" : "Transfer Bank",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pendaftaran kelas.");
      }

      setSuccessMsg(data.message || "Pendaftaran kelas berhasil!");
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Tombol Kembali */}
      <Link
        href="/kelas"
        className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Katalog Kelas
      </Link>

      {/* Hero Kelas */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-10 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1 text-xs font-black text-[#14532D]">
            <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
            Durasi Akses: {classItem.durationDays} Hari
          </span>
          {isEnrolled && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5" />
              Akses Anda Aktif
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {classItem.title}
        </h1>
        {classItem.subtitle && (
          <p className="mt-1.5 text-sm sm:text-base font-semibold text-[#14532D]">
            {classItem.subtitle}
          </p>
        )}
        <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed max-w-3xl">
          {classItem.description}
        </p>

        {/* Info Investasi & Durasi Akses */}
        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Biaya Akses Kelas
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-gray-900">
                Rp {classItem.priceIdr.toLocaleString("id-ID")}
              </span>
              <span className="text-sm font-bold text-gray-500">
                / {classItem.durationDays} hari masa aktif
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ditentukan oleh pengajar. Akses berlaku penuh ke seluruh materi dan game di dalam kelas ini.
            </p>
          </div>

          {!isEnrolled ? (
            <button
              type="button"
              onClick={() => setShowCheckout(!showCheckout)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] px-8 py-4 text-base font-black text-gray-950 transition shadow-md min-h-[48px] shrink-0"
            >
              <span>{showCheckout ? "Tutup Form Pendaftaran" : "Daftar & Beli Akses Sekarang"}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-xs sm:text-sm font-bold text-[#14532D] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Anda sudah terdaftar. Selamat belajar!</span>
            </div>
          )}
        </div>
      </div>

      {/* FORM SELF-SERVICE CHECKOUT */}
      {showCheckout && !isEnrolled && (
        <div className="rounded-3xl border-2 border-[#14532D] bg-white p-6 sm:p-10 shadow-lg">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-[#14532D] mb-3">
                <CreditCard className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                Pendaftaran Mandiri Peserta
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Pendaftaran langsung aktif otomatis tanpa menunggu admin menginput data Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-bold text-[#14532D]">
                {successMsg}
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                {/* Data Akun jika belum login */}
                {!sessionUser && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nama Lengkap
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nama lengkap Anda"
                          className="w-full rounded-xl border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Alamat Email
                      </label>
                      <div className="relative mt-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="emailanda@gmail.com"
                          className="w-full rounded-xl border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Kata Sandi Akun
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="mt-1 w-full rounded-xl border border-[#E5E7EB] p-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Ringkasan Pesanan */}
                <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Kelas Dipilih:</span>
                    <strong className="text-gray-900">{classItem.title}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Durasi Akses:</span>
                    <strong className="text-[#14532D]">{classItem.durationDays} Hari Aktif</strong>
                  </div>
                  <div className="flex justify-between text-gray-600 pt-2 border-t border-green-200">
                    <span className="font-bold text-gray-800">Total Pembayaran:</span>
                    <strong className="text-base font-black text-gray-900">
                      Rp {classItem.priceIdr.toLocaleString("id-ID")}
                    </strong>
                  </div>
                </div>

                {/* Pilihan Metode Bayar */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === "qris"
                          ? "border-[#14532D] bg-green-50 text-[#14532D] ring-2 ring-[#14532D]/20"
                          : "border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <QrCode className="h-5 w-5" />
                      <span>QRIS Instan (Semua E-Wallet)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === "transfer"
                          ? "border-[#14532D] bg-green-50 text-[#14532D] ring-2 ring-[#14532D]/20"
                          : "border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Transfer Bank Otomatis</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] py-4 text-sm font-black text-white transition shadow-sm disabled:opacity-60 min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Memproses Pendaftaran...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Konfirmasi &amp; Aktifkan Akses Kelas
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

        {/* DAFTAR MATERI DALAM KELAS INI */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#14532D]" />
              Daftar Modul Pelajaran dalam Kelas Ini
            </h2>
            <span className="text-xs font-bold text-gray-500">
              {(classItem.modules?.length || includedModules.length)} Modul
            </span>
          </div>

          {(classItem.modules?.length || includedModules.length) === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-xs text-gray-500">
              Materi untuk kelas ini sedang dipersiapkan oleh pengajar.
            </div>
          ) : (
            <div className="space-y-3">
              {(classItem.modules && classItem.modules.length > 0
                ? [...classItem.modules].sort((a,b)=>a.urutan-b.urutan)
                : includedModules.map((m, idx) => ({ id: m.id, kelasId: classItem.id, judulBebas: m.title, deskripsi: m.subtitle || m.summary, urutan: idx+1, status: "terbit" as const, quiz: null }))
              ).map((mod, idx) => (
                <div
                  key={mod.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#14532D]/40 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-[#FDFBF7] text-sm font-black text-[#14532D]">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base">
                        {mod.judulBebas}
                      </h3>
                      {mod.deskripsi && <p className="mt-0.5 text-xs text-gray-600">{mod.deskripsi}</p>}
                      {mod.quiz ? (
                        <p className="mt-1.5 text-[11px] font-bold text-[#14532D]">
                          {mod.quiz.status === "terbuka" ? "Kuis tersedia untuk dikerjakan" : "Kuis belum dibuka oleh admin"}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-gray-500">Tidak ada kuis untuk modul ini</p>
                      )}
                    </div>
                  </div>
                  {isEnrolled ? (
                    mod.status === "terbit" ? (
                      <Link
                        href={`/kelas/${classItem.slug}/modul/${mod.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#0F3F22] min-h-[44px]"
                      >
                        Buka Modul
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
                        <Lock className="h-3.5 w-3.5" />
                        Draft
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                      <Lock className="h-3.5 w-3.5" />
                      Masukkan Kode Akses
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      {/* GAME DALAM KELAS INI */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-[#F59E0B]" />
          Game &amp; Kuis Interaktif dalam Kelas Ini
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(classItem.gameTemplateIds || []).map((gameId) => (
            <div
              key={gameId}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 capitalize">
                    {gameId.replace(/-/g, " ")}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Sesi Live Interaktif
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-[#14532D]">
                Tersedia
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
