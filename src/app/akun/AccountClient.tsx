"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, LogOut, Save, User, Lock } from "lucide-react";
import type { SessionPayload } from "@/lib/types";

const MAX_PHOTO = 10 * 1024 * 1024;

export default function AccountClient({ initialSession, wargaDeferred = false }: { initialSession: SessionPayload; wargaDeferred?: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [name, setName] = useState(initialSession.name || "");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>((initialSession as any).avatarDataUrl);
  const [hasNewPhoto, setHasNewPhoto] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { setSession(initialSession); setName(initialSession.name || ""); setAvatarDataUrl((initialSession as any).avatarDataUrl); }, [initialSession]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoErr(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) { setPhotoErr("Foto harus berformat JPG atau PNG."); e.target.value = ""; return; }
    if (f.size > MAX_PHOTO) { setPhotoErr("Ukuran foto maksimal 10MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      if (!data.startsWith("data:image/")) { setPhotoErr("Gagal membaca foto."); return; }
      setAvatarDataUrl(data); // tampil instan (preview)
      setHasNewPhoto(true);
      setMsg("Foto siap disimpan. Klik Simpan Profil.");
    };
    reader.readAsDataURL(f);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (name.trim().length < 2) { setErr("Nama minimal 2 karakter."); return; }
    if (photoErr) { setErr(photoErr); return; }
    setSavingProfile(true);
    try {
      const payload = { action: "update_profile", name: name.trim(), ...(hasNewPhoto && avatarDataUrl ? { avatarDataUrl } : {}) };
      const res = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Gagal menyimpan profil.");
      if (data.session) setSession(data.session);
      setHasNewPhoto(false);
      setMsg("Profil berhasil diperbarui.");
      router.refresh();
    } catch (e: any) { setErr(e.message || "Gagal menyimpan profil."); } finally { setSavingProfile(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!oldPassword) { setErr("Kata Sandi lama wajib diisi."); return; }
    if (newPassword.length < 8) { setErr("Kata Sandi baru minimal 8 karakter."); return; }
    if (newPassword !== confirmPassword) { setErr("Konfirmasi kata sandi baru tidak cocok."); return; }
    setSavingPass(true);
    try {
      const res = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_password", oldPassword, password: newPassword, confirmPassword }) });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Gagal mengganti password.");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setMsg(data.message || "Kata Sandi berhasil diperbarui. Sesi tetap login.");
    } catch (e: any) { setErr(e.message || "Gagal mengganti password."); } finally { setSavingPass(false); }
  }

  async function logout() {
    setLoggingOut(true);
    try { await fetch("/api/auth/session", { method: "DELETE" }); } catch {}
    router.push("/");
    router.refresh();
  }

  const isWarga = session.origin === "warga_kode";
  const initial = (name.trim()[0] || "U").toUpperCase();

  if (isWarga && wargaDeferred) return <main className="grid min-h-[calc(100dvh-5rem)] place-items-center bg-[#FDFBF7] px-4 py-10"><section className="w-full max-w-md rounded-2xl border border-[#d2c5ad] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-extrabold uppercase tracking-wide text-[#625f54]">Warga Sapen</p><h1 className="mt-2 font-display text-3xl font-bold text-[#183b2d]">Akses warga aktif</h1><p className="mt-3 text-sm leading-6 text-[#3d4038]">Kamu bisa terus masuk dengan kode akses, atau membuat akun email dan kata sandi agar lebih mudah masuk berikutnya.</p><Link href="/masuk?mode=warga&account=1" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#ba472f] px-4 text-sm font-extrabold text-white hover:bg-[#943520]">Daftar Akun</Link><button type="button" onClick={logout} disabled={loggingOut} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a] hover:bg-[#f3e9d5] disabled:opacity-60"><LogOut className="h-4 w-4" />{loggingOut ? "Keluar…" : "Logout"}</button>{err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}</section></main>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 md:pb-16">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-extrabold text-[#1A2E1A]">Pengaturan akun</h1>
        <p className="mt-1 text-sm text-[#1A2E1A]/70">Ubah profil dan kata sandi akun Anda.</p>

        {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{msg}</div>}
        {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{err}</div>}

        <div className="mt-6 space-y-5">
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1A2E1A] mb-4">Ubah Profil</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-[#14532D] text-white flex items-center justify-center text-xl font-extrabold border border-[#E5E7EB]">
                  {avatarDataUrl ? <img src={avatarDataUrl} alt="Foto profil" className="h-full w-full object-cover" /> : initial}
                </div>
                <div className="flex-1">
                  <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-[#14532D] bg-white px-4 py-2 text-sm font-bold text-[#14532D] hover:bg-[#FDFBF7]">
                    <ImagePlus className="h-4 w-4" /> Pilih Foto (JPG/PNG, maks 10MB)
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPickPhoto} />
                  </label>
                  {photoErr && <p className="mt-1 text-xs font-semibold text-red-700">{photoErr}</p>}
                  <p className="mt-1 text-[11px] text-[#1A2E1A]/60">Foto tampil instan sebagai preview, disimpan saat klik Simpan Profil.</p>
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Nama
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm font-semibold text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                </div>
              </label>

              <button type="submit" disabled={savingProfile} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F3F22] disabled:opacity-60"><Save className="h-4 w-4" />{savingProfile ? "Menyimpan..." : "Simpan Profil"}</button>
            </form>
          </section>

          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1A2E1A] mb-3">Ubah Kata Sandi</h2>
            {isWarga ? (
              <p className="text-sm text-[#1A2E1A]/70">Akun warga menggunakan kode akses tanpa kata sandi. Untuk berganti akun, gunakan tombol Keluar di bawah.</p>
            ) : (
              <form onSubmit={savePassword} className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Kata Sandi Lama
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type={showOld ? "text" : "password"} value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)} className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-11 text-sm text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                    <button type="button" onClick={()=>setShowOld(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500" aria-label="Tampilkan/sembunyikan">{showOld ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                  </div>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Kata Sandi Baru
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} minLength={8} placeholder="Minimal 8 karakter" className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-11 text-sm text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                    <button type="button" onClick={()=>setShowNew(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500" aria-label="Tampilkan/sembunyikan">{showNew ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                  </div>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/70">Konfirmasi Kata Sandi Baru
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} minLength={8} className="w-full rounded-md border border-[#E5E7EB] py-3 pl-10 pr-11 text-sm text-[#1A2E1A] focus:border-[#14532D] focus:outline-none" />
                    <button type="button" onClick={()=>setShowConfirm(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500" aria-label="Tampilkan/sembunyikan">{showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                  </div>
                </label>
                <p className="text-[11px] text-[#1A2E1A]/60">Urutan: Kata Sandi Lama, Kata Sandi Baru, Konfirmasi. Setelah berhasil, Anda tetap login.</p>
                <button type="submit" disabled={savingPass} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#14532D] bg-white px-5 py-2.5 text-sm font-extrabold text-[#14532D] hover:bg-[#FDFBF7] disabled:opacity-50"><Save className="h-4 w-4" />{savingPass ? "Menyimpan..." : "Simpan Kata Sandi"}</button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-[#1A2E1A] mb-1">Keluar dari Akun</h2>
            <p className="text-sm text-[#1A2E1A]/70 mb-4">Akhiri sesi login di perangkat ini. Anda bisa masuk kembali kapan saja.</p>
            <button type="button" onClick={logout} disabled={loggingOut} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-red-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"><LogOut className="h-4 w-4" />{loggingOut ? "Keluar..." : "Keluar"}</button>
          </section>
        </div>
      </div>
    </div>
  );
}
