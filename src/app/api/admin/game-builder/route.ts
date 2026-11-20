import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { GAME_TEMPLATES, getGameBlueprintPublishIssue, normalizeGameBlueprint, validateGameBlueprint, type GameBlueprint } from "@/lib/game-blueprint";

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
    destination: game.destination || "public",
    play_count: game.plays || 0,
    settings: game.settings,
    items: game.items,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
  };
}

function fromRow(row: any): GameBlueprint {
  const normalizeMedia = (value?: string | null) => {
    if (!value) return undefined;
    const match = value.match(/(?:\/uploads\/games\/|\/storage\/v1\/object\/public\/game-media\/builder\/|\/api\/game-media\/)([^/?#]+\.(?:jpg|png|webp))/i);
    return match ? `/api/game-media/${match[1]}` : value;
  };
  return normalizeGameBlueprint({
    id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic,
    language: row.language, coverImage: normalizeMedia(row.cover_image), status: row.status, destination: row.destination, plays: row.play_count || 0,
    settings: row.settings, items: Array.isArray(row.items) ? row.items.map((item: any) => ({ ...item, mediaUrl: normalizeMedia(item.mediaUrl) })) : row.items, createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

export async function GET() {
  const session = await getServerSession();
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus pengurus." }, { status: 403, headers });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").select("*").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? "Terapkan migrasi game_blueprints terlebih dahulu." : "Game belum dapat dimuat." }, { status: 503, headers });
    return NextResponse.json({ games: (data || []).map(fromRow) }, { headers });
  }
  const db = await readLocalDb();
  return NextResponse.json({ games: (db.gameBlueprints || []).map(normalizeGameBlueprint) }, { headers });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus pengurus." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Isi game tidak valid.", code: "INVALID_GAME" }, { status: 400 });
  const normalized = normalizeGameBlueprint(body);
  const requiresCompleteGame = normalized.status === "published" || normalized.status === "session" || normalized.status === "independent";
  if (requiresCompleteGame) {
    const title = typeof normalized.title === "string" ? normalized.title.trim() : "";
    if (!title || title.toLocaleLowerCase("id-ID") === "game baru") {
      return NextResponse.json({ error: "Beri game ini judul yang jelas sebelum menerbitkannya.", code: "GAME_TITLE_REQUIRED" }, { status: 400 });
    }
    const result = validateGameBlueprint(normalized);
    if (!result.valid) {
      const issue = getGameBlueprintPublishIssue(normalized);
      return NextResponse.json({ error: issue?.message || "Periksa kembali informasi dan isi game sebelum digunakan.", code: "GAME_VALIDATION_FAILED", field: issue?.field, itemIndex: issue?.itemIndex }, { status: 400 });
    }
  } else {
    const value = normalized as Record<string, any>;
    const validTemplate = GAME_TEMPLATES.some((template) => template.id === value.template);
    const settings = value.settings;
    const validSettings = settings && Number.isInteger(settings.hearts) && settings.hearts >= 1 && settings.hearts <= 10
      && Number.isInteger(settings.timeLimitSec) && settings.timeLimitSec >= 0 && settings.timeLimitSec <= 3600
      && ["solo", "class", "both"].includes(settings.mode) && ["forest", "tomato", "saffron", "ocean"].includes(settings.theme)
      && typeof settings.randomizeQuestions === "boolean" && typeof settings.randomizeOptions === "boolean";
    const validItems = Array.isArray(value.items) && value.items.length <= 200 && value.items.every((item: unknown) => item && typeof item === "object" && !Array.isArray(item));
    if (!validTemplate || !["A1", "A2", "B1", "B2"].includes(value.level) || typeof value.title !== "string" || value.title.length > 100 || typeof value.topic !== "string" || value.topic.length > 80 || !["id", "en", "id-en"].includes(value.language) || !validItems || !validSettings || value.status !== "draft" || !["public", "session", "independent"].includes(value.destination || "public")) {
      return NextResponse.json({ error: "Data dasar draf game tidak valid.", code: "INVALID_DRAFT" }, { status: 400 });
    }
  }
  const game: GameBlueprint = { ...normalized, id: typeof normalized.id === "string" && normalized.id.trim() ? normalized.id : randomUUID(), status: normalized.status, createdAt: normalized.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
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
