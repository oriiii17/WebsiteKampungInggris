"use client";

import React, { Suspense, useRef, useState } from "react";
import SixBoxCodeInput, { toCodeString } from "@/components/SixBoxCodeInput";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw } from "lucide-react";

function MasukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/modul";
  const [mode, setMode] = useState<"umum" | "warga">(searchParams.get("mode") === "warga" ? "warga" : "umum");
  const [wargaDigits, setWargaDigits] = useState<string[]>(Array(6).fill(""));
  const wargaRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [umumEmail, setUmumEmail] = useState("");
  const [umumPassword, setUmumPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWargaSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const code = toCodeString(wargaDigits);
    if (code.length !== 7) {
      setError("Kode warga belum lengkap.");
      wargaRefs.current[0]?.focus();
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
        wargaRefs.current[0]?.focus();
        return;
      }
      router.push(nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/kelas");
      router.refresh();
    } catch (requestError) {
      console.error("[login warga] Permintaan tidak mencapai server", requestError);
      setError("Server tidak terjangkau. Periksa koneksi internet lalu coba lagi.");
      setLoading(false);
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
    <main className="workbook-auth min-h-screen px-4 py-10 sm:px-6">
      <div className="auth-page-layout w-full max-w-6xl">
      <div className="auth-form-column">
        <div className="mb-8 text-center">
          <Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority className="mx-auto h-auto w-48" />
          <h1 className="workbook-auth-heading mt-4">Masuk ke ruang belajar</h1>
        </div>

        <section className="workbook-auth-card max-w-none">
          {searchParams.get("registered") === "1" && mode === "umum" && (
            <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">Akun berhasil dibuat, silahkan masuk</p>
          )}
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

          {mode === "umum" ? (
            <form onSubmit={handleUmumSubmit} className="space-y-4">
              <p className="text-sm font-semibold text-body">Peserta Umum atau Tutor</p>
              <label className="block text-xs font-bold text-body">Email<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input type="email" required autoComplete="email" value={umumEmail} onChange={(event) => setUmumEmail(event.target.value)} placeholder="nama@email.com" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
              <label className="block text-xs font-bold text-body">Password<span className="relative mt-1.5 block"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input type="password" required autoComplete="current-password" value={umumPassword} onChange={(event) => setUmumPassword(event.target.value)} placeholder="Password" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Memeriksa akun..." : "Masuk"}<ArrowRight className="h-4 w-4" /></button>
              <p className="text-right text-sm"><Link href="/lupa-password" className="font-bold text-leaf underline underline-offset-4">Lupa Password?</Link></p>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted">Belum punya akun? <Link href="/daftar" className="font-bold text-leaf underline underline-offset-4">Daftar di sini</Link></p>
              <p className="text-center text-xs text-muted">Warga Sapen? <button type="button" onClick={() => { setMode("warga"); setError(null); }} className="font-bold text-leaf underline underline-offset-4">Masuk dengan Kode Warga →</button></p>
            </form>
          ) : (
            <form onSubmit={handleWargaSubmit} className="space-y-5">
              <p className="text-sm font-semibold text-body">Masuk sebagai Warga Sapen</p>
              <div>
                <label className="block text-xs font-bold text-body">Kode Warga / Kode Akses</label>
                <div className="mt-1.5"><SixBoxCodeInput value={wargaDigits} onChange={setWargaDigits} inputRefs={wargaRefs} /></div>
                <p className="mt-2 text-center text-xs text-muted">Masukkan enam huruf atau angka, misalnya QTU-OP3.</p>
              </div>
              <button type="submit" disabled={loading || !wargaDigits.every((digit) => digit !== "")} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><RefreshCw className="h-4 w-4 animate-spin"/>Memeriksa kode...</> : <><CheckCircle2 className="h-4 w-4"/>Masuk sebagai Warga</>}</button>
              <p className="border-t border-rule pt-4 text-center text-xs text-muted"><button type="button" onClick={() => { setMode("umum"); setError(null); }} className="font-bold text-leaf underline underline-offset-4">Bukan warga? Masuk sebagai Peserta Umum</button></p>
            </form>
          )}
        </section>
        <footer className="mt-5 border-t border-rule pt-3 text-center"><Link href="/admin/masuk" className="text-xs text-muted underline underline-offset-4 hover:text-leaf">Khusus pengurus</Link></footer>
      </div>
      <figure className="auth-illustration-panel illustration-frame relative overflow-hidden">
        <Image src="/images/community/percakapan-jogja.webp" alt="Peserta belajar bahasa Inggris melalui percakapan bersama di Yogyakarta" fill sizes="(max-width: 767px) 100vw, 45vw" className="object-cover" />
        <figcaption className="auth-illustration-copy"><h2 className="text-2xl font-bold">Belajar dari lingkunganmu.</h2><p className="mt-2">Pilih jalur belajar untuk peserta umum atau masuk dengan kode warga dari pengelola.</p></figcaption>
      </figure>
      </div>
    </main>
  );
}

export default function MasukPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Memuat halaman login...</div>}><MasukContent /></Suspense>;
}
