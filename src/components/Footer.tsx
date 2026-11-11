import React from "react";
import Link from "next/link";
import { GraduationCap, Lock, MapPin } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white pb-24 pt-12 md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Kolom 1: Tentang */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14532D] text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-gray-900">
                {SITE_CONFIG.name}
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-gray-600 leading-relaxed">
              {SITE_CONFIG.shortDesc}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{SITE_CONFIG.location}</span>
            </div>
          </div>

          {/* Kolom 2: Menu Pembelajaran */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Menu Utama
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/materi" className="hover:text-gray-900">
                  Daftar Materi Belajar
                </Link>
              </li>
              <li>
                <Link href="/game" className="hover:text-gray-900">
                  Game Interaktif (Live PIN)
                </Link>
              </li>
              <li>
                <Link href="/paket" className="hover:text-gray-900">
                  Paket & Akses Belajar
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-gray-900">
                  Papan Peringkat
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Bantuan & Admin */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Akses & Bantuan
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/login" className="hover:text-gray-900 font-semibold text-[#14532D]">
                  Masuk Akun Pembelajaran
                </Link>
              </li>
              <li>
                <span className="block text-xs text-gray-400">Bantuan & Informasi:</span>
                <span className="text-xs text-gray-600">Hubungi Pengelola Sapen English</span>
              </li>
              <li className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  <Lock className="h-3.5 w-3.5 text-gray-500" />
                  Panel Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
