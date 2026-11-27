import { NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";
import { normalizeGameBlueprint } from "@/lib/game-blueprint";

async function getSelectedSessionGames(sessionId: string) {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: links, error: linksError } = await supabase.from("class_session_games").select("game_id,live_pin,live_status").eq("session_id", sessionId);
    if (linksError || !links?.length) return [];
    const ids = [...new Set(links.map((link) => String(link.game_id)))];
    const { data: rows, error } = await supabase.from("game_blueprints").select("id,title,status,destination").in("id", ids);
    if (error) return [];
    const games = new Map((rows || []).map((row) => [String(row.id), normalizeGameBlueprint(row)]));
    return links.flatMap((link) => {
      const game = games.get(String(link.game_id));
      if (!game || game.status !== "session" || game.destination !== "session") return [];
      const live = Boolean(link.live_pin && link.live_status !== "closed");
      return [{ id: game.id, title: game.title, status: live ? "live" : "waiting", pin: live ? String(link.live_pin) : null }];
    });
  }

  const db = await readLocalDb();
  const links = (db.classSessionGames || []).filter((link) => link.sessionId === sessionId);
  return links.flatMap((link) => {
    const game = (db.gameBlueprints || []).map(normalizeGameBlueprint).find((item) => item.id === link.gameId);
    if (!game || game.status !== "session" || game.destination !== "session") return [];
    const live = Boolean(link.livePin && link.liveStatus !== "closed");
    return [{ id: game.id, title: game.title, status: live ? "live" : "waiting", pin: live ? link.livePin || null : null }];
  });
}

export async function GET() {
  const session = await getSessionWithGuestContext();
  if (!session?.guestSessionId) return NextResponse.json({ status: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  const activeClassSession = await getApprovedActiveClassSession(session);

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("class_sessions").select("status,class_id,auto_close_at").eq("id", session.guestSessionId).maybeSingle();
    if (error) return NextResponse.json({ status: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    const expired = Boolean(data?.auto_close_at && Date.parse(data.auto_close_at) <= Date.now());
    const approved = activeClassSession?.classId === data?.class_id;
    const selectedGames = approved && data?.status === "open" && !expired ? await getSelectedSessionGames(session.guestSessionId) : [];
    return NextResponse.json({ status: expired ? "closed" : data?.status || null, ...(approved ? { classId: data?.class_id || null, participantName: session.name, selectedGames } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const db = await readLocalDb();
  const classSession = db.classSessions?.find((item) => item.id === session.guestSessionId);
  const expired = Boolean(classSession?.autoCloseAt && Date.parse(classSession.autoCloseAt) <= Date.now());
  const selectedGames = activeClassSession && classSession?.status === "open" && !expired ? await getSelectedSessionGames(session.guestSessionId) : [];
  return NextResponse.json({ status: expired ? "closed" : classSession?.status || null, ...(activeClassSession ? { classId: classSession?.classId || null, participantName: session.name, selectedGames } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
