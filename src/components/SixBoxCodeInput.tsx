"use client";

import React from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  onCompleteChange?: (code: string, complete: boolean) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  groupClassName?: string;
  masked?: boolean;
};

function normalizeChar(ch: string): string {
  const up = ch.toUpperCase();
  return /^[A-Z0-9]$/.test(up) ? up : "";
}

export function toCodeString(digits: string[]): string {
  const joined = digits.join("");
  if (joined.length !== 6) return "";
  return `${joined.slice(0, 3)}-${joined.slice(3)}`;
}

export default function SixBoxCodeInput({ value, onChange, onCompleteChange, inputRefs, groupClassName, masked = false }: Props) {
  function emit(next: string[]) {
    onChange(next);
    const code = toCodeString(next);
    if (onCompleteChange) onCompleteChange(code, next.every((c) => c !== ""));
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const char = normalizeChar(raw.slice(-1));
    if (!char && raw !== "") return;
    const next = [...value];
    next[i] = char;
    emit(next);
    if (char && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = [...value];
        next[i] = "";
        emit(next);
      } else if (i > 0) {
        const next = [...value];
        next[i - 1] = "";
        emit(next);
        inputRefs.current[i - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const chars = (e.clipboardData.getData("text") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).split("");
    if (chars.length === 0) return;
    const next = [...value];
    for (let k = 0; k < 6; k++) next[k] = chars[k] || "";
    emit(next);
    const focusIndex = Math.min(chars.length, 6) - 1;
    inputRefs.current[focusIndex >= 0 ? focusIndex : 0]?.focus();
  }

  const box = "h-11 w-9 sm:h-12 sm:w-11 rounded-lg border border-[#E5E7EB] bg-white text-center text-base sm:text-lg font-bold uppercase text-gray-900 focus:border-[#14532D] focus:outline-none focus:ring-1 focus:ring-[#14532D]";
  const renderBox = (i: number) => (
    <input
      key={i}
      type={masked ? "password" : "text"}
      ref={(el) => { inputRefs.current[i] = el; }}
      value={value[i]}
      onChange={(e) => handleChange(i, e)}
      onKeyDown={(e) => handleKeyDown(i, e)}
      onPaste={handlePaste}
      inputMode="text"
      autoCapitalize="characters"
      autoCorrect="off"
      maxLength={1}
      aria-label={`Kode karakter ${i + 1}`}
      autoComplete="one-time-code"
      spellCheck={false}
      className={box}
    />
  );

  return (
    <div role="group" aria-label="Kode warga, enam karakter" className={groupClassName || "flex items-center justify-center gap-1.5 sm:gap-2"}>
      <div className="flex items-center gap-1.5 sm:gap-2">{[0, 1, 2].map(renderBox)}</div>
      <span className="px-0.5 text-lg font-bold text-gray-400 select-none" aria-hidden="true">-</span>
      <div className="flex items-center gap-1.5 sm:gap-2">{[3, 4, 5].map(renderBox)}</div>
    </div>
  );
}
