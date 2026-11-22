"use client";

import React, { useEffect, useState } from "react";
import { MessageSquarePlus, Send, Star, LogIn } from "lucide-react";
import { TestimoniRecord } from "@/lib/types";
import Link from "next/link";

interface TestimoniSectionProps {
  initialTestimoni: TestimoniRecord[];
  isLoggedIn: boolean;
  currentUserName?: string;
}

export default function TestimoniSection({
  initialTestimoni,
  isLoggedIn,
  currentUserName,
}: TestimoniSectionProps) {
  const [list] = useState<TestimoniRecord[]>(initialTestimoni);
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState(currentUserName || "");
  const [komentar, setKomentar] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(Boolean(isLoggedIn));
  }, [isLoggedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nama.trim() || !komentar.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testimoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, komentar }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Ulasan belum dapat dikirim. Silakan coba lagi.");
      setSubmitted(true);
      setKomentar("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ulasan belum dapat dikirim. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const loginAction = (
    <Link
      href="/masuk"
      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-leaf text-leaf px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-leaf-soft"
    >
      <LogIn className="h-4 w-4" /> Masuk untuk Menulis Ulasan
    </Link>
  );

  return (
    <div className="space-y-8">
      {list.length === 0 ? (
        <div className="home-empty-review border border-rule bg-paper-light p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-leaf text-sunshine">
            <MessageSquarePlus className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-ink">Belum ada ulasan yang diterbitkan</h3>
          <p className="mt-1 text-sm text-muted max-w-md mx-auto">Jadilah yang pertama membagikan pengalaman belajarmu di platform ini!</p>
          {mounted && authed ? (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="home-review-action mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-earth px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-earth-dark"
            >
              <MessageSquarePlus className="h-4 w-4" /> Tulis Ulasan Pertama
            </button>
          ) : (
            loginAction
          )}
        </div>
      ) : (
        <div>
          {/* Editorial List Layout */}
          <div className="space-y-4">
            {list.map((item) => (
              <article
                key={item.id}
                className="grid gap-5 border-b border-rule py-6 md:grid-cols-[1fr_auto] md:items-end md:gap-10"
              >
                <div className="flex-shrink-0">
                  <div className="mb-3 flex items-center gap-1 text-earth">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed text-body max-w-xl">&ldquo;{item.komentar}&rdquo;</p>
                </div>
                <div className="flex-shrink-0 ml-auto flex flex-col items-end">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-leaf text-white font-extrabold text-xs">
                    {item.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-extrabold text-ink">{item.nama}</h4>
                    <p className="text-xs text-muted">Pengguna Terverifikasi</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Tombol tulis ulasan - hanya jika sudah login */}
          {mounted && authed && !showForm && !submitted ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-leaf text-leaf px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-leaf-soft"
              >
                <MessageSquarePlus className="h-4 w-4" /> Bagikan Pengalamanmu
              </button>
            </div>
          ) : null}

          {!mounted || !authed ? (
            <div className="mt-8 text-center">
              <Link
                href="/masuk"
                className="inline-flex items-center gap-2 rounded-xl border border-leaf text-leaf px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-leaf-soft"
              >
                <LogIn className="h-4 w-4" /> Masuk untuk Menulis Ulasan
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {/* Form kirim ulasan */}
      {mounted && authed && showForm && (
        <div className="border-y border-rule-strong bg-paper-light p-6 sm:p-8">
          {submitted ? (
            <div className="rounded-lg bg-leaf-soft p-4 text-center text-sm font-bold text-leaf border border-leaf/25">
              Terima kasih! Ulasanmu telah dikirimkan dan akan segera ditampilkan setelah diverifikasi pengurus.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-4">
                <h4 className="text-base font-extrabold text-ink">Bagikan Pengalaman Belajarmu</h4>
                <p className="text-xs text-muted mt-0.5">Ceritakan pengalamanmu belajar di platform ini untuk memotivasi pengguna lain.</p>
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

              <div>
                <label className="block text-xs font-bold text-body uppercase tracking-wider">Nama yang Ditampilkan</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama panggilan Anda"
                  className="mt-1 w-full rounded-lg border border-rule-strong bg-paper-light px-3.5 py-2.5 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-body uppercase tracking-wider">Kesan & Cerita Belajar</label>
                <textarea
                  required
                  rows={3}
                  value={komentar}
                  onChange={(e) => setKomentar(e.target.value)}
                  placeholder="Ceritakan pengalamanmu belajar di platform ini..."
                  className="mt-1 w-full rounded-lg border border-rule-strong bg-paper-light px-3.5 py-2.5 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-rule-strong py-2.5 text-xs font-bold text-body hover:bg-paper-deep"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-earth py-2.5 text-xs font-bold text-white shadow-sm hover:bg-earth-dark disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {loading ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
