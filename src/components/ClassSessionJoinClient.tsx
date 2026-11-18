"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type PublicSession = { id: string; code: string; title: string; status: string; requireApproval?: boolean; canAttendAsMember?: boolean; registrationStatus?: string; classId?: string; classTitle?: string; classSlug?: string; startsAt?: string };
const inputClass = "mt-1.5 min-h-12 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";

export default function ClassSessionJoinClient({ code }: { code: string }) {
  const [session, setSession] = useState<PublicSession | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/class-sessions/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kode sesi tidak ditemukan.");
      setSession(data.session);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sesi belum dapat dimuat."); }
    finally { setLoading(false); }
  }, [code]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (session?.registrationStatus !== "pending") return;
    const timer = window.setInterval(() => {
      fetch(`/api/class-sessions/${encodeURIComponent(code)}`, { cache: "no-store" }).then((response) => response.json()).then((data) => {
        if (data.session) setSession(data.session);
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [code, session?.registrationStatus]);

  const join = async (event?: React.FormEvent) => {
    event?.preventDefault(); setSubmitting(true); setError(""); setNotice("");
    try {
      const consent = document.querySelector<HTMLInputElement>('input[name="session-consent"]')?.checked === true;
      if (!session?.canAttendAsMember && !consent) throw new Error("Centang persetujuan sebelum melanjutkan.");
      const response = await fetch(`/api/class-sessions/${encodeURIComponent(code)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, whatsapp, consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Presensi belum berhasil.");
      if (data.status === "pending") setNotice("Pendaftaran diterima. Tutor akan memeriksa permintaanmu sebelum akses sesi dibuka.");
      else setNotice("Presensi berhasil dicatat. Selamat belajar!");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Presensi belum berhasil."); }
    finally { setSubmitting(false); }
  };

  if (loading && !session) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] text-[#244b3a]"><p className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />Memeriksa kode sesi…</p></main>;
  const isApproved = session?.registrationStatus === "approved";
  const isPending = session?.registrationStatus === "pending";
  const isRejected = session?.registrationStatus === "rejected";
  const isFuture = Boolean(session?.startsAt && new Date(session.startsAt).getTime() > Date.now());
  return <main className="min-h-screen bg-[#f3e9d5] px-4 py-10 text-[#20251f] sm:px-8"><div className="mx-auto max-w-2xl">
    <Link href="/sesi" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a] underline"><ArrowLeft className="h-4 w-4" />Masukkan kode sesi</Link>
    {error && !session && <section className="mt-8 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-6"><h1 className="text-2xl font-bold text-[#183b2d]">Sesi belum ditemukan</h1><p role="alert" className="mt-2 text-sm text-[#943520]">{error}</p><Link href="/sesi" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white">Coba kode lain<ArrowRight className="h-4 w-4" /></Link></section>}
    {session && <><header className="mt-7 border-y border-[#d2c5ad] py-6"><p className="text-xs font-bold uppercase tracking-wide text-[#625f54]">Sesi tatap muka · kode {session.code}</p><h1 className="mt-2 font-display text-4xl font-bold leading-tight text-[#183b2d]">{session.title}</h1><p className="mt-3 text-sm text-[#3d4038]">{session.classTitle ? `Kelas: ${session.classTitle}` : "Kelas sesi ini belum tersedia."}{session.startsAt ? ` · ${new Date(session.startsAt).toLocaleString("id-ID")}` : ""}</p><p className="mt-2 text-sm text-[#3d4038]">{session.status !== "open" ? "Sesi ini telah ditutup." : isFuture ? "Sesi belum dibuka. Presensi dapat dilakukan sesuai jadwal." : "Sesi sedang berlangsung atau siap dimulai."}</p></header>
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#244b3a]/20 bg-[#e6eadf] p-4 text-sm font-bold text-[#183b2d]">{notice}</p>}
      {isPending && <section className="mt-6 rounded-xl bg-[#fdf9f0] p-5"><h2 className="font-bold text-[#183b2d]">Menunggu persetujuan pengurus</h2><p className="mt-2 text-sm leading-6 text-[#3d4038]">Status diperiksa otomatis. Halaman ini akan berubah setelah pengurus memutuskan.</p><button type="button" onClick={() => void refresh()} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a] underline"><RefreshCw className="h-4 w-4" />Periksa status sekarang</button></section>}
      {isApproved && <section className="mt-6 space-y-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 sm:p-7"><div className="flex items-center gap-3 text-[#183b2d]"><CheckCircle2 className="h-6 w-6" /><h2 className="text-xl font-bold">Presensi tercatat</h2></div>{session.classSlug ? <Link href={`/kelas/${encodeURIComponent(session.classSlug)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white">Buka kelas dan materi<ArrowRight className="h-4 w-4" /></Link> : <p className="text-sm text-[#943520]">Kelas induk sesi ini belum dapat dibuka.</p>}</section>}
      {isRejected && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#3d4038]">Pendaftaran tamu ini belum disetujui. Hubungi pengurus sesi jika perlu bantuan.</p>}
      {isFuture && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#3d4038]">Pendaftaran dibuka saat sesi dimulai.</p>}
      {!isApproved && !isPending && !isRejected && !isFuture && session.status === "open" && <>{session.canAttendAsMember ? <section className="mt-6 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5"><h2 className="text-lg font-bold text-[#183b2d]">Presensi sebagai warga</h2><p className="mt-2 text-sm leading-6 text-[#3d4038]">Akun warga memberi akses ke seluruh materi asinkron. Catat kehadiranmu untuk sesi ini.</p><button type="button" disabled={submitting} onClick={() => void join()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Mencatat…" : "Catat kehadiran"}<ArrowRight className="h-4 w-4" /></button></section> : <form onSubmit={(event) => void join(event)} className="mt-6 space-y-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 sm:p-7"><div><h2 className="text-xl font-bold text-[#183b2d]">Daftar sebagai peserta tamu</h2><p className="mt-2 text-sm leading-6 text-[#3d4038]">Isi nama dan nomor WhatsApp untuk mencatat kehadiran. Nomor hanya digunakan untuk keperluan sesi ini.</p></div><label className="block text-sm font-bold">Nama<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" className={inputClass} /></label><label className="block text-sm font-bold">Nomor WhatsApp<input required type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="Contoh: 081234567890" className={inputClass} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Gunakan nomor aktif dengan kode negara atau awalan 0.</span></label><label className="flex items-start gap-2 text-xs leading-5 text-[#625f54]"><input name="session-consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#244b3a]" />Saya setuju nama dan nomor ini digunakan untuk pendaftaran serta presensi sesi.</label>{error && <p role="alert" className="text-sm font-bold text-[#943520]">{error}</p>}<button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Mencatat presensi…" : "Daftar dan presensi"}<ArrowRight className="h-4 w-4" /></button></form>}</>}
      {session.status === "closed" && !isApproved && !isPending && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#625f54]">Sesi sudah ditutup dan pendaftaran tidak lagi tersedia.</p>}
    </>}
  </div></main>;
}
