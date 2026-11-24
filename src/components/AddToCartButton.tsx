"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { getCartIdentity, readClassCart, writeClassCart } from "@/lib/class-cart-client";
import { showAppToast } from "@/components/ui/AppToast";
export default function AddToCartButton({ classId, compact = false, iconOnly = false }: { classId: string; compact?: boolean; iconOnly?: boolean }) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    let active = true;
    const sync = async () => { const identity = await getCartIdentity(); if (active) setAdded(readClassCart(identity).includes(classId)); };
    void sync();
    window.addEventListener("sapen:cart-updated", sync);
    window.addEventListener("sapen:session-changed", sync);
    return () => { active = false; window.removeEventListener("sapen:cart-updated", sync); window.removeEventListener("sapen:session-changed", sync); };
  }, [classId]);
  async function toggle() {
    if (added) return;
    const identity = await getCartIdentity();
    const ids = [...new Set([...readClassCart(identity), classId])];
    writeClassCart(identity, ids);
    setAdded(true);
    showAppToast("Ditambahkan ke keranjang");
  }
  if (added && !iconOnly) return <Link href="/keranjang" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#183b2d] ${compact ? "w-full sm:w-auto" : ""}`}>Lihat keranjang</Link>;
  return <button type="button" onClick={() => void toggle()} disabled={added} aria-label={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} title={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} className={iconOnly ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#244b3a] text-white transition hover:bg-[#183b2d] disabled:cursor-default disabled:bg-[#e8eee7] disabled:text-[#244b3a]" : `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-leaf px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white ${compact ? "w-full sm:w-auto" : ""}`}>
    {iconOnly ? added ? <Check aria-hidden="true" className="h-5 w-5" /> : <ShoppingCart aria-hidden="true" className="h-5 w-5" /> : <><ShoppingCart className="h-4 w-4" />Tambah ke keranjang</>}
  </button>;
}
