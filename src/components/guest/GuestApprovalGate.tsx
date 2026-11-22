"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { GuestApprovalStatus } from "@/lib/guest-approval";

export default function GuestApprovalGate({ initialStatus, scope = "guest" }: { initialStatus: GuestApprovalStatus; scope?: "guest" | "attendance" }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");

  const refreshStatus = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setCheckError("");
    try {
      const response = await fetch(`/api/auth/session?scope=${scope}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Status persetujuan belum dapat diperiksa.");
      const nextStatus: GuestApprovalStatus = ["approved", "rejected", "pending"].includes(data.approvalStatus)
        ? data.approvalStatus
        : "pending";
      setStatus(nextStatus);
      if (nextStatus === "approved") router.refresh();
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : "Koneksi terganggu. Status akan dicoba lagi otomatis.");
    } finally {
      setChecking(false);
    }
  }, [checking, router, scope]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshStatus(), 4000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  const rejected = status === "rejected";
  return (
    <section className="grid min-h-[100dvh] place-items-center bg-[#f3e9d5] px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] p-6 text-center shadow-[0_18px_48px_rgba(32,37,31,.09)] sm:p-10">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${rejected ? "bg-[#f2dfd6] text-[#7b2c1d]" : "bg-[#e6eadf] text-[#244b3a]"}`}>
          {rejected ? <ShieldCheck aria-hidden="true" className="h-7 w-7" /> : <Clock3 aria-hidden="true" className="h-7 w-7" />}
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-[#183b2d] sm:text-4xl">
          {rejected ? "Pendaftaran ditolak" : "Menunggu persetujuan pengurus"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#3d4038]">
          {rejected
            ? "Akses kelas belum dibuka untuk pendaftaran ini. Hubungi pengurus sesi jika kamu perlu bantuan."
            : "Permintaanmu sudah diterima. Menu Kelas, Kuis, dan materi akan terbuka setelah pengurus menyetujui aksesmu."}
        </p>
        {!rejected && <p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-[#514b3e]">Halaman ini memeriksa status secara otomatis.</p>}
        {checkError && <p role="alert" className="mt-4 rounded-lg border border-[#ba472f]/30 bg-[#f2dfd6] p-3 text-sm font-semibold text-[#7b2c1d]">{checkError}</p>}
        <button type="button" disabled={checking} onClick={() => void refreshStatus()} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white transition hover:bg-[#183b2d] disabled:cursor-wait disabled:opacity-70">
          {checking ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
          {checking ? "Memeriksa status…" : "Periksa status sekarang"}
        </button>
      </div>
    </section>
  );
}
