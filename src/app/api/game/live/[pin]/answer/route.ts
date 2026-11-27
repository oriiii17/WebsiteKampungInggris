import { NextResponse } from "next/server";
import { getLiveSession, submitPlayerAnswer } from "@/lib/game-session";
import { loadLiveGame, persistLiveGame } from "@/lib/live-game-store";

export async function POST(req: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  const body = await req.json().catch(() => ({}));
  const { playerId, questionIndex, optionIndex, optionIndexes, textAnswer, pairs, words, timeTakenMs } = body;
  if (!playerId || typeof questionIndex !== "number") {
    return NextResponse.json({ ok: false, error: "Parameter jawaban tidak lengkap." }, { status: 400 });
  }
  await loadLiveGame(pin);
  const result = submitPlayerAnswer(pin, playerId, questionIndex, {
    optionIndex: typeof optionIndex === "number" ? optionIndex : undefined,
    optionIndexes: Array.isArray(optionIndexes) ? optionIndexes : undefined,
    textAnswer: typeof textAnswer === "string" ? textAnswer : undefined,
    pairs: Array.isArray(pairs) ? pairs : undefined,
    words: Array.isArray(words) ? words : undefined,
    timeTakenMs: typeof timeTakenMs === "number" ? timeTakenMs : 0,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error || "Gagal mengirim jawaban." }, { status: 400 });
  const session = getLiveSession(pin);
  if (session) await persistLiveGame(session);
  return NextResponse.json({ ok: true, isCorrect: result.isCorrect, points: result.points });
}
