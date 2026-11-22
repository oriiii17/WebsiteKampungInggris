"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";
import SixBoxCodeInput, { toCodeString } from "@/components/SixBoxCodeInput";
import SegmentedAccessCodeInput from "@/components/SegmentedAccessCodeInput";

const RT_BY_RW: Record<string, string[]> = {
  "06": ["18", "19", "20", "21"],
  "07": ["22", "23", "24"],
  "08": ["25", "26", "27", "28"],
};

function MasukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/modul";
  const [mode, setMode] = useState<"umum" | "warga">(searchParams.get("mode") === "warga" ? "warga" : "umum");
  const [wargaCode, setWargaCode] = useState("");
  const [wargaCodeDigits, setWargaCodeDigits] = useState<string[]>(Array(6).fill(""));
  const wargaCodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showWargaCode, setShowWargaCode] = useState(false);
  const [codePrefix, setCodePrefix] = useState("SAP");
  const [requestName, setRequestName] = useState("");
  const [requestCodeValue, setRequestCodeValue] = useState("");
  const [requestRw, setRequestRw] = useState("");
  const [requestRt, setRequestRt] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [requestSuccessOpen, setRequestSuccessOpen] = useState(false);
  const [umumEmail, setUmumEmail] = useState("");
  const [umumPassword, setUmumPassword] = useState("");
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
    if (!wargaCodeDigits.some(Boolean) && !wargaCode) return;
    setShowWargaCode(true);
    const timer = window.setTimeout(() => setShowWargaCode(false), 1000);
    return () => window.clearTimeout(timer);
  }, [wargaCode, wargaCodeDigits]);

  async function handleWargaSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const code = toCodeString(wargaCodeDigits).trim().toUpperCase();
    const legacyCode = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code);
    if (!legacyCode) {
      setError("Masukkan semua 6 karakter kode akses. Jika lupa, gunakan Minta kode baru.");
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
        setError(result.error || "kode akses tidak dikenali.");
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
    const normalizedPrefix = requestCodeValue.slice(0, 3).toUpperCase();
    const normalizedRw = requestRw.trim().padStart(2, "0");
    const normalizedRt = requestRt.trim().padStart(2, "0");
    if (!/^[A-Z0-9]{7}$/.test(requestCodeValue) || !/^[A-Z0-9]{3}$/.test(normalizedPrefix) || normalizedPrefix !== codePrefix || requestCodeValue.slice(3, 5) !== normalizedRw || requestCodeValue.slice(5, 7) !== normalizedRt || !RT_BY_RW[normalizedRw]?.includes(normalizedRt)) {
      setRequestError("Lengkapi kode 3–2–2. Awalan harus sama dengan awalan aktif, dan RW/RT harus cocok dengan pilihan.");
      return;
    }
    setRequestBusy(true);
    try {
      const response = await fetch("/api/rw-code-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: requestName, prefix: normalizedPrefix, rw: normalizedRw, rt: normalizedRt, typedCode: requestCodeValue }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Permintaan kode belum berhasil.");
      if (typeof result.code !== "string" || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(result.code)) throw new Error("Format kode belum sesuai. Coba kirim kembali atau hubungi pengurus.");
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
    <AuthShell image="/images/community/percakapan-jogja.webp" imageAlt="Peserta belajar bahasa Inggris melalui percakapan bersama di Yogyakarta" imageTitle="Belajar dari lingkunganmu." imageDescription="Pilih jalur belajar untuk peserta umum, atau masuk dengan kode akses dari pengelola.">
      <h1 className="workbook-auth-heading">Masuk ke akun Anda</h1>
        <section className="workbook-auth-card max-w-none">
          {searchParams.get("registered") === "1" && mode === "umum" && (
            <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">Akun berhasil dibuat, silahkan masuk</p>
          )}
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

          {mode === "umum" ? (
            <form onSubmit={handleUmumSubmit} className="space-y-4">
              <p className="text-sm font-semibold text-body">Peserta Umum atau Tutor</p>
              <label className="block text-xs font-bold text-body">Email<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input type="email" required autoComplete="email" value={umumEmail} onChange={(event) => setUmumEmail(event.target.value)} placeholder="nama@email.com" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
              <label className="block text-xs font-bold text-body">Kata Sandi<span className="mt-1.5 block"><PasswordInput required autoComplete="current-password" value={umumPassword} onChange={setUmumPassword} placeholder="Masukkan kata sandi" /></span></label>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Memeriksa akun..." : "Masuk"}<ArrowRight className="h-4 w-4" /></button>
              <p className="text-right text-sm"><Link href="/lupa-password" className="font-bold text-leaf underline underline-offset-4">Lupa kata sandi?</Link></p>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted">Belum punya akun? <Link href="/daftar" className="font-bold text-leaf underline underline-offset-4">Daftar di sini</Link></p>
              <p className="text-center text-xs text-muted">Warga Sapen? <button type="button" onClick={() => { setMode("warga"); setError(null); }} className="font-bold text-leaf underline underline-offset-4 hover:bg-transparent hover:text-leaf">Masuk dengan Kode Akses →</button></p>
            </form>
          ) : (
            <div className="space-y-5">
            <form onSubmit={handleWargaSubmit} className="space-y-5">
              <p className="text-sm font-semibold text-body">Masuk sebagai Warga Sapen</p>
              <div>
                <div className="flex items-center justify-between gap-2"><label className="text-xs font-bold text-body">Kode Akses (6 karakter)</label><button type="button" aria-label={showWargaCode ? "Sembunyikan kode" : "Tampilkan kode"} onClick={() => setShowWargaCode((show) => !show)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-bold text-leaf hover:bg-forest-soft">{showWargaCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showWargaCode ? "Sembunyikan" : "Tampilkan"}</button></div>
                <div className="mt-1.5 w-full min-w-0"><SixBoxCodeInput groupClassName="flex w-full min-w-0 items-center gap-1" value={wargaCodeDigits} inputRefs={wargaCodeRefs} masked={!showWargaCode} onChange={(digits) => { setWargaCodeDigits(digits); setWargaCode(digits.join("")); }} /></div>
                <p className="mt-2 text-center text-xs text-muted">Kode akses terdiri dari 6 karakter. Karakter yang baru diketik terlihat selama 1 detik, lalu disamarkan.</p>
              </div>
              <button type="submit" disabled={loading || !wargaCodeDigits.every(Boolean)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><RefreshCw className="h-4 w-4 animate-spin"/>Memeriksa kode...</> : <><CheckCircle2 className="h-4 w-4"/>Masuk sebagai Warga</>}</button>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted"><button type="button" onClick={() => { setMode("umum"); setError(null); }} className="inline-flex min-h-11 items-center justify-center px-3 font-bold text-leaf underline underline-offset-4">← Kembali ke halaman masuk</button></p>
            </form>
            <section className="rounded-xl border border-dashed border-rule-strong bg-paper-light/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold text-forest-deep">Lupa atau belum punya kode akses?</h2><p className="mt-1 text-xs leading-5 text-muted">Jalur ini opsional. Minta kode pengganti sesuai wilayah tempat tinggal.</p></div><button type="button" onClick={() => setShowRequestForm((open) => { if (!open) { setRequestName(""); setRequestCodeValue(""); setRequestRw(""); setRequestRt(""); setRequestError(""); } return !open; })} aria-expanded={showRequestForm} className="inline-flex min-h-11 items-center rounded-lg border border-leaf px-3 text-sm font-bold text-leaf hover:bg-forest-soft">{showRequestForm ? "Tutup formulir" : "Minta kode baru"}</button></div>
              {showRequestForm && <form onSubmit={handleRequestWargaCode} className="mt-4 space-y-3 border-t border-rule pt-4">
                <label className="block text-xs font-bold text-body">Nama lengkap<input required minLength={2} maxLength={80} autoComplete="name" value={requestName} onChange={(event) => setRequestName(event.target.value.toLocaleUpperCase("id-ID"))} placeholder="NAMA LENGKAP" className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm uppercase text-ink" /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-body">RW<select required value={requestRw} onChange={(event) => { setRequestRw(event.target.value); setRequestRt(""); }} className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm text-ink"><option value="">Pilih RW</option>{Object.keys(RT_BY_RW).map((rw) => <option key={rw} value={rw}>RW {rw}</option>)}</select></label><label className="block text-xs font-bold text-body">RT<select required disabled={!requestRw} value={requestRt} onChange={(event) => setRequestRt(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm text-ink disabled:cursor-not-allowed disabled:bg-paper-shadow"><option value="">Pilih RT</option>{(RT_BY_RW[requestRw] || []).map((rt) => <option key={rt} value={rt}>RT {rt}</option>)}</select></label></div>
                <div><span className="block text-xs font-bold text-body">Masukkan Kode Akses</span><div className="mt-1.5"><SegmentedAccessCodeInput value={requestCodeValue} onChange={setRequestCodeValue} /></div></div>
                {requestError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{requestError}</p>}
                <button type="submit" disabled={requestBusy || requestName.trim().length < 2 || !/^[A-Z0-9]{7}$/.test(requestCodeValue) || !requestRw || !requestRt || !/^[A-Z0-9]{3}$/.test(codePrefix)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-extrabold text-white hover:bg-[#183b2d] disabled:opacity-60">{requestBusy ? <><RefreshCw className="h-4 w-4 animate-spin" />Mengirim…</> : "Kirim"}</button>
              </form>}
            </section>
            </div>
          )}
        </section>
        <footer className="mt-4 border-t border-rule pt-3 text-center"><Link href="/admin/masuk" className="inline-flex min-h-11 items-center justify-center px-3 text-xs font-semibold text-muted underline underline-offset-4 hover:text-leaf">Masuk Admin</Link></footer>
      {showWargaPrompt && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#20251f]/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="warga-account-title" className="w-full max-w-md rounded-2xl border border-rule bg-paper-light p-5 shadow-xl sm:p-7"><h2 id="warga-account-title" className="font-display text-2xl font-bold text-forest-deep">Simpan akses ini sebagai akun permanen?</h2><p className="mt-2 text-sm leading-6 text-body">Pilihan ini opsional. Akses kelas gratis dengan kode akses tetap aktif jika kamu melewatinya.</p>{wargaAccountError && <p role="alert" className="mt-4 rounded-lg border border-earth/30 bg-[#f8e8e1] p-3 text-sm font-semibold text-earth-dark">{wargaAccountError}</p>}<form onSubmit={createPermanentWargaAccount} className="mt-5 space-y-3"><label className="block text-sm font-bold text-body">Email<input required type="email" autoComplete="email" value={wargaEmail} onChange={(event) => setWargaEmail(event.target.value)} placeholder="nama@email.com" className="mt-1.5 min-h-12 w-full rounded-lg border border-rule-strong bg-white px-3 text-sm" /></label><label className="block text-sm font-bold text-body">Kata sandi<span className="mt-1.5 block"><PasswordInput required minLength={8} autoComplete="new-password" value={wargaPassword} onChange={setWargaPassword} placeholder="Minimal 8 karakter" /></span></label><label className="block text-sm font-bold text-body">Ulangi kata sandi<span className="mt-1.5 block"><PasswordInput required minLength={8} autoComplete="new-password" value={wargaPasswordConfirm} onChange={setWargaPasswordConfirm} placeholder="Ulangi kata sandi" /></span></label><button type="submit" disabled={savingWargaAccount} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-earth px-4 text-sm font-extrabold text-white hover:bg-earth-dark disabled:opacity-60">{savingWargaAccount ? "Menyimpan akun…" : "Buat akun permanen"}</button></form><button type="button" onClick={() => { setShowWargaPrompt(false); router.replace("/kelas"); router.refresh(); }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-rule-strong px-4 text-sm font-bold text-leaf hover:bg-forest-soft">Nanti Saja, lanjut ke kelas</button></section></div>}
      {requestSuccessOpen && <div className="fixed inset-0 z-[110] grid place-items-center bg-[#20251f]/60 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="warga-code-success-title" className="w-full max-w-md rounded-2xl border border-rule bg-paper-light p-6 shadow-2xl"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e6eadf] text-[#244b3a]"><CheckCircle2 className="h-6 w-6" /></div><h2 id="warga-code-success-title" className="mt-4 text-center font-display text-2xl font-bold text-forest-deep">Halo {requestName.trim()}</h2><p className="mt-2 text-center text-sm leading-6 text-body">Permintaan kode akses berhasil. Tekan Oke untuk mengisi kode di form masuk warga.</p><button type="button" onClick={() => { const digits = issuedCode.replace(/-/g, "").split("").slice(0, 6); setWargaCode(issuedCode.replace(/-/g, "")); setWargaCodeDigits(digits); setMode("warga"); setShowWargaCode(true); setShowRequestForm(false); setRequestSuccessOpen(false); }} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d]">Oke</button></section></div>}
    </AuthShell>
  );
}

export default function MasukPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Memuat halaman login...</div>}><MasukContent /></Suspense>;
}
