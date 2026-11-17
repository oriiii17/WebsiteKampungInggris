import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowRight, BookOpen, MapPin, MessageCircle, MoveUpRight, Sparkles } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import TestimoniSection from "@/components/TestimoniSection";
import { getApprovedTestimoni, getClasses } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import type { ClassItem } from "@/lib/types";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kampung Inggris Sapen | Belajar Bahasa Inggris di Demangan, Yogyakarta",
  description: "Kelas, materi, dan permainan Bahasa Inggris untuk warga RW 06, 07, 08 Demangan, Yogyakarta serta peserta umum.",
  alternates: canonicalUrl("/") ? { canonical: canonicalUrl("/") } : undefined,
  openGraph: {
    title: "Kampung Inggris Sapen | Belajar Bahasa Inggris di Demangan, Yogyakarta",
    description: "Kelas, materi, dan permainan Bahasa Inggris untuk warga RW 06, 07, 08 Demangan, Yogyakarta serta peserta umum.",
  },
};

const assets = {
  hero: "WhatsApp Image 2026-11-17 at 04.41.05.jpg",
  conversation: "WhatsApp Image 2026-11-17 at 04.41.05 (1).jpg",
  grammar: "WhatsApp Image 2026-11-17 at 04.41.05 (2).jpg",
  camp: "WhatsApp Image 2026-11-17 at 04.41.05 (3).jpg",
  galleryOne: "Sunrise English Circle in Java.png",
  galleryTwo: "Gemini_Generated_Image_49q9l249q9l249q9.jfif",
  community: "WhatsApp Image 2026-11-17 at 04.41.05 (5).jpg",
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
    <Image
      src={`/assets/${encodeURIComponent(file)}`}
      alt={alt}
      fill
      sizes="(max-width: 700px) 100vw, (max-width: 1200px) 52vw, 640px"
      priority={loading === "eager"}
      className={className}
    />
  );
}

async function HomeTestimonials() {
  const [session, testimonials] = await Promise.all([getServerSession(), getApprovedTestimoni()]);
  return <TestimoniSection initialTestimoni={testimonials} isLoggedIn={Boolean(session)} currentUserName={session?.name} />;
}

const featuredClassIds = ["class-1794595557465", "class-conversation-starter", "class-grammar-mastery"];

function formatPrice(price: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(price)}`;
}

const learningRoutes = [
  {
    title: "Percakapan sehari-hari",
    description: "Latih ungkapan praktis dan kosakata yang bisa langsung dipakai.",
    href: "/kelas/conversation-starter",
    image: assets.conversation,
    imageAlt: "Peserta Kampung Sapen berlatih membaca dan bercakap bersama",
    icon: MessageCircle,
  },
  {
    title: "Tata bahasa yang mudah diikuti",
    description: "Bangun kalimat dengan materi singkat dan latihan mandiri.",
    href: "/kelas/grammar-mastery",
    image: assets.grammar,
    imageAlt: "Suasana belajar tata bahasa bersama di kelas",
    icon: BookOpen,
  },
];

export default async function HomePage() {
  const availableClasses = await getClasses(false);
  const classesById = new Map(availableClasses.map((item) => [item.id, item]));
  const featuredClasses = featuredClassIds
    .map((id) => classesById.get(id))
    .filter((item): item is ClassItem => Boolean(item));

  return (
    <div className="home-page workbook-page">
      <section className="home-opening workbook-wrap" aria-labelledby="home-title">
        <div className="home-opening-copy">
          <h1 id="home-title" className="home-title font-display">
            Bahasa Inggris tumbuh dari percakapan sehari-hari.
          </h1>
          <p className="home-intro">
            Belajar bersama warga Sapen lewat kelas, materi praktis, dan permainan interaktif—terbuka untuk warga RW 06, 07, 08 serta peserta umum.
          </p>
          <div className="home-actions">
            <Link href="/kelas" className="home-primary-action">
              Jelajahi kelas <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/masuk?mode=warga" className="home-secondary-action">
              Masuk sebagai warga <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <p className="home-location"><MapPin aria-hidden="true" className="h-4 w-4" /> Demangan, Yogyakarta</p>
        </div>

        <figure className="home-opening-art">
          <LocalPhoto
            file={assets.hero}
            alt="Warga Kampung Sapen belajar Bahasa Inggris bersama"
            loading="eager"
            className="home-opening-photo"
          />
          <figcaption className="home-photo-note">
            <span>Ruang belajar warga</span>
            <span>RW 06 · RW 07 · RW 08</span>
          </figcaption>
          <span className="home-photo-mark" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
        </figure>
      </section>

      <section className="home-learning" aria-labelledby="home-learning-title">
        <div className="workbook-wrap">
          <div className="home-section-heading">
            <h2 id="home-learning-title" className="font-display">Mulai dari hal yang dekat dengan keseharian.</h2>
            <p>Berlatih sedikit demi sedikit, lalu gunakan Bahasa Inggris dalam percakapan nyata.</p>
          </div>

          <div className="home-route-list">
            {learningRoutes.map(({ title, description, href, image, imageAlt, icon: Icon }) => (
              <article className="home-route" key={title}>
                <Link href={href} className="home-route-image" aria-label={`Lihat kelas: ${title}`}>
                  <LocalPhoto file={image} alt={imageAlt} />
                  <span className="home-route-arrow"><MoveUpRight aria-hidden="true" className="h-5 w-5" /></span>
                </Link>
                <div className="home-route-copy">
                  <Icon aria-hidden="true" className="home-route-icon" />
                  <h3 className="font-display">{title}</h3>
                  <p>{description}</p>
                  <Link href={href} className="home-text-link">Lihat kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>

          <article className="home-camp-feature">
            <LocalPhoto file={assets.camp} alt="Peserta mengikuti kegiatan English Camp bersama" />
            <div className="home-camp-copy">
              <h3 className="font-display">Belajar juga berarti melakukan.</h3>
              <p>English Camp menghadirkan latihan Bahasa Inggris dalam suasana kebersamaan.</p>
              <Link href="/kelas" className="home-light-link">Temukan kegiatan belajar <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
          </article>
        </div>
      </section>

      <section className="home-classes workbook-wrap" aria-labelledby="home-classes-title">
        <div className="home-classes-intro">
          <h2 id="home-classes-title" className="font-display">Pilih kelas, lalu mulai berlatih.</h2>
          <p>Lihat materi, jadwal, dan pilihan akses di setiap kelas.</p>
          <Link href="/kelas" className="home-text-link">Semua kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        <div className="home-class-list">
          {featuredClasses.length ? featuredClasses.map((item) => (
            <article key={item.id} className="home-class-row">
              <div className="home-class-copy">
                <h3 className="font-display"><Link href={`/kelas/${encodeURIComponent(item.slug)}`}>{item.title}</Link></h3>
                {item.subtitle && <p>{item.subtitle}</p>}
              </div>
              <div className="home-class-action">
                <span>{formatPrice(item.priceIdr)}</span>
                <Link href={`/kelas/${encodeURIComponent(item.slug)}`} aria-label={`Lihat detail ${item.title}`}>
                  Detail <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          )) : (
            <div className="home-empty-classes">
              <p>Kelas baru sedang disiapkan.</p>
              <Link href="/kelas">Lihat halaman kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-community" aria-labelledby="home-community-title">
        <div className="workbook-wrap home-community-layout">
          <div className="home-community-copy">
            <h2 id="home-community-title" className="font-display">Satu lingkungan, banyak cara untuk belajar.</h2>
            <p>Ruang belajar ini dibangun untuk warga Kampung Sapen dan siapa pun yang ingin ikut berlatih.</p>
            <Link href="/tentang" className="home-light-link">Kenali Kampung Inggris Sapen <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <div className="home-gallery" aria-label="Suasana belajar di Kampung Inggris Sapen">
            <figure className="home-gallery-main">
              <LocalPhoto file={assets.community} alt="Warga mengikuti kegiatan belajar bersama di Kampung Sapen" />
              <figcaption>Belajar bersama di lingkungan sendiri</figcaption>
            </figure>
            <figure className="home-gallery-side home-gallery-sunrise">
              <LocalPhoto file={assets.galleryOne} alt="Lingkar belajar Bahasa Inggris saat matahari terbit" />
              <figcaption>English Circle</figcaption>
            </figure>
            <figure className="home-gallery-side home-gallery-together">
              <LocalPhoto file={assets.galleryTwo} alt="Anak-anak berlatih Bahasa Inggris bersama" />
              <figcaption>Berlatih bersama</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="home-trust workbook-wrap" aria-label="Cerita peserta dan pertanyaan umum">
        <div className="home-testimonials">
          <h2 className="font-display">Cerita dari ruang belajar Sapen.</h2>
          <Suspense fallback={<div aria-hidden="true" className="home-testimonials-loading" />}>
            <HomeTestimonials />
          </Suspense>
        </div>
        <div className="home-faq">
          <h2 className="font-display">Ada yang ingin ditanyakan?</h2>
          <FaqAccordion limit={3} />
          <Link href="/faq" className="home-text-link">Baca semua pertanyaan <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="home-closeout" aria-labelledby="home-closeout-title">
        <div className="workbook-wrap home-closeout-inner">
          <div>
            <h2 id="home-closeout-title" className="font-display">Siap mulai belajar bersama?</h2>
            <p>Pilih kelas yang sesuai dan temukan langkah pertamamu.</p>
          </div>
          <Link href="/kelas" className="home-primary-action home-closeout-action">Lihat semua kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}
