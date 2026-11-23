"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { publishSessionChanged } from "@/lib/session-sync";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  KeyRound,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Users,
} from "lucide-react";
import { formatIDR } from "@/lib/currency";
import {
  ModuleItem,
  SubscriptionRecord,
  QuizQuestion,
  FlashcardItem,
  MatchingPair,
  WordChallenge,
  WargaRecord,
  TestimoniRecord,
  ClassItem,
  ClassEnrollment,
  SessionPayload,
} from "@/lib/types";
import AdminWargaManager from "@/components/admin/AdminWargaManager";
import AdminTestimoniManager from "@/components/admin/AdminTestimoniManager";
import AdminClassesManager from "@/components/admin/AdminClassesManager";
import GameBuilderClient from "@/components/admin/GameBuilderClient";
import ClassSessionManager from "@/components/admin/ClassSessionManager";
import AdminCodesManager from "@/components/admin/AdminCodesManager";
import ResponsiveTable from "@/components/admin/ResponsiveTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import "@/components/admin/AdminTheme.css";
import { useAppDialog } from "@/components/AppDialogProvider";

interface AdminOverviewData {
  session: SessionPayload;
  diagnostics: {
    supabaseConfigured: boolean;
    supabaseUrl: string;
    midtransConfigured: boolean;
    midtransEnvironment: string;
    privateStorageMode: string;
  };
  stats: {
    totalModules: number;
    totalCodes: number;
    activeSubscribers: number;
    totalRevenueIdr: number;
    totalQuizQuestions: number;
    totalFlashcards: number;
    totalWarga?: number;
    wargaRw06?: number;
    wargaRw07?: number;
    wargaRw08?: number;
    activeThisWeek?: number;
    mostPlayedGame?: string;
    totalTestimoni?: number;
    pendingTestimoni?: number;
  };
  modules: ModuleItem[];
  subscriptions: SubscriptionRecord[];
  quizzes: QuizQuestion[];
  flashcards: FlashcardItem[];
  matchingPairs: MatchingPair[];
  wordChallenges: WordChallenge[];
  warga?: WargaRecord[];
  rwCodes?: Array<{
    id: string;
    rw: "RW 06" | "RW 07" | "RW 08";
    codeDisplay: string;
    isActive: boolean;
    updatedAt: string;
    forceLogoutAt?: string;
  }>;
  testimoni?: TestimoniRecord[];
  classes?: ClassItem[];
  enrollments?: ClassEnrollment[];
  externalUsers?: Array<{ id: string; name: string; email: string; createdAt: string }>;
  dashboardSessions?: Array<{ id: string; title: string; startsAt: string | null; status: string }>;
  recentActivity?: Array<{ id: string; name: string; kind: string; createdAt: string }>;
  plans?: Array<{ id: string; name: string; priceIdr: number; durationDays: number }>;
}

const ADMIN_TABS = ["dashboard", "classes", "warga", "testimoni", "codes", "game-builder", "sessions", "public", "payments"] as const;
type TabType = (typeof ADMIN_TABS)[number];

export default function AdminDashboardClient() {
  const dialog = useAppDialog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramTab = searchParams.get("tab") as TabType | null;
  const initialTab = paramTab && ADMIN_TABS.includes(paramTab) ? paramTab : "dashboard";
  const tabLabels: Record<TabType, string> = {
    dashboard: "Dashboard",
    classes: "Kelas",
    warga: "Kode Akses",
    testimoni: "Ulasan",
    codes: "Peserta & Akses Kelas",
    "game-builder": "Kelola Kuis",
    sessions: "Sesi Tatap Muka",
    public: "Situs Publik",
    payments: "Pembayaran",
  };

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const hasLoadedOverview = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshingOverview, setRefreshingOverview] = useState(false);

  // State Manual Subscription Grant
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualDurationDays, setManualDurationDays] = useState(30);
  const [savingManualGrant, setSavingManualGrant] = useState(false);

  useEffect(() => {
    const qTab = searchParams.get("tab") as TabType | null;
    if (qTab && ADMIN_TABS.includes(qTab) && qTab !== tab) {
      setTab(qTab);
    }
  }, [searchParams, tab]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, paramTab]);

  function handleSelectTab(nextTab: TabType) {
    setTab(nextTab);
    setSidebarOpen(false);
    router.push(`/admin?tab=${nextTab}`, { scroll: false });
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (supabase) await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Tetap hapus sesi aplikasi lokal jika jaringan Supabase tidak tersedia.
    }
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("Permintaan keluar belum berhasil.");
      publishSessionChanged();
      try { localStorage.removeItem("sapen_last_quiz_name"); } catch {}
      router.replace("/");
      router.refresh();
    } catch {
      notify("Belum berhasil keluar. Periksa koneksi, lalu tekan Keluar lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  const notify = useCallback((msg: string) => {
    const safeMessage = msg.includes('Gagal upsert ke tabel "subscription_plans"') || msg.includes("42501")
      ? "Paket belum dapat disimpan karena izin database Supabase. Minta admin teknis memeriksa kebijakan akses paket."
      : msg;
    setToast(safeMessage);
    setTimeout(() => setToast((prev) => (prev === safeMessage ? null : prev)), 5000);
  }, []);

  const fetchOverview = useCallback(async () => {
    if (!hasLoadedOverview.current) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setData(null);
        setLoadError(res.status === 401
          ? "Sesi admin tidak ditemukan atau sudah berakhir. Masuk kembali untuk melanjutkan."
          : res.status === 403
            ? "Akun ini belum memiliki akses admin. Masuk dengan akun pengurus."
            : "Data dashboard belum dapat dimuat. Periksa koneksi lalu coba lagi.");
      } else { setData(await res.json()); hasLoadedOverview.current = true; }
    } catch {
      if (!hasLoadedOverview.current) setData(null);
      setLoadError("Data dashboard belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function refreshOverview() {
    setRefreshingOverview(true);
    try {
      await fetchOverview();
      router.refresh();
    } finally {
      setRefreshingOverview(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Kuis live dikelola dari tab Sesi Tatap Muka.

  async function handleGrantManualAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) { await dialog.alert("Nama dan email wajib diisi."); return; }
    setSavingManualGrant(true);
    try {
      const res = await fetch("/api/admin/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: manualName, email: manualEmail, classId: manualPlanId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memberikan akses.");
      notify(json.alreadyOwned ? `${manualName} sudah memiliki akses kelas ini.` : `Akses kelas berhasil diberikan kepada ${manualName}.`);
      setManualName(""); setManualEmail(""); fetchOverview();
    } catch (err: any) { await dialog.alert(err.message); } finally { setSavingManualGrant(false); }
  }

  async function handleSubAction(id: string, action: "toggle" | "extend30") {
    const res = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (res.ok) { notify("Status langganan diperbarui."); fetchOverview(); }
  }

  async function handleDeleteSub(id: string) {
    if (!(await dialog.confirm("Hapus data langganan ini?", "Hapus langganan?"))) return;
    const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) { notify("Langganan dihapus."); fetchOverview(); }
  }

  if (loading) {
    return <div className="bg-[#FDFBF7] p-16 text-center text-sm font-bold text-[#1A2E1A]/70">Memuat Dashboard Pengurus Kampung Inggris Sapen...</div>;
  }
  if (!data) {
    return (
      <section role="alert" className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-bold text-[#1A2E1A]">Dashboard belum dapat dibuka</h1>
        <p className="mt-2 text-sm text-[#1A2E1A]/75">{loadError || "Data dashboard belum dapat dimuat."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" disabled={refreshingOverview} onClick={() => void refreshOverview()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-earth px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{refreshingOverview && <RefreshCw className="h-4 w-4 animate-spin" />}{refreshingOverview ? "Memuat ulang…" : "Coba lagi"}</button>
          <Link href="/admin/masuk" className="inline-flex min-h-11 items-center rounded-md border border-rule px-4 py-2 text-sm font-bold text-leaf">Masuk kembali</Link>
        </div>
      </section>
    );
  }

  const isDev = data.session.role === "developer";

  const roleLabel = "Pengurus";

  const navGroups = [
    {
      title: "Ringkasan",
      items: [
        { id: "dashboard" as const, label: "Dashboard", icon: BookOpen },
      ],
    },
    {
      title: "Pengelolaan",
      items: [
        { id: "classes" as const, label: "Kelas", icon: GraduationCap },
        { id: "sessions" as const, label: "Sesi Tatap Muka", icon: CalendarClock },
        { id: "warga" as const, label: "Kode Akses", icon: KeyRound },
        { id: "codes" as const, label: "Peserta & Akses Kelas", icon: Users },
        { id: "game-builder" as const, label: "Kelola Kuis", icon: Gamepad2 },
        { id: "public" as const, label: "Situs Publik", icon: ExternalLink, href: "/" },
        { id: "payments" as const, label: "Pembayaran", icon: CreditCard },
      ],
    },
  ];

  const sidebar = (
    <aside className="flex h-full w-[210px] flex-col border-r border-[#E5E7EB] bg-white shadow-xl md:shadow-none lg:w-[250px]">
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority className="h-auto w-[104px] shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#1A2E1A]/60">Panel Pengurus</p>
          </div>
        </Link>
        <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu" title="Tutup menu" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-[#E5E7EB] text-[#1A2E1A] transition hover:bg-[#FDFBF7] md:hidden"><X className="h-5 w-5" /></button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1A2E1A]/45">{group.title}</p>
            <div className="space-y-1">
                {group.items.map((item: any) => {
                const Icon = item.icon;
                const active = !item.href && tab === item.id;
                const cls = `flex min-h-[44px] w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs font-bold transition ${
                  active
                    ? "border-[#14532D]/20 bg-[#E8F0E9] text-[#14532D]"
                    : "border-transparent bg-white text-[#1A2E1A] hover:border-[#E5E7EB] hover:bg-[#FDFBF7]"
                }`;
                const isExternal = Boolean(item.href);
                return isExternal ? (
                  <Link key={item.id} href={item.href} className={cls} onClick={() => setSidebarOpen(false)}>
                    <Icon className="h-4 w-4 shrink-0 text-[#14532D]" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => handleSelectTab(item.id)} aria-current={active ? "page" : undefined} className={cls}>
                    <Icon className="h-4 w-4 shrink-0 text-[#14532D]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#E5E7EB] p-3">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FDFBF7] p-3">
          <p className="truncate text-xs font-extrabold text-[#1A2E1A]" title={data.session.name}>{data.session.name}</p>
          <p className="text-[11px] font-bold text-[#14532D]">{roleLabel}</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="admin-theme min-h-screen bg-[#FDFBF7] text-[#1A2E1A]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:block">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Tutup menu" title="Tutup menu" className="absolute inset-0 bg-[#102418]/55 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-[min(86vw,280px)]">{sidebar}</div>
        </div>
      )}

      <div className="md:pl-[210px] lg:pl-[250px]">
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white">
          <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#E5E7EB] text-[#1A2E1A] md:hidden" aria-label="Buka menu" title="Buka menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 md:hidden">
                <Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority className="h-auto w-[88px]" />
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2.5 py-1 text-xs font-bold text-[#14532D]">{roleLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={refreshingOverview} onClick={() => void refreshOverview()} aria-label={refreshingOverview ? "Memuat ulang panel" : "Muat ulang panel"} title={refreshingOverview ? "Memuat ulang panel" : "Muat ulang panel"} className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7] disabled:cursor-wait disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshingOverview ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{refreshingOverview ? "Memuat…" : "Muat ulang"}</span>
              </button>
              <button type="button" onClick={handleLogout} disabled={loggingOut} aria-label={loggingOut ? "Sedang keluar" : "Keluar dari panel admin"} title={loggingOut ? "Sedang keluar" : "Keluar dari panel admin"} className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7] disabled:cursor-wait disabled:opacity-60">
                <LogOut className="h-4 w-4 text-[#14532D]" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-[1680px] space-y-5">
            <AdminSectionHeader
              title={<h1 className="text-2xl font-extrabold tracking-tight text-[#1A2E1A] sm:text-[30px]">{tab === "dashboard" ? "Dashboard Pengurus" : tabLabels[tab]}</h1>}
              description={tab === "dashboard" ? `Selamat datang, ${data.session.name}. Berikut ringkasan pengelolaan Sapen English.` : "Kelola data dan aktivitas Kampung Inggris Sapen."}
              className="max-w-3xl"
            />

            {tab === "dashboard" && (
              <section aria-label="Ringkasan pengelolaan" className="space-y-6">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <button type="button" onClick={() => handleSelectTab("classes")} className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]"><StatCard label="Bab Aktif" value={`${data.stats.totalModules}`} subValue="Materi terbit" icon={<BookOpen className="h-4 w-4" />} /></button>
                  <button type="button" onClick={() => handleSelectTab("warga")} className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]"><StatCard label="Kode Akses" value={`${data.stats.totalCodes}`} subValue="Kode aktif" icon={<KeyRound className="h-4 w-4" />} /></button>
                  <button type="button" onClick={() => handleSelectTab("game-builder")} className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]"><StatCard label="Soal & Kosakata" value={`${data.stats.totalQuizQuestions + data.stats.totalFlashcards}`} subValue="Item latihan" icon={<Gamepad2 className="h-4 w-4" />} /></button>
                  <button type="button" onClick={() => handleSelectTab("payments")} className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]"><StatCard label="Pendapatan" value={`${formatIDR(data.stats.totalRevenueIdr)}`} subValue="Akses kelas" icon={<CreditCard className="h-4 w-4" />} /></button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                  <section className="rounded-xl border border-rule bg-paper-light p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-leaf">Ikhtisar kegiatan</h2>
                    <p className="mt-1 text-sm text-muted">Status utama yang membantu Anda menentukan pekerjaan berikutnya.</p>
                    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      <div><dt className="text-xs text-muted">Kelas</dt><dd className="mt-1 text-xl font-extrabold tabular-nums">{data.classes?.length ?? 0}</dd></div>
                      <div><dt className="text-xs text-muted">Login kode akses</dt><dd className="mt-1 text-xl font-extrabold tabular-nums">{data.stats.totalWarga ?? 0}</dd></div>
                      <div><dt className="text-xs text-muted">Menunggu moderasi</dt><dd className={`mt-1 text-xl font-extrabold tabular-nums ${(data.stats.pendingTestimoni ?? 0) > 0 ? "rounded-lg bg-[#fbe3d8] px-2 text-[#8f2f1b]" : ""}`}>{data.stats.pendingTestimoni ?? 0}</dd></div>
                    </dl>
                  </section>
                  <section className="rounded-xl border border-rule bg-paper-light p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-leaf">Pintasan kerja</h2>
                    <p className="mt-1 text-sm text-muted">Buka alur yang paling sering dipakai pengurus.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ["classes", "Kelola kelas"],
                        ["sessions", "Buat sesi tatap muka"],
                        ["game-builder", "Buat kuis"],
                      ].map(([id, label]) => <button key={id} type="button" onClick={() => handleSelectTab(id as TabType)} className="inline-flex min-h-11 items-center rounded-lg border border-rule bg-white px-3 py-2 text-sm font-bold text-leaf transition-colors hover:border-forest hover:bg-forest-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tomato">{label}</button>)}
                    </div>
                  </section>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-xl border border-rule bg-paper-light p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-leaf">Sesi Tatap Muka Terdekat</h2><p className="mt-1 text-sm text-muted">Jadwal sesi yang masih berlangsung atau akan datang.</p></div><button type="button" onClick={() => handleSelectTab("sessions")} className="min-h-11 shrink-0 rounded-lg border border-rule bg-white px-3 text-sm font-bold text-leaf">Buka sesi</button></div>
                    <ul className="mt-4 divide-y divide-rule">{(data.dashboardSessions || []).slice(0, 4).map((session: any) => <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-bold text-ink">{session.title}</span><time className="text-muted">{session.startsAt ? new Date(session.startsAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Dibuka langsung"}</time></li>)}</ul>
                    {!data.dashboardSessions?.length && <p className="mt-4 rounded-lg bg-white px-3 py-4 text-sm text-muted">Belum ada sesi aktif atau terjadwal.</p>}
                  </section>
                  <section className="rounded-xl border border-rule bg-paper-light p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-leaf">Aktivitas &amp; Pendaftaran Terbaru</h2><p className="mt-1 text-sm text-muted">Perubahan terbaru dari peserta dan sesi kelas.</p></div><button type="button" onClick={() => handleSelectTab("codes")} className="min-h-11 shrink-0 rounded-lg border border-rule bg-white px-3 text-sm font-bold text-leaf">Lihat peserta</button></div>
                    <ul className="mt-4 divide-y divide-rule">{(data.recentActivity || []).slice(0, 5).map((activity: any) => <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong className="text-ink">{activity.name || "Peserta"}</strong><span className="ml-2 text-muted">{activity.kind}</span></span><time className="text-xs text-muted">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}</time></li>)}</ul>
                    {!data.recentActivity?.length && <p className="mt-4 rounded-lg bg-white px-3 py-4 text-sm text-muted">Belum ada aktivitas terbaru.</p>}
                  </section>
                </div>
              </section>
            )}

            {toast && (
              <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${toast.includes("izin database Supabase") ? "border-amber-300 bg-amber-50 text-amber-950" : "border-[#E5E7EB] bg-white text-[#14532D]"}`}>
                {toast.includes("izin database Supabase") ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#14532D]" />}
                {toast}
              </div>
            )}

      {tab === "classes" && (
        <AdminClassesManager modules={data.modules || []} notify={notify} />
      )}

      {tab === "warga" && (
        <AdminWargaManager
          warga={data.warga || []}
          stats={data.stats}
          onRefresh={fetchOverview}
          notify={notify}
        />
      )}

      {tab === "testimoni" && (
        <AdminTestimoniManager testimoni={data.testimoni || []} onRefresh={fetchOverview} notify={notify} />
      )}

      {tab === "codes" && (
        <AdminCodesManager
          data={data}
          onRefresh={fetchOverview}
          notify={notify}
        />
      )}

      {tab === "game-builder" && (
        <GameBuilderClient notify={notify} />
      )}

      {tab === "sessions" && <ClassSessionManager />}


      {tab === "public" && (
        <section aria-labelledby="public-site-empty-title" className="rounded-2xl border border-rule bg-paper-light px-5 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-soft text-leaf">
            <ExternalLink aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 id="public-site-empty-title" className="mt-4 text-xl font-bold text-leaf">Situs publik siap dikunjungi</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Tab ini tidak memiliki pengaturan tersendiri. Buka halaman utama untuk melihat situs seperti yang dilihat pengunjung.
          </p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-earth px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-tomato-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tomato">
            Kunjungi situs publik
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      )}

        {tab === "payments" && (
          <PaymentsTab
            data={data}
            isDev={isDev}
            manualName={manualName}
            setManualName={setManualName}
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            manualPlanId={manualPlanId}
            setManualPlanId={setManualPlanId}
            manualDurationDays={manualDurationDays}
            setManualDurationDays={setManualDurationDays}
            savingManualGrant={savingManualGrant}
            setSavingManualGrant={setSavingManualGrant}
            handleGrantManualAccess={handleGrantManualAccess}
            handleSubAction={handleSubAction}
            handleDeleteSub={handleDeleteSub}
            fetchOverview={fetchOverview}
            notify={notify}
          />
        )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string; value: string; subValue?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FDFBF7] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A2E1A]/60">{label}</p>
        <span className="rounded-md border border-[#E5E7EB] bg-white p-1.5 text-[#14532D]">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-[#1A2E1A]">{value}</p>
      {subValue && <p className="mt-0.5 text-[11px] text-[#1A2E1A]/65">{subValue}</p>}
    </div>
  );
}

function PaymentsTab(props: any) {
  const dialog = useAppDialog();
  const { data, isDev, manualName, setManualName, manualEmail, setManualEmail, manualPlanId, setManualPlanId, manualDurationDays, setManualDurationDays, savingManualGrant, setSavingManualGrant, handleGrantManualAccess, handleSubAction, handleDeleteSub, fetchOverview, notify } = props;
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800"><CreditCard className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">Pembayaran online belum dibuka</span></div>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">Untuk sementara, pengurus dapat membantu peserta mendapatkan akses materi melalui formulir pemberian akses manual di bawah ini.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-base font-extrabold text-slate-900 mb-1">Beri Akses Kelas Manual (Admin Grant)</h2>
        <p className="text-xs text-slate-500 mb-4">Akses kelas berlaku permanen berdasarkan email peserta.</p>
        <form onSubmit={handleGrantManualAccess} className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Pengguna</label><input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Contoh: Rina Anggraini" required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label><input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="rina@example.com" required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Pilih Kelas</label><select required value={manualPlanId} onChange={(e) => setManualPlanId(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none"><option value="">Pilih kelas</option>{(data.classes || []).filter((item: ClassItem) => item.isPublished).map((item: ClassItem) => <option key={item.id} value={item.id}>{item.title} · {item.priceIdr ? formatIDR(item.priceIdr) : "Gratis"}</option>)}</select></div>
          <button type="submit" disabled={savingManualGrant} className="min-h-11 rounded-xl bg-[#14532D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0f3d21] disabled:bg-slate-300 transition">{savingManualGrant ? "Menyimpan..." : "+ Berikan Akses Kelas"}</button>
        </form>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-lg font-extrabold text-slate-900">Riwayat Pembayaran & Akses Kelas ({(data.enrollments || []).length})</h2>
        <div className="mt-4">
          <ResponsiveTable
            rows={data.enrollments || []}
            getRowKey={(enrollment: ClassEnrollment) => enrollment.id}
            ariaLabel="Riwayat pembayaran dan akses kelas"
            emptyMessage="Belum ada akses kelas yang tercatat. Berikan akses permanen melalui formulir di atas."
            tableMinWidthClassName="min-w-[920px]"
            tableClassName="text-xs sm:text-sm text-slate-700"
            columns={[
              { id: "participant", label: "Peserta", render: (enrollment: ClassEnrollment) => <><p className="font-bold text-slate-900">{enrollment.userName}</p><p className="break-words text-xs text-slate-500">{enrollment.userEmail}</p></> },
              { id: "class", label: "Kelas Dibeli", cellClassName: "font-semibold text-slate-800", render: (enrollment: ClassEnrollment) => (data.classes || []).find((item: ClassItem) => item.id === enrollment.classId)?.title || enrollment.classId },
              { id: "amount", label: "Nominal / Biaya", render: (enrollment: ClassEnrollment) => enrollment.paidAmountIdr ? formatIDR(enrollment.paidAmountIdr) : "Gratis" },
              { id: "date", label: "Tanggal Transaksi", render: (enrollment: ClassEnrollment) => new Date(enrollment.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
              { id: "actions", label: "Aksi", action: true, render: (enrollment: ClassEnrollment) => <div className="flex flex-wrap gap-2 md:justify-end"><button type="button" onClick={async () => { if (!(await dialog.confirm(`Cabut akses ${enrollment.userName} ke kelas ini?`, "Cabut akses kelas?"))) return; const response = await fetch("/api/admin/enrollments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: enrollment.id, action: "revoke" }) }); if (response.ok) { notify("Akses kelas dicabut."); fetchOverview(); } }} className="min-h-11 rounded-lg bg-[#fff2ec] px-3 text-xs font-bold text-[#943520] hover:bg-[#f9e1d8]">Cabut Akses</button><button type="button" onClick={async () => { if (!(await dialog.confirm("Hapus catatan akses ini secara permanen?", "Hapus catatan?"))) return; const response = await fetch(`/api/admin/enrollments?id=${encodeURIComponent(enrollment.id)}`, { method: "DELETE" }); if (response.ok) { notify("Catatan akses dihapus."); fetchOverview(); } }} className="min-h-11 rounded-lg border border-[#c9bda7] px-3 text-xs font-bold text-slate-700 hover:bg-[#f6f1e8]">Hapus</button></div> },
            ]}
          />
        </div>
      </div>

      {isDev && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-white">
          <h2 className="text-lg font-extrabold text-amber-300">Panel Diagnostik Khusus Role Developer</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl bg-white/5 p-4"><p className="text-slate-400">Mode Database</p><p className="mt-1 font-bold text-white">{data.diagnostics.supabaseUrl}</p></div>
            <div className="rounded-xl bg-white/5 p-4"><p className="text-slate-400">Private Storage Materi</p><p className="mt-1 font-bold text-emerald-300">{data.diagnostics.privateStorageMode}</p></div>
            <div className="rounded-xl bg-white/5 p-4"><p className="text-slate-400">Payment Gateway</p><p className="mt-1 font-bold text-amber-300">Midtrans ({data.diagnostics.midtransEnvironment})</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
            <span>Siap dihubungkan ke Supabase & Midtrans cukup dengan menyalin <code>.env.example</code> menjadi <code>.env.local</code> dan menjalankan <code>supabase/schema.sql</code>.</span>
            <button type="button" onClick={async () => { if (!(await dialog.confirm("Reset seluruh data lokal kembali ke data awal?", "Reset data demo?"))) return; await fetch("/api/admin/overview", { method: "POST" }); notify("Database lokal di-reset ke data awal."); fetchOverview(); }} className="rounded-xl bg-rose-600 px-4 py-2 font-extrabold text-white hover:bg-rose-500">Reset Data Demo</button>
          </div>
        </div>
      )}
    </div>
  );
}


