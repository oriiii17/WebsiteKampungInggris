import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Gamepad2,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { getClasses, getModules } from "@/lib/db";

export default async function KelasIndexPage() {
  const [session, classes, modules] = await Promise.all([
    getServerSession(),
    getClasses(false),
    getModules(false),
  ]);

  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  return (
    <div className="bg-[#FDFBF7] min-h-screen py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3.5 py-1 text-xs font-bold text-[#14532D] mb-4">
            <GraduationCap className="h-4 w-4" />
            Program Kelas Terstruktur
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Pilihan Kelas Belajar Bahasa Inggris
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Setiap kelas disusun langsung oleh tim pengajar, mencakup modul flipbook interaktif, tugas mandiri, serta permainan edukatif dengan durasi akses fleksibel.
          </p>
        </div>

        {/* Editorial Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="border-b-2 border-[#E5E7EB] text-xs font-bold uppercase tracking-wider text-gray-500">
                <th className="pb-3 pr-4">Kelas</th>
                <th className="pb-3 pr-4">Durasi</th>
                <th className="pb-3 pr-4">Modul & Game</th>
                <th className="pb-3 pr-4">Harga</th>
                <th className="pb-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {classes.map((cls, index) => {
                const modCount = cls.moduleIds?.length || 0;
                const gameCount = cls.gameTemplateIds?.length || 0;
                return (
                  <tr key={cls.id} className={`hover:bg-[#FDFBF7] transition-colors ${index % 2 === 1 ? "bg-[#FDFBF7]/50" : ""}`}>
                    <td className="py-5 pr-4">
                      <h2 className="text-lg font-extrabold text-gray-900 leading-snug">{cls.title}</h2>
                      {cls.subtitle && <p className="mt-0.5 text-xs font-semibold text-[#14532D]">{cls.subtitle}</p>}
                      <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">{cls.description}</p>
                    </td>
                    <td className="py-5 pr-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#14532D] mb-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {cls.durationDays} Hari Akses
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        24 Jam Mandiri
                      </div>
                    </td>
                    <td className="py-5 pr-4 text-xs text-gray-600 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-[#14532D] shrink-0" />
                        <span>{modCount > 0 ? `${modCount} Modul Materi & Latihan` : "Materi Bacaan Terstruktur"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                        <span>{gameCount > 0 ? `${gameCount} Sesi Game Interaktif` : "Game Kosakata & Kuis Live"}</span>
                      </div>
                    </td>
                    <td className="py-5 pr-4">
                      <div className="flex items-baseline justify-between">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Investasi Belajar</p>
                        <span className="text-xs font-bold text-gray-500">/ {cls.durationDays} hari</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900">Rp {cls.priceIdr.toLocaleString("id-ID")}</p>
                    </td>
                    <td className="py-5">
                      <Link
                        href={`/kelas/${cls.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14532D] hover:bg-[#0F3F22] py-3 px-5 text-sm font-extrabold text-white transition min-h-[44px]"
                      >
                        <span>Daftar & Ikuti Kelas</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}