"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatIDR, formatRupiahDigits, MAX_PRICE_IDR } from "@/lib/currency";

type CurrencyInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onValidityChange?: (valid: boolean) => void;
  className?: string;
};

function caretAfterDigits(formatted: string, digitsBeforeCaret: number) {
  if (digitsBeforeCaret <= 0) return 0;
  let digits = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) digits += 1;
    if (digits === digitsBeforeCaret) return index + 1;
  }
  return formatted.length;
}

export default function CurrencyInput({ label, value, onChange, onValidityChange, className = "" }: CurrencyInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const syncedValue = useRef(value);
  const [display, setDisplay] = useState(() => formatRupiahDigits(String(Math.max(0, Math.round(value || 0)))));
  const [message, setMessage] = useState(value > MAX_PRICE_IDR ? `Harga maksimal ${formatIDR(MAX_PRICE_IDR)}.` : "");

  useEffect(() => {
    if (value !== syncedValue.current) {
      syncedValue.current = value;
      setDisplay(formatRupiahDigits(String(Math.max(0, Math.round(value || 0)))));
    }
    const invalid = !Number.isSafeInteger(value) || value < 0 || value > MAX_PRICE_IDR;
    setMessage(invalid ? `Harga harus berupa bilangan bulat dari 0 sampai ${formatIDR(MAX_PRICE_IDR)}.` : "");
    onValidityChange?.(!invalid);
    inputRef.current?.setCustomValidity(invalid ? `Harga maksimal ${formatIDR(MAX_PRICE_IDR)}.` : "");
  }, [value, onValidityChange]);

  const editDigits = (digits: string, digitsBeforeCaret: number) => {
    const normalized = digits.replace(/^0+(?=\d)/, "");
    const nextDisplay = formatRupiahDigits(normalized);
    const nextValue = Number(normalized || "0");
    if (!Number.isSafeInteger(nextValue) || nextValue > MAX_PRICE_IDR) {
      const maximum = formatIDR(MAX_PRICE_IDR);
      const error = `Harga maksimal ${maximum}. Kurangi nilainya untuk melanjutkan.`;
      setDisplay(nextDisplay);
      setMessage(error);
      onValidityChange?.(false);
      inputRef.current?.setCustomValidity(error);
      requestAnimationFrame(() => {
        const position = caretAfterDigits(nextDisplay, digitsBeforeCaret);
        inputRef.current?.setSelectionRange(position, position);
      });
      return;
    }
    setDisplay(nextDisplay);
    setMessage("");
    syncedValue.current = nextValue;
    onValidityChange?.(true);
    inputRef.current?.setCustomValidity("");
    onChange(nextValue);
    requestAnimationFrame(() => {
      const position = caretAfterDigits(nextDisplay, digitsBeforeCaret);
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  return <div className={className}>
    <label htmlFor={inputId} className="block text-sm font-bold text-[#183b2d]">{label}</label>
    <div className="mt-1.5 flex min-h-11 items-center rounded-lg border border-[#b8aa8e] bg-white focus-within:border-[#244b3a] focus-within:ring-2 focus-within:ring-[#244b3a]/20">
      <span aria-hidden="true" className="select-none pl-3 pr-1 text-sm font-bold text-[#625f54]">Rp</span>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        aria-describedby={`${inputId}-help`}
        aria-invalid={Boolean(message)}
        onKeyDown={(event) => {
          if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault();
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (!/^\d+$/.test(pasted)) {
            event.preventDefault();
            setMessage("Masukkan angka saja tanpa huruf atau simbol.");
            return;
          }
        }}
        onChange={(event) => {
          const input = event.currentTarget;
          const digitsBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
          editDigits(input.value.replace(/\D/g, ""), digitsBeforeCaret);
        }}
        className="h-11 min-w-0 flex-1 rounded-r-lg bg-transparent py-2 pl-1 pr-3 text-sm font-normal text-[#20251f] outline-none"
      />
    </div>
    <p id={`${inputId}-help`} aria-live="polite" className={`mt-1 block text-xs ${message ? "font-semibold text-[#943520]" : "text-[#625f54]"}`}>
      {message || (value === 0 ? "Gratis" : formatIDR(value))}
    </p>
  </div>;
}
