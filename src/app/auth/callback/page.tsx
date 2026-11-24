"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseFlowClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type");
      const client = createBrowserSupabaseFlowClient();
      if (!client) { if (active) setError("Layanan verifikasi belum tersedia."); return; }
      try {
        const { data: sessionData } = await client.auth.getSession();
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        if (!sessionData.session && code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (!sessionData.session && tokenHash && (type === "signup" || type === "recovery")) {
          const { error: verifyError } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
          if (verifyError) throw verifyError;
        } else if (!sessionData.session && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (!accessToken || !refreshToken) throw new Error("Tautan verifikasi tidak lengkap.");
          const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
        } else if (!sessionData.session) {
          throw new Error("Tautan sudah kedaluwarsa atau tidak valid.");
        }
        if (!active) return;
        router.replace(type === "recovery" ? "/reset-password" : "/verifikasi-email?status=success");
      } catch {
        if (active) setError("Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru untuk melanjutkan.");
      }
    }
    void finish();
    return () => { active = false; };
  }, [router]);

  return <main className="workbook-auth min-h-dvh px-4 py-10"><section className="workbook-auth-card w-full max-w-lg">{error ? <><h1 className="font-display text-2xl font-bold text-forest-deep">Verifikasi belum berhasil</h1><p role="alert" className="mt-3 text-sm leading-6 text-body">{error}</p><Link className="mt-5 inline-flex min-h-12 items-center text-leaf underline" href="/masuk">Kembali ke halaman Masuk</Link></> : <p role="status" className="text-center text-sm text-body">Memverifikasi tautan Anda…</p>}</section></main>;
}
