import { NextResponse } from "next/server";
import { getUserEnrollments, readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeGameBlueprint, type GameBlueprint } from "@/lib/game-blueprint";
import { getSessionWithGuestContext, isAdminSession } from "@/lib/auth";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

function fromRow(row: any): GameBlueprint {
  return normalizeGameBlueprint({ id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, status: row.status, destination: row.destination, plays: row.play_count || 0,
    settings: row.settings, items: row.items, createdAt: row.created_at, updatedAt: row.updated_at });
}

export async function GET(request: Request) {
  const session = await getSessionWithGuestContext();
  const requestUrl = new URL(request.url);
  const purpose = requestUrl.searchParams.get("purpose");
  const classId = requestUrl.searchParams.get("classId") || "";
  const activeClassSession = await getApprovedActiveClassSession(session);
  if (purpose === "independent") {
    if (!classId) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 400 });
    let allowed = activeClassSession ? activeClassSession.classId === classId : isAdminSession(session) || session?.origin === "warga_kode";
    if (!activeClassSession && !allowed && session?.email) {
      allowed = (await getUserEnrollments(session.email)).some((enrollment) => enrollment.classId === classId);
    }
    if (!allowed) return NextResponse.json({ error: "Latihan ini tersedia untuk peserta kelas yang terdaftar." }, { status: 403 });

    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const [{ data: links, error: linksError }, { data, error }] = await Promise.all([
        supabase.from("class_games").select("game_id").eq("class_id", classId),
        supabase.from("game_blueprints").select("*").in("status", ["published", "independent"]).order("updated_at", { ascending: false }),
      ]);
      if (linksError) return NextResponse.json({ error: "Daftar latihan kelas belum dapat dimuat." }, { status: 503 });
      if (error) return NextResponse.json({ error: "Latihan mandiri belum dapat dimuat." }, { status: 503 });
      const linkedIds = new Set((links || []).map((link) => link.game_id));
      const games = (data || []).map(fromRow).filter((game) => linkedIds.has(game.id) && ["published", "independent"].includes(game.status) && game.destination === "independent");
      return NextResponse.json({ games }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    const db = await readLocalDb();
    const linkedIds = new Set(db.classes?.find((item) => item.id === classId)?.gameBlueprintIds || []);
    return NextResponse.json({ games: (db.gameBlueprints || []).map(normalizeGameBlueprint).filter((game) => linkedIds.has(game.id) && ["published", "independent"].includes(game.status) && game.destination === "independent") }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  let allowedGuestGameIds: string[] | null = null;
  let allowedSelectedSessionGameIds: string[] = [];
  if (session?.guestSessionId) {
    allowedGuestGameIds = [];
    if (activeClassSession) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const [{ data: classLinks }, { data: sessionLinks }] = await Promise.all([
          supabase.from("class_games").select("game_id").eq("class_id", activeClassSession.classId),
          supabase.from("class_session_games").select("game_id").eq("session_id", activeClassSession.sessionId),
        ]);
        allowedSelectedSessionGameIds = [...new Set((sessionLinks || []).map((link) => link.game_id))];
        allowedGuestGameIds = [...new Set([...(classLinks || []), ...(sessionLinks || [])].map((link) => link.game_id))];
      } else {
        const db = await readLocalDb();
        const classGameIds = db.classes?.find((item) => item.id === activeClassSession.classId)?.gameBlueprintIds || [];
        const sessionGameIds = (db.classSessionGames || []).filter((item) => item.sessionId === activeClassSession.sessionId).map((item) => item.gameId);
        allowedSelectedSessionGameIds = sessionGameIds;
        allowedGuestGameIds = [...new Set([...classGameIds, ...sessionGameIds])];
      }
    }
  }
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const gamesQuery = supabase.from("game_blueprints").select("*").order("updated_at", { ascending: false });
    const { data, error } = allowedGuestGameIds === null
      ? await gamesQuery.eq("status", "published")
      : await gamesQuery.in("status", ["published", "session"]);
    if (error) return NextResponse.json({ error: "Katalog game belum tersedia." }, { status: 503 });
    return NextResponse.json({ games: (data || []).map(fromRow).filter((game) => game.title?.trim() && game.title.trim().toLocaleLowerCase() !== "game baru" && (allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id)) && (game.destination !== "session" || (game.status === "session" && allowedSelectedSessionGameIds.includes(game.id)))) });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: (db.gameBlueprints || []).map(normalizeGameBlueprint).filter((game) => (game.status === "published" || (allowedGuestGameIds !== null && game.status === "session")) && (allowedGuestGameIds !== null || game.destination !== "session") && game.title?.trim() && game.title.trim().toLocaleLowerCase() !== "game baru" && (allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id)) && (game.destination !== "session" || (game.status === "session" && allowedSelectedSessionGameIds.includes(game.id)))) });
}
