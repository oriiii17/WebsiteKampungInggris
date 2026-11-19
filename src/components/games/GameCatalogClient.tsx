"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gamepad2, Search, Users, KeyRound, Trophy, X } from "lucide-react";
import { GAME_TEMPLATES, type GameBlueprint } from "@/lib/game-blueprint";
import GamePinForm from "@/components/game/GamePinForm";

const gamePhotos: Record<string, string> = {
  "multiple-choice-quiz": "/images/community/kelas-interior-card.webp", "drag-and-sort": "/images/community/belajar-taman-card.webp",
  "listen-and-choose": "/images/community/diskusi-warga-card.webp", "sentence-builder": "/images/community/belajar-kawasan-card.webp",
  matching: "/images/community/percakapan-jogja-card.webp", "word-bank": "/images/community/belajar-pantai-card.webp",
  "word-search": "/images/community/english-camp-card.webp",
};

function GameCover({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <Image src={failed ? fallback : src} alt={alt} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" onError={() => setFailed(true)} />;
}

export default function GameCatalogClient({ isGuest = false }: { isGuest?: boolean }) {
  const [games, setGames] = useState<GameBlueprint[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [template, setTemplate] = useState("all");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/games", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum dapat dimuat.");
      setGames(data.games || []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Game belum dapat dimuat.")).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => games.filter((game) => {
    const term = query.trim().toLocaleLowerCase();
    return (!term || `${game.title} ${game.topic}`.toLocaleLowerCase().includes(term)) && (level === "all" || game.level === level) && (template === "all" || game.template === template);
  }).sort((a, b) => sort === "popular" ? (b.plays || 0) - (a.plays || 0) : sort === "az" ? a.title.localeCompare(b.title, "id") : (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")), [games, level, query, sort, template]);

  const steps = [[KeyRound, "Dapatkan PIN atau pilih game", "Tutor membagikan PIN untuk game kelas."], [Search, "Masuk atau pilih latihan", "Gabung dengan PIN atau buka game mandiri."], [Trophy, "Mulai berlatih", "Jawab soal dan lihat hasil belajarmu."] ] as const;
  return <main className="min-h-screen bg-[#f3e9d5] px-4 py-10 text-[#20251f] sm:px-8 sm:py-14"><div className="mx-auto max-w-6xl">
    <header className="max-w-2xl"><h1 className="font-display text-4xl font-bold leading-tight text-[#183b2d] sm:text-5xl">{isGuest ? "Belajar bersama kelasmu." : "Belajar lewat permainan."}</h1><p className="mt-4 text-base leading-7 text-[#3d4038]">{isGuest ? "Masukkan PIN dari tutor untuk bergabung, atau pilih latihan yang ditautkan ke sesi kelasmu." : "Pilih latihan untuk bermain sendiri, atau masukkan PIN untuk bergabung ke game yang sedang dipandu tutor."}</p></header>

    <section className={`mt-8 grid items-stretch gap-4 ${isGuest ? "md:grid-cols-1" : "md:grid-cols-2"}`} aria-label="Pilih cara bermain">
      <div className="flex min-h-48 flex-col rounded-2xl border border-[#b8aa8e] bg-[#fdf9f0] p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6eadf] text-[#244b3a]"><Users className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-[#183b2d]">Gabung dengan PIN</h2><p className="text-sm text-[#4e4a40]">Masukkan PIN 6 angka dari tutor.</p></div></div><div className="mt-auto pt-5"><GamePinForm /></div></div>
      {!isGuest && <Link href="#daftar-game" className="group flex min-h-48 flex-col rounded-2xl border border-[#b8aa8e] bg-[#fdf9f0] p-5 text-[#183b2d] shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[#244b3a] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6eadf] text-[#244b3a]"><Gamepad2 className="h-5 w-5" /></span><div><h2 className="text-xl font-bold">Main sendiri</h2><p className="text-sm text-[#4e4a40]">Pilih game dari katalog latihan.</p></div></div><span className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 pt-5 text-sm font-bold text-[#244b3a]">Lihat daftar game<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>}
    </section>

    {!isGuest && <section className="mt-10 rounded-xl border-y border-[#d2c5ad] py-5"><h2 className="font-bold text-[#183b2d]">Cara bermain</h2><ol className="mt-4 grid gap-3 sm:grid-cols-3">{steps.map(([Icon, title, description], i) => <li key={title} className="flex min-h-24 items-center justify-center gap-3 rounded-xl bg-[#fdf9f0] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6eadf] text-sm font-extrabold text-[#183b2d]">{i + 1}</span><Icon className="h-5 w-5 shrink-0 text-[#ba472f]" /><span className="text-left"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-sm text-[#4e4a40]">{description}</span></span></li>)}</ol></section>}

    {!isGuest && <section aria-label="Cari dan saring game" className="mt-8 space-y-4 border-y border-[#d2c5ad] py-4"><div className="grid items-end gap-3 lg:grid-cols-[minmax(14rem,1fr)_auto_auto_11rem]"><label className="relative block"><span className="mb-1 block text-xs font-bold text-[#3d4038]">Cari game</span><Search className="pointer-events-none absolute left-3 top-10 h-4 w-4 text-[#625f54]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari game atau topik" className="h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] pl-10 pr-3 text-sm placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label><fieldset><legend className="mb-1 text-xs font-bold text-[#3d4038]">Level</legend><div className="flex flex-wrap gap-1.5">{["all", "A1", "A2", "B1", "B2"].map((v) => <button key={v} type="button" aria-pressed={level === v} onClick={() => setLevel(v)} className={`min-h-11 rounded-full border px-3 text-sm font-bold ${level === v ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a]"}`}>{v === "all" ? "Semua" : v}</button>)}</div></fieldset><fieldset><legend className="mb-1 text-xs font-bold text-[#3d4038]">Jenis latihan</legend><div className="flex max-w-[28rem] flex-wrap gap-1.5"><button type="button" aria-pressed={template === "all"} onClick={() => setTemplate("all")} className={`min-h-11 rounded-full border px-3 text-sm font-bold ${template === "all" ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a]"}`}>Semua</button>{GAME_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={template === item.id} onClick={() => setTemplate(item.id)} className={`min-h-11 rounded-full border px-3 text-sm font-bold ${template === item.id ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a]"}`}>{item.title}</button>)}</div></fieldset><label className="text-xs font-bold text-[#3d4038]">Urutkan<select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="recent">Terbaru</option><option value="popular">Terpopuler</option><option value="az">A–Z</option></select></label></div><div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm font-bold text-[#3d4038]">{loading ? "Memuat game…" : `${filtered.length} dari ${games.length} game`}</p>{(query || level !== "all" || template !== "all") && <button type="button" onClick={() => { setQuery(""); setLevel("all"); setTemplate("all"); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#244b3a] underline underline-offset-4">Hapus filter<X className="h-4 w-4" /></button>}</div></section>}

    {error && <p role="alert" className="mt-5 rounded-lg border border-[#943520]/30 bg-[#fdf9f0] p-4 text-sm text-[#943520]">{error}</p>}
    {isGuest && <div className="mt-8 border-b border-[#c9bda7] pb-5"><h2 className="text-2xl font-bold text-[#183b2d]">Game dan latihan kelasmu</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#4e4a40]">Latihan yang ditampilkan di sini dipilih pengurus untuk kelas pada sesi yang kamu ikuti.</p></div>}
    {!loading && !error && filtered.length === 0 && <div className="mt-6 rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] px-5 py-10 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-[#244b3a]" /><h2 className="mt-3 text-xl font-bold text-[#183b2d]">{isGuest ? "Belum ada latihan untuk sesi ini" : "Belum ada game yang cocok"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#4e4a40]">{isGuest ? "Pengurus belum menautkan game ke kelasmu. Kamu tetap bisa bergabung ke kuis langsung dengan PIN dari tutor." : "Coba ubah kata pencarian atau filter."}</p></div>}
    <div id="daftar-game" className={`${isGuest ? "mt-5" : "mt-6"} grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3`}>{filtered.map((game) => {
      const type = GAME_TEMPLATES.find((item) => item.id === game.template);
      const fallback = gamePhotos[game.template] || "/images/community/kelas-interior-card.webp";
      return <Link key={game.id} href={`/games/${encodeURIComponent(game.id)}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] transition duration-200 hover:-translate-y-1 hover:border-[#244b3a] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f]">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#e6eadf]"><GameCover src={game.coverImage || fallback} fallback={fallback} alt={`Suasana belajar untuk game ${game.title}`} /></div>
        <div className="flex flex-1 flex-col p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e6eadf] px-2.5 py-1 text-xs font-extrabold text-[#244b3a]">{game.level}</span><span className="text-xs font-semibold text-[#625f54]">{type?.title}</span></div><h2 className="mt-3 line-clamp-2 text-xl font-bold text-[#183b2d] group-hover:text-[#244b3a]">{game.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-[#3d4038]">{game.topic}</p><p className="mt-3 text-sm text-[#625f54]">{game.items.length} soal <span aria-hidden="true">·</span> Dimainkan {(game.plays || 0).toLocaleString("id-ID")} kali</p><span className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white group-hover:bg-[#943520]">Mainkan<ArrowRight className="h-4 w-4" /></span></div>
      </Link>;
    })}</div>
    {!isGuest && !loading && !error && games.length < 4 && <aside className="mt-8 rounded-2xl border border-dashed border-[#b8aa8e] bg-[#e6eadf]/60 px-6 py-7 text-center"><Gamepad2 className="mx-auto h-7 w-7 text-[#244b3a]" /><h2 className="mt-2 font-display text-xl font-bold text-[#183b2d]">Game baru segera hadir</h2><p className="mt-1 text-sm text-[#4e4a40]">Kami sedang menyiapkan lebih banyak latihan untuk ruang belajarmu.</p></aside>}
  </div></main>;
}
