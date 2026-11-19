"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import CommunityIllustrationPanel from "@/components/CommunityIllustrationPanel";
import { createPublicSupabaseClient } from "@/lib/supabase";
import AuthShell from "@/components/auth/AuthShell";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = createPublicSupabaseClient();
    if (!supabase) {
      setError("Layanan reset password belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError("Link reset belum dapat dikirim. Periksa email dan coba lagi.");
        return;
      }
      setMessage("Jika email terdaftar, link untuk mengatur ulang password akan segera dikirim.");
    } catch {
      setError("Link reset belum dapat dikirim. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell image="/images/community/belajar-taman.webp" imageAlt="Peserta belajar bersama di ruang terbuka" imageTitle="Kembali ke ruang belajar." imageDescription="Masukkan email akun Peserta Umum untuk menerima tautan pengaturan ulang kata sandi.">
        <h1 className="workbook-auth-heading">Lupa Password?</h1>
        <form onSubmit={sendResetLink} className="workbook-auth-card max-w-none space-y-4">
          <p className="text-sm leading-6 text-body">Masukkan email Peserta Umum untuk menerima link reset password.</p>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          <label className="block text-xs font-bold text-body">Email<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" /></span></label>
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-md bg-earth px-4 py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Mengirim..." : "Kirim Link Reset"}</button>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-rule pt-3 text-center text-sm"><Link href="/masuk" className="min-h-11 inline-flex items-center font-bold text-leaf underline underline-offset-4">Sudah punya akun? Masuk</Link></div>
        </form>
    </AuthShell>
  );
}
