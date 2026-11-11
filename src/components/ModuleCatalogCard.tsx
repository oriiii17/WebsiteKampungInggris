import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Lock,
} from "lucide-react";
import { ModuleItem } from "@/lib/types";

interface Props {
  module: ModuleItem;
  hasActiveAccess: boolean;
}

export default function ModuleCatalogCard({ module, hasActiveAccess }: Props) {
  const isTerkunci = module.isPaidOnly && !hasActiveAccess;

  return (
    <article className="flex flex-col md:flex-row gap-5 items-start md:items-center p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#14532D]/50 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center text-[#14532D] font-black text-lg md:order-1">
        {module.category.charAt(0)}
      </div>
      <div className="flex-1 min-w-0 md:order-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
            {module.level}
          </span>
          <span className="text-xs font-bold text-[#14532D]">{module.category}</span>
        </div>
        <h3 className="text-lg font-extrabold text-gray-900 leading-snug">{module.title}</h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed line-clamp-2">{module.subtitle}</p>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            {module.durationLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            {module.scheduleLabel}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-[#14532D] shrink-0" />
            {module.syllabus.length} Bab
          </span>
        </div>

        {/* Biaya Akses */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-[#E5E7EB] text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Peserta Terdaftar:</span>
            <span className="font-extrabold text-[#14532D]">100% Gratis</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600">Peserta Umum:</span>
            <span className="font-bold text-gray-900">
              {module.isPaidOnly ? "Paket Berbayar" : "Gratis Terbuka"}
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Aksi - min-h 44px */}
      <div className="md:order-3 md:ml-auto shrink-0">
        <Link
          href={`/materi/${module.slug}`}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-sm transition min-h-[44px] ${
            isTerkunci
              ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-[#14532D] hover:bg-[#0F3F22] text-white"
          }`}
        >
          {isTerkunci ? (
            <>
              <Lock className="h-4 w-4" />
              Pratinjau Materi
            </>
          ) : (
            <>
              Buka Materi Pelajaran
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Link>
      </div>
    </article>
  );
}