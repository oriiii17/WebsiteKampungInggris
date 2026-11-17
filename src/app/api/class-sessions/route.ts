import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession, isTutorSession } from "@/lib/auth";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { StoredClassSession } from "@/lib/class-session";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() { return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join(""); }
function fromRow(row: any): StoredClassSession {
  return { id: row.id, code: row.code, title: row.title, teacherId: row.teacher_id, teacherName: row.teacher_name,
    status: row.status, requireApproval: row.require_approval, capacity: row.capacity,
    materialLinks: row.material_links || [], gameIds: row.game_ids || [], createdAt: row.created_at, closedAt: row.closed_at || undefined };
}

export async function GET() {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from("class_sessions").select("*").order("created_at", { ascending: false });
    if (session?.role === "tutor") query = query.eq("teacher_id", session.id);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Sesi kelas belum dapat dimuat. Periksa migrasi database." }, { status: 503 });
    const sessions = await Promise.all((data || []).map(async (row) => {
      const { count } = await supabase.from("class_session_attendance").select("id", { count: "exact", head: true }).eq("session_id", row.id);
      const { count: pending } = await supabase.from("class_session_guests").select("id", { count: "exact", head: true }).eq("session_id", row.id).eq("status", "pending");
      return { ...fromRow(row), attendeeCount: count || 0, pendingCount: pending || 0 };
    }));
    return NextResponse.json({ sessions });
  }
  const db = await readLocalDb();
  return NextResponse.json({ sessions: (db.classSessions || []).filter((item) => session?.role !== "tutor" || item.teacherId === session.id).map((item) => ({ ...item, attendeeCount: db.classSessionAttendance?.filter((attendance) => attendance.sessionId === item.id).length || 0, pendingCount: db.classSessionGuests?.filter((guest) => guest.sessionId === item.id && guest.status === "pending").length || 0 })) });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().replace(/\s+/g, " ");
  if (title.length < 3 || title.length > 100) return NextResponse.json({ error: "Nama sesi harus berisi 3–100 karakter." }, { status: 400 });
  const rawCapacity = body.capacity === "" || body.capacity === null || body.capacity === undefined ? null : Number(body.capacity);
  if (rawCapacity !== null && (!Number.isInteger(rawCapacity) || rawCapacity < 1 || rawCapacity > 500)) return NextResponse.json({ error: "Kuota harus berupa angka antara 1 dan 500." }, { status: 400 });
  const materialLinks = Array.isArray(body.materialLinks) ? body.materialLinks.map((value: unknown) => String(value).trim()).filter(Boolean).slice(0, 10) : [];
  if (materialLinks.some((value: string) => { try { return !["http:", "https:"].includes(new URL(value).protocol); } catch { return true; } })) return NextResponse.json({ error: "Tautan materi harus menggunakan alamat HTTP atau HTTPS yang valid." }, { status: 400 });
  const gameIds: string[] = Array.isArray(body.gameIds) ? Array.from(new Set<string>((body.gameIds as unknown[]).map(String))).slice(0, 10) : [];
  const id = randomUUID(); const createdAt = new Date().toISOString(); const code = makeCode();
  const newSession: StoredClassSession = { id, code, title, teacherId: session!.id, teacherName: session!.name,
    status: "open", requireApproval: body.requireApproval === true, capacity: rawCapacity,
    materialLinks, gameIds, createdAt };
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("class_sessions").insert({
      id, code, title, teacher_id: newSession.teacherId, teacher_name: newSession.teacherName,
      status: "open", require_approval: newSession.requireApproval, capacity: rawCapacity,
      material_links: materialLinks, game_ids: gameIds, created_at: createdAt,
    }).select("*").single();
    if (error) return NextResponse.json({ error: "Sesi belum dapat dibuat. Terapkan migrasi presensi lalu coba lagi." }, { status: 503 });
    return NextResponse.json({ session: fromRow(data) }, { status: 201 });
  }
  const db = await readLocalDb(); db.classSessions ||= []; db.classSessions.unshift(newSession); await writeLocalDb(db);
  return NextResponse.json({ session: newSession }, { status: 201 });
}
