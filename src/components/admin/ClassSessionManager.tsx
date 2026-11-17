"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Clipboard, Download, Loader2, Plus, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { classSessionJoinUrl, type StoredClassSession } from "@/lib/class-session";
import type { GameBlueprint } from "@/lib/game-blueprint";

type AttendanceRow = { id: string; participant_name: string; participant_type: string; attended_at: string };
type GuestRow = { id: string; full_name: string; whatsapp: string; status: string; registered_at: string };
type SessionDetail = StoredClassSession & { attendeeCount: number; pendingCount: number };
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";

export default function ClassSessionManager() {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [games, setGames] = useState<GameBlueprint[]>([]);
  const [detail, setDetail] = useState<{ attendees: AttendanceRow[]; guests: GuestRow[] } | null>(null);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [materialLinks, setMaterialLinks] = useState("");
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionResponse, gameResponse] = await Promise.all([fetch("/api/class-sessions", { cache: "no-store" }), fetch("/api/games", { cache: "no-store" })]);
      const sessionData = await sessionResponse.json(); const gameData = await gameResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionData.error || "Sesi belum dapat dimuat.");
      setSessions(sessionData.sessions || []); setGames(gameData.games || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sesi belum dapat dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!selected) { setQr(""); return; }
    const url = classSessionJoinUrl(window.location.origin, selected.code);
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 240, color: { dark: "#183b2d", light: "#fdf9f0" } }).then(setQr).catch(() => setQr(""));
  }, [selected]);

  const loadDetail = async (session: SessionDetail) => {
    setSelected(session); setError("");
    try {
      const response = await fetch(`/api/class-sessions/${session.id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Daftar peserta belum dapat dimuat.");
      setDetail({ attendees: data.attendees || [], guests: data.guests || [] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Daftar peserta belum dapat dimuat."); }
  };

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/class-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, requireApproval, capacity: capacity || null, materialLinks: materialLinks.split(/\r?\n/).map((link) => link.trim()).filter(Boolean), gameIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sesi belum dapat dibuat.");
      setTitle(""); setCapacity(""); setMaterialLinks(""); setGameIds([]);
      await loadSessions();
      const session = { ...data.session, attendeeCount: 0, pendingCount: 0 } as SessionDetail;
      setSelected(session); setDetail({ attendees: [], guests: [] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sesi belum dapat dibuat."); }
    finally { setSaving(false); }
  };

  const sessionAction = async (action: string, registrationId?: string) => {
    if (!selected) return;
    const response = await fetch(`/api/class-sessions/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, registrationId }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Perubahan belum tersimpan."); return; }
    await loadSessions(); await loadDetail(selected);
  };

  const copyJoinLink = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(classSessionJoinUrl(window.location.origin, selected.code));
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat sesi kelas…</div>;
  return <div className="space-y-8 text-[#20251f]">
    <header className="max-w-3xl"><h1 className="text-2xl font-extrabold text-[#183b2d]">Sesi kelas tatap muka</h1><p className="mt-2 text-sm leading-6 text-[#3d4038]">Buat sesi, bagikan kode atau QR kepada peserta, lalu pantau presensi dan materi kelas.</p></header>
    {error && <p role="alert" className="rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]">{error}</p>}
    <div className="grid gap-8 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={createSession} className="space-y-4 border-y border-[#d2c5ad] py-5"><h2 className="text-lg font-bold text-[#183b2d]">Buat sesi baru</h2><label className="block text-sm font-bold">Nama kelas atau sesi<input required minLength={3} maxLength={100} className={inputClass} placeholder="Contoh: English Conversation · Selasa" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block text-sm font-bold">Kuota peserta <span className="font-normal text-[#625f54]">(opsional)</span><input type="number" min={1} max={500} className={inputClass} placeholder="Kosongkan untuk tanpa batas" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} className="h-4 w-4 accent-[#244b3a]" />Persetujuan tutor sebelum peserta masuk</label><label className="block text-sm font-bold">Tautan materi <span className="font-normal text-[#625f54]">(satu tautan per baris)</span><textarea className={`${inputClass} min-h-24`} placeholder="https://…" value={materialLinks} onChange={(event) => setMaterialLinks(event.target.value)} /></label><fieldset><legend className="text-sm font-bold">Game untuk sesi ini <span className="font-normal text-[#625f54]">(opsional)</span></legend><div className="mt-2 max-h-44 space-y-1 overflow-auto border-y border-[#d2c5ad] py-2">{games.length ? games.map((game) => <label key={game.id} className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" checked={gameIds.includes(game.id)} onChange={(event) => setGameIds((current) => event.target.checked ? [...current, game.id] : current.filter((id) => id !== game.id))} className="h-4 w-4 accent-[#244b3a]" />{game.title}</label>) : <p className="py-2 text-sm text-[#625f54]">Belum ada game terbit.</p>}</div></fieldset><button disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Membuat sesi…" : "Buat sesi dan kode"}</button></form>
      <section><div className="flex items-end justify-between gap-3 border-b border-[#d2c5ad] pb-3"><div><h2 className="text-lg font-bold text-[#183b2d]">Sesi yang dibuat</h2><p className="mt-1 text-sm text-[#625f54]">{sessions.length} sesi</p></div></div>{sessions.length ? <div className="divide-y divide-[#d2c5ad]">{sessions.map((session) => <button key={session.id} type="button" onClick={() => void loadDetail(session)} aria-pressed={selected?.id === session.id} className={`grid min-h-20 w-full grid-cols-[1fr_auto] items-center gap-3 py-4 text-left ${selected?.id === session.id ? "text-[#183b2d]" : "text-[#20251f]"}`}><span><strong className="block">{session.title}</strong><span className="mt-1 block text-sm text-[#625f54]">Kode {session.code} · {session.attendeeCount} hadir{session.pendingCount ? ` · ${session.pendingCount} menunggu` : ""}</span></span><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${session.status === "open" ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#e9ddc6] text-[#625f54]"}`}>{session.status === "open" ? "Terbuka" : "Ditutup"}</span></button>)}</div> : <p className="py-6 text-sm text-[#625f54]">Belum ada sesi. Buat sesi pertama untuk mulai mencatat presensi.</p>}</section>
    </div>
    {selected && <section className="grid gap-6 border-t border-[#d2c5ad] pt-6 xl:grid-cols-[16rem_minmax(0,1fr)]"><aside className="space-y-4"><div><h2 className="text-xl font-bold text-[#183b2d]">{selected.title}</h2><p className="mt-1 text-sm text-[#625f54]">Kode kelas</p><p className="mt-1 font-display text-4xl font-bold tracking-[.12em] text-[#244b3a]">{selected.code}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyJoinLink()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Clipboard className="h-4 w-4" />{copied ? "Tersalin" : "Salin tautan"}</button><a href={`/api/class-sessions/${selected.id}/export`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Download className="h-4 w-4" />Ekspor CSV</a>{selected.status === "open" && <button type="button" onClick={() => void sessionAction("close")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white">Tutup sesi<X className="h-4 w-4" /></button>}</div>{qr ? <div className="w-fit rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-3"><Image src={qr} alt={`QR code sesi ${selected.code}`} width={180} height={180} unoptimized /><p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#244b3a]"><QrCode className="h-4 w-4" />Pindai untuk presensi</p></div> : <p className="text-sm text-[#625f54]">Menyiapkan kode QR…</p>}</aside>
      <div className="space-y-6"><section><h3 className="border-b border-[#d2c5ad] pb-3 font-bold text-[#183b2d]">Daftar hadir <span className="text-[#625f54]">({detail?.attendees.length || 0})</span></h3>{detail?.attendees.length ? <div className="divide-y divide-[#d2c5ad]">{detail.attendees.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-bold">{row.participant_name}</span><span className="text-[#625f54]">{row.participant_type === "guest" ? "Tamu" : "Warga"} · {new Date(row.attended_at).toLocaleString("id-ID")}</span></div>)}</div> : <p className="py-4 text-sm text-[#625f54]">Presensi peserta akan muncul di sini.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-3 font-bold text-[#183b2d]">Pendaftaran tamu menunggu persetujuan</h3>{detail?.guests.filter((guest) => guest.status === "pending").length ? <div className="divide-y divide-[#d2c5ad]">{detail.guests.filter((guest) => guest.status === "pending").map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-bold">{guest.full_name}</p><p className="mt-1 text-sm text-[#625f54]">{guest.whatsapp}</p></div><button type="button" onClick={() => void sessionAction("approve", guest.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white"><Check className="h-4 w-4" />Setujui</button></div>)}</div> : <p className="py-4 text-sm text-[#625f54]">Tidak ada pendaftaran yang menunggu persetujuan.</p>}</section><section className="grid gap-4 sm:grid-cols-2"><div><h3 className="border-b border-[#d2c5ad] pb-2 font-bold text-[#183b2d]">Materi sesi</h3>{selected.materialLinks.length ? selected.materialLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm font-bold text-[#244b3a] underline">Materi<ArrowUpRight className="h-4 w-4 shrink-0" /></a>) : <p className="mt-2 text-sm text-[#625f54]">Belum ada tautan materi.</p>}</div><div><h3 className="border-b border-[#d2c5ad] pb-2 font-bold text-[#183b2d]">Game sesi</h3>{selected.gameIds.map((id) => { const game = games.find((item) => item.id === id); return game ? <a key={id} href={`/games/${encodeURIComponent(game.id)}`} className="mt-2 block text-sm font-bold text-[#244b3a] underline">{game.title}</a> : null; })}{!selected.gameIds.length && <p className="mt-2 text-sm text-[#625f54]">Belum ada game yang dipilih.</p>}</div></section></div>
    </section>}
  </div>;
}
