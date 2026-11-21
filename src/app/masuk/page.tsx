"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

function MasukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/modul";
  const [mode, setMode] = useState<"umum" | "warga">(searchParams.get("mode") === "warga" ? "warga" : "umum");
  const [wargaCode, setWargaCode] = useState("");
  const [showWargaCode, setShowWargaCode] = useState(true);
  const [codePrefix, setCodePrefix] = useState("SAP");
  const [requestName, setRequestName] = useState("");
  const [requestRw, setRequestRw] = useState("06");
  const [requestRt, setRequestRt] = useState("01");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [requestSuccessOpen, setRequestSuccessOpen] = useState(false);
  const [showRequestCode, setShowRequestCode] = useState(true);
  const [umumEmail, setUmumEmail] = useState("");
  const [umumPassword, setUmumPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWargaPrompt, setShowWargaPrompt] = useState(false);
  const [wargaEmail, setWargaEmail] = useState("");
  const [wargaPassword, setWargaPassword] = useState("");
  const [wargaPasswordConfirm, setWargaPasswordConfirm] = useState("");
  const [savingWargaAccount, setSavingWargaAccount] = useState(false);
  const [wargaAccountError, setWargaAccountError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/rw-code-settings", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (active && response.ok && typeof result.prefix === "string") setCodePrefix(result.prefix);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!showRequestForm) return;
    setShowRequestCode(true);
    const timer = window.setTimeout(() => setShowRequestCode(false), 2000);
    return () => window.clearTimeout(timer);
  }, [codePrefix, requestRw, requestRt, showRequestForm]);

  useEffect(() => {
    if (!wargaCode) return;
    setShowWargaCode(true);
    const timer = window.setTimeout(() => setShowWargaCode(false), 2000);
    return () => window.clearTimeout(timer);
  }, [wargaCode]);

  async function handleWargaSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const code = wargaCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code) && !/^[A-Z0-9]{3,4}-RW0[678]-RT\d{2}$/.test(code)) {
      setError("Isi kode enam karakter lama atau format baru, misalnya SAP-RW06-RT01.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/warga-rw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Kode warga tidak dikenali.");
        setLoading(false);
        return;
      }
      setLoading(false);
      setShowWargaPrompt(true);
    } catch (requestError) {
      console.error("[login warga] Permintaan tidak mencapai server", requestError);
      setError("Server tidak terjangkau. Periksa koneksi internet lalu coba lagi.");
      setLoading(false);
    }
  }

  async function handleRequestWargaCode(event: React.FormEvent) {
    event.preventDefault();
    setRequestError("");
    setRequestBusy(true);
    try {
      const response = await fetch("/api/rw-code-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: requestName, rw: requestRw, rt: requestRt }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Permintaan kode belum berhasil.");
      setIssuedCode(result.code);
      setRequestSuccessOpen(true);
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : "Permintaan kode belum berhasil. Coba lagi.");
    } finally { setRequestBusy(false); }
  }

  async function createPermanentWargaAccount(event: React.FormEvent) {
    event.preventDefault();
    setWargaAccountError("");
    setSavingWargaAccount(true);
    try {
      const response = await fetch("/api/auth/warga-permanent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: wargaPassword, confirmPassword: wargaPasswordConfirm }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Akun permanen belum dapat dibuat.");
      router.replace("/kelas");
      router.refresh();
    } catch (reason) {
      setWargaAccountError(reason instanceof Error ? reason.message : "Akun permanen belum dapat dibuat. Coba lagi.");
    } finally {
      setSavingWargaAccount(false);
    }
  }

  async function handleUmumSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "login", email: umumEmail, password: umumPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Email atau password belum sesuai.");
        setLoading(false);
        return;
      }
      router.push(nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/kelas");
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <AuthShell image="/images/community/percakapan-jogja.webp" imageAlt="Peserta belajar bahasa Inggris melalui percakapan bersama di Yogyakarta" imageTitle="Belajar dari lingkunganmu." imageDescription="Pilih jalur belajar untuk peserta umum atau masuk dengan kode warga dari pengelola.">
      <h1 className="workbook-auth-heading">Masuk ke ruang belajar</h1>
        <section className="workbook-auth-card max-w-none">
          {searchParams.get("registered") === "1" && mode === "umum" && (
            <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">Akun berhasil dibuat, silahkan masuk</p>
          )}
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

          {mode === "umum" ? (
            <form onSubmit={handleUmumSubmit} className="space-y-4">
              <p className="text-sm font-semibold text-body">Peserta Umum atau Tutor</p>
              <label className="block text-xs font-bold text-body">Email<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input type="email" required autoComplete="email" value={umumEmail} onChange={(event) => setUmumEmail(event.target.value)} placeholder="nama@email.com" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
              <label className="block text-xs font-bold text-body">Password<span className="auth-password-field relative mt-1.5 block"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={umumPassword} onChange={(event) => setUmumPassword(event.target.value)} placeholder="Password" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-24 text-sm text-ink focus:border-leaf focus:outline-none" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((show) => !show)}>{showPassword ? <><EyeOff className="mr-1 inline h-4 w-4"/>Sembunyikan</> : <><Eye className="mr-1 inline h-4 w-4"/>Tampilkan</>}</button></span></label>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Memeriksa akun..." : "Masuk"}<ArrowRight className="h-4 w-4" /></button>
              <p className="text-right text-sm"><Link href="/lupa-password" className="font-bold text-leaf underline underline-offset-4">Lupa Password?</Link></p>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted">Belum punya akun? <Link href="/daftar" className="font-bold text-leaf underline underline-offset-4">Daftar di sini</Link></p>
              <p className="text-center text-xs text-muted">Warga Sapen? <button type="button" onClick={() => { setMode("warga"); setError(null); }} className="font-bold text-leaf underline underline-offset-4">Masuk dengan Kode Warga →</button></p>
            </form>
          ) : (
            <div className="space-y-5">
            <form onSubmit={handleWargaSubmit} className="space-y-5">
              <p className="text-sm font-semibold text-body">Masuk sebagai Warga Sapen</p>
              <div>
                <label className="block text-xs font-bold text-body">Kode Warga / Kode Akses</label>
                <div className="relative mt-1.5"><input type={showWargaCode ? "text" : "password"} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} value={wargaCode} onChange={(event) => setWargaCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24))} placeholder="QTU-OP3 atau SAP-RW06-RT01" className="min-h-12 w-full rounded-lg border border-rule-strong bg-paper-light px-3 pr-12 font-mono text-sm font-bold tracking-wider text-ink focus:border-leaf focus:outline-none" /><button type="button" aria-label={showWargaCode ? "Sembunyikan kode" : "Tampilkan kode"} onClick={() => setShowWargaCode((show) => !show)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-md text-leaf hover:bg-forest-soft">{showWargaCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                <p className="mt-2 text-center text-xs text-muted">Kode lama 6 karakter tetap dapat dipakai. Kode baru memakai format AWALAN-RW-RT.</p>
              </div>
              <button type="submit" disabled={loading || !wargaCode.trim()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><RefreshCw className="h-4 w-4 animate-spin"/>Memeriksa kode...</> : <><CheckCircle2 className="h-4 w-4"/>Masuk sebagai Warga</>}</button>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted"><button type="button" onClick={() => { setMode("umum"); setError(null); }} className="font-bold text-leaf underline underline-offset-4">Bukan warga? Masuk sebagai Peserta Umum</button></p>
            </form>
            <section className="rounded-xl border border-dashed border-rule-strong bg-paper-light/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold text-forest-deep">Belum punya kode akses?</h2><p className="mt-1 text-xs leading-5 text-muted">Minta kode berdasarkan wilayah tempat tinggal.</p></div><button type="button" onClick={() => setShowRequestForm((open) => !open)} aria-expanded={showRequestForm} className="inline-flex min-h-11 items-center rounded-lg border border-leaf px-3 text-sm font-bold text-leaf hover:bg-forest-soft">{showRequestForm ? "Tutup formulir" : "Minta kode warga"}</button></div>
              {showRequestForm && <form onSubmit={handleRequestWargaCode} className="mt-4 space-y-3 border-t border-rule pt-4">
                <label className="block text-xs font-bold text-body">Nama lengkap<input required minLength={2} maxLength={80} autoComplete="name" value={requestName} onChange={(event) => setRequestName(event.target.value.toLocaleUpperCase("id-ID"))} placeholder="NAMA LENGKAP" className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm uppercase text-ink" /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-body">RW<select value={requestRw} onChange={(event) => setRequestRw(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm text-ink">{["06", "07", "08"].map((rw) => <option key={rw} value={rw}>RW {rw}</option>)}</select></label><label className="block text-xs font-bold text-body">RT<select value={requestRt} onChange={(event) => setRequestRt(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm text-ink">{Array.from({ length: 99 }, (_, index) => String(index + 1).padStart(2, "0")).map((rt) => <option key={rt} value={rt}>RT {rt}</option>)}</select></label></div>
                <div><span className="block text-xs font-bold text-body">Format kode verifikasi</span><div className="mt-1.5 flex flex-wrap items-center gap-2" aria-label="Awalan, RW, dan RT kode warga"><span className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-lg border border-rule-strong bg-white px-3 font-mono font-bold tracking-wider text-leaf">{showRequestCode ? codePrefix : "*".repeat(codePrefix.length)}</span><span aria-hidden="true" className="font-bold text-muted">–</span><span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rule-strong bg-white px-3 font-mono font-bold tracking-wider text-leaf">{showRequestCode ? `RW${requestRw}` : "******"}</span><span aria-hidden="true" className="font-bold text-muted">–</span><span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rule-strong bg-white px-3 font-mono font-bold tracking-wider text-leaf">{showRequestCode ? `RT${requestRt}` : "****"}</span></div><p className="mt-1.5 text-xs text-muted">Awalan mengikuti pengaturan pengurus; RW dan RT mengikuti pilihanmu. Kode akan disamarkan setelah 2 detik.</p></div>
                {requestError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{requestError}</p>}
                <button type="submit" disabled={requestBusy || requestName.trim().length < 2} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-extrabold text-white hover:bg-[#183b2d] disabled:opacity-60">{requestBusy ? <><RefreshCw className="h-4 w-4 animate-spin" />Membuat kode…</> : "Kirim dan buat kode akses"}</button>
              </form>}
            </section>
            </div>
          )}
        </section>
        <footer className="mt-4 border-t border-rule pt-3 text-center"><Link href="/admin/masuk" className="text-xs text-muted underline underline-offset-4 hover:text-leaf">Khusus pengurus</Link></footer>
      {showWargaPrompt && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#20251f]/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="warga-account-title" className="w-full max-w-md rounded-2xl border border-rule bg-paper-light p-5 shadow-xl sm:p-7"><h2 id="warga-account-title" className="font-display text-2xl font-bold text-forest-deep">Simpan akses ini sebagai akun permanen?</h2><p className="mt-2 text-sm leading-6 text-body">Pilihan ini opsional. Akses kelas gratis dengan kode warga tetap aktif jika kamu melewatinya.</p>{wargaAccountError && <p role="alert" className="mt-4 rounded-lg border border-earth/30 bg-[#f8e8e1] p-3 text-sm font-semibold text-earth-dark">{wargaAccountError}</p>}<form onSubmit={createPermanentWargaAccount} className="mt-5 space-y-3"><label className="block text-sm font-bold text-body">Email<input required type="email" autoComplete="email" value={wargaEmail} onChange={(event) => setWargaEmail(event.target.value)} placeholder="nama@email.com" className="mt-1.5 min-h-12 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm" /></label><label className="block text-sm font-bold text-body">Kata sandi<input required type="password" minLength={8} autoComplete="new-password" value={wargaPassword} onChange={(event) => setWargaPassword(event.target.value)} placeholder="Minimal 8 karakter" className="mt-1.5 min-h-12 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm" /></label><label className="block text-sm font-bold text-body">Ulangi kata sandi<input required type="password" minLength={8} autoComplete="new-password" value={wargaPasswordConfirm} onChange={(event) => setWargaPasswordConfirm(event.target.value)} placeholder="Ulangi kata sandi" className="mt-1.5 min-h-12 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm" /></label><button type="submit" disabled={savingWargaAccount} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-earth px-4 text-sm font-extrabold text-white hover:bg-earth-dark disabled:opacity-60">{savingWargaAccount ? "Menyimpan akun…" : "Buat akun permanen"}</button></form><button type="button" onClick={() => { setShowWargaPrompt(false); router.replace("/kelas"); router.refresh(); }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-rule-strong px-4 text-sm font-bold text-leaf hover:bg-forest-soft">Nanti Saja, lanjut ke kelas</button></section></div>}
      {requestSuccessOpen && <div className="fixed inset-0 z-[110] grid place-items-center bg-[#20251f]/60 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="warga-code-success-title" className="w-full max-w-md rounded-2xl border border-rule bg-paper-light p-6 shadow-2xl"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e6eadf] text-[#244b3a]"><CheckCircle2 className="h-6 w-6" /></div><h2 id="warga-code-success-title" className="mt-4 text-center font-display text-2xl font-bold text-forest-deep">Kode akses siap</h2><p className="mt-2 text-center text-sm leading-6 text-body">Simpan kode ini. Tekan OK untuk mengisinya pada form masuk warga.</p><p className="mt-4 rounded-xl border border-rule bg-white px-3 py-4 text-center font-mono text-lg font-extrabold tracking-wider text-leaf">{issuedCode}</p><button type="button" onClick={() => { setWargaCode(issuedCode); setMode("warga"); setShowWargaCode(true); setShowRequestForm(false); setRequestSuccessOpen(false); }} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d]">OK · Isi kode untuk masuk</button></section></div>}
    </AuthShell>
  );
}

export default function MasukPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Memuat halaman login...</div>}><MasukContent /></Suspense>;
}
