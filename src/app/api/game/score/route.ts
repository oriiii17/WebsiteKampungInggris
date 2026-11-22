import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { canSavePersonalGameHistory } from "@/lib/game-score-history";
import type { GameScoreHistoryEntry } from "@/lib/types";

const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function pruneExpiredLocalHistory(db: Awaited<ReturnType<typeof readLocalDb>>, cutoff: number) {
  const currentHistory = db.gameScoreHistory || [];
  const previousLength = currentHistory.length;
  db.gameScoreHistory = currentHistory.filter((entry) => {
    const createdAt = Date.parse(entry.createdAt);
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
  return currentHistory.length !== db.gameScoreHistory.length;
}

function toEntry(row: any): GameScoreHistoryEntry {
  return {
    id: String(row.id), participantId: String(row.participant_id), gameId: String(row.game_id),
    gameTitle: String(row.game_title), gameType: String(row.game_type || "Kuis"),
    score: Number(row.score), createdAt: String(row.created_at),
  };
}

export async function GET() {
  const session = await getSessionWithGuestContext();
  if (!canSavePersonalGameHistory(session)) {
    return NextResponse.json({ error: "Riwayat kuis tersedia setelah masuk dengan akun peserta terdaftar." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS).toISOString();
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_score_history").select("id,participant_id,game_id,game_title,game_type,score,created_at").eq("participant_id", session.id).gte("created_at", cutoff).order("score", { ascending: false }).order("created_at", { ascending: false });
    if (error) {
      console.error("[game/score GET]", { code: error.code, message: error.message });
      const missingTable = error.code === "42P01" || error.code === "PGRST205";
      return NextResponse.json({ error: missingTable ? "Riwayat kuis belum tersedia. Pengelola perlu menerapkan migrasi penyimpanan riwayat kuis." : "Riwayat kuis belum dapat dimuat. Hubungi pengelola jika masalah berlanjut." }, { status: 503 });
    }
    return NextResponse.json({ entries: (data || []).map(toEntry) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const db = await readLocalDb();
  const cutoffTime = Date.parse(cutoff);
  if (pruneExpiredLocalHistory(db, cutoffTime)) await writeLocalDb(db);
  const entries = (db.gameScoreHistory || []).filter((entry) => entry.participantId === session.id).sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const session = await getSessionWithGuestContext();
  if (!canSavePersonalGameHistory(session)) {
    return NextResponse.json({ error: "Masuk dengan akun peserta terdaftar untuk menyimpan riwayat kuis." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
    const gameTitle = typeof body.gameTitle === "string" ? body.gameTitle.trim() : "";
    const score = body.score;
    if (!gameId || gameId.length > 120 || !gameTitle || gameTitle.length > 200 || !Number.isSafeInteger(score) || score < 0) {
      return NextResponse.json({ error: "Data hasil kuis belum lengkap atau nilainya tidak valid." }, { status: 400 });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from("game_score_history").insert({ id, participant_id: session.id, game_id: gameId, game_title: gameTitle, game_type: "Kuis", score, created_at: createdAt }).select("id,participant_id,game_id,game_title,game_type,score,created_at").single();
      if (error) {
        console.error("[game/score POST]", { code: error.code, message: error.message });
        const missingTable = error.code === "42P01" || error.code === "PGRST205";
        return NextResponse.json({ error: missingTable ? "Riwayat kuis belum tersedia. Pengelola perlu menerapkan migrasi penyimpanan riwayat kuis." : "Hasil kuis belum tersimpan. Coba lagi sebentar." }, { status: 503 });
      }
      return NextResponse.json({ ok: true, entry: toEntry(data) }, { status: 201 });
    }

    const entry: GameScoreHistoryEntry = { id, participantId: session.id, gameId, gameTitle, gameType: "Kuis", score, createdAt };
    const db = await readLocalDb();
    pruneExpiredLocalHistory(db, Date.now() - HISTORY_RETENTION_MS);
    db.gameScoreHistory = [...(db.gameScoreHistory || []), entry];
    await writeLocalDb(db);
    return NextResponse.json({ ok: true, entry }, { status: 201 });
  } catch (error) {
    console.error("[game/score POST]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Hasil kuis belum tersimpan. Periksa koneksi lalu coba lagi." }, { status: 500 });
  }
}
