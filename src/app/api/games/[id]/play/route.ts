import { NextResponse } from "next/server";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSessionWithGuestContext } from "@/lib/auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSessionWithGuestContext();
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: game, error: gameError } = await supabase.from("game_blueprints").select("status").eq("id", id).maybeSingle();
    if (gameError || !game || game.status === "draft") return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
    if (game.status === "session") {
      if (session?.role !== "guest" || !session.guestSessionId || !session.guestRegistrationId) return NextResponse.json({ error: "Game ini hanya tersedia bagi peserta sesi yang ditautkan." }, { status: 403 });
      const { data: guest } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
      const { data: parent } = await supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle();
      const [{ data: classLink }, { data: sessionLink }] = parent?.class_id ? await Promise.all([
        supabase.from("class_games").select("game_id").eq("class_id", parent.class_id).eq("game_id", id).maybeSingle(),
        supabase.from("class_session_games").select("game_id").eq("session_id", session.guestSessionId).eq("game_id", id).maybeSingle(),
      ]) : [{ data: null }, { data: null }];
      if (guest?.status !== "approved" || guest.session_id !== session.guestSessionId || !(classLink || sessionLink)) return NextResponse.json({ error: "Game ini tidak ditautkan ke sesi yang kamu ikuti." }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("record_game_blueprint_play", { p_game_id: id });
    if (error) return NextResponse.json({ error: "Jumlah permainan belum dapat diperbarui." }, { status: 503 });
    if (data === null) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
    return NextResponse.json({ plays: data });
  }
  const db = await readLocalDb();
  const game = db.gameBlueprints?.find((item) => item.id === id && (item.status === "published" || item.status === "session"));
  if (!game) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
  if (game.status === "session") {
    const guest = session?.role === "guest" && Boolean(session.guestSessionId && session.guestRegistrationId && db.classSessionGuests?.some((item) => item.id === session.guestRegistrationId && item.sessionId === session.guestSessionId && item.status === "approved"));
    const parent = guest ? db.classSessions?.find((item) => item.id === session?.guestSessionId) : null;
    const linked = Boolean(parent && (db.classes?.find((item) => item.id === parent.classId)?.gameBlueprintIds?.includes(id) || db.classSessionGames?.some((item) => item.sessionId === parent.id && item.gameId === id)));
    if (!linked) return NextResponse.json({ error: "Game ini hanya tersedia bagi peserta sesi yang ditautkan." }, { status: 403 });
  }
  game.plays = (game.plays || 0) + 1;
  await writeLocalDb(db);
  return NextResponse.json({ plays: game.plays });
}
