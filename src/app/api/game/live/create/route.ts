import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { createLiveGameSessionFromGame } from "@/lib/game-session";
import { getGameById, getGames } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!isAdminSession(session)) {
      return NextResponse.json({ ok: false, error: "Hanya pengajar/admin yang berwenang membuka sesi kuis live." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const gameId = String(body.gameId || body.templateId || "");
    let game = gameId ? await getGameById(gameId) : null;
    if (!game) {
      const games = await getGames();
      // compat: try migrate-old template ids
      game = games.find((g) => g.migratedFromTemplateId === gameId) || games[0] || null;
    }
    if (!game) return NextResponse.json({ ok: false, error: "Game tidak ditemukan. Buat game di Kelola Game." }, { status: 400 });
    if (!game.questions || game.questions.length === 0) return NextResponse.json({ ok: false, error: "Game belum memiliki soal." }, { status: 400 });

    const hostId = session?.id || `host-${Date.now()}`;
    const hostName = session?.name || "Host Sapen English";
    const gameSession = createLiveGameSessionFromGame(game, hostId, hostName);
    return NextResponse.json({ ok: true, pin: gameSession.pin, hostId: gameSession.hostId, templateTitle: gameSession.templateTitle, gameId: game.id, gameKind: game.kind });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Gagal membuat sesi kuis." }, { status: 500 });
  }
}
