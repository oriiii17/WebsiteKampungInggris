import { NextResponse } from "next/server";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { GameBlueprint } from "@/lib/game-blueprint";

function fromRow(row: any): GameBlueprint {
  return { id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, coverImage: row.cover_image || undefined, status: row.status, plays: row.play_count || 0,
    settings: row.settings, items: row.items, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").select("*").eq("status", "published").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Katalog game belum tersedia." }, { status: 503 });
    return NextResponse.json({ games: (data || []).map(fromRow) });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: (db.gameBlueprints || []).filter((game) => game.status === "published") });
}
