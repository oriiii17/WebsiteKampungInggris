import { NextResponse } from "next/server";
import { getGuestServerSession, getServerSession, getSessionWithGuestContext, GUEST_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, encodeSessionToken, guestSessionCookieOptions, sessionCookieOptions } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { SessionPayload } from "@/lib/types";
import { isHttpsRequest } from "@/lib/request-security";
import type { NextRequest } from "next/server";
import { resolveGuestEntry } from "@/lib/class-session";
import { closeExpiredClassSessions } from "@/lib/close-expired-class-sessions";

async function getPublicSession(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  await closeExpiredClassSessions();
  const { code: rawCode } = await context.params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const session = await getSessionWithGuestContext();
  const viewerType = session?.role === "guest" ? "guest" : session ? "regular" : "visitor";
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const registrationId = session?.guestSessionId && session.guestRegistrationId ? session.guestRegistrationId : null;
    if (registrationId) {
      if (!session) {
        return NextResponse.json({ error: "Sesi peserta tidak ditemukan. Silakan masuk kembali." }, { status: 401 });
      }
      const { data, error } = await supabase.rpc("get_guest_class_session", { p_code: code, p_registration_id: registrationId });
      const guestData = Array.isArray(data) ? data[0] : data;
      if (!error && guestData) {
        const { data: linkedGame } = await supabase.from("class_session_games").select("live_pin,live_status").eq("session_id", guestData.id).not("live_pin", "is", null).or("live_status.is.null,live_status.neq.closed").limit(1).maybeSingle();
        const { data: guestClass } = guestData.registration_status === "approved" && guestData.class_id
          ? await supabase.from("classes").select("slug,is_published").eq("id", guestData.class_id).maybeSingle()
          : { data: null };
        const classSlug = guestClass?.is_published ? guestClass.slug : undefined;
        if (guestData.id !== session.guestSessionId) return NextResponse.json({ error: "Pendaftaran ini tidak terhubung ke sesi yang sedang dibuka." }, { status: 404 });
        const response = NextResponse.json({ session: { id: guestData.id, code: guestData.code, title: guestData.title, status: guestData.status, registrationStatus: guestData.registration_status, classId: guestData.class_id, classTitle: guestData.class_title, classSlug, startsAt: guestData.starts_at, activeGamePin: guestData.status === "open" && linkedGame?.live_status !== "closed" ? linkedGame?.live_pin || null : null, participantName: session.name || "Guest", viewerType: session.role === "guest" ? "guest" : "regular" } });
        if (classSlug) {
          const updated: SessionPayload = { ...session, guestClassHref: `/kelas/${encodeURIComponent(classSlug)}` };
          const cookieName = session.role === "guest" ? GUEST_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME;
          response.cookies.set(cookieName, encodeSessionToken(updated), session.role === "guest" ? guestSessionCookieOptions(isHttpsRequest(request)) : sessionCookieOptions(updated, isHttpsRequest(request)));
        }
        return response;
      }
      // Keep the attendee on the pending screen if the summary RPC is stale or unavailable.
      const [{ data: guest }, { data: parent }] = await Promise.all([
        supabase.from("class_session_guests").select("id,session_id,full_name,status").eq("id", registrationId).eq("session_id", session.guestSessionId ?? "").maybeSingle(),
        supabase.from("class_sessions").select("id,code,title,status,class_id,starts_at").eq("id", session.guestSessionId ?? "").eq("code", code).maybeSingle(),
      ]);
      if (guest && parent) {
        const { data: klass } = guest.status === "approved" && parent.class_id
          ? await supabase.from("classes").select("title,slug,is_published").eq("id", parent.class_id).maybeSingle()
          : { data: null };
        const classSlug = klass?.is_published ? klass.slug : undefined;
        const response = NextResponse.json({ session: { id: parent.id, code: parent.code, title: parent.title, status: parent.status, registrationStatus: guest.status, classId: parent.class_id, classTitle: klass?.title, classSlug, startsAt: parent.starts_at, participantName: guest.full_name, viewerType: session.role === "guest" ? "guest" : "regular" } });
        if (classSlug) {
          const updated: SessionPayload = { ...session, guestClassHref: `/kelas/${encodeURIComponent(classSlug)}` };
          const cookieName = session.role === "guest" ? GUEST_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME;
          response.cookies.set(cookieName, encodeSessionToken(updated), session.role === "guest" ? guestSessionCookieOptions(isHttpsRequest(request)) : sessionCookieOptions(updated, isHttpsRequest(request)));
        }
        return response;
      }
      return NextResponse.json({ error: "Status pendaftaran belum dapat dimuat. Coba periksa kembali sebentar lagi." }, { status: 503 });
    }
    if (session?.guestSessionId && session.guestRegistrationId) {
      const [{ data: guest }, { data: parent }] = await Promise.all([
        supabase.from("class_session_guests").select("id,session_id,full_name,status").eq("id", session.guestRegistrationId).eq("session_id", session.guestSessionId).maybeSingle(),
        supabase.from("class_sessions").select("id,code,title,status,class_id,starts_at").eq("id", session.guestSessionId).eq("code", code).maybeSingle(),
      ]);
      if (guest && parent) {
        const { data: klass } = parent.class_id ? await supabase.from("classes").select("title,slug,is_published").eq("id", parent.class_id).maybeSingle() : { data: null };
        return NextResponse.json({ session: { id: parent.id, code: parent.code, title: parent.title, status: parent.status, registrationStatus: guest.status, classId: parent.class_id, classTitle: klass?.title, classSlug: klass?.is_published ? klass.slug : undefined, startsAt: parent.starts_at, participantName: guest.full_name, viewerType: "regular" } });
      }
      return NextResponse.json({ error: "Status pendaftaran warga belum dapat dimuat. Coba periksa kembali sebentar lagi." }, { status: 503 });
    }
    if (session?.guestSessionId) {
      const { data, error } = await supabase.rpc("get_member_class_session", { p_code: code, p_participant_key: `${session.origin}:${session.id}` });
      const memberData = Array.isArray(data) ? data[0] : data;
      if (!error && memberData?.id === session.guestSessionId) return NextResponse.json({ session: { ...memberData, registrationStatus: "approved", viewerType: "regular" } });
    }
    const { data, error } = await supabase.rpc("get_class_session_info", { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ session: { id: row.id, code: row.code, title: row.title, status: row.status, requireApproval: row.require_approval, attendeeCount: row.attendee_count, classId: row.class_id, classTitle: row.class_title, classSlug: row.class_slug, startsAt: row.starts_at, canAttendAsMember: Boolean(session && (session.origin === "warga_kode" || ["member", "peserta", "umum"].includes(session.role))), canEditSessionName: Boolean(session?.origin === "warga_kode" && !session.email), participantName: session?.name, viewerType } });
  }
  const db = await readLocalDb();
  const local = db.classSessions?.find((item) => item.code === code);
  if (!local) return NextResponse.json({ error: "Kode sesi tidak ditemukan." }, { status: 404 });
  if (session?.guestSessionId === local.id && session.guestRegistrationId) {
    const guest = db.classSessionGuests?.find((item) => item.id === session.guestRegistrationId && item.sessionId === local.id);
    if (guest) {
      const linkedGame = db.classSessionGames?.find((item) => item.sessionId === local.id && item.livePin && item.liveStatus !== "closed");
      const guestClass = db.classes?.find((item) => item.id === local.classId && item.isPublished);
      const classSlug = guestClass?.slug;
      const response = NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, registrationStatus: guest.status, classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug, activeGamePin: local.status === "open" ? linkedGame?.livePin || null : null, participantName: guest.name || session.name, viewerType: session.role === "guest" ? "guest" : "regular" } });
      if (guest.status === "approved" && classSlug) {
        const updated: SessionPayload = { ...session, guestClassHref: `/kelas/${encodeURIComponent(classSlug)}` };
        const cookieName = session.role === "guest" ? GUEST_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME;
        response.cookies.set(cookieName, encodeSessionToken(updated), session.role === "guest" ? guestSessionCookieOptions(isHttpsRequest(request)) : sessionCookieOptions(updated, isHttpsRequest(request)));
      }
      return response;
    }
  }
  if (session?.guestSessionId === local.id && db.classSessionAttendance?.some((item) => item.sessionId === local.id && item.participantKey === `${session.origin}:${session.id}`)) {
    return NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, registrationStatus: "approved", classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug: db.classes?.find((item) => item.id === local.classId)?.slug, viewerType: "regular" } });
  }
  return NextResponse.json({ session: { id: local.id, code: local.code, title: local.title, status: local.status, requireApproval: local.requireApproval, classId: local.classId, classTitle: db.classes?.find((item) => item.id === local.classId)?.title, classSlug: db.classes?.find((item) => item.id === local.classId)?.slug, canAttendAsMember: Boolean(session && (session.origin === "warga_kode" || ["member", "peserta", "umum"].includes(session.role))), canEditSessionName: Boolean(session?.origin === "warga_kode" && !session.email), participantName: session?.name, viewerType } });
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

  const { checkApiRateLimit, getRequestIp } = await import("@/lib/api-rate-limit");
  const limit = checkApiRateLimit(`guest-session:${getRequestIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan mendaftar. Coba lagi beberapa menit." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { validateGuestRegistration } = await import("@/lib/class-session");
  const body = await request.json().catch(() => ({}));
  const payloadCode = String(body.code ?? code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (payloadCode !== code) return NextResponse.json({ ok: false, error: "Kode sesi pada formulir tidak sesuai dengan halaman ini." }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "Setujui penggunaan data untuk pendaftaran dan presensi terlebih dahulu." }, { status: 400 });
  const guest = validateGuestRegistration(body.name, body.whatsapp);
  if (!guest) return NextResponse.json({ error: "Periksa nama (2–80 karakter) dan pastikan nomor WhatsApp berisi 9–15 digit jika diisi." }, { status: 400 });
  // RW-code users stay on the account-session path even if their role label changes.
  // Session approval is attached to their existing account token; it must never mint a Guest token.
  const isAccountParticipant = Boolean(current && (current.origin === "warga_kode" || ["member", "peserta", "umum"].includes(current.role)));
  const participantName = current && (current.origin !== "warga_kode" || current.email) ? current.name : guest.name;
  if (isAccountParticipant && current) {
    let sessionId = "";
    let title = "";
    if (supabase) {
      const { data: target, error: targetError } = await supabase.from("class_sessions").select("id,title,status,starts_at,class_id,require_approval").eq("code", code).maybeSingle();
      if (targetError || !target || target.status !== "open") return NextResponse.json({ error: "Sesi tidak terbuka atau kode tidak sesuai." }, { status: 410 });
      if (target.starts_at && new Date(target.starts_at).getTime() > Date.now()) return NextResponse.json({ error: "Sesi belum dibuka sesuai jadwal." }, { status: 425 });
      sessionId = target.id; title = target.title;
      const participantKey = `${current.origin}:${current.id}`;
      const { error: attendanceError } = await supabase.from("class_session_attendance").upsert({ session_id: sessionId, participant_key: participantKey, participant_name: participantName, participant_type: "member", whatsapp: guest.whatsapp || null }, { onConflict: "session_id,participant_key" });
      if (attendanceError) return NextResponse.json({ error: "Akses sesi aktif, tetapi presensi akun belum tercatat. Coba bergabung kembali." }, { status: 503 });
    } else {
      const db = await readLocalDb();
      const target = db.classSessions?.find((item) => item.code === code && item.status === "open");
      if (!target) return NextResponse.json({ error: "Sesi tidak terbuka atau kode tidak sesuai." }, { status: 410 });
      if (target.startsAt && new Date(target.startsAt).getTime() > Date.now()) return NextResponse.json({ error: "Sesi belum dibuka sesuai jadwal." }, { status: 425 });
      sessionId = target.id; title = target.title;
      const attendance = db.classSessionAttendance ||= [];
      const participantKey = `${current.origin}:${current.id}`;
      const existing = attendance.find((row) => row.sessionId === sessionId && row.participantKey === participantKey);
      if (existing) { existing.participantName = participantName; existing.participantType = "member"; existing.whatsapp = guest.whatsapp || undefined; }
      else attendance.push({ id: crypto.randomUUID(), sessionId, participantKey, participantName, participantType: "member", whatsapp: guest.whatsapp || undefined, attendedAt: new Date().toISOString() });
      const { writeLocalDb } = await import("@/lib/db"); await writeLocalDb(db);
    }
    let guestClassHref: string | undefined;
    if (supabase) {
      const { data: target } = await supabase.from("class_sessions").select("class_id").eq("id", sessionId).maybeSingle();
      if (target?.class_id) {
        const { data: klass } = await supabase.from("classes").select("slug,is_published").eq("id", target.class_id).maybeSingle();
        if (klass?.is_published && klass.slug) guestClassHref = `/kelas/${encodeURIComponent(klass.slug)}`;
      }
    } else {
      const db = await readLocalDb();
      const target = db.classSessions?.find((item) => item.id === sessionId);
      const klass = db.classes?.find((item) => item.id === target?.classId && item.isPublished);
      if (klass) guestClassHref = `/kelas/${encodeURIComponent(klass.slug || klass.id)}`;
    }
    const updatedMember: SessionPayload = { ...current, name: participantName, guestSessionId: sessionId, guestRegistrationId: undefined, guestClassHref };
    const response = NextResponse.json({ ok: true, status: "approved", sessionId, title, participantType: "account", participantName });
    updatedMember.lastActivityAt = Date.now();
    response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updatedMember), sessionCookieOptions(updatedMember, isHttpsRequest(request)));
    return response;
  }
  let result: { registrationId: string; sessionId: string; title: string; status: "pending" | "approved" | "rejected" } | null = null;
  if (supabase) {
    const { data, error } = await supabase.rpc("register_class_session_guest", { p_code: code, p_name: guest.name, p_whatsapp: guest.whatsapp });
    let row = Array.isArray(data) ? data[0] : data;
    let rpcError = error;
    if (error?.code === "42702") {
      console.warn("[class-session guest registration] RPC ambiguity; using direct Supabase fallback", { sessionCode: code, rpcCode: error.code });
      const { data: target, error: targetError } = await supabase
        .from("class_sessions")
        .select("id, code, title, status, starts_at, require_approval")
        .eq("code", code)
        .maybeSingle();
      if (targetError) throw new Error(`Tidak dapat memeriksa sesi untuk fallback: ${targetError.message}`);
      if (!target || target.status !== "open") return NextResponse.json({ ok: false, error: "Sesi sudah ditutup atau kode tidak ditemukan." }, { status: 410 });
      if (target.starts_at && new Date(target.starts_at).getTime() > Date.now()) return NextResponse.json({ ok: false, error: "Sesi belum dibuka sesuai jadwal." }, { status: 425 });

      const fallbackStatus = target.require_approval ? "pending" : "approved";
      const { data: savedGuest, error: guestError } = await supabase
        .from("class_session_guests")
      .upsert({ session_id: target.id, full_name: guest.name, whatsapp: guest.whatsapp || null, status: fallbackStatus }, { onConflict: "session_id,whatsapp" })
        .select("id, status")
        .single();
      if (guestError || !savedGuest) throw new Error(`Pendaftaran tamu belum tersimpan: ${guestError?.message || "data peserta tidak dikembalikan"}`);

      if (savedGuest.status === "approved") {
        const { error: attendanceError } = await supabase
          .from("class_session_attendance")
          .upsert({ session_id: target.id, participant_key: `guest:${savedGuest.id}`, participant_name: guest.name, participant_type: "guest", guest_registration_id: savedGuest.id }, { onConflict: "session_id,participant_key" });
        if (attendanceError) throw new Error(`Pendaftaran tersimpan tetapi presensi belum tercatat: ${attendanceError.message}`);
      }
      row = { registration_id: savedGuest.id, session_id: target.id, session_title: target.title, registration_status: savedGuest.status };
      rpcError = null;
    }
    if (rpcError || !row) {
      const message = rpcError?.message || "";
      const diagnostic = rpcError ? { code: rpcError.code, message: rpcError.message, details: rpcError.details, hint: rpcError.hint } : { message: "RPC pendaftaran tidak mengembalikan data." };
      console.error("[class-session guest registration] Supabase RPC failed", { sessionCode: code, ...diagnostic });
      const friendly = message.includes("SESSION_CLOSED") ? "Sesi sudah ditutup. Pendaftaran tidak lagi tersedia."
        : message.includes("SESSION_NOT_FOUND") ? "Kode sesi tidak ditemukan. Periksa kembali kode dari tutor."
          : message.includes("SESSION_FULL") ? "Kuota peserta sesi ini sudah penuh."
          : message.toLowerCase().includes("whatsapp") ? "Nomor WhatsApp belum dapat digunakan. Periksa kembali nomornya."
            : "Pendaftaran belum tersimpan karena kendala server. Coba lagi beberapa saat atau hubungi pengurus.";
      return NextResponse.json({ error: friendly, ...(process.env.NODE_ENV !== "production" ? { diagnostic } : {}) }, { status: rpcError ? 500 : 502 });
    } else {
      result = { registrationId: row.registration_id, sessionId: row.session_id, title: row.session_title, status: row.registration_status };
    }
  } else {
    const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.code === code && item.status === "open");
    if (!local) return NextResponse.json({ error: "Sesi sudah ditutup atau kode tidak ditemukan." }, { status: 400 });
    const attendance = db.classSessionAttendance ||= []; const guests = db.classSessionGuests ||= [];
    const entryState = resolveGuestEntry(local.status, local.requireApproval);
    if (entryState === "closed") return NextResponse.json({ error: "Sesi sudah ditutup." }, { status: 400 });
    const status = entryState;
    let existing = guest.whatsapp ? guests.find((item) => item.sessionId === local.id && item.whatsapp === guest.whatsapp) : undefined;
    if (!existing) { existing = { id: crypto.randomUUID(), sessionId: local.id, name: guest.name, whatsapp: guest.whatsapp, status, registeredAt: new Date().toISOString() }; guests.push(existing); }
    else { existing.name = guest.name; }
    if (existing.status === "approved" && !attendance.some((item) => item.guestRegistrationId === existing?.id)) attendance.push({ id: crypto.randomUUID(), sessionId: local.id, participantKey: `guest:${existing.id}`, participantName: existing.name, participantType: "guest", guestRegistrationId: existing.id, whatsapp: existing.whatsapp, attendedAt: new Date().toISOString() });
    const { writeLocalDb } = await import("@/lib/db"); await writeLocalDb(db);
    result = { registrationId: existing.id, sessionId: local.id, title: local.title, status: existing.status };
  }
  let guestClassHref: string | undefined;
  if (result.status === "approved") {
    if (supabase) {
      const { data: parent } = await supabase.from("class_sessions").select("class_id").eq("id", result.sessionId).maybeSingle();
      if (parent?.class_id) {
        const { data: guestClass } = await supabase.from("classes").select("slug,is_published").eq("id", parent.class_id).maybeSingle();
        if (guestClass?.is_published && guestClass.slug) guestClassHref = `/kelas/${encodeURIComponent(guestClass.slug)}`;
      }
    } else {
      const db = await readLocalDb();
      const parent = db.classSessions?.find((item) => item.id === result?.sessionId);
      const guestClass = db.classes?.find((item) => item.id === parent?.classId && item.isPublished);
      if (guestClass) guestClassHref = `/kelas/${encodeURIComponent(guestClass.slug || guestClass.id)}`;
    }
  }
  const guestSession: SessionPayload = { id: result.registrationId, name: guest.name, role: "guest", origin: "guest", lastActivityAt: Date.now(), guestRegistrationId: result.registrationId, guestSessionId: result.sessionId, guestClassHref, watermarkText: guest.name };
  let activeGamePin: string | null = null;
  if (result.status === "approved") {
    if (supabase) {
      const { data: liveGame } = await supabase.from("class_session_games").select("live_pin,live_status").eq("session_id", result.sessionId).not("live_pin", "is", null).or("live_status.is.null,live_status.neq.closed").limit(1).maybeSingle();
      if (liveGame?.live_status !== "closed") activeGamePin = liveGame?.live_pin || null;
    } else {
      const db = await readLocalDb();
      activeGamePin = db.classSessionGames?.find((item) => item.sessionId === result?.sessionId && item.livePin && item.liveStatus !== "closed")?.livePin || null;
    }
  }
  const response = NextResponse.json({ ok: true, title: result.title, status: result.status, sessionId: result.sessionId, activeGamePin, participantName: guest.name }, { status: 200 });
  response.cookies.set(GUEST_SESSION_COOKIE_NAME, encodeSessionToken(guestSession), guestSessionCookieOptions(isHttpsRequest(request)));
  return response;
}

import { DELETE as deleteTutorSession, GET as getTutorSession, PATCH as updateTutorSession } from "./admin-route";

export async function GET(request: NextRequest, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  if (/^[A-Z0-9]{6}$/i.test(sessionKey)) return getPublicSession(request, { params: Promise.resolve({ code: sessionKey }) });
  return getTutorSession(request, { params: Promise.resolve({ id: sessionKey }) });
}

export async function POST(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  if (!/^[A-Z0-9]{6}$/i.test(sessionKey)) return NextResponse.json({ error: "Kode sesi tidak valid." }, { status: 404 });
  try {
    return await joinPublicSession(request, { params: Promise.resolve({ code: sessionKey.toUpperCase() }) });
  } catch (reason) {
    const diagnostic = reason instanceof Error ? { name: reason.name, message: reason.message } : { message: String(reason) };
    console.error("[class-session guest registration] Request failed", { sessionCode: sessionKey.toUpperCase(), ...diagnostic });
    return NextResponse.json({ ok: false, error: "Server belum dapat menyimpan pendaftaran. Coba lagi beberapa saat.", ...(process.env.NODE_ENV !== "production" ? { diagnostic } : {}) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  return updateTutorSession(request, { params: Promise.resolve({ id: sessionKey }) });
}

export async function DELETE(request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await context.params;
  if (/^[A-Z0-9]{6}$/i.test(sessionKey)) return NextResponse.json({ error: "Kode sesi tidak valid untuk penghapusan." }, { status: 400 });
  return deleteTutorSession(request, { params: Promise.resolve({ id: sessionKey }) });
}
