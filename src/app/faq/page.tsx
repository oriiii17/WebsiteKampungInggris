import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import { publicPageMetadata } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Pertanyaan Umum tentang Kelas dan Akses",
  description: "Temukan panduan pendaftaran, kelas, kode akses, dan penggunaan Kampung Inggris Sapen di Demangan, Yogyakarta. Hubungi tim jika jawaban yang Anda cari belum tersedia.",
  pathname: "/faq",
});

export default function FaqPage() {
  return (
    <main className="workbook-page">
      <section className="workbook-wrap pb-14 pt-10 sm:pb-20 sm:pt-16">
        <div className="mb-10 grid gap-6 border-b-2 border-ink pb-8 md:grid-cols-[minmax(0,1fr)_minmax(12rem,.55fr)] md:items-end">
          <div><p className="workbook-print-note">Pusat bantuan</p><h1 className="workbook-section-heading mt-3">Pertanyaan yang sering diajukan.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-body">Panduan singkat untuk masuk, menggunakan kode akses, mendaftar kelas, dan mengikuti game.</p><Link href="/masuk" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-leaf underline decoration-sunshine underline-offset-4">Ke halaman masuk <ArrowRight className="h-4 w-4" /></Link></div>
          <figure className="illustration-frame relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border border-rule bg-white"><Image src="/images/faq-guide.svg" alt="Ilustrasi panduan dan pertanyaan" fill priority sizes="(max-width: 767px) 90vw, 30vw" className="object-contain p-3" /></figure>
        </div>
        <div className="mx-auto max-w-4xl rounded-xl border border-rule bg-white px-5 sm:px-8"><FaqAccordion /></div>
      </section>
    </main>
  );
}
