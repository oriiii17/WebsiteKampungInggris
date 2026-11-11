"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";

export default function GamePinForm({ initialName }: { initialName?: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-2xl border-2 border-[#14532D] bg-white p-2 shadow-lg sm:p-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(val);
                if (error) setError("");
              }}
              placeholder="Masukkan PIN 6 Angka"
              className="w-full rounded-xl border border-gray-200 py-3.5 pl-11 pr-4 text-center sm:text-left text-lg font-bold tracking-widest text-[#111827] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 focus:border-[#14532D] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 min-h-[48px]"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-[#D97706] transition active:scale-[0.98] min-h-[48px]"
          >
            <span>Gabung Kuis</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600 text-center">
          {error}
        </p>
      )}
    </form>
  );
}
