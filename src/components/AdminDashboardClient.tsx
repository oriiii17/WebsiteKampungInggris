"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  MessageSquare,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Radio,
} from "lucide-react";
import {
  ModuleItem,
  AccessCode,
  SubscriptionRecord,
  QuizQuestion,
  FlashcardItem,
  MatchingPair,
  WordChallenge,
  WargaRecord,
  LoginLogEntry,
  TestimoniRecord,
  ClassItem,
  ClassEnrollment,
  SessionPayload,
} from "@/lib/types";
import AdminWargaManager from "@/components/admin/AdminWargaManager";
import AdminTestimoniManager from "@/components/admin/AdminTestimoniManager";
import AdminClassesManager from "@/components/admin/AdminClassesManager";
import AdminHostGameTab from "@/components/admin/AdminHostGameTab";
import AdminGameManager from "@/components/admin/AdminGameManager";
import { getMockOverviewData } from "@/lib/mock-data";

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
    activeDevices: number;
    activeSubscribers: number;
    totalRevenueIdr: number;
    totalQuizQuestions: number;
    totalFlashcards: number;
    totalWarga?: number;
    wargaRw06?: number;
    wargaRw07?: number;
    wargaRw08?: number;
    activeToday?: number;
    activeThisWeek?: number;
    mostPlayedGame?: string;
    totalTestimoni?: number;
    pendingTestimoni?: number;
  };
  modules: ModuleItem[];
  accessCodes: AccessCode[];
  subscriptions: SubscriptionRecord[];
  quizzes: QuizQuestion[];
  flashcards: FlashcardItem[];
  matchingPairs: MatchingPair[];
  wordChallenges: WordChallenge[];
  warga?: WargaRecord[];
  loginLog?: LoginLogEntry[];
  rwCodes?: Array<{
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
  plans?: Array<{ id: string; name: string; priceIdr: number; durationDays: number }>;
}

const exportTypes = [
  { value: "all", label: "Semua Data (Lengkap)", icon: <Database className="h-3.5 w-3.5 text-gray-400" /> },
  { value: "warga", label: "Warga Sapen & Log Login", icon: <Users className="h-3.5 w-3.5 text-gray-400" /> },
  { value: "external-users", label: "Peserta Umum & Langganan", icon: <UserPlus className="h-3.5 w-3.5 text-gray-400" /> },
  { value: "enrollments", label: "Pendaftaran Kelas", icon: <GraduationCap className="h-3.5 w-3.5 text-gray-400" /> },
  { value: "leaderboard", label: "Leaderboard Kuis", icon: <Trophy className="h-3.5 w-3.5 text-gray-400" /> },
  { value: "access-codes", label: "Kode Akses & Perangkat", icon: <KeyRound className="h-3.5 w-3.5 text-gray-400" /> },
] as const;

export default function AdminDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["classes", "warga", "testimoni", "codes", "games", "game-builder", "public", "payments"] as const;
  type TabType = (typeof validTabs)[number];

  const paramTab = searchParams.get("tab") as TabType | null;
  const initialTab = paramTab && validTabs.includes(paramTab) ? paramTab : "classes";

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");
  const [exportType, setExportType] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // State Kode Akses Warga
  const [codeValue, setCodeValue] = useState("QTU-OP3");
  const [codeLabel, setCodeLabel] = useState("");
  const [codeRtRw, setCodeRtRw] = useState("RT 01 / RW 06");
  const [holderType, setHolderType] = useState<"keluarga" | "individu">("keluarga");
  const [maxDevices, setMaxDevices] = useState(4);
  const [validDays, setValidDays] = useState(365);
  const [savingCode, setSavingCode] = useState(false);

  // State Manual Subscription Grant
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPlanId, setManualPlanId] = useState("bulanan");
  const [manualDurationDays, setManualDurationDays] = useState(30);
  const [savingManualGrant, setSavingManualGrant] = useState(false);

  useEffect(() => {
    const qTab = searchParams.get("tab") as TabType | null;
    if (qTab && validTabs.includes(qTab) && qTab !== tab) {
      setTab(qTab);
    }
  }, [searchParams, tab]);

  function handleSelectTab(nextTab: TabType) {
    setTab(nextTab);
    setSidebarOpen(false);
    router.push(`/admin?tab=${nextTab}`, { scroll: false });
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 4000);
  };

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(getMockOverviewData());
      }
    } catch {
      setData(getMockOverviewData());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // (legacy module/game state removed; kuis live dipisah ke tab Host Kuis / Game)

  const handleExport = async () => {
    const params = new URLSearchParams({ type: exportType, format: exportFormat });
    try {
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengekspor data");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `sapen-export-${new Date().toISOString().slice(0, 10)}.${exportFormat === "excel" ? "xlsx" : "csv"}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      const typeLabel = exportTypes.find((t) => t.value === exportType)?.label || exportType;
      notify(`Berhasil ekspor ${typeLabel} ke ${exportFormat.toUpperCase()}!`);
    } catch (err) {
      alert("Gagal mengekspor data: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  function generateRandomCode() {
    const num = Math.floor(100 + Math.random() * 900);
    const rt = codeRtRw.match(/\d+/)?.[0]?.padStart(2, "0") || "01";
    setCodeValue(`SAPEN-RT${rt}-${num}`);
  }

  async function handleCreateCode(e: React.FormEvent) {
    e.preventDefault();
    setSavingCode(true);
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeValue, label: codeLabel, rtRw: codeRtRw, holderType, maxDevices, validDays }),
    });
    const out = await res.json();
    setSavingCode(false);
    if (!res.ok) { alert(out.error || "Gagal membuat kode."); return; }
    setCodeLabel("");
    generateRandomCode();
    notify(`Kode akses ${out.code.code} berhasil dibuat!`);
    fetchOverview();
  }

  async function handleCodeAction(codeId: string, action: "toggle" | "reset_devices" | "delete") {
    await fetch("/api/admin/codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codeId, action }) });
    notify("Data kode akses diperbarui.");
    fetchOverview();
  }

  function buildWhatsAppShareUrl(ac: AccessCode) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `Halo *${ac.label}* (${ac.rtRw})! \n\nBerikut *Kode Akses Gratis* belajar Bahasa Inggris di Website *Kampung Inggris Sapen*:\n\nKode Akses: *${ac.code}*\nKuota: Maksimal ${ac.maxDevices} perangkat\nBerlaku s/d: ${new Date(ac.expiresAt).toLocaleDateString("id-ID")}\n\nCara masuk:\n1. Buka ${origin}/masuk?tab=warga\n2. Ketik Nama Panggilan & Kode *${ac.code}*\n3. Langsung baca semua modul Flipbook & mainkan Quiz!\n\nSalam hangat,\nPengurus Kampung Sapen`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  async function handleGrantManualAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) { alert("Nama dan email wajib diisi."); return; }
    setSavingManualGrant(true);
    try {
      const res = await fetch("/api/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userName: manualName, userEmail: manualEmail, planId: manualPlanId, durationDays: manualDurationDays }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memberikan akses.");
      notify(`Akses materi berhasil diberikan kepada ${manualName}!`);
      setManualName(""); setManualEmail(""); fetchOverview();
    } catch (err: any) { alert(err.message); } finally { setSavingManualGrant(false); }
  }

  async function handleSubAction(id: string, action: "toggle" | "extend30") {
    const res = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (res.ok) { notify("Status langganan diperbarui."); fetchOverview(); }
  }

  async function handleDeleteSub(id: string) {
    if (!confirm("Hapus data langganan ini?")) return;
    const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) { notify("Langganan dihapus."); fetchOverview(); }
  }

  if (loading || !data) {
    return <div className="bg-[#FDFBF7] p-16 text-center text-sm font-bold text-[#1A2E1A]/70">Memuat Dashboard Pengurus Kampung Inggris Sapen...</div>;
  }

  const isDev = data.session.role === "developer";

  const roleLabel = "Pengurus";

  const navGroups = [
    {
      title: "Kelola",
      items: [
        { id: "classes" as const, label: "Kelas", icon: GraduationCap },
        { id: "codes" as const, label: "Kelola Akses Peserta", icon: KeyRound },
        { id: "game-builder" as const, label: "Kelola Game", icon: Gamepad2 },
        { id: "games" as const, label: "Host Kuis / Game", icon: Radio },
        { id: "public" as const, label: "Situs Publik", icon: ExternalLink, href: "/" },
        { id: "payments" as const, label: "Pembayaran", icon: CreditCard },
      ],
    },
  ];

  const sidebar = (
    <aside className="flex h-full w-[250px] flex-col border-r border-[#E5E7EB] bg-white">
      <div className="border-b border-[#E5E7EB] px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#14532D] text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#1A2E1A]">Kampung Inggris Sapen</p>
            <p className="text-[11px] font-semibold text-[#1A2E1A]/60">Panel Pengurus</p>
          </div>
        </Link>
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
                  <button key={item.id} type="button" onClick={() => handleSelectTab(item.id)} className={cls}>
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
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A2E1A]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:block">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-[#1A2E1A]/20" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-[250px]">{sidebar}</div>
        </div>
      )}

      <div className="md:pl-[250px]">
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white">
          <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#E5E7EB] text-[#1A2E1A] md:hidden" aria-label="Buka menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-black text-[#1A2E1A]">Kampung Inggris Sapen</p>
                <p className="text-[11px] text-[#1A2E1A]/60">Dashboard Pengurus</p>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2.5 py-1 text-xs font-bold text-[#14532D]">{roleLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={fetchOverview} className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7]">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Muat Ulang</span>
              </button>
              <div className="relative">
                <button type="button" onClick={() => setShowExport(!showExport)} className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7]">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Ekspor</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showExport && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[240px] rounded-xl border border-[#E5E7EB] bg-white">
                    <div className="p-2">
                      <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#1A2E1A]/60">Format</p>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-[#1A2E1A] hover:bg-[#FDFBF7]"><input type="radio" name="exportFormat" checked={exportFormat === "excel"} onChange={() => setExportFormat("excel")} className="text-[#14532D]" /><FileSpreadsheet className="h-3.5 w-3.5 text-[#14532D]" />Excel (.xlsx)</label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-[#1A2E1A] hover:bg-[#FDFBF7]"><input type="radio" name="exportFormat" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} className="text-[#14532D]" /><FileText className="h-3.5 w-3.5 text-[#14532D]" />CSV (.csv)</label>
                    </div>
                    <div className="border-t border-[#E5E7EB]" />
                    <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#1A2E1A]/60">Jenis Data</p>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {exportTypes.map((t) => (
                        <label key={t.value} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-[#1A2E1A] hover:bg-[#FDFBF7]"><input type="radio" name="exportType" checked={exportType === t.value} onChange={() => { setExportType(t.value); setShowExport(false); handleExport(); }} className="text-[#14532D]" />{t.icon}<span>{t.label}</span></label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7]">
                <LogOut className="h-4 w-4 text-[#14532D]" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2E1A] sm:text-[30px]">Dashboard Pengelolaan Kampung Inggris Sapen</h1>
              <p className="mt-1 text-sm leading-relaxed text-[#1A2E1A]/75">Kelola kelas, akses peserta, kuis live, situs publik, dan pembayaran dari sidebar.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Modul Aktif" value={`${data.stats.totalModules}`} subValue="Flipbook terbit" icon={<BookOpen className="h-4 w-4" />} />
              <StatCard label="Kode Akses" value={`${data.stats.totalCodes}`} subValue={`${data.stats.activeDevices} perangkat aktif`} icon={<KeyRound className="h-4 w-4" />} />
              <StatCard label="Soal & Kosakata" value={`${data.stats.totalQuizQuestions + data.stats.totalFlashcards}`} subValue="Item latihan" icon={<Gamepad2 className="h-4 w-4" />} />
              <StatCard label="Pendapatan" value={`Rp ${data.stats.totalRevenueIdr.toLocaleString("id-ID")}`} subValue="Langganan umum" icon={<CreditCard className="h-4 w-4" />} />
            </div>

            {toast && (
              <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#14532D]">
                <CheckCircle2 className="h-5 w-5 text-[#14532D]" />
                {toast}
              </div>
            )}

      {tab === "classes" && (
        <AdminClassesManager modules={data.modules || []} notify={notify} />
      )}

      {tab === "warga" && (
        <AdminWargaManager
          warga={data.warga || []}
          rwCodes={data.rwCodes || []}
          loginLog={data.loginLog || []}
          stats={data.stats}
          onRefresh={fetchOverview}
          notify={notify}
        />
      )}

      {tab === "testimoni" && (
        <AdminTestimoniManager testimoni={data.testimoni || []} onRefresh={fetchOverview} notify={notify} />
      )}

      {tab === "codes" && (
        <CodesTab
          data={data}
          codeValue={codeValue}
          setCodeValue={setCodeValue}
          codeLabel={codeLabel}
          setCodeLabel={setCodeLabel}
          codeRtRw={codeRtRw}
          setCodeRtRw={setCodeRtRw}
          holderType={holderType}
          setHolderType={setHolderType}
          maxDevices={maxDevices}
          setMaxDevices={setMaxDevices}
          validDays={validDays}
          setValidDays={setValidDays}
          savingCode={savingCode}
          setSavingCode={setSavingCode}
          generateRandomCode={generateRandomCode}
          handleCreateCode={handleCreateCode}
          handleCodeAction={handleCodeAction}
          buildWhatsAppShareUrl={buildWhatsAppShareUrl}
          notify={notify}
        />
      )}

      {tab === "game-builder" && (
        <AdminGameManager notify={notify} />
      )}

      {tab === "games" && (
        <AdminHostGameTab notify={notify} />
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

function CodesTab(props: any) {
  const { data, codeValue, setCodeValue, codeLabel, setCodeLabel, codeRtRw, setCodeRtRw, holderType, setHolderType, maxDevices, setMaxDevices, validDays, setValidDays, savingCode, setSavingCode, generateRandomCode, handleCreateCode, handleCodeAction, buildWhatsAppShareUrl, notify } = props;
  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <form onSubmit={handleCreateCode} className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Plus className="h-5 w-5 text-[#14532D]" /> Buat Kode Akses Warga Baru
          </h2>
          <p className="text-xs text-slate-500">Buat 1 kode per Kepala Keluarga (KK) atau per warga, lalu bagikan langsung ke WhatsApp warga.</p>
          <div>
            <label className="block text-xs font-bold text-slate-700">Nama Keluarga / Warga Penerima</label>
            <input type="text" required value={codeLabel} onChange={(e) => setCodeLabel(e.target.value)} placeholder="Contoh: Keluarga Bpk. Hendra" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-[#14532D] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Wilayah RT / RW</label>
              <input type="text" value={codeRtRw} onChange={(e) => setCodeRtRw(e.target.value)} placeholder="RT 01 / RW 02" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-[#14532D] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Tipe Pemegang</label>
              <select value={holderType} onChange={(e) => setHolderType(e.target.value as "keluarga" | "individu")} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold">
                <option value="keluarga">Per Keluarga (KK)</option>
                <option value="individu">Per Orang</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Kode Unik</label>
              <button type="button" onClick={generateRandomCode} className="text-xs font-bold text-[#14532D] underline">Acak Kode Otomatis</button>
            </div>
            <input type="text" required value={codeValue} onChange={(e) => setCodeValue(e.target.value.toUpperCase())} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-extrabold uppercase tracking-wider focus:border-[#14532D] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Batas Perangkat (HP/Laptop)</label>
              <input type="number" min={1} max={50} value={maxDevices} onChange={(e) => setMaxDevices(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Masa Berlaku</label>
              <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold">
                <option value={30}>1 Bulan (30 Hari)</option>
                <option value={90}>3 Bulan (90 Hari)</option>
                <option value={180}>6 Bulan</option>
                <option value={365}>1 Tahun Penuh</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={savingCode} className="w-full rounded-xl bg-[#F59E0B] py-3.5 text-sm font-extrabold text-gray-900 hover:bg-[#d97706] transition disabled:opacity-60">
            {savingCode ? "Menyimpan..." : "Simpan & Buat Kode Warga"}
          </button>
        </form>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <Users className="h-5 w-5 text-[#14532D]" />
          Daftar Kode Akses Warga ({data.accessCodes.length})
        </h2>
        {data.accessCodes.map((ac: any) => (
          <div key={ac.id} className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-sm font-extrabold text-[#14532D] border border-emerald-200">{ac.code}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ac.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{ac.isActive ? "Aktif" : "Nonaktif"}</span>
                  <span className="text-xs font-semibold text-slate-500">{ac.rtRw}</span>
                </div>
                <h3 className="mt-2 text-base font-extrabold text-slate-900">{ac.label}</h3>
                <p className="text-xs text-slate-500">Perangkat terpakai: <strong>{ac.devices.length} / {ac.maxDevices} perangkat</strong> â€¢ Berlaku s/d {new Date(ac.expiresAt).toLocaleDateString("id-ID")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { navigator.clipboard.writeText(ac.code); notify(`Kode ${ac.code} disalin!`); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Copy className="h-3.5 w-3.5" /> Salin</button>
                <a href={buildWhatsAppShareUrl(ac)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#14532D] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#0f3d21]"><Send className="h-3.5 w-3.5" /> Kirim WhatsApp</a>
              </div>
            </div>
            {ac.devices.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>Pemakai:</strong> {ac.devices.map((d: any) => `${d.participantName} (${d.deviceLabel})`).join(", ")}</div>}
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs font-bold">
              <button type="button" onClick={() => handleCodeAction(ac.id, "toggle")} className="text-slate-600 hover:text-slate-900 underline">{ac.isActive ? "Nonaktifkan Sementara" : "Aktifkan Kembali"}</button>
              {ac.devices.length > 0 && <button type="button" onClick={() => handleCodeAction(ac.id, "reset_devices")} className="text-amber-700 hover:text-amber-900 underline">Reset Perangkat ({ac.devices.length})</button>}
              <button type="button" onClick={() => handleCodeAction(ac.id, "delete")} className="text-rose-600 hover:text-rose-800 underline">Hapus Kode</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab(props: any) {
  const { data, isDev, manualName, setManualName, manualEmail, setManualEmail, manualPlanId, setManualPlanId, manualDurationDays, setManualDurationDays, savingManualGrant, setSavingManualGrant, handleGrantManualAccess, handleSubAction, handleDeleteSub, fetchOverview, notify } = props;
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800"><CreditCard className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">Feature Flag: PAYMENT_ENABLED = false</span><span className="text-xs text-amber-800 font-medium">(Pembayaran Otomatis Segera Dibuka)</span></div>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">Semua tombol pembayaran di halaman publik saat ini berstatus dinonaktifkan dengan label <strong>"Pembayaran segera dibuka"</strong>. Anda dapat memberikan akses materi secara manual kepada murid atau pengguna umum tertentu menggunakan form di bawah ini.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-base font-extrabold text-slate-900 mb-1">Beri Akses Materi Manual (Admin Grant)</h2>
        <p className="text-xs text-slate-500 mb-4">Gunakan form ini untuk mengaktifkan akses modul berbayar bagi murid les umum atau donatur.</p>
        <form onSubmit={handleGrantManualAccess} className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Pengguna</label><input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Contoh: Rina Anggraini" required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label><input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="rina@example.com" required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Durasi Akses</label><select value={manualDurationDays} onChange={(e) => setManualDurationDays(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none"><option value={30}>30 Hari (1 Bulan)</option><option value={90}>90 Hari (3 Bulan)</option><option value={180}>180 Hari (6 Bulan)</option><option value={365}>365 Hari (1 Tahun)</option></select></div>
          <button type="submit" disabled={savingManualGrant} className="rounded-xl bg-[#14532D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0f3d21] disabled:bg-slate-300 transition">{savingManualGrant ? "Menyimpan..." : "+ Berikan Akses Materi"}</button>
        </form>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-lg font-extrabold text-slate-900">Riwayat Pembayaran & Langganan Peserta Umum ({data.subscriptions.length})</h2>
        {data.subscriptions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Belum ada transaksi dari pengunjung luar kampung. Anda dapat menambahkan akses manual di atas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-2.5 pr-4">Order ID</th><th className="py-2.5 pr-4">Peserta</th><th className="py-2.5 pr-4">Paket</th><th className="py-2.5 pr-4">Metode</th><th className="py-2.5 pr-4">Berlaku S/d</th><th className="py-2.5 pr-4">Status</th><th className="py-2.5 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{data.subscriptions.map((s: any) => <tr key={s.id}><td className="py-3 pr-4 font-mono text-xs text-slate-500">{s.orderId}</td><td className="py-3 pr-4"><p className="font-bold text-slate-900">{s.userName}</p><p className="text-xs text-slate-500">{s.userEmail}</p></td><td className="py-3 pr-4 font-semibold text-slate-800">{s.planName}</td><td className="py-3 pr-4 text-xs text-slate-600">{s.paymentMethod}</td><td className="py-3 pr-4 text-xs text-slate-600">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("id-ID") : "â€”"}</td><td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{s.status === "active" ? "Aktif" : s.status}</span></td><td className="py-3 text-right space-x-1.5 whitespace-nowrap"><button type="button" onClick={() => handleSubAction(s.id, "extend30")} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100" title="Perpanjang 30 hari">+30 Hari</button><button type="button" onClick={() => handleSubAction(s.id, "toggle")} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200">{s.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button><button type="button" onClick={() => handleDeleteSub(s.id)} className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100">Hapus</button></td></tr>)}</tbody>
            </table>
          </div>
        )}
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
            <button type="button" onClick={async () => { if (!confirm("Reset seluruh data lokal kembali ke data awal?")) return; await fetch("/api/admin/overview", { method: "POST" }); notify("Database lokal di-reset ke data awal."); fetchOverview(); }} className="rounded-xl bg-rose-600 px-4 py-2 font-extrabold text-white hover:bg-rose-500">Reset Data Demo</button>
          </div>
        </div>
      )}
    </div>
  );
}


