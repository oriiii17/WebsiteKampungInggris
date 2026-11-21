import { NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const session = await getSessionWithGuestContext();
  if (!session?.guestSessionId) return NextResponse.json({ status: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const [{ data, error }, { data: registration }] = await Promise.all([
      supabase.from("class_sessions").select("status,class_id").eq("id", session.guestSessionId).maybeSingle(),
      session.guestRegistrationId
        ? supabase.from("class_session_guests").select("status,session_id").eq("id", session.guestRegistrationId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (error) return NextResponse.json({ status: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    const approved = registration?.status === "approved" && registration.session_id === session.guestSessionId;
    return NextResponse.json({ status: data?.status || null, ...(approved ? { classId: data?.class_id || null } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const db = await readLocalDb();
  const classSession = db.classSessions?.find((item) => item.id === session.guestSessionId);
  const registration = db.classSessionGuests?.find((item) => item.id === session.guestRegistrationId && item.sessionId === session.guestSessionId && item.status === "approved");
  return NextResponse.json({ status: classSession?.status || null, ...(registration ? { classId: classSession?.classId || null } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
