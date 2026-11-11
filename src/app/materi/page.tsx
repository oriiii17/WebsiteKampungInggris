import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Lock,
} from "lucide-react";
import { getServerSession, hasActiveMaterialAccess } from "@/lib/auth";
import { getModules } from "@/lib/db";
import { SITE_CONFIG } from "@/config/site";

export default async function MateriCatalogPage() {
  const [session, modules] = await Promise.all([
    getServerSession(),
    getModules(false),
  ]);

  const hasAccess = hasActiveMaterialAccess(session);
  const isWarga = session?.origin === "warga_kode";

  return (
    <div className="bg-[#FDFBF7] min-h-screen py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Banner Status Akses */}
        <div className="mb-10 rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-md bg-[#FDFBF7] px-3 py-1 text-xs font-bold text-[#14532D]">
              <GraduationCap className="h-3.5 w-3.5 text-[#F59E0B]" />
              {isWarga ? `Peserta Aktif: ${session?.name}` : "Akses untuk Peserta Terdaftar"}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {isWarga ? "Seluruh Materi Terbuka untuk Anda" : "Daftar atau Masuk untuk Mengakses Materi"}
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl">
              Materi disusun dalam bentuk teks HTML yang ringan, responsif, dan mudah dibaca di layar HP tanpa perlu download file besar.
            </p>
          </div>

          {!session && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] text-white px-6 py-3.5 text-sm font-extrabold transition shrink-0 min-h-[44px]"
            >
              <KeyRound className="h-4 w-4" />
              Masuk ke Platform
            </Link>
          )}
        </div>

        {/* Header Katalog */}
        <div className="mb-8">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#14532D]">
            Silabus Pembelajaran
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Pilihan Modul & Materi Bahasa Inggris
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pilih kelas sesuai kebutuhan belajar Anda. Materi disajikan bertahap dari pemula hingga mahir.
          </p>
        </div>

        {/* Editorial List Layout */}
        <div className="space-y-4">
          {modules.map((mod) => {
            const isTerkunci = mod.isPaidOnly && !hasAccess;
            return (
              <article
                key={mod.id}
                className="flex flex-col md:flex-row gap-6 items-start md:items-center p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#14532D]/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center text-[#14532D] font-black text-lg md:order-1">
                  {mod.category.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 md:order-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
                      {mod.level}
                    </span>
                    <span className="text-xs font-bold text-[#14532D]">{mod.category}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 leading-snug">{mod.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed line-clamp-2">{mod.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-[#14532D]" />
                      {mod.syllabus.length} Bab Interaktif
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#14532D]" />
                      Latihan Soal & Pembahasan
                    </span>
                  </div>
                </div>
                <Link
                  href={`/materi/${mod.slug}`}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition min-h-[44px] md:order-3 md:ml-auto shrink-0 ${isTerkunci ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "bg-[#F59E0B] text-gray-950 hover:bg-[#D97706]"}`}
                >
                  {isTerkunci ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Pratinjau Materi
                    </>
                  ) : (
                    <>
                      Mulai Belajar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}