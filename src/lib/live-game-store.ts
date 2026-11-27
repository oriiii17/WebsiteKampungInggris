import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getLiveSession, restoreLiveSession, type LiveGameSession, type PlayerSession } from "@/lib/game-session";

function normalizePin(value: string) {
  const pin = String(value || "").trim();
  return /^\d{6}$/.test(pin) ? pin : "";
}

/** Loads a live game by its canonical six-character PIN; production never trusts process memory. */
export async function loadLiveGame(pinValue: string): Promise<LiveGameSession | null> {
  const pin = normalizePin(pinValue);
  if (!pin) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    if (process.env.VERCEL) throw new Error("Penyimpanan kuis live belum tersedia di server.");
    return getLiveSession(pin);
  }

  const { data, error } = await supabase.from("game_sessions").select("id,pin,game_id,host_user_id,host_name,status,current_question_index,total_questions,game_snapshot,created_at,updated_at").eq("pin", pin).maybeSingle();
  if (error) throw new Error(`Sesi kuis gagal dibaca (${error.code || "Supabase"}).`);
  if (!data) return null;

  const snapshot = data.game_snapshot && typeof data.game_snapshot === "object" ? data.game_snapshot as Record<string, unknown> : {};
  const saved = snapshot.liveState && typeof snapshot.liveState === "object" ? snapshot.liveState as Partial<LiveGameSession> : null;
  const players = saved?.players && typeof saved.players === "object" ? saved.players : {};
  const session: LiveGameSession = {
    pin,
    gameId: String(data.game_id || saved?.gameId || ""),
    gameKind: saved?.gameKind || (snapshot.kind as LiveGameSession["gameKind"]) || "kuis_live",
    templateId: saved?.templateId || String(data.game_id || ""),
    templateTitle: saved?.templateTitle || String(snapshot.title || "Kuis"),
    hostId: saved?.hostId || String(data.host_user_id || ""),
    hostName: String(data.host_name || saved?.hostName || "Host Sapen English"),
    status: data.status as LiveGameSession["status"],
    currentQuestionIndex: Number(data.current_question_index ?? saved?.currentQuestionIndex ?? 0),
    totalQuestions: Number(data.total_questions ?? saved?.totalQuestions ?? 0),
    questionStartedAt: Number(saved?.questionStartedAt || 0),
    players: players as Record<string, PlayerSession>,
    questions: Array.isArray(saved?.questions) ? saved.questions : Array.isArray(snapshot.questions) ? snapshot.questions as LiveGameSession["questions"] : [],
    createdAt: Date.parse(String(data.created_at || "")) || Number(saved?.createdAt || Date.now()),
    lastActive: Date.parse(String(data.updated_at || "")) || Number(saved?.lastActive || Date.now()),
  };

  const { data: rows, error: playersError } = await supabase.from("game_session_players").select("id,player_name,score,avatar_id,team,joined_at").eq("session_id", data.id);
  if (playersError) throw new Error(`Peserta kuis gagal dibaca (${playersError.code || "Supabase"}).`);
  for (const row of rows || []) if (!session.players[row.id]) session.players[row.id] = {
    id: row.id,
    name: row.player_name,
    score: Number(row.score || 0),
    streak: 0,
    avatarId: row.avatar_id || "leaf",
    team: row.team || "forest",
    connectedAt: Date.parse(row.joined_at || "") || Date.now(),
  };
  return restoreLiveSession(session);
}

/** Persists the full mutable game state; the existing RLS policies keep it server/admin-only. */
export async function persistLiveGame(session: LiveGameSession) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    if (process.env.VERCEL) throw new Error("Penyimpanan kuis live belum tersedia di server.");
    return;
  }

  const { data, error } = await supabase.from("game_sessions").update({
    status: session.status,
    current_question_index: session.currentQuestionIndex,
    game_snapshot: { title: session.templateTitle, kind: session.gameKind, questions: session.questions, liveState: session },
    updated_at: new Date().toISOString(),
  }).eq("pin", normalizePin(session.pin)).select("id").maybeSingle();
  if (error) throw new Error(`Sesi kuis gagal disimpan (${error.code || "Supabase"}).`);
  if (!data) throw new Error("Sesi kuis tidak ditemukan di penyimpanan server.");

  const players = Object.values(session.players);
  if (players.length) {
    const { error: playerError } = await supabase.from("game_session_players").upsert(players.map((player) => ({
      id: player.id,
      session_id: data.id,
      player_name: player.name,
      score: player.score,
      avatar_id: player.avatarId,
      team: player.team,
    })), { onConflict: "session_id,id" });
    if (playerError) throw new Error(`Peserta kuis gagal disimpan (${playerError.code || "Supabase"}).`);
  }
  const { data: storedPlayers, error: storedPlayersError } = await supabase.from("game_session_players").select("id").eq("session_id", data.id);
  if (storedPlayersError) throw new Error(`Daftar peserta kuis gagal diperbarui (${storedPlayersError.code || "Supabase"}).`);
  const activeIds = new Set(players.map((player) => player.id));
  await Promise.all((storedPlayers || []).filter((player) => !activeIds.has(player.id)).map((player) => supabase.from("game_session_players").delete().eq("session_id", data.id).eq("id", player.id)));
}
