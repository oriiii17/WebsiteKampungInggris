import { NextResponse } from "next/server";
import { getUserEnrollments, readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSessionWithGuestContext, isAdminSession } from "@/lib/auth";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSessionWithGuestContext();
  const body = await request.json().catch(() => ({}));
  const requestedClassId = typeof body.classId === "string" ? body.classId : "";
  const activeClassSession = await getApprovedActiveClassSession(session);
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: game, error: gameError } = await supabase.from("game_blueprints").select("status").eq("id", id).maybeSingle();
    if (gameError || !game || game.status === "draft") return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
    if (game.status === "independent") {
      let allowed = Boolean(requestedClassId && (isAdminSession(session) || session?.origin === "warga_kode"));
      if (activeClassSession && requestedClassId === activeClassSession.classId) {
        const { data: classLink } = await supabase.from("class_games").select("game_id").eq("class_id", activeClassSession.classId).eq("game_id", id).maybeSingle();
        allowed = Boolean(classLink);
      }
      if (!activeClassSession && !allowed && requestedClassId && session?.email) {
        allowed = (await getUserEnrollments(session.email)).some((enrollment) => enrollment.classId === requestedClassId);
      }
      if (!allowed) return NextResponse.json({ error: "Latihan ini tersedia untuk peserta kelas yang terdaftar." }, { status: 403 });
    }
    if (game.status === "session") {
      if (!activeClassSession) return NextResponse.json({ error: "Game ini hanya tersedia bagi peserta sesi yang ditautkan." }, { status: 403 });
      const { data: sessionLink } = await supabase.from("class_session_games").select("game_id").eq("session_id", activeClassSession.sessionId).eq("game_id", id).maybeSingle();
      if (!sessionLink) return NextResponse.json({ error: "Game ini tidak dibukakan untuk sesi yang kamu ikuti." }, { status: 403 });
    }
    const { data, error } = await supabase.rpc("record_game_blueprint_play", { p_game_id: id });
    if (error) return NextResponse.json({ error: "Jumlah permainan belum dapat diperbarui." }, { status: 503 });
    if (data === null) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
    return NextResponse.json({ plays: data });
  }
  const db = await readLocalDb();
  const game = db.gameBlueprints?.find((item) => item.id === id && (item.status === "published" || item.status === "session" || item.status === "independent"));
  if (!game) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
  if (game.status === "independent") {
    let allowed = Boolean(requestedClassId && (isAdminSession(session) || session?.origin === "warga_kode"));
    if (activeClassSession && requestedClassId === activeClassSession.classId) {
      allowed = Boolean(db.classes?.find((item) => item.id === activeClassSession.classId)?.gameBlueprintIds?.includes(id));
    }
    if (!activeClassSession && !allowed && requestedClassId && session?.email) {
      allowed = (await getUserEnrollments(session.email)).some((enrollment) => enrollment.classId === requestedClassId);
    }
    if (!allowed) return NextResponse.json({ error: "Latihan ini tersedia untuk peserta kelas yang terdaftar." }, { status: 403 });
  }
  if (game.status === "session") {
    const linked = Boolean(activeClassSession && db.classSessionGames?.some((item) => item.sessionId === activeClassSession.sessionId && item.gameId === id));
    if (!linked) return NextResponse.json({ error: "Game ini hanya tersedia bagi peserta sesi yang ditautkan." }, { status: 403 });
  }
  game.plays = (game.plays || 0) + 1;
  await writeLocalDb(db);
  return NextResponse.json({ plays: game.plays });
}
