"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Info, Search, ShoppingCart } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";
import ClassAccessAction from "@/components/ClassAccessAction";

type CatalogItem = ClassItem & { chapterCount: number; practiceCount: number; enrolled: boolean };

export default function ClassCatalogClient({ items, isMyClassesTab, isSignedIn, canEnroll }:
  { items: CatalogItem[]; isMyClassesTab: boolean; isSignedIn: boolean; canEnroll: boolean }) {
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => items.filter((item) =>
    (!query.trim() || `${item.title} ${item.subtitle || ""} ${item.description}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))) &&
    (price === "all" || (price === "free" ? item.priceIdr === 0 : item.priceIdr > 0))
  ).sort((a, b) => sort === "price" ? a.priceIdr - b.priceIdr : Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")), [items, price, query, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((page - 1) * 10, page * 10);

  return <>
    {!isMyClassesTab && noticeOpen && <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#d8d0bf] bg-white px-4 py-3 text-sm text-[#39443b]"><p><Info className="mr-2 inline h-4 w-4 text-[#244b3a]" />Kelas gratis dapat diambil langsung, sedangkan kelas berbayar dapat ditambahkan ke keranjang.</p><button type="button" onClick={() => setNoticeOpen(false)} aria-label="Tutup informasi" className="min-h-8 px-2 text-lg leading-none">×</button></div>}
    <div className="mb-5 grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]"><label className="col-span-2 text-xs font-bold text-[#344238] lg:col-span-1">Cari<span className="sr-only"> kelas</span><span className="relative mt-1 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68736a]"/><input value={query} onChange={(e) => {setQuery(e.target.value);setPage(1);}} placeholder="Cari judul kelas" className="h-12 w-full rounded-lg border border-[#c9c1b2] bg-white pl-10 pr-3 text-sm" /></span></label><label className="text-xs font-bold text-[#344238]">Harga<select value={price} onChange={(e) => {setPrice(e.target.value);setPage(1);}} className="mt-1 h-12 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="all">Semua harga</option><option value="free">Gratis</option><option value="paid">Berbayar</option></select></label><label className="text-xs font-bold text-[#344238]">Urutkan<select value={sort} onChange={(e) => {setSort(e.target.value);setPage(1);}} className="mt-1 h-12 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="recent">Terbaru</option><option value="price">Harga terendah</option></select></label></div>
    {visible.length ? <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item, index) => <article key={item.id} className="class-catalog-card group relative flex min-w-0 flex-col gap-2 rounded-2xl border border-[#d8d0bf] bg-white p-4 shadow-sm transition hover:shadow-md">
      <span className="w-fit shrink-0 rounded-full bg-[#e8eee7] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#244b3a]">LEMBAR {String((page - 1) * 10 + index + 1).padStart(2, "0")}</span>
      <h2 className="line-clamp-2 min-w-0 text-left text-base font-bold leading-snug text-[#183b2d]"><Link href={`/kelas/${encodeURIComponent(item.slug)}`} aria-label={`Detail kelas ${item.title}`} className="class-catalog-title-link">{item.title}</Link></h2>
      <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#4a5568]">{item.description}</p>
      <p className="truncate text-xs text-[#526056]">{item.chapterCount} Bab{item.practiceCount > 0 ? ` · ${item.practiceCount} Latihan Mandiri` : ""}</p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#ece7dd] pt-2"><strong className="min-w-0 truncate text-sm text-[#183b2d]">{item.priceIdr === 0 ? <span className="rounded-full bg-[#e8eee7] px-2.5 py-1">Gratis</span> : formatIDR(item.priceIdr)}</strong><div className="relative z-10 shrink-0">{item.enrolled ? <Link href={`/kelas/${encodeURIComponent(item.slug)}`} aria-label="Lanjut belajar" title="Lanjut belajar" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#244b3a] text-white"><ArrowRight aria-hidden="true" className="h-5 w-5"/></Link> : item.priceIdr === 0 && !isSignedIn ? <Link href={`/masuk?next=${encodeURIComponent(`/kelas/${item.slug}`)}`} aria-label="Ambil kelas gratis" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#244b3a] px-4 text-sm font-bold text-white">Ambil</Link> : <ClassAccessAction classId={item.id} classSlug={item.slug} priceIdr={item.priceIdr} isEnrolled={false} canEnroll={canEnroll} catalog />}</div></div>
    </article>)}</div> : <div className="rounded-2xl border border-[#d8d0bf] bg-white px-5 py-10 text-center"><BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-[#244b3a]"/><h2 className="mt-3 text-lg font-bold text-[#183b2d]">{isMyClassesTab ? (isSignedIn ? "Belum ada kelas yang terdaftar" : "Masuk untuk melihat Kelas Saya") : "Kelas belum tersedia"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#4a5568]">{isMyClassesTab ? "Kelas gratis yang diambil dan kelas yang dibeli akan tersimpan di akun Anda." : "Coba ubah pencarian atau filter harga."}</p>{isMyClassesTab && !isSignedIn && <Link href="/masuk?next=%2Fkelas%3Ftab%3Dmine" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 font-bold text-white">Masuk</Link>}</div>}
    {pageCount > 1 && <nav aria-label="Halaman kelas" className="mt-5 flex flex-wrap justify-center gap-2">{Array.from({length: pageCount}, (_, i) => <button key={i} type="button" onClick={() => setPage(i + 1)} aria-current={page === i + 1 ? "page" : undefined} className={`min-h-11 min-w-11 rounded-lg px-3 font-bold ${page === i + 1 ? "bg-[#244b3a] text-white" : "border border-[#c9c1b2] bg-white text-[#244b3a]"}`}>{i + 1}</button>)}</nav>}
  </>;
}
