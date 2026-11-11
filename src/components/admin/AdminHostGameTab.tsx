"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Play, Radio, Copy, CheckCircle2, RefreshCw } from "lucide-react";

type G = { id: string; title: string; kind: string; questions?: any[] };

export default function AdminHostGameTab({ notify }: { notify: (m: string) => void }) {
  const [games, setGames] = useState<G[]>([]);
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [session, setSession] = useState<{ pin: string; hostId: string; templateTitle: string } | null>(null);
  const [error, setError] = useState("");

  async function loadGames() {
    setLoadingGames(true);
    try {
      const res = await fetch("/api/admin/games");
      const data = await res.json();
      const list: G[] = data.games || [];
      setGames(list);
      if (list.length && !gameId) setGameId(list[0].id);
    } catch {}
    setLoadingGames(false);
  }
  useEffect(() => { loadGames(); }, []);

  async function createSession() {
    if (!gameId) { setError("Pilih game terlebih dahulu."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/game/live/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Gagal membuat sesi kuis."); setLoading(false); return; }
      localStorage.setItem(`sapen_host_${data.pin}`, data.hostId);
      setSession({ pin: data.pin, hostId: data.hostId, templateTitle: data.templateTitle || "Kuis Live" });
      notify(`Sesi dibuat! PIN: ${data.pin}`);
    } catch { setError("Gagal membuat sesi kuis."); }
    setLoading(false);
  }

  const hostUrl = session ? `/game/host/${session.pin}` : "";
  const joinUrl = session ? `/game/join?pin=${session.pin}` : "";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14532D] text-white"><Radio className="h-5 w-5" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-[#1A2E1A]">Host Kuis / Game (Live)</h2>
            <p className="text-xs text-[#1A2E1A]/70 mt-0.5 leading-relaxed">Pilih game buatan admin (Kelola Game), buat sesi untuk mendapatkan PIN 6 digit, lalu buka layar host dan bagikan PIN ke peserta.</p>
          </div>
          <button type="button" onClick={loadGames} className="text-xs font-bold text-[#14532D] inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5"/>Muat</button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}

        {loadingGames ? (
          <div className="text-sm text-gray-500 py-6 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Memuat daftar game...</div>
        ) : games.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">Belum ada game. Buat game dulu di menu <strong>Kelola Game</strong>.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-5 max-h-72 overflow-auto pr-1">
            {games.map((g) => (
              <button key={g.id} type="button" onClick={() => setGameId(g.id)} className={`text-left rounded-xl border-2 p-4 transition ${gameId === g.id ? "border-[#14532D] bg-emerald-50/40" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="flex items-center justify-between mb-1"><span className="text-sm font-bold text-[#111827]">{g.title}</span>{gameId === g.id && <CheckCircle2 className="h-4 w-4 text-[#14532D]" />}</div>
                <p className="text-xs text-gray-600 capitalize">{(g.kind||"").replace(/_/g," ")}</p>
                <p className="mt-2 text-[11px] font-semibold text-amber-700">{(g.questions||[]).length} soal</p>
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={createSession} disabled={loading || !gameId} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#14532D] px-6 py-3 text-sm font-bold text-white hover:bg-[#0f3d21] disabled:opacity-60">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Membuat Sesi...</> : <><Play className="h-4 w-4" />Buat Sesi &amp; Dapatkan PIN Baru</>}
        </button>
      </div>

      {session && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold"><CheckCircle2 className="h-5 w-5" />Sesi Aktif Dibuat</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white border border-emerald-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">PIN Peserta (6 digit)</p>
              <p className="mt-1 font-mono text-4xl font-black tracking-[0.2em] text-[#14532D]">{session.pin}</p>
              <p className="mt-1 text-xs text-gray-600">Game: {session.templateTitle}</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Aksi Host</p>
              <a href={hostUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-[#14532D] bg-[#14532D] px-3 py-2 font-bold text-white hover:bg-[#0f3d21]"><span>Buka Layar Host / Proyektor</span><ExternalLink className="h-4 w-4" /></a>
              <a href={joinUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 font-bold text-[#1A2E1A] hover:bg-gray-50"><span>Buka Halaman Join Peserta</span><ExternalLink className="h-4 w-4" /></a>
              <button type="button" onClick={() => { navigator.clipboard.writeText(session.pin); notify("PIN disalin!"); }} className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 font-bold text-[#1A2E1A] hover:bg-gray-50"><span>Salin PIN</span><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
