"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Clock, Gamepad2, KeyRound, Layers, Sparkles, Trophy, Zap } from "lucide-react";

const GAME_TYPES = [
  { id: "telling-time", title: "Telling the Time", subtitle: "Waktu & Jam", desc: "Membaca jam dalam Bahasa Inggris: o'clock, half past, quarter to/past.", icon: Clock },
  { id: "word-match", title: "Vocabulary Match", subtitle: "Kosakata Harian", desc: "Mencocokkan kata benda, profesi, dan benda di sekitar rumah tangga.", icon: Sparkles },
  { id: "word-builder", title: "Word Builder", subtitle: "Menyusun Kalimat", desc: "Menyusun kepingan kata acak menjadi struktur kalimat yang utuh dan benar.", icon: Layers },
  { id: "story-quest", title: "Story Quest", subtitle: "Membaca & Memahami", desc: "Membaca cerita pendek interaktif tentang warga Kampung Sapen.", icon: BookOpen },
  { id: "quick-quiz", title: "Quick Quiz", subtitle: "Kuis Kilat Kelas", desc: "Tantangan kecepatan & akurasi tata bahasa dan frasa sehari-hari.", icon: Zap },
];

export default function GameIndexPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      setError("PIN harus terdiri dari 6 angka.");
      return;
    }
    setError("");
    router.push(`/game/join?pin=${cleanPin}`);
  };

  return (
    <div className="workbook-page min-h-screen">
      <section className="workbook-wrap pb-14 pt-10 sm:pb-20 sm:pt-16">
        <div className="grid overflow-hidden rounded-2xl border border-leaf-dark bg-leaf text-white shadow-card md:grid-cols-[.92fr_1.08fr]">
          <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12">
            <div>
              <div className="mb-8 flex items-center gap-2 text-sm font-bold text-white/75"><Gamepad2 className="h-5 w-5 text-sunshine" /> Lembar aktivitas · game kelas</div>
              <h1 className="max-w-lg font-display text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">Satu PIN. Satu kelas. Ayo main.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/80">Masukkan PIN yang ditampilkan pengajar untuk bergabung ke kuis bahasa Inggris secara langsung.</p>
            </div>
            <Link href="/leaderboard" className="mt-10 inline-flex min-h-11 w-fit items-center gap-2 border-b border-sunshine pb-1 text-sm font-bold text-white hover:text-sunshine"><Trophy className="h-4 w-4 text-sunshine" />Lihat papan peringkat <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="bg-paper-light p-6 text-ink sm:p-10 lg:p-12">
            <div className="mb-7 border-b-2 border-ink pb-4">
              <p className="workbook-print-note">Gabung sesi live</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">Tulis PIN kelasmu</h2>
            </div>
            <form onSubmit={handleJoinSubmit} className="max-w-lg">
              <label htmlFor="game-pin" className="text-sm font-bold text-body">PIN 6 angka</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-leaf" />
                  <input id="game-pin" type="text" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(val); if (error) setError(""); }} placeholder="Contoh: 482615" className="min-h-14 w-full rounded-md border border-rule-strong bg-white py-3 pl-12 pr-4 text-lg font-bold tracking-[.18em] text-ink placeholder:text-sm placeholder:font-normal placeholder:tracking-normal" />
                </div>
                <button type="submit" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-earth px-5 py-3 text-sm font-extrabold text-white transition hover:bg-earth-dark">Gabung kuis <ArrowRight className="h-4 w-4" /></button>
              </div>
              {error && <p role="alert" className="mt-3 text-sm font-bold text-earth">{error}</p>}
              <p className="mt-3 text-xs text-muted">PIN diberikan oleh pengajar atau host sesi.</p>
            </form>
          </div>
        </div>
      </section>

      <section className="workbook-section bg-paper-light">
        <div className="workbook-wrap">
          <div className="mb-9 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><p className="workbook-print-note">Cara ikut</p><h2 className="workbook-section-heading mt-3">Dari papan kelas ke layar HP.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-muted">Gunakan HP masing-masing. Tidak perlu mengunduh aplikasi tambahan.</p>
          </div>
          <ol className="grid border-y border-rule md:grid-cols-3">
            {[
              { num: "01", title: "Lihat PIN di depan", desc: "Pengajar membuka sesi dan menampilkan PIN di layar atau papan tulis." },
              { num: "02", title: "Masukkan nama & PIN", desc: "Tulis nama panggilan dan PIN untuk masuk ke ruang tunggu kelas." },
              { num: "03", title: "Jawab bersama", desc: "Pilih jawaban dari HP. Skor kecepatan dan ketepatan dihitung di sesi." },
            ].map((step, i) => <li key={step.num} className={`py-6 md:px-6 ${i > 0 ? "border-t border-rule md:border-l md:border-t-0" : "md:pl-0"}`}><span className="font-display text-3xl text-earth">{step.num}</span><h3 className="mt-3 text-2xl">{step.title}</h3><p className="mt-2 text-sm leading-6 text-body">{step.desc}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="workbook-section">
        <div className="workbook-wrap">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="workbook-print-note">Isi lembar permainan</p><h2 className="workbook-section-heading mt-3">Pilih latihan yang mau dimainkan.</h2></div>
            <Link href="/leaderboard" className="inline-flex min-h-11 items-center gap-2 font-bold text-leaf underline decoration-sunshine underline-offset-4"><Trophy className="h-4 w-4" />Papan peringkat</Link>
          </div>
          <div className="workbook-index">
            {GAME_TYPES.map((game, index) => { const Icon = game.icon; return (
              <article key={game.id} className="grid gap-4 border-b border-rule py-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center sm:gap-6">
                <span className="font-display text-3xl text-earth">{String(index + 1).padStart(2, "0")}</span>
                <div><div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-leaf"><Icon className="h-4 w-4" />{game.subtitle}<span className="text-muted">· Game kelas</span></div><h3 className="text-2xl">{game.title}</h3><p className="mt-1 text-sm leading-6 text-body">{game.desc}</p></div>
                <span className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-muted"><Gamepad2 className="h-4 w-4 text-earth" />Dimainkan saat sesi kelas</span>
              </article>
            ); })}
          </div>
        </div>
      </section>
    </div>
  );
}
