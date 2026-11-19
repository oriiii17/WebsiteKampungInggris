import { NextResponse } from "next/server";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeGameBlueprint, type GameBlueprint } from "@/lib/game-blueprint";
import { getSessionWithGuestContext } from "@/lib/auth";

function fromRow(row: any): GameBlueprint {
  const normalizeMedia = (value?: string | null) => {
    if (!value) return undefined;
    const match = value.match(/(?:\/uploads\/games\/|\/storage\/v1\/object\/public\/game-media\/builder\/|\/api\/game-media\/)([^/?#]+\.(?:jpg|png|webp))/i);
    return match ? `/api/game-media/${match[1]}` : value;
  };
  return normalizeGameBlueprint({ id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, coverImage: normalizeMedia(row.cover_image), status: row.status, plays: row.play_count || 0,
    settings: row.settings, items: Array.isArray(row.items) ? row.items.map((item: any) => ({ ...item, mediaUrl: normalizeMedia(item.mediaUrl) })) : row.items, createdAt: row.created_at, updatedAt: row.updated_at });
}

export async function GET() {
  const session = await getSessionWithGuestContext();
  let allowedGuestGameIds: string[] | null = null;
  if (session?.role === "guest") {
    allowedGuestGameIds = [];
    if (session.guestSessionId && session.guestRegistrationId) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data: guest } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
        if (guest?.status === "approved" && guest.session_id === session.guestSessionId) {
          const classId = (await supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle()).data?.class_id || "";
          const [{ data: classLinks }, { data: sessionLinks }] = await Promise.all([
            supabase.from("class_games").select("game_id").eq("class_id", classId),
            supabase.from("class_session_games").select("game_id").eq("session_id", session.guestSessionId),
          ]);
          allowedGuestGameIds = [...new Set([...(classLinks || []), ...(sessionLinks || [])].map((link) => link.game_id))];
        }
      } else {
        const db = await readLocalDb();
        const guest = db.classSessionGuests?.find((entry) => entry.id === session.guestRegistrationId && entry.sessionId === session.guestSessionId && entry.status === "approved");
        const parent = db.classSessions?.find((entry) => entry.id === session.guestSessionId);
        if (guest && parent) {
          const classGameIds = db.classes?.find((item) => item.id === parent.classId)?.gameBlueprintIds || [];
          const sessionGameIds = (db.classSessionGames || []).filter((item) => item.sessionId === session.guestSessionId).map((item) => item.gameId);
          allowedGuestGameIds = [...new Set([...classGameIds, ...sessionGameIds])];
        }
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
    return NextResponse.json({ games: (data || []).map(fromRow).filter((game) => game.title?.trim() && game.title.trim().toLocaleLowerCase() !== "game baru" && (allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id))) });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: (db.gameBlueprints || []).map(normalizeGameBlueprint).filter((game) => (game.status === "published" || (allowedGuestGameIds !== null && game.status === "session")) && game.title?.trim() && game.title.trim().toLocaleLowerCase() !== "game baru" && (allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id))) });
}
