import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { GAME_TEMPLATES, validateGameBlueprint, type GameBlueprint } from "@/lib/game-blueprint";

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
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Isi game tidak valid.", code: "INVALID_GAME" }, { status: 400 });
  const isPublished = (body as Record<string, unknown>).status === "published";
  if (isPublished) {
    const result = validateGameBlueprint(body);
    if (!result.valid) return NextResponse.json({ error: "Periksa kembali data game.", details: result.errors, code: "GAME_VALIDATION_FAILED" }, { status: 400 });
  } else {
    const value = body as Record<string, any>;
    const validTemplate = GAME_TEMPLATES.some((template) => template.id === value.template);
    const settings = value.settings;
    const validSettings = settings && Number.isInteger(settings.hearts) && settings.hearts >= 1 && settings.hearts <= 10
      && Number.isInteger(settings.timeLimitSec) && settings.timeLimitSec >= 0 && settings.timeLimitSec <= 3600
      && ["solo", "class", "both"].includes(settings.mode) && ["forest", "tomato", "saffron", "ocean"].includes(settings.theme)
      && typeof settings.randomizeQuestions === "boolean" && typeof settings.randomizeOptions === "boolean";
    const validItems = Array.isArray(value.items) && value.items.length <= 200 && value.items.every((item: unknown) => item && typeof item === "object" && !Array.isArray(item));
    if (!validTemplate || !["A1", "A2", "B1", "B2"].includes(value.level) || typeof value.title !== "string" || value.title.length > 100 || typeof value.topic !== "string" || value.topic.length > 80 || !["id", "en", "id-en"].includes(value.language) || !validItems || !validSettings || !["draft", "published"].includes(value.status)) {
      return NextResponse.json({ error: "Data dasar draf game tidak valid.", code: "INVALID_DRAFT" }, { status: 400 });
    }
  }
  const game: GameBlueprint = { ...body, id: typeof body.id === "string" && body.id.trim() ? body.id : randomUUID(), status: isPublished ? "published" : "draft", createdAt: body.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").upsert(toRow(game), { onConflict: "id" }).select("*").single();
    if (error) {
      console.error("[api/admin/game-builder POST]", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? "Tabel game belum tersedia. Periksa migrasi." : "Game belum dapat disimpan.", code: error.code || "GAME_SAVE_FAILED" }, { status: 503 });
    }
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

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus pengurus." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id || id.length > 100) return NextResponse.json({ error: "ID game tidak valid." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("game_blueprints").delete().eq("id", id);
    if (error) { console.error("[api/admin/game-builder DELETE]", { code: error.code, message: error.message, details: error.details, hint: error.hint }); return NextResponse.json({ error: "Game belum dapat dihapus.", code: error.code || "GAME_DELETE_FAILED" }, { status: 503 }); }
  } else {
    const db = await readLocalDb(); db.gameBlueprints = (db.gameBlueprints || []).filter((game) => game.id !== id); await writeLocalDb(db);
  }
  return NextResponse.json({ ok: true });
}
