"use client";

import { useState, useCallback } from "react";
import { BookOpen, Trophy, RefreshCw, Check, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SessionPayload } from "@/lib/types";

interface StoryQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

interface Story {
  title: string;
  paragraphs: string[];
  questions: StoryQuestion[];
}

const STORY_BANK: Story[] = [
  {
    title: "Budi's Morning",
    paragraphs: [
      "Budi is a ten-year-old boy. He wakes up at six o'clock every morning.",
      "He brushes his teeth and washes his face. Then he eats breakfast with his mother.",
      "His mother makes fried rice and a glass of milk for him.",
      "After breakfast, Budi goes to school by bicycle. His school is not far from his house.",
      "He arrives at school at half past six. He is always on time.",
    ],
    questions: [
      {
        question: "What time does Budi wake up?",
        options: ["At five o'clock", "At six o'clock", "At seven o'clock", "At half past six"],
        correctIndex: 1,
      },
      {
        question: "How does Budi go to school?",
        options: ["By car", "By bus", "By bicycle", "On foot"],
        correctIndex: 2,
      },
      {
        question: "What does Budi eat for breakfast?",
        options: ["Bread and juice", "Noodles and tea", "Fried rice and milk", "Rice and egg"],
        correctIndex: 2,
      },
    ],
  },
  {
    title: "The Market",
    paragraphs: [
      "Ibu Sari goes to the market every Sunday morning. She loves fresh food.",
      "Today she buys two kilograms of tomatoes and one kilogram of fish.",
      "She also buys some vegetables like spinach and carrots.",
      "The market is very busy. Many people come to buy food.",
      "Ibu Sari pays for everything and walks home. She is happy with her shopping.",
    ],
    questions: [
      {
        question: "When does Ibu Sari go to the market?",
        options: ["Every Saturday", "Every Friday", "Every Sunday", "Every Monday"],
        correctIndex: 2,
      },
      {
        question: "How many kilograms of tomatoes does she buy?",
        options: ["One", "Two", "Three", "Four"],
        correctIndex: 1,
      },
      {
        question: "What vegetables does Ibu Sari buy?",
        options: ["Corn and onion", "Spinach and carrots", "Potato and cabbage", "Garlic and chili"],
        correctIndex: 1,
      },
    ],
  },
  {
    title: "The Lost Cat",
    paragraphs: [
      "Rini has a small white cat named Snowy. Snowy loves to play outside.",
      "One afternoon, Snowy did not come home. Rini was very worried.",
      "She looked in the garden and behind the house, but Snowy was not there.",
      "Rini's neighbour, Pak Hendra, found Snowy sleeping under a tree in his garden.",
      "He called Rini and she ran to get her cat. Rini was very happy and hugged Snowy.",
    ],
    questions: [
      {
        question: "What is the name of Rini's cat?",
        options: ["Fluffy", "Whiskers", "Snowy", "Cotton"],
        correctIndex: 2,
      },
      {
        question: "Where was Snowy found?",
        options: ["On the roof", "In the market", "Under a tree", "Inside the house"],
        correctIndex: 2,
      },
      {
        question: "Who found Snowy?",
        options: ["Rini's mother", "A stranger", "Rini herself", "Pak Hendra"],
        correctIndex: 3,
      },
    ],
  },
];

type Phase = "idle" | "reading" | "answering" | "result" | "done";

interface Props {
  session: SessionPayload | null;
}

export default function StoryQuestGame({ session }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [story, setStory] = useState<Story | null>(null);
  const [score, setScore] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<(number | null)[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);

  const startGame = useCallback(() => {
    const picked = STORY_BANK[Math.floor(Math.random() * STORY_BANK.length)];
    setStory(picked);
    setScore(0);
    setQuestionIdx(0);
    setSelected(null);
    setAnswered([]);
    setScoreSaved(false);
    setPhase("reading");
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
              gameId: "story-quest",
              gameTitle: "Baca & Jawab Cerita",
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

  const handleAnswer = (idx: number) => {
    if (selected !== null || !story) return;
    setSelected(idx);
    const isCorrect = idx === story.questions[questionIdx].correctIndex;
    const newScore = isCorrect ? score + 10 : score;
    setScore(newScore);
    setAnswered((prev) => [...prev, idx]);

    setTimeout(() => {
      const nextQ = questionIdx + 1;
      if (nextQ >= story.questions.length) {
        endGame(newScore);
      } else {
        setQuestionIdx(nextQ);
        setSelected(null);
      }
    }, 1500);
  };

  /* ── IDLE ── */
  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
            <BookOpen className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-1">Baca &amp; Jawab Cerita</h1>
          <p className="text-sm text-[#6B7280] mb-1">Reading • Sedang</p>
          <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
            Baca cerita pendek lalu jawab <strong>3 pertanyaan</strong>. Cerita dipilih secara acak setiap sesi.
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
    const max = (story?.questions.length ?? 3) * 10;
    const pct = Math.round((score / max) * 100);
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-7 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-[#F59E0B]" />
          <h2 className="text-xl font-bold text-[#111827] mb-1">Cerita Selesai!</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            {pct === 100 ? "Sempurna! Pemahamanmu luar biasa." : pct >= 60 ? "Bagus! Kamu memahami ceritanya." : "Coba baca lebih teliti dan ulangi."}
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
              <RefreshCw className="h-4 w-4" /> Cerita Baru
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

  /* ── READING ── */
  if (phase === "reading" && story) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-[#111827]">{story.title}</h2>
          </div>
          <div className="space-y-3">
            {story.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-[#111827] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
        <button
          onClick={() => setPhase("answering")}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-gray-950 hover:bg-[#D97706] transition min-h-[44px]"
        >
          Jawab Pertanyaan <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  /* ── ANSWERING ── */
  if (phase === "answering" && story) {
    const q = story.questions[questionIdx];
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Progress */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">
            Pertanyaan {questionIdx + 1} dari {story.questions.length}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
            {score} poin
          </span>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 mb-5">
          <p className="text-sm font-bold text-[#111827] leading-snug">{q.question}</p>
        </div>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let cls =
              "w-full text-left rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3.5 text-sm font-medium text-[#111827] transition min-h-[52px]";
            if (selected !== null) {
              if (i === q.correctIndex)
                cls += " border-[#14532D] bg-green-50 text-[#14532D] font-bold";
              else if (i === selected && i !== q.correctIndex)
                cls += " border-red-500 bg-red-50 text-red-700";
              else cls += " opacity-50";
            } else {
              cls += " hover:border-[#14532D] hover:bg-green-50 cursor-pointer";
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
              >
                <span className="inline-flex items-center gap-2">
                  {selected !== null && i === q.correctIndex && (
                    <Check className="h-4 w-4 text-[#14532D]" />
                  )}
                  {selected !== null && i === selected && i !== q.correctIndex && (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
