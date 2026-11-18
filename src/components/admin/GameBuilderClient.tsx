"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, ArrowLeft, ArrowRight, BookOpenText, Check, ChevronDown, ChevronUp, Copy, GripVertical, Headphones, Link2, ListChecks, Loader2, MonitorPlay, MoveDown, Plus, Redo2, Save, Search, Smartphone, Trash2, Undo2, Volume2 } from "lucide-react";
import * as XLSX from "xlsx";
import { createEmptyBlueprint, GAME_TEMPLATES, validateGameBlueprint, type GameBlueprint, type GameBlueprintItem, type GameTemplateId } from "@/lib/game-blueprint";
import { evaluateBlueprintAnswer } from "@/lib/game-engine";

const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#b8aa8e] bg-[#fdf9f0] px-3 py-2 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";
const iconButtonClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] text-[#244b3a] hover:bg-[#e6eadf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] disabled:opacity-45";
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

  return <section className={`overflow-hidden rounded-xl border border-[#d2c5ad] bg-[#e6eadf] ${viewport === "phone" ? "mx-auto w-full max-w-[360px]" : "w-full"}`} aria-label="Pratinjau game interaktif"><div className="border-b border-[#d2c5ad] px-4 py-3"><h3 className="font-bold text-[#183b2d]">Pratinjau: {game.title || "Game baru"}</h3><p className="mt-1 text-xs text-[#3d4038]">{GAME_TEMPLATES.find((template) => template.id === game.template)?.title} · {game.level}</p></div><div className="space-y-4 bg-[#fdf9f0] p-5"><p className="text-sm font-semibold leading-6 text-[#20251f]">{item.prompt || "Instruksi soal akan tampil di sini."}</p>
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

async function compressImage(file: File): Promise<File> {
  if (!("createImageBitmap" in window)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); return file; }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

function ItemEditor({ item, template, onChange, onSpeak, onUpload, uploading, promptError = false }: {
  item: GameBlueprintItem;
  template: GameTemplateId;
  onChange: (value: GameBlueprintItem) => void;
  onSpeak: (text: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  promptError?: boolean;
}) {
  const edit = (key: keyof GameBlueprintItem, value: unknown) => onChange({ ...item, [key]: value });
  const options = item.options || [];
  return <div className="space-y-4">
    <label className="block text-sm font-bold text-[#20251f]">Instruksi atau pertanyaan
      <textarea aria-label="Instruksi atau pertanyaan" placeholder="Tulis instruksi untuk peserta." className={`${fieldClass} min-h-24`} maxLength={500} value={item.prompt} onChange={(event) => edit("prompt", event.target.value)} />
      {promptError && <span role="alert" className="mt-1 block text-sm font-semibold text-[#943520]">Instruksi untuk peserta belum diisi.</span>}
      <span className="mt-1 block text-xs font-normal text-[#625f54]">{item.prompt.length}/500 karakter</span>
    </label>
    <div><p className="text-sm font-bold">Gambar soal <span className="font-normal text-[#625f54]">(opsional)</span></p><label className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">{uploading ? "Mengompres gambar…" : "Unggah gambar"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label>{item.mediaUrl && <Image unoptimized src={item.mediaUrl} alt="Gambar soal" width={480} height={270} className="mt-3 max-h-48 w-auto rounded-lg border border-[#d2c5ad] object-contain" />}</div>
    {(template === "multiple-choice-quiz" || template === "listen-and-choose") && <>
      {template === "listen-and-choose" && <label className="block text-sm font-bold">Teks yang dibacakan
        <div className="flex gap-2"><input className={fieldClass} value={item.audioText || ""} onChange={(event) => edit("audioText", event.target.value)} /><button type="button" className={iconButtonClass} aria-label="Pratinjau audio" onClick={() => onSpeak(item.audioText || "") }><Volume2 className="h-4 w-4" /></button></div>
      </label>}
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-bold">Pilihan jawaban <span className="font-normal text-[#625f54]">· tandai jawaban benar</span></legend>
        {options.map((option, index) => <div key={option.id} className="flex items-center gap-2">
          <input aria-label={`Tandai ${String.fromCharCode(65 + index)} sebagai jawaban benar`} type="radio" name={`correct-${item.id}`} checked={item.correctIndex === index} onChange={() => edit("correctIndex", index)} className="h-4 w-4 accent-[#244b3a]" />
          <span className="w-5 text-sm font-bold text-[#625f54]">{String.fromCharCode(65 + index)}</span>
          <input aria-label={`Pilihan ${String.fromCharCode(65 + index)}`} className={fieldClass} value={option.text} onChange={(event) => edit("options", options.map((value, i) => i === index ? { ...value, text: event.target.value } : value))} />
          {options.length > 2 && <button type="button" className={`${iconButtonClass} text-[#943520]`} aria-label={`Hapus pilihan ${index + 1}`} onClick={() => { const next = options.filter((_, i) => i !== index); edit("options", next); if ((item.correctIndex || 0) >= next.length) edit("correctIndex", next.length - 1); }}><Trash2 className="h-4 w-4" /></button>}
        </div>)}
        <button type="button" disabled={options.length >= 5} className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-bold text-[#244b3a] underline underline-offset-4 disabled:opacity-45" onClick={() => edit("options", [...options, { id: `option-${Date.now()}`, text: `Pilihan ${String.fromCharCode(65 + options.length)}` }])}><Plus className="h-4 w-4" />Tambah pilihan</button>
      </fieldset>
    </>}
    {template === "drag-and-sort" && <div className="space-y-3">
      <label className="block text-sm font-bold">Kategori
        <input className={fieldClass} value={(item.categories || []).map((category) => category.label).join(", ")} onChange={(event) => {
          const categories = event.target.value.split(",").map((label, index) => ({ id: item.categories?.[index]?.id || `category-${index}`, label: label.trim() })).filter((category) => category.label);
          edit("categories", categories);
          edit("sortItems", (item.sortItems || []).map((entry, index) => ({ ...entry, categoryId: categories.some((category) => category.id === entry.categoryId) ? entry.categoryId : categories[index % Math.max(1, categories.length)]?.id || "" })));
        }} />
        <span className="mt-1 block text-xs font-normal text-[#625f54]">Pisahkan nama kategori dengan koma.</span>
      </label>
      {(item.sortItems || []).map((entry, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={fieldClass} aria-label={`Kata ${index + 1}`} value={entry.text} onChange={(event) => edit("sortItems", item.sortItems?.map((row, i) => i === index ? { ...row, text: event.target.value } : row))} />
        <select className={fieldClass} aria-label={`Kategori kata ${index + 1}`} value={entry.categoryId} onChange={(event) => edit("sortItems", item.sortItems?.map((row, i) => i === index ? { ...row, categoryId: event.target.value } : row))}>{(item.categories || []).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select>
        <button type="button" className={iconButtonClass} aria-label={`Hapus kata ${index + 1}`} onClick={() => edit("sortItems", item.sortItems?.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button>
      </div>)}
      <button type="button" className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-bold text-[#244b3a] underline underline-offset-4" onClick={() => edit("sortItems", [...(item.sortItems || []), { text: "Kata baru", categoryId: item.categories?.[0]?.id || "" }])}><Plus className="h-4 w-4" />Tambah kata</button>
    </div>}
    {template === "sentence-builder" && <label className="block text-sm font-bold">Kalimat yang benar
      <input className={fieldClass} value={(item.words || []).join(" ")} onChange={(event) => edit("words", event.target.value.trim().split(/\s+/).filter(Boolean))} />
      <span className="mt-1 block text-xs font-normal text-[#625f54]">Kata akan diacak saat game dimainkan.</span>
    </label>}
    {template === "matching" && <div className="space-y-2"><p className="text-sm font-bold">Pasangan kata dan arti</p>{(item.pairs || []).map((pair, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} aria-label={`Pasangan kiri ${index + 1}`} value={pair.left} onChange={(event) => edit("pairs", item.pairs?.map((p, i) => i === index ? { ...p, left: event.target.value } : p))} /><input className={fieldClass} aria-label={`Pasangan kanan ${index + 1}`} value={pair.right} onChange={(event) => edit("pairs", item.pairs?.map((p, i) => i === index ? { ...p, right: event.target.value } : p))} /><button type="button" className={iconButtonClass} aria-label="Hapus pasangan" onClick={() => edit("pairs", item.pairs?.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" className="min-h-10 text-sm font-bold text-[#244b3a] underline" onClick={() => edit("pairs", [...(item.pairs || []), { left: "Kata", right: "Arti" }])}>+ Tambah pasangan</button></div>}
    {template === "word-bank" && <div className="space-y-2"><p className="text-sm font-bold">Kartu kosakata</p>{(item.vocabulary || []).map((entry, index) => <div key={index} className="grid gap-2 sm:grid-cols-2"><input className={fieldClass} aria-label={`Kosakata ${index + 1}`} value={entry.term} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, term: event.target.value } : v))} /><input className={fieldClass} aria-label={`Arti kosakata ${index + 1}`} value={entry.translation} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, translation: event.target.value } : v))} /><input className={fieldClass} aria-label={`Contoh ${index + 1}`} placeholder="Contoh kalimat (opsional)" value={entry.example || ""} onChange={(event) => edit("vocabulary", item.vocabulary?.map((v, i) => i === index ? { ...v, example: event.target.value } : v))} /><button type="button" onClick={() => onSpeak(entry.term)} className="min-h-11 justify-self-start rounded-lg border border-[#d2c5ad] px-3 text-sm font-bold text-[#244b3a]">Dengarkan “{entry.term}”</button></div>)}<button type="button" className="min-h-10 text-sm font-bold text-[#244b3a] underline" onClick={() => edit("vocabulary", [...(item.vocabulary || []), { term: "word", translation: "arti" }])}>+ Tambah kosakata</button></div>}
    {template === "word-search" && <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Kata yang dicari<input className={fieldClass} value={(item.words || []).join(", ")} onChange={(event) => edit("words", event.target.value.split(",").map((word) => word.trim().toUpperCase()).filter(Boolean))} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Pisahkan dengan koma.</span></label><label className="block text-sm font-bold">Baris kotak huruf<input className={fieldClass} value={(item.grid || []).join(" / ")} onChange={(event) => edit("grid", event.target.value.split("/").map((row) => row.replace(/\s/g, "").toUpperCase()).filter(Boolean))} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Pisahkan setiap baris dengan garis miring (/).</span></label></div>}
    <label className="block text-sm font-bold">Penjelasan setelah menjawab <span className="font-normal text-[#625f54]">(opsional)</span><textarea className={`${fieldClass} min-h-20`} value={item.explanation || ""} onChange={(event) => edit("explanation", event.target.value)} /></label>
  </div>;
}

export default function GameBuilderClient({ notify }: { notify: (message: string) => void }) {
  const [games, setGames] = useState<GameBlueprint[]>([]);
  const [draft, setDraft] = useState<GameBlueprint | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(0);
  const [previewViewport, setPreviewViewport] = useState<"phone" | "class">("phone");
  const [pasteText, setPasteText] = useState("");
  const [history, setHistory] = useState<GameBlueprint[]>([]);
  const [future, setFuture] = useState<GameBlueprint[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggedIndex = useRef<number | null>(null);
  const validation = useMemo(() => draft ? validateGameBlueprint(draft) : { valid: false, errors: [] as string[] }, [draft]);
  const currentItem = draft?.items[selectedOption];
  const currentTemplate = GAME_TEMPLATES.find((template) => template.id === draft?.template);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/game-builder", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum dapat dimuat.");
      setGames(data.games || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Game belum dapat dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadGames(); }, [loadGames]);

  const saveDraft = useCallback(async (value: GameBlueprint): Promise<boolean> => {
    setSaving(true);
    setSavedAt("");
    try {
      const response = await fetch("/api/admin/game-builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum dapat disimpan.");
      const saved = data.game as GameBlueprint;
      setGames((existing) => [saved, ...existing.filter((game) => game.id !== saved.id)]);
      setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      setError("");
      return true;
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Game belum dapat disimpan."); return false; }
    finally { setSaving(false); }
  }, []);

  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveDraft(draft); }, 1100);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, saveDraft]);

  function updateDraft(updater: (value: GameBlueprint) => GameBlueprint) {
    setDraft((current) => {
      if (!current) return current;
      setHistory((past) => [...past.slice(-39), copy(current)]);
      setFuture([]);
      return updater(copy(current));
    });
  }
  function updateItem(index: number, item: GameBlueprintItem) { updateDraft((game) => ({ ...game, items: game.items.map((current, i) => i === index ? item : current) })); }
  function createGame(template: GameTemplateId) { setDraft(createEmptyBlueprint(template)); setStep(0); setSelectedOption(0); setHistory([]); setFuture([]); setError(""); setValidationAttempted(false); }
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
  function undo() {
    if (!draft || !history.length) return;
    const previous = history[history.length - 1];
    setHistory((past) => past.slice(0, -1)); setFuture((next) => [copy(draft), ...next]); setDraft(previous);
  }
  function redo() {
    if (!draft || !future.length) return;
    const next = future[0]; setFuture((rest) => rest.slice(1)); setHistory((past) => [...past, copy(draft)]); setDraft(next);
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
    setPasteText(""); setError("");
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
  async function uploadItemImage(file: File) {
    if (!draft || !currentItem) return;
    setUploadingImage(true); setError("");
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 2 * 1024 * 1024) throw new Error("Ukuran gambar setelah dikompres tetap lebih dari 2 MB.");
      const form = new FormData(); form.append("file", compressed); form.append("gameId", draft.id); form.append("itemId", currentItem.id);
      const response = await fetch("/api/admin/game-builder/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gambar belum dapat diunggah.");
      updateItem(selectedOption, { ...currentItem, mediaUrl: data.url });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Gambar belum dapat diunggah."); }
    finally { setUploadingImage(false); }
  }
  async function uploadCoverImage(file: File) {
    if (!draft) return;
    setUploadingImage(true); setError("");
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 2 * 1024 * 1024) throw new Error("Ukuran gambar setelah dikompres tetap lebih dari 2 MB.");
      const form = new FormData(); form.append("file", compressed); form.append("gameId", draft.id); form.append("itemId", "cover");
      const response = await fetch("/api/admin/game-builder/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gambar sampul belum dapat diunggah.");
      updateDraft((game) => ({ ...game, coverImage: data.url }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Gambar sampul belum dapat diunggah."); }
    finally { setUploadingImage(false); }
  }
  async function publish() {
    if (!draft) return;
    setValidationAttempted(true);
    if (!draft.title.trim() || !validation.valid) { setError(""); return; }
    const published = { ...draft, status: "published" as const };
    setDraft(published);
    if (await saveDraft(published)) notify("Game berhasil diterbitkan.");
  }
  async function deleteGame(game: GameBlueprint) {
    if (!window.confirm(`Hapus game “${game.title}”?`)) return;
    try {
      const response = await fetch(`/api/admin/game-builder?id=${encodeURIComponent(game.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum dapat dihapus.");
      setGames((current) => current.filter((item) => item.id !== game.id));
      notify("Game berhasil dihapus.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Game belum dapat dihapus."); }
  }

  if (loading) return <div className="flex items-center gap-3 p-8 text-sm text-[#3d4038]"><Loader2 className="h-5 w-5 animate-spin" />Memuat Game Builder…</div>;
  if (!draft) return <section className="space-y-6 text-[#20251f]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#183b2d]">Game Builder</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#3d4038]">Buat aktivitas belajar dari template, lalu lihat pratinjaunya sebelum dibagikan.</p></div></header>
    {error && <p role="alert" className="rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]">{error}</p>}
    <div className="flex items-center justify-between border-y border-[#d2c5ad] py-3"><h3 className="font-bold text-[#20251f]">Pilih jenis game</h3><span className="text-sm text-[#625f54]">7 template tersedia</span></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{GAME_TEMPLATES.map((template) => { const { Icon, tone } = templateVisuals[template.id]; return <button key={template.id} type="button" onClick={() => createGame(template.id)} className="group grid min-h-32 grid-cols-[5rem_1fr_auto] items-center gap-4 rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-left transition-colors hover:border-[#244b3a] hover:bg-[#e6eadf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f]"><span className={`grid h-16 w-16 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-8 w-8" /></span><span><strong className="block text-base text-[#183b2d]">{template.title}</strong><span className="mt-1 block text-sm leading-5 text-[#3d4038]">{template.description}</span></span><ArrowRight className="h-4 w-4 text-[#943520]" /></button>; })}</div>
    <section className="pt-4"><h3 className="border-b border-[#d2c5ad] pb-3 font-bold text-[#20251f]">Draf dan game terbit</h3>{games.length ? <div className="divide-y divide-[#d2c5ad]">{games.map((game) => <div key={game.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold text-[#183b2d]">{game.title}</p><p className="mt-1 text-sm text-[#625f54]">{GAME_TEMPLATES.find((item) => item.id === game.template)?.title} · {game.level} · {game.items.length} soal · {game.status === "published" ? "Terbit" : "Draf"}</p></div><div className="flex gap-2"><button type="button" className="min-h-10 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]" onClick={() => { setDraft(copy(game)); setStep(1); setSelectedOption(0); setHistory([]); setFuture([]); }}>Edit / pratinjau</button>{game.status === "draft" && <button type="button" className="min-h-10 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]" onClick={() => { const duplicate = { ...copy(game), id: `draft-${Date.now()}`, title: `${game.title} (Salinan)`, status: "draft" as const }; setDraft(duplicate); setStep(1); }}>Duplikat</button>}<button type="button" className="min-h-10 rounded-lg border border-[#943520]/40 px-3 text-sm font-bold text-[#943520]" onClick={() => void deleteGame(game)}>Hapus</button></div></div>)}</div> : <div className="py-7 text-center"><p className="font-bold text-[#183b2d]">Belum ada draf atau game terbit.</p><p className="mt-2 text-sm text-[#625f54]">Pilih salah satu template di atas untuk menyusun aktivitas pertama.</p></div>}</section>
    <p className="text-xs leading-5 text-[#625f54]">Game lama tetap dapat dikelola dari <button type="button" onClick={() => notify("Editor game lama tersedia pada bagian Kelola Game klasik.")} className="font-bold text-[#244b3a] underline underline-offset-4">editor klasik</button>.</p>
  </section>;

  return <div className="space-y-5 text-[#20251f]">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><button type="button" onClick={() => setDraft(null)} className="mb-2 inline-flex min-h-9 items-center gap-1 text-sm font-bold text-[#244b3a] hover:underline"><ArrowLeft className="h-4 w-4" />Semua game</button><h2 className="text-2xl font-extrabold text-[#183b2d]">{draft.title || "Game baru"}</h2><p className="mt-1 text-sm text-[#625f54]">{currentTemplate?.title} · {draft.status === "published" ? "Terbit" : "Draf"}</p></div><div className="flex items-center gap-2"><span role="status" className="mr-1 text-xs text-[#625f54]">{saving ? "Menyimpan…" : error ? "Gagal menyimpan" : savedAt ? `Tersimpan ${savedAt}` : "Perubahan akan tersimpan otomatis"}</span><button type="button" onClick={() => void saveDraft(draft)} className={iconButtonClass} aria-label="Simpan sekarang"><Save className="h-4 w-4" /></button></div></header>
    {error && <p role="alert" className="rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-4 py-3 text-sm text-[#943520]">{error}</p>}
    <nav aria-label="Tahap pembuatan game" className="flex flex-wrap gap-2 border-y border-[#d2c5ad] py-3">{["Info game", "Konten", "Pengaturan & pratinjau"].map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined} className={`min-h-10 rounded-lg px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba472f] ${step === index ? "bg-[#244b3a] text-white" : "text-[#3d4038] hover:bg-[#e6eadf]"}`}>{label}</button>)}</nav>

    {step === 0 && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="grid gap-4 sm:grid-cols-2">{[["Judul game", "title", draft.title], ["Topik", "topic", draft.topic]].map(([label, key, value]) => <label key={key} className="block text-sm font-bold">{label}<input className={fieldClass} value={value as string} onChange={(event) => updateDraft((game) => ({ ...game, [key]: event.target.value }))} />{key === "title" && validationAttempted && !draft.title.trim() && <span role="alert" className="mt-1 block text-sm font-semibold text-[#943520]">Judul game wajib diisi.</span>}</label>)}<label className="block text-sm font-bold">Level CEFR<select className={fieldClass} value={draft.level} onChange={(event) => updateDraft((game) => ({ ...game, level: event.target.value as GameBlueprint["level"] }))}>{["A1", "A2", "B1", "B2"].map((level) => <option key={level}>{level}</option>)}</select></label><label className="block text-sm font-bold">Bahasa<select className={fieldClass} value={draft.language} onChange={(event) => updateDraft((game) => ({ ...game, language: event.target.value as GameBlueprint["language"] }))}><option value="id-en">Indonesia dan Inggris</option><option value="id">Indonesia</option><option value="en">Inggris</option></select></label><div className="sm:col-span-2"><label className="block text-sm font-bold">Gambar sampul <span className="font-normal text-[#625f54]">(opsional)</span><input className={fieldClass} placeholder="Tempel tautan gambar" value={draft.coverImage || ""} onChange={(event) => updateDraft((game) => ({ ...game, coverImage: event.target.value }))} /></label><label className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]">{uploadingImage ? "Mengompres gambar…" : "Unggah sampul"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCoverImage(file); event.currentTarget.value = ""; }} /></label></div></div><aside className="rounded-xl bg-[#e6eadf] p-5"><h3 className="font-bold text-[#183b2d]">Template dipilih</h3><p className="mt-2 text-sm leading-6 text-[#3d4038]">{currentTemplate?.description}</p><button type="button" onClick={() => setStep(0)} className="mt-4 text-sm font-bold text-[#244b3a] underline underline-offset-4">Ganti template</button></aside></div>}

    {step === 1 && <div className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)]"><aside className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">Daftar item <span className="text-[#625f54]">({draft.items.length})</span></h3><button type="button" className={`${iconButtonClass} !min-h-9 !min-w-9`} aria-label="Tambah item" onClick={addItem}><Plus className="h-4 w-4" /></button></div><div className="space-y-1">{draft.items.map((item, index) => <div key={item.id} draggable onDragStart={() => { draggedIndex.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex.current !== null) moveItem(draggedIndex.current, index); draggedIndex.current = null; }} className={`flex items-center gap-1 rounded-lg border p-1 ${selectedOption === index ? "border-[#244b3a] bg-[#e6eadf]" : "border-[#d2c5ad] bg-[#fdf9f0]"}`}><GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-[#625f54]" /><button type="button" onClick={() => setSelectedOption(index)} className="min-h-10 min-w-0 flex-1 text-left text-sm"><strong className="block text-[#183b2d]">Item {index + 1}</strong><span className="block truncate text-xs text-[#625f54]">{item.prompt}</span></button><button type="button" className="rounded-md p-1 text-[#244b3a]" aria-label={`Pindahkan item ${index + 1} ke atas`} disabled={index === 0} onClick={() => moveItem(index, index - 1)}><ChevronUp className="h-4 w-4" /></button><button type="button" className="rounded-md p-1 text-[#244b3a]" aria-label={`Pindahkan item ${index + 1} ke bawah`} disabled={index === draft.items.length - 1} onClick={() => moveItem(index, index + 1)}><ChevronDown className="h-4 w-4" /></button></div>)}</div><div className="flex flex-wrap gap-2 border-t border-[#d2c5ad] pt-3"><button type="button" disabled={!history.length} onClick={undo} className={`${iconButtonClass} !min-h-9 !min-w-9`} aria-label="Urungkan"><Undo2 className="h-4 w-4" /></button><button type="button" disabled={!future.length} onClick={redo} className={`${iconButtonClass} !min-h-9 !min-w-9`} aria-label="Ulangi"><Redo2 className="h-4 w-4" /></button></div></aside>
      <div className="min-w-0 space-y-5">{currentItem && <section className="rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-[#183b2d]">Item {selectedOption + 1}</h3><p className="mt-1 text-xs text-[#625f54]">Lengkapi isi soal dan jawaban.</p></div><div className="flex gap-2"><button type="button" title="Duplikat item" aria-label="Duplikat item" className={iconButtonClass} onClick={() => duplicateItem(selectedOption)}><Copy className="h-4 w-4" /></button><button type="button" title="Hapus item" aria-label="Hapus item" className={`${iconButtonClass} text-[#943520]`} disabled={draft.items.length < 2} onClick={() => deleteItem(selectedOption)}><Trash2 className="h-4 w-4" /></button></div></div><ItemEditor item={currentItem} template={draft.template} onChange={(item) => updateItem(selectedOption, item)} onSpeak={speak} onUpload={(file) => void uploadItemImage(file)} uploading={uploadingImage} promptError={validationAttempted && !currentItem.prompt.trim()} /></section>}
        <details className="rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-4"><summary className="cursor-pointer font-bold text-[#244b3a]">Impor dari CSV, Excel, atau teks</summary><div className="mt-4 space-y-3"><p className="text-sm leading-6 text-[#3d4038]">Satu baris untuk satu item. Untuk kuis pilihan ganda, urutannya: pertanyaan, pilihan A–E, lalu nomor jawaban benar (mulai dari 0).</p><textarea className={`${fieldClass} min-h-28`} aria-label="Tempel baris soal" placeholder={draft.template === "multiple-choice-quiz" ? "Question, option A, option B, option C, option D, correct index" : "Satu baris untuk setiap item"} value={pasteText} onChange={(event) => setPasteText(event.target.value)} /><div className="flex flex-wrap gap-3"><button type="button" onClick={() => importRows(pasteText.split(/\r?\n/).map((line) => line.split(",")))} className="min-h-11 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white">Impor teks</button><label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]">Pilih CSV atau Excel<input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div></details>
      </div></div>}

    {step === 2 && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]"><section className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Jumlah nyawa<input type="number" min={1} max={10} className={fieldClass} value={draft.settings.hearts} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, hearts: Number(event.target.value) } }))} /></label><label className="block text-sm font-bold">Batas waktu (detik)<input type="number" min={0} max={3600} className={fieldClass} value={draft.settings.timeLimitSec} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, timeLimitSec: Number(event.target.value) } }))} /><span className="mt-1 block text-xs font-normal text-[#625f54]">Isi 0 jika tanpa batas waktu.</span></label><label className="block text-sm font-bold">Mode<select className={fieldClass} value={draft.settings.mode} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, mode: event.target.value as GameBlueprint["settings"]["mode"] } }))}><option value="both">Solo dan kelas</option><option value="solo">Solo</option><option value="class">Kelas</option></select></label><label className="block text-sm font-bold">Tema warna<select className={fieldClass} value={draft.settings.theme} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, theme: event.target.value as GameBlueprint["settings"]["theme"] } }))}><option value="forest">Hutan Sapen</option><option value="tomato">Merah bata</option><option value="saffron">Saffron</option><option value="ocean">Biru laut</option></select></label></div><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.settings.randomizeQuestions} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, randomizeQuestions: event.target.checked } }))} className="h-4 w-4 accent-[#244b3a]" />Acak urutan soal</label><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.settings.randomizeOptions} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, randomizeOptions: event.target.checked } }))} className="h-4 w-4 accent-[#244b3a]" />Acak pilihan jawaban</label><label className="block text-sm font-bold">Maskot (opsional)<input className={fieldClass} value={draft.settings.mascot || ""} onChange={(event) => updateDraft((game) => ({ ...game, settings: { ...game.settings, mascot: event.target.value } }))} /></label></section>
      {currentItem && <GamePreview key={`${draft.template}-${currentItem.id}`} game={draft} item={currentItem} viewport={previewViewport} />}
    </div>}

    {step === 2 && validationAttempted && !draft.title.trim() && <p role="alert" className="rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm font-semibold text-[#943520]">Judul game wajib diisi. Lengkapi di tab Info game.</p>}
    {step === 2 && validationAttempted && !validation.valid && <button type="button" onClick={() => { const firstEmpty = draft.items.findIndex((item) => !item.prompt.trim()); setStep(1); setSelectedOption(firstEmpty >= 0 ? firstEmpty : 0); }} className="min-h-11 rounded-lg border border-[#b8aa8e] px-3 font-bold text-[#244b3a]">Lompat ke instruksi yang perlu dilengkapi</button>}
    {step === 1 && validationAttempted && currentItem && !currentItem.prompt.trim() && <p role="alert" className="rounded-lg border border-[#d2c5ad] bg-[#fdf9f0] p-4 text-sm font-semibold text-[#943520]">Instruksi untuk peserta belum diisi.</p>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d2c5ad] pt-4"><button type="button" onClick={() => setStep(Math.max(0, step - 1))} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a]"><ArrowLeft className="h-4 w-4" />Kembali</button><div className="flex flex-wrap gap-2">{step < 2 ? <button type="button" onClick={() => { if (step === 0 && !draft.title.trim()) { setValidationAttempted(true); return; } if (step === 1 && !validation.valid) { setValidationAttempted(true); return; } setValidationAttempted(false); setStep(step + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white">Lanjutkan<ArrowRight className="h-4 w-4" /></button> : <><button type="button" disabled={saving} onClick={() => void saveDraft(draft)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-4 text-sm font-bold text-[#244b3a] disabled:opacity-45"><Save className="h-4 w-4" />Simpan draf</button><button type="button" disabled={saving} onClick={() => void publish()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white disabled:opacity-45"><Check className="h-4 w-4" />Terbitkan</button></>}</div></footer>
  </div>;
}
