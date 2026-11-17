import { Suspense } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import TestimoniSection from "@/components/TestimoniSection";
import { getApprovedTestimoni, getClasses } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import type { ClassItem } from "@/lib/types";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kampung Inggris Sapen | Belajar Bahasa Inggris di Demangan, Yogyakarta",
  description: "Kelas, materi, dan game Bahasa Inggris untuk warga RW 06, 07, 08 Demangan, Gondokusuman, Yogyakarta serta peserta umum.",
  alternates: canonicalUrl("/") ? { canonical: canonicalUrl("/") } : undefined,
  openGraph: {
    title: "Kampung Inggris Sapen | Belajar Bahasa Inggris di Demangan, Yogyakarta",
    description: "Kelas, materi, dan game Bahasa Inggris untuk warga RW 06, 07, 08 Demangan, Gondokusuman, Yogyakarta serta peserta umum.",
  },
};

const assets = {
  hero: "WhatsApp Image 2026-11-17 at 04.41.05.jpg",
  conversation: "WhatsApp Image 2026-11-17 at 04.41.05 (1).jpg",
  grammar: "WhatsApp Image 2026-11-17 at 04.41.05 (2).jpg",
  camp: "WhatsApp Image 2026-11-17 at 04.41.05 (3).jpg",
  tutor: "WhatsApp Image 2026-11-17 at 04.41.05 (4).jpg",
  galleryOne: "Sunrise English Circle in Java.png",
  galleryTwo: "Gemini_Generated_Image_49q9l249q9l249q9.jfif",
};

function LocalPhoto({
  file,
  alt,
  className = "",
  loading = "lazy",
}: {
  file: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <img
      src={`/assets/${encodeURIComponent(file)}`}
      alt={alt}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      className={className}
    />
  );
}

async function HomeTestimonials() {
  const [session, testimonials] = await Promise.all([getServerSession(), getApprovedTestimoni()]);
  return <TestimoniSection initialTestimoni={testimonials} isLoggedIn={Boolean(session)} currentUserName={session?.name} />;
}

const featuredClassIds = [
  "class-1794595557465",
  "class-conversation-starter",
  "class-grammar-mastery",
];

function formatPrice(price: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(price)}`;
}

export default async function HomePage() {
  const availableClasses = await getClasses(false);
  const classesById = new Map(availableClasses.map((item) => [item.id, item]));
  const featuredClasses = featuredClassIds
    .map((id) => classesById.get(id))
    .filter((item): item is ClassItem => Boolean(item));

  return (
    <div className="workbook-page overflow-hidden">
      <section className="workbook-wrap pt-5 sm:pt-8">
        <div className="relative isolate overflow-hidden bg-[#244B3A]">
          <div className="relative min-h-[42rem] sm:min-h-[40rem] lg:min-h-[38rem]">
            <LocalPhoto
              file={assets.hero}
              alt="Ilustrasi warga belajar Bahasa Inggris bersama di lingkungan Kampung Sapen"
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#F3E9D5]/95 via-[#F3E9D5]/80 to-transparent sm:from-[#F3E9D5]/90 sm:via-[#F3E9D5]/60" />
            <div className="absolute inset-x-5 top-6 z-10 flex items-center gap-2 text-sm font-bold text-[#244B3A] sm:inset-x-10 sm:top-9">
              <MapPin aria-hidden="true" className="h-4 w-4 text-[#BA472F]" />
              Sapen, Yogyakarta
            </div>
            <div className="absolute inset-x-5 bottom-7 z-10 max-w-3xl sm:inset-x-10 sm:bottom-10 lg:bottom-12">
              <h1 className="max-w-[9ch] font-display text-[clamp(3.4rem,9vw,6rem)] font-black uppercase leading-[.94] tracking-[-.035em] text-[#244B3A]">
                Kampung Inggris Sapen
              </h1>
              <p className="mt-5 font-display text-xl font-bold text-[#BA472F] sm:mt-7 sm:text-3xl">
                Belajar, Berbicara, Bermain, Bertumbuh
              </p>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[#20251F] sm:text-base sm:leading-7">
                Ruang belajar Bahasa Inggris yang tumbuh bersama warga Sapen dan terbuka untuk peserta umum.
              </p>
              <Link
                href="/kelas"
                className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#E86A2C] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#BA472F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#244B3A] sm:mt-8 sm:px-6 sm:text-base"
              >
                Lihat Kelas <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <span className="absolute bottom-5 right-5 hidden text-xs font-extrabold uppercase tracking-[.16em] text-[#244B3A] sm:block">
              RW 06 · RW 07 · RW 08
            </span>
          </div>
        </div>
      </section>

      <section id="program" className="mt-14 bg-[#244B3A] py-14 text-[#FDF9F0] sm:mt-20 sm:py-20 lg:mt-24">
        <div className="workbook-wrap">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:mb-12 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F5B28B]">Program belajar</p>
              <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-.03em] text-white sm:text-6xl">
                Belajar dengan cara yang dekat dengan keseharian.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#F3E9D5] sm:text-base">
              Pilih kelas, pelajari materi, dan terus berlatih melalui kegiatan yang tersedia.
            </p>
          </div>

          <article className="grid overflow-hidden bg-[#F3E9D5] text-[#20251F] lg:grid-cols-[1.2fr_.8fr]">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[28rem]">
              <LocalPhoto
                file={assets.conversation}
                alt="Ilustrasi warga Sapen membaca dan bercakap bersama"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-10 lg:p-12">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#BA472F]">Percakapan</p>
                <h3 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">Kelas Percakapan &amp; Kosakata Praktis</h3>
                <p className="mt-5 text-base leading-7 text-[#3D4038]">
                  Latih keberanian berbicara melalui ungkapan praktis dan kosakata untuk percakapan sehari-hari.
                </p>
              </div>
              <Link href="/kelas/conversation-starter" className="inline-flex min-h-11 items-center gap-2 font-extrabold text-[#244B3A] underline decoration-[#E86A2C] underline-offset-4">
                Lihat detail kelas <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="mt-5 grid overflow-hidden bg-[#E86A2C] text-white lg:grid-cols-[.8fr_1.2fr]">
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-10 lg:order-1 lg:p-12">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-white/80">Tata bahasa</p>
                <h3 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">Kelas Tata Bahasa &amp; Struktur Kalimat</h3>
                <p className="mt-5 text-base leading-7 text-white/90">
                  Bangun dasar kalimat dan pahami tata bahasa melalui materi serta latihan mandiri.
                </p>
              </div>
              <Link href="/kelas/grammar-mastery" className="inline-flex min-h-11 items-center gap-2 font-extrabold text-white underline decoration-white/70 underline-offset-4">
                Lihat detail kelas <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[28rem]">
              <LocalPhoto
                file={assets.grammar}
                alt="Ilustrasi tutor membimbing peserta belajar tata bahasa di kelas"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="relative mt-5 overflow-hidden bg-[#BA472F]">
            <div className="relative aspect-[4/3] sm:aspect-[16/7]">
              <LocalPhoto
                file={assets.camp}
                alt="Ilustrasi peserta mengikuti kegiatan English Camp bersama"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#20251F]/90 via-[#20251F]/15 to-transparent" />
              <div className="absolute inset-x-5 bottom-6 text-white sm:inset-x-10 sm:bottom-10">
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#FFD5B8]">Belajar bersama</p>
                <h3 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-6xl">English Camp</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                  Kegiatan belajar Bahasa Inggris dalam suasana kebersamaan.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="tutor" className="workbook-section">
        <div className="workbook-wrap grid items-center gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 bg-[#E86A2C]" aria-hidden="true" />
            <div className="relative aspect-[4/5] overflow-hidden bg-[#F3E9D5]">
              <LocalPhoto
                file={assets.tutor}
              alt="Ilustrasi Tutor Lia"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="py-5 lg:py-10">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#BA472F]">Tutor</p>
            <h2 className="mt-3 font-display text-5xl font-bold leading-tight tracking-[-.03em] text-[#244B3A] sm:text-7xl">Tutor Lia</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3D4038]">
              Kenali tutor yang hadir dalam perjalanan belajar Bahasa Inggris di Kampung Sapen.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#625F54]">
              Kelas, latihan, dan kegiatan belajar dirancang agar peserta dapat terus berlatih bersama.
            </p>
          </div>
        </div>
      </section>

      <section id="galeri" className="bg-[#FDF9F0] py-14 sm:py-20">
        <div className="workbook-wrap">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-12 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#BA472F]">Galeri</p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-[#244B3A] sm:text-6xl">Belajar tumbuh bersama.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#625F54]">Momen belajar dan kebersamaan warga di Kampung Inggris Sapen.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-12 md:gap-5">
            <figure className="relative min-h-72 overflow-hidden bg-[#244B3A] md:col-span-7 md:row-span-2 md:min-h-[42rem]">
              <LocalPhoto file="WhatsApp Image 2026-11-17 at 04.41.05 (5).jpg" alt="Ilustrasi kegiatan belajar bersama di Kampung Sapen" className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#20251F]/85 to-transparent px-5 pb-5 pt-16 font-display text-2xl font-bold text-white sm:px-7 sm:pb-7 sm:text-3xl">Belajar Bersama</figcaption>
            </figure>
            <figure className="relative min-h-64 overflow-hidden bg-[#E86A2C] md:col-span-5 md:min-h-80">
              <LocalPhoto file={assets.galleryOne} alt="Ilustrasi lingkar belajar Bahasa Inggris di Jawa saat matahari terbit" className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#20251F]/80 to-transparent px-5 pb-5 pt-14 font-display text-xl font-bold text-white">English Circle in Java</figcaption>
            </figure>
            <figure className="relative min-h-64 overflow-hidden bg-[#BA472F] md:col-span-5 md:min-h-80">
              <LocalPhoto file={assets.galleryTwo} alt="Ilustrasi kegiatan belajar anak-anak bersama" className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#20251F]/80 to-transparent px-5 pb-5 pt-14 font-display text-xl font-bold text-white">Kegiatan Kampung Sapen</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="harga" className="bg-[#244B3A] py-14 text-white sm:py-20">
        <div className="workbook-wrap">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F5B28B]">Pilihan kelas</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-[.98] tracking-[-.03em] text-white sm:text-7xl">Daftar Kelas</h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-[#F3E9D5]">Pilih kelas yang ingin dipelajari, lihat rinciannya, lalu lanjutkan melalui alur pendaftaran yang tersedia.</p>
            </div>
            <div className="border-t border-white/30">
              {featuredClasses.length > 0 ? featuredClasses.map((item) => (
                <article key={item.id} className="grid gap-3 border-b border-white/30 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:py-7">
                  <div>
                    <h3 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{item.title}</h3>
                    {item.subtitle ? <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{item.subtitle}</p> : null}
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <span className="whitespace-nowrap text-lg font-extrabold text-[#F5B28B] sm:text-xl">{formatPrice(item.priceIdr)}</span>
                    <Link href={`/kelas/${encodeURIComponent(item.slug)}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-white/60 px-4 py-2 text-sm font-extrabold text-white transition hover:border-[#E86A2C] hover:bg-[#E86A2C]">
                      Detail <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              )) : (
                <p className="border-b border-white/30 py-7 text-white/80">Kelas belum tersedia saat ini.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="workbook-section">
        <div className="workbook-wrap grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#BA472F]">Pertanyaan umum</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-[#244B3A] sm:text-5xl">Sebelum mulai belajar.</h2>
          </div>
          <FaqAccordion limit={3} />
        </div>
      </section>

      <section className="border-y border-[#D2C5AD] bg-[#FDF9F0] py-14 sm:py-20">
        <div className="workbook-wrap">
          <div className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#BA472F]">Dari peserta</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-[#244B3A] sm:text-5xl">Cerita belajar di Sapen.</h2>
          </div>
          <Suspense fallback={<div aria-hidden="true" className="min-h-40 border-y border-[#D2C5AD] bg-white/40" />}>
            <HomeTestimonials />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
