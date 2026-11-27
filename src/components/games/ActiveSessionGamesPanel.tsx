"use client";

import { useEffect, useState } from "react";
import GamePinForm from "@/components/game/GamePinForm";

type SessionGame = { id: string; title: string; status: "waiting" | "live"; pin: string | null };
type ActiveSessionData = { status: string | null; classId?: string | null; participantName?: string; selectedGames?: SessionGame[] };

export default function ActiveSessionGamesPanel({ showPinForm = true }: { showPinForm?: boolean }) {
  const [session, setSession] = useState<ActiveSessionData | null>(null);

  useEffect(() => {
    let mounted = true;
    const update = (data: ActiveSessionData) => {
      if (mounted) setSession(data);
    };
    const load = async () => {
      try {
        const response = await fetch("/api/class-sessions/current", { cache: "no-store" });
        if (response.ok) update(await response.json());
      } catch {
        // Keep the panel hidden until the session status can be confirmed.
      }
    };
    const onSessionUpdate = (event: Event) => {
      update((event as CustomEvent<ActiveSessionData>).detail);
    };
    void load();
    window.addEventListener("sapen:active-class-session-updated", onSessionUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("sapen:active-class-session-updated", onSessionUpdate);
    };
  }, []);

  if (!session || session.status !== "open" || !session.classId) return null;
  const games = session.selectedGames || [];

  return <section aria-labelledby="active-session-games-title" className="rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="active-session-games-title" className="font-display text-2xl font-bold text-[#183b2d]">Kuis sesi</h2><p className="mt-1 text-sm leading-6 text-[#4e4a40]">Pilih kuis yang dibuka host, lalu gabung menggunakan PIN.</p></div>
      <span className="rounded-full bg-[#e6eadf] px-3 py-1 text-xs font-bold text-[#183b2d]">Sesi aktif</span>
    </div>
    {showPinForm && <div className="mt-5 rounded-xl border border-[#d2c5ad] bg-white p-4 sm:p-5"><h3 className="mb-3 text-sm font-bold text-[#183b2d]">Masukkan PIN kuis</h3><GamePinForm initialName={session.participantName} /></div>}
    <div className="mt-5 space-y-2" aria-live="polite">
      {games.length ? games.map((game) => <div key={game.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d2c5ad] bg-white px-4 py-3"><strong className="min-w-0 flex-1 text-sm text-[#183b2d]">{game.title}</strong><span className={`rounded-full px-3 py-1 text-xs font-bold ${game.status === "live" ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#f2e5bf] text-[#60480c]"}`}>{game.status === "live" ? "Sedang berlangsung, masukkan PIN" : "Menunggu host membuka"}</span></div>) : <p className="rounded-xl border border-dashed border-[#b8aa8e] px-4 py-4 text-sm text-[#514b3e]">Belum ada kuis sesi yang dipilih host.</p>}
    </div>
  </section>;
}
