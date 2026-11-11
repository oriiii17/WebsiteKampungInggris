import { NextResponse } from "next/server";
import {
  checkPinRateLimit,
  joinPlayerToSession,
  recordPinFailure,
  sanitizeSessionForClient,
} from "@/lib/game-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const ip = req.headers.get("x-forwarded-for") || "local";

  if (!checkPinRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan PIN salah. Coba lagi dalam 5 menit." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const playerName = typeof body.playerName === "string" ? body.playerName.trim() : "";
  const playerId = typeof body.playerId === "string" && body.playerId ? body.playerId : `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (!playerName || playerName.length < 2 || playerName.length > 25) {
    return NextResponse.json(
      { ok: false, error: "Nama panggilan harus 2-25 karakter." },
      { status: 400 }
    );
  }

  // Filter kata kasar sederhana
  const bannedWords = ["admin", "pengurus", "system", "moderator", "bot", "kasar"];
  if (bannedWords.some((w) => playerName.toLowerCase().includes(w))) {
    return NextResponse.json(
      { ok: false, error: "Nama panggilan mengandung kata yang dilarang." },
      { status: 400 }
    );
  }

  const result = joinPlayerToSession(pin, playerName, playerId);

  if (!result.ok || !result.session) {
    recordPinFailure(ip);
    return NextResponse.json(
      { ok: false, error: result.error || "Gagal bergabung." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    playerId,
    playerName,
    session: sanitizeSessionForClient(result.session),
  });
}
