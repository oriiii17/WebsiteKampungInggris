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
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#14532D] text-white mb-3">
          <Gamepad2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Gabung Kuis Kelas</h1>
        <p className="text-xs text-[#6B7280] mt-1">
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
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
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
              className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-center font-mono text-xl font-bold tracking-widest text-[#111827] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 focus:border-[#14532D] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 min-h-[48px]"
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
              className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-base font-semibold text-[#111827] placeholder:font-normal placeholder:text-gray-400 focus:border-[#14532D] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 min-h-[48px]"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Wajib isi nama sendiri (min. 2-3 huruf). Nama ini akan muncul di papan skor.
          </p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#14532D] py-3.5 px-4 text-base font-bold text-white hover:bg-[#0f3d21] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition active:scale-[0.99] min-h-[48px] mt-6"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Informasi Game</span>
        </Link>
      </div>
    </div>
  );
}
