import { NextResponse } from "next/server";
import { getServerSession, SESSION_COOKIE_NAME, encodeSessionToken } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { SessionPayload } from "@/lib/types";
import { isHttpsRequest } from "@/lib/request-security";
import type { NextRequest } from "next/server";
import { resolveGuestEntry } from "@/lib/class-session";

async function getPublicSession(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await context.params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const registrationId = session?.role === "guest" && session.guestSessionId && session.guestRegistrationId ? session.guestRegistrationId : null;
    if (registrationId) {
      const { data, error } = await supabase.rpc("get_guest_class_session", { p_code: code, p_registration_id: registrationId });
      const guestData = Array.isArray(data) ? data[0] : data;
      if (!error && guestData) return NextResponse.json({ session: { id: guestData.id, code: guestData.code, title: guestData.title, status: guestData.status, registrationStatus: guestData.registration_status, classId: guestData.class_id, classTitle: guestData.class_title, classSlug: guestData.class_slug, startsAt: guestData.starts_at } });
    }
    if ((session?.role === "member" || session?.origin === "warga_kode") && session.guestSessionId) {
      const { data, error } = await supabase.rpc("get_member_class_session", { p_code: code, p_participant_key: `${session.origin}:${session.id}` });
      const memberData = Array.isArray(data) ? data[0] : data;
      if (!error && memberData?.id === session.guestSessionId) return NextResponse.json({ session: { ...memberData, registrationStatus: "approved" } });
    }
    const { data, error } = await supabase.rpc("get_class_session_info", { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ session: { id: row.id, code: row.code, title: row.title, status: row.status, requireApproval: row.require_approval, attendeeCount: row.attendee_count, classId: row.class_id, classTitle: row.class_title, classSlug: row.class_slug, startsAt: row.starts_at, canAttendAsMember: session?.role === "member" || session?.origin === "warga_kode" } });
  }
  const db = await readLocalDb();
  const local = db.classSessions?.find((item) => item.code === code);
  if (!local) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
  if (session?.role === "guest" && session.guestSessionId === local.id && session.guestRegistrationId) {
    const guest = db.classSessionGuests?.find((item) => item.id === session.guestRegistrationId && item.sessionId === local.id);
    if (guest) return NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, registrationStatus: guest.status, classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug: db.classes?.find((item) => item.id === local.classId)?.slug } });
  }
  if ((session?.role === "member" || session?.origin === "warga_kode") && session.guestSessionId === local.id && db.classSessionAttendance?.some((item) => item.sessionId === local.id && item.participantKey === `${session.origin}:${session.id}`)) {
    return NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, registrationStatus: "approved", classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug: db.classes?.find((item) => item.id === local.classId)?.slug } });
  }
  return NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, requireApproval: local.requireApproval, classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug: db.classes?.find((item) => item.id === local.classId)?.slug, canAttendAsMember: session?.role === "member" || session?.origin === "warga_kode" } });
}

async function joinPublicSession(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await context.params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const current = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("get_class_session_info", { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
    if (row.status !== "open") return NextResponse.json({ error: "Sesi sudah ditutup." }, { status: 410 });
    if (row.starts_at && new Date(row.starts_at).getTime() > Date.now()) return NextResponse.json({ error: `Sesi belum dibuka. Jadwalnya ${new Date(row.starts_at).toLocaleString("id-ID")}.` }, { status: 425 });
  } else {
    const db = await readLocalDb();
    const local = db.classSessions?.find((item) => item.code === code);
    if (!local) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
    if (local.status !== "open") return NextResponse.json({ error: "Sesi sudah ditutup." }, { status: 410 });
    if (local.startsAt && new Date(local.startsAt).getTime() > Date.now()) return NextResponse.json({ error: `Sesi belum dibuka. Jadwalnya ${new Date(local.startsAt).toLocaleString("id-ID")}.` }, { status: 425 });
  }

  if (current?.role === "member" || (current?.origin === "warga_kode" && current.role === "peserta")) {
    if (supabase) {
      const { data, error } = await supabase.rpc("mark_member_class_attendance", { p_code: code, p_participant_key: `${current.origin}:${current.id}`, p_participant_name: current.name });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return NextResponse.json({ error: "Presensi belum dapat dicatat. Periksa kode sesi." }, { status: 400 });
      const response = NextResponse.json({ ok: true, status: "approved", sessionId: row.session_id, title: row.session_title, participantType: "member" });
      response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken({ ...current, guestSessionId: row.session_id }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24, secure: isHttpsRequest(request) });
      return response;
    }
    const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.code === code && item.status === "open");
    if (!local) return NextResponse.json({ error: "Sesi tidak terbuka atau kode tidak sesuai." }, { status: 400 });
    const attendance = db.classSessionAttendance ||= [];
    if (resolveGuestEntry(local.status, local.requireApproval) === "closed") return NextResponse.json({ error: "Sesi sudah ditutup." }, { status: 400 });
    const participantKey = `${current.origin}:${current.id}`;
    if (!attendance.some((item) => item.sessionId === local.id && item.participantKey === participantKey)) attendance.push({ id: crypto.randomUUID(), sessionId: local.id, participantKey, participantName: current.name, participantType: "member", attendedAt: new Date().toISOString() });
    const { writeLocalDb } = await import("@/lib/db"); await writeLocalDb(db);
    const response = NextResponse.json({ ok: true, status: "approved", title: local.title, participantType: "member" });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken({ ...current, guestSessionId: local.id }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24, secure: isHttpsRequest(request) });
    return response;
  }

  const { checkApiRateLimit, getRequestIp } = await import("@/lib/api-rate-limit");
  const limit = checkApiRateLimit(`guest-session:${getRequestIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan mendaftar. Coba lagi beberapa menit." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { validateGuestRegistration } = await import("@/lib/class-session");
  const body = await request.json().catch(() => ({}));
  if (body.consent !== true) return NextResponse.json({ error: "Setujui penggunaan data untuk pendaftaran dan presensi terlebih dahulu." }, { status: 400 });
  const guest = validateGuestRegistration(body.name, body.whatsapp);
  if (!guest) return NextResponse.json({ error: "Periksa nama (2–80 karakter) dan nomor WhatsApp (9–15 digit)." }, { status: 400 });
  let result: { registrationId: string; sessionId: string; title: string; status: "pending" | "approved" | "rejected" } | null = null;
  if (supabase) {
    const { data, error } = await supabase.rpc("register_class_session_guest", { p_code: code, p_name: guest.name, p_whatsapp: guest.whatsapp });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      const message = error?.message || "";
      const friendly = message.includes("SESSION_CLOSED") ? "Sesi sudah ditutup. Pendaftaran tidak lagi tersedia."
        : message.includes("SESSION_NOT_FOUND") ? "Kode sesi tidak ditemukan. Periksa kembali kode dari tutor."
          : message.toLowerCase().includes("whatsapp") ? "Nomor WhatsApp belum dapat digunakan. Periksa kembali nomornya."
            : "Pendaftaran belum berhasil. Periksa data yang diisi lalu coba lagi.";
      return NextResponse.json({ error: friendly }, { status: 400 });
    }
    result = { registrationId: row.registration_id, sessionId: row.session_id, title: row.session_title, status: row.registration_status };
  } else {
    const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.code === code && item.status === "open");
    if (!local) return NextResponse.json({ error: "Sesi sudah ditutup atau kode tidak ditemukan." }, { status: 400 });
    const attendance = db.classSessionAttendance ||= []; const guests = db.classSessionGuests ||= [];
    const entryState = resolveGuestEntry(local.status, local.requireApproval);
    if (entryState === "closed") return NextResponse.json({ error: "Sesi sudah ditutup." }, { status: 400 });
    const status = entryState;
    let existing = guests.find((item) => item.sessionId === local.id && item.whatsapp === guest.whatsapp);
    if (!existing) { existing = { id: crypto.randomUUID(), sessionId: local.id, name: guest.name, whatsapp: guest.whatsapp, status, registeredAt: new Date().toISOString() }; guests.push(existing); }
    else { existing.name = guest.name; }
    if (existing.status === "approved" && !attendance.some((item) => item.guestRegistrationId === existing?.id)) attendance.push({ id: crypto.randomUUID(), sessionId: local.id, participantKey: `guest:${existing.id}`, participantName: existing.name, participantType: "guest", guestRegistrationId: existing.id, whatsapp: existing.whatsapp, attendedAt: new Date().toISOString() });
    const { writeLocalDb } = await import("@/lib/db"); await writeLocalDb(db);
    result = { registrationId: existing.id, sessionId: local.id, title: local.title, status: existing.status };
  }
  const guestSession: SessionPayload = { id: result.registrationId, name: guest.name, role: "guest", origin: "guest", guestRegistrationId: result.registrationId, guestSessionId: result.sessionId, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), watermarkText: guest.name };
  const response = NextResponse.json({ ok: true, title: result.title, status: result.status, sessionId: result.sessionId });
  response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(guestSession), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12, secure: isHttpsRequest(request) });
  return response;
}

import { GET as getTutorSession, PATCH as updateTutorSession } from "./admin-route";

export async function GET(request: NextRequest, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  if (/^[A-Z0-9]{6}$/i.test(sessionKey)) return getPublicSession(request, { params: Promise.resolve({ code: sessionKey }) });
  return getTutorSession(request, { params: Promise.resolve({ id: sessionKey }) });
}

export async function POST(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  if (!/^[A-Z0-9]{6}$/i.test(sessionKey)) return NextResponse.json({ error: "Kode sesi tidak valid." }, { status: 404 });
  return joinPublicSession(request, { params: Promise.resolve({ code: sessionKey }) });
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  return updateTutorSession(request, { params: Promise.resolve({ id: sessionKey }) });
}
