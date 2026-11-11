"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import SixBoxCodeInput, { toCodeString } from "@/components/SixBoxCodeInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  User,
} from "lucide-react";

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-dev";
  const key = "sapen_warga_device_id";
  let existing = window.localStorage.getItem(key);
  if (!existing) {
    existing = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    window.localStorage.setItem(key, existing);
  }
  return existing;
}

function MasukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "umum" ? "umum" : "warga";
  const nextUrl = searchParams.get("next") || "/modul";

  const [tab, setTab] = useState<"warga" | "umum">(initialTab);

  // Warga RW state
  const [wargaNama, setWargaNama] = useState("");
  const [wargaCode, setWargaCode] = useState("");
  const [wargaDigits, setWargaDigits] = useState<string[]>(Array(6).fill(""));
  const wargaRefs = useRef<(HTMLInputElement | null)[]>([]);
  const wargaComplete = wargaDigits.every((c) => c !== "");
  const [nameConflict, setNameConflict] = useState<string | null>(null);

  // Umum state
  const [umumMode, setUmumMode] = useState<"register" | "login">("register");
  const [umumName, setUmumName] = useState("");
  const [umumEmail, setUmumEmail] = useState("");
  const [umumPassword, setUmumPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTab(searchParams.get("tab") === "umum" ? "umum" : "warga");
    setError(null);
    setNameConflict(null);
  }, [searchParams]);

  async function submitWarga(forceNew = false) {
    setLoading(true);
    setError(null);
    setNameConflict(null);
    const code = toCodeString(wargaDigits);
    if (code.length !== 7) {
      setError("Kode akses belum lengkap.");
      wargaRefs.current[0]?.focus();
      setLoading(false);
      return;
    }
    setWargaCode(code);
    try {
      const res = await fetch("/api/auth/warga-rw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: wargaNama,
          code,
          deviceId: getOrCreateDeviceId(),
          forceNew,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.nameConflict) {
        setNameConflict(data.message);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Kode akses tidak dikenali.");
        setLoading(false);
        wargaRefs.current[0]?.focus();
        return;
      }
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  async function handleWargaSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitWarga(false);
  }

  async function handleUmumSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: umumMode, name: umumName, email: umumEmail, password: umumPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses akun.");
        setLoading(false);
        return;
      }
      if (data.hasActiveSubscription) {
        router.push(nextUrl);
      } else {
        router.push("/berlangganan");
      }
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="workbook-auth min-h-screen px-4 sm:px-6">
      <div className="w-full max-w-xl">
        {/* Logo & judul */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-leaf text-sunshine">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <h1 className="workbook-auth-heading mt-4">Masuk ke ruang belajar</h1>
          <p className="mt-3 text-sm text-muted">Peserta dengan kode akses dapat masuk tanpa email dan kata sandi.</p>
        </div>

        {/* Tab */}
        <div className="mb-5 grid grid-cols-2 gap-1 border-y border-rule-strong bg-paper-light p-1">
          <button
            type="button"
            onClick={() => { setTab("warga"); setError(null); setNameConflict(null); }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "warga" ? "bg-leaf text-white" : "text-muted hover:text-ink hover:bg-paper-deep"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Kode Akses
          </button>
          <button
            type="button"
            onClick={() => { setTab("umum"); setError(null); setNameConflict(null); }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "umum" ? "bg-leaf text-white" : "text-muted hover:text-ink hover:bg-paper-deep"
            }`}
          >
            Peserta Umum
          </button>
        </div>

        {/* Form card */}
        <div className="workbook-auth-card max-w-none">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {/* Nama bentrok — tanya user */}
          {nameConflict && (
            <div className="mb-4 border-y border-rule-strong bg-paper p-4">
              <p className="text-sm font-semibold text-amber-900">{nameConflict}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => submitWarga(false)}
                  disabled={loading}
                  className="min-h-11 flex-1 rounded-md bg-leaf py-2.5 text-xs font-bold text-white hover:bg-leaf-dark"
                >
                  Ini akun saya, lanjutkan
                </button>
                <button
                  type="button"
                  onClick={() => { setWargaNama(""); setNameConflict(null); }}
                  className="min-h-11 flex-1 rounded-md border border-rule-strong py-2.5 text-xs font-bold text-body hover:bg-paper"
                >
                  Pakai nama lain
                </button>
              </div>
            </div>
          )}

          {tab === "warga" ? (
            <form onSubmit={handleWargaSubmit} className="space-y-5">
              <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800 border border-green-100">
                <strong>Masuk dengan Kode Akses:</strong> Masukkan nama panggilan dan kode akses
                yang Anda miliki. Gratis, tanpa email, tanpa kata sandi.
              </div>

              {/* Nama panggilan */}
              <div>
                <label className="block text-xs font-bold text-body">Nama Panggilan</label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={20}
                    value={wargaNama}
                    onChange={(e) => setWargaNama(e.target.value)}
                    placeholder="Contoh: Budi, Ibu Ani, Pak RT..."
                    className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">Minimal 3 karakter, hanya huruf dan angka.</p>
              </div>

              {/* Kode Akses */}
              <div>
                <label className="block text-xs font-bold text-body">Kode Akses</label>
                <div className="mt-1.5">
                  <SixBoxCodeInput
                    value={wargaDigits}
                    onChange={(next) => { setWargaDigits(next); }}
                    onCompleteChange={(code) => setWargaCode(code)}
                    inputRefs={wargaRefs}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted">Masukkan 6 karakter kode akses (huruf/angka).</p>
              </div>

              <button
                type="submit"
                disabled={loading || !wargaComplete}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Memeriksa Kode...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Masuk ke Ruang Belajar
                  </>
                )}
              </button>

              <p className="text-center text-xs text-muted">Belum punya kode akses? Hubungi pengelola program belajar Anda.</p>
            </form>
          ) : (
            <form onSubmit={handleUmumSubmit} className="space-y-4">
                <div className="flex items-center gap-1 border-y border-rule bg-paper p-1">
                {(["register", "login"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setUmumMode(m)}
                    className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                      umumMode === m ? "bg-paper-light text-ink shadow-sm" : "text-muted"
                    }`}
                  >
                    {m === "register" ? "Daftar Baru" : "Sudah Ada Akun"}
                  </button>
                ))}
              </div>

              {umumMode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-body">Nama Lengkap</label>
                  <div className="relative mt-1.5">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" required value={umumName} onChange={(e) => setUmumName(e.target.value)} placeholder="Nama lengkap" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-body">Alamat Email</label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={umumEmail} onChange={(e) => setUmumEmail(e.target.value)} placeholder="nama@email.com" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-body">Kata Sandi</label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="password" required minLength={6} value={umumPassword} onChange={(e) => setUmumPassword(e.target.value)} placeholder="Minimal 6 karakter" className="min-h-12 w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-earth py-3.5 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60"
              >
                {loading ? "Memproses..." : umumMode === "register" ? "Daftar & Pilih Paket" : "Masuk Akun"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted">Pengurus atau Developer?{" "}
          <Link href="/admin/login" className="font-bold text-leaf underline underline-offset-4">Login Admin di sini</Link>
        </p>
      </div>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Memuat halaman login...</div>}>
      <MasukContent />
    </Suspense>
  );
}
