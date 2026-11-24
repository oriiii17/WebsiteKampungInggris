"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { getCartIdentity, readClassCart, writeClassCart } from "@/lib/class-cart-client";
import { showAppToast } from "@/components/ui/AppToast";
export default function AddToCartButton({ classId, compact = false, iconOnly = false, detail = false }: { classId: string; compact?: boolean; iconOnly?: boolean; detail?: boolean }) {
  const [added, setAdded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const sync = async () => { const identity = await getCartIdentity(); if (active) setAdded(readClassCart(identity).includes(classId)); };
    void sync();
    window.addEventListener("sapen:cart-updated", sync);
    window.addEventListener("sapen:session-changed", sync);
    return () => { active = false; window.removeEventListener("sapen:cart-updated", sync); window.removeEventListener("sapen:session-changed", sync); };
  }, [classId]);
  async function toggle(sourceElement?: HTMLElement) {
    if (added || busy) return;
    setBusy(true);
    setChecked(true);
    const source = sourceElement?.getBoundingClientRect();
    if (iconOnly) await new Promise((resolve) => window.setTimeout(resolve, 300));
    try {
      const identity = await getCartIdentity();
      const ids = [...new Set([...readClassCart(identity), classId])];
      writeClassCart(identity, ids);
      setAdded(true);
      showAppToast("Ditambahkan ke keranjang");
      if (iconOnly) window.dispatchEvent(new CustomEvent("sapen:cart-fly", { detail: { classId, source: source ? { left: source.left, top: source.top, width: source.width, height: source.height } : null } }));
    } catch {
      setChecked(false);
      showAppToast("Kelas belum dapat ditambahkan. Coba lagi.");
    } finally { setBusy(false); }
  }
  if (added && !iconOnly) return <Link href="/keranjang" className={`inline-flex h-12 max-h-12 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d] ${detail ? "detail-cart-action" : ""} ${compact ? "w-full sm:w-auto" : ""}`}><ShoppingCart aria-hidden="true" className="h-4 w-4" />Lihat keranjang</Link>;
  return <button type="button" onClick={(event) => void toggle(event.currentTarget)} disabled={added || busy} aria-label={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} title={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} className={iconOnly ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#244b3a] text-white transition hover:bg-[#183b2d] disabled:cursor-default disabled:bg-[#e8eee7] disabled:text-[#244b3a]" : `inline-flex h-12 max-h-12 min-h-12 items-center justify-center gap-2 rounded-md border border-leaf px-4 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white ${detail ? "detail-cart-action" : ""} ${compact ? "w-full sm:w-auto" : ""}`}>
    {iconOnly ? checked || added ? <Check aria-hidden="true" className="h-5 w-5" /> : <ShoppingCart aria-hidden="true" className="h-5 w-5" /> : <><ShoppingCart aria-hidden="true" className="h-4 w-4" />{detail ? <><span className="detail-cart-full">Tambah ke keranjang</span><span className="detail-cart-short">+ Keranjang</span></> : "Tambah ke keranjang"}</>}
  </button>;
}
