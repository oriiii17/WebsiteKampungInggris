import React from "react";
import Link from "next/link";
import { GraduationCap, Lock, MapPin } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-leaf-dark bg-leaf pb-24 pt-14 text-white md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Kolom 1: Tentang */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 bg-leaf-dark text-sunshine">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                {SITE_CONFIG.name}
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
              {SITE_CONFIG.shortDesc}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-white/75">
              <MapPin className="h-4 w-4 text-sunshine shrink-0" />
              <span>{SITE_CONFIG.location}</span>
            </div>
          </div>

          {/* Kolom 2: Menu Pembelajaran */}
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              Menu Utama
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>
                <Link href="/materi" className="hover:text-sunshine">
                  Daftar Materi Belajar
                </Link>
              </li>
              <li>
                <Link href="/game" className="hover:text-sunshine">
                  Game Interaktif (Live PIN)
                </Link>
              </li>
              <li>
                <Link href="/paket" className="hover:text-sunshine">
                  Paket & Akses Belajar
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-sunshine">
                  Papan Peringkat
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Bantuan & Admin */}
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              Akses & Bantuan
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>
                <Link href="/login" className="font-semibold hover:text-sunshine">
                  Masuk Akun Pembelajaran
                </Link>
              </li>
              <li>
                <span className="block text-xs text-white/65">Bantuan & Informasi:</span>
                <span className="text-sm">Hubungi Pengurus Kampung Inggris Sapen</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/20 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-white/65 gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
