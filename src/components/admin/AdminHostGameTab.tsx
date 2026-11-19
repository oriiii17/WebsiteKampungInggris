"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, Gamepad2, Loader2, Play, Radio, RefreshCw } from "lucide-react";
import type { GameBlueprint } from "@/lib/game-blueprint";

type ActiveSession = { pin: string; hostId: string; templateTitle: string };
const updatedTime = (game: GameBlueprint) => Date.parse(game.updatedAt || "") || Date.parse(game.createdAt || "") || 0;

export default function AdminHostGameTab({ notify }: { notify: (message: string) => void }) {
  const [games, setGames] = useState<GameBlueprint[]>([]);
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [error, setError] = useState("");

  const publishedGames = useMemo(() => games
    .filter((game) => game.status === "published" || game.status === "session")
    .sort((a, b) => updatedTime(b) - updatedTime(a)), [games]);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/game-builder", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum dapat dimuat.");
      const latest = Array.isArray(data.games) ? data.games as GameBlueprint[] : [];
      setGames(latest);
      setGameId((current) => latest.some((game) => game.id === current && (game.status === "published" || game.status === "session"))
        ? current
        : latest.filter((game) => game.status === "published" || game.status === "session")
          .sort((a, b) => updatedTime(b) - updatedTime(a))[0]?.id || "");
    } catch (reason) {
      setGames([]);
      setError(reason instanceof Error ? reason.message : "Game belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGames(); }, [loadGames]);

  async function createSession() {
    if (!gameId) {
      setError("Pilih game Publik atau Sesi terlebih dahulu.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/game/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, source: "blueprint" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sesi kuis belum dapat dibuat.");
      localStorage.setItem(`sapen_host_${data.pin}`, data.hostId);
      setSession({ pin: data.pin, hostId: data.hostId, templateTitle: data.templateTitle || "Kuis Live" });
      notify(`Sesi ${data.pin} siap dibuka.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Periksa koneksi lalu coba buat sesi lagi.");
    } finally {
      setCreating(false);
    }
  }

  async function copyPin() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.pin);
      notify("PIN sesi berhasil disalin.");
    } catch {
      setError("PIN tidak dapat disalin otomatis. Pilih dan salin PIN secara manual.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-rule bg-paper-light p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest text-white"><Radio className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-forest">Host kuis live</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Pilih game Publik atau Sesi dari Game Builder. Sistem akan membuat PIN untuk peserta dan membuka ruang host.</p>
          </div>
          <button type="button" onClick={() => void loadGames()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule bg-white px-3 text-sm font-bold text-forest transition-colors hover:bg-forest-soft disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Muat ulang
          </button>
        </div>

        {error && <div role="alert" className="mt-5 rounded-lg border border-tomato/30 bg-tomato/5 px-4 py-3 text-sm text-tomato">{error}</div>}

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-white px-4 py-5 text-sm text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memuat game…</div>
        ) : publishedGames.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-rule-strong bg-white p-5 sm:p-6">
            <Gamepad2 className="h-6 w-6 text-forest" aria-hidden="true" />
            <h3 className="mt-3 font-bold text-ink">Belum ada game yang siap dimainkan</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">Simpan game sebagai Publik atau Sesi terlebih dahulu. Draft belum tersedia untuk sesi live.</p>
            <Link href="/admin?tab=game-builder" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-tomato px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-tomato-deep">Buka Game Builder</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-baseline justify-between gap-3">
              <h3 className="font-bold text-ink">Pilih game</h3>
              <p className="text-xs text-muted">{publishedGames.length} game siap dimainkan · terbaru ditampilkan lebih dulu</p>
            </div>
            <div className="mt-3 grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {publishedGames.map((game) => {
                const selected = game.id === gameId;
                const itemCount = game.items.reduce((count, item) => count + Math.max(1, item.words?.length || item.vocabulary?.length || item.pairs?.length || item.sortItems?.length || 1), 0);
                return (
                  <button key={game.id} type="button" aria-pressed={selected} onClick={() => setGameId(game.id)} className={`group min-h-28 min-w-0 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tomato ${selected ? "border-forest bg-forest-soft" : "border-rule bg-white hover:border-forest/60"}`}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block break-words font-bold leading-snug text-ink">{game.title}</span>
                        <span className="mt-1 block break-words text-xs text-muted">{game.status === "session" ? "Sesi" : "Publik"} · {game.template.replaceAll("-", " ")} · {game.level}</span>
                      </span>
                      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-forest" aria-label="Game dipilih" />}
                    </span>
                    <span className="mt-3 block text-xs font-semibold text-forest">{itemCount} materi permainan</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => void createSession()} disabled={creating || !gameId} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-tomato px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-tomato-deep disabled:cursor-not-allowed disabled:opacity-60">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Membuat sesi…</> : <><Play className="h-4 w-4" aria-hidden="true" />Buat sesi dan dapatkan PIN</>}
            </button>
          </>
        )}
      </section>

      {session && (
        <section aria-live="polite" className="rounded-xl border border-forest/25 bg-forest-soft p-5 sm:p-6">
          <div className="flex items-center gap-2 font-bold text-forest"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />Sesi siap dibuka</div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <div className="rounded-lg border border-rule bg-white p-4">
              <p className="text-xs font-bold text-muted">PIN peserta</p>
              <p className="mt-1 select-all font-display text-4xl font-bold tracking-[0.18em] text-forest tabular-nums">{session.pin}</p>
              <p className="mt-2 break-words text-sm text-muted">Game: {session.templateTitle}</p>
            </div>
            <div className="flex flex-col gap-2">
              <a href={`/game/host/${session.pin}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-forest-deep"><span>Buka layar host</span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
              <a href={`/game/join?pin=${session.pin}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-2 text-sm font-bold text-forest transition-colors hover:bg-forest-soft"><span>Pratinjau halaman peserta</span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
              <button type="button" onClick={() => void copyPin()} className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-2 text-sm font-bold text-forest transition-colors hover:bg-forest-soft"><span>Salin PIN</span><Copy className="h-4 w-4 shrink-0" aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
