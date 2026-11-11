"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, User, Lock } from "lucide-react";
import type { SessionPayload } from "@/lib/types";

export default function AccountClient({ initialSession }: { initialSession: SessionPayload }) {
  const router = useRouter();
  const [name, setName] = useState(initialSession.name || "");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setSaving(true);
    try {
      const res = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_name", name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");
      setMsg("Nama berhasil diperbarui.");
      router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (password.length < 6) { setErr("Password minimal 6 karakter."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_password", password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengganti password.");
      setPassword("");
      setMsg("Password berhasil diperbarui.");
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function logout() {
    setLoggingOut(true);
    try { await fetch("/api/auth/session", { method: "DELETE" }); } catch {}
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 md:pb-16">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-extrabold text-[#1A2E1A]">Pengaturan Akun</h1>
        <p className="mt-1 text-sm text-[#1A2E1A]/70">Kelola nama, keamanan, dan sesi login Anda.</p>

        {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{msg}</div>}
        {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{err}</div>}

        <div className="mt-6 space-y-5">
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14532D] text-white text-lg font-extrabold">{(initialSession.name?.trim()[0] || "U").toUpperCase()}</span>
              <div>
                <p className="font-extrabold text-[#1A2E1A]">{initialSession.name}</p>
                <p className="text-xs text-[#1A2E1A]/60 capitalize">Role: {initialSession.role} • {initialSession.origin}</p>
              </div>
            </div>
            <form onSubmit={saveName} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Lihat / Ganti Nama Panggilan
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm font-semibold text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                </div>
              </label>
              <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F3F22] disabled:opacity-60"><Save className="h-4 w-4" />Simpan Nama</button>
            </form>
          </section>

          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1A2E1A] mb-3">Ganti Password</h2>
            {initialSession.origin === "warga_kode" ? (
              <p className="text-sm text-[#1A2E1A]/70">Akun warga menggunakan kode akses (tanpa password). Untuk keluar/ganti akun, gunakan tombol Log Out di bawah.</p>
            ) : (
              <form onSubmit={savePassword} className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Password Baru
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Minimal 6 karakter" className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                  </div>
                </label>
                <button type="submit" disabled={saving || password.length < 6} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#14532D] bg-white px-5 py-2.5 text-sm font-extrabold text-[#14532D] hover:bg-[#FDFBF7] disabled:opacity-50"><Save className="h-4 w-4" />Simpan Password</button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1A2E1A] mb-1">Keluar dari Akun</h2>
            <p className="text-sm text-[#1A2E1A]/70 mb-4">Akhiri sesi login di perangkat ini. Anda bisa masuk kembali kapan saja.</p>
            <button type="button" onClick={logout} disabled={loggingOut} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-red-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"><LogOut className="h-4 w-4" />{loggingOut ? "Keluar..." : "Log Out"}</button>
          </section>
        </div>
      </div>
    </div>
  );
}
