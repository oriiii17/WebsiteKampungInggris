import { NextResponse } from "next/server";
import { getServerSession, isTutorSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("*").eq("id", id);
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data: row, error } = await query.maybeSingle();
    if (error || !row) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    const [{ data: attendees }, { data: guests }] = await Promise.all([
      supabase.from("class_session_attendance").select("id,participant_name,participant_type,attended_at").eq("session_id", id).order("attended_at", { ascending: true }),
      supabase.from("class_session_guests").select("id,full_name,whatsapp,status,registered_at").eq("session_id", id).order("registered_at", { ascending: false }),
    ]);
    return NextResponse.json({ session: row, attendees: attendees || [], guests: guests || [] });
  }
  const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.id === id && (session?.role !== "tutor" || item.teacherId === session.id));
  if (!local) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ session: local, attendees: db.classSessionAttendance?.filter((item) => item.sessionId === id) || [], guests: db.classSessionGuests?.filter((item) => item.sessionId === id) || [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
  const { id } = await context.params; const body = await request.json().catch(() => ({}));
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("id,teacher_id").eq("id", id);
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data: owner } = await query.maybeSingle();
    if (!owner) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    if (body.action === "close") {
      const { error } = await supabase.from("class_sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
      if (error) return NextResponse.json({ error: "Sesi belum dapat ditutup." }, { status: 503 });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "approve" && typeof body.registrationId === "string") {
      const { data, error } = await supabase.rpc("approve_class_session_guest", { p_registration_id: body.registrationId, p_session_id: id });
      if (error || data !== true) return NextResponse.json({ error: "Peserta belum dapat disetujui. Periksa kuota sesi." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }
  const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.id === id && (session?.role !== "tutor" || item.teacherId === session.id));
  if (!local) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (body.action === "close") { local.status = "closed"; local.closedAt = new Date().toISOString(); await writeLocalDb(db); return NextResponse.json({ ok: true }); }
  if (body.action === "approve" && typeof body.registrationId === "string") {
    const guest = db.classSessionGuests?.find((item) => item.id === body.registrationId && item.sessionId === id);
    if (!guest) return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    const attendance = db.classSessionAttendance ||= [];
    if (local.capacity && attendance.filter((item) => item.sessionId === id).length >= local.capacity) return NextResponse.json({ error: "Kuota sesi sudah penuh." }, { status: 409 });
    guest.status = "approved";
    if (!attendance.some((item) => item.guestRegistrationId === guest.id)) attendance.push({ id: crypto.randomUUID(), sessionId: id, participantKey: `guest:${guest.id}`, participantName: guest.name, participantType: "guest", guestRegistrationId: guest.id, whatsapp: guest.whatsapp, attendedAt: new Date().toISOString() });
    await writeLocalDb(db); return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
