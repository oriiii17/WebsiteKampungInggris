"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login gagal.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
      setLoading(false);
    }
  }

  return (
    <div className="workbook-auth px-4 sm:px-6">
      <div className="workbook-auth-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-leaf text-sunshine">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h1 className="workbook-auth-heading mt-5 text-center">
          Login Admin Kampung Sapen
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted">
          Portal pengelolaan materi dan kode akses bagi Pengurus & Developer.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-body">
              Email Admin
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pengurus@kampungsapen.id"
                className="w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-body">
              Kata Sandi
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-rule-strong bg-paper-light py-3 pl-10 pr-3 text-sm text-ink focus:border-leaf focus:outline-none"
              />
            </div>
          </div>

          {/* Tombol Isi Cepat */}
          <div className="border-y border-rule bg-paper py-3">
            <p className="text-xs font-semibold text-muted">
              Akun uji coba resmi:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("pengurus@kampungsapen.id");
                  setPassword("sapen2026");
                }}
                className="min-h-11 rounded-md border border-rule-strong bg-paper-light px-3 py-2 text-xs font-bold text-body hover:bg-paper-deep"
              >
                Role: Pengurus
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("dev@kampungsapen.id");
                  setPassword("devsapen2026");
                }}
                className="min-h-11 rounded-md border border-rule-strong bg-paper-light px-3 py-2 text-xs font-bold text-body hover:bg-paper-deep"
              >
                Role: Developer
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-md bg-earth py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark disabled:opacity-60"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
