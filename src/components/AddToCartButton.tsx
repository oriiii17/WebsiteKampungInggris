"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { getCartIdentity, readClassCart, writeClassCart } from "@/lib/class-cart-client";
export default function AddToCartButton({ classId, compact = false }: { classId: string; compact?: boolean }) {
  const [added, setAdded] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    let active = true;
    const sync = async () => { const identity = await getCartIdentity(); if (active) setAdded(readClassCart(identity).includes(classId)); };
    void sync();
    window.addEventListener("sapen:cart-updated", sync);
    window.addEventListener("sapen:session-changed", sync);
    return () => { active = false; window.removeEventListener("sapen:cart-updated", sync); window.removeEventListener("sapen:session-changed", sync); };
  }, [classId]);
  async function toggle() {
    const identity = await getCartIdentity();
    let ids: string[] = readClassCart(identity);
    ids = added ? ids.filter((id) => id !== classId) : [...new Set([...ids, classId])];
    writeClassCart(identity, ids);
    setAdded(true);
    setFading(true);
  }
  return <span className={`block overflow-hidden transition-[opacity,max-height,margin] duration-300 ease-out ${compact ? "w-full sm:w-auto" : ""} ${added ? "pointer-events-none max-h-0 opacity-0" : "max-h-16 opacity-100"}`} aria-hidden={added}>
    <button type="button" onClick={() => void toggle()} tabIndex={added ? -1 : 0} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-leaf px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white ${compact ? "w-full sm:w-auto" : ""} ${fading ? "opacity-0" : "opacity-100"}`}>
      <ShoppingCart className="h-4 w-4" />Tambah ke keranjang
    </button>
  </span>;
}
