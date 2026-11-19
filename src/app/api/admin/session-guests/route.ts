import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { getClasses, readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const user = await getServerSession();
  if (!canManageSessions(user)) return NextResponse.json({ error: "Daftar peserta sesi hanya tersedia untuk pengurus dan tutor." }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let sessionsQuery = supabase.from("class_sessions").select("id,title,code,class_id,teacher_id,starts_at");
    if (user?.role === "tutor") sessionsQuery = sessionsQuery.eq("teacher_id", user.id);
    const { data: sessions, error: sessionsError } = await sessionsQuery;
    if (sessionsError) return NextResponse.json({ error: "Daftar sesi peserta belum dapat dimuat." }, { status: 503 });
    const sessionIds = (sessions || []).map((session) => session.id);
    if (!sessionIds.length) return NextResponse.json({ guests: [] });

    const { data: guests, error } = await supabase.from("class_session_guests").select("id,session_id,full_name,whatsapp,status,registered_at").in("session_id", sessionIds).order("registered_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Daftar peserta Guest belum dapat dimuat." }, { status: 503 });
    const classes = await getClasses(true);
    const sessionById = new Map((sessions || []).map((session) => [session.id, session]));
    const classById = new Map(classes.map((item) => [item.id, item.title]));
    return NextResponse.json({ guests: (guests || []).map((guest) => {
      const session = sessionById.get(guest.session_id);
      return { id: guest.id, name: guest.full_name, whatsapp: guest.whatsapp, status: guest.status, registeredAt: guest.registered_at, sessionDate: session?.starts_at || "", sessionTitle: session?.title || "Sesi tanpa judul", sessionCode: session?.code || "—", classTitle: classById.get(session?.class_id) || "Kelas belum dipetakan" };
    }) });
  }

  const db = await readLocalDb();
  const sessions = (db.classSessions || []).filter((session) => user?.role !== "tutor" || session.teacherId === user.id);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const classById = new Map((db.classes || []).map((item) => [item.id, item.title]));
  const guests = (db.classSessionGuests || []).filter((guest) => sessionById.has(guest.sessionId)).map((guest) => {
    const session = sessionById.get(guest.sessionId)!;
    return { id: guest.id, name: guest.name, whatsapp: guest.whatsapp, status: guest.status, registeredAt: guest.registeredAt, sessionDate: session.startsAt || "", sessionTitle: session.title, sessionCode: session.code, classTitle: classById.get(session.classId) || "Kelas belum dipetakan" };
  }).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  return NextResponse.json({ guests });
}
