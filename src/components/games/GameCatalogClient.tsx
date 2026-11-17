"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Gamepad2, Search } from "lucide-react";
import { GAME_TEMPLATES, type GameBlueprint } from "@/lib/game-blueprint";

export default function GameCatalogClient() {
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
    return (!term || `${game.title} ${game.topic}`.toLocaleLowerCase().includes(term))
      && (level === "all" || game.level === level)
      && (template === "all" || game.template === template);
  }).sort((a, b) => sort === "popular" ? (b.plays || 0) - (a.plays || 0)
    : sort === "az" ? a.title.localeCompare(b.title, "id")
      : (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")), [games, level, query, sort, template]);

  return <main className="min-h-screen bg-[#f3e9d5] px-4 py-10 text-[#20251f] sm:px-8 sm:py-14"><div className="mx-auto max-w-6xl">
    <header className="max-w-2xl"><h1 className="font-display text-4xl font-bold leading-tight text-[#183b2d] sm:text-5xl">Belajar lewat permainan.</h1><p className="mt-4 text-base leading-7 text-[#3d4038]">Pilih game singkat untuk melatih kosakata, membaca, dan menyusun kalimat. Bisa dimainkan sendiri atau bersama teman sekelas.</p></header>
    <section aria-label="Cari dan saring game" className="mt-8 grid gap-3 border-y border-[#d2c5ad] py-4 md:grid-cols-[minmax(14rem,1fr)_11rem_13rem_10rem]"><label className="relative"><span className="sr-only">Cari game atau topik</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#625f54]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari game atau topik" className="min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] pl-10 pr-3 text-sm placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label><label className="text-xs font-bold text-[#3d4038]">Level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="all">Semua level</option>{["A1", "A2", "B1", "B2"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-bold text-[#3d4038]">Jenis latihan<select value={template} onChange={(event) => setTemplate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="all">Semua jenis</option>{GAME_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-bold text-[#3d4038]">Urutkan<select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm"><option value="recent">Terbaru</option><option value="popular">Terpopuler</option><option value="az">A–Z</option></select></label></section>
    <div className="mt-5 flex items-center justify-between"><p className="text-sm font-bold text-[#3d4038]">{loading ? "Memuat game…" : `${filtered.length} game`}</p><Link href="/game" className="text-sm font-bold text-[#244b3a] underline underline-offset-4">Gabung game kelas</Link></div>
    {error && <p role="alert" className="mt-5 rounded-lg border border-[#943520]/30 bg-[#fdf9f0] p-4 text-sm text-[#943520]">{error}</p>}
    {!loading && !error && filtered.length === 0 && <div className="mt-8 border-y border-[#d2c5ad] py-10 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-[#244b3a]" /><h2 className="mt-3 text-xl font-bold text-[#183b2d]">Belum ada game yang cocok</h2><p className="mt-2 text-sm text-[#625f54]">Coba ubah kata pencarian atau filter level.</p></div>}
    <div className="mt-5 divide-y divide-[#d2c5ad]">{filtered.map((game) => {
      const selectedTemplate = GAME_TEMPLATES.find((item) => item.id === game.template);
      return <article key={game.id} className="grid gap-4 py-5 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-6"><div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#d2c5ad] bg-[#fdf9f0]">{game.coverImage ? <Image src={game.coverImage} alt="" fill sizes="(max-width: 639px) 100vw, 160px" className="object-cover" /> : selectedTemplate && <Image src={selectedTemplate.image} alt="" fill sizes="160px" className="object-contain p-4" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#244b3a]"><span className="rounded-md bg-[#e6eadf] px-2.5 py-1">{game.level}</span><span>{selectedTemplate?.title}</span><span aria-hidden="true">·</span><span>{game.items.length} aktivitas</span></div><h2 className="mt-2 text-xl font-bold text-[#183b2d]">{game.title}</h2><p className="mt-1 text-sm text-[#3d4038]">{game.topic}</p><p className="mt-2 text-xs text-[#625f54]">Dimainkan {(game.plays || 0).toLocaleString("id-ID")} kali</p></div><Link href={`/games/${encodeURIComponent(game.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white hover:bg-[#943520] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244b3a]">Mainkan<ArrowRight className="h-4 w-4" /></Link></article>;
    })}</div>
  </div></main>;
}
