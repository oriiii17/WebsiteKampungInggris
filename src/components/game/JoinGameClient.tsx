"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gamepad2, KeyRound, User, Loader2 } from "lucide-react";

export default function JoinGameClient({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pinParam = searchParams.get("pin");
    if (pinParam) {
      setPin(pinParam.replace(/\D/g, "").slice(0, 6));
    }
    // Auto-fill HANYA dari nama terakhir yang pernah diketik user ini di HP yang sama (bukan default sistem)
    try {
      const last = (localStorage.getItem("sapen_last_quiz_name") || "").trim();
      if (last) setName(last);
    } catch {}
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPin = pin.trim().replace(/\D/g, "");
    const cleanName = name.trim();

    if (!cleanPin || cleanPin.length !== 6) {
      setError("PIN sesi harus berupa 6 digit angka.");
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      setError("Nama panggilan minimal 2-3 huruf.");
      return;
    }

    setLoading(true);

    try {
      let playerId = localStorage.getItem("sapen_player_id");
      if (!playerId) {
        playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem("sapen_player_id", playerId);
      }

      // Simpan nama terakhir yang diketik user ini (bukan default sistem)
      try { localStorage.setItem("sapen_last_quiz_name", cleanName); } catch {}

      const res = await fetch(`/api/game/live/${cleanPin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: cleanName,
          playerId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal masuk ke sesi kuis. Pastikan PIN benar.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem(`sapen_game_${cleanPin}`, JSON.stringify({
        playerId: data.playerId,
        playerName: data.playerName,
      }));

      router.push(`/game/play/${cleanPin}`);
    } catch (err: any) {
      setError("Terjadi gangguan koneksi jaringan. Coba lagi.");
      setLoading(false);
    }
  };

  const nameTrimmed = name.trim();
  const canSubmit = !loading && pin.length === 6 && nameTrimmed.length >= 2;

  return (
    <div className="rounded-2xl border border-rule bg-paper-light p-6 shadow-card sm:p-8">
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-leaf text-white">
          <Gamepad2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl">Gabung Kuis Kelas</h1>
        <p className="mt-1 text-xs text-muted">
          Masukkan PIN dari host dan nama panggilanmu untuk mulai bertanding.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
            Kode PIN Sesi
          </label>
          <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
              <KeyRound className="h-5 w-5" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Contoh: 849201"
              required
              className="min-h-[48px] w-full rounded-md border border-rule-strong bg-white py-3 pl-11 pr-4 text-center font-mono text-xl font-bold tracking-widest text-ink placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
            Nama Panggilanmu
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <User className="h-5 w-5" />
            </div>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi, Sari, Kak Andi..."
              required
              className="min-h-[48px] w-full rounded-md border border-rule-strong bg-white py-3 pl-11 pr-4 text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Wajib isi nama sendiri (min. 2-3 huruf). Nama ini akan muncul di papan skor.
          </p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-earth px-4 py-3.5 text-base font-bold text-white transition hover:bg-earth-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Menghubungkan ke Kelas...</span>
            </>
          ) : (
            <span>Mulai Masuk Kuis</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <Link
          href="/game"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Informasi Game</span>
        </Link>
      </div>
    </div>
  );
}
