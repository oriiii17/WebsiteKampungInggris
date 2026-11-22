"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type PublicSession = { id: string; code: string; title: string; status: string; requireApproval?: boolean; canAttendAsMember?: boolean; registrationStatus?: string; viewerType?: "guest" | "regular" | "visitor"; classId?: string; classTitle?: string; classSlug?: string; startsAt?: string; activeGamePin?: string | null; participantName?: string };
const inputClass = "mt-1.5 min-h-12 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const countryDialCodes = [
  { code: "ID", flag: "🇮🇩", name: "Indonesia", dial: "62" }, { code: "MY", flag: "🇲🇾", name: "Malaysia", dial: "60" },
  { code: "SG", flag: "🇸🇬", name: "Singapura", dial: "65" }, { code: "BN", flag: "🇧🇳", name: "Brunei", dial: "673" },
  { code: "TH", flag: "🇹🇭", name: "Thailand", dial: "66" }, { code: "PH", flag: "🇵🇭", name: "Filipina", dial: "63" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", dial: "84" }, { code: "TL", flag: "🇹🇱", name: "Timor-Leste", dial: "670" },
  { code: "AU", flag: "🇦🇺", name: "Australia", dial: "61" }, { code: "NZ", flag: "🇳🇿", name: "Selandia Baru", dial: "64" },
  { code: "JP", flag: "🇯🇵", name: "Jepang", dial: "81" }, { code: "KR", flag: "🇰🇷", name: "Korea Selatan", dial: "82" },
  { code: "CN", flag: "🇨🇳", name: "Tiongkok", dial: "86" }, { code: "IN", flag: "🇮🇳", name: "India", dial: "91" },
  { code: "SA", flag: "🇸🇦", name: "Arab Saudi", dial: "966" }, { code: "AE", flag: "🇦🇪", name: "Uni Emirat Arab", dial: "971" },
  { code: "GB", flag: "🇬🇧", name: "Britania Raya", dial: "44" }, { code: "DE", flag: "🇩🇪", name: "Jerman", dial: "49" },
  { code: "FR", flag: "🇫🇷", name: "Prancis", dial: "33" }, { code: "NL", flag: "🇳🇱", name: "Belanda", dial: "31" },
  { code: "US", flag: "🇺🇸", name: "Amerika Serikat", dial: "1" }, { code: "CA", flag: "🇨🇦", name: "Kanada", dial: "1" },
];

export default function ClassSessionJoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [scanEntry, setScanEntry] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("ID");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leavingSession, setLeavingSession] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const redirectedToGame = useRef(false);
  const redirectedToClass = useRef(false);
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
  useEffect(() => { setScanEntry(new URLSearchParams(window.location.search).get("entry") === "scan"); }, []);
  useEffect(() => {
    if (session?.canAttendAsMember && !name) setName(session.participantName || "");
  }, [name, session?.canAttendAsMember, session?.participantName]);
  useEffect(() => {
    if (session?.status !== "open") return;
    const timer = window.setInterval(() => {
      fetch(`/api/class-sessions/${encodeURIComponent(code)}`, { cache: "no-store" }).then((response) => response.json()).then((data) => {
        if (data.session) setSession(data.session);
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [code, session?.status]);

  useEffect(() => {
    if (!scanEntry || redirectedToGame.current || session?.viewerType !== "guest" || session.registrationStatus !== "approved" || !session.activeGamePin) return;
    redirectedToGame.current = true;
    try { sessionStorage.setItem("sapen_scan_guest_name", session.participantName || name); } catch {}
    const params = new URLSearchParams({ pin: session.activeGamePin, entry: "scan" });
    router.replace(`/game/join?${params.toString()}`);
  }, [name, router, scanEntry, session]);

  useEffect(() => {
    if (redirectedToClass.current || !["guest", "regular"].includes(session?.viewerType || "") || session?.registrationStatus !== "approved") return;
    if (scanEntry && session.activeGamePin) { redirectedToClass.current = true; return; }
    if (session.classSlug) {
      redirectedToClass.current = true;
      router.replace(`/kelas/${encodeURIComponent(session.classSlug)}`);
    }
  }, [router, scanEntry, session]);

  const acknowledgeEndedSession = async () => {
    if (!session || leavingSession) return;
    setLeavingSession(true);
    setLeaveError("");
    try {
      if (session.viewerType === "guest") {
        const response = await fetch("/api/auth/session?scope=guest", { method: "DELETE" });
        if (!response.ok) throw new Error("Sesi tamu belum berhasil dibersihkan. Coba tekan OK lagi.");
      } else if (session.viewerType === "regular") {
        const response = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear_class_session" }) });
        if (!response.ok) throw new Error("Konteks sesi belum berhasil dibersihkan. Coba tekan OK lagi.");
      }
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      router.replace("/");
    } catch (reason) {
      setLeaveError(reason instanceof Error ? reason.message : "Belum dapat kembali ke beranda. Coba lagi.");
      setLeavingSession(false);
    }
  };

  const returnToHome = async () => {
    if (leavingSession) return;
    setLeavingSession(true);
    setLeaveError("");
    try {
      if (session?.viewerType === "guest") {
        const response = await fetch("/api/auth/session?scope=guest", { method: "DELETE", cache: "no-store" });
        if (!response.ok) throw new Error("Sesi Guest belum berhasil dibersihkan. Coba lagi.");
      } else if (session?.viewerType === "regular") {
        const response = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear_class_session" }) });
        if (!response.ok) throw new Error("Konteks sesi belum berhasil dibersihkan. Coba lagi.");
      }
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      router.replace("/");
    } catch (reason) {
      setLeaveError(reason instanceof Error ? reason.message : "Belum dapat kembali ke beranda. Coba lagi.");
      setLeavingSession(false);
    }
  };

  const join = async (event?: React.FormEvent) => {
    event?.preventDefault(); setSubmitting(true); setError(""); setNotice("");
    let apiResponseDetails: { status: number; body: unknown } | undefined;
    try {
      const consent = document.querySelector<HTMLInputElement>('input[name="session-consent"]')?.checked === true;
      if (!consent) throw new Error("Centang persetujuan sebelum melanjutkan.");
      const cleanName = name.trim().replace(/\s+/g, " ");
      const localNumber = whatsapp.replace(/\D/g, "");
      const dialCode = countryDialCodes.find((country) => country.code === countryCode)?.dial || "62";
      const cleanWhatsapp = localNumber ? `${dialCode}${localNumber}` : "";
      if (cleanName.length < 2 || cleanName.length > 80) throw new Error("Nama harus berisi 2–80 karakter.");
      if (cleanWhatsapp && !/^\+?[0-9]{9,15}$/.test(cleanWhatsapp)) throw new Error("Nomor WhatsApp harus berisi 9–15 digit, atau kosongkan jika tidak memilikinya.");
      const payload = { name: cleanName, whatsapp: cleanWhatsapp, code, consent };
      const response = await fetch(`/api/class-sessions/${encodeURIComponent(code)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      apiResponseDetails = { status: response.status, body: data };
      if (!response.ok) throw new Error(response.status >= 500 ? "Server sedang mengalami kendala. Data belum berhasil disimpan; coba beberapa saat lagi." : data.error || "Pendaftaran belum berhasil. Periksa data lalu coba lagi.");
      if (data.ok !== true || !["approved", "pending"].includes(data.status)) throw new Error("Respons pendaftaran belum dapat dikonfirmasi. Periksa status sesi sebelum mencoba lagi.");
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      window.dispatchEvent(new Event("sapen:session-registration-updated"));
      setSession((current) => current ? { ...current, registrationStatus: data.status, canAttendAsMember: false, activeGamePin: data.activeGamePin || null, participantName: data.participantName || cleanName } : current);
      if (data.status === "pending") setNotice(data.participantType === "account" || data.participantType === "member" ? "Permintaan diterima. Pengurus akan menyetujui akses sebelum sesi dibuka untukmu." : "Pendaftaran diterima. Pengurus akan memeriksa permintaanmu sebelum akses sesi dibuka.");
      else setNotice("Presensi berhasil dicatat. Selamat belajar!");
    } catch (reason) {
      console.error("Pendaftaran sesi tamu gagal", { code, apiResponse: apiResponseDetails, error: reason });
      setError(reason instanceof Error ? reason.message : "Pendaftaran belum berhasil. Periksa koneksi lalu coba lagi.");
    }
    finally { setSubmitting(false); }
  };

  if (loading && !session) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] text-[#244b3a]"><p className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />Memeriksa kode sesi…</p></main>;
  const isApproved = session?.registrationStatus === "approved";
  const isPending = session?.registrationStatus === "pending";
  const isRejected = session?.registrationStatus === "rejected";
  const isFuture = Boolean(session?.startsAt && new Date(session.startsAt).getTime() > Date.now());
  if (isPending) return <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[#f3e9d5] px-4 py-10 text-[#20251f]"><section className="w-full max-w-lg rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] p-6 text-center shadow-[0_18px_48px_rgba(32,37,31,.09)] sm:p-9"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e6eadf] text-[#244b3a]"><Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /></span><p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-[#625f54]">Sesi {session.code}</p><h1 className="mt-2 font-display text-3xl font-bold leading-tight text-[#183b2d]">Menunggu persetujuan pengurus</h1><p className="mt-3 text-sm leading-6 text-[#3d4038]">Permintaanmu untuk bergabung ke {session.title} sudah diterima. Kelas dan Kuis akan terbuka setelah pengurus menyetujui aksesmu.</p>{notice && <p role="status" className="mt-4 rounded-lg bg-[#e6eadf] p-3 text-sm font-semibold text-[#183b2d]">{notice}</p>}{leaveError && <p role="alert" className="mt-4 rounded-lg bg-[#fff1eb] p-3 text-sm font-semibold text-[#8e321f]">{leaveError}</p>}<div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a] hover:bg-[#e6eadf]"><RefreshCw className="h-4 w-4" />Periksa status</button><button type="button" onClick={() => void returnToHome()} disabled={leavingSession} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d] disabled:opacity-60"><ArrowLeft className="h-4 w-4" />{leavingSession ? "Kembali…" : "Kembali ke Beranda"}</button></div></section></main>;
  return <main className="min-h-screen bg-[#f3e9d5] px-4 py-10 text-[#20251f] sm:px-8"><div className="mx-auto max-w-2xl">
    <button type="button" onClick={() => void returnToHome()} disabled={leavingSession} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-4 text-sm font-bold text-[#244b3a] hover:bg-[#e8eee5] disabled:opacity-60"><ArrowLeft className="h-4 w-4" />{leavingSession ? "Kembali…" : "Kembali ke Beranda"}</button>
    {leaveError && <p role="alert" className="mt-3 rounded-lg bg-[#fff1eb] p-3 text-sm font-semibold text-[#8e321f]">{leaveError}</p>}
    {error && !session && <section className="mt-8 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-6"><h1 className="text-2xl font-bold text-[#183b2d]">Sesi belum ditemukan</h1><p role="alert" className="mt-2 text-sm text-[#943520]">{error}</p><Link href="/sesi" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white">Coba kode lain<ArrowRight className="h-4 w-4" /></Link></section>}
    {session && <><header className="mt-7 border-y border-[#d2c5ad] py-6"><p className="text-xs font-bold uppercase tracking-wide text-[#625f54]">Sesi tatap muka · kode {session.code}</p><h1 className="mt-2 font-display text-4xl font-bold leading-tight text-[#183b2d]">{session.title}</h1><p className="mt-3 text-sm text-[#3d4038]">{session.classTitle ? `Kelas: ${session.classTitle}` : "Kelas sesi ini belum tersedia."}{session.startsAt ? ` · ${new Date(session.startsAt).toLocaleString("id-ID")}` : ""}</p><p className="mt-2 text-sm text-[#3d4038]">{session.status !== "open" ? "Sesi ini telah ditutup." : isFuture ? "Sesi belum dibuka. Presensi dapat dilakukan sesuai jadwal." : "Sesi sedang berlangsung atau siap dimulai."}</p></header>
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#244b3a]/20 bg-[#e6eadf] p-4 text-sm font-bold text-[#183b2d]">{notice}</p>}
      {isPending && <section className="mt-6 rounded-xl bg-[#fdf9f0] p-5"><h2 className="font-bold text-[#183b2d]">Menunggu persetujuan pengurus</h2><p className="mt-2 text-sm leading-6 text-[#3d4038]">Status diperiksa otomatis. Halaman ini akan berubah setelah pengurus memutuskan.</p><button type="button" onClick={() => void refresh()} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a] underline"><RefreshCw className="h-4 w-4" />Periksa status sekarang</button></section>}
      {isApproved && <section className="mt-6 space-y-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 sm:p-7"><div className="flex items-center gap-3 text-[#183b2d]"><CheckCircle2 className="h-6 w-6" /><h2 className="text-xl font-bold">Presensi tercatat</h2></div>{session.classSlug ? <Link href={`/kelas/${encodeURIComponent(session.classSlug)}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white">Buka kelas dan materi<ArrowRight className="h-4 w-4" /></Link> : <p className="text-sm text-[#943520]">Kelas induk sesi ini belum dapat dibuka.</p>}</section>}
      {isRejected && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#3d4038]">Pendaftaran tamu ini belum disetujui. Hubungi pengurus sesi jika perlu bantuan.</p>}
      {isFuture && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#3d4038]">Pendaftaran dibuka saat sesi dimulai.</p>}
      {!isApproved && !isPending && !isRejected && !isFuture && session.status === "open" && <form onSubmit={(event) => void join(event)} className="mt-6 space-y-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 sm:p-7"><div><h2 className="text-xl font-bold text-[#183b2d]">{session.canAttendAsMember ? "Minta bergabung sebagai warga" : "Daftar sebagai peserta tamu"}</h2><p className="mt-2 text-sm leading-6 text-[#3d4038]">{session.canAttendAsMember ? "Isi nama yang ingin ditampilkan dan nomor WhatsApp jika ada. Pengurus akan menyetujui permintaan sebelum akses sesi dibuka." : "Isi nama untuk mencatat kehadiran. Nomor WhatsApp boleh dikosongkan."}</p></div><label className="block text-sm font-bold">Nama<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" className={inputClass} /></label><div className="space-y-2"><div className="flex flex-wrap items-baseline justify-between gap-1"><label htmlFor="guest-whatsapp" className="text-sm font-bold text-[#20251f]">Nomor WhatsApp <span className="font-normal text-[#625f54]">(opsional)</span></label><span className="text-xs text-[#625f54]">Boleh dikosongkan</span></div><div className="grid grid-cols-[minmax(8.5rem,.8fr)_minmax(0,1.2fr)] gap-2"><label className="sr-only" htmlFor="guest-country-code">Kode negara</label><select id="guest-country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="min-h-12 min-w-0 rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-2 text-sm text-[#20251f] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20">{countryDialCodes.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name} (+{country.dial})</option>)}</select><div className="flex min-w-0 items-center overflow-hidden rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] focus-within:border-[#244b3a] focus-within:ring-2 focus-within:ring-[#244b3a]/20"><span aria-hidden="true" className="shrink-0 border-r border-[#d8cdb9] px-3 py-3 text-sm font-bold text-[#244b3a]">+{countryDialCodes.find((country) => country.code === countryCode)?.dial}</span><input id="guest-whatsapp" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={15} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value.replace(/\D/g, ""))} placeholder="822 1234 5678" className="min-h-12 min-w-0 w-full bg-transparent px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:outline-none" /></div></div><p className="text-xs leading-5 text-[#514b3e]">Pilih kode negara, lalu masukkan nomor tanpa angka 0 di depan. Nomor hanya untuk keperluan sesi.</p></div><label className="flex items-start gap-2 text-xs leading-5 text-[#625f54]"><input name="session-consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#244b3a]" />Saya setuju nama dan nomor WhatsApp (jika diisi) digunakan untuk pendaftaran serta presensi sesi.</label>{error && <p role="alert" className="text-sm font-bold text-[#943520]">{error}</p>}<button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-50">{submitting ? session.canAttendAsMember ? "Mengirim permintaan…" : "Mencatat presensi…" : session.canAttendAsMember ? "Kirim permintaan persetujuan" : "Daftar dan presensi"}<ArrowRight className="h-4 w-4" /></button></form>}
      {session.status === "closed" && !isApproved && !isPending && <p role="status" className="mt-6 rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm text-[#625f54]">Sesi sudah ditutup dan pendaftaran tidak lagi tersedia.</p>}
    </>}
  </div>{session?.status === "closed" && session.viewerType !== "visitor" && <div className="session-ended-backdrop" role="presentation"><section className="session-ended-panel" role="alertdialog" aria-modal="true" aria-labelledby="session-ended-title" aria-describedby="session-ended-description"><div className="session-ended-icon"><CheckCircle2 aria-hidden="true" /></div><h2 id="session-ended-title" className="session-ended-title">Sesi sudah ditutup</h2><p id="session-ended-description" className="session-ended-message">Sesi sudah ditutup. Silakan kembali ke beranda.</p>{leaveError && <p role="alert" className="session-ended-error">{leaveError}</p>}<div className="session-ended-actions"><button type="button" autoFocus disabled={leavingSession} onClick={() => void acknowledgeEndedSession()}>{leavingSession ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan…</> : "OK"}</button></div></section></div>}</main>;
}
