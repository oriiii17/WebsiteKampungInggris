"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { ModuleItem, SessionPayload } from "@/lib/types";
import { SITE_CONFIG } from "@/config/site";

interface MateriReaderProps {
  module: ModuleItem;
  session: SessionPayload | null;
  hasAccess: boolean;
}

export default function MateriReader({
  module,
  session,
  hasAccess,
}: MateriReaderProps) {
  // Bab aktif (0-indexed)
  const [activeChapter, setActiveChapter] = useState(0);

  // State untuk latihan mandiri
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState<Record<number, boolean>>({});

  const seedPages = module.seedPages || [];
  const totalChapters = Math.max(1, seedPages.length > 0 ? seedPages.length : module.syllabus.length);
  const currentSeed = seedPages[activeChapter];
  const currentSyllabus = module.syllabus[activeChapter] || { day: `Bagian ${activeChapter + 1}`, topic: module.title };

  function handleSelectOption(questionIndex: number, optionIndex: number) {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    setShowFeedback((prev) => ({ ...prev, [questionIndex]: true }));
  }

  function handleResetPractice() {
    setSelectedAnswers({});
    setShowFeedback({});
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Tombol Kembali & Info Sesi */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
        <Link
          href="/materi"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Materi
        </Link>

        <div className="flex items-center gap-2 text-xs">
          {session ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 font-bold text-[#14532D] border border-green-200">
              <ShieldCheck className="h-3.5 w-3.5 text-[#14532D]" />
              {session.name} ({session.role === "pengurus" || session.role === "developer" ? "Admin" : "Peserta"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-500">
              Mode Tamu
            </span>
          )}
        </div>
      </div>

      {/* Header Modul */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-black text-[#14532D]">
            {module.category}
          </span>
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
            Tingkat: {module.level}
          </span>
          {module.isPaidOnly ? (
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
              Tersedia dengan Kode Akses & Paket Umum
            </span>
          ) : (
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
              Materi Terbuka
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          {module.title}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
          {module.subtitle}
        </p>
      </div>

      {/* PAYWALL / KARTU AKSES JIKA BELUM MEMILIKI IZIN AKSES */}
      {!hasAccess ? (
        <div className="rounded-3xl border-2 border-[#14532D] bg-white p-6 sm:p-10 shadow-md text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-[#14532D]">
            <Lock className="h-7 w-7" />
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              Materi Lengkap Terkunci
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Modul <strong>{module.title}</strong> dapat diakses oleh peserta dengan kode akses,
              atau peserta umum yang terdaftar pada kelas ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
            <Link
              href={`/masuk?next=/materi/${module.slug}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] px-5 py-3.5 text-sm font-extrabold text-white transition shadow-sm min-h-[44px]"
            >
              <KeyRound className="h-4 w-4" />
              Masuk ke Platform
            </Link>
            <Link
              href="/kelas"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#14532D] bg-white hover:bg-green-50 px-5 py-3.5 text-sm font-extrabold text-[#14532D] transition min-h-[44px]"
            >
              Lihat Kelas Individual
            </Link>
          </div>

          {/* Pratinjau Silabus yang Boleh Dilihat Semua Orang */}
          <div className="mt-8 pt-8 border-t border-[#E5E7EB] text-left">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-700 mb-3">
              Daftar Topik Pembelajaran:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {module.syllabus.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-700 border border-[#E5E7EB]"
                >
                  <span className="font-bold text-[#14532D]">{item.day}:</span>
                  <span className="truncate">{item.topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* KONTEN LENGKAP ASLI DALAM BENTUK KOMPONEN HTML RESPONSISF */
        <div className="space-y-6">
          {/* Navigasi Pilihan Bab (Horizontal Scrollable di HP) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {Array.from({ length: totalChapters }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveChapter(idx);
                  handleResetPractice();
                }}
                className={`rounded-xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap transition min-h-[44px] ${
                  activeChapter === idx
                    ? "bg-[#14532D] text-white shadow-sm"
                    : "border border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Bab {idx + 1}: {module.syllabus[idx]?.day || `Bagian ${idx + 1}`}
              </button>
            ))}
          </div>

          {/* KONTEN BAB UTAMA (HTML Bersih, Responsif, 16px+) */}
          <article className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-10 shadow-sm space-y-8">
            {/* Header Bab */}
            <div className="border-b border-[#E5E7EB] pb-6">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#14532D]">
                {currentSyllabus.day}
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {currentSeed?.heading || currentSyllabus.topic}
              </h2>
              {currentSeed?.subheading && (
                <p className="mt-2 text-base text-gray-600 leading-relaxed">
                  {currentSeed.subheading}
                </p>
              )}
            </div>

            {/* Poin-Poin Materi Utama */}
            {currentSeed?.bullets && currentSeed.bullets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-800">
                  Konsep & Aturan Utama
                </h3>
                <div className="space-y-2.5">
                  {currentSeed.bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 border border-[#E5E7EB]"
                    >
                      <CheckCircle2 className="h-5 w-5 text-[#14532D] shrink-0 mt-0.5" />
                      <p className="text-base text-gray-800 leading-relaxed font-medium">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kotak Contoh Kalimat / Percakapan Sehari-Hari */}
            {currentSeed?.exampleBox && (
              <div className="rounded-2xl border-2 border-green-200 bg-green-50/70 p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#14532D]">
                  <MessageCircle className="h-4 w-4" />
                  Contoh Penggunaan Sehari-Hari
                </div>
                <div className="rounded-xl bg-white p-4 border border-green-200/80 shadow-xs">
                  <p className="text-lg font-bold text-gray-900 font-sans">
                    &ldquo;{currentSeed.exampleBox.en}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-gray-600 italic">
                    Arti: {currentSeed.exampleBox.id}
                  </p>
                </div>
                {currentSeed.exampleBox.note && (
                  <p className="text-xs text-gray-600 font-medium">
                    💡 <strong>Catatan:</strong> {currentSeed.exampleBox.note}
                  </p>
                )}
              </div>
            )}

            {/* Tips Belajar Cepat */}
            {currentSeed?.tip && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
                <Lightbulb className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Tips Praktis dari Pengajar:
                  </p>
                  <p className="mt-0.5 text-sm text-amber-950 font-medium leading-relaxed">
                    {currentSeed.tip}
                  </p>
                </div>
              </div>
            )}

            {/* Latihan Interaktif Mandiri Bab Ini (Hanya muncul jika admin mengaktifkannya pada modul ini) */}
            {module.practiceEnabled && module.practiceQuestions && module.practiceQuestions.length > 0 && (
              <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                      Tugas / Latihan Mandiri
                    </h3>
                    <p className="text-xs text-gray-500">
                      Kerjakan tugas mandiri yang telah disiapkan pengajar untuk menguji pemahamanmu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPractice}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 min-h-[44px]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Ulangi
                  </button>
                </div>

                {module.practiceQuestions.map((qItem, qIdx) => {
                  const isAnswered = showFeedback[qIdx];
                  const chosenOpt = selectedAnswers[qIdx];
                  return (
                    <div key={qItem.id || qIdx} className="rounded-2xl border border-[#E5E7EB] bg-gray-50 p-5 space-y-4">
                      <p className="text-base font-bold text-gray-900">
                        {qIdx + 1}. {qItem.question}
                      </p>
                      <div className="space-y-2">
                        {qItem.options.map((opt, optIdx) => {
                          const isSelected = chosenOpt === optIdx;
                          const isCorrect = optIdx === qItem.correctIndex;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition min-h-[44px] flex items-center justify-between ${
                                isAnswered
                                  ? isCorrect
                                    ? "bg-green-100 border-green-400 text-green-900 font-bold"
                                    : isSelected
                                    ? "bg-red-100 border-red-400 text-red-900"
                                    : "bg-white border-[#E5E7EB] text-gray-600"
                                  : isSelected
                                  ? "bg-[#14532D] text-white border-[#14532D]"
                                  : "bg-white border-[#E5E7EB] text-gray-800 hover:bg-gray-100"
                              }`}
                            >
                              <span>{opt}</span>
                              {isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-700" />}
                              {isAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-700" />}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && qItem.explanation && (
                        <div className="rounded-xl bg-white p-3.5 border border-green-200 text-xs text-gray-700">
                          <strong>Pembahasan:</strong> {qItem.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigasi Bab Sebelumnya & Selanjutnya */}
            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => {
                  setActiveChapter((c) => Math.max(0, c - 1));
                  handleResetPractice();
                }}
                disabled={activeChapter <= 0}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Bab Sebelumnya
              </button>

              <span className="text-xs font-bold text-gray-500">
                Bab {activeChapter + 1} dari {totalChapters}
              </span>

              <button
                type="button"
                onClick={() => {
                  setActiveChapter((c) => Math.min(totalChapters - 1, c + 1));
                  handleResetPractice();
                }}
                disabled={activeChapter >= totalChapters - 1}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-gray-950 transition disabled:opacity-40 min-h-[44px]"
              >
                Bab Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
