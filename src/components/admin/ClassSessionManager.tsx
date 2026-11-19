"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Clipboard, Download, Loader2, Plus, QrCode, X, Maximize2, MessageCircle } from "lucide-react";
import QRCode from "qrcode";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { classSessionJoinUrl, type StoredClassSession } from "@/lib/class-session";
import type { ClassItem } from "@/lib/types";

type AttendanceRow = { id: string; participant_name: string; participant_type: string; attended_at: string };
type GuestRow = { id: string; full_name: string; whatsapp: string; status: string; registered_at: string };
type SessionDetail = StoredClassSession & { classTitle: string; classSlug?: string | null; attendeeCount: number; pendingCount: number };
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const dateInputValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const formatSessionDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);

async function copyText(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard tidak tersedia");
}

export default function ClassSessionManager({ initialClassId }: { initialClassId?: string }) {
  const confirm = useConfirm();
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [detail, setDetail] = useState<{ attendees: AttendanceRow[]; guests: GuestRow[] } | null>(null);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("14:30");
  const [startsImmediately, setStartsImmediately] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"buat" | "aktif" | "riwayat">((searchParams.get("view") as "buat" | "aktif" | "riwayat") || "buat");
  const [createStep, setCreateStep] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true);
  const [historyQuery, setHistoryQuery] = useState("");
  const operationLock = useRef(false);
  const deletedSessionIds = useRef(new Set<string>());

  const changeView = (next: "buat" | "aktif" | "riwayat") => {
    setView(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "sessions"); params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  useEffect(() => {
    const requested = searchParams.get("view");
    if (requested === "buat" || requested === "aktif" || requested === "riwayat") setView(requested);
  }, [searchParams]);

  const loadSessions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [sessionResponse, classResponse] = await Promise.all([fetch("/api/class-sessions", { cache: "no-store" }), fetch("/api/class-sessions/classes", { cache: "no-store" })]);
      const [sessionData, classData] = await Promise.all([sessionResponse.json().catch(() => ({})), classResponse.json().catch(() => ({}))]);
      if (!sessionResponse.ok) throw new Error(sessionData.error || "Sesi belum dapat dimuat.");
      if (!classResponse.ok) throw new Error(classData.error || "Daftar kelas terbit belum dapat dimuat. Coba muat ulang.");
      const publishedClasses: ClassItem[] = Array.isArray(classData.classes)
        ? classData.classes.filter((item: ClassItem) => item.isPublished && item.status !== "draft")
        : [];
      setSessions(Array.isArray(sessionData.sessions) ? sessionData.sessions.filter((item: SessionDetail) => !deletedSessionIds.current.has(item.id)) : []);
      setClasses(publishedClasses);
      if (initialClassId && publishedClasses.some((item) => item.id === initialClassId)) setClassId(initialClassId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sesi belum dapat dimuat."); }
    finally { if (showLoading) setLoading(false); }
  }, [initialClassId]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    const timer = window.setInterval(async () => {
      const selectedId = selected?.id;
      const [sessionsResponse, detailResponse] = await Promise.all([
        fetch("/api/class-sessions", { cache: "no-store" }),
        selectedId ? fetch(`/api/class-sessions/${selectedId}`, { cache: "no-store" }) : Promise.resolve(null),
      ]);
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions.filter((item: SessionDetail) => !deletedSessionIds.current.has(item.id)) : []);
      }
      if (detailResponse?.ok) {
        const data = await detailResponse.json();
        setDetail({ attendees: data.attendees || [], guests: data.guests || [] });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const startsAt = startsImmediately ? null : startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null;
      if (startsAt && new Date(startsAt).getTime() <= Date.now()) throw new Error("Waktu sesi sudah lewat. Pilih tanggal dan jam yang akan datang.");
      const response = await fetch("/api/class-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, classId, startsAt, requireApproval }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sesi belum dapat dibuat.");
      setTitle(""); setStartDate(""); setStartsImmediately(false);
      await loadSessions();
      const session = { ...data.session, attendeeCount: 0, pendingCount: 0 } as SessionDetail;
      setSelected(session); setDetail({ attendees: [], guests: [] });
      setCreateStep(0);
      changeView("aktif");
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

  const closeSelectedSession = async () => {
    if (!selected || operationLock.current) return;
    const session = selected;
    operationLock.current = true;
    setBusyAction(session.id);
    try {
      await confirm({
        title: `Tutup sesi '${session.title}'?`,
        description: "Peserta tidak bisa lagi presensi. Data kehadiran tetap tersimpan.",
        confirmLabel: "Tutup sesi",
        cancelLabel: "Batal",
        variant: "danger",
        onConfirm: async () => {
          let response: Response;
          try {
            response = await fetch(`/api/class-sessions/${session.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close" }) });
          } catch {
            throw new Error("Koneksi bermasalah. Periksa jaringan lalu coba tutup sesi lagi.");
          }
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Sesi belum berhasil ditutup.");
          setSelected((current) => current ? { ...current, status: "closed" } : current);
          await loadSessions(false);
          changeView("riwayat");
          setToast(`Sesi '${session.title}' selesai. Data kehadiran tetap tersimpan.`);
        },
      });
    } finally {
      operationLock.current = false;
      setBusyAction(null);
    }
  };

  const deleteHistoricalSession = async (session: SessionDetail) => {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusyAction(session.id);
    try {
      await confirm({
        title: "Hapus sesi ini?",
        description: "Sesi beserta semua data presensi dan pendaftaran tamu di dalamnya akan dihapus permanen. Ekspor CSV dulu jika perlu.",
        confirmLabel: "Hapus sesi",
        cancelLabel: "Batal",
        variant: "danger",
        secondaryAction: { label: "Ekspor CSV", href: `/api/class-sessions/${session.id}/export` },
        onConfirm: async () => {
          let response: Response;
          try {
            response = await fetch(`/api/class-sessions/${session.id}`, { method: "DELETE" });
          } catch {
            throw new Error("Koneksi bermasalah. Periksa jaringan lalu coba hapus sesi lagi.");
          }
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Sesi belum berhasil dihapus.");
          deletedSessionIds.current.add(session.id);
          setSessions((current) => current.filter((item) => item.id !== session.id));
          setSelected((current) => current?.id === session.id ? null : current);
          setDetail((current) => selected?.id === session.id ? null : current);
          setToast(`Sesi '${session.title}' berhasil dihapus.`);
        },
      });
    } finally {
      operationLock.current = false;
      setBusyAction(null);
    }
  };

  const copyJoinLink = async () => {
    if (!selected) return;
    try {
      await copyText(classSessionJoinUrl(window.location.origin, selected.code));
      setCopied("link"); setToast("Tautan sesi tersalin."); window.setTimeout(() => setCopied(null), 2000);
    } catch { setError("Tautan belum dapat disalin. Pilih dan salin tautannya secara manual."); }
  };

  const copySessionCode = async () => {
    if (!selected) return;
    try {
      await copyText(selected.code);
      setCopied("code"); setToast("Kode sesi tersalin."); window.setTimeout(() => setCopied(null), 2000);
    } catch { setError("Kode belum dapat disalin. Pilih dan salin kodenya secara manual."); }
  };
  const activeSessions = useMemo(() => sessions.filter((session) => session.status === "open"), [sessions]);
  const historySessions = useMemo(() => sessions.filter((session) => session.status === "closed" && `${session.title} ${session.classTitle} ${session.code}`.toLocaleLowerCase().includes(historyQuery.toLocaleLowerCase())), [sessions, historyQuery]);

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat sesi kelas…</div>;
  const tabs = [["buat", "Buat sesi"], ["aktif", "Sesi aktif"], ["riwayat", "Riwayat"]] as const;
  const updateDraft = (next: "buat" | "aktif" | "riwayat") => changeView(next);
  const stages = ["Pilih kelas", "Atur jadwal", "Persetujuan", "Buat sesi"];
  const ongoing = activeSessions.filter((session) => !session.startsAt || new Date(session.startsAt).getTime() <= Date.now());
  const upcoming = activeSessions.filter((session) => session.startsAt && new Date(session.startsAt).getTime() > Date.now());
  return <div className="w-full space-y-6 px-1 text-[#20251f] sm:px-2">
    <nav role="tablist" aria-label="Halaman sesi tatap muka" className="flex max-w-full gap-2 overflow-x-auto border-b border-[#d2c5ad] pb-2">
      {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => updateDraft(value)} className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold ${view === value ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a] hover:bg-[#e6eadf]"}`}>{label}</button>)}
    </nav>
    {toast && <div role="status" className="fixed right-4 top-20 z-[110] max-w-[calc(100vw-2rem)] rounded-xl border border-[#244b3a]/20 bg-[#e6eadf] px-4 py-3 text-sm font-bold text-[#183b2d] shadow-lg sm:right-6">{toast}</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]"><p>{error}</p><button type="button" onClick={() => void loadSessions()} className="inline-flex min-h-11 items-center rounded-lg border border-[#943520]/30 bg-white px-3 font-bold text-[#943520]">Muat ulang</button></div>}

    {view === "buat" && <section className="mx-auto w-full max-w-5xl space-y-5">
      {showExplanation && <aside className="relative w-full rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 pr-14 sm:p-5"><button type="button" onClick={() => setShowExplanation(false)} aria-label="Tutup penjelasan" className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#244b3a] hover:bg-[#e6eadf]"><X className="h-4 w-4" /></button><h2 className="font-bold text-[#183b2d]">Apa itu sesi tatap muka?</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-[#3d4038]">Buat pertemuan langsung, bagikan kode atau QR kepada peserta, lalu pantau presensi dan persetujuan tamu.</p></aside>}
      <ol aria-label="Langkah membuat sesi" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{stages.map((label, index) => <li key={label}><button type="button" aria-current={createStep === index ? "step" : undefined} onClick={() => { setError(""); setCreateStep(index); }} className={`flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 text-left text-sm font-bold transition-colors hover:border-[#244b3a] ${createStep === index ? "border-[#244b3a] bg-[#e6eadf] text-[#183b2d]" : createStep > index ? "border-[#b8aa8e] bg-white text-[#244b3a]" : "border-[#d2c5ad] bg-[#fdf9f0] text-[#625f54]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white">{createStep > index ? "✓" : index + 1}</span>{label}</button></li>)}</ol>
      <form onSubmit={createSession} className="w-full space-y-5 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 sm:p-6">
        {createStep === 0 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Pilih kelas dan beri judul</h2><label className="block text-sm font-bold">Pilih kelas<select required value={classId} onChange={(event) => setClassId(event.target.value)} className={inputClass}><option value="">Pilih kelas terbit</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block text-sm font-bold">Nama/judul pertemuan<input required minLength={3} maxLength={100} className={inputClass} placeholder="Contoh: Percakapan sehari-hari" value={title} onChange={(event) => setTitle(event.target.value)} /></label></div>}
        {createStep === 1 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Atur jadwal</h2><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => { setStartsImmediately(true); setStartDate(""); }} aria-pressed={startsImmediately} className={`min-h-11 rounded-lg border px-4 text-sm font-bold ${startsImmediately ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] text-[#244b3a]"}`}>Buka Sekarang</button>{startsImmediately && <button type="button" onClick={() => setStartsImmediately(false)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]">Atur jadwal</button>}</div>{startsImmediately ? <p className="rounded-lg bg-[#e6eadf] p-3 text-sm text-[#183b2d]">Sesi langsung dibuka setelah dibuat.</p> : <><fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-2 text-sm font-bold">Tanggal dan jam</legend><div className="relative text-sm font-semibold"><span className="block">Tanggal</span><button type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)} className="mt-1.5 inline-flex min-h-11 w-full items-center rounded-lg border border-[#b8aa8e] bg-white px-3 text-left">{startDate ? formatSessionDate(new Date(`${startDate}T12:00:00`)) : "Pilih tanggal"}</button>{calendarOpen && <div className="absolute left-0 top-full z-20 mt-2 rounded-lg border border-[#b8aa8e] bg-white p-3 shadow-lg"><input autoFocus type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setCalendarOpen(false); }} className="min-h-11 rounded-md border border-[#b8aa8e] p-2" /><button type="button" onClick={() => setCalendarOpen(false)} className="mt-2 min-h-11 w-full rounded-md border border-[#b8aa8e]">Tutup kalender</button></div>}<span className="mt-2 flex gap-2"><button type="button" onClick={() => setStartDate(dateInputValue(new Date()))} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Hari ini</button><button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setStartDate(dateInputValue(d)); }} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Besok</button></span></div><label className="text-sm font-semibold">Jam (HH:mm)<input type="time" step={60} value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /><span className="mt-2 flex flex-wrap gap-2">{["08:00", "13:00", "19:00"].map((time) => <button key={time} type="button" onClick={() => setStartTime(time)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">{time.replace(":", ".")}</button>)}</span></label></fieldset>{startDate && <p className="rounded-lg bg-[#e6eadf] p-3 text-sm text-[#183b2d]">Jadwal: {formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul {startTime.replace(":", ".")}</p>}</>}</div>}
        {createStep === 2 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Pengaturan peserta</h2><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} className="h-4 w-4 accent-[#244b3a]" /><span>Minta persetujuan sebelum tamu masuk<span className="block text-xs font-normal text-[#625f54]">Tamu menunggu pengurus menyetujui sebelum presensinya dicatat.</span></span></label><p className="rounded-lg bg-[#e6eadf] p-4 text-sm text-[#183b2d]">Kelas: <strong>{classes.find((item) => item.id === classId)?.title || "Belum dipilih"}</strong><br />Pertemuan: <strong>{title || "Belum diberi judul"}</strong><br />Jadwal: <strong>{startsImmediately ? "Dibuka segera setelah dibuat" : startDate ? `${formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul ${startTime.replace(":", ".")}` : "Waktu belum ditentukan"}</strong></p></div>}
        {createStep === 3 && <div className="space-y-3"><h2 className="text-xl font-bold text-[#183b2d]">Buat sesi dan bagikan kode</h2><p className="text-sm leading-6 text-[#3d4038]">Setelah sesi dibuat, kode dan QR akan muncul di tab Sesi aktif. Peserta dapat menggunakannya untuk mencatat kehadiran.</p><button type="submit" disabled={saving || !classes.length} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Membuat sesi…" : "Buat sesi dan kode"}</button></div>}
        {createStep < 3 && <div className="flex justify-between border-t border-[#d2c5ad] pt-4"><button type="button" disabled={createStep === 0} onClick={() => setCreateStep((step) => Math.max(0, step - 1))} className="min-h-11 rounded-lg border border-[#b8aa8e] px-4 font-bold text-[#244b3a] disabled:opacity-40">Kembali</button><button type="button" onClick={() => { if (createStep === 0 && (!classId || title.trim().length < 3)) { setError("Pilih kelas dan isi judul pertemuan minimal 3 karakter."); return; } if (createStep === 1 && !startsImmediately && !startDate) { setError("Pilih tanggal dan jam sesi, atau pilih Buka Sekarang."); return; } setError(""); setCreateStep((step) => Math.min(3, step + 1)); }} className="min-h-11 rounded-lg bg-[#244b3a] px-5 font-bold text-white">Lanjutkan</button></div>}
        {!classes.length && <div className="rounded-lg bg-[#f3e9d5] p-4 text-sm text-[#3d4038]">Belum ada kelas terbit. Terbitkan kelas terlebih dahulu agar kelas bisa dipilih. <Link href="/admin?tab=classes" className="font-bold text-[#244b3a] underline">Buka pengelolaan kelas</Link></div>}
      </form>
    </section>}

    {view === "aktif" && <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)]">
      <section className="min-w-0"><h2 className="text-lg font-bold text-[#183b2d]">Sesi berlangsung dan akan datang</h2><p className="mt-1 text-sm text-[#625f54]">{activeSessions.length} sesi aktif</p>{activeSessions.length ? <div className="mt-3 space-y-2">{[...ongoing, ...upcoming].map((session) => <button key={session.id} type="button" onClick={() => void loadDetail(session)} aria-pressed={selected?.id === session.id} className={`w-full rounded-xl border p-4 text-left transition hover:border-[#244b3a] ${selected?.id === session.id ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-[#fdf9f0]"}`}><div className="flex items-start justify-between gap-2"><strong>{session.title}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${session.startsAt && new Date(session.startsAt).getTime() > Date.now() ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{session.startsAt && new Date(session.startsAt).getTime() > Date.now() ? "Akan datang" : "Berlangsung"}</span></div><p className="mt-1 text-sm text-[#625f54]">{session.classTitle} · {session.attendeeCount} hadir</p>{session.pendingCount > 0 && <span className="mt-2 inline-flex rounded-full bg-[#ba472f] px-2.5 py-1 text-xs font-bold text-white">{session.pendingCount} menunggu persetujuan</span>}<p className="mt-2 text-xs font-bold tracking-wider">Kode {session.code}</p></button>)}</div> : <div className="mt-4 rounded-xl bg-[#fdf9f0] p-5 text-sm"><p className="font-bold text-[#183b2d]">Belum ada sesi aktif.</p><p className="mt-1 text-[#625f54]">Buat sesi baru untuk membagikan kode presensi.</p><button type="button" onClick={() => updateDraft("buat")} className="mt-3 min-h-11 rounded-lg bg-[#244b3a] px-4 font-bold text-white">Buat sesi</button></div>}</section>
      {selected ? <section className="min-w-0 space-y-5 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#183b2d]">{selected.title}</h2><p className="mt-2 text-sm text-[#625f54]">Kode sesi</p><p className="font-display text-5xl font-bold tracking-[.12em] text-[#244b3a] sm:text-6xl">{selected.code}</p><p className="mt-2 text-sm font-bold">{selected.attendeeCount} peserta hadir</p></div>{qr && <div className="rounded-lg border border-[#d2c5ad] bg-white p-2"><Image src={qr} alt={`QR code sesi ${selected.code}`} width={150} height={150} unoptimized /><button type="button" onClick={() => setQrFullscreen(true)} className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#b8aa8e] text-sm font-bold text-[#244b3a]"><Maximize2 className="h-4 w-4" />Layar penuh</button></div>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyJoinLink()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold">{copied === "link" ? <><Check aria-hidden="true" className="h-4 w-4" />Tersalin</> : <><Clipboard aria-hidden="true" className="h-4 w-4" />Salin tautan</>}</button><button type="button" onClick={() => void copySessionCode()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold">{copied === "code" ? <><Check aria-hidden="true" className="h-4 w-4" />Tersalin</> : <><Clipboard aria-hidden="true" className="h-4 w-4" />Salin kode</>}</button><a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Gabung sesi ${selected.title}: ${classSessionJoinUrl(window.location.origin, selected.code)}`)}`} className="inline-flex min-h-11 items-center rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white"><MessageCircle className="mr-2 h-4 w-4" />Bagikan WhatsApp</a><a href={`/api/class-sessions/${selected.id}/export`} className="inline-flex min-h-11 items-center rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold"><Download className="mr-2 h-4 w-4" />Ekspor CSV</a>{selected.status === "open" && <button type="button" disabled={busyAction === selected.id} onClick={() => void closeSelectedSession()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#943520] px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === selected.id && <Loader2 className="h-4 w-4 animate-spin" />}{busyAction === selected.id ? "Menutup…" : "Tutup sesi"}</button>}</div><section><h3 className="border-b border-[#d2c5ad] pb-2 font-bold">Daftar hadir ({detail?.attendees.length || 0})</h3>{detail?.attendees.length ? detail.attendees.map((row) => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-[#e6ddcd] py-3 text-sm"><strong>{row.participant_name}</strong><span className="text-[#625f54]">{row.participant_type === "guest" ? "Tamu" : "Warga"} · {new Date(row.attended_at).toLocaleString("id-ID")}</span></div>) : <p className="py-3 text-sm text-[#625f54]">Presensi peserta akan muncul di sini.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-2 font-bold">Antrean persetujuan tamu</h3>{detail?.guests.filter((g) => g.status === "pending").length ? detail.guests.filter((g) => g.status === "pending").map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ddcd] py-3"><div><strong>{guest.full_name}</strong><p className="text-sm text-[#625f54]">{guest.whatsapp}</p></div><div className="flex gap-2"><button type="button" onClick={() => void sessionAction("approve", guest.id)} className="min-h-11 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white">Setujui</button><button type="button" onClick={() => void sessionAction("reject", guest.id)} className="min-h-11 rounded-lg border border-[#943520] px-3 text-sm font-bold text-[#943520]">Tolak</button></div></div>) : <p className="py-3 text-sm text-[#625f54]">Tidak ada tamu yang menunggu persetujuan.</p>}</section></section> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#b8aa8e] bg-[#fdf9f0] p-6 text-center text-sm text-[#625f54]">Pilih sesi di daftar untuk melihat kode, QR, dan presensinya.</div>}
    </div>}

    {view === "riwayat" && <section className="w-full space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-[#183b2d]">Riwayat sesi</h2><p className="mt-1 text-sm text-[#625f54]">{historySessions.length} sesi selesai · {historySessions.reduce((sum, s) => sum + s.attendeeCount, 0)} total kehadiran</p></div><input aria-label="Cari riwayat sesi" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Cari judul, kelas, atau kode" className={`${inputClass} max-w-sm`} /></div>{historySessions.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{historySessions.map((session) => <article key={session.id} className="flex flex-col rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4"><h3 className="font-bold text-[#183b2d]">{session.title}</h3><p className="mt-1 text-sm text-[#625f54]">{session.classTitle}</p><p className="mt-3 text-sm">{session.attendeeCount} peserta hadir</p><p className="mt-1 text-xs text-[#625f54]">Kode {session.code}</p><div className="mt-3 flex flex-wrap gap-2 border-t border-[#e6ddcd] pt-3"><a href={`/api/class-sessions/${session.id}/export`} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-[#244b3a] underline underline-offset-4"><Download className="h-4 w-4" />Ekspor CSV</a><button type="button" disabled={busyAction === session.id} onClick={() => void deleteHistoricalSession(session)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#943520]/40 px-3 text-sm font-bold text-[#943520] hover:bg-[#ba472f]/5 disabled:cursor-wait disabled:opacity-60">{busyAction === session.id && <Loader2 className="h-4 w-4 animate-spin" />}Hapus</button></div></article>)}</div> : <div className="rounded-xl bg-[#fdf9f0] p-6 text-sm text-[#625f54]">{sessions.some((session) => session.status === "closed") ? "Tidak ada sesi riwayat yang cocok dengan pencarian ini." : "Riwayat sesi masih kosong. Sesi akan muncul di sini setelah ditutup."}</div>}</section>}
    {qrFullscreen && qr && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-[#fdf9f0] p-5"><section role="dialog" aria-modal="true" aria-label={`QR sesi ${selected?.code}`} className="grid h-full w-full place-content-center text-center"><p className="font-display text-5xl font-bold tracking-[.15em] text-[#183b2d]">{selected?.code}</p><Image src={qr} alt={`QR code sesi ${selected?.code}`} width={560} height={560} unoptimized className="mx-auto mt-5 h-auto w-[min(70vw,70vh)]" /><p className="mt-4 text-xl font-bold text-[#244b3a]">Pindai untuk mencatat kehadiran</p><button type="button" onClick={() => setQrFullscreen(false)} className="mx-auto mt-6 inline-flex min-h-12 items-center rounded-lg border border-[#b8aa8e] px-5 font-bold text-[#244b3a]">Tutup layar penuh</button></section></div>}
  </div>;
}
