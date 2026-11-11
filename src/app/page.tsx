import Link from "next/link";
import { BookOpen, Gamepad2, ArrowRight, GraduationCap } from "lucide-react";

export default async function HomePage() {
  return (
    <div className="bg-white text-[#1A2E1A]">
      <section className="border-b border-[#E5E7EB] bg-[#FDFBF7]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#14532D]/20 bg-white px-3 py-1 text-xs font-bold text-[#14532D]">
            <GraduationCap className="h-4 w-4" />
            Sapen English
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-[#1A2E1A] sm:text-5xl lg:text-6xl">
            Belajar Bahasa Inggris Praktis untuk Komunitas
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#1A2E1A]/75 sm:text-lg">
            Akses materi kelas, flipbook, dan game interaktif live untuk belajar mandiri maupun bersama.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/masuk"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#14532D] px-7 py-3 text-base font-extrabold text-white shadow-sm transition hover:bg-[#0F3F22] sm:w-auto"
            >
              Mulai Belajar
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/kelas"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-7 py-3 text-base font-extrabold text-[#1A2E1A] transition hover:bg-[#FDFBF7] sm:w-auto"
            >
              <BookOpen className="h-5 w-5" />
              Lihat Kelas
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#1A2E1A]/65">
            <span>Gratis untuk warga (kode akses)</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#1A2E1A]/30 sm:inline-block" aria-hidden="true" />
            <span>Materi & game live interaktif</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <BookOpen className="h-6 w-6 text-[#14532D]" />
            <h2 className="mt-3 text-base font-extrabold text-[#1A2E1A]">Materi & Flipbook</h2>
            <p className="mt-1 text-sm text-[#1A2E1A]/70">Baca materi per bab dengan tampilan flipbook yang cepat dan responsif.</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <Gamepad2 className="h-6 w-6 text-[#14532D]" />
            <h2 className="mt-3 text-base font-extrabold text-[#1A2E1A]">Game Live</h2>
            <p className="mt-1 text-sm text-[#1A2E1A]/70">Ikuti kuis dan game kelas dengan PIN, skor live, dan podium.</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <GraduationCap className="h-6 w-6 text-[#14532D]" />
            <h2 className="mt-3 text-base font-extrabold text-[#1A2E1A]">Akses Mudah</h2>
            <p className="mt-1 text-sm text-[#1A2E1A]/70">Masuk dengan kode warga atau akun untuk membuka kelas dan materi.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
