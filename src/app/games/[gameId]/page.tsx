import BlueprintGameClient from "@/components/games/BlueprintGameClient";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { readLocalDb } from "@/lib/db";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";
import { canSavePersonalGameHistory } from "@/lib/game-score-history";

export default async function BlueprintGamePage({ params, searchParams }: { params: Promise<{ gameId: string }>; searchParams: Promise<{ classId?: string }> }) {
  const [{ gameId }, query] = await Promise.all([params, searchParams]);
  const classId = query.classId || "";
  const session = await getSessionWithGuestContext();
  const activeClassSession = await getApprovedActiveClassSession(session);
  if (session?.guestSessionId) {
    let allowed = false;
    if (activeClassSession) {
      if (classId && activeClassSession.classId === classId) allowed = true;
      else {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data: sessionLink } = await supabase.from("class_session_games").select("game_id").eq("session_id", activeClassSession.sessionId).eq("game_id", gameId).maybeSingle();
        allowed = Boolean(sessionLink);
      } else {
        const db = await readLocalDb();
        allowed = Boolean(db.classSessionGames?.some((item) => item.sessionId === activeClassSession.sessionId && item.gameId === gameId));
      }
      }
    }
    if (!allowed) notFound();
  }
  return <BlueprintGameClient gameId={gameId} classId={classId || undefined} guestParticipantId={session?.role === "guest" ? session.guestRegistrationId : undefined} saveHistory={canSavePersonalGameHistory(session)} />;
}
