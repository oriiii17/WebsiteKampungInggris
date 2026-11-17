import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { validateGameBlueprint, type GameBlueprint } from "@/lib/game-blueprint";

function toRow(game: GameBlueprint) {
  return {
    id: game.id,
    title: game.title,
    template: game.template,
    level: game.level,
    topic: game.topic,
    language: game.language,
    cover_image: game.coverImage || null,
    status: game.status,
    play_count: game.plays || 0,
    settings: game.settings,
    items: game.items,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
  };
}

function fromRow(row: any): GameBlueprint {
  return {
    id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, coverImage: row.cover_image || undefined, status: row.status, plays: row.play_count || 0,
    settings: row.settings, items: row.items, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus pengurus." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").select("*").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? "Terapkan migrasi game_blueprints terlebih dahulu." : "Game belum dapat dimuat." }, { status: 503 });
    return NextResponse.json({ games: (data || []).map(fromRow) });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: db.gameBlueprints || [] });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus pengurus." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const result = validateGameBlueprint(body);
  if (!result.valid) return NextResponse.json({ error: "Periksa kembali data game.", details: result.errors }, { status: 400 });
  const game: GameBlueprint = { ...body, updatedAt: new Date().toISOString() };
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").upsert(toRow(game), { onConflict: "id" }).select("*").single();
    if (error) return NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? "Terapkan migrasi game_blueprints terlebih dahulu." : "Game belum dapat disimpan." }, { status: 503 });
    return NextResponse.json({ game: fromRow(data) });
  }
  const db = await readLocalDb();
  db.gameBlueprints ||= [];
  const index = db.gameBlueprints.findIndex((item) => item.id === game.id);
  if (index >= 0) db.gameBlueprints[index] = game;
  else db.gameBlueprints.unshift(game);
  await writeLocalDb(db);
  return NextResponse.json({ game });
}
