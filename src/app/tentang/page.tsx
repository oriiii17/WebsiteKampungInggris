import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Gamepad2, GraduationCap } from "lucide-react";

import { publicPageMetadata } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Tentang Program Belajar di Demangan",
  description: "Kenali Kampung Inggris Sapen, program belajar Bahasa Inggris yang tumbuh dari komunitas Demangan. Kegiatan dan materi terbuka bagi warga serta peserta umum.",
  pathname: "/tentang",
});

export default function TentangPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return (
    <main className="workbook-page">
      <section className="workbook-wrap pb-12 pt-10 sm:pb-16 sm:pt-16">
        <div className="grid overflow-hidden rounded-[22px] border border-rule bg-white shadow-card md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
            <p className="workbook-print-note">Tentang program</p>
            <h1 className="mt-3 text-4xl sm:text-6xl">Bahasa Inggris, akrab untuk semua</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-body">Sapen English adalah platform belajar Bahasa Inggris yang lahir dari komunitas Kampung Sapen dan terbuka untuk masyarakat umum dari mana saja</p>
            <Link href="/kelas" className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-earth px-4 py-2.5 text-sm font-extrabold text-white hover:bg-earth-dark">Jelajahi kelas <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <figure className="illustration-frame relative min-h-72 md:min-h-[480px]">
            <Image src="/images/baru/TentangProgram.jpg" alt="Kegiatan belajar dalam program Sapen English" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </figure>
        </div>
      </section>

      <section className="workbook-section bg-white">
        <div className="workbook-wrap grid gap-8 md:grid-cols-[.9fr_1.1fr] md:gap-14">
          <div><p className="workbook-print-note">Profil</p><h2 className="workbook-section-heading mt-3">Satu platform untuk beragam cara belajar.</h2><figure className="illustration-frame relative mt-6 aspect-[16/9]"><Image src="/images/baru/Profil.jpg" alt="Profil kegiatan belajar Sapen English" fill sizes="(max-width: 767px) 100vw, 45vw" className="object-cover" /></figure></div>
          <div className="max-w-3xl space-y-5 text-base leading-8 text-body">
            <p>Program ini menggabungkan akses belajar gratis bagi warga Sapen dengan kelas terstruktur untuk peserta umum. Warga dapat masuk menggunakan Kode Akses, sementara peserta umum dapat membuat akun untuk mengakses katalog kelas.</p>
            <p>Materi digital, latihan mandiri, dan sesi permainan langsung mendukung kegiatan belajar di rumah maupun bersama pengajar.</p>
          </div>
        </div>
      </section>

      <section className="workbook-section about-pillars">
        <div className="workbook-wrap grid gap-8 md:grid-cols-2 md:gap-16">
          <article className="border-t-2 border-ink pt-5"><p className="workbook-print-note">Arah pembelajaran</p><h2 className="mt-3 text-3xl">Belajar yang mudah dijangkau.</h2><p className="mt-4 text-sm leading-7 text-body">Menghadirkan bahan belajar Bahasa Inggris bagi peserta melalui akses digital yang praktis digunakan lewat ponsel maupun komputer.</p></article>
          <article className="border-t-2 border-ink pt-5"><p className="workbook-print-note">Cara kami mendukung</p><h2 className="mt-3 text-3xl">Belajar, berlatih, dan bermain.</h2><p className="mt-4 text-sm leading-7 text-body">Modul digital, latihan mandiri, kelas, dan permainan interaktif memberi peserta beragam cara untuk memahami dan mempraktikkan Bahasa Inggris.</p></article>
        </div>
      </section>

      <section className="workbook-section bg-paper-light">
        <div className="workbook-wrap">
          <p className="workbook-print-note">Mengapa Sapen English</p>
          <h2 className="workbook-section-heading mt-3">Akses dan kegiatan belajar dalam satu tempat.</h2>
          <div className="mt-8 grid gap-6 border-t border-rule pt-6 md:grid-cols-3">
            <div><GraduationCap className="h-6 w-6 text-leaf"/><h3 className="mt-3 text-xl">Akses terbuka</h3><p className="mt-2 text-sm leading-6 text-body">Warga RW 06–08 dapat memakai kode akses gratis, sementara peserta umum bebas mendaftar akun reguler.</p></div>
            <div><BookOpen className="h-6 w-6 text-leaf"/><h3 className="mt-3 text-xl">Materi terstruktur</h3><p className="mt-2 text-sm leading-6 text-body">Baca materi digital dan pilih kelas sesuai tujuan belajar.</p></div>
            <div><Gamepad2 className="h-6 w-6 text-earth"/><h3 className="mt-3 text-xl">Latihan bersama</h3><p className="mt-2 text-sm leading-6 text-body">Ikuti permainan interaktif bersama pengajar dan peserta lain secara langsung.</p></div>
          </div>
        </div>
      </section>
      {contactEmail && <p className="workbook-wrap py-8 text-sm font-semibold text-body">Butuh bantuan? Hubungi <a className="font-bold text-leaf underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>}
    </main>
  );
}
