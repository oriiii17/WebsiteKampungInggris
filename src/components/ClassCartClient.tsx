"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, ShoppingBag, Trash2 } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";
import { useClassCart } from "@/components/ClassCartProvider";

export default function ClassCartClient({ classes }: { classes: ClassItem[] }) {
  const router = useRouter();
  const cart = useClassCart();
  const [selectedIds, setSelectedIds] = useState<string[]>(cart.ids);
  useEffect(() => {
    setSelectedIds(cart.ids);
  }, [cart.ids]);
  const items = classes.filter((item) => cart.ids.includes(item.id));
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const total = items.reduce((sum, item) => sum + item.priceIdr, 0);
  function remove(id: string) {
    cart.remove(id);
  }
  function removeSelected() {
    cart.removeMany(selectedIds);
    setSelectedIds([]);
  }
  function continueToCheckout() {
    const chosen = cart.ids.filter((id) => selectedIds.includes(id));
    if (!chosen.length) return;
    sessionStorage.setItem("sapen:cart-checkout-step", JSON.stringify({ at: Date.now(), ids: chosen }));
    router.push("/checkout");
  }

  return <main className="workbook-page min-h-dvh py-10 sm:py-14">
    <div className="workbook-wrap max-w-5xl">
      <p className="workbook-print-note">Pesanan Anda</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
        <div><h1 className="text-4xl sm:text-5xl">Keranjang kelas</h1><p className="mt-2 max-w-xl text-sm leading-6 text-body">Kelas yang Anda pilih tersimpan di perangkat ini.</p></div>
        <Link href="/kelas" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-leaf underline decoration-sunshine underline-offset-4">Jelajahi kelas <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      <nav aria-label="Langkah pesanan" className="mt-5 flex items-center gap-3 text-sm font-bold"><span aria-current="step" className="rounded-full bg-leaf px-4 py-2 text-white">1 Keranjang</span><span aria-hidden="true" className="text-muted">→</span><span className="rounded-full border border-rule bg-white px-4 py-2 text-muted">2 Checkout</span></nav>

      {!items.length ? <section className="sapen-empty-state mt-7 grid items-center gap-6 rounded-2xl border border-rule bg-white p-6 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.75fr)] sm:p-9">
          <div><span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-white"><ShoppingBag className="h-5 w-5" /></span><p className="workbook-print-note mt-5">Belum ada pilihan</p><h2 className="mt-2 text-3xl">Keranjangmu masih kosong.</h2><p className="mt-3 max-w-md text-sm leading-6 text-body">Temukan kelas yang sesuai dan tambahkan ke keranjang untuk melihat ringkasan pilihanmu.</p><Link href="/kelas" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white transition hover:bg-leaf-dark">Lihat daftar kelas <ArrowRight className="h-4 w-4" /></Link></div>
          <Image src="/images/empty-cart.svg" alt="Ilustrasi keranjang kelas kosong" width={360} height={260} className="mx-auto h-auto w-full max-w-xs" />
        </section>
      : <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-body"><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])} className="h-5 w-5 accent-[#244b3a]" />Pilih semua</label><button type="button" onClick={removeSelected} disabled={!selectedIds.length} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-[#C62828] px-3 text-sm font-bold text-white transition-colors hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:bg-[#C62828] disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" />Hapus yang dipilih</button></div><ul className="space-y-4">{items.map((item) => <li key={item.id} className="grid min-w-0 gap-4 rounded-xl border border-rule bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div className="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`Pilih ${item.title}`} checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((old) => event.target.checked ? [...old, item.id] : old.filter((id) => id !== item.id))} className="mt-1 h-5 w-5 shrink-0 accent-[#244b3a]"/><div className="min-w-0"><p className="workbook-print-note">Kelas pilihan</p><h2 className="mt-1 break-words text-2xl">{item.title}</h2><p className="mt-2 text-sm leading-6 text-body">{item.subtitle || item.description}</p><p className="mt-3 text-sm font-bold text-ink">{formatIDR(item.priceIdr)}</p></div></div>
            <button type="button" onClick={() => remove(item.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C62828]/50 px-3 text-sm font-bold text-[#C62828] transition-colors hover:bg-[#FDECEC] sm:self-start" aria-label={`Hapus ${item.title} dari keranjang`}><Trash2 className="h-4 w-4" /><span className="sm:sr-only">Hapus</span></button>
          </li>)}</ul></div>
          <aside className="cart-summary rounded-xl border border-rule bg-white p-5 sm:p-6"><p className="workbook-print-note">Ringkasan</p><h2 className="mt-2 text-2xl">Pilihan kelas</h2><p className="mt-4 text-sm text-body">{selectedIds.length} kelas dipilih</p><p className="mt-3 flex justify-between gap-3"><strong>Total pilihan</strong><strong>{formatIDR(items.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + item.priceIdr, 0))}</strong></p><button type="button" onClick={continueToCheckout} disabled={!selectedIds.length} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50">Lanjut ke Checkout <ArrowRight className="h-4 w-4" /></button></aside>
        </div>}
    </div>
  </main>;
}
