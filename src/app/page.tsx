import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowRight, BookOpen, MapPin, MessageCircle, Sparkles } from "lucide-react";
import FaqAccordion, { HOME_FAQ_LIST } from "@/components/FaqAccordion";
import TestimoniSection from "@/components/TestimoniSection";
import { getPublicClasses, getPublicTestimonials } from "@/lib/public-data-cache";
import { getServerSession } from "@/lib/auth";
import type { ClassItem } from "@/lib/types";
import type { Metadata } from "next";
import { getSiteUrl, publicPageMetadata } from "@/lib/site";
import ClassListingCard from "@/components/ClassListingCard";

export const revalidate = 60;

export const metadata: Metadata = publicPageMetadata({
  title: "Belajar Bahasa Inggris di Demangan, Yogyakarta",
  description: "Kampung Inggris Sapen menyediakan kelas, materi, dan permainan Bahasa Inggris untuk warga Demangan dan peserta umum. Mulai berlatih bersama komunitas belajar di Yogyakarta.",
  pathname: "/",
});

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Kampung Inggris Sapen",
  description: "Program belajar Bahasa Inggris untuk warga Demangan dan peserta umum di Yogyakarta.",
  url: getSiteUrl(),
  image: `${getSiteUrl()}/images/baru/LatarBelakang.webp`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Demangan, Yogyakarta",
    addressRegion: "Daerah Istimewa Yogyakarta",
    addressCountry: "ID",
  },
};

const assets = {
  hero: "/images/community/kelas-interior.webp",
  conversation: "/images/community/diskusi-warga-card.webp",
  grammar: "/images/baru/TataBahasa.jpg",
  camp: "/images/community/english-camp.webp",
};

function LocalPhoto({
  file,
  alt,
  className = "",
  loading = "lazy",
  sizes = "(max-width: 700px) 100vw, (max-width: 1200px) 52vw, 640px",
}: {
  file: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
}) {
  return (
    <Image
      src={file.startsWith("/") ? file : `/assets/${encodeURIComponent(file)}`}
      alt={alt}
      fill
      sizes={sizes}
      priority={loading === "eager"}
      className={className}
    />
  );
}

async function HomeTestimonials() {
  const [session, testimonials] = await Promise.all([getServerSession(), getPublicTestimonials()]);
  const isEligible = Boolean(session?.email && session.emailVerified === true && session.authUserId && ["peserta", "umum", "member"].includes(session.role));
  return <TestimoniSection initialTestimoni={testimonials} isEligible={isEligible} isLoggedIn={Boolean(session)} userId={session?.authUserId} />;
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
  const availableClasses = await getPublicClasses();
  const featuredClasses: ClassItem[] = availableClasses
    .filter((item) => item.isPublished)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  return (
    <div className="home-page workbook-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />
      <section className="home-opening workbook-wrap" aria-labelledby="home-title">
        <div className="home-opening-copy">
          <h1 id="home-title" className="home-title font-display">
            Bahasa Inggris tumbuh dari percakapan sehari-hari
          </h1>
          <p className="home-intro">
            Belajar bersama lewat kelas, materi praktis, dan permainan interaktif
          </p>
          <div className="home-actions">
            <Link href="/kelas" className="home-primary-action">
              Jelajahi kelas <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/masuk?mode=warga" className="home-secondary-action">
              Masuk sebagai warga <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <a className="home-location" href="https://www.google.com/maps/place/Demangan,+Gondokusuman,+Yogyakarta+City,+Special+Region+of+Yogyakarta/@-7.784864,110.3878895,16z/data=!3m1!4b1!4m6!3m5!1s0x2e7a59d0296528d3:0x1e731654b09a0834!8m2!3d-7.7865734!4d110.3882256!16s%2Fg%2F12hhj3fw0?entry=ttu&g_ep=EgoyMDI2MTExOC4xIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" className="h-4 w-4" /> Demangan, Yogyakarta</a>
        </div>

        <figure className="home-opening-art">
          <LocalPhoto
            file={assets.hero}
            alt="Warga Kampung Sapen belajar Bahasa Inggris bersama"
            loading="eager"
            className="home-opening-photo"
          />
          <figcaption className="home-photo-note">
            <span>Ayo Belajar Bersama!</span>
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
                <div className="home-route-image">
                  <div className="home-route-photo-frame">
                    <LocalPhoto file={image} alt={imageAlt} className="home-route-photo" sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) calc(100vw - 4rem), 1200px" />
                  </div>
                  <div className="home-route-copy">
                    <Icon aria-hidden="true" className="home-route-icon" />
                    <h3 className="font-display">{title}</h3>
                    <p>{description}</p>
                    <Link href={href} className="home-text-link">Lihat kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                  </div>
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

      <section className="home-classes" aria-labelledby="home-classes-title">
        <div className="workbook-wrap home-classes-panel">
        <div className="home-classes-intro">
          <h2 id="home-classes-title" className="font-display">Pilih kelas, lalu mulai berlatih.</h2>
          <p>Lihat materi, jadwal, dan pilihan akses di setiap kelas.</p>
          <Link href="/kelas" className="home-text-link">Semua kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        <div className="home-class-list">
          {featuredClasses.length ? featuredClasses.map((item) => (
            <ClassListingCard key={item.id} item={item} variant="home" />
          )) : (
            <div className="home-empty-classes">
              <p>Kelas baru sedang disiapkan.</p>
              <Link href="/kelas">Lihat halaman kelas <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
        </div>
      </section>

      <section className="home-reviews workbook-wrap" aria-labelledby="home-reviews-title">
        <div className="home-reviews-heading">
          <p className="home-eyebrow">Cerita peserta</p>
          <h2 id="home-reviews-title" className="font-display">Ulasan dari ruang belajar Sapen.</h2>
          <p>Pengalaman belajar dibagikan oleh peserta yang sudah terverifikasi.</p>
        </div>
        <Suspense fallback={<div aria-hidden="true" className="home-testimonials-loading" />}>
          <HomeTestimonials />
        </Suspense>
      </section>

      <section className="home-faq-section site-surface" aria-labelledby="home-faq-title">
        <div className="workbook-wrap home-faq-inner">
          <div className="home-faq">
          <h2 id="home-faq-title" className="font-display">Ada yang ingin ditanyakan?</h2>
          <FaqAccordion items={HOME_FAQ_LIST} />
          <Link href="/faq" className="home-text-link">Baca semua pertanyaan <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="home-closeout site-surface" aria-labelledby="home-closeout-title">
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
