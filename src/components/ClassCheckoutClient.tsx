"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";
const KEY = "sapen_class_cart";
function readCartIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return []; }
}
export default function ClassCheckoutClient({ classes, isSignedIn }: { classes: ClassItem[]; isSignedIn: boolean }) {
  const [ids,setIds]=useState<string[]>([]);
  useEffect(()=>{setIds(readCartIds())},[]);
  const items=classes.filter(c=>ids.includes(c.id)),total=items.reduce((sum,c)=>sum+c.priceIdr,0);
  return <main className="workbook-page min-h-screen py-10 sm:py-14"><div className="workbook-wrap max-w-4xl"><Link href="/keranjang" className="inline-flex min-h-11 items-center gap-2 font-bold text-leaf"><ArrowLeft className="h-4 w-4"/>Kembali ke keranjang</Link><p className="workbook-print-note mt-7">Langkah terakhir</p><h1 className="mt-2 text-4xl">Checkout kelas</h1>
  {!items.length?<section className="mt-7 rounded-xl border border-rule bg-paper-light p-8 text-center"><h2 className="text-2xl">Belum ada kelas di keranjang</h2><Link href="/kelas" className="mt-4 inline-flex min-h-11 items-center font-bold text-leaf">Pilih kelas</Link></section>:<section className="mt-7 grid gap-8 rounded-2xl border border-rule bg-paper-light p-6 shadow-card md:grid-cols-[1fr_18rem] sm:p-8"><div><h2 className="text-2xl">{isSignedIn ? "Pendaftaran ditahan sementara" : "Masuk untuk melanjutkan"}</h2><p className="mt-3 rounded-md border border-rule bg-paper p-4 text-sm leading-6 text-body">{isSignedIn ? "Checkout belum tersedia. Keranjang dan pilihan kelas Anda tetap aman; sistem tidak akan membuat transaksi atau membuka akses sampai pembayaran diaktifkan kembali." : "Silakan masuk terlebih dahulu untuk melanjutkan pendaftaran. Pilihan kelas Anda tetap tersimpan di perangkat ini."}</p><p className="mt-4 text-sm text-muted">Untuk bantuan pendaftaran, silakan hubungi admin Sapen English Village.</p></div><aside><h2 className="text-2xl">Pesanan</h2><ul className="mt-4 space-y-3">{items.map(c=><li key={c.id} className="flex justify-between gap-3 text-sm"><span>{c.title}</span><strong>{formatIDR(c.priceIdr)}</strong></li>)}</ul><div className="my-4 border-t border-rule"/><p className="flex justify-between"><strong>Total</strong><strong>{formatIDR(total)}</strong></p>{isSignedIn ? <button type="button" disabled className="mt-5 min-h-12 w-full cursor-not-allowed rounded-md bg-earth px-3 font-bold text-white opacity-60">Checkout belum tersedia</button> : <Link href="/masuk?next=%2Fcheckout" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-leaf px-3 font-bold text-white">Masuk untuk melanjutkan</Link>}</aside></section>}
  </div></main>;
}
