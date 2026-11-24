"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";
import ClassAccessAction from "@/components/ClassAccessAction";

type ListingClass = ClassItem & { chapterCount?: number; practiceCount?: number; enrolled?: boolean };
export default function ClassListingCard({ item, variant = "catalog", number, isSignedIn = false, canEnroll = false, departing = false, returning = false }: {
  item: ListingClass; variant?: "home" | "catalog"; number?: number; isSignedIn?: boolean; canEnroll?: boolean; departing?: boolean; returning?: boolean;
}) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [opening, setOpening] = useState(false);
  const href = `/kelas/${encodeURIComponent(item.slug)}`;
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    const prefetch = () => router.prefetch(href);
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { prefetch(); observer.disconnect(); }
    }, { rootMargin: "180px" });
    observer.observe(link);
    return () => observer?.disconnect();
  }, [href, router]);
  const prefetch = () => router.prefetch(href);

  if (variant === "home") return <article className="home-class-row">
    <div className="home-class-copy"><h3 className="font-display"><Link ref={linkRef} prefetch href={href} onMouseEnter={prefetch} onTouchStart={prefetch} onClick={() => setOpening(true)}>{item.title}</Link></h3></div>
    <div className="home-class-action"><span className="home-price-badge">{item.priceIdr === 0 ? "Gratis" : formatIDR(item.priceIdr)}</span><Link href={href} aria-label={`Lihat detail ${item.title}`} prefetch onMouseEnter={prefetch} onTouchStart={prefetch} onClick={() => setOpening(true)}>Detail <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
    {opening && <span className="class-opening-indicator" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" />Membuka</span>}
  </article>;

  return <article className={`class-catalog-card group relative flex min-w-0 flex-col gap-2 rounded-2xl border border-[#d8d0bf] bg-white p-4 shadow-sm transition hover:shadow-md ${departing ? "class-card-departing" : ""} ${returning ? "class-card-returning" : ""}`}>
    <span className="w-fit shrink-0 rounded-full bg-[#e8eee7] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#244b3a]">LEMBAR {String(number || 1).padStart(2, "0")}</span>
    <h2 className="line-clamp-2 min-w-0 text-left text-base font-bold leading-snug text-[#183b2d]"><Link ref={linkRef} href={href} prefetch aria-label={`Detail kelas ${item.title}`} className="class-catalog-title-link" onMouseEnter={prefetch} onTouchStart={prefetch} onClick={() => setOpening(true)}>{item.title}</Link></h2>
    <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#4a5568]">{item.description}</p>
    <p className="truncate text-xs text-[#526056]">{item.chapterCount || 0} Bab{(item.practiceCount || 0) > 0 ? ` · ${item.practiceCount} Latihan Mandiri` : ""}</p>
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#ece7dd] pt-2"><strong className="min-w-0 truncate text-sm text-[#183b2d]">{item.priceIdr === 0 ? <span className="rounded-full bg-[#e8eee7] px-2.5 py-1">Gratis</span> : formatIDR(item.priceIdr)}</strong><div className="relative z-10 shrink-0">{item.enrolled ? <Link href={href} aria-label="Lanjut belajar" title="Lanjut belajar" prefetch onMouseEnter={prefetch} onTouchStart={prefetch} onClick={() => setOpening(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#244b3a] text-white"><ArrowRight aria-hidden="true" className="h-5 w-5" /></Link> : item.priceIdr === 0 && !isSignedIn ? <Link href={`/masuk?next=${encodeURIComponent(href)}`} aria-label="Ambil kelas gratis" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#244b3a] px-4 text-sm font-bold text-white">Ambil</Link> : <ClassAccessAction classId={item.id} classSlug={item.slug} priceIdr={item.priceIdr} isEnrolled={false} canEnroll={canEnroll} catalog />}</div></div>
    {opening && <span className="class-opening-indicator" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" />Membuka</span>}
  </article>;
}
