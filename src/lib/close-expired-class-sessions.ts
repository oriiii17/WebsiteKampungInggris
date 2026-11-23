import "server-only";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { closeSessionGame, getLiveSession } from "@/lib/game-session";

// TODO: Temporary local/memory fallback until session persistence fully migrates to Supabase.
/** Closes due sessions lazily on session polling/reads; this works without a separate cron service. */
export async function closeExpiredClassSessions() {
  const now = new Date().toISOString();
  try {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data: due, error } = await supabase.from("class_sessions").select("id").eq("status", "open").not("auto_close_at", "is", null).lte("auto_close_at", now);
      if (error || !due?.length) return;
      for (const session of due) {
        const { data: links } = await supabase.from("class_session_games").select("live_pin").eq("session_id", session.id).not("live_pin", "is", null);
        for (const link of links || []) {
          if (!link.live_pin) continue;
          const live = getLiveSession(link.live_pin);
          if (live && live.status !== "closed") closeSessionGame(live.pin, live.hostId);
          await supabase.from("game_sessions").update({ status: "closed", updated_at: now }).eq("pin", link.live_pin);
        }
        await supabase.from("class_session_games").update({ live_status: "closed" }).eq("session_id", session.id).not("live_pin", "is", null);
        await supabase.from("class_sessions").update({ status: "closed", closed_at: now }).eq("id", session.id).eq("status", "open");
      }
      return;
    }

    const db = await readLocalDb();
    const due = (db.classSessions || []).filter((session) => session.status === "open" && session.autoCloseAt && Date.parse(session.autoCloseAt) <= Date.parse(now));
    if (!due.length) return;
    for (const session of due) {
      session.status = "closed";
      session.closedAt = now;
      for (const link of db.classSessionGames || []) {
        if (link.sessionId !== session.id) continue;
        link.liveStatus = "closed";
        if (link.livePin) {
          const live = getLiveSession(link.livePin);
          if (live && live.status !== "closed") closeSessionGame(live.pin, live.hostId);
        }
      }
    }
    await writeLocalDb(db);
  } catch (error) {
    console.error("[class-sessions] Auto-close check failed", error);
  }
}
