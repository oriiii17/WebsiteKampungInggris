"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Users,
  Trophy,
  ArrowRight,
  Clock,
  Layers,
  BookOpen,
  Zap,
  KeyRound,
  Presentation,
  Sparkles,
} from "lucide-react";

const GAME_TYPES = [
  {
    id: "telling-time",
    title: "Telling the Time",
    subtitle: "Waktu & Jam",
    desc: "Membaca jam dalam Bahasa Inggris: o'clock, half past, quarter to/past.",
    icon: Clock,
  },
  {
    id: "word-match",
    title: "Vocabulary Match",
    subtitle: "Kosakata Harian",
    desc: "Mencocokkan kata benda, profesi, dan benda di sekitar rumah tangga.",
    icon: Sparkles,
  },
  {
    id: "word-builder",
    title: "Word Builder",
    subtitle: "Menyusun Kalimat",
    desc: "Menyusun kepingan kata acak menjadi struktur kalimat yang utuh dan benar.",
    icon: Layers,
  },
  {
    id: "story-quest",
    title: "Story Quest",
    subtitle: "Membaca & Memahami",
    desc: "Membaca cerita pendek interaktif tentang warga Kampung Sapen.",
    icon: BookOpen,
  },
  {
    id: "quick-quiz",
    title: "Quick Quiz",
    subtitle: "Kuis Kilat Kelas",
    desc: "Tantangan kecepatan & akurasi tata bahasa dan frasa sehari-hari.",
    icon: Zap,
  },
];

export default function GameIndexPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      setError("PIN harus terdiri dari 6 angka.");
      return;
    }
    setError("");
    router.push(`/game/join?pin=${cleanPin}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 md:pb-16">
      {/* Header Banner */}
      <section className="bg-white border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#FDFBF7] px-3.5 py-1 text-xs font-bold text-[#14532D] border border-[#E5E7EB] mb-4">
            <Gamepad2 className="h-4 w-4" />
            Kuis Kelas Interaktif (Live Game)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Main Bareng di Kelas & Belajar Bahasa Inggris
          </h1>
          <p className="mt-3 text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Kuis langsung ala Kahoot untuk peserta kelas. Masukkan kode PIN yang
            ditampilkan pengajar di depan kelas untuk ikut bertanding secara real-time!
          </p>

          {/* Form Input PIN */}
          <div className="mt-8 max-w-md mx-auto">
            <form onSubmit={handleJoinSubmit} className="w-full">
              <div className="rounded-xl border-2 border-[#14532D] bg-white p-2 sm:p-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setPin(val);
                        if (error) setError("");
                      }}
                      placeholder="Masukkan PIN 6 Angka"
                      className="w-full rounded-lg border border-gray-200 py-3.5 pl-11 pr-4 text-center sm:text-left text-lg font-bold tracking-widest text-gray-900 placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 focus:border-[#14532D] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 min-h-[48px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-[#D97706] transition active:scale-[0.98] min-h-[48px]"
                  >
                    <span>Gabung Kuis</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-xs font-semibold text-red-600 text-center">{error}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8 space-y-12">
        {/* Cara Bergabung - Numbered Steps */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900">Cara Bergabung Sangat Mudah</h2>
            <p className="text-sm text-gray-500">Cukup gunakan HP masing-masing tanpa perlu unduh aplikasi tambahan</p>
          </div>

          <div className="space-y-4">
            {[
              { num: 1, title: "Lihat PIN di Depan", desc: "Pengajar atau host akan membuka sesi dan menampilkan 6 angka PIN di layar proyektor atau papan tulis." },
              { num: 2, title: "Masukkan Nama & PIN", desc: "Ketikkan PIN 6 digit di atas dan tulis nama panggilanmu. Kamu langsung terhubung ke ruang tunggu kelas." },
              { num: 3, title: "Jawab Cepat & Rebut Juara", desc: "Pilih jawaban benar secepat mungkin di layar HP. Dapatkan poin kecepatan dan rebut posisi podium 1, 2, atau 3!" },
            ].map((step) => (
              <article
                key={step.num}
                className="flex gap-4 p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#14532D]/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center text-[#14532D] font-black text-lg">
                  {step.num}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1.5">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 5 Template Kuis - Editorial List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">5 Pilihan Topik Kuis Kelas</h2>
              <p className="text-xs sm:text-sm text-gray-500">Materi kuis disesuaikan untuk peserta pemula hingga tingkat mahir</p>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14532D] hover:underline"
            >
              <Trophy className="h-4 w-4 text-[#F59E0B]" />
              Papan Peringkat
            </Link>
          </div>

          <div className="space-y-4">
            {GAME_TYPES.map((t, index) => {
              const Icon = t.icon;
              return (
                <article
                  key={t.id}
                  className="flex flex-col md:flex-row gap-5 items-start md:items-center p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#14532D]/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center text-[#14532D] font-black text-lg md:order-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0 md:order-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-bold bg-white">
                        <Icon className="h-3.5 w-3.5 text-[#14532D]" />
                        {t.subtitle}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400">Live Game</span>
                    </div>
                    <h3 className="font-bold text-base text-gray-900 mb-1">{t.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 md:order-3 md:ml-auto shrink-0">
                    <span>Dimainkan di kelas</span>
                    <span className="font-semibold text-[#14532D]">Gratis</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}