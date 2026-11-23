"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gamepad2, Search, Users, KeyRound, Trophy, X } from "lucide-react";
import { GAME_TEMPLATES, type GameBlueprint } from "@/lib/game-blueprint";
import GamePinForm from "@/components/game/GamePinForm";
import { GUEST_GAME_COMPLETED_EVENT, readCompletedGuestGames } from "@/lib/guest-game-progress";
import GameCardHeader, { gameLevelAccent } from "@/components/game/GameCardHeader";

type CatalogGame = GameBlueprint & { classId?: string };
type GameScoreEntry = { id: string; gameId: string; gameTitle: string; gameType: string; score: number; createdAt: string };

export default function GameCatalogClient({ isGuest = false, guestParticipantId, showHistory = false }: { isGuest?: boolean; guestParticipantId?: string; showHistory?: boolean }) {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [completedGuestGames, setCompletedGuestGames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [template, setTemplate] = useState("all");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"games" | "history">("games");
  const [scoreHistory, setScoreHistory] = useState<GameScoreEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  useEffect(() => {
    if (!isGuest || !guestParticipantId) return;
    const refreshCompleted = () => setCompletedGuestGames(readCompletedGuestGames(guestParticipantId));
    refreshCompleted();
    window.addEventListener(GUEST_GAME_COMPLETED_EVENT, refreshCompleted);
    window.addEventListener("storage", refreshCompleted);
    window.addEventListener("pageshow", refreshCompleted);
    return () => {
      window.removeEventListener(GUEST_GAME_COMPLETED_EVENT, refreshCompleted);
      window.removeEventListener("storage", refreshCompleted);
      window.removeEventListener("pageshow", refreshCompleted);
    };
  }, [guestParticipantId, isGuest]);
  useEffect(() => {
    let active = true;
    async function loadGames() {
      try {
        const [catalogResponse, currentSessionResponse] = await Promise.all([
          fetch("/api/games", { cache: "no-store" }),
          isGuest ? fetch("/api/class-sessions/current", { cache: "no-store" }) : Promise.resolve(null),
        ]);
        const catalogData = await catalogResponse.json();
        if (!catalogResponse.ok) throw new Error(catalogData.error || "Kuis belum dapat dimuat.");
        let catalogGames: CatalogGame[] = catalogData.games || [];
        if (isGuest && currentSessionResponse?.ok) {
          const currentSession = await currentSessionResponse.json();
          if (typeof currentSession.classId === "string" && currentSession.classId) {
            const practiceResponse = await fetch(`/api/games?purpose=independent&classId=${encodeURIComponent(currentSession.classId)}`, { cache: "no-store" });
            const practiceData = await practiceResponse.json();
            if (!practiceResponse.ok) throw new Error(practiceData.error || "Latihan mandiri kelas belum dapat dimuat.");
            catalogGames = [...catalogGames, ...(practiceData.games || []).map((game: GameBlueprint) => ({ ...game, classId: currentSession.classId }))];
          }
        }
        if (active) setGames(catalogGames);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Kuis belum dapat dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadGames();
    return () => { active = false; };
  }, [isGuest]);
  const filtered = useMemo(() => games.filter((game) => {
    if (isGuest && completedGuestGames.includes(game.id)) return false;
    const term = query.trim().toLocaleLowerCase();
    return (!term || `${game.title} ${game.topic}`.toLocaleLowerCase().includes(term)) && (level === "all" || game.level === level) && (template === "all" || game.template === template);
  }).sort((a, b) => sort === "popular" ? (b.plays || 0) - (a.plays || 0) : sort === "az" ? a.title.localeCompare(b.title, "id") : (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")), [completedGuestGames, games, isGuest, level, query, sort, template]);

  async function openHistory() {
    setView("history");
    if (historyLoading) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/game/score", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Riwayat skor belum dapat dimuat.");
      const entries = Array.isArray(data.entries) ? data.entries as GameScoreEntry[] : [];
      setScoreHistory(entries.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt)));
    } catch (reason) {
      setHistoryError(reason instanceof Error ? reason.message : "Riwayat skor belum dapat dimuat.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const steps = [[KeyRound, "Dapatkan PIN atau Pilih kuis", "Tutor membagikan PIN untuk kuis kelas."], [Search, "Masuk atau pilih latihan", "Gabung dengan PIN atau buka kuis mandiri."], [Trophy, "Mulai berlatih", "Jawab soal dan lihat hasil belajarmu."] ] as const;
  return <main className="min-h-dvh bg-transparent px-4 pt-8 pb-28 text-[#20251f] sm:px-8 sm:pt-12 sm:pb-28 lg:pb-12"><div className="mx-auto max-w-6xl">
    <header className="max-w-2xl"><h1 className="font-display text-4xl font-bold leading-tight text-[#183b2d] sm:text-5xl">{isGuest ? "Belajar bersama kelasmu." : "Belajar lewat permainan."}</h1><p className="mt-4 text-base leading-7 text-[#3d4038]">{isGuest ? "Masukkan PIN dari tutor untuk bergabung. Kuis untuk kelasmu ada di bawah." : "Pilih latihan untuk bermain sendiri, atau masukkan PIN untuk bergabung ke kuis yang sedang dipandu tutor."}</p></header>

    <nav aria-label="Menu Kuis" className="mt-7 flex flex-wrap gap-2 border-b border-[#d2c5ad] pb-3">
      <button type="button" aria-current={view === "games" ? "page" : undefined} onClick={() => setView("games")} className={`min-h-11 rounded-full border px-4 text-sm font-bold transition-colors ${view === "games" ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a] hover:bg-[#e6eadf]"}`}>Kuis</button>
      {showHistory && <button type="button" aria-current={view === "history" ? "page" : undefined} onClick={() => void openHistory()} className={`min-h-11 rounded-full border px-4 text-sm font-bold transition-colors ${view === "history" ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a] hover:bg-[#e6eadf]"}`}><Trophy className="mr-2 inline h-4 w-4" />Riwayat Kuis</button>}
    </nav>

    {view === "history" ? <section aria-labelledby="game-history-title" className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="game-history-title" className="font-display text-2xl font-bold text-[#183b2d]">Riwayat Kuis</h2><p className="mt-1 text-sm text-[#4e4a40]">Skor tertinggi ditampilkan lebih dulu.</p></div><button type="button" onClick={() => void openHistory()} disabled={historyLoading} className="min-h-11 rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-4 text-sm font-bold text-[#244b3a] disabled:opacity-60">{historyLoading ? "Memuat…" : "Muat ulang"}</button></div>
      {historyError ? <p role="alert" className="mt-5 rounded-xl border border-[#ba472f]/40 bg-[#fdf9f0] p-4 text-sm text-[#812f20]">{historyError}</p> : historyLoading ? <p role="status" className="mt-5 rounded-xl bg-[#fdf9f0] p-5 text-sm text-[#4e4a40]">Memuat riwayat skor…</p> : scoreHistory.length ? <ol className="mt-5 grid gap-3 md:grid-cols-2">{scoreHistory.map((entry, index) => <li key={entry.id} className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] p-4 shadow-sm"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${index === 0 ? "bg-[#f5d977] text-[#46370e]" : "bg-[#e6eadf] text-[#244b3a]"}`}>{index + 1}</span><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-[#183b2d]">{entry.gameTitle}</h3><p className="mt-1 text-xs text-[#625f54]">{entry.gameType} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(entry.createdAt))}</p></div><strong className="shrink-0 rounded-lg bg-[#244b3a] px-3 py-2 text-sm tabular-nums text-white">{entry.score} pt</strong></li>)}</ol> : <div className="mt-5 rounded-2xl border border-dashed border-[#b8aa8e] bg-[#fdf9f0] px-5 py-10 text-center"><Trophy className="mx-auto h-8 w-8 text-[#ba472f]" /><h3 className="mt-3 text-lg font-bold text-[#183b2d]">Belum ada skor tersimpan</h3><p className="mt-1 text-sm text-[#4e4a40]">Selesaikan game sambil masuk atau bergabung ke sesi, lalu hasilnya muncul di sini.</p></div>}
    </section> : <>

    <section className={`mt-8 grid items-stretch gap-4 ${isGuest ? "md:grid-cols-1" : "md:grid-cols-2"}`} aria-label="Pilih cara bermain">
      <div className="flex min-h-48 flex-col rounded-2xl border border-[#b8aa8e] bg-[#fdf9f0] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6eadf] text-[#244b3a]"><Users className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-[#183b2d]">Gabung dengan PIN</h2><p className="text-sm text-[#4e4a40]">Masukkan PIN 6 angka dari tutor.</p></div></div><div className="mt-auto pt-5"><GamePinForm /></div></div>
      {!isGuest && <Link href="#daftar-game" className="group flex min-h-48 flex-col rounded-2xl border border-[#b8aa8e] bg-[#fdf9f0] p-5 text-[#183b2d] shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[#244b3a] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6eadf] text-[#244b3a]"><Gamepad2 className="h-5 w-5" /></span><div><h2 className="text-xl font-bold">Main sendiri</h2><p className="text-sm text-[#4e4a40]">Pilih kuis dari katalog latihan.</p></div></div><span className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 pt-5 text-sm font-bold text-[#244b3a]">Lihat daftar kuis<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>}
    </section>

    {!isGuest && <section className="mt-10 rounded-xl border-y border-[#d2c5ad] py-5"><h2 className="font-bold text-[#183b2d]">Cara bermain</h2><ol className="mt-4 grid gap-3 md:grid-cols-3">{steps.map(([Icon, title, description], i) => <li key={title} className="flex min-h-24 items-center justify-center gap-3 rounded-xl bg-[#fdf9f0] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6eadf] text-sm font-extrabold text-[#183b2d]">{i + 1}</span><Icon className="h-5 w-5 shrink-0 text-[#ba472f]" /><span className="text-left"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-sm text-[#4e4a40]">{description}</span></span></li>)}</ol></section>}

    {!isGuest && <section aria-label="Cari dan saring kuis" className="mt-8 space-y-4 border-y border-[#d2c5ad] py-4"><div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_11rem_14rem_11rem]"><label className="relative block sm:col-span-2 lg:col-span-1"><span className="mb-1 block text-xs font-bold text-[#3d4038]">Cari kuis</span><Search className="pointer-events-none absolute left-3 top-10 h-4 w-4 text-[#625f54]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kuis atau topik" className="h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] pl-10 pr-3 text-sm placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label><label className="block text-xs font-bold text-[#3d4038]">Level<select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="all">Semua level</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label><label className="block text-xs font-bold text-[#3d4038]">Jenis latihan<select value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="all">Semua jenis</option>{GAME_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block text-xs font-bold text-[#3d4038]">Urutkan<select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="recent">Terbaru</option><option value="popular">Terpopuler</option><option value="az">A–Z</option></select></label></div><div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm font-bold text-[#3d4038]">{loading ? "memuat kuis…" : `${filtered.length} dari ${games.length} kuis`}</p>{(query || level !== "all" || template !== "all") && <button type="button" onClick={() => { setQuery(""); setLevel("all"); setTemplate("all"); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#244b3a] underline underline-offset-4">Hapus filter<X className="h-4 w-4" /></button>}</div></section>}

    {error && <p role="alert" className="mt-5 rounded-lg border border-[#943520]/30 bg-[#fdf9f0] p-4 text-sm text-[#943520]">{error}</p>}
    {!loading && !error && filtered.length === 0 && <div className="mt-6 rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] px-5 py-10 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-[#244b3a]" /><h2 className="mt-3 text-xl font-bold text-[#183b2d]">{isGuest ? "Belum ada kuis untuk kelasmu" : "Belum ada kuis yang cocok"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#4e4a40]">{isGuest ? "Kuis sesi akan muncul setelah dipilih pengurus, dan Latihan Mandiri tersedia setelah diterbitkan. Kamu tetap bisa bergabung ke kuis langsung dengan PIN dari tutor." : "Coba ubah kata pencarian atau filter."}</p></div>}
    <div id="daftar-game" className={`${isGuest ? "mt-5" : "mt-6"} grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3`}>{filtered.map((game) => {
      const type = GAME_TEMPLATES.find((item) => item.id === game.template);
      const isIndependent = game.status === "independent" && game.destination === "independent";
      const playHref = `/games/${encodeURIComponent(game.id)}${isIndependent && game.classId ? `?classId=${encodeURIComponent(game.classId)}` : ""}`;
      const levelAccent = gameLevelAccent(game.level);
      return <Link key={game.id} href={playHref} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#b8aa8e] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#244b3a] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f]">
        <GameCardHeader game={game} />
        <div className="flex flex-1 flex-col p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: levelAccent.badge, color: levelAccent.ink }}>{game.level}</span><span className="text-xs font-semibold text-[#514b3e]">{type?.title}</span>{isGuest && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isIndependent ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#f2dfd6] text-[#7b2c1d]"}`}>{isIndependent ? "Latihan mandiri" : "Untuk sesi"}</span>}</div><h2 className="mt-3 line-clamp-2 text-xl font-bold text-[#183b2d] group-hover:text-[#244b3a]">{game.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-[#3d4038]">{game.topic}</p><p className="mt-3 text-sm text-[#514b3e]">{game.items.length} soal <span aria-hidden="true">·</span> Dimainkan {(game.plays || 0).toLocaleString("id-ID")} kali</p><span className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white transition-colors group-hover:bg-[#943520]">Mainkan<ArrowRight className="h-4 w-4" /></span></div>
      </Link>;
    })}</div>
    {!isGuest && !loading && !error && games.length < 4 && <aside className="mt-8 rounded-2xl border border-[#c9bda7] bg-white px-6 py-7 text-center shadow-sm"><Gamepad2 className="mx-auto h-7 w-7 text-[#244b3a]" /><h2 className="mt-2 font-display text-xl font-bold text-[#183b2d]">Kuis baru segera hadir</h2><p className="mt-1 text-sm text-[#4e4a40]">Kami sedang menyiapkan lebih banyak latihan untuk ruang belajarmu.</p></aside>}
    </>}
  </div></main>;
}
