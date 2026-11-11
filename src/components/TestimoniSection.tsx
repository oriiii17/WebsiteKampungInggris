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
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(Boolean(isLoggedIn));
  }, [isLoggedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !komentar.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testimoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, komentar }),
      });
      if (res.ok) {
        setSubmitted(true);
        setKomentar("");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const loginAction = (
    <Link
      href="/masuk"
      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#14532D] text-[#14532D] px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-green-50"
    >
      <LogIn className="h-4 w-4" /> Masuk untuk Menulis Ulasan
    </Link>
  );

  return (
    <div className="space-y-8">
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-gray-50 p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-[#14532D]">
            <MessageSquarePlus className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-gray-900">Belum ada ulasan yang diterbitkan</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">Jadilah yang pertama membagikan pengalaman belajarmu di platform ini!</p>
          {mounted && authed ? (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white transition hover:bg-[#0F3F22]"
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
                className="flex gap-4 p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#14532D]/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 text-[#F59E0B] mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed text-gray-700 max-w-xl">&ldquo;{item.komentar}&rdquo;</p>
                </div>
                <div className="flex-shrink-0 ml-auto flex flex-col items-end">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-[#14532D] font-extrabold text-xs mb-2">
                    {item.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-extrabold text-gray-900">{item.nama}</h4>
                    <p className="text-xs text-gray-500">Pengguna Terverifikasi</p>
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
                className="inline-flex items-center gap-2 rounded-xl border border-[#14532D] text-[#14532D] px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-green-50"
              >
                <MessageSquarePlus className="h-4 w-4" /> Bagikan Pengalamanmu
              </button>
            </div>
          ) : null}

          {!mounted || !authed ? (
            <div className="mt-8 text-center">
              <Link
                href="/masuk"
                className="inline-flex items-center gap-2 rounded-xl border border-[#14532D] text-[#14532D] px-5 py-2.5 text-xs sm:text-sm font-extrabold transition hover:bg-green-50"
              >
                <LogIn className="h-4 w-4" /> Masuk untuk Menulis Ulasan
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {/* Form kirim ulasan */}
      {mounted && authed && showForm && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
          {submitted ? (
            <div className="rounded-lg bg-green-50 p-4 text-center text-sm font-bold text-[#14532D] border border-green-200">
              Terima kasih! Ulasanmu telah dikirimkan dan akan segera ditampilkan setelah diverifikasi pengurus.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-4">
                <h4 className="text-base font-extrabold text-gray-900">Bagikan Pengalaman Belajarmu</h4>
                <p className="text-xs text-gray-500 mt-0.5">Ceritakan pengalamanmu belajar di platform ini untuk memotivasi pengguna lain.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Nama yang Ditampilkan</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama panggilan Anda"
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Kesan & Cerita Belajar</label>
                <textarea
                  required
                  rows={3}
                  value={komentar}
                  onChange={(e) => setKomentar(e.target.value)}
                  placeholder="Ceritakan pengalamanmu belajar di platform ini..."
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#14532D] py-2.5 text-xs font-bold text-white hover:bg-[#0F3F22] disabled:opacity-60"
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