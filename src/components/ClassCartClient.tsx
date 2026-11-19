"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, ShoppingBag, Trash2 } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";

const KEY = "sapen_class_cart";
function readCartIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return []; }
}

export default function ClassCartClient({ classes }: { classes: ClassItem[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setIds(readCartIds()); setReady(true); }, []);
  const items = classes.filter((item) => ids.includes(item.id));
  const total = items.reduce((sum, item) => sum + item.priceIdr, 0);
  function remove(id: string) {
    const next = ids.filter((value) => value !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    setIds(next);
  }

  return <main className="workbook-page min-h-screen py-10 sm:py-14">
    <div className="workbook-wrap max-w-5xl">
      <p className="workbook-print-note">Ruang belajarmu</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
        <div><h1 className="text-4xl sm:text-5xl">Keranjang kelas</h1><p className="mt-2 max-w-xl text-sm leading-6 text-body">Kelas yang Anda pilih tersimpan di perangkat ini.</p></div>
        <Link href="/kelas" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-leaf underline decoration-sunshine underline-offset-4">Jelajahi kelas <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      {!ready ? <div aria-label="Memuat keranjang" className="mt-7 grid gap-4"><div className="h-32 animate-pulse rounded-xl bg-white/70" /><div className="h-32 animate-pulse rounded-xl bg-white/70" /></div>
      : !items.length ? <section className="sapen-empty-state mt-7 grid items-center gap-6 rounded-2xl border border-rule bg-white p-6 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.75fr)] sm:p-9">
          <div><span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-white"><ShoppingBag className="h-5 w-5" /></span><p className="workbook-print-note mt-5">Belum ada pilihan</p><h2 className="mt-2 text-3xl">Keranjangmu masih kosong.</h2><p className="mt-3 max-w-md text-sm leading-6 text-body">Temukan kelas yang sesuai dan tambahkan ke keranjang untuk melihat ringkasan pilihanmu.</p><Link href="/kelas" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white transition hover:bg-leaf-dark">Lihat daftar kelas <ArrowRight className="h-4 w-4" /></Link></div>
          <Image src="/images/empty-cart.svg" alt="Ilustrasi keranjang kelas kosong" width={360} height={260} className="mx-auto h-auto w-full max-w-xs" />
        </section>
      : <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <ul className="space-y-4">{items.map((item) => <li key={item.id} className="grid min-w-0 gap-4 rounded-xl border border-rule bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div className="min-w-0"><p className="workbook-print-note">Kelas pilihan</p><h2 className="mt-1 break-words text-2xl">{item.title}</h2><p className="mt-2 text-sm leading-6 text-body">{item.subtitle || item.description}</p><p className="mt-3 text-sm font-bold text-ink">{formatIDR(item.priceIdr)}</p></div>
            <button type="button" onClick={() => remove(item.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rule px-3 text-sm font-bold text-body transition hover:border-red-300 hover:text-red-700 sm:self-start" aria-label={`Hapus ${item.title} dari keranjang`}><Trash2 className="h-4 w-4" /><span className="sm:sr-only">Hapus</span></button>
          </li>)}</ul>
          <aside className="rounded-xl border border-rule bg-white p-5 sm:p-6"><p className="workbook-print-note">Ringkasan</p><h2 className="mt-2 text-2xl">Pilihan kelas</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{item.title}</span><strong className="shrink-0">{formatIDR(item.priceIdr)}</strong></div>)}</div><div className="my-4 border-t border-rule" /><p className="flex justify-between gap-3"><strong>Total</strong><strong>{formatIDR(total)}</strong></p><p className="mt-4 rounded-lg border border-rule bg-paper px-3 py-3 text-xs leading-5 text-body">Checkout belum tersedia saat ini. Pilihan kelas Anda tetap tersimpan; belum ada transaksi yang dibuat.</p><Link href="/checkout" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white transition hover:bg-leaf-dark">Lihat checkout <ArrowRight className="h-4 w-4" /></Link></aside>
        </div>}
    </div>
  </main>;
}
