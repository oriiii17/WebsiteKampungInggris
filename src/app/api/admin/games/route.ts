import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getGameCatalog, getGameById, upsertGame } from "@/lib/db";
import { emptyQuestion } from "@/lib/builtin-games";
import type { GameKind, GameRecord } from "@/lib/types";

const KINDS: GameKind[] = ["kuis_live","tebak_kata","pasangkan_kata","susun_kalimat","tebak_gambar","kata_hilang","duel_kata_cepat"];
function clampPrompt(s: string) { return (s || "").slice(0,120); }
function sanitizeQuestion(q: any, kind: GameKind, idx: number): any {
  const id = String(q?.id || `q-${Date.now()}-${idx}`);
  const base = { id, prompt: clampPrompt(String(q?.prompt||""),), mediaUrl: q?.mediaUrl?String(q.mediaUrl):undefined, timeLimitSec: [5,10,20,30,60].includes(Number(q?.timeLimitSec))?Number(q.timeLimitSec):20, points: (q?.points==="double"?"double":q?.points==="none"?"none":"standard"), choiceMode: (q?.choiceMode==="multiple"?"multiple":"single"), explanation: q?.explanation?String(q.explanation):undefined };
  const type = KINDS.includes(q?.type)?q.type:kind;
  if (type === "kuis_live") return { ...base, type, options: Array.isArray(q?.options)?q.options.slice(0,4).map((x:any)=>String(x||"")):["","","",""], correctIndexes: Array.isArray(q?.correctIndexes)?q.correctIndexes.map((n:any)=>Number(n)).filter((n:number)=>n>=0&&n<4):[0] };
  if (type === "tebak_kata") return { ...base, type, answer: String(q?.answer||""), hint: String(q?.hint||""), acceptAlternatives: Array.isArray(q?.acceptAlternatives)?q.acceptAlternatives.map((x:any)=>String(x)) : [] };
  if (type === "pasangkan_kata") return { ...base, type, pairs: Array.isArray(q?.pairs)?q.pairs.map((p:any)=>({left:String(p?.left||""),right:String(p?.right||"")})) : [{left:"",right:""}] };
  if (type === "susun_kalimat") return { ...base, type, words: Array.isArray(q?.words)?q.words.map((w:any)=>String(w)):(String(q?.sentence||"").split(/\s+/).filter(Boolean)), sentence: String(q?.sentence|| (Array.isArray(q?.words)?q.words.join(" "):"")) };
  if (type === "tebak_gambar") return { ...base, type, answer: String(q?.answer||""), options: Array.isArray(q?.options)?q.options.slice(0,4).map((x:any)=>String(x||"")):[], acceptAlternatives: Array.isArray(q?.acceptAlternatives)?q.acceptAlternatives.map((x:any)=>String(x)) : [] };
  if (type === "kata_hilang") return { ...base, type, sentence: String(q?.sentence||""), answer: String(q?.answer||""), options: Array.isArray(q?.options)?q.options.slice(0,4).map((x:any)=>String(x||"")):[], acceptAlternatives: Array.isArray(q?.acceptAlternatives)?q.acceptAlternatives.map((x:any)=>String(x)) : [] };
  if (type === "duel_kata_cepat") return { ...base, type, answer: String(q?.answer||""), hint: String(q?.hint||""), acceptAlternatives: Array.isArray(q?.acceptAlternatives)?q.acceptAlternatives.map((x:any)=>String(x)) : [] };
  return emptyQuestion(kind, id);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const gameId = req.nextUrl.searchParams.get("gameId");
  if (gameId) {
    const game = await getGameById(gameId);
    if (!game) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, game });
  }
  const games = await getGameCatalog();
  return NextResponse.json({ ok: true, games });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  try {
    const body = await req.json().catch(()=>({}));
    const game = body.game as any;
    if (!game || !game.id) return NextResponse.json({ error: "Data game tidak lengkap." }, { status: 400 });
    const existing = await getGameById(String(game.id));
    if (!existing) return NextResponse.json({ error: "Master game tidak ditemukan." }, { status: 404 });
    const kind = existing.kind;
    const now = new Date().toISOString();
    const questions = Array.isArray(game.questions)
      ? game.questions.map((q:any,i:number)=>sanitizeQuestion(q,kind,i))
      : existing.questions;
    const questionIds = questions.map((question: any) => question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      return NextResponse.json({ error: "ID soal duplikat. Muat ulang game sebelum menyimpan." }, { status: 400 });
    }
    const rec: GameRecord = { ...existing, questions, updatedAt: now };
    const saved = await upsertGame(rec);
    return NextResponse.json({ ok: true, game: saved });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memproses game." }, { status: 500 });
  }
}
