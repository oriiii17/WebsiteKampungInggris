"use client";

import { useEffect, useRef, useState } from "react";
import SessionCodeBoxes from "@/components/SessionCodeBoxes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarClock, Camera, CircleHelp } from "lucide-react";

export default function ClassSessionCodeClient() {
  const [codeChars, setCodeChars] = useState(Array(6).fill("")); const code = codeChars.join(""); const router = useRouter();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
    const detectorConstructor = (window as Window & { BarcodeDetector?: new () => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!detectorConstructor) return;
    const detector = new detectorConstructor();
    let active = true;
    const scan = async () => {
      if (!active || !videoRef.current) return;
      try {
        const found = await detector.detect(videoRef.current);
        const value = found[0]?.rawValue || "";
        const match = value.match(/\/sesi\/([a-z0-9]{6})(?:[/?#]|$)/i) || value.match(/^([a-z0-9]{6})$/i);
        if (match?.[1]) { active = false; setCameraStream(null); router.push(`/sesi/${match[1].toUpperCase()}`); return; }
      } catch { /* Terus memindai hingga kamera membaca QR atau pengguna menutupnya. */ }
      window.setTimeout(scan, 350);
    };
    void scan();
    return () => { active = false; cameraStream.getTracks().forEach((track) => track.stop()); };
  }, [cameraStream, router]);
  async function openScanner() {
    setScanError("");
    const detectorAvailable = "BarcodeDetector" in window;
    if (!detectorAvailable || !navigator.mediaDevices?.getUserMedia) { setScanError("Pemindai QR belum didukung di browser ini. Masukkan kode sesi secara manual."); return; }
    try { setCameraStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })); }
    catch { setScanError("Kamera belum dapat dibuka. Izinkan akses kamera atau masukkan kode sesi secara manual."); }
  }
  function submit(event: React.FormEvent) { event.preventDefault(); if (code.length === 6) router.push(`/sesi/${code}`); }
  return <main className="min-w-0 bg-[#f3e9d5] px-4 py-10 text-[#20251f] sm:px-8 sm:py-16"><div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 lg:grid-cols-[1.1fr_.9fr]"><section className="min-w-0 rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-6 shadow-sm sm:p-10"><Link href="/" className="inline-flex min-h-10 items-center text-sm font-bold text-[#244b3a] underline underline-offset-4">← Kembali ke beranda</Link><CalendarClock className="mt-7 h-8 w-8 text-[#244b3a]" /><h1 className="mt-4 font-display text-4xl font-bold text-[#183b2d]">Masuk ke sesi kelasmu</h1><p className="mt-3 text-base leading-7 text-[#3d4038]">Masukkan kode yang dibagikan tutor untuk mencatat kehadiran dan membuka sesi.</p><form onSubmit={submit} className="mt-7 min-w-0"><label className="block text-sm font-bold">Kode sesi · 6 karakter</label><SessionCodeBoxes value={codeChars} onChange={setCodeChars} /><button type="submit" disabled={code.length !== 6} title={code.length !== 6 ? "Isi 6 karakter kode dulu" : undefined} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ba472f] px-5 text-base font-bold text-white hover:bg-[#943520] disabled:cursor-not-allowed disabled:opacity-45">Masuk ke sesi<ArrowRight className="h-5 w-5" /></button><p className="mt-2 text-sm text-[#625f54]">{code.length === 6 ? "Kode siap diperiksa." : `Isi 6 karakter kode dulu (${code.length}/6).`}</p></form><button type="button" onClick={() => void openScanner()} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[#244b3a] underline underline-offset-4"><Camera className="h-4 w-4" />Pindai QR</button>{scanError && <p role="status" className="mt-2 text-sm text-[#943520]">{scanError}</p>}<Link href="/faq" className="mt-4 flex min-h-11 items-center gap-2 text-sm font-bold text-[#244b3a] underline underline-offset-4"><CircleHelp className="h-4 w-4" />Tidak punya kode?</Link></section><aside className="min-w-0 rounded-2xl bg-[#244b3a] p-6 text-white sm:p-9"><h2 className="font-display text-2xl font-bold text-white">Cara masuk</h2><ol className="mt-6 space-y-6">{[["Dapatkan kode dari tutor", "Tutor membagikan kode atau QR sesi."], ["Masukkan kode", "Ketik enam karakter kode di kolom."], ["Presensi tercatat", "Kehadiranmu tersimpan di sesi kelas."]].map(([title, desc], i) => <li key={title} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f3e9d5] font-bold text-[#183b2d]">{i + 1}</span><span><strong className="block">{title}</strong><span className="mt-1 block text-sm leading-6 text-white/80">{desc}</span></span></li>)}</ol></aside></div>{cameraStream && <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" className="w-full max-w-lg rounded-2xl bg-[#fdf9f0] p-5"><h2 id="qr-dialog-title" className="text-xl font-bold text-[#183b2d]">Arahkan kamera ke QR sesi</h2><video ref={videoRef} autoPlay playsInline muted className="mt-4 aspect-video w-full rounded-xl bg-black"/><button type="button" onClick={() => setCameraStream(null)} className="mt-4 min-h-11 rounded-lg border border-[#b8aa8e] px-4 font-bold text-[#244b3a]">Tutup pemindai</button></section></div>}</main>;
}
