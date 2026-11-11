import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, BookOpenCheck, Gamepad2, GraduationCap, LibraryBig, Sparkles } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import TestimoniSection from "@/components/TestimoniSection";
import { getApprovedTestimoni } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export default async function HomePage() {
  const [session, testimonials] = await Promise.all([getServerSession(), getApprovedTestimoni()]);

  return (
    <div className="workbook-page">
      <section className="workbook-wrap pb-14 pt-8 sm:pb-20 sm:pt-12">
        <div className="workbook-spread workbook-open">
          <div className="workbook-leaf workbook-leaf--left flex min-h-[500px] flex-col justify-between">
            <div>
              <h1 className="workbook-title">Bahasa Inggris, makin dekat.</h1>
              <p className="mt-3 max-w-[36rem] text-sm leading-6 text-body sm:mt-6 sm:text-lg sm:leading-7">
                Belajar bersama warga Kampung Sapen lewat kelas, bacaan flipbook, dan permainan yang bisa diikuti dari rumah atau di kelas.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-8">
                <Link href="/masuk" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-earth px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-earth-dark">
                  Mulai Belajar <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/kelas" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-leaf bg-paper-light px-5 py-3 text-sm font-extrabold text-leaf transition hover:bg-leaf-soft">
                  Lihat Kelas
                </Link>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-rule pt-3 text-xs font-semibold text-body sm:mt-12 sm:gap-y-2 sm:pt-4 sm:text-sm">
              <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4 text-leaf" /> Warga belajar gratis dengan kode akses</span>
              <span className="inline-flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-earth" /> Belajar sendiri atau bareng kelas</span>
            </div>
          </div>

          <div className="workbook-leaf workbook-leaf--right flex min-h-[500px] flex-col justify-center">
            <div className="mb-4 flex items-end justify-between gap-4 border-b-2 border-ink pb-3 sm:mb-8 sm:pb-4">
              <div>
                <p className="workbook-print-note">Daftar isi</p>
                <h2 className="mt-1 text-2xl sm:text-4xl">Mulai dari sini</h2>
              </div>
              <BookOpen className="mb-1 h-7 w-7 text-earth" aria-hidden="true" />
            </div>
            <nav className="workbook-index" aria-label="Jelajahi Kampung Inggris Sapen">
              <Link className="workbook-index-row" href="/kelas"><span className="workbook-index-mark">A</span><span><strong className="block text-base sm:text-lg">Kelas</strong><span className="text-xs text-muted sm:text-sm">Belajar bertahap bersama pengajar</span></span><ArrowRight className="h-4 w-4 text-leaf" /></Link>
              <Link className="workbook-index-row" href="/materi"><span className="workbook-index-mark">B</span><span><strong className="block text-base sm:text-lg">Materi & flipbook</strong><span className="text-xs text-muted sm:text-sm">Baca, berlatih, ulangi lagi</span></span><ArrowRight className="h-4 w-4 text-leaf" /></Link>
              <Link className="workbook-index-row" href="/game"><span className="workbook-index-mark">C</span><span><strong className="block text-base sm:text-lg">Game live</strong><span className="text-xs text-muted sm:text-sm">Masukkan PIN untuk gabung kuis kelas</span></span><ArrowRight className="h-4 w-4 text-leaf" /></Link>
              <Link className="workbook-index-row" href="/paket"><span className="workbook-index-mark">D</span><span><strong className="block text-base sm:text-lg">Paket belajar</strong><span className="text-xs text-muted sm:text-sm">Lihat pilihan akses dan kelas</span></span><ArrowRight className="h-4 w-4 text-leaf" /></Link>
            </nav>
            <Link href="#tentang" className="mt-3 hidden min-h-11 w-fit items-center gap-2 text-sm font-extrabold text-leaf underline decoration-saffron decoration-2 underline-offset-4 hover:text-earth sm:mt-7 sm:inline-flex">
              Kenali programnya <ArrowDown className="h-4 w-4" />
            </Link>
            <span className="mt-8 hidden self-end workbook-print-note sm:block">Halaman pembuka · 01</span>
          </div>
        </div>
      </section>

      <section id="tentang" className="workbook-section bg-paper-light">
        <div className="workbook-wrap grid gap-10 md:grid-cols-[.82fr_1.18fr] md:gap-16">
          <div>
            <p className="workbook-print-note">Tentang program</p>
            <h2 className="workbook-section-heading mt-3">Satu ruang belajar untuk Kampung Sapen.</h2>
          </div>
          <div className="max-w-2xl text-base leading-8 text-body">
            <p>Kampung Inggris Sapen adalah platform belajar bahasa Inggris untuk warga Kampung Sapen. Warga dapat masuk memakai nama panggilan dan kode akses; peserta umum tersedia lewat jalur akun dan paket belajar.</p>
            <p className="mt-5">Di dalamnya ada kelas terstruktur, materi digital berbentuk flipbook, latihan mandiri, dan game live untuk belajar bersama pengajar maupun teman sekelas.</p>
            <div className="mt-8 grid gap-4 border-t border-rule pt-6 sm:grid-cols-3">
              <Link href="/kelas" className="group flex min-h-16 items-center gap-3 border-b border-rule pb-3 text-sm font-extrabold text-ink hover:text-earth sm:border-b-0 sm:pb-0"><GraduationCap className="h-5 w-5 text-leaf" /> Kelas terarah <ArrowRight className="ml-auto h-4 w-4" /></Link>
              <Link href="/materi" className="group flex min-h-16 items-center gap-3 border-b border-rule pb-3 text-sm font-extrabold text-ink hover:text-earth sm:border-b-0 sm:pb-0"><LibraryBig className="h-5 w-5 text-leaf" /> Bahan belajar <ArrowRight className="ml-auto h-4 w-4" /></Link>
              <Link href="/game" className="group flex min-h-16 items-center gap-3 text-sm font-extrabold text-ink hover:text-earth"><Sparkles className="h-5 w-5 text-earth" /> Belajar bareng <ArrowRight className="ml-auto h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="workbook-section">
        <div className="workbook-wrap">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="workbook-print-note">Catatan dari peserta</p><h2 className="workbook-section-heading mt-3">Cerita belajar di Sapen.</h2></div>
            <span className="max-w-sm text-sm leading-6 text-muted">Ulasan yang dibagikan peserta muncul di sini setelah diperiksa pengurus.</span>
          </div>
          <TestimoniSection initialTestimoni={testimonials} isLoggedIn={Boolean(session)} currentUserName={session?.name} />
        </div>
      </section>

      <section id="faq" className="workbook-section bg-paper-light">
        <div className="workbook-wrap grid gap-10 md:grid-cols-[.75fr_1.25fr] md:gap-16">
          <div><p className="workbook-print-note">Pertanyaan umum</p><h2 className="workbook-section-heading mt-3">Sebelum membuka halaman berikutnya.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-muted">Jawaban tentang kode warga, cara masuk, dan akses materi.</p></div>
          <FaqAccordion />
        </div>
      </section>
    </div>
  );
}
