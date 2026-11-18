"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function AdminLoginForm({ nextUrl = "/admin" }: { nextUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Konfigurasi Supabase belum terpasang, cek .env.local dan restart server");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !authData.session) {
        const authMessage = authError?.message.toLowerCase() || "";
        setError(authMessage.includes("invalid api key") || authMessage.includes("invalid supabase url")
          ? "Konfigurasi Supabase belum terpasang, cek .env.local dan restart server"
          : "Email / kata sandi salah");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        await supabase.auth.signOut({ scope: "local" });
        setError(data.error || "Login gagal.");
        setLoading(false);
        return;
      }
      router.push(nextUrl);
      router.refresh();
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      setError("Gagal terhubung ke server.");
      setLoading(false);
    }
  }

  return (
    <main className="workbook-auth min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <header className="sticky top-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 bg-paper/95 py-2 backdrop-blur"><Link href="/" aria-label="Sapen English Village, kembali ke beranda"><Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority className="h-auto w-20 sm:w-24" /></Link><Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-rule-strong bg-paper-light px-4 text-sm font-bold text-leaf underline underline-offset-4">← Kembali ke beranda</Link></header>
      <div className="auth-page-layout w-full max-w-6xl">
      <div className="auth-form-column">
        <div className="workbook-auth-card">
        <Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority className="mx-auto mb-4 h-auto w-32" />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-leaf text-white"><ShieldCheck className="h-6 w-6" /></div>
        <h1 className="workbook-auth-heading mt-5 text-center">Login Admin Kampung Sapen</h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted">Halaman ini khusus pengurus. Bukan pengurus? <Link href="/" className="font-bold text-leaf underline underline-offset-4">Kembali ke beranda.</Link></p>
        {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-body">Email Admin<span className="relative mt-1 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
          <label className="block text-xs font-bold text-body">Kata Sandi<span className="relative mt-1 block"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-md bg-earth py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}</button>
        </form>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-leaf underline underline-offset-4">← Kembali ke beranda</Link>
        </div>
      </div>
      <figure className="auth-illustration-panel illustration-frame relative overflow-hidden">
        <Image src="/images/community/diskusi-warga.webp" alt="Pengurus dan warga berdiskusi bersama di lingkungan Sapen" fill sizes="(max-width: 767px) 100vw, 45vw" className="object-cover" />
        <figcaption className="auth-illustration-copy"><h2 className="text-2xl font-bold">Kelola ruang belajar Sapen.</h2><p className="mt-2">Masuk untuk mengatur materi, kelas, akses warga, serta kegiatan belajar.</p></figcaption>
      </figure>
      </div>
    </main>
  );
}
