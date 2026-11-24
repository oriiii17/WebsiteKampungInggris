"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Info, Search } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import ClassListingCard from "@/components/ClassListingCard";
import { useClassCart } from "@/components/ClassCartProvider";

type CatalogItem = ClassItem & { chapterCount: number; practiceCount: number; enrolled: boolean };

export default function ClassCatalogClient({ items, isMyClassesTab, isSignedIn, canEnroll }:
  { items: CatalogItem[]; isMyClassesTab: boolean; isSignedIn: boolean; canEnroll: boolean }) {
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const { ids: cartIds, pendingIds } = useClassCart();
  const [animatingIds, setAnimatingIds] = useState<string[]>([]);
  const [departingIds, setDepartingIds] = useState<string[]>([]);
  const [returningIds, setReturningIds] = useState<string[]>([]);
  const previousCartIds = useRef(cartIds);
  useEffect(() => {
    const restored = previousCartIds.current.filter((id) => !cartIds.includes(id));
    if (restored.length) {
      setReturningIds((current) => [...new Set([...current, ...restored])]);
      window.setTimeout(() => setReturningIds((current) => current.filter((id) => !restored.includes(id))), 320);
    }
    previousCartIds.current = cartIds;
  }, [cartIds]);
  useEffect(() => {
    const onCartStart = (event: Event) => {
      const id = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      if (id) setAnimatingIds((current) => current.includes(id) ? current : [...current, id]);
    };
    const onCartFly = (event: Event) => {
      const id = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      if (id) setAnimatingIds((current) => current.includes(id) ? current : [...current, id]);
    };
    const onCartComplete = (event: Event) => {
      const id = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      if (!id) return;
      setAnimatingIds((current) => current.filter((value) => value !== id));
      setDepartingIds((current) => current.includes(id) ? current : [...current, id]);
      window.setTimeout(() => {
        setDepartingIds((current) => current.filter((value) => value !== id));
      }, 280);
    };
    const onCartFailed = (event: Event) => {
      const id = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      if (!id) return;
      setAnimatingIds((current) => current.filter((value) => value !== id));
      setDepartingIds((current) => current.filter((value) => value !== id));
    };
    window.addEventListener("sapen:cart-start", onCartStart);
    window.addEventListener("sapen:cart-fly", onCartFly);
    window.addEventListener("sapen:cart-fly-complete", onCartComplete);
    window.addEventListener("sapen:cart-failed", onCartFailed);
    return () => { window.removeEventListener("sapen:cart-start", onCartStart); window.removeEventListener("sapen:cart-fly", onCartFly); window.removeEventListener("sapen:cart-fly-complete", onCartComplete); window.removeEventListener("sapen:cart-failed", onCartFailed); };
  }, []);
  const filtered = useMemo(() => items.filter((item) =>
    (isMyClassesTab || item.priceIdr === 0 || !cartIds.includes(item.id) || pendingIds.includes(item.id) || animatingIds.includes(item.id) || departingIds.includes(item.id)) &&
    (!query.trim() || `${item.title} ${item.subtitle || ""} ${item.description}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))) &&
    (price === "all" || (price === "free" ? item.priceIdr === 0 : item.priceIdr > 0))
  ).sort((a, b) => sort === "price" ? a.priceIdr - b.priceIdr : Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")), [items, price, query, sort, cartIds, pendingIds, animatingIds, departingIds, isMyClassesTab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((page - 1) * 10, page * 10);

  return <>
    {!isMyClassesTab && noticeOpen && <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#d8d0bf] bg-white px-4 py-3 text-sm text-[#39443b]"><p><Info className="mr-2 inline h-4 w-4 text-[#244b3a]" />Kelas gratis dapat diambil langsung, sedangkan kelas berbayar dapat ditambahkan ke keranjang.</p><button type="button" onClick={() => setNoticeOpen(false)} aria-label="Tutup informasi" className="min-h-8 px-2 text-lg leading-none">×</button></div>}
    <div className="mb-5 grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]"><label className="col-span-2 text-xs font-bold text-[#344238] lg:col-span-1">Cari<span className="sr-only"> kelas</span><span className="relative mt-1 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68736a]"/><input value={query} onChange={(e) => {setQuery(e.target.value);setPage(1);}} placeholder="Cari judul kelas" className="h-12 w-full rounded-lg border border-[#c9c1b2] bg-white pl-10 pr-3 text-sm" /></span></label><label className="text-xs font-bold text-[#344238]">Harga<select value={price} onChange={(e) => {setPrice(e.target.value);setPage(1);}} className="mt-1 h-12 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="all">Semua harga</option><option value="free">Gratis</option><option value="paid">Berbayar</option></select></label><label className="text-xs font-bold text-[#344238]">Urutkan<select value={sort} onChange={(e) => {setSort(e.target.value);setPage(1);}} className="mt-1 h-12 w-full rounded-lg border border-[#c9c1b2] bg-white px-3 text-sm"><option value="recent">Terbaru</option><option value="price">Harga terendah</option></select></label></div>
    {visible.length ? <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item, index) => <ClassListingCard key={item.id} item={item} number={(page - 1) * 10 + index + 1} isSignedIn={isSignedIn} canEnroll={canEnroll} departing={departingIds.includes(item.id)} returning={returningIds.includes(item.id)} />)}</div> : <div className="rounded-2xl border border-[#d8d0bf] bg-white px-5 py-10 text-center"><BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-[#244b3a]"/><h2 className="mt-3 text-lg font-bold text-[#183b2d]">{isMyClassesTab ? (isSignedIn ? "Belum ada kelas yang terdaftar" : "Masuk untuk melihat Kelas Saya") : "Kelas belum tersedia"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#4a5568]">{isMyClassesTab ? "Kelas gratis yang diambil dan kelas yang dibeli akan tersimpan di akun Anda." : "Coba ubah pencarian atau filter harga."}</p>{isMyClassesTab && !isSignedIn && <Link href="/masuk?next=%2Fkelas%3Ftab%3Dmine" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 font-bold text-white">Masuk</Link>}</div>}
    {pageCount > 1 && <nav aria-label="Halaman kelas" className="mt-5 flex flex-wrap justify-center gap-2">{Array.from({length: pageCount}, (_, i) => <button key={i} type="button" onClick={() => setPage(i + 1)} aria-current={page === i + 1 ? "page" : undefined} className={`min-h-11 min-w-11 rounded-lg px-3 font-bold ${page === i + 1 ? "bg-[#244b3a] text-white" : "border border-[#c9c1b2] bg-white text-[#244b3a]"}`}>{i + 1}</button>)}</nav>}
  </>;
}
