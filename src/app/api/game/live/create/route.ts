import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { createLiveGameSessionFromGame } from "@/lib/game-session";
import { getGameById, getGames } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

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
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from("game_sessions").insert({
        game_id: game.id,
        pin: gameSession.pin,
        host_user_id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(hostId) ? hostId : null,
        host_name: hostName,
        status: "lobby",
        current_question_index: 0,
        total_questions: gameSession.totalQuestions,
        game_snapshot: { title: game.title, kind: game.kind, questions: gameSession.questions },
      });
      if (error) {
        console.error("[game/live/create] Supabase", { code: error.code, message: error.message, details: error.details, hint: error.hint });
        return NextResponse.json({ ok: false, error: error.code === "PGRST205" || error.code === "42P01" ? "Terapkan migrasi supabase/migrations/20261117130000_live_game_sessions.sql untuk mengaktifkan sesi game." : `Gagal menyimpan sesi (${error.code || "Supabase"}): ${error.message}` }, { status: 503 });
      }
    }
    return NextResponse.json({ ok: true, pin: gameSession.pin, hostId: gameSession.hostId, templateTitle: gameSession.templateTitle, gameId: game.id, gameKind: game.kind });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Gagal membuat sesi kuis." }, { status: 500 });
  }
}
