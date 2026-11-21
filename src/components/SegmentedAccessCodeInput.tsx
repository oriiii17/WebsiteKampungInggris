"use client";

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const GROUPS = [3, 2, 2] as const;

export default function SegmentedAccessCodeInput({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const maskTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (maskTimer.current !== null) window.clearTimeout(maskTimer.current);
  }, []);

  function revealBriefly() {
    setVisible(true);
    if (maskTimer.current !== null) window.clearTimeout(maskTimer.current);
    maskTimer.current = window.setTimeout(() => setVisible(false), 1000);
  }

  function replaceFrom(start: number, inserted: string) {
    const chars = value.padEnd(7, " ").split("");
    for (let offset = 0; offset < inserted.length && start + offset < 7; offset += 1) {
      chars[start + offset] = inserted[offset];
    }
    const next = chars.join("").replace(/\s+$/, "");
    onChange(next);
    if (inserted) {
      const nextIndex = Math.min(start + inserted.length, 6);
      inputs.current[nextIndex]?.focus();
    }
    if (next) revealBriefly();
  }

  function clearAt(index: number) {
    const chars = value.padEnd(7, " ").split("");
    chars[index] = " ";
    const next = chars.join("").replace(/\s+$/, "");
    onChange(next);
    if (!next) setVisible(false);
  }

  let offset = 0;
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label="Kode akses baru, tujuh karakter" className="grid grid-cols-[3fr_auto_2fr_auto_2fr] items-center gap-1.5 sm:gap-2">
        {GROUPS.map((length, groupIndex) => {
          const start = offset;
          offset += length;
          return (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && <span aria-hidden="true" className="font-bold text-muted">–</span>}
              <div className="flex min-w-0 justify-center gap-1">
                {Array.from({ length }, (_, position) => {
                  const index = start + position;
                  const char = value[index] || "";
                  return (
                    <input
                      key={index}
                      ref={(element) => { inputs.current[index] = element; }}
                      type="text"
                      value={visible ? char : char ? "*" : ""}
                      onChange={(event) => {
                        const typed = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        replaceFrom(index, typed.slice(-1));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace") {
                          event.preventDefault();
                          if (char) clearAt(index);
                          else if (index > 0) inputs.current[index - 1]?.focus();
                        } else if (event.key === "ArrowLeft" && index > 0) {
                          event.preventDefault();
                          inputs.current[index - 1]?.focus();
                        } else if (event.key === "ArrowRight" && index < 6) {
                          event.preventDefault();
                          inputs.current[index + 1]?.focus();
                        }
                      }}
                      onPaste={(event) => {
                        event.preventDefault();
                        const pasted = event.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
                        if (pasted) replaceFrom(index, pasted.slice(0, 7 - index));
                      }}
                      inputMode={index < 3 ? "text" : "numeric"}
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={2}
                      aria-label={groupIndex === 0 ? `Awalan karakter ${position + 1}` : `${groupIndex === 1 ? "RW" : "RT"} karakter ${position + 1}`}
                      className="h-11 w-8 rounded-lg border border-rule-strong bg-white p-0 text-center font-mono text-sm font-bold uppercase text-ink focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 sm:w-9"
                    />
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            if (visible) {
              if (maskTimer.current !== null) window.clearTimeout(maskTimer.current);
              setVisible(false);
            } else revealBriefly();
          }}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-bold text-leaf hover:bg-forest-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {visible ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
    </div>
  );
}
