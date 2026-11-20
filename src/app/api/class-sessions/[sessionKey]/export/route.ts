import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function csvCell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export async function GET(_request: Request, context: { params: Promise<{ sessionKey: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." }, { status: 401 });
  if (!canManageSessions(user)) return NextResponse.json({ error: "Akun ini belum memiliki akses untuk mengelola sesi. Gunakan akun pengurus atau tutor." }, { status: 403 });
  const { sessionKey: id } = await context.params;
  const supabase = await getSupabaseServerClient();
  let title = "Sesi"; let rows: { participant_name: string; participant_type: string; attended_at: string }[] = [];
  if (supabase) {
    let query = supabase.from("class_sessions").select("title,teacher_id").eq("id", id);
    if (user?.role === "tutor") query = query.eq("teacher_id", user.id);
    const { data: session } = await query.maybeSingle();
    if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    title = session.title;
    const { data, error } = await supabase.from("class_session_attendance").select("participant_name,participant_type,attended_at").eq("session_id", id).order("attended_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Daftar hadir belum dapat diekspor." }, { status: 503 });
    rows = data || [];
  } else {
    const db = await readLocalDb(); const session = db.classSessions?.find((item) => item.id === id && (user?.role !== "tutor" || item.teacherId === user.id));
    if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
    title = session.title;
    rows = (db.classSessionAttendance || []).filter((item) => item.sessionId === id).map((item) => ({ participant_name: item.participantName, participant_type: item.participantType, attended_at: item.attendedAt }));
  }
  const content = [["Nama peserta", "Jenis peserta", "Waktu presensi"], ...rows.map((row) => [row.participant_name, row.participant_type === "guest" ? "Tamu" : "Warga", new Date(row.attended_at).toLocaleString("id-ID")])].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const safeTitle = title.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "sesi";
  return new NextResponse(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="presensi-${safeTitle}-${id}.csv"`, "Cache-Control": "no-store" } });
}
