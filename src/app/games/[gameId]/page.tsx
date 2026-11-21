import BlueprintGameClient from "@/components/games/BlueprintGameClient";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { readLocalDb } from "@/lib/db";

export default async function BlueprintGamePage({ params, searchParams }: { params: Promise<{ gameId: string }>; searchParams: Promise<{ classId?: string }> }) {
  const [{ gameId }, query] = await Promise.all([params, searchParams]);
  const classId = query.classId || "";
  const session = await getSessionWithGuestContext();
  if (session?.role === "guest") {
    let allowed = false;
    if (session.guestSessionId && session.guestRegistrationId) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data: guest } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
        const { data: parent } = await supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle();
        if (guest?.status === "approved" && guest.session_id === session.guestSessionId && parent?.class_id && classId && parent.class_id === classId) {
          allowed = true;
        } else if (guest?.status === "approved" && guest.session_id === session.guestSessionId && parent?.class_id) {
          const [{ data: classLink }, { data: sessionLink }] = await Promise.all([
            supabase.from("class_games").select("game_id").eq("class_id", parent.class_id).eq("game_id", gameId).maybeSingle(),
            supabase.from("class_session_games").select("game_id").eq("session_id", session.guestSessionId).eq("game_id", gameId).maybeSingle(),
          ]);
          allowed = Boolean(classLink || sessionLink);
        }
      } else {
        const db = await readLocalDb();
        const guest = db.classSessionGuests?.some((item) => item.id === session.guestRegistrationId && item.sessionId === session.guestSessionId && item.status === "approved");
        const parent = db.classSessions?.find((item) => item.id === session.guestSessionId);
        allowed = Boolean(guest && (classId && parent?.classId === classId || db.classes?.find((item) => item.id === parent?.classId)?.gameBlueprintIds?.includes(gameId) || db.classSessionGames?.some((item) => item.sessionId === session.guestSessionId && item.gameId === gameId)));
      }
    }
    if (!allowed) notFound();
  }
  return <BlueprintGameClient gameId={gameId} classId={classId || undefined} guestParticipantId={session?.role === "guest" ? session.guestRegistrationId : undefined} />;
}
