import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { readLocalDb, saveGameScore } from "@/lib/db";

export async function GET() {
  const session = await getSessionWithGuestContext();
  if (!session) {
    return NextResponse.json({ error: "Masuk atau bergabung ke sesi untuk melihat riwayat skor." }, { status: 401 });
  }

  const db = await readLocalDb();
  const entries = (db.leaderboard || [])
    .filter((entry) => entry.participantKey === session.id)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
    .map(({ id, moduleId, moduleTitle, gameType, score, createdAt }) => ({
      id, gameId: moduleId, gameTitle: moduleTitle, gameType, score, createdAt,
    }));

  return NextResponse.json({ entries });
}

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
