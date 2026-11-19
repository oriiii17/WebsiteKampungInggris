"use client";

import { useState } from "react";
import { X } from "lucide-react";

const inputClass = "min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";

export default function TagInput({ label, values, onChange, placeholder = "Tulis satu nilai lalu tekan Enter", uppercase = false }: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  uppercase?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const normalize = (value: string) => uppercase ? value.trim().toUpperCase() : value.trim();
  const add = (value: string) => {
    const additions = value.split(/[,;\/\n]+/).map(normalize).filter(Boolean);
    if (!additions.length) return;
    onChange([...values, ...additions.filter((entry) => !values.some((current) => current.toLocaleLowerCase() === entry.toLocaleLowerCase()))]);
    setDraft("");
  };
  return <div className="space-y-2">
    <label className="block text-sm font-bold text-[#20251f]">{label}
      <input className={inputClass} value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); add(draft); }
        if ([",", ";", "/"].includes(event.key)) { event.preventDefault(); add(draft); }
      }} onPaste={(event) => {
        const pasted = event.clipboardData.getData("text");
        if (/[,;\/\n]/.test(pasted)) { event.preventDefault(); add([draft, pasted].filter(Boolean).join("\n")); }
      }} />
    </label>
    {!!values.length && <ul aria-label={`${label}, nilai yang ditambahkan`} className="flex flex-wrap gap-2">
      {values.map((value, index) => <li key={`${value}-${index}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#d2c5ad] bg-white pl-3 pr-1 text-sm text-[#244b3a]">
        <span>{value}</span><button type="button" onClick={() => onChange(values.filter((_, current) => current !== index))} className="grid h-11 w-11 place-items-center rounded-md hover:bg-[#f3e9d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]" aria-label={`Hapus ${value}`}><X aria-hidden="true" className="h-4 w-4" /></button>
      </li>)}
    </ul>}
  </div>;
}
