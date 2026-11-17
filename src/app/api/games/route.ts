import { NextResponse } from "next/server";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { GameBlueprint } from "@/lib/game-blueprint";
import { getServerSession } from "@/lib/auth";

function fromRow(row: any): GameBlueprint {
  return { id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, coverImage: row.cover_image || undefined, status: row.status, plays: row.play_count || 0,
    settings: row.settings, items: row.items, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET() {
  const session = await getServerSession();
  let allowedGuestGameIds: string[] | null = null;
  if (session?.role === "guest") {
    allowedGuestGameIds = [];
    if (session.guestSessionId && session.guestRegistrationId) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data: guest } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
        if (guest?.status === "approved" && guest.session_id === session.guestSessionId) {
          const { data: links } = await supabase.from("class_games").select("game_id").eq("class_id", (await supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle()).data?.class_id || "");
          allowedGuestGameIds = (links || []).map((link) => link.game_id);
        }
      } else {
        const db = await readLocalDb();
        const guest = db.classSessionGuests?.find((entry) => entry.id === session.guestRegistrationId && entry.sessionId === session.guestSessionId && entry.status === "approved");
        const parent = db.classSessions?.find((entry) => entry.id === session.guestSessionId);
        if (guest && parent) allowedGuestGameIds = parent ? db.classes?.find((item) => item.id === parent.classId)?.gameBlueprintIds || [] : [];
      }
    }
  }
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").select("*").eq("status", "published").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Katalog game belum tersedia." }, { status: 503 });
    return NextResponse.json({ games: (data || []).map(fromRow).filter((game) => allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id)) });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: (db.gameBlueprints || []).filter((game) => game.status === "published" && (allowedGuestGameIds === null || allowedGuestGameIds.includes(game.id))) });
}
