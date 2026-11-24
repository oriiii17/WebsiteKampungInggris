"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { showAppToast } from "@/components/ui/AppToast";
import { useClassCart } from "@/components/ClassCartProvider";

export default function AddToCartButton({ classId, compact = false, iconOnly = false, detail = false }: { classId: string; compact?: boolean; iconOnly?: boolean; detail?: boolean }) {
  const cart = useClassCart();
  const timeoutRef = useRef<number | null>(null);
  const added = cart.ids.includes(classId);
  const pending = cart.isPending(classId);
  const checked = added;

  useEffect(() => {
    const onFailed = (event: Event) => {
      const failedId = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      if (failedId === classId && timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
    window.addEventListener("sapen:cart-failed", onFailed);
    return () => { window.removeEventListener("sapen:cart-failed", onFailed); if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
  }, [classId]);

  function add(sourceElement: HTMLElement) {
    if (added || pending) return;
    const rect = sourceElement.getBoundingClientRect();
    if (!cart.add(classId)) return;
    showAppToast("Ditambahkan ke keranjang");
    if (!iconOnly) return;
    window.dispatchEvent(new CustomEvent("sapen:cart-start", { detail: { classId } }));
    timeoutRef.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("sapen:cart-fly", { detail: { classId, source: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } } }));
      timeoutRef.current = null;
    }, 300);
  }

  if (added && !iconOnly) return <Link href="/keranjang" className={`inline-flex h-12 max-h-12 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d] ${detail ? "detail-cart-action" : ""} ${compact ? "w-full sm:w-auto" : ""}`}><ShoppingCart aria-hidden="true" className="h-4 w-4" />Lihat keranjang</Link>;
  return <button type="button" onClick={(event) => add(event.currentTarget)} disabled={pending || added} aria-label={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} title={iconOnly ? added ? "Sudah ada di keranjang" : "Tambah ke keranjang" : undefined} className={iconOnly ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#244b3a] text-white transition hover:bg-[#183b2d] disabled:cursor-default disabled:bg-[#e8eee7] disabled:text-[#244b3a]" : `inline-flex h-12 max-h-12 min-h-12 items-center justify-center gap-2 rounded-md border border-leaf px-4 text-sm font-bold text-leaf transition hover:bg-leaf hover:text-white disabled:cursor-wait disabled:opacity-60 ${detail ? "detail-cart-action" : ""} ${compact ? "w-full sm:w-auto" : ""}`}>
    {iconOnly ? checked ? <Check aria-hidden="true" className="h-5 w-5" /> : <ShoppingCart aria-hidden="true" className="h-5 w-5" /> : <><ShoppingCart aria-hidden="true" className="h-4 w-4" />{detail ? <><span className="detail-cart-full">{pending ? "Menambahkan…" : "Tambah ke keranjang"}</span><span className="detail-cart-short">+ Keranjang</span></> : pending ? "Menambahkan…" : "Tambah ke keranjang"}</>}
  </button>;
}
