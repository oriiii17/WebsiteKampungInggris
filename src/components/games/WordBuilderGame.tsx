"use client";

import { useState, useCallback } from "react";
import { Layers, Heart, Trophy, RefreshCw, Check, X, RotateCcw } from "lucide-react";
import Link from "next/link";
import { SessionPayload } from "@/lib/types";

interface SentenceItem {
  words: string[];
  answer: string; // correct sentence (lowercase, no punctuation for comparison)
  display: string; // shown as feedback
  explanation: string; // in Bahasa Indonesia
}

const SENTENCE_BANK: SentenceItem[] = [
  {
    words: ["She", "is", "a", "teacher"],
    answer: "she is a teacher",
    display: "She is a teacher.",
    explanation: "Gunakan 'is' untuk subjek tunggal (She/He/It).",
  },
  {
    words: ["I", "go", "to", "school"],
    answer: "i go to school",
    display: "I go to school.",
    explanation: "'I go' — tanpa 's' karena subjeknya adalah 'I'.",
  },
  {
    words: ["The", "cat", "is", "black"],
    answer: "the cat is black",
    display: "The cat is black.",
    explanation: "'The cat' adalah subjek tunggal, jadi pakai 'is'.",
  },
  {
    words: ["We", "play", "football"],
    answer: "we play football",
    display: "We play football.",
    explanation: "'We play' — tanpa 's' karena subjeknya jamak (We).",
  },
  {
    words: ["He", "drinks", "water"],
    answer: "he drinks water",
    display: "He drinks water.",
    explanation: "'He drinks' — tambah 's' di kata kerja karena subjeknya 'He'.",
  },
  {
    words: ["My", "mother", "cooks", "rice"],
    answer: "my mother cooks rice",
    display: "My mother cooks rice.",
    explanation: "'My mother' = subjek tunggal orang ketiga, jadi 'cooks' (pakai 's').",
  },
  {
    words: ["The", "dog", "is", "big"],
    answer: "the dog is big",
    display: "The dog is big.",
    explanation: "Kata sifat (big) diletakkan setelah 'is' untuk mendeskripsikan subjek.",
  },
  {
    words: ["I", "like", "fruit"],
    answer: "i like fruit",
    display: "I like fruit.",
    explanation: "'I like' — tidak ada tambahan 's' untuk subjek 'I'.",
  },
  {
    words: ["They", "are", "students"],
    answer: "they are students",
    display: "They are students.",
    explanation: "Gunakan 'are' untuk subjek jamak (They/We/You).",
  },
  {
    words: ["He", "reads", "a", "book"],
    answer: "he reads a book",
    display: "He reads a book.",
    explanation: "'He reads' — tambah 's' karena subjeknya 'He'.",
  },
  {
    words: ["The", "bird", "can", "fly"],
    answer: "the bird can fly",
    display: "The bird can fly.",
    explanation: "Setelah kata bantu 'can', kata kerja tidak berubah (fly, bukan flies).",
  },
  {
    words: ["I", "am", "a", "student"],
    answer: "i am a student",
    display: "I am a student.",
    explanation: "Gunakan 'am' khusus untuk subjek 'I'.",
  },
  {
    words: ["She", "has", "a", "cat"],
    answer: "she has a cat",
    display: "She has a cat.",
    explanation: "'Has' digunakan untuk subjek tunggal (He/She/It). 'Have' untuk yang lain.",
  },
  {
    words: ["We", "eat", "breakfast", "together"],
    answer: "we eat breakfast together",
    display: "We eat breakfast together.",
    explanation: "Kata keterangan (together) biasanya diletakkan di akhir kalimat.",
  },
  {
    words: ["The", "children", "play", "outside"],
    answer: "the children play outside",
    display: "The children play outside.",
    explanation: "'Children' adalah bentuk jamak tidak beraturan dari 'child'.",
  },
];

const ROUNDS_PER_SESSION = 8;
const MAX_LIVES = 3;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

type Phase = "idle" | "playing" | "feedback" | "done";

interface Props {
  session: SessionPayload | null;
}

export default function WordBuilderGame({ session }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rounds, setRounds] = useState<SentenceItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [availableWords, setAvailableWords] = useState<string[]>([]); // shuffled chips
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  const current = rounds[currentIdx];

  const startGame = useCallback(() => {
    const picked = pickRandom(SENTENCE_BANK, ROUNDS_PER_SESSION);
    setRounds(picked);
    setAvailableWords(shuffle(picked[0].words));
    setBuiltSentence([]);
    setCurrentIdx(0);
    setScore(0);
    setLives(MAX_LIVES);
    setFeedbackCorrect(null);
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
              gameId: "word-builder",
              gameTitle: "Susun Kalimatnya!",
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

  const addWord = (word: string, idx: number) => {
    setBuiltSentence((prev) => [...prev, word]);
    setAvailableWords((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const removeWord = (word: string, idx: number) => {
    setAvailableWords((prev) => [...prev, word]);
    setBuiltSentence((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const resetSentence = () => {
    setAvailableWords(shuffle(current.words));
    setBuiltSentence([]);
  };

  const checkAnswer = () => {
    if (!current) return;
    const attempt = builtSentence.join(" ").toLowerCase();
    const isCorrect = attempt === current.answer;
    setFeedbackCorrect(isCorrect);
    setPhase("feedback");

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
        setAvailableWords(shuffle(rounds[nextIdx].words));
        setBuiltSentence([]);
        setFeedbackCorrect(null);
        setPhase("playing");
      }
    }, 2000);
  };

  /* ── IDLE ── */
  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50">
            <Layers className="h-7 w-7 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-1">Susun Kalimatnya!</h1>
          <p className="text-sm text-[#6B7280] mb-1">Grammar • Sedang</p>
          <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
            Susun kata-kata acak menjadi kalimat yang benar. Ketuk kata untuk menambah atau menghapusnya.{" "}
            <strong>8 soal</strong>, <strong>3 nyawa</strong>.
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
          <h2 className="text-xl font-bold text-[#111827] mb-1">Permainan Selesai!</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            {pct >= 80 ? "Tata bahasamu sangat baik!" : pct >= 50 ? "Bagus! Terus berlatih." : "Jangan menyerah, coba lagi!"}
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

      {/* Answer area */}
      <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-white p-4 mb-4 min-h-[72px]">
        <p className="text-[10px] text-[#6B7280] mb-2 uppercase tracking-wide">Kalimatmu:</p>
        <div className="flex flex-wrap gap-2">
          {builtSentence.length === 0 && (
            <p className="text-xs text-gray-400 italic">Ketuk kata di bawah untuk membangun kalimat</p>
          )}
          {builtSentence.map((word, i) => (
            <button
              key={`built-${i}`}
              onClick={() => phase === "playing" && removeWord(word, i)}
              disabled={phase === "feedback"}
              className="rounded-lg border border-[#14532D] bg-green-50 px-3 py-1.5 text-sm font-semibold text-[#14532D] hover:bg-green-100 transition min-h-[36px]"
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {phase === "feedback" && feedbackCorrect !== null && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            feedbackCorrect
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedbackCorrect ? (
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <X className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-semibold">
              {feedbackCorrect ? "Benar!" : `Jawaban yang benar: "${current?.display}"`}
            </p>
            <p className="text-xs mt-0.5">{current?.explanation}</p>
          </div>
        </div>
      )}

      {/* Available chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {availableWords.map((word, i) => (
          <button
            key={`avail-${i}`}
            onClick={() => addWord(word, i)}
            disabled={phase === "feedback"}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-semibold text-[#111827] hover:border-[#14532D] hover:bg-green-50 transition active:scale-95 min-h-[36px]"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={resetSentence}
          disabled={phase === "feedback" || builtSentence.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 min-h-[44px]"
        >
          <RotateCcw className="h-4 w-4" /> Ulang
        </button>
        <button
          onClick={checkAnswer}
          disabled={phase === "feedback" || builtSentence.length === 0}
          className="flex-1 rounded-lg bg-[#14532D] py-2.5 text-sm font-bold text-white hover:bg-[#0F3F22] transition disabled:opacity-40 min-h-[44px]"
        >
          Cek Jawaban
        </button>
      </div>
    </div>
  );
}
