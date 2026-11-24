"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";

export default function ClassAccessAction({ classId, classSlug, priceIdr, isEnrolled, canEnroll, catalog = false }: {
  classId: string;
  classSlug: string;
  priceIdr: number;
  isEnrolled: boolean;
  canEnroll: boolean;
  catalog?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const next = `/kelas/${encodeURIComponent(classSlug)}`;

  if (isEnrolled) return <Link href={`${next}#bab-pelajaran`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d]">Lanjut belajar<ArrowRight className="h-4 w-4" /></Link>;

  if (priceIdr > 0) return <AddToCartButton classId={classId} compact iconOnly={catalog} />;
  if (!canEnroll) return <div className="grid gap-1"><Link href={`/masuk?next=${encodeURIComponent(next)}`} aria-label={catalog ? "Ambil kelas gratis" : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-full bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d] ${catalog ? "" : "w-full rounded-lg"}`}>{catalog ? "Ambil" : "Masuk untuk mengambil kelas"}</Link>{!catalog && <p className="text-xs leading-5 text-[#625f54]">Masuk ke akun terverifikasi untuk menyimpan akses kelas gratis.</p>}</div>;

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

  return <div className={`grid gap-1 ${catalog ? "w-auto" : "w-full sm:w-auto"}`}><button type="button" onClick={() => void enrollFreeClass()} disabled={loading} aria-label={catalog ? "Ambil kelas gratis" : undefined} className={`inline-flex min-h-11 items-center justify-center gap-2 bg-[#244b3a] text-sm font-bold text-white transition hover:bg-[#183b2d] disabled:cursor-wait disabled:opacity-65 ${catalog ? "rounded-full px-4" : "w-full rounded-lg px-4"}`}>{loading ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{catalog ? "Memuat…" : "Mendaftarkan…"}</> : catalog ? "Ambil" : "Ambil kelas gratis"}</button>{error && <p role="alert" className="max-w-xs text-xs leading-5 text-[#943520]">{error}</p>}</div>;
}
