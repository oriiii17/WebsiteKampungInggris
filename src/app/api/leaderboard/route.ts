import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasActiveMaterialAccess } from "@/lib/auth";
import {
  getModuleBySlugOrId,
  getWeeklyLeaderboard,
  recordLeaderboardScore,
} from "@/lib/db";

export async function GET() {
  const data = await getWeeklyLeaderboard();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !hasActiveMaterialAccess(session)) {
    return NextResponse.json({ error: "Silakan login untuk menyimpan skor." }, { status: 401 });
  }

  const body = await req.json();
  const moduleId = String(body.moduleId || "");
  const score = Math.max(0, Math.min(100, Math.round(Number(body.score || 0))));
  const gameType = body.gameType as
    | "Quiz Pilihan Ganda"
    | "Matching Kata"
    | "Susun Kata & Rumpang";

  const mod = await getModuleBySlugOrId(moduleId);
  const originBadge =
    session.origin === "warga_kode"
      ? `Warga Sapen${session.rtRw ? ` • ${session.rtRw.split("/")[0].trim()}` : ""}`
      : session.origin === "admin"
      ? "Pengurus Sapen"
      : "Peserta Umum";

  const saved = await recordLeaderboardScore({
    participantKey: session.id,
    participantName: session.name,
    originBadge,
    moduleId,
    moduleTitle: mod?.title || "Modul Bahasa Inggris",
    gameType: gameType || "Quiz Pilihan Ganda",
    score,
  });

  const updated = await getWeeklyLeaderboard();
  return NextResponse.json({ ok: true, saved, leaderboard: updated });
}
