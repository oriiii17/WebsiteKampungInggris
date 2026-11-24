"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlignLeft, ArrowLeft, ArrowRight, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, GripVertical, Headphones, Link2, ListChecks, Loader2, MonitorPlay, MoveDown, Plus, Save, Search, Smartphone, Trash2, Volume2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TagInput from "@/components/ui/TagInput";
import { createEmptyBlueprint, GAME_TEMPLATES, getGameBlueprintPublishIssue, type GameBlueprint, type GameBlueprintDestination, type GameBlueprintItem, type GameBlueprintPublishIssue, type GameTemplateId } from "@/lib/game-blueprint";
import { evaluateBlueprintAnswer } from "@/lib/game-engine";

import GameCardHeader from "@/components/game/GameCardHeader";

const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-white px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const iconButtonClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] text-[#244b3a] transition hover:bg-[#e6eadf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] disabled:opacity-45";
const templateVisuals = {
  "multiple-choice-quiz": { Icon: ListChecks, tone: "bg-[#e6eadf] text-[#244b3a]" },
  "drag-and-sort": { Icon: MoveDown, tone: "bg-[#f2e5bf] text-[#6d5411]" },
  "listen-and-choose": { Icon: Headphones, tone: "bg-[#f2dfd6] text-[#943520]" },
  "sentence-builder": { Icon: AlignLeft, tone: "bg-[#e5e7dc] text-[#34472d]" },
  matching: { Icon: Link2, tone: "bg-[#eadfd0] text-[#705033]" },
  "word-bank": { Icon: BookOpenText, tone: "bg-[#e8e2d7] text-[#564b38]" },
  "word-search": { Icon: Search, tone: "bg-[#e2e7de] text-[#36563d]" },
} as const;
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function comparableGame(game: GameBlueprint) {
  const { updatedAt: _updatedAt, ...stable } = game;
  return JSON.stringify(stable);
}

function GamePreview({ game, item, viewport }: { game: GameBlueprint; item: GameBlueprintItem; viewport: "phone" | "class" }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [builtIndices, setBuiltIndices] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Record<number, string>>({});
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [entry, setEntry] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const sentenceTokens = item.words || [];
  const answer = game.template === "multiple-choice-quiz" || game.template === "listen-and-choose" ? choice
    : game.template === "sentence-builder" ? builtIndices.map((index) => sentenceTokens[index])
      : game.template === "drag-and-sort" ? categories
        : game.template === "matching" ? (item.pairs || []).map((pair, index) => ({ left: pair.left, right: pairs[index] || "" }))
          : game.template === "word-search" ? foundWords : entry;
  const check = () => setChecked(evaluateBlueprintAnswer(game, item, answer));
  const speak = () => {
    const words = item.audioText || item.prompt;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(words));
  };
  const controlClass = "min-h-11 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm text-[#20251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]";

  return <section className={`overflow-hidden rounded-xl border border-[#d2c5ad] bg-[#e6eadf] ${viewport === "phone" ? "mx-auto w-full max-w-[360px]" : "w-full"}`} aria-label="Pratinjau kuis interaktif"><div className="border-b border-[#d2c5ad] px-4 py-3"><h3 className="font-bold text-[#183b2d]">Pratinjau: {game.title || "Kuis baru"}</h3><p className="mt-1 text-xs text-[#3d4038]">{GAME_TEMPLATES.find((template) => template.id === game.template)?.title} · {game.level}</p></div><div className="space-y-4 bg-[#fdf9f0] p-5">{item.imageUrl && <img src={item.imageUrl} alt="Gambar soal" className="max-h-72 w-full rounded-lg object-contain" />}<p className="text-sm font-semibold leading-6 text-[#20251f]">{item.prompt || "Instruksi soal akan tampil di sini."}</p>
    {game.template === "multiple-choice-quiz" && <div className="space-y-2">{(item.options || []).map((option, index) => <button key={option.id} type="button" onClick={() => { setChoice(index); setChecked(null); }} className={`min-h-11 w-full rounded-lg border px-3 text-left text-sm ${choice === index ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-white"}`}>{option.text || `Pilihan ${index + 1}`}</button>)}</div>}
    {game.template === "listen-and-choose" && <div className="space-y-2"><button type="button" onClick={speak} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]"><Volume2 className="h-4 w-4" />Dengarkan</button>{(item.options || []).map((option, index) => <button key={option.id} type="button" onClick={() => { setChoice(index); setChecked(null); }} className={`min-h-11 w-full rounded-lg border px-3 text-left text-sm ${choice === index ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-white"}`}>{option.text || `Pilihan ${index + 1}`}</button>)}</div>}
    {game.template === "drag-and-sort" && <div className="space-y-2">{(item.sortItems || []).map((sortItem, index) => <label key={`${sortItem.text}-${index}`} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm"><span>{sortItem.text || `Kata ${index + 1}`}</span><select aria-label={`Kategori untuk ${sortItem.text || `kata ${index + 1}`}`} className={controlClass} value={categories[index] || ""} onChange={(event) => setCategories((current) => { const next = [...current]; next[index] = event.target.value; return next; })}><option value="">Pilih kategori</option>{(item.categories || []).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>)}</div>}
    {game.template === "sentence-builder" && <div className="space-y-3"><div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-[#b8aa8e] p-2">{builtIndices.length ? builtIndices.map((index, order) => <span key={`${index}-${order}`} className="rounded-md bg-[#e6eadf] px-2 py-1 text-sm">{sentenceTokens[index]}</span>) : <span className="self-center text-xs text-[#625f54]">Ketuk kata untuk menyusun kalimat.</span>}</div><div className="flex flex-wrap gap-2">{sentenceTokens.map((word, index) => <button key={`${word}-${index}`} type="button" disabled={builtIndices.includes(index)} onClick={() => { setBuiltIndices((current) => [...current, index]); setChecked(null); }} className={`${controlClass} disabled:opacity-40`}>{word}</button>)}</div><button type="button" onClick={() => { setBuiltIndices([]); setChecked(null); }} className="min-h-9 text-xs font-bold text-[#244b3a] underline">Kosongkan susunan</button></div>}
    {game.template === "matching" && <div className="space-y-2">{(item.pairs || []).map((pair, index) => <label key={index} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm"><span>{pair.left}</span><select className={controlClass} aria-label={`Pasangan untuk ${pair.left}`} value={pairs[index] || ""} onChange={(event) => setPairs((current) => ({ ...current, [index]: event.target.value }))}><option value="">Pilih pasangan</option>{(item.pairs || []).map((option, optionIndex) => <option key={optionIndex} value={option.right}>{option.right}</option>)}</select></label>)}</div>}
    {game.template === "word-bank" && <div className="space-y-3"><div className="rounded-lg border border-[#d2c5ad] bg-white p-4"><p className="text-lg font-bold text-[#183b2d]">{item.vocabulary?.[0]?.term || "Kosakata"}</p>{revealed && <><p className="mt-2 text-sm text-[#3d4038]">{item.vocabulary?.[0]?.translation || "Arti kata"}</p>{item.vocabulary?.[0]?.example && <p className="mt-2 text-xs italic text-[#625f54]">{item.vocabulary[0].example}</p>}</>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setRevealed((value) => !value)} className="min-h-11 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white">{revealed ? "Sembunyikan arti" : "Lihat arti"}</button><button type="button" onClick={speak} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]"><Volume2 className="h-4 w-4" />Dengar</button></div></div>}
    {game.template === "word-search" && <div className="space-y-3"><div className="grid w-fit gap-1" role="group" aria-label="Kotak huruf">{(item.grid || []).map((row, rowIndex) => <div key={rowIndex} className="flex gap-1">{row.split("").map((letter, columnIndex) => <span key={columnIndex} className="grid h-8 w-8 place-items-center rounded border border-[#d2c5ad] bg-white text-sm font-bold">{letter}</span>)}</div>)}</div><p className="text-xs font-bold text-[#3d4038]">Kata yang dicari: {(item.words || []).join(" · ")}</p><div className="flex flex-wrap gap-2">{(item.words || []).map((word) => <label key={word} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d2c5ad] px-3 text-sm"><input type="checkbox" checked={foundWords.includes(word)} onChange={(event) => { setFoundWords((current) => event.target.checked ? [...current, word] : current.filter((found) => found !== word)); setChecked(null); }} className="h-4 w-4 accent-[#244b3a]" />{word}</label>)}</div></div>}
    {game.template !== "word-bank" && <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={check} className="min-h-11 rounded-lg bg-[#ba472f] px-4 text-sm font-bold text-white">Periksa jawaban</button>{checked !== null && <p role="status" className={`text-sm font-bold ${checked ? "text-[#244b3a]" : "text-[#943520]"}`}>{checked ? "Benar, jawabanmu tepat." : "Belum tepat. Coba lagi."}</p>}</div>}
    </div><p className="border-t border-[#d2c5ad] px-4 py-3 text-xs leading-5 text-[#625f54]">Pratinjau ini dapat dicoba langsung; simpan perubahan sebelum dibagikan.</p></section>;
}

function ItemEditor({ item, template, onChange, onSpeak, confirmDelete, promptError = false }: {
  item: GameBlueprintItem;
  template: GameTemplateId;
  onChange: (value: GameBlueprintItem) => void;
  onSpeak: (text: string) => void;
  confirmDelete: (description: string) => Promise<boolean>;
  promptError?: boolean;
}) {
  const edit = (key: keyof GameBlueprintItem, value: unknown) => onChange({ ...item, [key]: value });
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const uploadImage = async (source: File) => {
    setImageError("");
    if (!/[\/]?image\/(jpeg|png|webp)/.test(source.type) || source.size > 2 * 1024 * 1024) { setImageError("Pilih JPG, PNG, atau WebP maksimal 2 MB."); return; }
    setImageBusy(true);
    try {
      const bitmap = await createImageBitmap(source);
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Gambar belum dapat diproses.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Gambar belum dapat diproses.")), "image/webp", 0.86));
      const form = new FormData(); form.append("file", new File([blob], "kuis.webp", { type: "image/webp" }));
      const response = await fetch("/api/admin/game-images", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gambar belum dapat disimpan.");
      edit("imageUrl", result.url);
    } catch (error) { setImageError(error instanceof Error ? error.message : "Gambar belum dapat disimpan."); }
    finally { setImageBusy(false); }
  };
  const options = item.options || [];
  return <div className="space-y-4">
    <label className="block text-sm font-bold text-[#20251f]">Instruksi atau pertanyaan
      <textarea aria-label="Instruksi atau pertanyaan" placeholder="Tulis instruksi untuk peserta." className={`${fieldClass} min-h-24`} maxLength={500} value={item.prompt} onChange={(event) => edit("prompt", event.target.value)} />
      {promptError && <span role="alert" className="mt-1 block text-sm font-semibold text-[#943520]">Instruksi untuk peserta belum diisi.</span>}
      <span className="mt-1 block text-xs font-normal text-[#625f54]">{item.prompt.length}/500 karakter</span>
    </label>
    <div className="rounded-lg border border-[#d2c5ad] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-[#20251f]">Gambar soal <span className="font-normal text-[#625f54]">(opsional)</span></span><div className="flex flex-wrap gap-2">{item.imageUrl && <button type="button" onClick={() => edit("imageUrl", undefined)} className="min-h-11 rounded-lg border border-[#d2c5ad] px-3 text-sm font-bold text-[#943520]">Hapus gambar</button>}<label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white hover:bg-[#183b2d]">{imageBusy ? "Mengunggah…" : item.imageUrl ? "Ganti gambar" : "Tambah gambar"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} /></label></div></div>
      {imageError && <p role="alert" className="mt-2 text-sm font-semibold text-[#943520]">{imageError}</p>}
      {item.imageUrl && <img src={item.imageUrl} alt="Pratinjau gambar soal" className="mt-3 max-h-64 w-full rounded-lg object-contain" />}
      <p className="mt-2 text-xs text-[#625f54]">JPG, PNG, atau WebP · maksimal 2 MB. Gambar akan diperkecil sebelum disimpan.</p>
    </div>
    {(template === "multiple-choice-quiz" || template === "listen-and-choose") && <>
      {template === "listen-and-choose" && <label className="block text-sm font-bold">Teks yang dibacakan
        <div className="flex gap-2"><input className={fieldClass} value={item.audioText || ""} onChange={(event) => edit("audioText", event.target.value)} /><button type="button" className={iconButtonClass} aria-label="Pratinjau audio" onClick={() => onSpeak(item.audioText || "") }><Volume2 className="h-4 w-4" /></button></div>
      </label>}
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-bold">Pilihan jawaban <span className="font-normal text-[#625f54]">· tandai jawaban benar</span></legend>
        {options.map((option, index) => <div key={option.id} className="flex items-center gap-2">
          <input aria-label={`Tandai ${String.fromCharCode(65 + index)} sebagai jawaban benar`} type="radio" name={`correct-${item.id}`} checked={item.correctIndex === index} onChange={() => edit("correctIndex", index)} className="h-4 w-4 accent-[#244b3a]" />
          <span className="w-5 text-sm font-bold text-[#625f54]">{String.fromCharCode(65 + index)}</span>
          <input aria-label={`Pilihan ${String.fromCharCode(65 + index)}`} className={fieldClass} value={option.text} onChange={(event) => edit("options", options.map((value, i) => i === index ? { ...value, text: event.target.value } : value))} />
          {options.length > 2 && <button type="button" className={`${iconButtonClass} !min-h-11 !min-w-11 text-[#943520]`} aria-label={`Hapus pilihan ${index + 1}`} onClick={() => { const currentCorrect = item.correctIndex || 0; const next = options.filter((_, i) => i !== index); edit("options", next); edit("correctIndex", currentCorrect === index ? Math.min(index, next.length - 1) : currentCorrect > index ? currentCorrect - 1 : currentCorrect); }}><Trash2 className="h-4 w-4" /></button>}
        </div>)}
        <button type="button" disabled={options.length >= 6} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-[#244b3a] underline underline-offset-4 disabled:opacity-45" onClick={() => edit("options", [...options, { id: `option-${Date.now()}`, text: `Pilihan ${String.fromCharCode(65 + options.length)}` }])}><Plus className="h-4 w-4" />Tambah pilihan</button>
      </fieldset>
    </>}
    {template === "drag-and-sort" && <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="text-sm font-bold text-[#20251f]">Kategori dan kata</h4><p className="mt-1 text-xs text-[#625f54]">Masukkan kata langsung pada kartu kategorinya.</p></div><button type="button" disabled={(item.categories || []).length >= 8} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a] disabled:opacity-45" onClick={() => edit("categories", [...(item.categories || []), { id: `category-${Date.now()}`, label: "Kategori baru" }])}><Plus className="h-4 w-4" />Tambah kategori</button></div>
      {(item.categories || []).map((category) => <section key={category.id} className="space-y-3 rounded-xl border border-[#d2c5ad] bg-white p-4">
        <div className="flex items-center gap-2"><label className="min-w-0 flex-1 text-xs font-bold text-[#625f54]">Nama kategori<input className={fieldClass} value={category.label} onChange={(event) => edit("categories", item.categories?.map((entry) => entry.id === category.id ? { ...entry, label: event.target.value } : entry))} /></label><button type="button" disabled={(item.categories || []).length <= 2} className={`${iconButtonClass} !min-h-11 !min-w-11 mt-5 text-[#943520]`} aria-label={`Hapus kategori ${category.label}`} onClick={() => { const remaining = (item.categories || []).filter((entry) => entry.id !== category.id); const fallback = remaining[0]?.id || ""; edit("categories", remaining); edit("sortItems", (item.sortItems || []).map((word) => word.categoryId === category.id ? { ...word, categoryId: fallback } : word)); }}><Trash2 className="h-4 w-4" /></button></div>
        <TagInput label={`Kata dalam ${category.label || "kategori ini"}`} values={(item.sortItems || []).filter((word) => word.categoryId === category.id).map((word) => word.text)} onChange={(words) => edit("sortItems", [...(item.sortItems || []).filter((word) => word.categoryId !== category.id), ...words.map((text) => ({ text, categoryId: category.id }))])} />
      </section>)}
    </div>}
    {template === "sentence-builder" && <div className="space-y-3"><label className="block text-sm font-bold">Kalimat yang benar<input className={fieldClass} value={(item.words || []).join(" ")} placeholder="Contoh: I learn English every day" onChange={(event) => edit("words", event.target.value.trim().split(/\s+/).filter(Boolean))} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Ketik kalimat biasa; urutan kata akan dibuat otomatis.</span></label><div><p className="mb-2 text-xs font-bold text-[#625f54]">Pratinjau kartu kata · geser atau gunakan tombol urut</p><div className="flex flex-wrap gap-2">{(item.words || []).map((word, index) => <div key={`${word}-${index}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); const next = [...(item.words || [])]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); edit("words", next); }} className="inline-flex items-center gap-1 rounded-lg border border-[#d2c5ad] bg-white px-2 py-1"><span className="px-1 text-sm font-semibold text-[#244b3a]">{word}</span><button type="button" disabled={index === 0} aria-label={`Pindahkan ${word} ke kiri`} className="grid min-h-11 min-w-11 place-items-center rounded text-[#244b3a] disabled:opacity-35" onClick={() => { const next = [...(item.words || [])]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; edit("words", next); }}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button><button type="button" disabled={index === (item.words || []).length - 1} aria-label={`Pindahkan ${word} ke kanan`} className="grid min-h-11 min-w-11 place-items-center rounded text-[#244b3a] disabled:opacity-35" onClick={() => { const next = [...(item.words || [])]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; edit("words", next); }}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button></div>)}</div></div></div>}
    {template === "matching" && <div className="space-y-2"><p className="text-sm font-bold">Pasangan kata dan arti</p>{(item.pairs || []).map((pair, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} aria-label={`Pasangan kiri ${index + 1}`} value={pair.left} onChange={(event) => edit("pairs", item.pairs?.map((p, i) => i === index ? { ...p, left: event.target.value } : p))} /><input className={fieldClass} aria-label={`Pasangan kanan ${index + 1}`} value={pair.right} onChange={(event) => edit("pairs", item.pairs?.map((p, i) => i === index ? { ...p, right: event.target.value } : p))} /><button type="button" className={iconButtonClass} aria-label="Hapus pasangan" onClick={() => edit("pairs", item.pairs?.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" className="min-h-10 text-sm font-bold text-[#244b3a] underline" onClick={() => edit("pairs", [...(item.pairs || []), { left: "Kata", right: "Arti" }])}>+ Tambah pasangan</button></div>}
    {template === "word-bank" && <div className="space-y-2"><p className="text-sm font-bold">Kartu kosakata</p>{(item.vocabulary || []).map((entry, index) => <div key={index} className="grid gap-2 rounded-lg border border-[#e5dccd] bg-[#fffdf8] p-3 sm:grid-cols-2"><input className={fieldClass} aria-label={`Kosakata ${index + 1}`} value={entry.term} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, term: event.target.value } : v))} /><input className={fieldClass} aria-label={`Arti kosakata ${index + 1}`} value={entry.translation} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, translation: event.target.value } : v))} /><input className={fieldClass} aria-label={`Contoh ${index + 1}`} placeholder="Contoh kalimat (opsional)" value={entry.example || ""} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, example: event.target.value } : v))} /><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => onSpeak(entry.term)} className="min-h-11 rounded-lg border border-[#d2c5ad] px-3 text-sm font-bold text-[#244b3a]">Dengarkan “{entry.term}”</button><button type="button" onClick={async () => { if (await confirmDelete(`Kosakata “${entry.term || "tanpa judul"}” akan dihapus dari kuis.`)) edit("vocabulary", item.vocabulary?.filter((_, i) => i !== index)); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#943520]/40 bg-[#fff2ec] px-3 text-sm font-bold text-[#943520] hover:bg-[#f9e1d8]"><Trash2 className="h-4 w-4" />Hapus kosakata</button></div></div>)}<button type="button" className="min-h-11 text-sm font-bold text-[#244b3a] underline" onClick={() => edit("vocabulary", [...(item.vocabulary || []), { term: "word", translation: "arti" }])}>+ Tambah kosakata</button></div>}
    {template === "word-search" && <div className="grid gap-5 sm:grid-cols-2"><TagInput label="Kata yang dicari" values={item.words || []} uppercase onChange={(words) => edit("words", words)} /><div className="space-y-2"><div><h4 className="text-sm font-bold">Baris kotak huruf</h4><p className="mt-1 text-xs text-[#625f54]">Tambahkan satu baris untuk setiap deret huruf.</p></div>{(item.grid || []).map((row, index) => <div key={index} className="flex items-center gap-2"><label className="min-w-0 flex-1 text-xs font-bold text-[#625f54]">Baris {index + 1}<input className={fieldClass} maxLength={20} value={row} onChange={(event) => edit("grid", item.grid?.map((value, i) => i === index ? event.target.value.replace(/\s/g, "").toUpperCase() : value))} /></label><button type="button" className={`${iconButtonClass} !min-h-11 !min-w-11 mt-5 text-[#943520]`} aria-label={`Hapus baris ${index + 1}`} onClick={() => edit("grid", item.grid?.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]" onClick={() => edit("grid", [...(item.grid || []), ""])}><Plus className="h-4 w-4" />Tambah baris</button></div></div>}
    <label className="block text-sm font-bold">Penjelasan setelah menjawab <span className="font-normal text-[#625f54]">(opsional)</span><textarea className={`${fieldClass} min-h-20`} value={item.explanation || ""} onChange={(event) => edit("explanation", event.target.value)} /></label>
  </div>;
}

export default function GameBuilderClient({ notify }: { notify: (message: string) => void }) {
  const confirm = useConfirm();
  const gameListHeadingRef = useRef<HTMLHeadingElement>(null);
  const [games, setGames] = useState<GameBlueprint[]>([]);
  const [publishMode, setPublishMode] = useState<"public" | "draft" | null>(null);
  const [targetDestination, setTargetDestination] = useState<GameBlueprintDestination | null>(null);
  const [listStatus, setListStatus] = useState<"all" | "draft" | "published">("all");
  const [listDestination, setListDestination] = useState<"all" | GameBlueprintDestination>("all");
  const [listQuery, setListQuery] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [draft, setDraft] = useState<GameBlueprint | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [validationIssue, setValidationIssue] = useState<GameBlueprintPublishIssue | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [previewViewport, setPreviewViewport] = useState<"phone" | "class">("phone");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshot = useRef<string | null>(null);
  const draggedIndex = useRef<number | null>(null);
  const currentItem = draft?.items[selectedOption];
  const currentTemplate = GAME_TEMPLATES.find((template) => template.id === draft?.template);
  const visibleGames = games.filter((game) => {
    const destination = game.destination || (game.status === "session" ? "session" : game.status === "independent" ? "independent" : "public");
    const queryMatch = !listQuery.trim() || game.title.toLocaleLowerCase("id-ID").includes(listQuery.trim().toLocaleLowerCase("id-ID"));
    const statusMatch = listStatus === "all" || (listStatus === "draft" ? game.status === "draft" : game.status !== "draft");
    return queryMatch && statusMatch && (listDestination === "all" || destination === listDestination);
  });

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/game-builder", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kuis belum dapat dimuat.");
      setGames(data.games || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Kuis belum dapat dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadGames(); }, [loadGames]);

  const saveDraft = useCallback(async (value: GameBlueprint): Promise<boolean> => {
    setSaving(true);
    setSavedAt("");
    try {
      const response = await fetch("/api/admin/game-builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kuis belum dapat disimpan.");
      const saved = data.game as GameBlueprint;
      setGames((existing) => [saved, ...existing.filter((game) => game.id !== saved.id)]);
      savedSnapshot.current = comparableGame(saved);
      setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      setError("");
      return true;
    } catch (saveError) { setError(saveError instanceof Error && saveError.message !== "Failed to fetch" ? saveError.message : "Koneksi bermasalah. Periksa jaringan lalu coba simpan lagi."); return false; }
    finally { setSaving(false); }
  }, []);

  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveDraft(draft); }, 1100);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, saveDraft]);

  function updateDraft(updater: (value: GameBlueprint) => GameBlueprint) {
    setValidationIssue(null);
    setValidationAttempted(false);
    setDraft((current) => {
      if (!current) return current;
      return updater(copy(current));
    });
  }
  function updateInitials(value: string) { updateDraft((game) => ({ ...game, cardInitials: value.replace(/[^a-z0-9]/gi, "").toLocaleUpperCase("id-ID").slice(0, 4) })); }
  function updateItem(index: number, item: GameBlueprintItem) { updateDraft((game) => ({ ...game, items: game.items.map((current, i) => i === index ? item : current) })); }
  function createGame(template: GameTemplateId) { const game = createEmptyBlueprint(template); setDraft(game); setPublishMode(null); setTargetDestination(null); savedSnapshot.current = null; setStep(0); setSelectedOption(0); setError(""); setValidationAttempted(false); setValidationIssue(null); setTemplatePickerOpen(false); }
  function selectPublishMode(mode: "public" | "draft") {
    setPublishMode(mode);
    const destination = targetDestination || draft?.destination || "public";
    if (!targetDestination) setTargetDestination(destination);
    updateDraft((game) => ({ ...game, status: "draft", destination }));
  }
  function selectDestination(destination: GameBlueprintDestination) {
    setTargetDestination(destination);
    updateDraft((game) => ({ ...game, status: game.destination === destination ? game.status : "draft", destination }));
  }
  async function leaveEditor() {
    if (!draft) return;
    if (comparableGame(draft) !== savedSnapshot.current) {
      const shouldLeave = await confirm({ title: "Keluar tanpa menyimpan?", description: "Perubahan terakhir belum tersimpan. Jika keluar sekarang, perubahan tersebut akan hilang.", confirmLabel: "Keluar", cancelLabel: "Tetap di sini" });
      if (!shouldLeave) return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    savedSnapshot.current = null;
    setDraft(null);
    setError("");
  }
  function isContentComplete(game: GameBlueprint) {
    if (!game.items.length) return false;
    return game.items.every((item) => {
      if (!item.prompt.trim()) return false;
      if (game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") {
        return (game.template !== "listen-and-choose" || Boolean(item.audioText?.trim()))
          && Boolean(item.options && item.options.length >= 2 && item.options.every((option) => option.text.trim()))
          && Number.isInteger(item.correctIndex) && item.correctIndex! >= 0 && item.correctIndex! < (item.options?.length || 0);
      }
      if (game.template === "drag-and-sort") return Boolean(item.categories?.length && item.categories.every((category) => category.label.trim()) && item.sortItems?.length && item.sortItems.every((entry) => entry.text.trim() && item.categories?.some((category) => category.id === entry.categoryId)));
      if (game.template === "sentence-builder" || game.template === "word-search") return Boolean(item.words?.length && item.words.length >= 2 && item.words.every((word) => word.trim()) && (game.template !== "word-search" || item.grid?.length));
      if (game.template === "matching") return Boolean(item.pairs?.length && item.pairs.length >= 2 && item.pairs.every((pair) => pair.left.trim() && pair.right.trim()));
      return Boolean(item.vocabulary?.length && item.vocabulary.every((entry) => entry.term.trim() && entry.translation.trim()));
    });
  }
  function addItem() {
    if (!draft) return;
    const seed = createEmptyBlueprint(draft.template).items[0];
    updateDraft((game) => ({ ...game, items: [...game.items, { ...seed, id: `item-${Date.now()}`, prompt: "" }] }));
    setSelectedOption(draft.items.length);
  }
  function duplicateItem(index: number) {
    if (!draft) return;
    updateDraft((game) => { const next = [...game.items]; next.splice(index + 1, 0, { ...copy(next[index]), id: `item-${Date.now()}` }); return { ...game, items: next }; });
    setSelectedOption(index + 1);
  }
  function deleteItem(index: number) {
    if (!draft || draft.items.length < 2) return;
    updateDraft((game) => ({ ...game, items: game.items.filter((_, i) => i !== index) }));
    setSelectedOption(Math.max(0, index - 1));
  }
  function moveItem(from: number, to: number) {
    if (!draft || to < 0 || to >= draft.items.length || from === to) return;
    updateDraft((game) => { const items = [...game.items]; const [item] = items.splice(from, 1); items.splice(to, 0, item); return { ...game, items }; });
    setSelectedOption(to);
  }
  function importRows(rows: string[][]) {
    if (!draft) return;
    const clean = rows.filter((row) => row.some((cell) => String(cell || "").trim()));
    const dataRows = clean.filter((row) => !(String(row[0] || "").toLowerCase().includes("pertanyaan") || String(row[0] || "").toLowerCase().includes("question")));
    const items = dataRows.map((row, index) => {
      const seed = createEmptyBlueprint(draft.template).items[0];
      const item = { ...seed, id: `item-${Date.now()}-${index}`, prompt: String(row[0] || `Pertanyaan ${index + 1}`).trim() };
      if (draft.template === "multiple-choice-quiz" || draft.template === "listen-and-choose") {
        const texts = row.slice(1, 6).map((text) => String(text || "").trim()).filter(Boolean);
        if (texts.length >= 2) item.options = texts.map((text, i) => ({ id: `option-${i}`, text }));
        const correct = Number(row[6]); item.correctIndex = Number.isInteger(correct) && correct >= 0 && correct < (item.options?.length || 2) ? correct : 0;
      }
      return item;
    });
    if (!items.length) { setError("Tidak ada baris soal yang dapat diimpor."); return; }
    updateDraft((game) => ({ ...game, items: [...game.items, ...items] }));
    setSelectedOption(draft.items.length);
    setError("");
  }
  async function handleFile(file?: File) {
    if (!file) return;
    try {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      importRows(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][]);
    } catch { setError("File tidak terbaca. Gunakan CSV atau Excel dengan satu baris untuk setiap soal."); }
  }
  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setError("Audio tidak tersedia di perangkat ini. Materi tetap dapat dibaca."); return; }
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
  async function publish() {
    if (!draft) return;
    if (!publishMode || !targetDestination) {
      setError("Pilih Terbitkan atau Draft, lalu tentukan tujuan kuis sebelum melanjutkan.");
      setStep(0);
      return;
    }
    if (publishMode === "draft") {
      await saveAndReturnToList(targetDestination);
      return;
    }
    setValidationAttempted(true);
    const issue = getGameBlueprintPublishIssue(draft);
    if (issue) {
      setError("");
      setValidationIssue(issue);
      setStep(issue.step);
      if (issue.itemIndex !== undefined) setSelectedOption(issue.itemIndex);
      requestAnimationFrame(() => {
        const target = issue.itemIndex !== undefined
          ? document.getElementById(`game-question-${issue.itemIndex}`)
          : document.querySelector<HTMLElement>(`[data-game-field="${issue.field}"]`);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setValidationIssue(null);
    const status: GameBlueprint["status"] = targetDestination === "session" ? "session" : targetDestination === "independent" ? "independent" : "published";
    const categorizedGame = { ...draft, status, destination: targetDestination };
    setError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (await saveDraft(categorizedGame)) {
      notify(targetDestination === "public" ? "Kuis dipublikasikan" : targetDestination === "session" ? "Kuis diterbitkan untuk Sesi" : "Kuis diterbitkan untuk Latihan Mandiri");
      setDraft(null);
      savedSnapshot.current = null;
    }
  }
  async function saveAndReturnToList(destination: GameBlueprintDestination = targetDestination || draft?.destination || "public") {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (await saveDraft({ ...draft, status: "draft", destination })) {
      notify("Draf tersimpan");
      savedSnapshot.current = null;
      setDraft(null);
      setError("");
    }
  }
  async function deleteGame(game: GameBlueprint) {
    await confirm({
      title: "Hapus kuis ini?",
      description: `Kuis “${game.title}” dan seluruh soalnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus kuis",
      cancelLabel: "Batal",
      variant: "danger",
      returnFocusTarget: gameListHeadingRef.current,
      onConfirm: async () => {
        let response: Response;
        try {
          response = await fetch(`/api/admin/game-builder?id=${encodeURIComponent(game.id)}`, { method: "DELETE" });
        } catch {
          throw new Error("Koneksi bermasalah. Periksa jaringan lalu coba Hapus kuis lagi.");
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Kuis belum dapat dihapus.");
        setGames((current) => current.filter((item) => item.id !== game.id));
        notify("Kuis berhasil dihapus.");
      },
    });
  }

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat Kuis Builder…</div>;
  if (!draft) return <section className="space-y-6 text-[#20251f]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="max-w-full text-2xl font-extrabold text-[#183b2d]">Kelola Kuis</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d4038]">Susun kuis, tentukan tujuan, lalu simpan atau terbitkan.</p></div><button type="button" onClick={() => setTemplatePickerOpen(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#183b2d]"><Plus className="h-4 w-4" />Buat Kuis Baru</button></header>
    {error && <p role="alert" className="rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]">{error}</p>}
    {templatePickerOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTemplatePickerOpen(false); }} className="fixed inset-0 z-[120] grid place-items-center bg-[#13271f]/60 p-3"><section role="dialog" aria-modal="true" aria-labelledby="new-quiz-dialog-title" className="w-full max-w-5xl rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] p-4 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 id="new-quiz-dialog-title" className="text-xl font-bold text-[#183b2d]">Pilih jenis kuis</h3><p className="mt-1 text-sm text-[#514b3e]">7 template tersedia.</p></div><button type="button" onClick={() => setTemplatePickerOpen(false)} aria-label="Tutup pilihan template" className="min-h-11 min-w-11 rounded-lg border border-[#b8aa8e] text-[#244b3a]">×</button></div><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{GAME_TEMPLATES.map((template) => { const { Icon } = templateVisuals[template.id]; return <button key={template.id} type="button" onClick={() => createGame(template.id)} className={`group min-w-[8.5rem] flex-1 rounded-xl border border-[#d2c5ad] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#244b3a] ${templateVisuals[template.id].tone}`}><Icon aria-hidden="true" className="h-5 w-5 text-[#244b3a]" /><strong className="mt-2 block text-sm text-[#183b2d]">{template.title}</strong></button>; })}</div></section></div>}
    <section className="pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#b8aa8e] pb-4">
        <div><h3 ref={gameListHeadingRef} tabIndex={-1} className="font-bold text-[#20251f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]">Kelola kuis</h3><p className="mt-1 text-sm text-[#514b3e]">Pisahkan draf dan kuis terbit berdasarkan tujuan pemakaiannya.</p></div>
        <span className="text-sm font-semibold text-[#3d4038]">{visibleGames.length} kuis</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_14rem]"><label className="block text-xs font-bold text-[#3d4038] sm:col-span-2 xl:col-span-1">Cari kuis<input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Cari berdasarkan judul" className={`${fieldClass} mt-1`} /></label><label className="block text-xs font-bold text-[#3d4038]">Status<select value={listStatus} onChange={(event) => setListStatus(event.target.value as typeof listStatus)} className={fieldClass}><option value="all">Semua status</option><option value="published">Terbitkan</option><option value="draft">Draft</option></select></label><label className="block text-xs font-bold text-[#3d4038]">Tujuan<select value={listDestination} onChange={(event) => setListDestination(event.target.value as typeof listDestination)} className={fieldClass}><option value="all">Semua tujuan</option><option value="public">Kuis Website</option><option value="session">Sesi Tatap Muka</option><option value="independent">Latihan Kelas</option></select></label></div>
      {visibleGames.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleGames.map((game) => {
          const destination = game.destination || (game.status === "session" ? "session" : game.status === "independent" ? "independent" : "public");
          const statusLabel = game.status === "draft" ? "Draft" : "Terbitkan";
          const purposeLabel = destination === "session" ? "Sesi Tatap Muka" : destination === "independent" ? "Latihan Kelas" : "Kuis Website";
          const statusTone = game.status === "draft" ? "bg-[#eee8dc] text-[#514b3e]" : "bg-[#e6eadf] text-[#183b2d]";
          const purposeTone = destination === "session" ? "bg-[#f2e5bf] text-[#60480c]" : destination === "independent" ? "bg-[#f2dfd6] text-[#7b2c1d]" : "bg-[#e4ecf4] text-[#24466b]";
          return <article key={game.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#c9bda7] bg-white shadow-sm">
            <GameCardHeader game={game} compact /><div className="flex min-w-0 flex-1 flex-col p-4"><div className="flex min-w-0 flex-wrap items-center gap-2"><h4 className="min-w-0 break-words font-bold text-[#183b2d]">{game.title || "Kuis tanpa judul"}</h4><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone}`}>{statusLabel}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${purposeTone}`}>{purposeLabel}</span></div><p className="mt-2 break-words text-sm text-[#514b3e]">{GAME_TEMPLATES.find((item) => item.id === game.template)?.title} · {game.level} · {game.items.length} soal</p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e6ddcd] pt-3"><button type="button" onClick={() => { setDraft(copy(game)); setPublishMode(game.status === "draft" ? "draft" : "public"); setTargetDestination(destination); savedSnapshot.current = comparableGame(game); setStep(0); setSelectedOption(0); setError(""); }} className="min-h-11 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white">Edit</button><button type="button" onClick={() => { setDraft(copy(game)); setPublishMode(game.status === "draft" ? "draft" : "public"); setTargetDestination(destination); savedSnapshot.current = comparableGame(game); setStep(2); setSelectedOption(0); }} className="min-h-11 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm font-bold text-[#244b3a]">Pratinjau</button><button type="button" onClick={() => { const duplicate = { ...copy(game), id: `draft-${Date.now()}`, title: `${game.title} (Salinan)`, status: "draft" as const }; setDraft(duplicate); setPublishMode("draft"); setTargetDestination(destination); savedSnapshot.current = null; setStep(0); }} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">Duplikat</button><button type="button" onClick={() => void deleteGame(game)} className="min-h-11 rounded-lg bg-[#f2dfd6] px-3 text-sm font-bold text-[#7b2c1d]">Hapus</button></div></div>
          </article>;
        })}
      </div> : <div className="mt-4 rounded-xl border border-dashed border-[#b8aa8e] bg-[#fdf9f0] px-5 py-8 text-center"><p className="font-bold text-[#183b2d]">{games.length ? "Belum ada kuis pada filter ini." : "Belum ada kuis."}</p><p className="mt-2 text-sm text-[#514b3e]">Pilih template di atas untuk mulai membuat kuis.</p></div>}
    </section>
  </section>;

  return <div className="space-y-5 pb-28 text-[#20251f] md:pb-0">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><button type="button" onClick={() => void leaveEditor()} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[#244b3a] hover:underline"><ArrowLeft className="h-4 w-4" />semua kuis</button><h2 className="text-2xl font-extrabold text-[#183b2d]">{draft.title || "Kuis baru"}</h2><p className="mt-1 text-sm text-[#625f54]">{currentTemplate?.title} · {publishMode === "public" ? "Terbitkan" : publishMode === "draft" ? "Draft" : "Pilih status"} · {targetDestination === "session" ? "Sesi Tatap Muka" : targetDestination === "independent" ? "Latihan Mandiri" : targetDestination === "public" ? "Kuis Website" : "Tujuan belum dipilih"}</p></div><div className="flex items-center gap-2"><span role="status" className="mr-1 text-xs text-[#625f54]">{saving ? "Menyimpan…" : error ? "Perlu diperiksa" : savedAt ? `Tersimpan ${savedAt}` : "Perubahan akan tersimpan otomatis"}</span>{step !== 2 && <button type="button" disabled={saving} onClick={() => void saveDraft(draft)} className={iconButtonClass} aria-label="Simpan sekarang"><Save className="h-4 w-4" /></button>}</div></header>
    {error && <p role="alert" className="rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]">{error}</p>}
    <nav aria-label="Tahap pembuatan kuis" className="flex w-full min-w-0 gap-2 overflow-x-auto whitespace-nowrap border-y border-[#d2c5ad] py-3">{["Info Kuis", "Soal", "Pengaturan & Pratinjau"].map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined} className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f] ${step === index ? "bg-[#e6eadf] text-[#183b2d] underline decoration-2 underline-offset-4" : "text-[#3d4038] hover:bg-[#f2f4ef]"}`}>{label}</button>)}</nav>

    <div className="space-y-5 rounded-2xl border border-[#d3e0d3] bg-[#EEF3EE] p-4 sm:p-6">
    {step === 0 && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="grid gap-4 sm:grid-cols-2">{[["Judul kuis", "title", draft.title], ["Topik", "topic", draft.topic]].map(([label, key, value]) => <label key={key} className="block text-sm font-bold">{label}<input data-game-field={key} className={fieldClass} value={value as string} onChange={(event) => updateDraft((game) => ({ ...game, [key]: event.target.value }))} />{validationAttempted && validationIssue?.field === key && <span role="alert" className="mt-1 block text-sm font-semibold text-[#943520]">{validationIssue.message}</span>}</label>)}<label className="block text-sm font-bold">Inisial Kartu<input aria-label="Inisial Kartu" maxLength={4} minLength={2} value={draft.cardInitials} onChange={(event) => updateInitials(event.target.value)} className={fieldClass} placeholder="2–4 huruf" /><span className="mt-1 block text-xs font-normal text-[#625f54]">2–4 karakter, otomatis menjadi huruf kapital.</span></label><label className="block text-sm font-bold">Level CEFR<select className={fieldClass} value={draft.level} onChange={(event) => updateDraft((game) => ({ ...game, level: event.target.value as GameBlueprint["level"] }))}>{["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="block text-sm font-bold">Bahasa<select className={fieldClass} value={draft.language} onChange={(event) => updateDraft((game) => ({ ...game, language: event.target.value as GameBlueprint["language"] }))}><option value="id-en">Indonesia dan Inggris</option><option value="id">Indonesia</option><option value="en">Inggris</option></select></label><fieldset className="space-y-4 rounded-xl border border-[#c9bda7] bg-white p-4 sm:col-span-2 sm:p-5"><legend className="px-1 text-sm font-bold text-[#20251f]">Status dan tujuan kuis</legend><div><p className="text-sm font-semibold text-[#183b2d]">Pilih status publikasi</p><p className="mt-1 text-xs leading-5 text-[#514b3e]">Pilih salah satu dulu. Tujuan Sesi dan Latihan Mandiri akan terbuka setelahnya.</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{([{ id: "public", title: "Terbitkan", description: "Terbit dan dapat ditemukan di katalog." }, { id: "draft", title: "Draft", description: "Simpan untuk dilanjutkan nanti." }] as const).map((choice) => <button key={choice.id} type="button" aria-pressed={publishMode === choice.id} onClick={() => selectPublishMode(choice.id)} className={`min-h-16 rounded-lg border px-4 py-3 text-left transition-colors ${publishMode === choice.id ? "border-[#183b2d] bg-[#244b3a] text-white" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#183b2d] hover:bg-[#e6eadf]"}`}><strong className="block text-sm">{choice.title}</strong><span className={`mt-1 block text-xs ${publishMode === choice.id ? "text-white/90" : "text-[#514b3e]"}`}>{choice.description}</span></button>)}</div></div><div className="border-t border-[#e2d8c7] pt-4"><p className="text-sm font-semibold text-[#183b2d]">tujuan kuis</p><p className="mt-1 text-xs leading-5 text-[#514b3e]">{publishMode ? "Pilih tempat kuis ini digunakan." : "Terkunci sampai status Terbitkan atau Draft dipilih."}</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{([{ id: "public", title: "Kuis Website", description: "Tampil di halaman Kuis." }, { id: "session", title: "Sesi Tatap Muka", description: "Hanya untuk dipilih ke sesi kelas." }, { id: "independent", title: "Latihan Kelas", description: "Kuis latihan untuk kelas." }] as const).map((choice) => <button key={choice.id} type="button" disabled={!publishMode} aria-pressed={targetDestination === choice.id} onClick={() => selectDestination(choice.id)} className={`min-h-16 rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:border-[#d8d1c4] disabled:bg-[#eeeae2] disabled:text-[#746f64] ${targetDestination === choice.id && publishMode ? "border-[#183b2d] bg-[#e6eadf] text-[#183b2d] ring-1 ring-[#244b3a]" : "border-[#b8aa8e] bg-[#fdf9f0] text-[#183b2d] enabled:hover:bg-[#f7f0e3]"}`}><strong className="block text-sm">{choice.title}</strong><span className={`mt-1 block text-xs leading-5 ${!publishMode ? "text-[#746f64]" : "text-[#514b3e]"}`}>{choice.description}</span></button>)}</div></div>{error && !publishMode && <p role="alert" className="text-sm font-semibold text-[#943520]">{error}</p>}</fieldset></div><aside className="rounded-xl border border-[#d3e0d3] bg-white/90 p-5"><h3 className="font-bold text-[#183b2d]">{currentTemplate?.title || "Jenis kuis"}</h3><p className="mt-2 text-sm leading-6 text-[#3d4038]">{currentTemplate?.description}</p></aside></div>}

    {step === 1 && <div className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)]"><aside className="space-y-3 rounded-xl border border-[#d3e0d3] bg-white/90 p-4 sm:p-5"><div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Daftar Soal <span className="text-[#625f54]">({draft.items.length})</span></h3><button type="button" className={iconButtonClass} aria-label="Tambah item" title="Tambah item" onClick={addItem}><Plus className="h-4 w-4" /></button></div><div className="flex flex-wrap gap-2"><label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#b8aa8e] bg-white px-3 text-xs font-bold text-[#244b3a]">Impor soal<input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label><a href="data:text/csv;charset=utf-8,Instruksi%2CPilihan%20A%2CPilihan%20B%2CPilihan%20C%2CPilihan%20D%2CJawaban%20Benar%0AContoh%20soal%2CPilihan%201%2CPilihan%202%2CPilihan%203%2CPilihan%204%2CA" download="template-kuis.csv" className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-[#244b3a] underline underline-offset-4">Unduh Format Template</a></div></div><div className="space-y-1">{draft.items.map((item, index) => <div key={item.id} draggable onDragStart={() => { draggedIndex.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex.current !== null) moveItem(draggedIndex.current, index); draggedIndex.current = null; }} className={`flex items-center gap-1 rounded-lg border p-1 ${selectedOption === index ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-[#fdf9f0]"}`}><GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-[#625f54]" /><button type="button" onClick={() => setSelectedOption(index)} className="min-h-11 min-w-0 flex-1 text-left text-sm"><strong className="block text-[#183b2d]">Item {index + 1}</strong><span className="block truncate text-xs text-[#625f54]">{item.prompt}</span></button><button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-md text-[#244b3a] hover:bg-[#e6eadf]" aria-label={`Pindahkan item ${index + 1} ke atas`} title={`Pindahkan item ${index + 1} ke atas`} disabled={index === 0} onClick={() => moveItem(index, index - 1)}><ChevronUp className="h-4 w-4" /></button><button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-md text-[#244b3a] hover:bg-[#e6eadf]" aria-label={`Pindahkan item ${index + 1} ke bawah`} title={`Pindahkan item ${index + 1} ke bawah`} disabled={index === draft.items.length - 1} onClick={() => moveItem(index, index + 1)}><ChevronDown className="h-4 w-4" /></button></div>)}</div></aside>
      <div className="min-w-0 space-y-5">{draft.items.length === 0 && validationAttempted && validationIssue?.step === 1 && <p role="alert" className="rounded-lg border border-[#943520]/30 bg-[#fff5f0] p-4 text-sm font-semibold text-[#7c2d1c]">{validationIssue.message}</p>}{currentItem && <section id={`game-question-${selectedOption}`} tabIndex={-1} className="scroll-mt-24 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f] sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-[#183b2d]">Item {selectedOption + 1}</h3><p className="mt-1 text-xs text-[#625f54]">Lengkapi isi soal dan jawaban.</p></div><div className="flex gap-2"><button type="button" title="Duplikat item" aria-label="Duplikat item" className={iconButtonClass} onClick={() => duplicateItem(selectedOption)}><Copy className="h-4 w-4" /></button><button type="button" title="Hapus item" aria-label="Hapus item" className={`${iconButtonClass} text-[#943520]`} disabled={draft.items.length < 2} onClick={() => deleteItem(selectedOption)}><Trash2 className="h-4 w-4" /></button></div></div>{validationAttempted && validationIssue?.step === 1 && validationIssue.itemIndex === selectedOption && validationIssue.field !== "prompt" && <p role="alert" className="mb-4 rounded-lg border border-[#943520]/30 bg-[#fff5f0] p-3 text-sm font-semibold text-[#7c2d1c]">{validationIssue.message}</p>}<ItemEditor item={currentItem} template={draft.template} onChange={(item) => updateItem(selectedOption, item)} onSpeak={speak} confirmDelete={async (description) => confirm({ title: "Hapus kosakata?", description, confirmLabel: "Hapus kosakata", variant: "danger" })} promptError={validationAttempted && validationIssue?.field === "prompt" && validationIssue.itemIndex === selectedOption} /></section>}
        
      </div></div>}

    {step === 2 && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]"><section data-game-field="settings" tabIndex={-1} className="scroll-mt-24 space-y-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f]"><div className="grid gap-4 sm:grid-cols-2">{targetDestination !== "public" && <label className="block text-sm font-bold">Jumlah nyawa<input type="number" min={1} max={10} className={fieldClass} value={draft.settings.hearts} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, hearts: Number(event.target.value) } }))} /></label>}<label className="block text-sm font-bold">Batas waktu (detik)<input type="number" min={0} max={3600} className={fieldClass} value={draft.settings.timeLimitSec} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, timeLimitSec: Number(event.target.value) } }))} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Isi 0 jika tanpa batas waktu.</span></label><label className="block text-sm font-bold">Mode<select className={fieldClass} value={draft.settings.mode} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, mode: event.target.value as GameBlueprint["settings"]["mode"] } }))}><option value="both">Solo dan kelas</option><option value="solo">Solo</option><option value="class">Kelas</option></select></label><label className="block text-sm font-bold">Tema warna<select className={fieldClass} value={draft.settings.theme} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, theme: event.target.value as GameBlueprint["settings"]["theme"] } }))}><option value="forest">Hutan Sapen</option><option value="tomato">Merah bata</option><option value="saffron">Saffron</option><option value="ocean">Biru laut</option></select></label></div><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.settings.randomizeQuestions} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, randomizeQuestions: event.target.checked } }))} className="h-4 w-4 accent-[#244b3a]" />Acak urutan soal</label><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.settings.randomizeOptions} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, randomizeOptions: event.target.checked } }))} className="h-4 w-4 accent-[#244b3a]" />Acak pilihan jawaban</label><label className="block text-sm font-bold">Maskot (opsional)<input className={fieldClass} value={draft.settings.mascot || ""} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, mascot: event.target.value } }))} /></label></section>
      {currentItem && <GamePreview key={`${draft.template}-${currentItem.id}`} game={draft} item={currentItem} viewport={previewViewport} />}
    </div>}

    {step === 2 && validationAttempted && validationIssue?.step === 2 && <p role="alert" className="rounded-lg border border-[#943520]/30 bg-[#fff5f0] p-4 text-sm font-semibold text-[#7c2d1c]">{validationIssue.message}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d3e0d3] pt-4"><p className="w-full text-center text-xs font-bold text-[#514b3e] md:hidden" aria-live="polite">Langkah {step + 1} dari 3</p><div className="min-w-0 flex-1">{step === 2 && error && <p role="alert" className="mb-3 text-sm font-semibold text-[#943520]">{error}</p>}<button type="button" onClick={() => step > 0 ? setStep(step - 1) : void leaveEditor()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d]"><ArrowLeft className="h-4 w-4" />Kembali</button></div><div className="flex flex-wrap gap-2">{step < 2 ? <button type="button" onClick={() => { setError(""); if (step === 0 && (!draft.title.trim() || draft.title.trim().toLocaleLowerCase("id-ID") === "kuis baru")) { setValidationAttempted(true); setValidationIssue({ step: 0, field: "title", message: "Beri kuis ini judul yang jelas sebelum melanjutkan." }); document.querySelector<HTMLElement>('[data-game-field="title"]')?.focus(); return; } if (step === 1 && !isContentComplete(draft)) { setValidationAttempted(true); const issue = getGameBlueprintPublishIssue(draft); setValidationIssue(issue); const itemIndex = issue?.itemIndex ?? 0; setSelectedOption(itemIndex); requestAnimationFrame(() => { const target = document.getElementById(`game-question-${itemIndex}`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ behavior: "smooth", block: "center" }); }); return; } setValidationAttempted(false); setValidationIssue(null); setStep(step + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white">Lanjutkan<ArrowRight className="h-4 w-4" /></button> : <button type="button" disabled={saving} onClick={() => void publish()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Menyimpan…" : "Simpan"}</button>}</div></footer>
    </div>
  </div>;
}
