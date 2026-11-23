"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Clipboard, Download, Gamepad2, Loader2, Plus, QrCode, X, Maximize2, MessageCircle, Presentation } from "lucide-react";
import QRCode from "qrcode";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { classSessionJoinUrl, type StoredClassSession } from "@/lib/class-session";
import type { ClassItem } from "@/lib/types";

type AttendanceRow = { id: string; participant_name: string; participant_type: string; attended_at: string };
type GuestRow = { id: string; full_name: string; whatsapp: string; status: string; registered_at: string };
type SessionGame = { id: string; title: string; template: string; level: string; livePin?: string | null; liveStatus?: string | null };
type SessionDetail = StoredClassSession & { classTitle: string; classSlug?: string | null; attendeeCount: number; pendingCount: number };
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const dateInputValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const dateTimeInputValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
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
  const [detail, setDetail] = useState<{ attendees: AttendanceRow[]; guests: GuestRow[]; games: SessionGame[] } | null>(null);
  const [sessionGameCatalog, setSessionGameCatalog] = useState<SessionGame[]>([]);
  const [sessionGameIdsDraft, setSessionGameIdsDraft] = useState<string[]>([]);
  const [sessionGamePickerOpen, setSessionGamePickerOpen] = useState(false);
  const [sessionGamesLoading, setSessionGamesLoading] = useState(false);
  const [sessionGamesSaving, setSessionGamesSaving] = useState(false);
  const [sessionGamesError, setSessionGamesError] = useState("");
  const [gameActionTarget, setGameActionTarget] = useState<SessionGame | null>(null);
  const [gameActionBusy, setGameActionBusy] = useState(false);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("14:30");
  const [startsImmediately, setStartsImmediately] = useState(false);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  const [autoCloseAt, setAutoCloseAt] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [needsAdminLogin, setNeedsAdminLogin] = useState(false);
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
      if (!sessionResponse.ok) {
        if (sessionResponse.status === 401 || sessionResponse.status === 403) {
          setNeedsAdminLogin(sessionResponse.status === 401);
          throw new Error(sessionResponse.status === 401 ? "Sesi admin sudah berakhir. Masuk kembali untuk memuat sesi." : sessionData.error || "Akun ini belum memiliki akses untuk mengelola sesi.");
        }
        throw new Error(sessionData.error || "Sesi belum dapat dimuat. Periksa koneksi lalu coba lagi.");
      }
      if (!classResponse.ok) {
        if (classResponse.status === 401 || classResponse.status === 403) {
          setNeedsAdminLogin(classResponse.status === 401);
          throw new Error(classResponse.status === 401 ? "Sesi admin sudah berakhir. Masuk kembali untuk memuat daftar kelas." : classData.error || "Akun ini belum memiliki akses untuk mengelola sesi.");
        }
        throw new Error(classData.error || "Daftar kelas terbit belum dapat dimuat. Periksa koneksi lalu coba lagi.");
      }
      const publishedClasses: ClassItem[] = Array.isArray(classData.classes)
        ? classData.classes.filter((item: ClassItem) => item.isPublished && item.status !== "draft")
        : [];
      setSessions(Array.isArray(sessionData.sessions) ? sessionData.sessions.filter((item: SessionDetail) => !deletedSessionIds.current.has(item.id)) : []);
      setClasses(publishedClasses);
      setNeedsAdminLogin(false);
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
    const url = new URL(classSessionJoinUrl(window.location.origin, selected.code));
    url.searchParams.set("entry", "scan");
    QRCode.toDataURL(url.toString(), { errorCorrectionLevel: "M", margin: 2, width: 240, color: { dark: "#183b2d", light: "#fdf9f0" } }).then(setQr).catch(() => setQr(""));
  }, [selected]);

  const loadDetail = async (session: SessionDetail) => {
    setSelected(session); setError("");
    try {
      const response = await fetch(`/api/class-sessions/${session.id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setNeedsAdminLogin(response.status === 401);
          throw new Error(response.status === 401 ? "Sesi admin sudah berakhir. Masuk kembali untuk melihat detail sesi." : data.error || "Akun ini belum memiliki akses untuk melihat detail sesi.");
        }
        throw new Error(data.error || "Daftar peserta belum dapat dimuat.");
      }
      setDetail({ attendees: data.attendees || [], guests: data.guests || [], games: data.games || [] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Daftar peserta belum dapat dimuat."); }
  };

  const refreshSessionData = async () => {
    setRefreshingSessions(true);
    try {
      await loadSessions();
      if (selected) await loadDetail(selected);
      router.refresh();
    } finally {
      setRefreshingSessions(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const selectedId = selected?.id;
      const [sessionsResponse, detailResponse] = await Promise.all([
        fetch("/api/class-sessions", { cache: "no-store" }),
        selectedId ? fetch(`/api/class-sessions/${selectedId}`, { cache: "no-store" }) : Promise.resolve(null),
      ]);
      if (sessionsResponse.status === 401 || sessionsResponse.status === 403) {
        const data = await sessionsResponse.json().catch(() => ({}));
        setNeedsAdminLogin(sessionsResponse.status === 401);
        setError(sessionsResponse.status === 401 ? "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." : data.error || "Akun ini belum memiliki akses untuk mengelola sesi.");
      } else if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions.filter((item: SessionDetail) => !deletedSessionIds.current.has(item.id)) : []);
      }
      if (detailResponse && (detailResponse.status === 401 || detailResponse.status === 403)) {
        const data = await detailResponse.json().catch(() => ({}));
        setNeedsAdminLogin(detailResponse.status === 401);
        setError(detailResponse.status === 401 ? "Sesi admin sudah berakhir. Masuk kembali untuk melihat detail sesi." : data.error || "Akun ini belum memiliki akses untuk melihat detail sesi.");
      } else if (detailResponse?.ok) {
        const data = await detailResponse.json();
        setDetail({ attendees: data.attendees || [], guests: data.guests || [], games: data.games || [] });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const startsAt = startsImmediately ? null : startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null;
      if (startsAt && new Date(startsAt).getTime() <= Date.now()) throw new Error("Waktu sesi sudah lewat. Pilih tanggal dan jam yang akan datang.");
      const closeAt = autoCloseEnabled && autoCloseAt ? new Date(autoCloseAt).toISOString() : null;
      if (autoCloseEnabled && !closeAt) throw new Error("Tentukan waktu tutup otomatis atau nonaktifkan pilihan tersebut.");
      if (closeAt && Date.parse(closeAt) <= Date.now()) throw new Error("Waktu tutup otomatis harus di masa mendatang.");
      if (startsAt && closeAt && Date.parse(closeAt) <= Date.parse(startsAt)) throw new Error("Waktu tutup otomatis harus setelah waktu mulai sesi.");
      const response = await fetch("/api/class-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, classId, startsAt, autoCloseAt: closeAt, requireApproval }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sesi belum dapat dibuat.");
      setTitle(""); setStartDate(""); setStartsImmediately(false);
      await loadSessions();
      const session = { ...data.session, attendeeCount: 0, pendingCount: 0 } as SessionDetail;
      setSelected(session); setDetail({ attendees: [], guests: [], games: [] });
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

  const openSessionGamePicker = async () => {
    if (!selected) return;
    setSessionGameIdsDraft((detail?.games || []).map((game) => game.id));
    setSessionGamesError("");
    setSessionGamePickerOpen(true);
    setSessionGamesLoading(true);
    try {
      const response = await fetch("/api/class-sessions/games", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kuis Sesi belum dapat dimuat.");
      setSessionGameCatalog(Array.isArray(data.games) ? data.games : []);
    } catch (reason) {
      setSessionGamesError(reason instanceof Error ? reason.message : "Kuis Sesi belum dapat dimuat.");
    } finally {
      setSessionGamesLoading(false);
    }
  };

  const saveSessionGames = async () => {
    if (!selected || sessionGamesSaving) return;
    setSessionGamesSaving(true);
    setSessionGamesError("");
    try {
      const response = await fetch(`/api/class-sessions/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-games", gameIds: sessionGameIdsDraft }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kuis sesi belum dapat disimpan.");
      const chosen = sessionGameCatalog.filter((game) => data.gameIds?.includes(game.id));
      setDetail((current) => current ? { ...current, games: chosen } : current);
      setToast(`${chosen.length} game disimpan untuk sesi ini.`);
      setSessionGamePickerOpen(false);
    } catch (reason) {
      setSessionGamesError(reason instanceof Error ? reason.message : "Kuis sesi belum dapat disimpan.");
    } finally {
      setSessionGamesSaving(false);
    }
  };

  const toggleSessionGame = (gameId: string) => {
    setSessionGameIdsDraft((current) => current.includes(gameId)
      ? current.filter((id) => id !== gameId)
      : current.length < 30 ? [...current, gameId] : current);
  };

  const showGameActions = (game: SessionGame) => {
    setSessionGamesError("");
    setGameActionTarget(game);
  };

  const launchSessionGame = async (mode: "host" | "join") => {
    if (!selected || !gameActionTarget || gameActionBusy) return;
    if (selected.status !== "open") {
      setGameActionTarget(null);
      setToast("Sesi tatap muka ini sudah ditutup.");
      return;
    }
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setSessionGamesError("Izinkan pop-up untuk membuka jendela kuis.");
      return;
    }
    popup.opener = null;
    setGameActionBusy(true);
    setSessionGamesError("");
    try {
      const response = await fetch("/api/game/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameActionTarget.id, source: "blueprint", classSessionId: selected.id, mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Sesi kuis belum dapat dibuka.");
      localStorage.setItem(`sapen_host_${data.pin}`, data.hostId);
      popup.location.href = mode === "host" ? `/game/host/${data.pin}` : `/game/join?pin=${data.pin}`;
      setGameActionTarget(null);
      setToast(mode === "host" ? `Mode Host dibuka · PIN ${data.pin}` : `Halaman Ikut Bermain dibuka · PIN ${data.pin}`);
      await loadDetail(selected);
    } catch (reason) {
      popup.close();
      setSessionGamesError(reason instanceof Error ? reason.message : "Kuis belum dapat dibuka. Coba lagi.");
    } finally {
      setGameActionBusy(false);
    }
  };

  useEffect(() => {
    if (!sessionGamePickerOpen && !gameActionTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sessionGamesSaving && !gameActionBusy) {
        setSessionGamePickerOpen(false);
        setGameActionTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sessionGamePickerOpen, sessionGamesSaving, gameActionTarget, gameActionBusy]);

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
      setCopied("link"); setToast("Tautan sesi tersalin."); window.setTimeout(() => setCopied((current) => current === "link" ? null : current), 2000);
    } catch { setError("Tautan belum dapat disalin. Pilih dan salin tautannya secara manual."); }
  };

  const copySessionCode = async () => {
    if (!selected) return;
    try {
      const sessionCode = String(selected.code).trim();
      await copyText(sessionCode);
      setCopied("code"); setToast("Kode sesi tersalin."); window.setTimeout(() => setCopied((current) => current === "code" ? null : current), 2000);
    } catch { setError("Kode belum dapat disalin. Pilih dan salin kodenya secara manual."); }
  };
  const activeSessions = useMemo(() => sessions.filter((session) => session.status === "open"), [sessions]);
  const historySessions = useMemo(() => sessions.filter((session) => session.status === "closed" && `${session.title} ${session.classTitle} ${session.code}`.toLocaleLowerCase().includes(historyQuery.toLocaleLowerCase())), [sessions, historyQuery]);

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat sesi kelas…</div>;
  const tabs = [["buat", "Buat sesi"], ["aktif", `Sesi aktif (${activeSessions.length})`], ["riwayat", "Riwayat"]] as const;
  const updateDraft = (next: "buat" | "aktif" | "riwayat") => changeView(next);
  const stages = ["Pilih kelas", "Atur jadwal", "Persetujuan", "Buat sesi"];
  const ongoing = activeSessions.filter((session) => !session.startsAt || new Date(session.startsAt).getTime() <= Date.now());
  const upcoming = activeSessions.filter((session) => session.startsAt && new Date(session.startsAt).getTime() > Date.now());
  return <div className="w-full space-y-6 px-1 text-[#20251f] sm:px-2">
    <div className="flex items-center gap-2 border-b border-[#d2c5ad] pb-2">
      <nav role="tablist" aria-label="Halaman sesi tatap muka" className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => updateDraft(value)} className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold ${view === value ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a] hover:bg-[#e6eadf]"}`}>{label}</button>)}
      </nav>
      <button type="button" disabled={refreshingSessions} onClick={() => void refreshSessionData()} aria-label={refreshingSessions ? "Memuat ulang sesi" : "Muat ulang sesi"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm font-bold text-[#244b3a] transition hover:bg-[#e6eadf] disabled:cursor-wait disabled:opacity-60"><Loader2 className={`h-4 w-4 ${refreshingSessions ? "animate-spin" : ""}`} /><span className="hidden sm:inline">{refreshingSessions ? "Memuat…" : "Muat ulang"}</span></button>
    </div>
    {toast && <div role="status" className="fixed right-4 top-20 z-[110] max-w-[calc(100vw-2rem)] rounded-xl border border-[#244b3a]/20 bg-[#e6eadf] px-4 py-3 text-sm font-bold text-[#183b2d] shadow-lg sm:right-6">{toast}</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#7b2c1d]"><p className="min-w-0 flex-1">{error}</p><div className="flex shrink-0 flex-wrap gap-2">{needsAdminLogin && <Link href="/admin/masuk" className="inline-flex min-h-11 items-center rounded-lg bg-[#943520] px-3 font-bold text-white">Masuk kembali</Link>}<button type="button" disabled={refreshingSessions} onClick={() => void refreshSessionData()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#943520]/30 bg-white px-3 font-bold text-[#7b2c1d] disabled:cursor-wait disabled:opacity-60"><Loader2 className={`h-4 w-4 ${refreshingSessions ? "animate-spin" : ""}`} />{refreshingSessions ? "Memuat sesi…" : "Muat ulang"}</button></div></div>}

    {view === "buat" && <section className="mx-auto w-full max-w-5xl space-y-5">
      {showExplanation && <aside className="relative w-full rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 pr-14 sm:p-5"><button type="button" onClick={() => setShowExplanation(false)} aria-label="Tutup penjelasan" className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#244b3a] hover:bg-[#e6eadf]"><X className="h-4 w-4" /></button><h2 className="font-bold text-[#183b2d]">Apa itu sesi tatap muka?</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-[#3d4038]">Buat pertemuan langsung, bagikan kode atau QR kepada peserta, lalu pantau presensi dan persetujuan tamu.</p></aside>}
      <p className="text-sm font-semibold text-[#244b3a] sm:hidden" aria-live="polite">Langkah {createStep + 1} dari {stages.length} · {stages[createStep]}</p>
      <ol aria-label="Langkah membuat sesi" className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">{stages.map((label, index) => <li key={label} className="shrink-0 sm:shrink"><button type="button" aria-current={createStep === index ? "step" : undefined} aria-label={`Langkah ${index + 1}: ${label}`} onClick={() => { setError(""); setCreateStep(index); }} className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-center text-sm font-bold transition-colors hover:border-[#244b3a] sm:min-h-12 sm:w-full sm:justify-start sm:gap-2 sm:px-3 sm:text-left ${createStep === index ? "border-[#244b3a] bg-[#e6eadf] text-[#183b2d]" : createStep > index ? "border-[#b8aa8e] bg-white text-[#244b3a]" : "border-[#d2c5ad] bg-[#fdf9f0] text-[#625f54]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white">{createStep > index ? "✓" : index + 1}</span><span className="hidden sm:inline">{label}</span></button></li>)}</ol>
      <form onSubmit={createSession} className="w-full space-y-5 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 pb-28 sm:p-6 sm:pb-28 md:pb-6">
        {createStep === 0 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Pilih kelas dan beri judul</h2><label className="block text-sm font-bold">Pilih kelas<select required value={classId} onChange={(event) => setClassId(event.target.value)} className={inputClass}><option value="">Pilih kelas terbit</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block text-sm font-bold">Nama/judul pertemuan<input required minLength={3} maxLength={100} className={inputClass} placeholder="Contoh: Percakapan sehari-hari" value={title} onChange={(event) => setTitle(event.target.value)} /></label></div>}
        {createStep === 1 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Atur jadwal</h2><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => { setStartsImmediately(true); setStartDate(""); }} aria-pressed={startsImmediately} className={`min-h-11 rounded-lg border px-4 text-sm font-bold ${startsImmediately ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] text-[#244b3a]"}`}>Buka Sekarang</button>{startsImmediately && <button type="button" onClick={() => setStartsImmediately(false)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]">Atur jadwal</button>}</div>{startsImmediately ? <p className="rounded-lg bg-[#e6eadf] p-3 text-sm text-[#183b2d]">Sesi langsung dibuka setelah dibuat.</p> : <><fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-2 text-sm font-bold">Tanggal dan jam</legend><div className="relative text-sm font-semibold"><span className="block">Tanggal</span><button type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)} className="mt-1.5 inline-flex min-h-11 w-full items-center rounded-lg border border-[#b8aa8e] bg-white px-3 text-left">{startDate ? formatSessionDate(new Date(`${startDate}T12:00:00`)) : "Pilih tanggal"}</button>{calendarOpen && <div className="relative z-20 mt-2 w-full rounded-lg border border-[#b8aa8e] bg-white p-3 shadow-lg"><input autoFocus type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setCalendarOpen(false); }} className="min-h-11 rounded-md border border-[#b8aa8e] p-2" /><button type="button" onClick={() => setCalendarOpen(false)} className="mt-2 min-h-11 w-full rounded-md border border-[#b8aa8e]">Tutup kalender</button></div>}<span className="mt-2 flex gap-2"><button type="button" onClick={() => setStartDate(dateInputValue(new Date()))} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Hari ini</button><button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setStartDate(dateInputValue(d)); }} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Besok</button></span></div><label className="text-sm font-semibold">Jam (HH:mm)<input type="time" step={60} value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /><span className="mt-2 flex flex-wrap gap-2">{["08:00", "13:00", "19:00"].map((time) => <button key={time} type="button" onClick={() => setStartTime(time)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">{time.replace(":", ".")}</button>)}</span></label></fieldset>{startDate && <p className="rounded-lg bg-[#e6eadf] p-3 text-sm text-[#183b2d]">Jadwal: {formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul {startTime.replace(":", ".")}</p>}</>}<label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={autoCloseEnabled} onChange={(event) => { setAutoCloseEnabled(event.target.checked); if (!event.target.checked) setAutoCloseAt(""); }} className="h-4 w-4 accent-[#244b3a]" />Tutup sesi otomatis</label>{autoCloseEnabled && <label className="block max-w-md text-sm font-semibold">Tutup pada tanggal dan jam<input type="datetime-local" value={autoCloseAt} min={dateTimeInputValue(new Date(Date.now() + 60_000))} onChange={(event) => setAutoCloseAt(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Sesi ditutup saat waktunya tercapai dan peserta tidak bisa melakukan presensi baru.</span></label>}</div>}
        {createStep === 2 && <div className="space-y-4"><h2 className="text-xl font-bold text-[#183b2d]">Pengaturan peserta</h2><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} className="h-4 w-4 accent-[#244b3a]" /><span>Minta persetujuan sebelum tamu masuk<span className="block text-xs font-normal text-[#625f54]">Tamu menunggu pengurus menyetujui sebelum presensinya dicatat.</span></span></label><p className="rounded-lg bg-[#e6eadf] p-4 text-sm text-[#183b2d]">Kelas: <strong>{classes.find((item) => item.id === classId)?.title || "Belum dipilih"}</strong><br />Pertemuan: <strong>{title || "Belum diberi judul"}</strong><br />Jadwal: <strong>{startsImmediately ? "Dibuka segera setelah dibuat" : startDate ? `${formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul ${startTime.replace(":", ".")}` : "Waktu belum ditentukan"}</strong></p></div>}
        {createStep === 3 && <div className="space-y-3"><h2 className="text-xl font-bold text-[#183b2d]">Buat sesi dan bagikan kode</h2><p className="text-sm leading-6 text-[#3d4038]">Periksa ringkasan sebelum membuat sesi. Kode dan QR akan tersedia di tab Sesi aktif.</p><div className="rounded-lg border border-[#d2c5ad] bg-[#e6eadf] p-4 text-sm leading-6 text-[#183b2d]"><p><strong>Kelas:</strong> {classes.find((item) => item.id === classId)?.title || "Belum dipilih"}</p><p><strong>Pertemuan:</strong> {title || "Belum diberi judul"}</p><p><strong>Jadwal:</strong> {startsImmediately ? "Dibuka segera setelah dibuat" : startDate ? `${formatSessionDate(new Date(`${startDate}T12:00:00`))} pukul ${startTime.replace(":", ".")}` : "Waktu belum ditentukan"}</p><p><strong>Persetujuan tamu:</strong> {requireApproval ? "Wajib disetujui pengurus" : "Peserta langsung masuk"}</p>{autoCloseEnabled && autoCloseAt && <p><strong>Tutup otomatis:</strong> {new Date(autoCloseAt).toLocaleString("id-ID")}</p>}</div><div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap justify-between gap-2 border-t border-[#d2c5ad] bg-[#fdf9f0] px-4 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,46,26,.1)] sm:static sm:z-auto sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none"><p className="w-full text-center text-xs font-bold text-[#514b3e] sm:hidden" aria-live="polite">Langkah {createStep + 1} dari {stages.length}</p><button type="button" onClick={() => setCreateStep(2)} className="min-h-11 flex-1 rounded-lg border border-[#b8aa8e] px-4 font-bold text-[#244b3a] sm:flex-none">Kembali</button><button type="submit" disabled={saving || !classes.length} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50 sm:flex-none"><Plus className="h-4 w-4" />{saving ? "Membuat sesi…" : "Buat sesi dan kode"}</button></div></div>}
        {createStep < 3 && <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap justify-between gap-2 border-t border-[#d2c5ad] bg-[#fdf9f0] px-4 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,46,26,.1)] sm:static sm:z-auto sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none"><p className="w-full text-center text-xs font-bold text-[#514b3e] sm:hidden" aria-live="polite">Langkah {createStep + 1} dari {stages.length}</p><button type="button" disabled={createStep === 0} onClick={() => setCreateStep((step) => Math.max(0, step - 1))} className="min-h-11 flex-1 rounded-lg border border-[#b8aa8e] px-4 font-bold text-[#244b3a] disabled:opacity-40 sm:flex-none">Kembali</button><button type="button" onClick={() => { if (createStep === 0 && (!classId || title.trim().length < 3)) { setError("Pilih kelas dan isi judul pertemuan minimal 3 karakter."); return; } if (createStep === 1 && !startsImmediately && !startDate) { setError("Pilih tanggal dan jam sesi, atau pilih Buka Sekarang."); return; } setError(""); setCreateStep((step) => Math.min(3, step + 1)); }} className="min-h-11 flex-1 rounded-lg bg-[#244b3a] px-5 font-bold text-white sm:flex-none">Lanjutkan</button></div>}
        {!classes.length && <div className="rounded-lg bg-[#f3e9d5] p-4 text-sm text-[#3d4038]">Belum ada kelas terbit. Terbitkan kelas terlebih dahulu agar kelas bisa dipilih. <Link href="/admin?tab=classes" className="font-bold text-[#244b3a] underline">Buka pengelolaan kelas</Link></div>}
      </form>
    </section>}

    {view === "aktif" && <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)]">
      <section className="min-w-0"><h2 className="text-lg font-bold text-[#183b2d]">Sesi berlangsung dan akan datang</h2><p className="mt-1 text-sm text-[#625f54]">{activeSessions.length} sesi aktif</p>{activeSessions.length ? <div className="mt-3 space-y-2">{[...ongoing, ...upcoming].map((session) => <button key={session.id} type="button" onClick={() => void loadDetail(session)} aria-pressed={selected?.id === session.id} className={`w-full rounded-xl border p-4 text-left transition hover:border-[#244b3a] ${selected?.id === session.id ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-[#fdf9f0]"}`}><div className="flex items-start justify-between gap-2"><strong>{session.title}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${session.startsAt && new Date(session.startsAt).getTime() > Date.now() ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{session.startsAt && new Date(session.startsAt).getTime() > Date.now() ? "Akan datang" : "Berlangsung"}</span></div><p className="mt-1 text-sm text-[#625f54]">{session.classTitle} · {session.attendeeCount} hadir</p>{session.pendingCount > 0 && <span className="mt-2 inline-flex rounded-full bg-[#ba472f] px-2.5 py-1 text-xs font-bold text-white">{session.pendingCount} menunggu persetujuan</span>}<p className="mt-2 text-xs font-bold tracking-wider">Kode {session.code}</p></button>)}</div> : <div className="mt-4 rounded-xl bg-[#fdf9f0] p-5 text-sm"><p className="font-bold text-[#183b2d]">Belum ada sesi aktif.</p><p className="mt-1 text-[#625f54]">Buat sesi baru untuk membagikan kode presensi.</p><button type="button" onClick={() => updateDraft("buat")} className="mt-3 min-h-11 rounded-lg bg-[#244b3a] px-4 font-bold text-white">Buat sesi</button></div>}</section>
      {selected ? <section className="min-w-0 space-y-5 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#183b2d]">{selected.title}</h2><p className="mt-2 text-sm text-[#625f54]">Kode sesi</p><p className="font-display text-5xl font-bold tracking-[.12em] text-[#244b3a] sm:text-6xl">{selected.code}</p><p className="mt-2 text-sm font-bold">{selected.attendeeCount} peserta hadir</p></div>{qr && <div className="rounded-lg border border-[#d2c5ad] bg-white p-2"><Image src={qr} alt={`QR code sesi ${selected.code}`} width={150} height={150} unoptimized /><button type="button" onClick={() => setQrFullscreen(true)} className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#b8aa8e] text-sm font-bold text-[#244b3a]"><Maximize2 className="h-4 w-4" />Layar penuh</button></div>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyJoinLink()} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a] transition-all duration-150 hover:-translate-y-px hover:border-[#244b3a] hover:bg-[#e8eee5] hover:shadow-sm active:scale-[.97]">{copied === "link" ? <><Check aria-hidden="true" className="h-4 w-4" />✓ Tersalin</> : <><Clipboard aria-hidden="true" className="h-4 w-4" />Salin tautan</>}</button><button type="button" onClick={() => void copySessionCode()} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a] transition-all duration-150 hover:-translate-y-px hover:border-[#244b3a] hover:bg-[#e8eee5] hover:shadow-sm active:scale-[.97]">{copied === "code" ? <><Check aria-hidden="true" className="h-4 w-4" />✓ Tersalin</> : <><Clipboard aria-hidden="true" className="h-4 w-4" />Salin kode</>}</button><a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Gabung sesi ${selected.title}: ${classSessionJoinUrl(window.location.origin, selected.code)}`)}`} className="inline-flex min-h-11 items-center rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white"><MessageCircle className="mr-2 h-4 w-4" />Bagikan WhatsApp</a><details className="relative"><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Download className="h-4 w-4" />Ekspor</summary><div className="absolute right-0 z-20 mt-1 grid min-w-48 rounded-lg border border-[#d2c5ad] bg-white p-1 shadow-lg">{[["excel", "Ekspor Excel (.xlsx)"], ["pdf", "Ekspor PDF"], ["csv", "Ekspor CSV"]].map(([format, label]) => <a key={format} href={`/api/class-sessions/${selected.id}/export?format=${format}`} className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-[#244b3a] hover:bg-[#e8eee5]">{label}</a>)}</div></details>{selected.status === "open" && <button type="button" disabled={busyAction === selected.id} onClick={() => void closeSelectedSession()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#943520] px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction === selected.id && <Loader2 className="h-4 w-4 animate-spin" />}{busyAction === selected.id ? "Menutup…" : "Tutup sesi"}</button>}</div><section className="rounded-xl border border-[#d2c5ad] bg-white/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#183b2d]">Kuis untuk sesi</h3><p className="mt-1 text-sm text-[#625f54]">Pilih beberapa kuis berstatus Sesi untuk peserta sesi ini.</p></div><button type="button" onClick={() => void openSessionGamePicker()} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d] active:scale-[.98]"><Gamepad2 className="h-4 w-4" />Pilih kuis</button></div>{detail?.games.length ? <div className="mt-3 flex flex-wrap gap-2">{detail.games.map((game) => { const locked = selected.status !== "open"; return <button key={game.id} type="button" disabled={locked} onClick={() => showGameActions(game)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244b3a] ${locked ? "cursor-not-allowed border-[#d2c5ad] bg-[#eee8dc] text-[#777267]" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#244b3a] hover:border-[#244b3a] hover:bg-[#e8eee5] active:scale-[.98]"}`}><Gamepad2 className="h-4 w-4 shrink-0" /><span>{game.title}</span>{game.liveStatus === "closed" && !locked && <span className="ml-1 rounded-full bg-[#e6eadf] px-2 py-0.5 text-[11px] font-bold text-[#244b3a]">Mulai pertandingan lagi</span>}{locked && <span className="ml-1 rounded-full bg-[#ddd6c9] px-2 py-0.5 text-[11px] font-bold">Terkunci</span>}</button>; })}</div> : <p className="mt-3 rounded-lg bg-[#f3e9d5] p-3 text-sm text-[#625f54]">Belum ada kuis. Pilih kuis sesi untuk menampilkannya bagi peserta di sesi ini.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-2 font-bold">Daftar hadir ({detail?.attendees.length || 0})</h3>{detail?.attendees.length ? detail.attendees.map((row) => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-[#e6ddcd] py-3 text-sm"><strong>{row.participant_name}</strong><span className="text-[#625f54]">{row.participant_type === "guest" ? "Tamu" : "Warga"} · {new Date(row.attended_at).toLocaleString("id-ID")}</span></div>) : <p className="py-3 text-sm text-[#625f54]">Presensi peserta akan muncul di sini.</p>}</section><section><h3 className="border-b border-[#d2c5ad] pb-2 font-bold">Antrean persetujuan tamu</h3>{detail?.guests.filter((g) => g.status === "pending").length ? detail.guests.filter((g) => g.status === "pending").map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ddcd] py-3"><div><strong>{guest.full_name}</strong><p className="text-sm text-[#625f54]">{guest.whatsapp}</p></div><div className="flex gap-2"><button type="button" onClick={() => void sessionAction("approve", guest.id)} className="min-h-11 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white">Setujui</button><button type="button" onClick={() => void sessionAction("reject", guest.id)} className="min-h-11 rounded-lg border border-[#943520] px-3 text-sm font-bold text-[#943520]">Tolak</button></div></div>) : <p className="py-3 text-sm text-[#625f54]">Tidak ada tamu yang menunggu persetujuan.</p>}</section></section> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#b8aa8e] bg-[#fdf9f0] p-6 text-center text-sm text-[#625f54]">Pilih sesi di daftar untuk melihat kode, QR, dan presensinya.</div>}
    </div>}

    {view === "riwayat" && <section className="w-full space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-[#183b2d]">Riwayat sesi</h2><p className="mt-1 text-sm text-[#625f54]">{historySessions.length} sesi selesai · {historySessions.reduce((sum, s) => sum + s.attendeeCount, 0)} total kehadiran</p></div><input aria-label="Cari riwayat sesi" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Cari judul, kelas, atau kode" className={`${inputClass} max-w-sm`} /></div>{historySessions.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{historySessions.map((session) => <article key={session.id} className="flex flex-col rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4"><h3 className="font-bold text-[#183b2d]">{session.title}</h3><p className="mt-1 text-sm text-[#625f54]">{session.classTitle}</p><p className="mt-1 text-xs text-[#625f54]">{session.startsAt || session.createdAt ? new Date(session.startsAt || session.createdAt!).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Waktu sesi tidak tersedia"}</p><p className="mt-3 text-sm">{session.attendeeCount} peserta hadir</p><p className="mt-1 text-xs text-[#625f54]">Kode {session.code}</p><div className="mt-3 flex flex-wrap gap-2 border-t border-[#e6ddcd] pt-3"><details className="relative"><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 font-bold text-[#244b3a] underline underline-offset-4"><Download className="h-4 w-4" />Ekspor</summary><div className="absolute left-0 z-20 mt-1 grid min-w-48 rounded-lg border border-[#d2c5ad] bg-white p-1 shadow-lg">{[["excel", "Ekspor Excel (.xlsx)"], ["pdf", "Ekspor PDF"], ["csv", "Ekspor CSV"]].map(([format, label]) => <a key={format} href={`/api/class-sessions/${session.id}/export?format=${format}`} className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-[#244b3a] hover:bg-[#e8eee5]">{label}</a>)}</div></details><button type="button" disabled={busyAction === session.id} onClick={() => void deleteHistoricalSession(session)} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#943520]/40 px-3 text-sm font-bold text-[#943520] hover:bg-[#ba472f]/5 disabled:cursor-wait disabled:opacity-60">{busyAction === session.id && <Loader2 className="h-4 w-4 animate-spin" />}Hapus</button></div></article>)}</div> : <div className="rounded-xl bg-[#fdf9f0] p-6 text-sm text-[#625f54]">{sessions.some((session) => session.status === "closed") ? "Tidak ada sesi riwayat yang cocok dengan pencarian ini." : "Riwayat sesi masih kosong. Sesi akan muncul di sini setelah ditutup."}</div>}</section>}
    {gameActionTarget && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !gameActionBusy) setGameActionTarget(null); }} className="fixed inset-0 z-[95] grid place-items-center bg-[#13271f]/55 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="game-action-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e6ddcd] p-5"><div><h2 id="game-action-title" className="text-xl font-bold text-[#183b2d]">{gameActionTarget.title}</h2><p className="mt-1 text-sm leading-5 text-[#625f54]">Pilih cara membuka kuis ini untuk sesi “{selected?.title}”.</p></div><button type="button" aria-label="Tutup" disabled={gameActionBusy} onClick={() => setGameActionTarget(null)} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-[#b8aa8e] text-[#244b3a] hover:bg-[#e8eee5] disabled:opacity-50"><X className="h-4 w-4" /></button></header>{sessionGamesError && <p role="alert" className="mx-5 mt-4 rounded-lg border border-[#ba472f]/30 bg-[#ba472f]/10 p-3 text-sm text-[#7b2c1d]">{sessionGamesError}</p>}<div className="grid gap-3 p-5 sm:grid-cols-2"><button type="button" disabled={gameActionBusy} onClick={() => void launchSessionGame("host")} className="group min-h-36 rounded-xl border border-[#244b3a] bg-[#244b3a] p-4 text-left text-white transition hover:-translate-y-0.5 hover:bg-[#183b2d] hover:shadow-lg active:scale-[.98] disabled:cursor-wait disabled:opacity-60"><span className="grid h-10 w-10 place-items-center rounded-lg bg-white/15"><Presentation className="h-5 w-5" /></span><strong className="mt-3 block">Mode Host</strong><span className="mt-1 block text-sm leading-5 text-white/85">Buka proyektor, PIN, QR, skor live, dan kontrol kuis.</span>{gameActionBusy && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}</button><button type="button" disabled={gameActionBusy} onClick={() => void launchSessionGame("join")} className="group min-h-36 rounded-xl border border-[#d2c5ad] bg-white p-4 text-left text-[#183b2d] transition hover:-translate-y-0.5 hover:border-[#244b3a] hover:bg-[#e8eee5] hover:shadow-lg active:scale-[.98] disabled:cursor-wait disabled:opacity-60"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e8eee5] text-[#244b3a]"><Gamepad2 className="h-5 w-5" /></span><strong className="mt-3 block">Ikut Bermain</strong><span className="mt-1 block text-sm leading-5 text-[#625f54]">Buka halaman peserta di jendela baru dan masuk dengan username.</span></button></div><footer className="border-t border-[#e6ddcd] px-5 py-3 text-xs leading-5 text-[#625f54]">Kedua mode menggunakan PIN yang sama untuk kuis dan sesi ini.</footer></section></div>}
    {sessionGamePickerOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sessionGamesSaving) setSessionGamePickerOpen(false); }} className="fixed inset-0 z-[90] grid place-items-center bg-[#13271f]/55 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="session-game-picker-title" className="flex max-h-[min(88dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e6ddcd] p-5"><div><h2 id="session-game-picker-title" className="text-xl font-bold text-[#183b2d]">Pilih kuis untuk sesi</h2><p className="mt-1 text-sm leading-5 text-[#625f54]">Pilih satu atau beberapa kuis kategori Sesi. Pilihan ini hanya berlaku untuk sesi “{selected?.title}”.</p></div><button type="button" aria-label="Tutup" disabled={sessionGamesSaving} onClick={() => setSessionGamePickerOpen(false)} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-[#b8aa8e] text-[#244b3a] hover:bg-[#e8eee5] disabled:opacity-50"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{sessionGamesError && <p role="alert" className="mb-3 rounded-lg border border-[#ba472f]/30 bg-[#ba472f]/10 p-3 text-sm text-[#7b2c1d]">{sessionGamesError}</p>}{sessionGamesLoading ? <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-[#625f54]"><Loader2 className="h-5 w-5 animate-spin" />Memuat kuis kategori Sesi…</div> : sessionGameCatalog.length ? <div className="space-y-2">{sessionGameCatalog.map((game) => { const checked = sessionGameIdsDraft.includes(game.id); return <button key={game.id} type="button" role="checkbox" aria-checked={checked} onClick={() => toggleSessionGame(game.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-[#244b3a] bg-[#e8eee5]" : "border-[#d2c5ad] bg-white hover:border-[#244b3a]"}`}><span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${checked ? "border-[#244b3a] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-transparent"}`}><Check className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#183b2d]">{game.title}</strong><span className="mt-1 block text-xs text-[#625f54]">{game.template} · Level {game.level}</span></span><Gamepad2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8a5135]" /></button>; })}<p className="pt-2 text-xs text-[#625f54]">Dipilih {sessionGameIdsDraft.length} dari maksimal 30 game.</p></div> : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[#b8aa8e] p-5 text-center"><div><Gamepad2 className="mx-auto h-7 w-7 text-[#8a5135]" /><p className="mt-2 font-bold text-[#183b2d]">Belum ada kuis kategori Sesi</p><p className="mt-1 text-sm text-[#625f54]">Ubah status game menjadi “Sesi” di menu Kelola Kuis, lalu pilih kembali.</p></div></div>}</div><footer className="flex flex-col-reverse gap-2 border-t border-[#e6ddcd] bg-white/50 p-4 sm:flex-row sm:justify-between"><button type="button" disabled={sessionGamesSaving} onClick={() => setSessionGamePickerOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a] disabled:opacity-50">Batal</button><button type="button" disabled={sessionGamesLoading || sessionGamesSaving || Boolean(sessionGamesError)} onClick={() => void saveSessionGames()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white transition hover:bg-[#183b2d] active:scale-[.98] disabled:cursor-wait disabled:opacity-60">{sessionGamesSaving && <Loader2 className="h-4 w-4 animate-spin" />} {sessionGamesSaving ? "Menyimpan…" : "Selesai"}</button></footer></section></div>}
    {qrFullscreen && qr && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-[#fdf9f0] p-5"><section role="dialog" aria-modal="true" aria-label={`QR sesi ${selected?.code}`} className="grid h-full w-full place-content-center text-center"><p className="font-display text-5xl font-bold tracking-[.15em] text-[#183b2d]">{selected?.code}</p><Image src={qr} alt={`QR code sesi ${selected?.code}`} width={560} height={560} unoptimized className="mx-auto mt-5 h-auto w-[min(70vw,70vh)]" /><p className="mt-4 text-xl font-bold text-[#244b3a]">Pindai untuk mencatat kehadiran</p><button type="button" onClick={() => setQrFullscreen(false)} className="mx-auto mt-6 inline-flex min-h-12 items-center rounded-lg border border-[#b8aa8e] px-5 font-bold text-[#244b3a]">Tutup layar penuh</button></section></div>}
  </div>;
}
