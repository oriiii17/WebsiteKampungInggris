"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

const KEY = "sapen_class_cart";
export default function AddToCartButton({ classId, compact = false }: { classId: string; compact?: boolean }) {
  const [added, setAdded] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    try { setAdded((JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).includes(classId)); } catch {}
  }, [classId]);
  function toggle() {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
    ids = added ? ids.filter((id) => id !== classId) : [...new Set([...ids, classId])];
    localStorage.setItem(KEY, JSON.stringify(ids));
    setAdded(true);
    setFading(true);
  }
  return <span className={`block overflow-hidden transition-[opacity,max-height,margin] duration-300 ease-out ${compact ? "w-full sm:w-auto" : ""} ${added ? "pointer-events-none max-h-0 opacity-0" : "max-h-16 opacity-100"}`} aria-hidden={added}>
    <button type="button" onClick={toggle} tabIndex={added ? -1 : 0} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-leaf px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white ${compact ? "w-full sm:w-auto" : ""} ${fading ? "opacity-0" : "opacity-100"}`}>
      <ShoppingCart className="h-4 w-4" />Tambah ke keranjang
    </button>
  </span>;
}
