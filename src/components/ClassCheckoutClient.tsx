"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ClassItem } from "@/lib/types";
import { formatIDR } from "@/lib/currency";
import { clearClassCart, getCartIdentity, readClassCart, type CartIdentity } from "@/lib/class-cart-client";

export default function ClassCheckoutClient({ classes, isSignedIn }: { classes: ClassItem[]; isSignedIn: boolean }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [identity, setIdentity] = useState<CartIdentity>({ kind: "guest" });
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const sync = async () => { const next = await getCartIdentity(); if (!active) return; setIdentity(next); setIds(readClassCart(next)); setReady(true); };
    void sync();
    window.addEventListener("sapen:session-changed", sync);
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("sapen:session-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  const items = classes.filter((item) => ids.includes(item.id));
  const total = items.reduce((sum, item) => sum + item.priceIdr, 0);

  async function completeCheckout() {
    if (submitting) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/checkout/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classIds: items.map((item) => item.id) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Pesanan belum dapat diselesaikan. Coba lagi.");
      if (result.mode === "midtrans") {
        if (!result.redirectUrl) throw new Error("Halaman pembayaran belum tersedia. Coba lagi.");
        window.location.assign(result.redirectUrl);
        return;
      }
      if (identity.kind === "account") {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const current = await response.json();
        if (current.session?.email?.trim().toLowerCase() !== identity.email) throw new Error("Akun berubah. Muat ulang halaman sebelum melanjutkan.");
      }
      clearClassCart();
      router.replace(result.redirectTo || "/kelas-saya");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pesanan belum dapat diselesaikan. Periksa koneksi lalu coba lagi.");
      setSubmitting(false);
    }
  }

  return <main className="workbook-page min-h-screen py-8 sm:py-14"><div className="workbook-wrap max-w-4xl"><Link href="/keranjang" className="inline-flex min-h-11 items-center gap-2 font-bold text-leaf"><ArrowLeft className="h-4 w-4" />Kembali ke keranjang</Link><p className="workbook-print-note mt-7">Langkah terakhir</p><h1 className="mt-2 text-4xl">Checkout kelas</h1>
    {!ready ? <section aria-busy="true" className="mt-7 rounded-xl border border-rule bg-paper-light p-8 text-center text-body">Memuat pesanan…</section>
    : !items.length ? <section className="mt-7 rounded-xl border border-rule bg-paper-light p-8 text-center"><h2 className="text-2xl">Belum ada kelas di keranjang</h2><Link href="/kelas" className="mt-4 inline-flex min-h-11 items-center font-bold text-leaf">Pilih kelas</Link></section>
    : <section className="mt-7 grid min-w-0 gap-6 rounded-2xl border border-rule bg-paper-light p-4 shadow-card sm:gap-8 sm:p-8 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0"><h2 className="text-2xl">{isSignedIn ? "Pesanan Anda" : "Masuk untuk melanjutkan"}</h2><p className="mt-3 rounded-md border border-rule bg-paper p-4 text-sm leading-6 text-body">{isSignedIn ? "Setelah pesanan diselesaikan, kelas langsung tersedia di menu Kelas Saya." : "Masuk ke akun terverifikasi untuk menyelesaikan pesanan. Pilihan kelas tetap tersimpan di perangkat ini."}</p><p className="mt-4 text-sm text-muted">Kelas gratis dapat diambil langsung dari halaman detail kelas.</p></div>
      <aside className="min-w-0"><h2 className="text-2xl">Ringkasan pesanan</h2><ul className="mt-3 divide-y divide-rule/60">{items.map((item) => <li key={item.id} className="flex min-w-0 justify-between gap-3 py-3 text-sm"><span className="min-w-0 break-words">{item.title}</span><strong className="shrink-0 text-right tabular-nums">{formatIDR(item.priceIdr)}</strong></li>)}</ul><div className="my-2 border-t border-rule" /><p className="flex justify-between gap-3"><strong>Total</strong><strong>{formatIDR(total)}</strong></p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-[#ba472f]/30 bg-[#fff2ec] p-3 text-sm font-semibold text-[#812f20]">{error}</p>}
        {isSignedIn ? <button type="button" onClick={() => void completeCheckout()} disabled={submitting} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-earth px-4 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:cursor-wait disabled:opacity-65">{submitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{submitting ? "Memproses pesanan…" : "Selesaikan pesanan"}</button> : <Link href="/masuk?next=%2Fcheckout" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-leaf px-3 font-bold text-white">Masuk untuk melanjutkan</Link>}
      </aside>
    </section>}
  </div></main>;
}
