import { getSupabaseServerClient } from "@/lib/supabase-server";
import { readLocalDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/types";

/** Returns the class attached to a participant's currently open, approved session. */
export async function getApprovedActiveClassSession(session: SessionPayload | null) {
  if (!session?.guestSessionId) return null;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: parent } = await supabase.from("class_sessions").select("id,class_id,status,auto_close_at").eq("id", session.guestSessionId).maybeSingle();
    const autoCloseExpired = parent?.auto_close_at && Date.parse(parent.auto_close_at) <= Date.now();
    if (!parent || parent.status !== "open" || autoCloseExpired || !parent.class_id) return null;
    if (session.guestRegistrationId) {
      const { data: guest } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
      return guest?.status === "approved" && guest.session_id === parent.id ? { sessionId: parent.id, classId: parent.class_id } : null;
    }
    const { data: attendance } = await supabase.from("class_session_attendance").select("session_id").eq("session_id", parent.id).eq("participant_key", `${session.origin}:${session.id}`).maybeSingle();
    return attendance ? { sessionId: parent.id, classId: parent.class_id } : null;
  }
  const db = await readLocalDb();
  const parent = db.classSessions?.find((item) => item.id === session.guestSessionId && item.status === "open" && !(item.autoCloseAt && Date.parse(item.autoCloseAt) <= Date.now()));
  if (!parent?.classId) return null;
  if (session.guestRegistrationId) {
    const guest = db.classSessionGuests?.find((item) => item.id === session.guestRegistrationId && item.sessionId === parent.id && item.status === "approved");
    return guest ? { sessionId: parent.id, classId: parent.classId } : null;
  }
  const attendance = db.classSessionAttendance?.some((item) => item.sessionId === parent.id && item.participantKey === `${session.origin}:${session.id}`);
  return attendance ? { sessionId: parent.id, classId: parent.classId } : null;
}
