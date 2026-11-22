"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Presentation, Play, ArrowLeft, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import type { SessionPayload } from "@/lib/types";
import type { GameBlueprint } from "@/lib/game-blueprint";

type G = Pick<GameBlueprint, "id" | "title" | "template" | "status" | "items"> & { kind: string; source: "blueprint" };

export default function HostCreateClient({ sessionUser }: { sessionUser: SessionPayload | null }) {
  const router = useRouter();
  const [games, setGames] = useState<G[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [error, setError] = useState("");

  async function loadGames() {
    setLoadingGames(true);
    try {
      const blueprintRes = await fetch("/api/admin/game-builder", { cache: "no-store" });
      const blueprintData = await blueprintRes.json();
      if (!blueprintRes.ok) throw new Error(blueprintData.error || "Blueprint game gagal dimuat.");
      const sourceGames = Array.isArray(blueprintData.games) ? blueprintData.games as GameBlueprint[] : [];
      const list: G[] = sourceGames.filter((game) => game.status === "published" || game.status === "session").map((game) => ({ ...game, kind: game.template, source: "blueprint" }));
      setGames(list);
      if (list.length) setSelected(`${list[0].source}:${list[0].id}`);
      else setSelected("");
    } catch (error) { setError(error instanceof Error ? error.message : "Gagal memuat daftar kuis."); }
    setLoadingGames(false);
  }
  useEffect(() => { loadGames(); }, []);

  const handleCreateSession = async () => {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const [source, gameId] = selected.split(":", 2);
      const res = await fetch("/api/game/live/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, source }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Gagal membuka sesi."); setLoading(false); return; }
      localStorage.setItem(`sapen_host_${data.pin}`, data.hostId);
      router.push(`/game/host/${data.pin}`);
    } catch { setError("Terjadi kesalahan jaringan."); setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Link href="/admin?tab=game-builder" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /><span>Kembali ke Kelola Kuis</span></Link>
        <span className="text-xs font-bold text-[#14532D] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Mode Host & Layar Proyektor</span>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#14532D] text-white"><Presentation className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Buka Sesi Live Baru</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1 leading-relaxed">Pilih kuis buatan admin (Kelola Kuis). Sistem akan membuat PIN 6 digit unik untuk peserta.</p>
          </div>
          <button type="button" onClick={loadGames} className="ml-auto text-xs font-bold text-[#14532D] inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5"/>Muat</button>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 font-medium">{error}</div>}

        {loadingGames ? (
          <div className="py-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>memuat kuis...</div>
        ) : games.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">Belum ada kuis. Buat dulu di <strong>Admin &gt; Kelola Kuis</strong>.</div>
        ) : (
          <div className="space-y-3 mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">Pilih Kuis</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {games.map((g) => {
                const isSelected = selected === `${g.source}:${g.id}`;
                return (
                  <button type="button" key={`${g.source}:${g.id}`} onClick={() => setSelected(`${g.source}:${g.id}`)} className={`text-left rounded-xl border-2 p-4 transition-all relative ${isSelected ? "border-[#14532D] bg-emerald-50/30 ring-2 ring-[#14532D]/20 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{g.status === "session" ? "Khusus Sesi · " : "Publik · "}{(g.kind||"").replace(/-/g," ").replace(/_/g," ")}</span>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-[#14532D]" />}
                    </div>
                    <h3 className="font-bold text-sm text-[#111827] mb-1">{g.title}</h3>
                    <div className="text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">{g.items.length} Soal</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
          <div className="text-xs text-gray-500 text-center sm:text-left">Host: <strong className="text-gray-900">{sessionUser?.name || "Pengurus / Pengajar Sapen"}</strong></div>
          <button type="button" onClick={handleCreateSession} disabled={loading || !selected} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#14532D] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#0f3d21] disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm min-h-[44px]">
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>Membuat Sesi...</span></>) : (<><Play className="h-4 w-4 fill-white" /><span>Buka Sesi Live Sekarang</span></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
