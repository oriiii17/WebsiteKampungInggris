import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { getClasses, readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { StoredClassSession } from "@/lib/class-session";
import { closeExpiredClassSessions } from "@/lib/close-expired-class-sessions";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() { return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join(""); }
function fromRow(row: any): StoredClassSession {
  return { id: row.id, code: row.code, title: row.title, teacherId: row.teacher_id, teacherName: row.teacher_name,
    status: row.status, requireApproval: row.require_approval, classId: row.class_id, startsAt: row.starts_at || undefined, autoCloseAt: row.auto_close_at || undefined, createdAt: row.created_at, closedAt: row.closed_at || undefined };
}

export async function GET() {
  await closeExpiredClassSessions();
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." }, { status: 401 });
  if (!canManageSessions(session)) return NextResponse.json({ error: "Akun ini belum memiliki akses untuk mengelola sesi. Gunakan akun pengurus atau tutor." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("*").order("created_at", { ascending: false });
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Sesi kelas belum dapat dimuat. Periksa migrasi database." }, { status: 503 });
    const sessions = await Promise.all((data || []).map(async (row) => {
      const { count } = await supabase.from("class_session_attendance").select("id", { count: "exact", head: true }).eq("session_id", row.id);
      const { count: pending } = await supabase.from("class_session_guests").select("id", { count: "exact", head: true }).eq("session_id", row.id).eq("status", "pending");
      const { data: parent } = await supabase.from("classes").select("title,slug").eq("id", row.class_id).maybeSingle();
      return { ...fromRow(row), classTitle: parent?.title || "Kelas belum dipetakan", classSlug: parent?.slug || null, attendeeCount: count || 0, pendingCount: pending || 0 };
    }));
    return NextResponse.json({ sessions });
  }
  const db = await readLocalDb();
  return NextResponse.json({ sessions: (db.classSessions || []).filter((item) => session?.role !== "tutor" || item.teacherId === session.id).map((item) => ({ ...item, classTitle: db.classes?.find((parent) => parent.id === item.classId)?.title || "Kelas belum dipetakan", classSlug: db.classes?.find((parent) => parent.id === item.classId)?.slug || null, attendeeCount: db.classSessionAttendance?.filter((attendance) => attendance.sessionId === item.id).length || 0, pendingCount: db.classSessionGuests?.filter((guest) => guest.sessionId === item.id && guest.status === "pending").length || 0 })) });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." }, { status: 401 });
  if (!canManageSessions(session)) return NextResponse.json({ error: "Akun ini belum memiliki akses untuk mengelola sesi. Gunakan akun pengurus atau tutor." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().replace(/\s+/g, " ");
  if (title.length < 3 || title.length > 100) return NextResponse.json({ error: "Nama sesi harus berisi 3–100 karakter." }, { status: 400 });
  const classId = String(body.classId || "").trim();
  const classes = await getClasses(true);
  const parentClass = classes.find((item) => item.id === classId && item.isPublished && item.status !== "draft");
  if (!parentClass) return NextResponse.json({ error: "Pilih kelas terbit yang valid." }, { status: 400 });
  const startsAtValue = body.startsAt ? Date.parse(String(body.startsAt)) : null;
  if (body.startsAt && (startsAtValue === null || !Number.isFinite(startsAtValue))) return NextResponse.json({ error: "Waktu mulai sesi tidak valid." }, { status: 400 });
  const startsAt = startsAtValue === null ? null : new Date(startsAtValue).toISOString();
  const autoCloseValue = body.autoCloseAt ? Date.parse(String(body.autoCloseAt)) : null;
  if (body.autoCloseAt && (autoCloseValue === null || !Number.isFinite(autoCloseValue))) return NextResponse.json({ error: "Waktu tutup otomatis tidak valid." }, { status: 400 });
  const autoCloseAt = autoCloseValue === null ? null : new Date(autoCloseValue).toISOString();
  if (autoCloseValue !== null && autoCloseValue <= Date.now()) return NextResponse.json({ error: "Waktu tutup otomatis harus di masa mendatang." }, { status: 400 });
  if (startsAtValue !== null && autoCloseValue !== null && autoCloseValue <= startsAtValue) return NextResponse.json({ error: "Waktu tutup otomatis harus setelah waktu mulai sesi." }, { status: 400 });
  const id = randomUUID(); const createdAt = new Date().toISOString(); const code = makeCode();
  const newSession: StoredClassSession = { id, code, title, teacherId: session!.id, teacherName: session!.name,
    status: "open", requireApproval: body.requireApproval === true, classId, startsAt: startsAt || undefined, autoCloseAt: autoCloseAt || undefined, createdAt };
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("class_sessions").insert({
      id, code, title, teacher_id: newSession.teacherId, teacher_name: newSession.teacherName,
      status: "open", require_approval: newSession.requireApproval, class_id: classId,
      starts_at: startsAt, auto_close_at: autoCloseAt, created_at: createdAt,
    }).select("*").single();
    if (error) return NextResponse.json({ error: "Sesi belum dapat dibuat. Terapkan migrasi presensi lalu coba lagi." }, { status: 503 });
    return NextResponse.json({ session: fromRow(data) }, { status: 201 });
  }
  const db = await readLocalDb(); db.classSessions ||= []; db.classSessions.unshift(newSession); await writeLocalDb(db);
  return NextResponse.json({ session: newSession }, { status: 201 });
}
