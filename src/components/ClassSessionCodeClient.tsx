"use client";

import { useState } from "react";
import SessionCodeBoxes from "@/components/SessionCodeBoxes";
import ActiveSessionGamesPanel from "@/components/games/ActiveSessionGamesPanel";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";

export default function ClassSessionCodeClient() {
  const [codeChars, setCodeChars] = useState(Array(6).fill(""));
  const code = codeChars.join("");
  const router = useRouter();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (code.length === 6) router.push(`/sesi/${code}`);
  }

  return <main className="site-surface min-w-0 px-4 py-10 pb-32 text-[#20251f] sm:px-8 sm:py-16">
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <div className="mb-6"><ActiveSessionGamesPanel /></div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <section className="min-w-0 scroll-mt-20 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-6 shadow-sm sm:p-10">
          <CalendarClock className="h-8 w-8 text-[#244b3a]" />
          <h1 className="mt-4 font-display text-4xl font-bold text-[#183b2d]">Masuk ke sesi kelasmu</h1>
          <p className="mt-3 text-base leading-7 text-[#3d4038]">Masukkan kode yang dibagikan tutor untuk mencatat kehadiran dan membuka sesi.</p>
          <form onSubmit={submit} className="mt-7 min-w-0">
            <label className="block text-sm font-bold">Kode sesi · 6 karakter</label>
            <SessionCodeBoxes value={codeChars} onChange={setCodeChars} />
            <button type="submit" disabled={code.length !== 6} title={code.length !== 6 ? "Isi 6 karakter kode dulu" : undefined} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ba472f] px-5 text-base font-bold text-white hover:bg-[#943520] disabled:cursor-not-allowed disabled:opacity-45">Masuk ke sesi<ArrowRight className="h-5 w-5" /></button>
            <p className="mt-2 text-sm text-[#625f54]">{code.length === 6 ? "Kode siap diperiksa." : `Isi 6 karakter kode dulu (${code.length}/6).`}</p>
          </form>
        </section>
        <aside className="min-w-0 rounded-2xl bg-[#244b3a] p-6 pb-8 text-white sm:p-9">
          <h2 className="font-display text-2xl font-bold text-white">Cara masuk</h2>
          <ol className="mt-6 space-y-3">{[["Dapatkan kode dari tutor", "Tutor membagikan kode sesi."], ["Masukkan kode", "Ketik enam karakter kode di kolom."], ["Presensi tercatat", "Kehadiranmu tersimpan di sesi kelas."]].map(([title, desc], i) => <li key={title} className="flex items-start gap-3 pb-2 last:pb-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f3e9d5] font-bold text-[#183b2d]">{i + 1}</span><span className="min-w-0 pt-1"><strong className="block">{title}</strong><span className="mt-1 block text-sm leading-6 text-white/85">{desc}</span></span></li>)}</ol>
        </aside>
      </div>
    </div>
  </main>;
}
