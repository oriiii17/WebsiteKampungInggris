import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getGames, upsertGame, deleteGame, duplicateGame } from "@/lib/db";
import { emptyQuestion } from "@/lib/builtin-games";
import type { GameKind, GameRecord } from "@/lib/types";

const KINDS: GameKind[] = ["kuis_live","tebak_kata","pasangkan_kata","susun_kalimat","tebak_gambar","kata_hilang","duel_kata_cepat"];
const TITLE: Record<GameKind,string> = {
  kuis_live:"Kuis Live",
  tebak_kata:"Tebak Kata",
  pasangkan_kata:"Pasangkan Kata",
  susun_kalimat:"Susun Kalimat",
  tebak_gambar:"Tebak Gambar",
  kata_hilang:"Kata Hilang",
  duel_kata_cepat:"Duel Kata Cepat",
};

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

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const games = await getGames();
  return NextResponse.json({ ok: true, games });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  try {
    const body = await req.json().catch(()=>({}));
    const action = String(body.action || "create");
    if (action === "duplicate") {
      const g = await duplicateGame(String(body.id||""));
      if (!g) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ ok: true, game: g });
    }
    if (action === "upsert") {
      const game = body.game as any;
      if (!game || !game.id) return NextResponse.json({ error: "Data game tidak lengkap." }, { status: 400 });
      const kind = (KINDS.includes(game.kind) ? game.kind : "kuis_live") as GameKind;
      const now = new Date().toISOString();
      const questions = Array.isArray(game.questions) && game.questions.length > 0
        ? game.questions.map((q:any,i:number)=>sanitizeQuestion(q,kind,i))
        : [emptyQuestion(kind, `q-${Date.now()}`)];
      const rec: GameRecord = { id: String(game.id), title: String(game.title || TITLE[kind]), kind, questions, createdAt: String(game.createdAt || now), updatedAt: now, migratedFromTemplateId: game.migratedFromTemplateId };
      const saved = await upsertGame(rec);
      return NextResponse.json({ ok: true, game: saved });
    }
    // create new
    const kind = (KINDS.includes(body.kind) ? body.kind : "kuis_live") as GameKind;
    const now = new Date().toISOString();
    const rec: GameRecord = { id: `game-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, title: String(body.title || `Game ${TITLE[kind]} Baru`), kind, questions: [emptyQuestion(kind, `q-${Date.now()}`)], createdAt: now, updatedAt: now };
    const saved = await upsertGame(rec);
    return NextResponse.json({ ok: true, game: saved });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memproses game." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID game diperlukan." }, { status: 400 });
  const ok = await deleteGame(id);
  return NextResponse.json({ ok });
}
