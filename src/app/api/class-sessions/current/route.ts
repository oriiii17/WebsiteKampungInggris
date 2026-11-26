import { NextResponse } from "next/server";
import { getSessionWithGuestContext } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

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
    return NextResponse.json({ status: expired ? "closed" : data?.status || null, ...(approved ? { classId: data?.class_id || null } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const db = await readLocalDb();
  const classSession = db.classSessions?.find((item) => item.id === session.guestSessionId);
  const expired = Boolean(classSession?.autoCloseAt && Date.parse(classSession.autoCloseAt) <= Date.now());
  return NextResponse.json({ status: expired ? "closed" : classSession?.status || null, ...(activeClassSession ? { classId: classSession?.classId || null } : {}) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
