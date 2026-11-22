/**
 * game-session.ts — Live Game Engine (generic, 7 jenis, DB-backed)
 * Menyimpan sesi di globalThis agar aman HMR/dev route bundles.
 */
import { EventEmitter } from "events";
import crypto from "crypto";
import type { GameRecord, GameQuestion, GameKind } from "./types";

export interface LiveQuestion {
  id: string;
  type: GameKind;
  prompt: string;
  context?: string;
  timeLimitSec: number;
  points: "standard" | "double" | "none";
  choiceMode: "single" | "multiple";
  explanation?: string;
  // kuis_live / tebak_gambar (opsi)
  options?: string[];
  correctIndexes?: number[];
  // text answer types (tebak_kata, kata_hilang, duel_kata_cepat, tebak_gambar text)
  answer?: string;
  acceptAlternatives?: string[];
  hint?: string;
  sentence?: string; // kata_hilang
  // pasangkan_kata
  pairs?: { left: string; right: string }[];
  // susun_kalimat
  words?: string[];      // urutan benar
  correctSentence?: string;
}

export interface PlayerLastAnswer {
  questionIndex: number;
  optionIndex?: number | null;     // legacy single
  optionIndexes?: number[];        // multi
  textAnswer?: string;
  pairs?: { left: string; right: string }[];
  words?: string[];
  isCorrect: boolean;
  pointsEarned: number;
  timeMs: number;
}

export interface PlayerSession {
  id: string;
  name: string;
  score: number;
  streak: number;
  avatarId: "leaf" | "book" | "sun" | "bird";
  team: "forest" | "saffron";
  lastAnswer?: PlayerLastAnswer;
  connectedAt: number;
}

export interface LiveGameSession {
  pin: string;
  gameId: string;
  gameKind: GameKind;
  templateId: string; // alias gameId for compat
  templateTitle: string;
  hostId: string;
  hostName: string;
  status: "lobby" | "question" | "reveal" | "podium" | "closed";
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number;
  players: Record<string, PlayerSession>;
  questions: LiveQuestion[];
  createdAt: number;
  lastActive: number;
}

class GameEventEmitter extends EventEmitter {}
const g = globalThis as unknown as {
  __sapenGameSessions?: Map<string, LiveGameSession>;
  __sapenGameEvents?: GameEventEmitter;
  __sapenPinGuess?: Map<string, { count: number; resetAt: number }>;
};
const gameEvents: GameEventEmitter = g.__sapenGameEvents ?? (g.__sapenGameEvents = new GameEventEmitter());
gameEvents.setMaxListeners(400);
const sessionsMap: Map<string, LiveGameSession> = g.__sapenGameSessions ?? (g.__sapenGameSessions = new Map<string, LiveGameSession>());
const pinGuessFailMap: Map<string, { count: number; resetAt: number }> = g.__sapenPinGuess ?? (g.__sapenPinGuess = new Map());

export function checkPinRateLimit(ip: string): boolean {
  const now = Date.now();
  if (pinGuessFailMap.size > 5000) {
    for (const [key, bucket] of pinGuessFailMap) if (bucket.resetAt <= now) pinGuessFailMap.delete(key);
  }
  const entry = pinGuessFailMap.get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < 10;
}
export function recordPinFailure(ip: string) {
  const now = Date.now();
  if (pinGuessFailMap.size >= 5000 && !pinGuessFailMap.has(ip)) {
    const oldestKey = pinGuessFailMap.keys().next().value as string | undefined;
    if (oldestKey) pinGuessFailMap.delete(oldestKey);
  }
  const entry = pinGuessFailMap.get(ip) || { count: 0, resetAt: now + 5 * 60 * 1000 };
  entry.count++; pinGuessFailMap.set(ip, entry);
}

function norm(s: string) { return (s||"").toString().trim().toLowerCase().replace(/\s+/g," "); }
function normLoose(s: string) { return norm(s).replace(/[\p{P}\p{S}]/gu,"").replace(/\s+/g,""); }

export function toLiveQuestions(game: GameRecord): LiveQuestion[] {
  return (game.questions || []).map((q: GameQuestion) => {
    const base = { id: q.id, type: q.type, prompt: q.prompt, timeLimitSec: q.timeLimitSec || 20, points: q.points || "standard", choiceMode: q.choiceMode || "single", explanation: q.explanation };
    if (q.type === "kuis_live") return { ...base, options: q.options || [], correctIndexes: q.correctIndexes || [0] };
    if (q.type === "tebak_kata") return { ...base, answer: q.answer, acceptAlternatives: q.acceptAlternatives||[], hint: q.hint };
    if (q.type === "pasangkan_kata") return { ...base, pairs: q.pairs || [] };
    if (q.type === "susun_kalimat") {
      const correctWords = (q.sentence ? q.sentence.split(/\s+/).filter(Boolean) : (q.words || []));
      return { ...base, words: correctWords, correctSentence: q.sentence || correctWords.join(" ") };
    }
    if (q.type === "tebak_gambar") return { ...base, answer: q.answer, acceptAlternatives: q.acceptAlternatives||[], options: q.options||[], hint: (q as any).hint };
    if (q.type === "kata_hilang") return { ...base, sentence: q.sentence, answer: q.answer, acceptAlternatives: q.acceptAlternatives||[], options: q.options||[] };
    if (q.type === "duel_kata_cepat") return { ...base, answer: q.answer, acceptAlternatives: q.acceptAlternatives||[], hint: q.hint };
    return base as LiveQuestion;
  });
}

function generateUniquePin(): string {
  let pin = "";
  do { pin = String(crypto.randomInt(0, 1000000)).padStart(6, "0"); } while (sessionsMap.has(pin));
  return pin;
}

// Legacy hardcoded templates kept for backward compat (old templateId callers). Prefer createLiveGameSessionFromGame.
export const GAME_TEMPLATES: Record<string, { title: string; questions: any[] }> = {};

export function createLiveGameSessionFromGame(game: GameRecord, hostId: string, hostName: string): LiveGameSession {
  const questions = toLiveQuestions(game);
  const pin = generateUniquePin();
  const session: LiveGameSession = {
    pin,
    gameId: game.id,
    gameKind: game.kind,
    templateId: game.id,
    templateTitle: game.title,
    hostId,
    hostName,
    status: "lobby",
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    questionStartedAt: 0,
    players: {},
    questions,
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  sessionsMap.set(pin, session);
  return session;
}

// Back-compat (will be unused once callers updated) — create from legacy template id string by faking a minimal kuis_live record
export function createLiveGameSession(templateId: string, hostId: string, hostName: string): LiveGameSession {
  // minimal fallback so old callers don't crash; real flow should pass DB game
  const fake: GameRecord = { id: templateId, title: templateId, kind: "kuis_live", questions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  return createLiveGameSessionFromGame(fake, hostId, hostName);
}

export function getLiveSession(pin: string): LiveGameSession | null {
  const s = sessionsMap.get(pin);
  if (!s) return null;
  if (Date.now() - s.lastActive > 3 * 60 * 60 * 1000) { sessionsMap.delete(pin); return null; }
  return s;
}

export function joinPlayerToSession(pin: string, playerName: string, playerId: string, avatarId: PlayerSession["avatarId"] = "leaf", forcedTeam?: PlayerSession["team"]): { ok: boolean; error?: string; session?: LiveGameSession } {
  const session = getLiveSession(pin);
  if (!session) return { ok: false, error: "PIN sesi tidak ditemukan atau sudah selesai." };
  if (session.status === "closed") return { ok: false, error: "Sesi kuis sudah ditutup oleh host." };
  if (Object.keys(session.players).length >= 50 && !session.players[playerId]) return { ok: false, error: "Kapasitas sesi penuh (maksimal 50 peserta)." };
  const nameLower = playerName.trim().toLowerCase();
  for (const [pId, p] of Object.entries(session.players)) {
    if (pId !== playerId && p.name.toLowerCase() === nameLower) return { ok: false, error: `Nama "${playerName}" sudah digunakan peserta lain dalam sesi ini.` };
  }
  if (!session.players[playerId]) {
    const forestCount = Object.values(session.players).filter((player) => player.team === "forest").length;
    const saffronCount = Object.values(session.players).filter((player) => player.team === "saffron").length;
    session.players[playerId] = { id: playerId, name: playerName.trim(), score: 0, streak: 0, avatarId, team: forcedTeam || (forestCount <= saffronCount ? "forest" : "saffron"), connectedAt: Date.now() };
  } else { session.players[playerId].name = playerName.trim(); session.players[playerId].avatarId = avatarId; if (forcedTeam) session.players[playerId].team = forcedTeam; }
  session.lastActive = Date.now();
  emitSessionUpdate(pin, session);
  return { ok: true, session };
}

export function emitSessionUpdate(pin: string, session: LiveGameSession) { gameEvents.emit(`update:${pin}`, sanitizeSessionForClient(session)); }
export function subscribeToSession(pin: string, listener: (data: any) => void) { const eventName = `update:${pin}`; gameEvents.on(eventName, listener); return () => { gameEvents.off(eventName, listener); }; }

export function sanitizeSessionForClient(session: LiveGameSession) {
  const currentQ = session.questions[session.currentQuestionIndex];
  const idx = session.currentQuestionIndex;
  const distribution = [0, 0, 0, 0];
  const answersDetail: any[] = [];
  Object.values(session.players).forEach((p) => {
    const ans = p.lastAnswer && p.lastAnswer.questionIndex === idx ? p.lastAnswer : null;
    if (ans && typeof ans.optionIndex === "number" && ans.optionIndex >= 0 && ans.optionIndex <= 3) distribution[ans.optionIndex]++;
    answersDetail.push({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId, team: p.team, optionIndex: ans ? (ans.optionIndex ?? null) : null, optionIndexes: ans?.optionIndexes || [], textAnswer: ans?.textAnswer, isCorrect: ans ? ans.isCorrect : null, pointsEarned: ans ? ans.pointsEarned : 0 });
  });
  answersDetail.sort((a, b) => b.score - a.score);
  const reveal = session.status === "reveal" || session.status === "podium";
  let clientQuestion: any = null;
  if (currentQ) {
    clientQuestion = {
      id: currentQ.id, type: currentQ.type, question: currentQ.prompt, prompt: currentQ.prompt, context: currentQ.context,
      options: currentQ.options || [], choiceMode: currentQ.choiceMode,
      hint: currentQ.hint, sentence: currentQ.sentence, pairs: currentQ.pairs, words: currentQ.words,
      timeLimitSec: currentQ.timeLimitSec, points: currentQ.points,
      correctIndex: reveal && currentQ.correctIndexes ? (currentQ.correctIndexes[0] ?? null) : null,
      correctIndexes: reveal ? (currentQ.correctIndexes || []) : [],
      correctAnswer: reveal ? (currentQ.answer || currentQ.correctSentence || null) : null,
      correctPairs: reveal ? (currentQ.pairs || null) : null,
      correctWords: reveal ? (currentQ.words || null) : null,
      explanation: reveal ? (currentQ.explanation || null) : null,
    };
  }
  return {
    pin: session.pin, gameId: session.gameId, gameKind: session.gameKind, templateTitle: session.templateTitle, hostName: session.hostName,
    status: session.status, currentQuestionIndex: session.currentQuestionIndex, totalQuestions: session.totalQuestions,
    questionStartedAt: session.questionStartedAt, timeLimitSec: currentQ?.timeLimitSec || 20,
    currentQuestion: clientQuestion,
    playersList: Object.values(session.players).map((p) => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId, team: p.team, hasAnswered: Boolean(p.lastAnswer && p.lastAnswer.questionIndex === session.currentQuestionIndex) })).sort((a, b) => b.score - a.score),
    teamScores: (["forest", "saffron"] as const).map((team) => ({ team, score: Object.values(session.players).filter((player) => player.team === team).reduce((sum, player) => sum + player.score, 0), players: Object.values(session.players).filter((player) => player.team === team).length })),
    answersDetail, answerDistribution: distribution,
  };
}

export function startSessionGame(pin: string, hostId: string): boolean {
  const session = getLiveSession(pin); if (!session || session.hostId !== hostId) return false;
  session.status = "question"; session.currentQuestionIndex = 0; session.questionStartedAt = Date.now(); session.lastActive = Date.now();
  emitSessionUpdate(pin, session); return true;
}
export function revealQuestionAnswer(pin: string, hostId: string): boolean {
  const session = getLiveSession(pin); if (!session || session.hostId !== hostId) return false;
  session.status = "reveal"; session.lastActive = Date.now(); emitSessionUpdate(pin, session); return true;
}
export function nextSessionQuestion(pin: string, hostId: string): boolean {
  const session = getLiveSession(pin); if (!session || session.hostId !== hostId) return false;
  if (session.currentQuestionIndex + 1 >= session.totalQuestions) session.status = "podium";
  else { session.currentQuestionIndex++; session.status = "question"; session.questionStartedAt = Date.now(); }
  session.lastActive = Date.now(); emitSessionUpdate(pin, session); return true;
}
export function kickPlayerFromSession(pin: string, hostId: string, targetPlayerId: string): boolean {
  const session = getLiveSession(pin); if (!session || session.hostId !== hostId) return false;
  delete session.players[targetPlayerId]; session.lastActive = Date.now(); emitSessionUpdate(pin, session); return true;
}
export function closeSessionGame(pin: string, hostId: string): boolean {
  const session = getLiveSession(pin); if (!session || session.hostId !== hostId) return false;
  session.status = "closed"; emitSessionUpdate(pin, session); sessionsMap.delete(pin); return true;
}

function computePoints(isCorrect: boolean, q: LiveQuestion, elapsedSec: number): number {
  if (!isCorrect) return 0;
  if (q.points === "none") return 0;
  const mult = q.points === "double" ? 2 : 1;
  const timeFactor = Math.max(0, 1 - elapsedSec / Math.max(1, q.timeLimitSec));
  return Math.round((500 + 500 * timeFactor) * mult);
}

function isTextCorrect(answer: string, correct: string, alts: string[] = []): boolean {
  const a = norm(answer); const c = norm(correct);
  if (a && c && (a === c || normLoose(answer) === normLoose(correct))) return true;
  return (alts || []).some((x) => norm(x) === a || normLoose(x) === normLoose(answer));
}

export function submitPlayerAnswer(
  pin: string,
  playerId: string,
  questionIndex: number,
  payload: { optionIndex?: number; optionIndexes?: number[]; textAnswer?: string; pairs?: {left:string;right:string}[]; words?: string[]; timeTakenMs?: number }
): { ok: boolean; isCorrect?: boolean; points?: number; error?: string } {
  const session = getLiveSession(pin);
  if (!session) return { ok: false, error: "Sesi tidak ditemukan." };
  if (session.status !== "question") return { ok: false, error: "Waktu menjawab untuk soal ini sudah selesai." };
  if (session.currentQuestionIndex !== questionIndex) return { ok: false, error: "Soal sudah berganti." };
  const player = session.players[playerId];
  if (!player) return { ok: false, error: "Peserta tidak terdaftar dalam sesi ini." };
  if (player.lastAnswer && player.lastAnswer.questionIndex === questionIndex) return { ok: false, error: "Anda sudah mengirim jawaban untuk soal ini." };
  const q = session.questions[questionIndex];
  if (!q) return { ok: false, error: "Soal tidak valid." };
  const elapsedSec = (Date.now() - session.questionStartedAt) / 1000;
  if (elapsedSec > (q.timeLimitSec || 20) + 2) return { ok: false, error: "Waktu habis!" };

  let isCorrect = false;
  if (q.type === "kuis_live" || (q.type === "tebak_gambar" && q.options && q.options.length > 0)) {
    const correct = (q.correctIndexes && q.correctIndexes.length ? q.correctIndexes : [0]).slice().sort();
    let chosen: number[] = [];
    if (q.choiceMode === "multiple" && Array.isArray(payload.optionIndexes)) chosen = payload.optionIndexes.slice().sort();
    else if (typeof payload.optionIndex === "number") chosen = [payload.optionIndex];
    isCorrect = chosen.length === correct.length && chosen.every((v, i) => v === correct[i]);
    player.lastAnswer = { questionIndex, optionIndex: chosen[0] ?? null, optionIndexes: chosen, isCorrect, pointsEarned: 0, timeMs: payload.timeTakenMs || 0 };
  } else if (q.type === "pasangkan_kata") {
    const submitted = payload.pairs || [];
    const correctPairs = q.pairs || [];
    const normPair = (p: {left:string;right:string}) => `${norm(p.left)}=>${norm(p.right)}`;
    const cset = correctPairs.map(normPair).sort();
    const sset = submitted.map(normPair).sort();
    isCorrect = cset.length > 0 && cset.length === sset.length && cset.every((v,i)=>v===sset[i]);
    player.lastAnswer = { questionIndex, pairs: submitted, isCorrect, pointsEarned: 0, timeMs: payload.timeTakenMs || 0 };
  } else if (q.type === "susun_kalimat") {
    const submittedWords = payload.words || (payload.textAnswer ? payload.textAnswer.split(/\s+/) : []);
    const correctWords = (q.correctSentence ? q.correctSentence.split(/\s+/).filter(Boolean) : (q.words || []));
    const s = submittedWords.map(norm).join(" ").trim();
    const c = correctWords.map(norm).join(" ").trim();
    isCorrect = s.length > 0 && c.length > 0 && (s === c || normLoose(submittedWords.join(" ")) === normLoose(correctWords.join(" ")));
    player.lastAnswer = { questionIndex, words: submittedWords, textAnswer: submittedWords.join(" "), isCorrect, pointsEarned: 0, timeMs: payload.timeTakenMs || 0 };
  } else {
    // tebak_kata, kata_hilang, duel_kata_cepat, tebak_gambar(text)
    const ans = payload.textAnswer || "";
    isCorrect = isTextCorrect(ans, q.answer || "", q.acceptAlternatives || []);
    player.lastAnswer = { questionIndex, textAnswer: ans, isCorrect, pointsEarned: 0, timeMs: payload.timeTakenMs || 0 };
  }

  const points = computePoints(isCorrect, q, elapsedSec);
  player.score += points;
  player.streak = isCorrect ? player.streak + 1 : 0;
  if (player.lastAnswer) player.lastAnswer.pointsEarned = points;
  session.lastActive = Date.now();
  emitSessionUpdate(pin, session);
  return { ok: true, isCorrect, points };
}
