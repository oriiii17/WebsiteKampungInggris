import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { getClasses, readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const user = await getServerSession();
  if (!canManageSessions(user)) return NextResponse.json({ error: "Daftar peserta sesi hanya tersedia untuk pengurus dan tutor." }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let sessionsQuery = supabase.from("class_sessions").select("id,title,code,class_id,teacher_id,starts_at,status,closed_at");
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
      const deletableAfter = session?.status === "closed" && session.closed_at ? new Date(new Date(session.closed_at).getTime() + 3 * 60 * 60 * 1000).toISOString() : null;
      return { id: guest.id, name: guest.full_name, whatsapp: guest.whatsapp, status: guest.status, registeredAt: guest.registered_at, sessionDate: session?.starts_at || "", sessionTitle: session?.title || "Sesi tanpa judul", sessionCode: session?.code || "—", classTitle: classById.get(session?.class_id) || "Kelas belum dipetakan", deletableAfter, canDelete: Boolean(deletableAfter && Date.now() >= Date.parse(deletableAfter)), deleteBlockedReason: session?.status !== "closed" ? "Sesi masih terbuka" : !deletableAfter ? "Waktu tutup sesi belum tercatat" : Date.now() < Date.parse(deletableAfter) ? `Terkunci sampai ${new Date(deletableAfter).toLocaleString("id-ID")}` : "" };
    }) });
  }

  const db = await readLocalDb();
  const sessions = (db.classSessions || []).filter((session) => user?.role !== "tutor" || session.teacherId === user.id);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const classById = new Map((db.classes || []).map((item) => [item.id, item.title]));
  const guests = (db.classSessionGuests || []).filter((guest) => sessionById.has(guest.sessionId)).map((guest) => {
    const session = sessionById.get(guest.sessionId)!;
    const deletableAfter = session.status === "closed" && session.closedAt ? new Date(new Date(session.closedAt).getTime() + 3 * 60 * 60 * 1000).toISOString() : null;
    return { id: guest.id, name: guest.name, whatsapp: guest.whatsapp, status: guest.status, registeredAt: guest.registeredAt, sessionDate: session.startsAt || "", sessionTitle: session.title, sessionCode: session.code, classTitle: classById.get(session.classId) || "Kelas belum dipetakan", deletableAfter, canDelete: Boolean(deletableAfter && Date.now() >= Date.parse(deletableAfter)), deleteBlockedReason: session.status !== "closed" ? "Sesi masih terbuka" : !deletableAfter ? "Waktu tutup sesi belum tercatat" : Date.now() < Date.parse(deletableAfter) ? `Terkunci sampai ${new Date(deletableAfter).toLocaleString("id-ID")}` : "" };
  }).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  return NextResponse.json({ guests });
}

export async function DELETE(request: Request) {
  const user = await getServerSession();
  if (!canManageSessions(user)) return NextResponse.json({ error: "Penghapusan hanya tersedia untuk pengurus dan tutor." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length <= 100))].slice(0, 100) : [];
  if (!ids.length) return NextResponse.json({ error: "Pilih peserta yang sudah memenuhi syarat untuk dihapus." }, { status: 400 });
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let sessionsQuery = supabase.from("class_sessions").select("id,status,closed_at,teacher_id");
    if (user?.role === "tutor") sessionsQuery = sessionsQuery.eq("teacher_id", user.id);
    const [{ data: guests, error: guestError }, { data: sessions, error: sessionError }] = await Promise.all([
      supabase.from("class_session_guests").select("id,session_id,registered_at").in("id", ids),
      sessionsQuery,
    ]);
    if (guestError || sessionError) return NextResponse.json({ error: "Status penghapusan belum dapat diperiksa." }, { status: 503 });
    if (!guests || guests.length !== ids.length) return NextResponse.json({ error: "Sebagian peserta tidak ditemukan atau berada di sesi yang tidak dapat Anda kelola." }, { status: 404 });
    const sessionById = new Map((sessions || []).map((session) => [session.id, session]));
    const blocked = guests.find((guest) => {
      const parent = sessionById.get(guest.session_id);
      return !parent || parent.status !== "closed" || !parent.closed_at || Date.parse(parent.closed_at) > cutoff;
    });
    if (blocked) return NextResponse.json({ error: "Peserta terkunci. Sesi harus ditutup dan sudah lewat 3 jam sejak sesi ditutup." }, { status: 409 });
    const { error: attendanceError } = await supabase.from("class_session_attendance").delete().in("guest_registration_id", ids);
    if (attendanceError) return NextResponse.json({ error: "Data presensi peserta belum dapat dihapus." }, { status: 503 });
    const { error } = await supabase.from("class_session_guests").delete().in("id", ids);
    if (error) return NextResponse.json({ error: "Data peserta belum dapat dihapus." }, { status: 503 });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  const db = await readLocalDb();
  const selected = (db.classSessionGuests || []).filter((guest) => ids.includes(guest.id));
  if (selected.length !== ids.length) return NextResponse.json({ error: "Sebagian peserta tidak ditemukan." }, { status: 404 });
  const sessionById = new Map((db.classSessions || []).map((session) => [session.id, session]));
  const blocked = selected.find((guest) => {
    const parent = sessionById.get(guest.sessionId);
    return !parent || (user?.role === "tutor" && parent.teacherId !== user.id) || parent.status !== "closed" || !parent.closedAt || Date.parse(parent.closedAt) > cutoff;
  });
  if (blocked) return NextResponse.json({ error: "Peserta terkunci. Sesi harus ditutup dan sudah lewat 3 jam sejak sesi ditutup." }, { status: 409 });
  db.classSessionGuests = (db.classSessionGuests || []).filter((guest) => !ids.includes(guest.id));
  db.classSessionAttendance = (db.classSessionAttendance || []).filter((attendance) => !attendance.guestRegistrationId || !ids.includes(attendance.guestRegistrationId));
  await writeLocalDb(db);
  return NextResponse.json({ ok: true, deleted: ids.length });
}
