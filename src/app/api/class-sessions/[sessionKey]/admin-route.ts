import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { closeSessionGame, getLiveSession } from "@/lib/game-session";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!canManageSessions(session)) return NextResponse.json({ error: "Sesi ini hanya dapat dikelola oleh pengurus atau tutor. Silakan masuk dengan akun yang sesuai." }, { status: 403 });
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("*").eq("id", id);
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data: row, error } = await query.maybeSingle();
    if (error || !row) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    const [{ data: attendees }, { data: guests }, { data: gameLinks }] = await Promise.all([
      supabase.from("class_session_attendance").select("id,participant_name,participant_type,attended_at").eq("session_id", id).order("attended_at", { ascending: true }),
      supabase.from("class_session_guests").select("id,full_name,whatsapp,status,registered_at").eq("session_id", id).order("registered_at", { ascending: false }),
      supabase.from("class_session_games").select("game_id,live_pin,live_status").eq("session_id", id),
    ]);
    const gameIds = (gameLinks || []).map((link) => link.game_id);
    const { data: gameRows } = gameIds.length ? await supabase.from("game_blueprints").select("id,title,template,level").in("id", gameIds).eq("status", "session") : { data: [] };
    const liveByGame = new Map((gameLinks || []).map((link) => [link.game_id, { livePin: link.live_pin, liveStatus: link.live_status }]));
    return NextResponse.json({ session: row, attendees: attendees || [], guests: guests || [], games: (gameRows || []).map((game) => ({ ...game, ...liveByGame.get(game.id) })) });
  }
  const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.id === id && (session?.role !== "tutor" || item.teacherId === session.id));
  if (!local) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  const gameIds = (db.classSessionGames || []).filter((item) => item.sessionId === id).map((item) => item.gameId);
  const linkByGame = new Map((db.classSessionGames || []).filter((item) => item.sessionId === id).map((item) => [item.gameId, item]));
  const games = (db.gameBlueprints || []).filter((game) => gameIds.includes(game.id) && game.status === "session").map(({ id: gameId, title, template, level }) => ({ id: gameId, title, template, level, livePin: linkByGame.get(gameId)?.livePin || null, liveStatus: linkByGame.get(gameId)?.liveStatus || null }));
  return NextResponse.json({ session: local, attendees: db.classSessionAttendance?.filter((item) => item.sessionId === id) || [], guests: db.classSessionGuests?.filter((item) => item.sessionId === id) || [], games });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!canManageSessions(session)) return NextResponse.json({ error: "Sesi ini hanya dapat dikelola oleh pengurus atau tutor. Silakan masuk dengan akun yang sesuai." }, { status: 403 });
  const { id } = await context.params; const body = await request.json().catch(() => ({}));
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("id,teacher_id,status").eq("id", id);
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data: owner } = await query.maybeSingle();
    if (!owner) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    if (body.action === "set-games") {
      if (owner.status !== "open") return NextResponse.json({ error: "Game hanya dapat diatur pada sesi yang masih aktif." }, { status: 409 });
      const gameIds = Array.isArray(body.gameIds) ? [...new Set(body.gameIds.filter((value: unknown): value is string => typeof value === "string" && value.length <= 100))].slice(0, 30) : [];
      const { error } = await supabase.rpc("set_class_session_games", { p_session_id: id, p_game_ids: gameIds });
      if (error) {
        const migrationMissing = ["42883", "42P01", "PGRST202", "PGRST205"].includes(error.code || "");
        return NextResponse.json({ error: migrationMissing ? "Penyimpanan game sesi belum tersedia. Terapkan migrasi game sesi terlebih dahulu." : "Game sesi belum dapat disimpan. Periksa kembali pilihan game lalu coba lagi." }, { status: 503 });
      }
      return NextResponse.json({ ok: true, gameIds });
    }
    if (body.action === "close") {
      const { data: links } = await supabase.from("class_session_games").select("game_id,live_pin").eq("session_id", id).not("live_pin", "is", null);
      for (const link of links || []) {
        if (!link.live_pin) continue;
        const live = getLiveSession(link.live_pin);
        if (live && live.status !== "closed") closeSessionGame(live.pin, live.hostId);
        await supabase.from("game_sessions").update({ status: "closed", updated_at: new Date().toISOString() }).eq("pin", link.live_pin);
      }
      await supabase.from("class_session_games").update({ live_status: "closed" }).eq("session_id", id).not("live_pin", "is", null);
      const { error } = await supabase.from("class_sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
      if (error) return NextResponse.json({ error: "Sesi belum dapat ditutup." }, { status: 503 });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "approve" && typeof body.registrationId === "string") {
      const { data, error } = await supabase.rpc("approve_class_session_guest", { p_registration_id: body.registrationId, p_session_id: id });
      if (error || data !== true) return NextResponse.json({ error: "Peserta belum dapat disetujui. Periksa kuota sesi." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "reject" && typeof body.registrationId === "string") {
      const { error } = await supabase.from("class_session_guests").update({ status: "rejected" }).eq("id", body.registrationId).eq("session_id", id).eq("status", "pending");
      if (error) return NextResponse.json({ error: "Pendaftaran tamu belum dapat ditolak." }, { status: 503 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }
  const db = await readLocalDb(); const local = db.classSessions?.find((item) => item.id === id && (session?.role !== "tutor" || item.teacherId === session.id));
  if (!local) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (body.action === "set-games") {
    if (local.status !== "open") return NextResponse.json({ error: "Game hanya dapat diatur pada sesi yang masih aktif." }, { status: 409 });
    const gameIds: string[] = Array.isArray(body.gameIds) ? [...new Set<string>(body.gameIds.filter((value: unknown): value is string => typeof value === "string" && value.length <= 100))].slice(0, 30) : [];
    const availableIds = new Set<string>((db.gameBlueprints || []).filter((game) => game.status === "session").map((game) => String(game.id)));
    if (gameIds.some((gameId) => !availableIds.has(gameId))) return NextResponse.json({ error: "Pilih hanya game yang berstatus Sesi." }, { status: 400 });
    db.classSessionGames = (db.classSessionGames || []).filter((item) => item.sessionId !== id || gameIds.includes(item.gameId));
    const existing = new Set<string>(db.classSessionGames.filter((item) => item.sessionId === id).map((item) => String(item.gameId)));
    db.classSessionGames.push(...gameIds.filter((gameId) => !existing.has(gameId)).map((gameId) => ({ sessionId: id, gameId, livePin: null, liveStatus: null })));
    await writeLocalDb(db);
    return NextResponse.json({ ok: true, gameIds });
  }
  if (body.action === "close") {
    for (const link of db.classSessionGames || []) {
      if (link.sessionId !== id || !link.livePin) continue;
      const live = getLiveSession(link.livePin);
      if (live && live.status !== "closed") closeSessionGame(live.pin, live.hostId);
      link.liveStatus = "closed";
    }
    local.status = "closed"; local.closedAt = new Date().toISOString(); await writeLocalDb(db); return NextResponse.json({ ok: true });
  }
  if (body.action === "approve" && typeof body.registrationId === "string") {
    const guest = db.classSessionGuests?.find((item) => item.id === body.registrationId && item.sessionId === id);
    if (!guest) return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    const attendance = db.classSessionAttendance ||= [];
    guest.status = "approved";
    if (!attendance.some((item) => item.guestRegistrationId === guest.id)) attendance.push({ id: crypto.randomUUID(), sessionId: id, participantKey: `guest:${guest.id}`, participantName: guest.name, participantType: "guest", guestRegistrationId: guest.id, whatsapp: guest.whatsapp, attendedAt: new Date().toISOString() });
    await writeLocalDb(db); return NextResponse.json({ ok: true });
  }
  if (body.action === "reject" && typeof body.registrationId === "string") {
    const guest = db.classSessionGuests?.find((item) => item.id === body.registrationId && item.sessionId === id);
    if (!guest) return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    guest.status = "rejected";
    await writeLocalDb(db); return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!canManageSessions(session)) return NextResponse.json({ error: "Sesi ini hanya dapat dikelola oleh pengurus atau tutor. Silakan masuk dengan akun yang sesuai." }, { status: 403 });
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("id,status").eq("id", id);
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data: owned, error: lookupError } = await query.maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Status sesi belum dapat diperiksa. Coba lagi." }, { status: 503 });
    if (!owned) return NextResponse.json({ error: "Sesi tidak ditemukan atau bukan sesi yang dapat Anda kelola." }, { status: 404 });
    if (owned.status === "open") return NextResponse.json({ error: "Sesi masih terbuka. Tutup sesi terlebih dahulu sebelum menghapusnya." }, { status: 409 });
    const { data: deleted, error } = await supabase.from("class_sessions").delete().eq("id", id).eq("status", "closed").select("id");
    if (error) return NextResponse.json({ error: "Sesi belum dapat dihapus. Coba lagi." }, { status: 503 });
    if (!deleted?.length) return NextResponse.json({ error: "Status sesi berubah. Muat ulang riwayat sebelum menghapus." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  const db = await readLocalDb();
  const index = (db.classSessions || []).findIndex((item) => item.id === id && (session?.role !== "tutor" || item.teacherId === session.id));
  if (index < 0) return NextResponse.json({ error: "Sesi tidak ditemukan atau bukan sesi yang dapat Anda kelola." }, { status: 404 });
  if (db.classSessions![index].status === "open") return NextResponse.json({ error: "Sesi masih terbuka. Tutup sesi terlebih dahulu sebelum menghapusnya." }, { status: 409 });
  db.classSessions!.splice(index, 1);
  db.classSessionGuests = (db.classSessionGuests || []).filter((item) => item.sessionId !== id);
  db.classSessionAttendance = (db.classSessionAttendance || []).filter((item) => item.sessionId !== id);
  await writeLocalDb(db);
  return NextResponse.json({ ok: true });
}
