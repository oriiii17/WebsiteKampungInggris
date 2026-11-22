"use client";

import { useState, useCallback } from "react";
import { ImageIcon, Heart, Trophy, RefreshCw, Check, X } from "lucide-react";
import Link from "next/link";
import { SessionPayload } from "@/lib/types";

interface WordItem {
  word: string;
  category: string;
  color: string;
  textColor: string;
  distractors: string[];
}

const WORD_BANK: WordItem[] = [
  // Fruit
  { word: "apple", category: "Fruit", color: "bg-red-100", textColor: "text-red-800", distractors: ["banana", "mango", "grape"] },
  { word: "banana", category: "Fruit", color: "bg-yellow-100", textColor: "text-yellow-800", distractors: ["apple", "orange", "mango"] },
  { word: "mango", category: "Fruit", color: "bg-orange-100", textColor: "text-orange-800", distractors: ["apple", "grape", "banana"] },
  // Furniture
  { word: "chair", category: "Furniture", color: "bg-blue-100", textColor: "text-blue-800", distractors: ["table", "bed", "door"] },
  { word: "table", category: "Furniture", color: "bg-indigo-100", textColor: "text-indigo-800", distractors: ["chair", "window", "bed"] },
  { word: "bed", category: "Furniture", color: "bg-purple-100", textColor: "text-purple-800", distractors: ["table", "door", "chair"] },
  // Jobs
  { word: "doctor", category: "Jobs", color: "bg-teal-100", textColor: "text-teal-800", distractors: ["teacher", "farmer", "chef"] },
  { word: "teacher", category: "Jobs", color: "bg-cyan-100", textColor: "text-cyan-800", distractors: ["doctor", "police", "farmer"] },
  { word: "farmer", category: "Jobs", color: "bg-lime-100", textColor: "text-lime-800", distractors: ["teacher", "chef", "doctor"] },
  // Animals
  { word: "cat", category: "Animals", color: "bg-gray-100", textColor: "text-gray-800", distractors: ["dog", "bird", "fish"] },
  { word: "dog", category: "Animals", color: "bg-amber-100", textColor: "text-amber-800", distractors: ["cat", "rabbit", "bird"] },
  { word: "bird", category: "Animals", color: "bg-sky-100", textColor: "text-sky-800", distractors: ["fish", "cat", "dog"] },
  // Family
  { word: "mother", category: "Family", color: "bg-pink-100", textColor: "text-pink-800", distractors: ["father", "sister", "brother"] },
  { word: "father", category: "Family", color: "bg-blue-100", textColor: "text-blue-800", distractors: ["mother", "grandmother", "sister"] },
  { word: "sister", category: "Family", color: "bg-rose-100", textColor: "text-rose-800", distractors: ["brother", "mother", "father"] },
];

const ROUNDS_PER_SESSION = 8;
const MAX_LIVES = 3;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function buildOptions(item: WordItem): string[] {
  return shuffle([item.word, ...item.distractors.slice(0, 3)]);
}

type Phase = "idle" | "playing" | "feedback" | "done";

interface Props {
  session: SessionPayload | null;
}

export default function WordMatchGame({ session }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rounds, setRounds] = useState<WordItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [selected, setSelected] = useState<string | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  const current = rounds[currentIdx];

  const startGame = useCallback(() => {
    const picked = pickRandom(WORD_BANK, ROUNDS_PER_SESSION);
    setRounds(picked);
    setOptions(buildOptions(picked[0]));
    setCurrentIdx(0);
    setScore(0);
    setLives(MAX_LIVES);
    setSelected(null);
    setScoreSaved(false);
    setPhase("playing");
  }, []);

  const endGame = useCallback(
    async (finalScore: number) => {
      setPhase("done");
      if (session) {
        try {
          await fetch("/api/game/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: "word-match",
              gameTitle: "Cocokkan Gambar & Kata",
              score: finalScore,
            }),
          });
          setScoreSaved(true);
        } catch {
          // silent
        }
      }
    },
    [session]
  );

  const handleAnswer = useCallback(
    (opt: string) => {
      if (phase !== "playing") return;
      setSelected(opt);
      setPhase("feedback");

      const isCorrect = opt === current.word;
      const newScore = isCorrect ? score + 10 : score;
      const newLives = isCorrect ? lives : lives - 1;

      setScore(newScore);
      setLives(newLives);

      setTimeout(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= ROUNDS_PER_SESSION || newLives <= 0) {
          endGame(newScore);
        } else {
          setCurrentIdx(nextIdx);
          setOptions(buildOptions(rounds[nextIdx]));
          setSelected(null);
          setPhase("playing");
        }
      }, 1200);
    },
    [phase, current, score, lives, currentIdx, rounds, endGame]
  );

  /* ── IDLE ── */
  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
            <ImageIcon className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-1">Cocokkan Gambar &amp; Kata</h1>
          <p className="text-sm text-[#6B7280] mb-1">Vocabulary • Mudah</p>
          <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
            Lihat kata Bahasa Inggris yang ditampilkan, lalu pilih kotak yang cocok.{" "}
            <strong>8 ronde</strong>, <strong>3 nyawa</strong>.
          </p>
          {!session && (
            <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Bermain tanpa login — skor tidak tersimpan ke Leaderboard.
            </p>
          )}
          <button
            onClick={startGame}
            className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-gray-950 hover:bg-[#D97706] transition min-h-[44px]"
          >
            Mulai Bermain
          </button>
        </div>
      </div>
    );
  }

  /* ── DONE ── */
  if (phase === "done") {
    const max = ROUNDS_PER_SESSION * 10;
    const pct = Math.round((score / max) * 100);
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-[#F59E0B]" />
          <h2 className="text-xl font-bold text-[#111827] mb-1">Kuis Selesai!</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            {pct >= 80 ? "Kosakatamu sangat bagus!" : pct >= 50 ? "Bagus! Terus berlatih." : "Jangan menyerah, coba lagi!"}
          </p>
          <div className="rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 mb-5">
            <p className="text-3xl font-bold text-[#14532D]">{score}</p>
            <p className="text-xs text-[#6B7280]">dari {max} poin maksimal</p>
          </div>
          {session && (
            <p className="text-xs text-green-700 mb-4">
              {scoreSaved ? "✓ Skor tersimpan ke Leaderboard!" : "Menyimpan skor…"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] py-2.5 text-sm font-semibold text-[#111827] hover:bg-gray-50 transition min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" /> Main Lagi
            </button>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-2.5 text-sm font-bold text-gray-950 hover:bg-[#D97706] transition min-h-[44px]"
            >
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── PLAYING / FEEDBACK ── */
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={`h-5 w-5 ${i < lives ? "text-red-500 fill-red-500" : "text-gray-300"}`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-[#14532D]">
          {currentIdx + 1} / {ROUNDS_PER_SESSION}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
          {score} poin
        </span>
      </div>

      {/* Prompt */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 mb-5 text-center">
        <p className="text-xs text-[#6B7280] mb-1 uppercase tracking-wide">Kategori: {current?.category}</p>
        <p className="text-2xl font-bold text-[#111827]">{current?.word}</p>
        <p className="text-xs text-[#6B7280] mt-1">Pilih kotak yang cocok dengan kata di atas</p>
      </div>

      {/* Options: colored boxes */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isCorrect = opt === current?.word;
          const wordData = WORD_BANK.find((w) => w.word === opt);
          let baseCls = `flex flex-col items-center justify-center rounded-xl border-2 p-5 text-center transition min-h-[90px] active:scale-95`;

          if (phase === "feedback" && selected !== null) {
            if (opt === current?.word)
              baseCls += " border-[#14532D] bg-green-50";
            else if (opt === selected && !isCorrect)
              baseCls += " border-red-500 bg-red-50";
            else baseCls += " border-[#E5E7EB] opacity-50 " + (wordData?.color ?? "bg-gray-50");
          } else {
            baseCls +=
              " border-[#E5E7EB] cursor-pointer hover:border-[#14532D] " +
              (wordData?.color ?? "bg-gray-50");
          }

          return (
            <button
              key={opt}
              className={baseCls}
              onClick={() => handleAnswer(opt)}
              disabled={phase === "feedback"}
            >
              {phase === "feedback" && opt === current?.word && (
                <Check className="mb-1 h-5 w-5 text-[#14532D]" />
              )}
              {phase === "feedback" && opt === selected && !isCorrect && (
                <X className="mb-1 h-5 w-5 text-red-600" />
              )}
              <span
                className={`text-sm font-bold ${
                  phase === "feedback" && opt === current?.word
                    ? "text-[#14532D]"
                    : phase === "feedback" && opt === selected && !isCorrect
                    ? "text-red-700"
                    : (wordData?.textColor ?? "text-gray-800")
                }`}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
