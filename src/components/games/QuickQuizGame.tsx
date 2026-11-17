"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Heart, Trophy, RefreshCw, Check, X, Star } from "lucide-react";
import Link from "next/link";
import { SessionPayload } from "@/lib/types";

interface QuizQuestion {
  type: "vocabulary" | "grammar" | "translation" | "opposite";
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

const QUESTION_BANK: QuizQuestion[] = [
  // Vocabulary
  { type: "vocabulary", question: "What is the English word for 'kucing'?", options: ["dog", "cat", "bird", "fish"], correctIndex: 1 },
  { type: "vocabulary", question: "What is the English word for 'buku'?", options: ["pen", "bag", "book", "table"], correctIndex: 2 },
  { type: "vocabulary", question: "What is the English word for 'apel'?", options: ["mango", "banana", "orange", "apple"], correctIndex: 3 },
  { type: "vocabulary", question: "What is the English word for 'rumah'?", options: ["school", "house", "garden", "market"], correctIndex: 1 },
  { type: "vocabulary", question: "What is the English word for 'dokter'?", options: ["teacher", "farmer", "doctor", "police"], correctIndex: 2 },
  // Grammar
  { type: "grammar", question: "Choose the correct sentence:", options: ["She are a teacher.", "She is a teacher.", "She am a teacher.", "She be a teacher."], correctIndex: 1 },
  { type: "grammar", question: "Choose the correct sentence:", options: ["I is happy.", "I are happy.", "I am happy.", "I be happy."], correctIndex: 2 },
  { type: "grammar", question: "Choose the correct sentence:", options: ["They is students.", "They am students.", "They be students.", "They are students."], correctIndex: 3 },
  { type: "grammar", question: "He ___ to school every day.", options: ["go", "going", "goes", "gone"], correctIndex: 2 },
  { type: "grammar", question: "We ___ football on Sunday.", options: ["plays", "playing", "played", "play"], correctIndex: 3 },
  // Translation (Indonesian → English)
  { type: "translation", question: "Translate: 'Saya suka makan nasi'", options: ["I like eat rice.", "I likes rice.", "I like to eat rice.", "I am rice."], correctIndex: 2 },
  { type: "translation", question: "Translate: 'Dia pergi ke pasar'", options: ["She go to market.", "She goes to the market.", "She going market.", "She market goes."], correctIndex: 1 },
  { type: "translation", question: "Translate: 'Kami bermain di taman'", options: ["We plays in garden.", "We play at the park.", "We playing at park.", "We play park."], correctIndex: 1 },
  { type: "translation", question: "Translate: 'Ibu memasak di dapur'", options: ["Mother cooks in the kitchen.", "Mother cook kitchen.", "Mother cooking dapur.", "Mother is cook at kitchen."], correctIndex: 0 },
  // Opposite
  { type: "opposite", question: "What is the opposite of 'big'?", options: ["huge", "tall", "small", "heavy"], correctIndex: 2 },
  { type: "opposite", question: "What is the opposite of 'hot'?", options: ["warm", "cold", "cool", "dry"], correctIndex: 1 },
  { type: "opposite", question: "What is the opposite of 'fast'?", options: ["quick", "smooth", "slow", "hard"], correctIndex: 2 },
  { type: "opposite", question: "What is the opposite of 'day'?", options: ["morning", "evening", "afternoon", "night"], correctIndex: 3 },
  // More vocabulary
  { type: "vocabulary", question: "What is the English word for 'air'?", options: ["fire", "earth", "water", "wind"], correctIndex: 2 },
  { type: "vocabulary", question: "What does 'happy' mean in Indonesian?", options: ["sedih", "marah", "takut", "senang"], correctIndex: 3 },
  { type: "vocabulary", question: "What does 'beautiful' mean?", options: ["Besar", "Cantik / Indah", "Kuat", "Cepat"], correctIndex: 1 },
  { type: "opposite", question: "What is the opposite of 'old'?", options: ["ancient", "new", "young", "modern"], correctIndex: 2 },
  { type: "grammar", question: "The children ___ playing in the yard.", options: ["is", "am", "are", "be"], correctIndex: 2 },
  { type: "translation", question: "Translate: 'Kucing itu berwarna putih'", options: ["The cat is white.", "Cat white.", "The cat are white.", "Cat is whiting."], correctIndex: 0 },
  { type: "vocabulary", question: "Which word means 'tempat tidur'?", options: ["chair", "table", "window", "bed"], correctIndex: 3 },
];

const QUESTIONS_PER_SESSION = 10;
const TIMER_SECONDS = 15;
const MAX_LIVES = 3;
const FAST_BONUS_THRESHOLD = 5; // seconds remaining to earn bonus

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function getGrade(score: number, max: number): { letter: string; label: string; color: string } {
  const pct = (score / max) * 100;
  if (pct >= 90) return { letter: "A", label: "Luar Biasa!", color: "text-[#14532D]" };
  if (pct >= 75) return { letter: "B", label: "Bagus!", color: "text-blue-600" };
  if (pct >= 55) return { letter: "C", label: "Cukup, terus berlatih.", color: "text-amber-600" };
  return { letter: "D", label: "Jangan menyerah, coba lagi!", color: "text-red-600" };
}

type Phase = "idle" | "playing" | "feedback" | "done";

interface Props {
  session: SessionPayload | null;
}

export default function QuickQuizGame({ session }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [scoreSaved, setScoreSaved] = useState(false);

  const current = questions[currentIdx];

  const startGame = useCallback(() => {
    setQuestions(pickRandom(QUESTION_BANK, QUESTIONS_PER_SESSION));
    setCurrentIdx(0);
    setScore(0);
    setLives(MAX_LIVES);
    setSelected(null);
    setTimeLeft(TIMER_SECONDS);
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
              gameId: "quick-quiz",
              gameTitle: "Soal Pilihan Ganda",
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
    (optIdx: number) => {
      if (phase !== "playing" || !current) return;
      setSelected(optIdx);
      setPhase("feedback");

      const isCorrect = optIdx === current.correctIndex;
      const fastBonus = isCorrect && timeLeft >= FAST_BONUS_THRESHOLD ? 5 : 0;
      const points = isCorrect ? 10 + fastBonus : 0;
      const newScore = score + points;
      const newLives = isCorrect ? lives : lives - 1;

      setScore(newScore);
      setLives(newLives);

      setTimeout(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= QUESTIONS_PER_SESSION || newLives <= 0) {
          endGame(newScore);
        } else {
          setCurrentIdx(nextIdx);
          setSelected(null);
          setTimeLeft(TIMER_SECONDS);
          setPhase("playing");
        }
      }, 1400);
    },
    [phase, current, score, lives, currentIdx, timeLeft, endGame]
  );

  // Countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // timeout = wrong
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, handleAnswer]);

  const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
    vocabulary: "Kosakata",
    grammar: "Tata Bahasa",
    translation: "Terjemahan",
    opposite: "Lawan Kata",
  };

  /* ── IDLE ── */
  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
            <Zap className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-1">Soal Pilihan Ganda</h1>
          <p className="text-sm text-[#6B7280] mb-1">Mixed Skills • Sulit</p>
          <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
            <strong>10 pertanyaan</strong>, <strong>15 detik</strong> per soal, <strong>3 nyawa</strong>.
            Jawab cepat dalam 5 detik pertama untuk bonus +5 poin!
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
    const max = QUESTIONS_PER_SESSION * 15; // max 10+5 per question
    const grade = getGrade(score, max);
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className={`text-3xl font-black ${grade.color}`}>{grade.letter}</span>
          </div>
          <h2 className="text-xl font-bold text-[#111827] mb-1">Kuis Selesai!</h2>
          <p className="text-sm text-[#6B7280] mb-4">{grade.label}</p>
          <div className="rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 mb-5">
            <p className="text-3xl font-bold text-[#14532D]">{score}</p>
            <p className="text-xs text-[#6B7280]">poin (termasuk bonus kecepatan)</p>
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
          {currentIdx + 1} / {QUESTIONS_PER_SESSION}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
          {score} poin
        </span>
      </div>

      {/* Timer */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-[#6B7280]">Waktu:</span>
        <span
          className={`text-xs font-bold ${timeLeft <= 5 ? "text-red-600" : "text-[#14532D]"}`}
        >
          {timeLeft}s
          {phase === "playing" && timeLeft >= FAST_BONUS_THRESHOLD && (
            <span className="ml-1 text-[9px] text-[#F59E0B] font-bold">
              <Star className="inline h-3 w-3" /> BONUS aktif!
            </span>
          )}
        </span>
      </div>
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${
            timeLeft > 10 ? "bg-[#14532D]" : timeLeft > 5 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 mb-5">
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          {current && TYPE_LABEL[current.type]}
        </span>
        <p className="text-sm font-bold text-[#111827] leading-snug">{current?.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {current?.options.map((opt, i) => {
          let cls =
            "w-full text-left rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3.5 text-sm font-medium text-[#111827] transition min-h-[52px] flex items-center gap-2";
          if (phase === "feedback" && selected !== null) {
            if (i === current.correctIndex)
              cls += " border-[#14532D] bg-green-50 text-[#14532D] font-bold";
            else if (i === selected && i !== current.correctIndex)
              cls += " border-red-500 bg-red-50 text-red-700";
            else cls += " opacity-50";
          } else {
            cls += " hover:border-[#14532D] hover:bg-green-50 cursor-pointer active:scale-[0.98]";
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => handleAnswer(i)}
              disabled={phase === "feedback"}
            >
              {phase === "feedback" && i === current.correctIndex && (
                <Check className="h-4 w-4 text-[#14532D] shrink-0" />
              )}
              {phase === "feedback" && i === selected && i !== current.correctIndex && (
                <X className="h-4 w-4 text-red-600 shrink-0" />
              )}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
