import { NextResponse } from "next/server";
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
  const { pin } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, hostId, targetPlayerId } = body;

  if (!hostId) {
    return NextResponse.json(
      { ok: false, error: "Host ID diperlukan untuk aksi ini." },
      { status: 401 }
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

  return NextResponse.json({ ok: true, message });
}
