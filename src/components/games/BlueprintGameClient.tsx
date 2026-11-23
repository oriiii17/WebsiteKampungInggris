"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Trophy, Volume2, X } from "lucide-react";
import { GAME_TEMPLATES, type GameBlueprint, type GameBlueprintItem } from "@/lib/game-blueprint";
import { evaluateBlueprintAnswer, initialGameProgress, submitBlueprintAnswer, type GameProgress } from "@/lib/game-engine";
import TagInput from "@/components/ui/TagInput";
import { markGuestGameCompleted } from "@/lib/guest-game-progress";
import GameCardHeader from "@/components/game/GameCardHeader";

function shuffled<T>(values: T[]): T[] { return [...values].sort(() => Math.random() - 0.5); }

export default function BlueprintGameClient({ gameId, classId, guestParticipantId, playerName = "Tamu", saveHistory = false }: { gameId: string; classId?: string; guestParticipantId?: string; playerName?: string; saveHistory?: boolean }) {
  const [game, setGame] = useState<GameBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [answer, setAnswer] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [wordGuess, setWordGuess] = useState<string[]>([]);
  const [bankIndex, setBankIndex] = useState(0);
  const [scoreSaveStatus, setScoreSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scoreSaveAttempt, setScoreSaveAttempt] = useState(0);
  const scoreSavedForGame = useRef<string | null>(null);
  const item = game?.items[itemIndex];
  const options = useMemo(() => item?.options ? game?.settings.randomizeOptions ? shuffled(item.options) : item.options : [], [game?.settings.randomizeOptions, item]);

  useEffect(() => {
    if (guestParticipantId && game && finished) markGuestGameCompleted(guestParticipantId, game.id);
  }, [finished, game, guestParticipantId]);

  useEffect(() => {
    if (!finished || !saveHistory || !game || !progress || scoreSavedForGame.current === `${game.id}:${scoreSaveAttempt}`) return;
    scoreSavedForGame.current = `${game.id}:${scoreSaveAttempt}`;
    setScoreSaveStatus("saving");
    void fetch("/api/game/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, gameTitle: game.title, score: progress.score }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Hasil kuis belum tersimpan.");
      setScoreSaveStatus("saved");
    }).catch(() => setScoreSaveStatus("error"));
  }, [finished, game, progress, saveHistory, scoreSaveAttempt]);

  useEffect(() => {
    const gamesUrl = classId ? `/api/games?purpose=independent&classId=${encodeURIComponent(classId)}` : "/api/games";
    fetch(gamesUrl, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kuis belum tersedia.");
      const selected = (data.games as GameBlueprint[]).find((candidate) => candidate.id === gameId);
      if (!selected) throw new Error("Kuis tidak ditemukan atau belum diterbitkan.");
      const ready = selected.settings.randomizeQuestions ? { ...selected, items: shuffled(selected.items) } : selected;
      setGame(ready); setProgress(initialGameProgress(ready));
      void fetch(`/api/games/${encodeURIComponent(ready.id)}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(classId ? { classId } : {}) }).catch(() => undefined);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Kuis belum tersedia.")).finally(() => setLoading(false));
  }, [classId, gameId]);

  useEffect(() => {
    if (game?.settings.timeLimitSec) setTimeLeft(game.settings.timeLimitSec);
    else setTimeLeft(null);
  }, [game?.id, game?.settings.timeLimitSec, itemIndex]);

  useEffect(() => {
    if (!game || !item || !progress || outcome !== null || timeLeft === null) return;
    if (timeLeft === 0) {
      const result = submitBlueprintAnswer(game, progress, false);
      setProgress(result.progress); setFinished(result.finished); setOutcome(false);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((current) => current === null ? null : Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [game, item, itemIndex, outcome, progress, timeLeft]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) { setError("Audio pengucapan tidak tersedia. Anda tetap dapat membaca teksnya."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = game?.language === "id" ? "id-ID" : "en-US";
    window.speechSynthesis.speak(utterance);
  }, [game?.language]);

  const submit = useCallback(() => {
    if (!game || !item || !progress) return;
    let normalizedAnswer = answer;
    if (game.template === "sentence-builder") normalizedAnswer = sentenceWords;
    if (game.template === "word-search") normalizedAnswer = wordGuess;
    const correct = evaluateBlueprintAnswer(game, item, normalizedAnswer);
    setOutcome(correct);
    const speedBonus = timeLeft !== null && game.settings.timeLimitSec > 0
      ? Math.floor((Math.max(0, timeLeft) / game.settings.timeLimitSec) * 100)
      : 0;
    const result = submitBlueprintAnswer(game, progress, correct, speedBonus);
    setProgress(result.progress);
    setFinished(result.finished);
  }, [answer, game, item, progress, sentenceWords, timeLeft, wordGuess]);

  useEffect(() => {
    if (!game || game.template !== "multiple-choice-quiz" && game.template !== "listen-and-choose" || outcome !== null) return;
    const handleKey = (event: KeyboardEvent) => {
      const key = Number(event.key);
      if (key >= 1 && key <= Math.min(5, options.length)) setAnswer(key - 1);
      if (event.key === "Enter" && answer !== null) submit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answer, game, options.length, outcome, submit]);

  function advance() {
    if (finished || !game || itemIndex >= game.items.length - 1) { setFinished(true); setOutcome(null); return; }
    setItemIndex((index) => index + 1); setAnswer(null); setOutcome(null); setSentenceWords([]); setWordGuess([]); setBankIndex(0); setTimeLeft(game.settings.timeLimitSec || null);
  }
  function restartGame() {
    if (!game) return;
    setItemIndex(0); setProgress(initialGameProgress(game)); setAnswer(null); setOutcome(null); setFinished(false); setTimeLeft(game.settings.timeLimitSec || null); setSentenceWords([]); setWordGuess([]); setBankIndex(0); setScoreSaveStatus("idle"); scoreSavedForGame.current = null;
  }
  function chooseOption(index: number) { setAnswer(index); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] text-[#244b3a]"><p className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />memuat kuis…</p></main>;
  if (error || !game || !progress || !item) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] px-4 text-center"><div><h1 className="text-2xl font-bold text-[#183b2d]">Kuis belum bisa dibuka</h1><p role="alert" className="mt-2 text-sm text-[#625f54]">{error || "Silakan coba lagi."}</p><Link href="/games" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-[#244b3a] underline"><ArrowLeft className="h-4 w-4" />Kembali ke katalog</Link></div></main>;

  if (finished && outcome === null && saveHistory && scoreSaveStatus !== "idle") return <main className="grid min-h-dvh place-items-center bg-[#183b2d] px-4 py-10 text-[#20251f]"><section aria-live="polite" className="w-full max-w-lg rounded-2xl border border-[#c9bda7] bg-white p-6 text-center shadow-sm sm:p-8"><Trophy className="mx-auto h-10 w-10 text-[#ba472f]" /><h1 className="mt-4 font-display text-3xl font-bold text-[#183b2d]">Bagus, kamu sudah berlatih!</h1><p className="mt-2 text-sm text-[#4e4a40]">Skor {progress.score} · {game.title}</p><p role="status" className={`mt-4 text-sm font-semibold ${scoreSaveStatus === "error" ? "text-[#943520]" : "text-[#244b3a]"}`}>{scoreSaveStatus === "saving" ? "Menyimpan skor ke riwayat akun…" : scoreSaveStatus === "saved" ? "Skor tersimpan di Riwayat Kuis akun Anda." : "Skor belum tersimpan. Periksa koneksi lalu coba lagi."}</p>{scoreSaveStatus === "error" && <button type="button" onClick={() => setScoreSaveAttempt((attempt) => attempt + 1)} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white">Coba simpan lagi</button>}<div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={restartGame} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white hover:bg-[#943520]">Main lagi</button><Link href="/games" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#244b3a] px-5 font-bold text-[#244b3a]"><ArrowLeft className="h-4 w-4" />Kembali ke Kuis</Link></div></section></main>;

  const templateTitle = GAME_TEMPLATES.find((entry) => entry.id === game.template)?.title;
  const practicedWords = (entry: GameBlueprintItem) => entry.vocabulary?.map((word) => word.term)
    || entry.pairs?.flatMap((pair) => [pair.left, pair.right])
    || entry.sortItems?.map((sortItem) => sortItem.text)
    || entry.words
    || entry.options?.map((option) => option.text)
    || [entry.prompt];

  if (finished && outcome === null) return <main className="min-h-dvh bg-[#183b2d] px-4 py-8 text-white sm:px-8 sm:py-12"><section className="mx-auto max-w-3xl rounded-2xl border border-white/20 bg-white p-5 text-[#20251f] shadow-lg sm:p-8"><div className="border-b border-[#d2c5ad] py-4"><p className="text-sm font-semibold text-[#625f54]">Hasil Kuis · {playerName}</p><h1 className="mt-2 font-display text-3xl font-bold text-[#183b2d] sm:text-4xl">Bagus, kamu sudah berlatih!</h1><p className="mt-3 text-[#3d4038]">{game.title} · {progress.correct} dari {progress.answered} jawaban benar</p><div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold"><span>Skor {progress.score}</span><span>Akurasi {progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0}%</span></div></div><section className="mt-7"><h2 className="text-xl font-bold text-[#183b2d]">Kata yang dilatih</h2><ul className="mt-3 divide-y divide-[#d2c5ad]">{game.items.map((entry, index) => <li key={entry.id} className="py-3"><p className="text-sm font-bold text-[#244b3a]">{index + 1}. {entry.prompt}</p><p className="mt-1 text-sm text-[#3d4038]">{practicedWords(entry).filter(Boolean).join(" · ")}</p></li>)}</ul></section><div className="mt-7 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={restartGame} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#ba472f] px-6 text-sm font-bold text-white hover:bg-[#943520]">Main lagi</button><Link href="/games" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#244b3a] px-6 text-sm font-bold text-[#244b3a]"><ArrowLeft className="h-4 w-4" />Kembali ke Kuis</Link></div></section></main>;

  return <main className="min-h-dvh bg-[#183b2d] px-3 py-4 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#10271e] px-4 py-3"><Link href="/games" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" />Keluar</Link><div className="min-w-0 flex-1 text-center sm:flex-none"><h1 className="truncate font-bold text-white">{game.title}</h1><p className="text-xs text-[#d5e0d4]">{templateTitle} · {game.level}</p></div><span className="min-w-[4.5rem] text-right text-sm font-bold tabular-nums text-[#f2d46d]">{progress.score} pt</span></header>
    <section aria-label="Kemajuan kuis" className="mt-4 rounded-xl border border-white/15 bg-[#10271e] px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">Soal {itemIndex + 1} dari {game.items.length}</span>{timeLeft !== null && <span aria-live="polite" className="font-bold tabular-nums">Waktu {timeLeft} dtk</span>}<span className="font-semibold text-[#d5e0d4]">{progress.correct} benar · {progress.score} poin</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={timeLeft === null ? "Progres kuis" : "Waktu tersisa"} aria-valuemin={0} aria-valuemax={timeLeft === null ? 100 : game.settings.timeLimitSec} aria-valuenow={timeLeft ?? Math.round(((itemIndex + 1) / game.items.length) * 100)}><div className="h-full rounded-full bg-[#e5bf4f] transition-[width] duration-1000 motion-reduce:transition-none" style={{ width: `${timeLeft === null ? ((itemIndex + 1) / game.items.length) * 100 : Math.max(0, (timeLeft / game.settings.timeLimitSec) * 100)}%` }} /></div></section>
    <div className="mx-auto mt-5 max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-white text-[#20251f] shadow-lg sm:mt-7"><GameCardHeader game={game} /><div className="p-4 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-wide text-[#625f54]">{game.topic}</p><h2 className="mt-2 text-2xl font-bold leading-snug text-[#183b2d] sm:text-3xl">{item.prompt}</h2></div>{(game.template === "listen-and-choose" || game.template === "word-bank") && <button type="button" aria-label="Dengarkan pengucapan" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]" onClick={() => speak(item.audioText || item.vocabulary?.[bankIndex % (item.vocabulary.length || 1)]?.term || item.prompt)}><Volume2 className="h-4 w-4" />Dengarkan</button>}</div>{item.imageUrl && <img src={item.imageUrl} alt="Gambar soal" className="mt-5 max-h-80 w-full rounded-xl object-contain" />}

      {(game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") && <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">{options.map((option, index) => { const originalIndex = item.options?.findIndex((entry) => entry.id === option.id) ?? index; const optionColors = ["#244b3a", "#a8402b", "#8d6719", "#365c70"]; return <button key={option.id} type="button" disabled={outcome !== null} onClick={() => chooseOption(originalIndex)} className={`flex min-h-20 items-center gap-4 rounded-xl border-2 px-4 py-4 text-left text-base font-bold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] sm:min-h-24 ${answer === originalIndex ? "ring-4 ring-[#e5bf4f]" : ""}`} style={{ backgroundColor: outcome === null ? optionColors[index % optionColors.length] : outcome ? "#244b3a" : "#873d2b", borderColor: answer === originalIndex ? "#e5bf4f" : "rgba(255,255,255,.35)" }}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/15 text-lg font-black">{String.fromCharCode(65 + index)}</span><span>{option.text}</span></button>; })}</div>}

      {game.template === "drag-and-sort" && <div className="mt-7 space-y-4">{item.sortItems?.map((entry, index) => <div key={`${entry.text}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"><span className="rounded-lg border border-[#d2c5ad] bg-white p-3 text-sm font-bold">{entry.text}</span><select aria-label={`Kategori untuk ${entry.text}`} disabled={outcome !== null} className="min-h-12 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm" value={Array.isArray(answer) ? String(answer[index] || "") : ""} onChange={(event) => { const values = Array.isArray(answer) ? [...answer] : item.sortItems?.map(() => "") || []; values[index] = event.target.value; setAnswer(values); }}><option value="">Pilih kategori</option>{item.categories?.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>)}</div>}

      {game.template === "sentence-builder" && <div className="mt-7 space-y-4"><div className="min-h-14 rounded-lg border border-dashed border-[#b8aa8e] bg-white p-3 text-sm">{sentenceWords.join(" ") || "Pilih kata untuk membentuk kalimat"}</div><div className="flex flex-wrap gap-2">{(item.words || []).map((word, index) => <button key={`${word}-${index}`} type="button" disabled={sentenceWords.filter((entry) => entry === word).length >= (item.words || []).slice(0, index + 1).filter((entry) => entry === word).length} onClick={() => setSentenceWords((current) => [...current, word])} className="min-h-11 rounded-lg border border-[#d2c5ad] bg-white px-4 text-sm font-bold">{word}</button>)}</div><button type="button" className="min-h-10 text-sm font-bold text-[#244b3a] underline" onClick={() => setSentenceWords((current) => current.slice(0, -1))}>Urungkan kata terakhir</button></div>}

      {game.template === "matching" && <div className="mt-7 space-y-3">{item.pairs?.map((pair, index) => <label key={`${pair.left}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"><span className="rounded-lg border border-[#d2c5ad] bg-white p-3 text-sm font-bold">{pair.left}</span><select aria-label={`Pasangan untuk ${pair.left}`} className="min-h-12 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm" value={Array.isArray(answer) ? String(answer[index]?.right || "") : ""} onChange={(event) => { const values = Array.isArray(answer) ? [...answer] : item.pairs?.map((entry) => ({ left: entry.left, right: "" })) || []; values[index] = { left: pair.left, right: event.target.value }; setAnswer(values); }}><option value="">Pilih pasangan</option>{item.pairs?.map((entry) => <option key={entry.right} value={entry.right}>{entry.right}</option>)}</select></label>)}</div>}

      {game.template === "word-bank" && <div className="mt-7 space-y-3">{(() => { const entry = item.vocabulary?.[Math.min(bankIndex, (item.vocabulary?.length || 1) - 1)]; return entry ? <article className="rounded-lg border border-[#d2c5ad] bg-white p-5"><p className="text-xs font-bold text-[#625f54]">Kartu {bankIndex + 1} dari {item.vocabulary?.length}</p><h3 className="mt-2 text-2xl font-bold text-[#183b2d]">{entry.term}</h3><p className="mt-1 text-base text-[#3d4038]">{entry.translation}</p>{entry.example && <p className="mt-3 text-sm italic text-[#625f54]">{entry.example}</p>}<button type="button" onClick={() => speak(entry.pronunciation || entry.term)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a]"><Volume2 className="h-4 w-4" />Dengarkan</button></article> : null; })()}<button type="button" disabled={outcome !== null} onClick={() => { if (bankIndex + 1 < (item.vocabulary?.length || 1)) setBankIndex(bankIndex + 1); else setAnswer("reviewed"); }} className="min-h-11 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white disabled:opacity-45">{bankIndex + 1 < (item.vocabulary?.length || 1) ? "Kosakata berikutnya" : "Selesai mempelajari"}</button></div>}

      {game.template === "word-search" && <div className="mt-7 space-y-3"><div className="inline-grid gap-1 rounded-lg border border-[#d2c5ad] bg-white p-3 font-bold text-[#183b2d]">{item.grid?.map((row, index) => <div key={index} className="tracking-[0.35em]">{row.split("").join(" ")}</div>)}</div><p className="text-sm text-[#3d4038]">Cari: {item.words?.join(" · ")}</p><TagInput label="Kata yang ditemukan" values={wordGuess} onChange={setWordGuess} uppercase placeholder="Tulis kata, lalu tekan Enter" /></div>}

      {outcome !== null && <div role="status" className={`mt-6 flex items-start gap-3 rounded-lg p-4 text-sm motion-safe:animate-[fadeIn_.22s_ease-out] ${outcome ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#fff0e9] text-[#943520]"}`}>{outcome ? <Check className="h-5 w-5 shrink-0" /> : <X className="h-5 w-5 shrink-0" />}<div><strong>{outcome ? "Jawaban benar!" : "Belum tepat."}</strong>{item.explanation && <p className="mt-1 leading-6">{item.explanation}</p>}</div></div>}
      <div className="mt-7 flex flex-wrap justify-end gap-3">{outcome === null ? <button type="button" disabled={answer === null && game.template !== "word-bank" && game.template !== "word-search"} onClick={submit} className="min-h-12 rounded-lg bg-[#ba472f] px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Periksa jawaban</button> : <button type="button" onClick={advance} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#244b3a] px-6 text-sm font-bold text-white">{finished || itemIndex === game.items.length - 1 ? "Lihat hasil" : "Lanjut"}<ArrowRight className="h-4 w-4" /></button>}</div>
    </div></div>
    <p className="mt-4 text-center text-xs text-[#d5e0d4]">{game.settings.timeLimitSec > 0 ? `Waktu per soal: ${game.settings.timeLimitSec} detik` : "Main sesuai ritmemu sendiri"}</p>
  </div></main>;
}
