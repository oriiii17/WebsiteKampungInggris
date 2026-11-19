"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import AuthShell from "@/components/auth/AuthShell";

export default function AdminLoginForm({ nextUrl = "/admin" }: { nextUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <AuthShell admin image="/images/community/diskusi-warga.webp" imageAlt="Pengurus dan warga berdiskusi bersama di lingkungan Sapen" imageTitle="Kelola ruang belajar Sapen." imageDescription="Masuk untuk mengatur materi, kelas, akses warga, serta kegiatan belajar.">
        <div className="workbook-auth-card">
        <h1 className="workbook-auth-heading">Login Admin Kampung Sapen</h1>
        <p className="auth-reassurance">Halaman ini khusus pengurus. Bukan pengurus? <Link href="/">Kembali ke beranda.</Link></p>
        {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-body">Email Admin<span className="relative mt-1 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
          <label className="block text-xs font-bold text-body">Kata Sandi<span className="auth-password-field relative mt-1 block"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-24 text-sm text-ink focus:border-leaf focus:outline-none" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((show) => !show)}>{showPassword ? <><EyeOff className="mr-1 inline h-4 w-4"/>Sembunyikan</> : <><Eye className="mr-1 inline h-4 w-4"/>Tampilkan</>}</button></span></label>
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-md bg-earth py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}</button>
        </form>
        </div>
    </AuthShell>
  );
}
