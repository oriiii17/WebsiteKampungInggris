"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function DaftarPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Password tidak sama");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal.");
      router.push("/masuk?tab=umum&registered=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghubungi server.");
      setLoading(false);
    }
  }

  return (
    <AuthShell image="/images/community/english-camp.webp" imageAlt="Peserta mengikuti kegiatan belajar bahasa Inggris bersama di English camp" imageTitle="Mulai perjalanan belajarmu." imageDescription="Buat akun peserta umum, lalu pilih kelas yang sesuai dengan tujuan belajarmu.">
        <h1 className="workbook-auth-heading">Buat Akun Baru</h1>
        <form onSubmit={submit} className="workbook-auth-card max-w-none space-y-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</div>}
          <label className="block text-xs font-bold text-body">Nama Lengkap<span className="relative mt-1.5 block"><User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" placeholder="Nama lengkap" /></span></label>
          <label className="block text-xs font-bold text-body">Email<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" placeholder="nama@email.com" /></span></label>
          <label className="block text-xs font-bold text-body">Password<span className="auth-password-field mt-1.5"><input required type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-3 text-sm text-ink focus:border-leaf focus:outline-none" placeholder="Minimal 6 karakter" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((show) => !show)}>{showPassword ? <><EyeOff className="mr-1 inline h-4 w-4"/>Sembunyikan</> : <><Eye className="mr-1 inline h-4 w-4"/>Tampilkan</>}</button><span className="mt-1 block text-xs font-normal text-muted">Gunakan minimal 6 karakter.</span></span></label>
          <label className="block text-xs font-bold text-body">Konfirmasi Password<span className="relative mt-1.5 block"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input required type="password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" placeholder="Ulangi password" /></span></label>
          <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Membuat akun..." : "Buat Akun"}</button>
          <p className="border-t border-rule pt-3 text-center text-sm text-muted">Sudah punya akun? <Link href="/masuk" className="font-bold text-leaf underline underline-offset-4">Masuk</Link></p>
        </form>
    </AuthShell>
  );
}
