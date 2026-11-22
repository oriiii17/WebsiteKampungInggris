"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createPublicSupabaseClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = createPublicSupabaseClient();
    if (!supabase) {
      setError("Layanan pengaturan ulang kata sandi belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Link reset tidak valid atau sudah kedaluwarsa. Minta link baru.");
        return;
      }
      setMessage("Kata Sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.");
    } catch {
      setError("Kata Sandi belum dapat diperbarui. Periksa koneksi dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="workbook-auth min-h-screen px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <h1 className="workbook-auth-heading mb-6 text-center">Atur Kata Sandi Baru</h1>
        <form onSubmit={updatePassword} className="workbook-auth-card max-w-none space-y-4">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          <label className="block text-xs font-bold text-body">Kata Sandi baru<input required type="password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-md border border-rule-strong bg-paper-light px-3 py-3 text-sm text-ink focus:border-leaf focus:outline-none" /></label>
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-md bg-earth px-4 py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60">{loading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}</button>
          {message && <p className="text-center text-sm"><Link href="/masuk" className="font-bold text-leaf underline underline-offset-4">Ke halaman Masuk</Link></p>}
        </form>
      </div>
    </main>
  );
}
