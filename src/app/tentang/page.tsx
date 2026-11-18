import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gamepad2, GraduationCap } from "lucide-react";

import { canonicalUrl } from "@/lib/seo";

export const metadata = { title: "Tentang Kampung Inggris Sapen | Program Belajar di Demangan", description: "Profil, arah belajar, dan layanan Bahasa Inggris Kampung Sapen untuk warga RW 06, 07, 08 dan peserta umum.", alternates: canonicalUrl("/tentang") ? { canonical: canonicalUrl("/tentang") } : undefined, openGraph: { title: "Tentang Kampung Inggris Sapen", description: "Profil program belajar Bahasa Inggris Kampung Sapen di Demangan, Yogyakarta." } };

export default function TentangPage() {
  return (
    <main className="workbook-page">
      <section className="workbook-wrap pb-12 pt-10 sm:pb-16 sm:pt-16">
        <div className="grid overflow-hidden rounded-[22px] border border-rule bg-white shadow-card md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
            <p className="workbook-print-note">Tentang program</p>
            <h1 className="mt-3 text-4xl sm:text-6xl">Bahasa Inggris, dekat dengan warga.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-body">Sapen English adalah platform belajar Bahasa Inggris untuk warga Kampung Sapen—RW 06, RW 07, dan RW 08 di Kelurahan Demangan, Gondokusuman, Yogyakarta—serta peserta umum.</p>
            <Link href="/kelas" className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-earth px-4 py-2.5 text-sm font-extrabold text-white hover:bg-earth-dark">Jelajahi kelas <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <figure className="illustration-frame relative min-h-72 md:min-h-[480px]">
            <Image src="/images/community/kampung-sapen-belajar.webp" alt="Peserta belajar bersama di kawasan Kampung Sapen" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            <figcaption className="absolute bottom-4 left-4"><span className="workbook-photo-note">Suasana belajar di Sapen</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="workbook-section bg-white">
        <div className="workbook-wrap grid gap-8 md:grid-cols-[.9fr_1.1fr] md:gap-14">
          <div><p className="workbook-print-note">Profil</p><h2 className="workbook-section-heading mt-3">Satu platform untuk beragam cara belajar.</h2><figure className="illustration-frame relative mt-6 aspect-[16/9]"><Image src="/images/community/belajar-kawasan.webp" alt="Peserta berdiskusi sambil belajar di ruang terbuka" fill sizes="(max-width: 767px) 100vw, 45vw" className="object-cover" /><figcaption className="absolute bottom-3 left-3"><span className="workbook-photo-note">RW 06 · RW 07 · RW 08</span></figcaption></figure></div>
          <div className="max-w-3xl space-y-5 text-base leading-8 text-body">
            <p>Program ini menggabungkan akses belajar gratis bagi warga dengan kelas terstruktur untuk peserta umum. Warga menggunakan kode wilayah, sementara peserta umum dapat membuat akun dan melihat katalog kelas.</p>
            <p>Materi digital, latihan mandiri, dan sesi permainan live mendukung kegiatan belajar di rumah maupun bersama pengajar.</p>
          </div>
        </div>
      </section>

      <section className="workbook-section">
        <div className="workbook-wrap grid gap-8 md:grid-cols-2 md:gap-16">
          <article className="border-t-2 border-ink pt-5"><p className="workbook-print-note">Arah pembelajaran</p><h2 className="mt-3 text-3xl">Belajar yang mudah dijangkau.</h2><p className="mt-4 text-sm leading-7 text-body">Mendekatkan bahan belajar Bahasa Inggris kepada warga melalui akses digital yang bisa digunakan lewat ponsel maupun komputer.</p></article>
          <article className="border-t-2 border-ink pt-5"><p className="workbook-print-note">Cara kami mendukung</p><h2 className="mt-3 text-3xl">Belajar, berlatih, dan bermain.</h2><p className="mt-4 text-sm leading-7 text-body">Materi flipbook, latihan, kelas, dan game live memberi peserta beberapa cara untuk memahami dan mempraktikkan Bahasa Inggris.</p></article>
        </div>
      </section>

      <section className="workbook-section bg-paper-light">
        <div className="workbook-wrap">
          <p className="workbook-print-note">Mengapa Sapen English</p>
          <h2 className="workbook-section-heading mt-3">Akses dan kegiatan belajar dalam satu tempat.</h2>
          <div className="mt-8 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
            <div><GraduationCap className="h-6 w-6 text-leaf"/><h3 className="mt-3 text-xl">Akses warga</h3><p className="mt-2 text-sm leading-6 text-body">Warga RW 06, 07, dan 08 dapat memakai kode akses dari pengelola.</p></div>
            <div><BookOpen className="h-6 w-6 text-leaf"/><h3 className="mt-3 text-xl">Materi terstruktur</h3><p className="mt-2 text-sm leading-6 text-body">Baca materi digital dan pilih kelas sesuai tujuan belajar.</p></div>
            <div><Gamepad2 className="h-6 w-6 text-earth"/><h3 className="mt-3 text-xl">Latihan bersama</h3><p className="mt-2 text-sm leading-6 text-body">Ikuti permainan live bersama pengajar dan peserta lain.</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
