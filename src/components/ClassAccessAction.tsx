"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";

export default function ClassAccessAction({ classId, classSlug, priceIdr, isEnrolled, canEnroll }: {
  classId: string;
  classSlug: string;
  priceIdr: number;
  isEnrolled: boolean;
  canEnroll: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const next = `/kelas/${encodeURIComponent(classSlug)}`;

  if (isEnrolled) return <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#e6eadf] px-3 text-xs font-bold text-[#183b2d]"><CheckCircle2 className="h-4 w-4" />Terdaftar</span>
    <Link href={next} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d]">Lanjut belajar<ArrowRight className="h-4 w-4" /></Link>
  </div>;

  if (priceIdr > 0) return <AddToCartButton classId={classId} compact />;
  if (!canEnroll) return <div className="grid gap-1"><Link href={`/masuk?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d]">Masuk untuk mengambil kelas</Link><p className="text-xs leading-5 text-[#625f54]">Masuk ke akun terverifikasi untuk menyimpan akses kelas gratis.</p></div>;

  async function enrollFreeClass() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/checkout/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "free", classId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Kelas gratis belum dapat diambil. Coba lagi.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kelas gratis belum dapat diambil. Periksa koneksi lalu coba lagi.");
      setLoading(false);
    }
  }

  return <div className="grid w-full gap-1 sm:w-auto"><button type="button" onClick={() => void enrollFreeClass()} disabled={loading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d] disabled:cursor-wait disabled:opacity-65">{loading ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Mendaftarkan…</> : "Ambil kelas gratis"}</button>{error && <p role="alert" className="max-w-xs text-xs leading-5 text-[#943520]">{error}</p>}</div>;
}
