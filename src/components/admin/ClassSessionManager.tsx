"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Clipboard, Download, Loader2, Plus, QrCode, X, Maximize2, MessageCircle } from "lucide-react";
import QRCode from "qrcode";
import { classSessionJoinUrl, type StoredClassSession } from "@/lib/class-session";
import type { ClassItem } from "@/lib/types";

type AttendanceRow = { id: string; participant_name: string; participant_type: string; attended_at: string };
type GuestRow = { id: string; full_name: string; whatsapp: string; status: string; registered_at: string };
type SessionDetail = StoredClassSession & { classTitle: string; classSlug?: string | null; attendeeCount: number; pendingCount: number };
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const dateInputValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const formatSessionDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);

export default function ClassSessionManager({ initialClassId }: { initialClassId?: string }) {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [detail, setDetail] = useState<{ attendees: AttendanceRow[]; guests: GuestRow[] } | null>(null);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("14:30");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sessionTab, setSessionTab] = useState<"upcoming" | "ongoing" | "done">("upcoming");
  const [qrFullscreen, setQrFullscreen] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionResponse, classResponse] = await Promise.all([fetch("/api/class-sessions", { cache: "no-store" }), fetch("/api/class-sessions/classes", { cache: "no-store" })]);
      const [sessionData, classData] = await Promise.all([sessionResponse.json().catch(() => ({})), classResponse.json().catch(() => ({}))]);
      if (!sessionResponse.ok) throw new Error(sessionData.error || "Sesi belum dapat dimuat.");
      if (!classResponse.ok) throw new Error(classData.error || "Daftar kelas terbit belum dapat dimuat. Coba muat ulang.");
      const publishedClasses: ClassItem[] = Array.isArray(classData.classes)
        ? classData.classes.filter((item: ClassItem) => item.isPublished && item.status !== "draft")
        : [];
      setSessions(Array.isArray(sessionData.sessions) ? sessionData.sessions : []);
      setClasses(publishedClasses);
      if (initialClassId && publishedClasses.some((item) => item.id === initialClassId)) setClassId(initialClassId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sesi belum dapat dimuat."); }
    finally { setLoading(false); }
  }, [initialClassId]);
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

  useEffect(() => {
    if (!selected) return;
    const id = selected.id;
    const timer = window.setInterval(async () => {
      const [detailResponse, sessionsResponse] = await Promise.all([
        fetch(`/api/class-sessions/${id}`, { cache: "no-store" }),
        fetch("/api/class-sessions", { cache: "no-store" }),
      ]);
      if (detailResponse.ok) {
        const data = await detailResponse.json();
        setDetail({ attendees: data.attendees || [], guests: data.guests || [] });
      }
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const startsAt = startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null;
      if (startsAt && new Date(startsAt).getTime() <= Date.now()) throw new Error("Waktu sesi sudah lewat. Pilih tanggal dan jam yang akan datang.");
      const response = await fetch("/api/class-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, classId, startsAt, requireApproval }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sesi belum dapat dibuat.");
      setTitle(""); setStartDate("");
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

  const copySessionCode = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  const categorizedSessions = sessions.filter((session) => {
    if (sessionTab === "done") return session.status === "closed";
    if (session.status !== "open") return false;
    const future = Boolean(session.startsAt && new Date(session.startsAt).getTime() > Date.now());
    return sessionTab === "upcoming" ? future : !future;
  });

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat sesi kelas…</div>;
  return <div className="space-y-8 text-[#20251f]">
    <header className="max-w-3xl"><h1 className="text-2xl font-extrabold text-[#183b2d]">Sesi kelas tatap muka</h1><p className="mt-2 text-sm leading-6 text-[#3d4038]">Pertemuan langsung yang presensinya dicatat lewat kode atau QR sesi.</p><details className="mt-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4"><summary className="cursor-pointer font-bold text-[#244b3a]">Apa itu sesi tatap muka? · Lihat contoh langkah</summary><p className="mt-2 text-sm leading-6 text-[#3d4038]">Pengurus membuat sesi untuk kelas, membagikan kode atau QR, lalu peserta memindai atau memasukkan kode untuk presensi. Pengurus dapat memantau kehadiran dan persetujuan tamu di halaman ini.</p></details></header>
    <ol aria-label="Langkah mengelola sesi" className="grid gap-2 sm:grid-cols-4">{["Pilih kelas", "Atur jadwal", "Bagikan kode/QR", "Pantau kehadiran"].map((label, index) => <li key={label} className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 text-sm font-bold ${index === (selected ? 2 : 0) ? "border-[#244b3a] bg-[#e6eadf] text-[#183b2d]" : "border-[#d2c5ad] bg-[#fdf9f0] text-[#625f54]"}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-white">{selected && index < 2 ? "✓" : index + 1}</span>{label}</li>)}</ol>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]"><p>{error}</p><button type="button" onClick={() => void loadSessions()} className="inline-flex min-h-11 items-center rounded-lg border border-[#943520]/30 bg-white px-3 font-bold text-[#943520]">Muat ulang</button></div>}
    <div className="grid gap-8 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={createSession} className="space-y-4 border-y border-[#d2c5ad] py-5"><h2 className="text-lg font-bold text-[#183b2d]">Buat sesi baru</h2><label className="block text-sm font-bold">Pilih kelas<select required value={classId} onChange={(event) => setClassId(event.target.value)} className={inputClass}><option value="">Pilih kelas terbit</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block text-sm font-bold">Nama/judul pertemuan<input required minLength={3} maxLength={100} className={inputClass} placeholder="Contoh: Percakapan sehari-hari" value={title} onChange={(event) => setTitle(event.target.value)} /></label><fieldset className="grid gap-3 sm:grid-cols-2"><legend className="text-sm font-bold">Tanggal dan jam</legend><div className="relative text-sm font-semibold"><span className="block">Tanggal</span><button type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)} className="mt-1.5 inline-flex min-h-11 w-full items-center rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-left">{startDate ? formatSessionDate(new Date(`${startDate}T12:00:00`)) : "Pilih tanggal"}</button>{calendarOpen && <div className="absolute left-0 top-full z-20 mt-2 rounded-lg border border-[#b8aa8e] bg-white p-3 shadow-lg"><input autoFocus type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setCalendarOpen(false); }} className="min-h-11 rounded-md border border-[#b8aa8e] p-2" /><button type="button" onClick={() => setCalendarOpen(false)} className="mt-2 min-h-11 w-full rounded-md border border-[#b8aa8e]">Tutup kalender</button></div>}<span className="mt-2 flex gap-2"><button type="button" onClick={() => setStartDate(dateInputValue(new Date()))} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Hari ini</button><button type="button" onClick={() => { const date = new Date(); date.setDate(date.getDate() + 1); setStartDate(dateInputValue(date)); }} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Besok</button></span></div><label className="text-sm font-semibold">Jam<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /><span className="mt-2 flex flex-wrap gap-2">{["08:00", "13:00", "19:00"].map((time) => <button key={time} type="button" onClick={() => setStartTime(time)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">{time.replace(":", ".")}</button>)}</span></label></fieldset>{startDate && <p className="rounded-lg bg-[#e6eadf] p-3 text-sm text-[#183b2d]">Jadwal: {`${formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul ${startTime.replace(":", ".")}`}</p>}<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} className="h-4 w-4 accent-[#244b3a]" /><span>Minta persetujuan sebelum tamu masuk<span className="block text-xs font-normal text-[#625f54]">Tamu menunggu pengurus menyetujui sebelum presensinya dicatat.</span></span></label><button disabled={saving || !classes.length} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Membuat sesi…" : "Buat sesi dan kode"}</button>{!classes.length && !error && <div className="rounded-lg bg-[#f3e9d5] p-4 text-sm text-[#3d4038]"><p>Belum ada kelas terbit. Terbitkan kelas terlebih dahulu agar kelas bisa dipilih.</p><Link href="/admin?tab=classes" className="mt-2 inline-flex min-h-11 items-center font-bold text-[#244b3a] underline underline-offset-4">Buka pengelolaan kelas</Link></div>}</form>
      <section><div className="flex items-end justify-between gap-3 border-b border-[#d2c5ad] pb-3"><div><h2 className="text-lg font-bold text-[#183b2d]">Sesi yang dibuat</h2><p className="mt-1 text-sm text-[#625f54]">{sessions.length} sesi</p></div></div><div role="tablist" aria-label="Status sesi" className="mt-3 flex flex-wrap gap-2">{([["upcoming", "Akan datang"], ["ongoing", "Sedang berlangsung"], ["done", "Selesai"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={sessionTab === value} onClick={() => setSessionTab(value)} className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${sessionTab === value ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a]"}`}>{label}</button>)}</div>{categorizedSessions.length ? <div className="divide-y divide-[#d2c5ad]">{categorizedSessions.map((session) => <button key={session.id} type="button" onClick={() => void loadDetail(session)} aria-pressed={selected?.id === session.id} className={`grid min-h-20 w-full grid-cols-[1fr_auto] items-center gap-3 py-4 text-left ${selected?.id === session.id ? "text-[#183b2d]" : "text-[#20251f]"}`}><span><strong className="block">{session.title}</strong><span className="mt-1 block text-sm text-[#625f54]">{session.classTitle} · {session.startsAt ? new Date(session.startsAt).toLocaleString("id-ID") : "Waktu belum ditentukan"} · {session.attendeeCount} hadir{session.pendingCount ? ` · ${session.pendingCount} menunggu` : ""}</span><span className="mt-1 block text-xs font-bold tracking-wider">Kode {session.code}</span></span><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${session.status === "open" ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#e9ddc6] text-[#625f54]"}`}>{session.status === "open" ? sessionTab === "upcoming" ? "Akan datang" : "Berlangsung" : "Selesai"}</span></button>)}</div> : <div className="py-6 text-sm text-[#625f54]"><p>Belum ada sesi di bagian {sessionTab === "upcoming" ? "akan datang" : sessionTab === "ongoing" ? "sedang berlangsung" : "selesai"}.</p>{sessionTab === "upcoming" && <p className="mt-1">Pilih kelas dan buat sesi baru untuk memulai.</p>}</div>}</section>
    </div>
    {selected && <section className="grid gap-6 border-t border-[#d2c5ad] pt-6 xl:grid-cols-[22rem_minmax(0,1fr)]"><aside className="space-y-4 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-5"><div><h2 className="text-xl font-bold text-[#183b2d]">{selected.title}</h2><p className="mt-2 text-sm text-[#625f54]">Kode sesi</p><p className="mt-1 font-display text-6xl font-bold tracking-[.15em] text-[#244b3a]">{selected.code}</p><p className="mt-2 text-sm font-bold text-[#183b2d]">{selected.attendeeCount} peserta hadir</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyJoinLink()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Clipboard className="h-4 w-4" />{copied ? "Tersalin" : "Salin tautan"}</button><button type="button" onClick={() => void copySessionCode()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Salin kode</button><a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Gabung sesi ${selected.title}: ${classSessionJoinUrl(typeof window !== "undefined" ? window.location.origin : "", selected.code)}`)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Bagikan lewat WhatsApp</a><a href={`/api/class-sessions/${selected.id}/export`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Download className="h-4 w-4" />Ekspor CSV</a>{selected.status === "open" && <button type="button" onClick={() => { if (window.confirm("Tutup sesi ini? Peserta baru tidak dapat lagi mencatat kehadiran.")) void sessionAction("close"); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#943520] px-3 text-sm font-bold text-white">Tutup sesi<X className="h-4 w-4" /></button>}</div>{qr ? <div className="w-fit rounded-lg border border-[#d2c5ad] bg-white p-3"><Image src={qr} alt={`QR code sesi ${selected.code}`} width={280} height={280} unoptimized /><p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#244b3a]"><QrCode className="h-4 w-4" />Pindai untuk presensi</p><button type="button" onClick={() => setQrFullscreen(true)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#b8aa8e] font-bold text-[#244b3a]"><Maximize2 className="h-4 w-4" />Layar penuh</button></div> : <p className="text-sm text-[#625f54]">Menyiapkan kode QR…</p>}</aside>
      <div className="space-y-6"><section><h3 className="border-b border-[#d2c5ad] pb-3 font-bold text-[#183b2d]">Daftar hadir <span className="text-[#625f54]">({detail?.attendees.length || 0})</span></h3>{detail?.attendees.length ? <div className="divide-y divide-[#d2c5ad]">{detail.attendees.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-bold">{row.participant_name}</span><span className="text-[#625f54]">{row.participant_type === "guest" ? "Tamu" : "Warga"} · {new Date(row.attended_at).toLocaleString("id-ID")}</span></div>)}</div> : <p className="py-4 text-sm text-[#625f54]">Presensi peserta akan muncul di sini.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-3 font-bold text-[#183b2d]">Pendaftaran tamu menunggu persetujuan</h3>{detail?.guests.filter((guest) => guest.status === "pending").length ? <div className="divide-y divide-[#d2c5ad]">{detail.guests.filter((guest) => guest.status === "pending").map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-bold">{guest.full_name}</p><p className="mt-1 text-sm text-[#625f54]">{guest.whatsapp}</p></div><div className="flex gap-2"><button type="button" onClick={() => void sessionAction("approve", guest.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white"><Check className="h-4 w-4" />Setujui</button><button type="button" onClick={() => void sessionAction("reject", guest.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#943520] px-3 text-sm font-bold text-[#943520]"><X className="h-4 w-4" />Tolak</button></div></div>)}</div> : <p className="py-4 text-sm text-[#625f54]">Tidak ada pendaftaran yang menunggu persetujuan.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-2 font-bold text-[#183b2d]">Kelas induk</h3>{classes.find((item) => item.id === selected.classId) ? <a href={`/kelas/${classes.find((item) => item.id === selected.classId)?.slug}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-[#244b3a] underline">Buka {classes.find((item) => item.id === selected.classId)?.title}</a> : <p className="mt-2 text-sm text-[#625f54]">Kelas induk belum dipetakan.</p>}</section></div>
    </section>}
    {qrFullscreen && qr && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-[#fdf9f0] p-5"><section role="dialog" aria-modal="true" aria-label={`QR sesi ${selected?.code}`} className="grid h-full w-full place-content-center text-center"><p className="font-display text-5xl font-bold tracking-[.15em] text-[#183b2d]">{selected?.code}</p><Image src={qr} alt={`QR code sesi ${selected?.code}`} width={560} height={560} unoptimized className="mx-auto mt-5 h-auto w-[min(70vw,70vh)]" /><p className="mt-4 text-xl font-bold text-[#244b3a]">Pindai untuk mencatat kehadiran</p><button type="button" onClick={() => setQrFullscreen(false)} className="mx-auto mt-6 inline-flex min-h-12 items-center rounded-lg border border-[#b8aa8e] px-5 font-bold text-[#244b3a]">Tutup layar penuh</button></section></div>}
  </div>;
}
