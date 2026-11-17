import { NextResponse } from "next/server";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("record_game_blueprint_play", { p_game_id: id });
    if (error) return NextResponse.json({ error: "Jumlah permainan belum dapat diperbarui." }, { status: 503 });
    if (data === null) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
    return NextResponse.json({ plays: data });
  }
  const db = await readLocalDb();
  const game = db.gameBlueprints?.find((item) => item.id === id && item.status === "published");
  if (!game) return NextResponse.json({ error: "Game tidak tersedia." }, { status: 404 });
  game.plays = (game.plays || 0) + 1;
  await writeLocalDb(db);
  return NextResponse.json({ plays: game.plays });
}
