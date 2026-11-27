import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getLiveSession } from "@/lib/game-session";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { loadLiveGame, persistLiveGame } from "@/lib/live-game-store";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import {
  closeSessionGame,
  kickPlayerFromSession,
  nextSessionQuestion,
  revealQuestionAnswer,
  startSessionGame,
} from "@/lib/game-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, error: "Akses khusus Admin." }, { status: 403 });
  }
  const { pin } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, hostId, targetPlayerId } = body;

  await loadLiveGame(pin);
  const liveSession = getLiveSession(pin);
  if (!hostId || !liveSession || session?.id !== hostId || liveSession.hostId !== session?.id) {
    return NextResponse.json(
      { ok: false, error: "Sesi host tidak valid." },
      { status: 403 }
    );
  }

  let success = false;
  let message = "";

  switch (action) {
    case "start":
      success = startSessionGame(pin, hostId);
      message = success ? "Kuis dimulai" : "Gagal memulai kuis";
      break;

    case "reveal":
      success = revealQuestionAnswer(pin, hostId);
      message = success ? "Jawaban dibuka" : "Gagal membuka jawaban";
      break;

    case "next":
      success = nextSessionQuestion(pin, hostId);
      message = success ? "Lanjut ke pertanyaan berikutnya" : "Gagal melanjutkan pertanyaan";
      break;

    case "kick":
      if (!targetPlayerId) {
        return NextResponse.json({ ok: false, error: "Target player ID diperlukan." }, { status: 400 });
      }
      success = kickPlayerFromSession(pin, hostId, targetPlayerId);
      message = success ? "Pemain dikeluarkan" : "Gagal mengeluarkan pemain";
      break;

    case "close":
      success = closeSessionGame(pin, hostId);
      message = success ? "Sesi kuis ditutup" : "Gagal menutup sesi";
      break;

    default:
      return NextResponse.json({ ok: false, error: "Aksi tidak dikenal." }, { status: 400 });
  }

  if (!success) {
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const updatedSession = getLiveSession(pin) || (action === "close" ? liveSession : null);
  const supabase = await getSupabaseServerClient();
  if (updatedSession && supabase) {
    try {
      await persistLiveGame(updatedSession);
    } catch (error) {
      console.error("[game/live/action] Supabase", error instanceof Error ? error.message : "Persistence failed");
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sesi berubah di layar host, tetapi gagal disimpan." }, { status: 500 });
    }
    if (action === "close") {
      const { error: linkError } = await supabase.from("class_session_games").update({ live_status: "closed" }).eq("live_pin", pin);
      if (linkError && linkError.code !== "PGRST116") return NextResponse.json({ ok: false, error: "Game sudah ditutup, tetapi status kuncinya belum tersimpan." }, { status: 500 });
    }
  } else if (action === "close") {
    const db = await readLocalDb();
    const relation = db.classSessionGames?.find((entry) => entry.livePin === pin);
    if (relation) { relation.liveStatus = "closed"; await writeLocalDb(db); }
  }

  return NextResponse.json({ ok: true, message });
}
