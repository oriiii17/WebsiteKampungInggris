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
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 bg-white">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#14532D] text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h1 className="mt-4 text-center text-[24px] sm:text-[28px] font-bold text-gray-900 leading-snug">
          Login Admin Kampung Sapen
        </h1>
        <p className="mt-1 text-center text-xs text-gray-500 leading-[1.6]">
          Portal pengelolaan materi dan kode akses bagi Pengurus & Developer.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
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
                className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
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
                className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>
          </div>

          {/* Tombol Isi Cepat */}
          <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-gray-50 p-3">
            <p className="text-[11px] font-semibold text-gray-500">
              Akun uji coba resmi:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("pengurus@kampungsapen.id");
                  setPassword("sapen2026");
                }}
                className="rounded border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Role: Pengurus
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("dev@kampungsapen.id");
                  setPassword("devsapen2026");
                }}
                className="rounded border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Role: Developer
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#14532D] hover:bg-[#0F3F22] py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
