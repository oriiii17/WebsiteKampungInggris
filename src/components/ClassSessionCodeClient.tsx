"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";

export default function ClassSessionCodeClient() {
  const [code, setCode] = useState(""); const router = useRouter();
  function submit(event: React.FormEvent) { event.preventDefault(); const clean = code.replace(/[^a-z0-9]/gi, "").toUpperCase(); if (clean.length === 6) router.push(`/sesi/${clean}`); }
  return <main className="grid min-h-[70vh] place-items-center bg-[#f3e9d5] px-4 py-12 text-[#20251f]"><form onSubmit={submit} className="w-full max-w-lg border-y border-[#d2c5ad] py-8"><CalendarClock className="h-7 w-7 text-[#244b3a]" /><h1 className="mt-4 font-display text-4xl font-bold text-[#183b2d]">Masuk ke sesi kelas</h1><p className="mt-3 text-sm leading-6 text-[#3d4038]">Masukkan kode enam karakter dari tutor atau pindai QR sesi.</p><label className="mt-6 block text-sm font-bold">Kode sesi<input autoFocus autoComplete="off" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" className="mt-2 min-h-14 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-4 text-center font-display text-2xl font-bold tracking-[.2em] text-[#183b2d] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label><button type="submit" disabled={code.length !== 6} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Lanjutkan<ArrowRight className="h-4 w-4" /></button></form></main>;
}
