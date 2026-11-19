import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { saveGameScore } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithGuestContext();
    const body = await req.json();
    const { gameId, gameTitle, score } = body;

    if (!gameId || !gameTitle || typeof score !== "number") {
      return NextResponse.json({ error: "Data skor tidak lengkap." }, { status: 400 });
    }

    let participantKey = "anonim";
    let participantName = "Pemain Anonim";
    let originBadge = "Umum";

    if (session) {
      participantKey = session.id;
      participantName = session.name;
      originBadge = session.rw
        ? `Warga Sapen · ${session.rw}`
        : session.origin === "luar_langganan"
        ? "Peserta Umum"
        : "Umum";
    }

    const entry = await saveGameScore({
      participantKey,
      participantName,
      originBadge,
      gameId,
      gameTitle,
      score,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan skor." },
      { status: 500 }
    );
  }
}
