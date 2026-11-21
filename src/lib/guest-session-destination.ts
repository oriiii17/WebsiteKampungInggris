import type { SessionPayload } from "@/lib/types";
import { getClassByIdOrSlug, readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/** Resolve the destination for an approved session participant without exposing the paid class catalog. */
export async function getGuestSessionDestination(session: SessionPayload | null): Promise<string> {
  if (!session?.guestSessionId || !session.guestRegistrationId) return "/";
  if (session.guestClassHref?.startsWith("/kelas/") && !session.guestClassHref.startsWith("//")) return session.guestClassHref;

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const [{ data: classSession }, { data: registration }] = await Promise.all([
      supabase.from("class_sessions").select("id,code,class_id").eq("id", session.guestSessionId).maybeSingle(),
      supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle(),
    ]);
    if (!classSession || !registration || registration.session_id !== classSession.id) return "/";
    if (registration.status !== "approved") return `/sesi/${encodeURIComponent(classSession.code)}`;
    const guestClass = await getClassByIdOrSlug(classSession.class_id);
    return guestClass?.isPublished ? `/kelas/${encodeURIComponent(guestClass.slug || guestClass.id)}` : `/sesi/${encodeURIComponent(classSession.code)}`;
  }

  const db = await readLocalDb();
  const classSession = db.classSessions?.find((item) => item.id === session.guestSessionId);
  const registration = db.classSessionGuests?.find((item) => item.id === session.guestRegistrationId && item.sessionId === session.guestSessionId);
  if (!classSession || !registration) return "/";
  if (registration.status !== "approved") return `/sesi/${encodeURIComponent(classSession.code)}`;
  const guestClass = db.classes?.find((item) => item.id === classSession.classId && item.isPublished);
  return guestClass ? `/kelas/${encodeURIComponent(guestClass.slug || guestClass.id)}` : `/sesi/${encodeURIComponent(classSession.code)}`;
}
