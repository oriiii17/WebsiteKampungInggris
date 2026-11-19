import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const user = await getServerSession();
  if (!canManageSessions(user)) return NextResponse.json({ error: "Daftar game sesi hanya tersedia untuk pengurus dan tutor." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("game_blueprints").select("id,title,template,level").eq("status", "session").order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Daftar game Sesi belum dapat dimuat. Pastikan migrasi status game sudah diterapkan." }, { status: 503 });
    return NextResponse.json({ games: data || [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  const db = await readLocalDb();
  const games = (db.gameBlueprints || []).filter((game) => game.status === "session").map(({ id, title, template, level }) => ({ id, title, template, level }));
  return NextResponse.json({ games }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
