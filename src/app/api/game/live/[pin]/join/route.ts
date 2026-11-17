import { NextResponse } from "next/server";
import {
  checkPinRateLimit,
  joinPlayerToSession,
  recordPinFailure,
  sanitizeSessionForClient,
} from "@/lib/game-session";
import { getSupabaseServerClient } from "@/lib/supabase-server";

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
  const avatarId = ["leaf", "book", "sun", "bird"].includes(body.avatarId) ? body.avatarId : "leaf";

  if (!playerName || playerName.length < 2 || playerName.length > 25) {
    return NextResponse.json(
      { ok: false, error: "Nama panggilan harus 2-25 karakter." },
      { status: 400 }
    );
  }
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ ok: false, error: "PIN sesi harus terdiri dari enam angka." }, { status: 400 });
  if (typeof playerId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(playerId)) return NextResponse.json({ ok: false, error: "ID peserta tidak valid." }, { status: 400 });

  // Filter kata kasar sederhana
  const bannedWords = ["admin", "pengurus", "system", "moderator", "bot", "kasar"];
  if (bannedWords.some((w) => playerName.toLowerCase().includes(w))) {
    return NextResponse.json(
      { ok: false, error: "Nama panggilan mengandung kata yang dilarang." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("join_game_session", { p_pin: pin, p_player_id: playerId, p_player_name: playerName, p_avatar_id: avatarId });
    if (error) {
      console.error("[game/live/join] Supabase RPC", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ ok: false, error: error.code === "PGRST202" || error.code === "42883" ? "Migrasi sesi game belum diterapkan di Supabase." : `Gagal bergabung (${error.code || "Supabase"}): ${error.message}` }, { status: 503 });
    }
    if (!data?.ok) return NextResponse.json({ ok: false, error: data?.error || "Sesi tidak ditemukan atau sudah ditutup." }, { status: 400 });
    const result = joinPlayerToSession(pin, playerName, playerId, avatarId, data.team === "saffron" ? "saffron" : "forest");
    if (!result.ok || !result.session) return NextResponse.json({ ok: false, error: result.error || "Gagal bergabung." }, { status: 400 });
    return NextResponse.json({ ok: true, playerId, playerName, avatarId, team: data.team, session: sanitizeSessionForClient(result.session) });
  }

  const result = joinPlayerToSession(pin, playerName, playerId, avatarId);

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
    avatarId,
    team: result.session.players[playerId].team,
    session: sanitizeSessionForClient(result.session),
  });
}
