"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Heart, Loader2, RotateCcw, Volume2, X } from "lucide-react";
import { GAME_TEMPLATES, type GameBlueprint, type GameBlueprintItem } from "@/lib/game-blueprint";
import { evaluateBlueprintAnswer, initialGameProgress, submitBlueprintAnswer, type GameProgress } from "@/lib/game-engine";
import TagInput from "@/components/ui/TagInput";
import { markGuestGameCompleted } from "@/lib/guest-game-progress";

function shuffled<T>(values: T[]): T[] { return [...values].sort(() => Math.random() - 0.5); }

export default function BlueprintGameClient({ gameId, classId, guestParticipantId }: { gameId: string; classId?: string; guestParticipantId?: string }) {
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
  const scoreSavedForGame = useRef<string | null>(null);
  const item = game?.items[itemIndex];
  const options = useMemo(() => item?.options ? game?.settings.randomizeOptions ? shuffled(item.options) : item.options : [], [game?.settings.randomizeOptions, item]);

  useEffect(() => {
    if (guestParticipantId && game && finished) markGuestGameCompleted(guestParticipantId, game.id);
  }, [finished, game, guestParticipantId]);

  useEffect(() => {
    if (!finished || !game || !progress || scoreSavedForGame.current === game.id) return;
    scoreSavedForGame.current = game.id;
    void fetch("/api/game/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, gameTitle: game.title, score: progress.score }),
    }).catch(() => undefined);
  }, [finished, game, progress]);

  useEffect(() => {
    const gamesUrl = classId ? `/api/games?purpose=independent&classId=${encodeURIComponent(classId)}` : "/api/games";
    fetch(gamesUrl, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Game belum tersedia.");
      const selected = (data.games as GameBlueprint[]).find((candidate) => candidate.id === gameId);
      if (!selected) throw new Error("Game tidak ditemukan atau belum diterbitkan.");
      const ready = selected.settings.randomizeQuestions ? { ...selected, items: shuffled(selected.items) } : selected;
      setGame(ready); setProgress(initialGameProgress(ready));
      void fetch(`/api/games/${encodeURIComponent(ready.id)}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(classId ? { classId } : {}) }).catch(() => undefined);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Game belum tersedia.")).finally(() => setLoading(false));
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
    const result = submitBlueprintAnswer(game, progress, correct);
    setProgress(result.progress);
    setFinished(result.finished);
  }, [answer, game, item, progress, sentenceWords, wordGuess]);

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
  function startAgain() {
    if (!game) return;
    scoreSavedForGame.current = null;
    setItemIndex(0); setProgress(initialGameProgress(game)); setAnswer(null); setOutcome(null); setFinished(false); setSentenceWords([]); setWordGuess([]); setBankIndex(0); setTimeLeft(game.settings.timeLimitSec || null);
  }
  function chooseOption(index: number) { setAnswer(index); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] text-[#244b3a]"><p className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />Memuat game…</p></main>;
  if (error || !game || !progress || !item) return <main className="grid min-h-screen place-items-center bg-[#f3e9d5] px-4 text-center"><div><h1 className="text-2xl font-bold text-[#183b2d]">Game belum bisa dibuka</h1><p role="alert" className="mt-2 text-sm text-[#625f54]">{error || "Silakan coba lagi."}</p><Link href="/games" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-[#244b3a] underline"><ArrowLeft className="h-4 w-4" />Kembali ke katalog</Link></div></main>;

  const templateTitle = GAME_TEMPLATES.find((entry) => entry.id === game.template)?.title;
  const practicedWords = (entry: GameBlueprintItem) => entry.vocabulary?.map((word) => word.term)
    || entry.pairs?.flatMap((pair) => [pair.left, pair.right])
    || entry.sortItems?.map((sortItem) => sortItem.text)
    || entry.words
    || entry.options?.map((option) => option.text)
    || [entry.prompt];

  if (finished && outcome === null) return <main className="min-h-screen bg-[#f3e9d5] px-4 py-12 text-[#20251f] sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/games" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a] underline"><ArrowLeft className="h-4 w-4" />Kembali ke Games</Link><div className="mt-6 border-y border-[#d2c5ad] py-8"><h1 className="font-display text-4xl font-bold text-[#183b2d]">Bagus, kamu sudah berlatih!</h1><p className="mt-3 text-[#3d4038]">{game.title} · {progress.correct} dari {progress.answered} jawaban benar</p><div className="mt-5 flex flex-wrap gap-5 text-sm font-bold"><span>Skor {progress.score}</span><span>Streak terbaik {progress.bestStreak}</span><span>Sisa nyawa {progress.hearts}</span></div></div><section className="mt-8"><h2 className="text-xl font-bold text-[#183b2d]">Kata yang dilatih</h2><ul className="mt-3 divide-y divide-[#d2c5ad]">{game.items.map((entry, index) => <li key={entry.id} className="py-3"><p className="text-sm font-bold text-[#244b3a]">{index + 1}. {entry.prompt}</p><p className="mt-1 text-sm text-[#3d4038]">{practicedWords(entry).filter(Boolean).join(" · ")}</p></li>)}</ul></section><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={startAgain} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ba472f] px-5 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" />Main lagi</button><Link href="/games" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-5 text-sm font-bold text-[#244b3a]">Kembali ke menu</Link></div></div></main>;

  return <main className="min-h-screen bg-[#f3e9d5] px-4 py-6 text-[#20251f] sm:px-8 sm:py-10"><div className="mx-auto max-w-4xl">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d2c5ad] pb-4"><Link href="/games" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a]"><ArrowLeft className="h-4 w-4" />Keluar</Link><div className="text-center"><h1 className="font-bold text-[#183b2d]">{game.title}</h1><p className="text-xs text-[#625f54]">{templateTitle} · {game.level}</p></div><div className="flex items-center gap-1" aria-label={`${progress.hearts} nyawa tersisa`}>{Array.from({ length: game.settings.hearts }, (_, index) => <Heart key={index} aria-hidden="true" className={`h-5 w-5 ${index < progress.hearts ? "fill-[#ba472f] text-[#ba472f]" : "text-[#b8aa8e]"}`} />)}</div></header>
    <section aria-label="Kemajuan game" className="flex items-center justify-between gap-3 border-b border-[#d2c5ad] py-3 text-sm"><span>Soal {itemIndex + 1} dari {game.items.length}</span><span>Skor <strong className="tabular-nums">{progress.score}</strong></span><span>Streak <strong className="tabular-nums">{progress.streak}</strong></span>{timeLeft !== null && <span aria-live="polite">Sisa {timeLeft} dtk</span>}<span className="hidden sm:inline">Tekan 1–5 untuk memilih</span></section>
    <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-wide text-[#625f54]">{game.topic}</p><h2 className="mt-3 text-2xl font-bold leading-snug text-[#183b2d] sm:text-3xl">{item.prompt}</h2></div>{(game.template === "listen-and-choose" || game.template === "word-bank") && <button type="button" aria-label="Dengarkan pengucapan" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b8aa8e] px-3 text-sm font-bold text-[#244b3a]" onClick={() => speak(item.audioText || item.vocabulary?.[bankIndex % (item.vocabulary.length || 1)]?.term || item.prompt)}><Volume2 className="h-4 w-4" />Dengarkan</button>}</div>

      {(game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") && <div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map((option, index) => { const originalIndex = item.options?.findIndex((entry) => entry.id === option.id) ?? index; return <button key={option.id} type="button" disabled={outcome !== null} onClick={() => chooseOption(originalIndex)} className={`min-h-16 rounded-lg border px-4 py-3 text-left text-base font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] ${answer === originalIndex ? "border-[#244b3a] bg-[#e6eadf] text-[#183b2d]" : "border-[#d2c5ad] bg-white text-[#20251f] hover:bg-[#e6eadf]"}`}><span className="mr-3 text-sm text-[#625f54]">{index + 1}</span>{option.text}</button>; })}</div>}

      {game.template === "drag-and-sort" && <div className="mt-7 space-y-4">{item.sortItems?.map((entry, index) => <div key={`${entry.text}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"><span className="rounded-lg border border-[#d2c5ad] bg-white p-3 text-sm font-bold">{entry.text}</span><select aria-label={`Kategori untuk ${entry.text}`} disabled={outcome !== null} className="min-h-12 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm" value={Array.isArray(answer) ? String(answer[index] || "") : ""} onChange={(event) => { const values = Array.isArray(answer) ? [...answer] : item.sortItems?.map(() => "") || []; values[index] = event.target.value; setAnswer(values); }}><option value="">Pilih kategori</option>{item.categories?.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>)}</div>}

      {game.template === "sentence-builder" && <div className="mt-7 space-y-4"><div className="min-h-14 rounded-lg border border-dashed border-[#b8aa8e] bg-white p-3 text-sm">{sentenceWords.join(" ") || "Pilih kata untuk membentuk kalimat"}</div><div className="flex flex-wrap gap-2">{(item.words || []).map((word, index) => <button key={`${word}-${index}`} type="button" disabled={sentenceWords.filter((entry) => entry === word).length >= (item.words || []).slice(0, index + 1).filter((entry) => entry === word).length} onClick={() => setSentenceWords((current) => [...current, word])} className="min-h-11 rounded-lg border border-[#d2c5ad] bg-white px-4 text-sm font-bold">{word}</button>)}</div><button type="button" className="min-h-10 text-sm font-bold text-[#244b3a] underline" onClick={() => setSentenceWords((current) => current.slice(0, -1))}>Urungkan kata terakhir</button></div>}

      {game.template === "matching" && <div className="mt-7 space-y-3">{item.pairs?.map((pair, index) => <label key={`${pair.left}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"><span className="rounded-lg border border-[#d2c5ad] bg-white p-3 text-sm font-bold">{pair.left}</span><select aria-label={`Pasangan untuk ${pair.left}`} className="min-h-12 rounded-lg border border-[#b8aa8e] bg-white px-3 text-sm" value={Array.isArray(answer) ? String(answer[index]?.right || "") : ""} onChange={(event) => { const values = Array.isArray(answer) ? [...answer] : item.pairs?.map((entry) => ({ left: entry.left, right: "" })) || []; values[index] = { left: pair.left, right: event.target.value }; setAnswer(values); }}><option value="">Pilih pasangan</option>{item.pairs?.map((entry) => <option key={entry.right} value={entry.right}>{entry.right}</option>)}</select></label>)}</div>}

      {game.template === "word-bank" && <div className="mt-7 space-y-3">{(() => { const entry = item.vocabulary?.[Math.min(bankIndex, (item.vocabulary?.length || 1) - 1)]; return entry ? <article className="rounded-lg border border-[#d2c5ad] bg-white p-5"><p className="text-xs font-bold text-[#625f54]">Kartu {bankIndex + 1} dari {item.vocabulary?.length}</p><h3 className="mt-2 text-2xl font-bold text-[#183b2d]">{entry.term}</h3><p className="mt-1 text-base text-[#3d4038]">{entry.translation}</p>{entry.example && <p className="mt-3 text-sm italic text-[#625f54]">{entry.example}</p>}<button type="button" onClick={() => speak(entry.pronunciation || entry.term)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#244b3a]"><Volume2 className="h-4 w-4" />Dengarkan</button></article> : null; })()}<button type="button" disabled={outcome !== null} onClick={() => { if (bankIndex + 1 < (item.vocabulary?.length || 1)) setBankIndex(bankIndex + 1); else setAnswer("reviewed"); }} className="min-h-11 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white disabled:opacity-45">{bankIndex + 1 < (item.vocabulary?.length || 1) ? "Kosakata berikutnya" : "Selesai mempelajari"}</button></div>}

      {game.template === "word-search" && <div className="mt-7 space-y-3"><div className="inline-grid gap-1 rounded-lg border border-[#d2c5ad] bg-white p-3 font-bold text-[#183b2d]">{item.grid?.map((row, index) => <div key={index} className="tracking-[0.35em]">{row.split("").join(" ")}</div>)}</div><p className="text-sm text-[#3d4038]">Cari: {item.words?.join(" · ")}</p><TagInput label="Kata yang ditemukan" values={wordGuess} onChange={setWordGuess} uppercase placeholder="Tulis kata, lalu tekan Enter" /></div>}

      {outcome !== null && <div role="status" className={`mt-6 flex items-start gap-3 rounded-lg p-4 text-sm ${outcome ? "bg-[#e6eadf] text-[#183b2d]" : "bg-[#ba472f]/10 text-[#943520]"}`}>{outcome ? <Check className="h-5 w-5 shrink-0" /> : <X className="h-5 w-5 shrink-0" />}<div><strong>{outcome ? "Jawaban benar!" : "Belum tepat."}</strong>{item.explanation && <p className="mt-1 leading-6">{item.explanation}</p>}</div></div>}
      <div className="mt-7 flex flex-wrap justify-end gap-3">{outcome === null ? <button type="button" disabled={answer === null && game.template !== "word-bank" && game.template !== "word-search"} onClick={submit} className="min-h-12 rounded-lg bg-[#ba472f] px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Periksa jawaban</button> : <button type="button" onClick={advance} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#244b3a] px-6 text-sm font-bold text-white">{finished || itemIndex === game.items.length - 1 ? "Lihat hasil" : "Lanjut"}<ArrowRight className="h-4 w-4" /></button>}</div>
    </div>
    <p className="mt-4 text-center text-xs text-[#625f54]">{game.settings.timeLimitSec > 0 ? `Waktu yang disarankan: ${game.settings.timeLimitSec} detik per soal` : "Main sesuai ritmemu sendiri"}</p>
  </div></main>;
}
