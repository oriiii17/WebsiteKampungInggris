"use client";

import { useRef } from "react";

export default function SessionCodeBoxes({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const normalize = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const paste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const chars = normalize(event.clipboardData.getData("text")).slice(0, 6).split("");
    if (!chars.length) return;
    onChange(Array.from({ length: 6 }, (_, index) => chars[index] || ""));
    refs.current[Math.min(chars.length, 6) - 1]?.focus();
  };
  return <div role="group" aria-label="Kode sesi, enam karakter" className="mt-2 flex w-full min-w-0 gap-2 sm:gap-3">{value.map((char, index) => <input key={index} ref={(element) => { refs.current[index] = element; }} aria-label={`Karakter kode ${index + 1}`} autoComplete={index === 0 ? "one-time-code" : "off"} autoCapitalize="characters" spellCheck={false} inputMode="text" maxLength={1} value={char} onPaste={paste} onKeyDown={(event) => { if (event.key === "Backspace" && !char && index > 0) refs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus(); }} onChange={(event) => { const chars = normalize(event.target.value); if (!chars) { const next = [...value]; next[index] = ""; onChange(next); return; } if (chars.length > 1) { const next = [...value]; chars.slice(0, 6 - index).split("").forEach((item, offset) => { next[index + offset] = item; }); onChange(next); refs.current[Math.min(index + chars.length, 6) - 1]?.focus(); return; } const next = [...value]; next[index] = chars; onChange(next); if (index < 5) refs.current[index + 1]?.focus(); }} className="h-14 w-0 min-w-0 flex-1 rounded-xl border border-[#b8aa8e] bg-white text-center font-mono text-2xl font-bold uppercase text-[#183b2d] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" />)}</div>;
}
