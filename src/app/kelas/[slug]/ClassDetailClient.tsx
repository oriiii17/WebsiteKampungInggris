"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Gamepad2, Lock, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ClassItem, ModuleItem, SessionPayload } from "@/lib/types";
import type { GameBlueprint } from "@/lib/game-blueprint";
import ClassAccessAction from "@/components/ClassAccessAction";
import { formatIDR } from "@/lib/currency";
import { clearAuthBrowserStorage } from "@/lib/session-sync";

interface Props {
  classItem: ClassItem;
  includedModules: ModuleItem[];
  isEnrolled: boolean;
  sessionUser: SessionPayload | null;
  independentGameCount: number;
}

export default function ClassDetailClient({ classItem, includedModules, isEnrolled, sessionUser, independentGameCount }: Props) {
  const router = useRouter();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceGames, setPracticeGames] = useState<GameBlueprint[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [practiceCount, setPracticeCount] = useState(independentGameCount);
  const [practiceCountLoading, setPracticeCountLoading] = useState(true);
  const [practiceCountError, setPracticeCountError] = useState("");
  const [practiceCountAttempt, setPracticeCountAttempt] = useState(0);
  const [leavingAsGuest, setLeavingAsGuest] = useState(false);
  const [leaveGuestError, setLeaveGuestError] = useState("");
  const [accessRevoked, setAccessRevoked] = useState(false);
  const resolvedSession = sessionUser;
  const [hasClassAccess, setHasClassAccess] = useState(isEnrolled);
  const isGuest = resolvedSession?.role === "guest" || resolvedSession?.origin === "guest";
  const isWarga = resolvedSession?.origin === "warga_kode";
  const inClassSession = Boolean(resolvedSession?.guestSessionId);
  const watchAccountAccess = Boolean(resolvedSession?.email && !inClassSession && !isWarga && hasClassAccess);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setPracticeCountLoading(true);
    setPracticeCountError("");
    fetch(`/api/classes/${encodeURIComponent(classItem.id)}/practice-count`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Jumlah latihan belum dapat dimuat.");
        if (active) setPracticeCount(Number(data.count) || 0);
      })
      .catch(() => { if (active) setPracticeCountError("Jumlah latihan belum dapat dimuat. Periksa koneksi lalu coba lagi."); })
      .finally(() => { window.clearTimeout(timeout); if (active) setPracticeCountLoading(false); });
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [classItem.id, practiceCountAttempt]);

  useEffect(() => {
    if (!watchAccountAccess) return;
    let active = true;
    let pending = false;
    const checkAccess = async () => {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch(`/api/auth/session?scope=class-access&classId=${encodeURIComponent(classItem.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && data.hasAccess === false) setAccessRevoked(true);
      } catch { /* A temporary failure must not remove access locally. */ }
      finally { pending = false; }
    };
    void checkAccess();
    const timer = window.setInterval(() => void checkAccess(), 45000);
    window.addEventListener("focus", checkAccess);
    document.addEventListener("visibilitychange", checkAccess);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", checkAccess); document.removeEventListener("visibilitychange", checkAccess); };
  }, [classItem.id, watchAccountAccess]);
  useEffect(() => {
    if (!practiceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPracticeOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [practiceOpen]);

  async function openIndependentPractice() {
    setPracticeOpen(true);
    setPracticeLoading(true);
    setPracticeError("");
    try {
      const response = await fetch(`/api/games?purpose=independent&classId=${encodeURIComponent(classItem.id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Latihan mandiri belum dapat dimuat.");
      setPracticeGames(data.games || []);
    } catch (error) {
      setPracticeError(error instanceof Error ? error.message : "Latihan mandiri belum dapat dimuat.");
    } finally {
      setPracticeLoading(false);
    }
  }
  async function leaveClassSession() {
    if (leavingAsGuest) return;
    setLeavingAsGuest(true);
    setLeaveGuestError("");
    try {
      const response = isGuest
        ? await fetch("/api/auth/session?scope=guest", { method: "DELETE", cache: "no-store" })
        : await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear_class_session" }), cache: "no-store" });
      if (!response.ok) throw new Error("Konteks sesi belum berhasil dibersihkan. Coba lagi.");
      if (isGuest) clearAuthBrowserStorage();
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      window.dispatchEvent(new CustomEvent("sapen:session-participation-changed", { detail: { status: "outside" } }));
      router.refresh();
      router.replace("/");
    } catch (error) {
      setLeaveGuestError(error instanceof Error ? error.message : "Belum dapat kembali ke beranda.");
      setLeavingAsGuest(false);
    }
  }
  const publishedModules = classItem.modules?.length
    ? classItem.modules.filter((module) => module.status === "terbit").sort((a, b) => a.urutan - b.urutan)
    : includedModules.map((module, index) => ({
        id: module.id,
        kelasId: classItem.id,
        judulBebas: module.title,
        deskripsi: module.subtitle || module.summary,
        urutan: index + 1,
        status: "terbit" as const,
        quiz: null,
      }));

  return (
    <div className="space-y-8">
      {inClassSession ? <div className="space-y-2"><Link href="/" aria-disabled={leavingAsGuest} onClick={(event) => { event.preventDefault(); if (!leavingAsGuest) void leaveClassSession(); }} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-rule bg-white px-4 py-2 text-sm font-bold text-leaf transition hover:bg-leaf-soft ${leavingAsGuest ? "pointer-events-none opacity-60" : ""}`}><ArrowLeft className="h-4 w-4" />{leavingAsGuest ? "Kembali…" : "Kembali ke Beranda"}</Link>{leaveGuestError && <p role="alert" className="text-sm font-semibold text-[#943520]">{leaveGuestError}</p>}</div> : !isGuest && <Link href="/kelas" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#244b3a] bg-white px-4 py-2 text-sm font-bold text-[#183b2d] transition hover:bg-[#e8eee5]"><ArrowLeft className="h-4 w-4" />Kembali ke Kelas</Link>}

      {accessRevoked && <div className="fixed inset-0 z-[1200] grid place-items-center bg-[#14271e]/65 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="access-revoked-title" className="w-full max-w-md rounded-2xl border border-[#d2c5ad] bg-white p-6 shadow-2xl"><h2 id="access-revoked-title" className="font-display text-2xl font-bold text-[#183b2d]">Akses kelas dicabut</h2><p className="mt-3 text-sm leading-6 text-[#3d4038]">Akses kelas {classItem.title} telah dicabut.</p><button type="button" autoFocus onClick={() => { setAccessRevoked(false); router.refresh(); }} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white">Oke</button></section></div>}

      <section className={`class-detail-hero${inClassSession ? " class-detail-hero-guest" : ""}`}>
        <div className="class-detail-copy">
          <div className="mb-4 flex flex-wrap items-center gap-2">
          {inClassSession && <span className="section-badge"><Sparkles className="h-3.5 w-3.5 text-earth" /> Akses sesi kelas</span>}
          {hasClassAccess && <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#244b3a] bg-[#244b3a] px-3 text-xs font-bold text-white"><ShieldCheck className="h-3.5 w-3.5" /> Akses Anda Aktif</span>}
          </div>
          <h1 className="mt-3 break-words text-4xl sm:text-5xl">{classItem.title}</h1>
          {classItem.subtitle && <p className="mt-2 text-base font-bold text-leaf">{classItem.subtitle}</p>}
          <p className="mt-4 w-full break-words text-base leading-7 text-body">{classItem.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-rule pt-5 text-sm text-body">
            <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-leaf" />{publishedModules.length} Bab</span>
            {!practiceCountLoading && !practiceCountError && practiceCount > 0 && <span className="inline-flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-earth" />{practiceCount} Latihan Mandiri</span>}
          </div>
        </div>
      {!inClassSession && !isWarga && !hasClassAccess && <div className="class-detail-enrollment">
          {!hasClassAccess && <div>
            <p className="workbook-print-note">{classItem.priceIdr === 0 ? "Kelas gratis" : "Biaya akses kelas"}</p>
            <p className="mt-1 font-display text-3xl">{classItem.priceIdr === 0 ? "Gratis" : formatIDR(classItem.priceIdr)}</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">{classItem.priceIdr === 0 ? "Ambil kelas untuk menyimpan aksesnya di Kelas Saya." : "Selesaikan pesanan untuk membuka akses di Kelas Saya."}</p>
          </div>}
          <ClassAccessAction classId={classItem.id} classSlug={classItem.slug} priceIdr={classItem.priceIdr} isEnrolled={false} canEnroll={Boolean(resolvedSession?.email && resolvedSession.emailVerified && resolvedSession.authUserId && ["peserta", "umum", "member"].includes(resolvedSession.role))} detail />
        </div>}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#a9b8a4] bg-[#e8eee5] p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#244b3a] text-white"><Gamepad2 className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-[#183b2d]">Latihan Mandiri</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#34472d]">Kuis Latihan Mandiri yang sudah diterbitkan dapat dimainkan kapan saja, tanpa menunggu sesi tatap muka.</p></div></div>
        {practiceCountLoading ? <span aria-label="Memuat jumlah latihan" className="inline-flex h-10 w-28 animate-pulse rounded-lg bg-white/70" /> : practiceCountError ? <div className="flex flex-wrap items-center gap-2"><span role="alert" className="text-sm text-[#7b2c1d]">Jumlah latihan belum dapat dimuat.</span><button type="button" onClick={() => setPracticeCountAttempt((attempt) => attempt + 1)} className="min-h-11 rounded-lg border border-[#244b3a] bg-white px-3 text-sm font-bold text-[#244b3a]">Coba lagi</button></div> : practiceCount === 0 ? <p className="text-sm font-medium text-[#526056]">Belum ada latihan</p> : hasClassAccess ? <button type="button" onClick={() => void openIndependentPractice()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white transition hover:bg-[#183b2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f]"><Gamepad2 className="h-4 w-4" />Pilih latihan</button> : <button type="button" disabled aria-label="Latihan Mandiri terkunci sampai Anda memiliki akses ke kelas" title="Latihan Mandiri tersedia setelah Anda memiliki akses ke kelas" className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#52685d] px-5 text-sm font-bold text-white opacity-80"><Lock aria-hidden="true" className="h-4 w-4" />Terkunci</button>}
      </section>

      <section id="bab-pelajaran" className="class-detail-section">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
          <div><h2 className="text-2xl sm:text-3xl">Bab pelajaran</h2></div>
          <span className="text-sm font-semibold text-muted">{publishedModules.length} Bab</span>
        </div>
        {publishedModules.length === 0 ? (
            <div className="sapen-empty-state text-center"><BookOpen className="mx-auto h-8 w-8 text-leaf" aria-hidden="true" /><h3 className="mt-3 text-xl">Bab sedang disiapkan</h3><p className="mt-2 text-sm leading-6 text-muted">Pengajar akan menambahkan bab pelajaran ke kelas ini.</p></div>
        ) : (
          <ol className="class-module-list">
            {publishedModules.map((module, index) => (
              <li key={module.id} className="class-module-row">
                <span className="class-module-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold">{module.judulBebas}</h3>
                  {module.deskripsi && <p className="mt-1 text-sm leading-6 text-body">{module.deskripsi}</p>}
                  {module.quiz ? <p className="mt-2 text-xs font-bold text-leaf">{module.quiz.status === "terbuka" ? "Kuis tersedia untuk dikerjakan" : "Kuis belum dibuka oleh admin"}</p> : <p className="mt-2 text-xs text-muted">Tidak ada kuis untuk bab ini</p>}
                </div>
                {hasClassAccess ? module.status === "terbit" ? (
                  <Link href={`/kelas/${classItem.slug}/modul/${module.id}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-leaf-dark">Buka Bab <ArrowRight className="h-4 w-4" /></Link>
                ) : <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted"><Lock role="img" aria-label="Bab masih berupa draf" className="h-3.5 w-3.5" />Draft</span> : <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted"><Lock role="img" aria-label="Bab terkunci sampai Anda memiliki akses ke kelas" className="h-3.5 w-3.5" /></span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {practiceOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPracticeOpen(false); }} className="fixed inset-0 z-[100] grid place-items-center bg-[#13271f]/60 p-3 sm:p-6">
        <section role="dialog" aria-modal="true" aria-labelledby="independent-practice-title" className="flex max-h-[min(88dvh,740px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-[#e2d8c7] p-5 sm:p-6"><div><h2 id="independent-practice-title" className="text-2xl font-bold text-[#183b2d]">Latihan Mandiri</h2><p className="mt-1 text-sm leading-6 text-[#514b3e]">Pilih latihan untuk mulai belajar kapan saja.</p></div><button type="button" aria-label="Tutup latihan mandiri" onClick={() => setPracticeOpen(false)} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-[#b8aa8e] bg-white text-[#244b3a] hover:bg-[#e8eee5]"><X className="h-4 w-4" /></button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{practiceLoading ? <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-semibold text-[#514b3e]"><Loader2 className="h-5 w-5 animate-spin" />Memuat latihan…</div> : practiceError ? <p role="alert" className="rounded-xl border border-[#ba472f]/30 bg-[#f2dfd6] p-4 text-sm font-semibold text-[#7b2c1d]">{practiceError}</p> : practiceGames.length ? <ul className="grid gap-3 md:grid-cols-2">{practiceGames.map((game) => <li key={game.id} className="flex min-h-44 flex-col items-start justify-between gap-4 rounded-xl border border-[#c9bda7] bg-white p-4"><div className="min-w-0"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6eadf] px-2.5 py-1 text-xs font-bold text-[#183b2d]"><CheckCircle2 className="h-3.5 w-3.5" />Terbit · Latihan Mandiri</span><h3 className="mt-3 break-words font-bold text-[#183b2d]">{game.title}</h3><p className="mt-1 text-sm text-[#514b3e]">{game.topic} · {game.level} · {game.items.length} soal</p></div><Link href={`/games/${encodeURIComponent(game.id)}?classId=${encodeURIComponent(classItem.id)}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white transition hover:bg-[#943520] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244b3a]">Mainkan sekarang<ArrowRight className="h-4 w-4" /></Link></li>)}</ul> : <div className="rounded-xl border border-dashed border-[#b8aa8e] bg-white px-5 py-8 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-[#244b3a]" /><h3 className="mt-3 font-bold text-[#183b2d]">Belum ada latihan</h3><p className="mt-1 text-sm leading-6 text-[#514b3e]">Latihan yang sudah diterbitkan pengurus akan muncul di sini dan bisa dimainkan kapan saja.</p></div>}</div>
          <footer className="flex justify-end border-t border-[#e2d8c7] bg-white/60 p-4"><button type="button" onClick={() => setPracticeOpen(false)} className="min-h-11 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a] hover:bg-[#e8eee5]">Tutup</button></footer>
        </section>
      </div>}

    </div>
  );
}
