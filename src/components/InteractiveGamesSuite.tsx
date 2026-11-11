"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  HelpCircle,
  Layers,
  Puzzle,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react";
import {
  FlashcardItem,
  MatchingPair,
  QuizQuestion,
  WordChallenge,
} from "@/lib/types";

interface Props {
  moduleId: string;
  moduleTitle: string;
  quizzes: QuizQuestion[];
  flashcards: FlashcardItem[];
  matchingPairs: MatchingPair[];
  wordChallenges: WordChallenge[];
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function InteractiveGamesSuite({
  moduleId,
  moduleTitle,
  quizzes,
  flashcards,
  matchingPairs,
  wordChallenges,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "quiz" | "flashcard" | "matching" | "scramble"
  >("quiz");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  async function submitScore(
    gameType: "Quiz Pilihan Ganda" | "Matching Kata" | "Susun Kata & Rumpang",
    score: number
  ) {
    if (score >= 70) {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
    }
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, gameType, score }),
      });
      if (res.ok) {
        setSavedNotice(
          `Skor ${score} poin dari ${gameType} berhasil disimpan ke Leaderboard Mingguan!`
        );
      }
    } catch {
      // abaikan
    }
  }

  // 1. QUIZ PILIHAN GANDA STATE
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const quizScore = useMemo(() => {
    if (quizzes.length === 0) return 0;
    let correct = 0;
    for (const q of quizzes) {
      if (quizAnswers[q.id] === q.correctIndex) correct++;
    }
    return Math.round((correct / quizzes.length) * 100);
  }, [quizzes, quizAnswers]);

  function handleQuizSubmit() {
    setQuizSubmitted(true);
    submitScore("Quiz Pilihan Ganda", quizScore);
  }

  function resetQuiz() {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setSavedNotice(null);
  }

  // 2. FLASHCARD KOSAKATA STATE
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  const currentCard = flashcards[fcIndex];

  function speakEnglish(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  }

  // 3. MATCHING GAME STATE
  const [matchSeed, setMatchSeed] = useState(0);
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  const shuffledEn = useMemo(
    () => shuffleArray(matchingPairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchingPairs, matchSeed]
  );
  const shuffledId = useMemo(
    () => shuffleArray(matchingPairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchingPairs, matchSeed]
  );

  function handleMatchPick(side: "en" | "id", pairId: string) {
    if (matchedIds.includes(pairId)) return;
    const nextEn = side === "en" ? pairId : selectedEn;
    const nextId = side === "id" ? pairId : selectedId;

    if (side === "en") setSelectedEn(pairId);
    else setSelectedId(pairId);

    if (nextEn && nextId) {
      if (nextEn === nextId) {
        const updated = [...matchedIds, nextEn];
        setMatchedIds(updated);
        setSelectedEn(null);
        setSelectedId(null);

        if (updated.length === matchingPairs.length && matchingPairs.length > 0) {
          const finalScore = Math.max(40, 100 - wrongAttempts * 10);
          submitScore("Matching Kata", finalScore);
        }
      } else {
        setWrongAttempts((w) => w + 1);
        setWrongFlash(true);
        setTimeout(() => {
          setSelectedEn(null);
          setSelectedId(null);
          setWrongFlash(false);
        }, 500);
      }
    }
  }

  function resetMatching() {
    setMatchedIds([]);
    setSelectedEn(null);
    setSelectedId(null);
    setWrongAttempts(0);
    setMatchSeed((s) => s + 1);
    setSavedNotice(null);
  }

  // 4. WORD SCRAMBLE & KALIMAT RUMPANG STATE
  const [wcIndex, setWcIndex] = useState(0);
  const [wcInput, setWcInput] = useState("");
  const [wcShowHint, setWcShowHint] = useState(false);
  const [wcResults, setWcResults] = useState<Record<string, boolean>>({});

  const activeChallenge = wordChallenges[wcIndex];

  const scrambledLetters = useMemo(() => {
    if (!activeChallenge) return [];
    const chars = activeChallenge.answer.toUpperCase().split("");
    return shuffleArray(chars.map((ch, idx) => ({ ch, idx })));
  }, [activeChallenge]);

  function checkWordAnswer() {
    if (!activeChallenge) return;
    const clean = wcInput.trim().toUpperCase();
    const isCorrect = clean === activeChallenge.answer.toUpperCase();
    const nextResults = { ...wcResults, [activeChallenge.id]: isCorrect };
    setWcResults(nextResults);

    if (Object.keys(nextResults).length === wordChallenges.length) {
      const correctCount = Object.values(nextResults).filter(Boolean).length;
      const total = Math.round((correctCount / wordChallenges.length) * 100);
      submitScore("Susun Kata & Rumpang", total);
    }
  }

  const tabs = [
    {
      id: "quiz" as const,
      label: "Kuis Pilihan Ganda",
      count: quizzes.length,
      icon: HelpCircle,
    },
    {
      id: "flashcard" as const,
      label: "Flashcard Audio",
      count: flashcards.length,
      icon: Layers,
    },
    {
      id: "matching" as const,
      label: "Cocokkan Kata",
      count: matchingPairs.length,
      icon: Puzzle,
    },
    {
      id: "scramble" as const,
      label: "Susun Kata & Rumpang",
      count: wordChallenges.length,
      icon: Sparkles,
    },
  ];

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
      {/* Header: Clean, Flat */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-[#14532D]">
            Latihan & Kuis Interaktif
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
            Latihan Mandiri: {moduleTitle}
          </h3>
          <p className="text-sm text-gray-600 mt-1 leading-[1.6]">
            Skor latihan otomatis tersimpan ke Leaderboard Mingguan Kampung Sapen.
          </p>
        </div>

        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-700 transition"
        >
          <Trophy className="h-4 w-4 text-[#14532D]" />
          Lihat Peringkat
        </Link>
      </div>

      {/* Sub-Tabs: Clean borders */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setSavedNotice(null);
              }}
              className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
                active
                  ? "border-[#14532D] bg-gray-50 text-gray-900 font-bold"
                  : "border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-[#14532D]" : "text-gray-400"
                  }`}
                />
                <span className="text-xs sm:text-sm">{t.label}</span>
              </div>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifikasi Skor Tersimpan */}
      {savedNotice && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-gray-50 p-3 text-xs font-medium text-gray-900">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#14532D]" />
            {savedNotice}
          </span>
          <Link href="/leaderboard" className="font-bold text-[#14532D] hover:underline">
            Cek Leaderboard →
          </Link>
        </div>
      )}

      {/* TAB 1: KUIS PILIHAN GANDA */}
      {activeTab === "quiz" && (
        <div className="mt-6 space-y-6">
          {quizzes.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
              Belum ada soal kuis pada modul ini.
            </p>
          ) : (
            <>
              {quizSubmitted && (
                <div className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Hasil Evaluasi Kuis
                    </p>
                    <h4 className="text-2xl font-extrabold text-gray-900 mt-1">
                      Skor: {quizScore} / 100
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {quizScore >= 80
                        ? "Pemahaman Anda sangat baik. Silakan cek pembahasan soal di bawah."
                        : "Pelajari pembahasan di bawah ini untuk memahami jawaban yang benar."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Ulangi Kuis
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {quizzes.map((q, idx) => {
                  const chosen = quizAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-[#E5E7EB] bg-white p-5"
                    >
                      <p className="text-sm sm:text-base font-bold text-gray-900">
                        {idx + 1}. {q.question}
                      </p>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          const isRight = q.correctIndex === optIdx;

                          let btnStyle =
                            "border-[#E5E7EB] bg-white text-gray-700 hover:border-gray-400";
                          if (!quizSubmitted && isSelected) {
                            btnStyle =
                              "border-[#14532D] bg-gray-50 text-[#14532D] font-bold";
                          } else if (quizSubmitted) {
                            if (isRight) {
                              btnStyle =
                                "border-[#14532D] bg-[#F0FDF4] text-[#14532D] font-bold";
                            } else if (isSelected && !isRight) {
                              btnStyle =
                                "border-red-300 bg-red-50 text-red-900 line-through";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition ${btnStyle}`}
                            >
                              <span>
                                <strong className="mr-1.5">
                                  {String.fromCharCode(65 + optIdx)}.
                                </strong>
                                {opt}
                              </span>
                              {quizSubmitted && isRight && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#14532D]" />
                              )}
                              {quizSubmitted && isSelected && !isRight && (
                                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="mt-3 p-3 rounded-lg border border-[#E5E7EB] bg-gray-50 text-xs leading-[1.6] text-gray-700">
                          <strong>Pembahasan:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted && (
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length < quizzes.length}
                  className="w-full rounded-lg bg-[#F59E0B] hover:bg-[#D97706] py-3 text-sm font-bold text-gray-950 transition disabled:opacity-50"
                >
                  {Object.keys(quizAnswers).length < quizzes.length
                    ? `Jawab Semua Soal Terlebih Dahulu (${Object.keys(quizAnswers).length}/${quizzes.length})`
                    : "Kumpulkan Jawaban & Lihat Pembahasan"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: FLASHCARD AUDIO */}
      {activeTab === "flashcard" && (
        <div className="mt-6">
          {!currentCard ? (
            <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
              Belum ada flashcard pada modul ini.
            </p>
          ) : (
            <div className="mx-auto max-w-lg">
              <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Kartu {fcIndex + 1} dari {flashcards.length}
                </span>
                <span>
                  Sudah Dihafal: {masteredIds.length}/{flashcards.length}
                </span>
              </div>

              {/* 3D Flip Card: Clean Border #E5E7EB, Flat */}
              <div
                onClick={() => setFcFlipped(!fcFlipped)}
                className="perspective-1000 cursor-pointer"
              >
                <div
                  className={`transform-style-3d relative min-h-[260px] w-full rounded-xl transition-transform duration-500 ${
                    fcFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* Depan (English) */}
                  <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white p-6 text-center shadow-none">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      Klik kartu untuk melihat arti
                    </span>
                    <h4 className="mt-4 text-3xl font-extrabold text-gray-900">
                      {currentCard.english}
                    </h4>
                    {currentCard.phonetic && (
                      <p className="mt-1 text-sm text-gray-500">
                        {currentCard.phonetic}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(currentCard.english);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#14532D] hover:bg-[#0F3F22] px-3.5 py-1.5 text-xs font-semibold text-white transition"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Dengarkan Audio
                    </button>
                  </div>

                  {/* Belakang (Arti) */}
                  <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-gray-50 p-6 text-center shadow-none">
                    <span className="text-xs font-semibold text-gray-500">
                      Arti Bahasa Indonesia
                    </span>
                    <h4 className="mt-3 text-2xl font-bold text-gray-900">
                      {currentCard.indonesian}
                    </h4>
                    {currentCard.exampleEn && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs">
                        <p className="font-semibold text-gray-900">
                          &ldquo;{currentCard.exampleEn}&rdquo;
                        </p>
                        <p className="mt-0.5 text-gray-500 italic">
                          {currentCard.exampleId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFcFlipped(false);
                    setFcIndex((i) => (i > 0 ? i - 1 : flashcards.length - 1));
                  }}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Sebelumnya
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMasteredIds((prev) =>
                      prev.includes(currentCard.id)
                        ? prev.filter((id) => id !== currentCard.id)
                        : [...prev, currentCard.id]
                    );
                  }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    masteredIds.includes(currentCard.id)
                      ? "bg-[#14532D] text-white"
                      : "border border-[#14532D] text-[#14532D] hover:bg-gray-50"
                  }`}
                >
                  {masteredIds.includes(currentCard.id)
                    ? "✓ Sudah Dihafal"
                    : "Tandai Sudah Hafal"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFcFlipped(false);
                    setFcIndex((i) => (i + 1) % flashcards.length);
                  }}
                  className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COCOKKAN KATA */}
      {activeTab === "matching" && (
        <div className="mt-6">
          {matchingPairs.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
              Belum ada soal mencocokkan kata pada modul ini.
            </p>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
                <span>Pilih kata di kolom kiri, lalu pilih pasangan artinya di kanan.</span>
                <button
                  type="button"
                  onClick={resetMatching}
                  className="inline-flex items-center gap-1 rounded border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Acak Ulang
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Bahasa Inggris</p>
                  {shuffledEn.map((item) => {
                    const done = matchedIds.includes(item.id);
                    const picked = selectedEn === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={done}
                        onClick={() => handleMatchPick("en", item.id)}
                        className={`w-full rounded-lg border p-3 text-left text-xs sm:text-sm font-semibold transition ${
                          done
                            ? "border-[#E5E7EB] bg-gray-100 text-gray-400"
                            : picked
                            ? wrongFlash
                              ? "border-red-500 bg-red-50 text-red-900"
                              : "border-[#14532D] bg-[#14532D] text-white"
                            : "border-[#E5E7EB] bg-white text-gray-800 hover:border-gray-400"
                        }`}
                      >
                        {done ? `✓ ${item.english}` : item.english}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Arti Bahasa Indonesia</p>
                  {shuffledId.map((item) => {
                    const done = matchedIds.includes(item.id);
                    const picked = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={done}
                        onClick={() => handleMatchPick("id", item.id)}
                        className={`w-full rounded-lg border p-3 text-left text-xs sm:text-sm font-semibold transition ${
                          done
                            ? "border-[#E5E7EB] bg-gray-100 text-gray-400"
                            : picked
                            ? wrongFlash
                              ? "border-red-500 bg-red-50 text-red-900"
                              : "border-[#14532D] bg-[#14532D] text-white"
                            : "border-[#E5E7EB] bg-white text-gray-800 hover:border-gray-400"
                        }`}
                      >
                        {done ? `✓ ${item.indonesian}` : item.indonesian}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SUSUN KATA & RUMPANG */}
      {activeTab === "scramble" && (
        <div className="mt-6">
          {!activeChallenge ? (
            <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
              Belum ada soal susun kata pada modul ini.
            </p>
          ) : (
            <div className="mx-auto max-w-lg rounded-xl border border-[#E5E7EB] bg-gray-50 p-6">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold text-gray-800">
                  {activeChallenge.challengeType === "scramble"
                    ? "Susun Huruf Acak"
                    : "Kalimat Rumpang"}
                </span>
                <span>
                  Soal {wcIndex + 1} dari {wordChallenges.length}
                </span>
              </div>

              <p className="mt-3 text-sm font-bold text-gray-900">
                {activeChallenge.clueId}
              </p>

              {activeChallenge.sentenceBlank && (
                <div className="mt-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-semibold text-gray-900">
                  {activeChallenge.sentenceBlank}
                </div>
              )}

              {activeChallenge.challengeType === "scramble" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {scrambledLetters.map((item) => (
                    <button
                      key={item.idx}
                      type="button"
                      onClick={() => setWcInput((prev) => prev + item.ch)}
                      className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-sm font-bold text-gray-900 hover:bg-gray-100"
                    >
                      {item.ch}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={wcInput}
                  onChange={(e) => setWcInput(e.target.value.toUpperCase())}
                  placeholder="Ketik jawaban..."
                  className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold uppercase text-gray-900 focus:border-[#14532D] focus:outline-none"
                />
                {wcInput && (
                  <button
                    type="button"
                    onClick={() => setWcInput("")}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={checkWordAnswer}
                  className="rounded-lg bg-[#14532D] hover:bg-[#0F3F22] px-4 py-2 text-xs font-bold text-white transition"
                >
                  Periksa
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setWcShowHint(!wcShowHint)}
                  className="text-gray-500 hover:underline"
                >
                  {wcShowHint ? `Petunjuk: ${activeChallenge.hint}` : "Bantuan (Hint)?"}
                </button>

                {wcResults[activeChallenge.id] !== undefined && (
                  <span
                    className={`font-semibold ${
                      wcResults[activeChallenge.id]
                        ? "text-[#14532D]"
                        : "text-red-700"
                    }`}
                  >
                    {wcResults[activeChallenge.id]
                      ? `✓ Benar: ${activeChallenge.answer}`
                      : "Belum tepat, coba lagi!"}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <button
                  type="button"
                  disabled={wcIndex === 0}
                  onClick={() => {
                    setWcIndex((i) => Math.max(0, i - 1));
                    setWcInput("");
                    setWcShowHint(false);
                  }}
                  className="rounded border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-gray-700 disabled:opacity-40"
                >
                  ← Soal Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={wcIndex >= wordChallenges.length - 1}
                  onClick={() => {
                    setWcIndex((i) => Math.min(wordChallenges.length - 1, i + 1));
                    setWcInput("");
                    setWcShowHint(false);
                  }}
                  className="rounded bg-gray-900 px-2.5 py-1 text-xs text-white disabled:opacity-40"
                >
                  Soal Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
