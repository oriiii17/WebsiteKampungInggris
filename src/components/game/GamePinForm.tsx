"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PinCodeInput from "@/components/game/PinCodeInput";

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
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <PinCodeInput id="games-join-pin" label="PIN kuis, 6 angka" value={pin} onChange={(value) => { setPin(value); if (error) setError(""); }} invalid={Boolean(error)} describedBy={error ? "game-pin-error" : undefined} className="sm:flex-1 sm:max-w-[22rem]" />
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ba472f] px-6 py-3.5 text-base font-bold text-white transition duration-150 hover:bg-[#943520] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244b3a] sm:w-auto"
          >
            <span>Gabung</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      {error && (
        <p id="game-pin-error" role="alert" className="mt-2 text-left text-sm font-semibold text-[#943520]">
          {error}
        </p>
      )}
    </form>
  );
}
