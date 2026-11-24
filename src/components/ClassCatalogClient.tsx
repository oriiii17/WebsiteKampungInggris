"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Gamepad2, Info, Search } from "lucide-react";
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
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]"><label className="relative sm:col-span-2 lg:col-span-1"><span className="sr-only">Cari kelas</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-[#68736a]"/><input value={query} onChange={(e) => {setQuery(e.target.value);setPage(1);}} placeholder="Cari judul kelas" className="h-11 w-full rounded-lg border border-[#c9c1b2] bg-white pl-9 pr-3 text-sm" /></label><label className="text-xs font-bold text-[#344238]">Harga<select value={price} onChange={(e) => {setPrice(e.target.value);setPage(1);}} className="mt-1 h-11 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="all">Semua harga</option><option value="free">Gratis</option><option value="paid">Berbayar</option></select></label><label className="text-xs font-bold text-[#344238]">Urutkan<select value={sort} onChange={(e) => {setSort(e.target.value);setPage(1);}} className="mt-1 h-11 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="recent">Terbaru</option><option value="price">Harga terendah</option></select></label></div>
    {visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item, index) => <article key={item.id} className="grid min-w-0 gap-2 rounded-2xl border border-[#d8d0bf] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-2"><span className="shrink-0 rounded-full bg-[#e8eee7] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#244b3a]">LEMBAR {String((page - 1) * 10 + index + 1).padStart(2, "0")}</span><h2 className="line-clamp-2 min-w-0 flex-1 text-right text-base font-bold leading-snug text-[#183b2d]">{item.title}</h2></div>
      <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#4a5568]">{item.description}</p>
      <p className="truncate text-xs text-[#526056]">{item.chapterCount} Bab{item.practiceCount > 0 ? ` · ${item.practiceCount} Latihan Mandiri` : ""}</p>
      <div className="flex items-center justify-between gap-2 border-t border-[#ece7dd] pt-2"><strong className="min-w-0 truncate text-sm text-[#183b2d]">{item.priceIdr === 0 ? <span className="rounded-full bg-[#e8eee7] px-2.5 py-1">Gratis</span> : formatIDR(item.priceIdr)}</strong><div className="min-w-0 flex-1">{item.enrolled ? <Link href={`/kelas/${encodeURIComponent(item.slug)}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white">Lanjut belajar<ArrowRight className="h-4 w-4"/></Link> : item.priceIdr === 0 && !canEnroll ? <Link href={`/masuk?next=${encodeURIComponent(`/kelas/${item.slug}`)}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#ba472f] px-2 text-center text-xs font-bold text-white">Masuk untuk mengambil kelas</Link> : item.priceIdr === 0 ? <ClassAccessAction classId={item.id} classSlug={item.slug} priceIdr={item.priceIdr} isEnrolled={false} canEnroll={canEnroll}/> : <ClassAccessAction classId={item.id} classSlug={item.slug} priceIdr={item.priceIdr} isEnrolled={false} canEnroll={canEnroll}/>}</div></div>
    </article>)}</div> : <div className="rounded-2xl border border-[#d8d0bf] bg-white px-5 py-10 text-center"><BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-[#244b3a]"/><h2 className="mt-3 text-lg font-bold text-[#183b2d]">{isMyClassesTab ? (isSignedIn ? "Belum ada kelas yang terdaftar" : "Masuk untuk melihat Kelas Saya") : "Kelas belum tersedia"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#4a5568]">{isMyClassesTab ? "Kelas gratis yang diambil dan kelas yang dibeli akan tersimpan di akun Anda." : "Coba ubah pencarian atau filter harga."}</p>{isMyClassesTab && !isSignedIn && <Link href="/masuk?next=%2Fkelas%3Ftab%3Dmine" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 font-bold text-white">Masuk</Link>}</div>}
    {pageCount > 1 && <nav aria-label="Halaman kelas" className="mt-5 flex flex-wrap justify-center gap-2">{Array.from({length: pageCount}, (_, i) => <button key={i} type="button" onClick={() => setPage(i + 1)} aria-current={page === i + 1 ? "page" : undefined} className={`min-h-11 min-w-11 rounded-lg px-3 font-bold ${page === i + 1 ? "bg-[#244b3a] text-white" : "border border-[#c9c1b2] bg-white text-[#244b3a]"}`}>{i + 1}</button>)}</nav>}
  </>;
}
