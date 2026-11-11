"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Heart, Trophy, RefreshCw, Check, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SessionPayload } from "@/lib/types";

interface TimeQuestion {
  display: string; // e.g. "It is half past three"
  correct: string; // e.g. "3:30"
  options: string[];
}

const QUESTION_BANK: TimeQuestion[] = [
  { display: "It is three o'clock", correct: "3:00", options: ["3:00", "3:30", "3:15", "2:00"] },
  { display: "It is half past three", correct: "3:30", options: ["3:30", "3:00", "3:45", "4:30"] },
  { display: "It is quarter past six", correct: "6:15", options: ["6:15", "6:30", "6:45", "5:45"] },
  { display: "It is quarter to seven", correct: "6:45", options: ["6:45", "7:15", "7:00", "6:30"] },
  { display: "It is twenty minutes past two", correct: "2:20", options: ["2:20", "2:40", "1:40", "3:20"] },
  { display: "It is ten minutes to nine", correct: "8:50", options: ["8:50", "9:10", "8:40", "9:50"] },
  { display: "It is half past twelve", correct: "12:30", options: ["12:30", "12:00", "11:30", "1:00"] },
  { display: "It is five o'clock", correct: "5:00", options: ["5:00", "4:00", "5:30", "5:15"] },
  { display: "It is quarter past eight", correct: "8:15", options: ["8:15", "8:45", "7:45", "8:30"] },
  { display: "It is twenty-five minutes to four", correct: "3:35", options: ["3:35", "4:25", "3:25", "4:35"] },
  { display: "It is ten o'clock", correct: "10:00", options: ["10:00", "10:10", "9:50", "11:00"] },
  { display: "It is half past one", correct: "1:30", options: ["1:30", "1:00", "2:30", "12:30"] },
  { display: "It is quarter to eleven", correct: "10:45", options: ["10:45", "11:15", "10:15", "11:45"] },
  { display: "It is five minutes past seven", correct: "7:05", options: ["7:05", "7:55", "6:55", "7:50"] },
  { display: "It is half past nine", correct: "9:30", options: ["9:30", "9:00", "8:30", "10:30"] },
];

const QUESTIONS_PER_SESSION = 10;
const TIMER_SECONDS = 10;
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

export default function TellingTimeGame({ session }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<TimeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [selected, setSelected] = useState<string | null>(null);
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
              gameId: "telling-time",
              gameTitle: "Jam Berapa Ini?",
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
    (option: string) => {
      if (phase !== "playing") return;
      setSelected(option);
      setPhase("feedback");

      const isCorrect = option === current.correct;
      const newScore = isCorrect ? score + 10 : score;
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
      }, 1200);
    },
    [phase, current, score, lives, currentIdx, endGame]
  );

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      handleAnswer("__timeout__");
      return;
    }
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, handleAnswer]);

  /* ── IDLE SCREEN ── */
  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-50">
            <Clock className="h-7 w-7 text-[#14532D]" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-1">Jam Berapa Ini?</h1>
          <p className="text-sm text-[#6B7280] mb-1">Time &amp; Numbers • Mudah</p>
          <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
            Baca deskripsi waktu dalam Bahasa Inggris dan pilih jawaban yang benar.{" "}
            <strong>10 soal</strong>, <strong>10 detik</strong> per soal,{" "}
            <strong>3 nyawa</strong>.
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

  /* ── DONE SCREEN ── */
  if (phase === "done") {
    const max = QUESTIONS_PER_SESSION * 10;
    const pct = Math.round((score / max) * 100);
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-[#F59E0B]" />
          <h2 className="text-xl font-bold text-[#111827] mb-1">Permainan Selesai!</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            {pct >= 80 ? "Luar biasa! Kamu sangat menguasai waktu." : pct >= 50 ? "Bagus! Terus berlatih ya." : "Jangan menyerah, coba lagi!"}
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

  /* ── PLAYING / FEEDBACK SCREEN ── */
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Header bar */}
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

      {/* Timer bar */}
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${timeLeft > 5 ? "bg-[#14532D]" : "bg-red-500"}`}
          style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 mb-5 text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-[#14532D]" />
        <p className="text-lg font-bold text-[#111827]">{current?.display}</p>
        <p className="text-xs text-[#6B7280] mt-1">Pilih jawaban yang benar</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {current?.options.map((opt) => {
          let cls =
            "flex items-center justify-center rounded-xl border-2 border-[#E5E7EB] bg-white py-4 text-base font-bold text-[#111827] transition min-h-[56px] active:scale-95";
          if (phase === "feedback" && selected !== null) {
            if (opt === current.correct) cls += " border-[#14532D] bg-green-50 text-[#14532D]";
            else if (opt === selected && selected !== current.correct)
              cls += " border-red-500 bg-red-50 text-red-700";
          } else {
            cls += " hover:border-[#14532D] hover:bg-green-50 cursor-pointer";
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => handleAnswer(opt)}
              disabled={phase === "feedback"}
            >
              {phase === "feedback" && opt === current.correct && (
                <Check className="mr-1 h-4 w-4 text-[#14532D]" />
              )}
              {phase === "feedback" && opt === selected && selected !== current.correct && (
                <X className="mr-1 h-4 w-4 text-red-600" />
              )}
              {opt}
            </button>
          );
        })}
      </div>

      {phase === "feedback" && selected !== current?.correct && (
        <p className="mt-3 text-center text-xs text-red-600">
          Jawaban benar: <strong>{current?.correct}</strong>
        </p>
      )}
    </div>
  );
}
