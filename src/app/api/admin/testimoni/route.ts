import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getApprovedTestimoni, addTestimoni, updateTestimoniStatus, deleteTestimoni } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const session = await getServerSession();

  if (all) {
    if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const { readLocalDb } = await import("@/lib/db");
    const db = await readLocalDb();
    return NextResponse.json({ testimoni: db.testimoni || [] });
  }

  const testimoni = await getApprovedTestimoni();
  return NextResponse.json({ testimoni });
}

export async function POST(req: NextRequest) {
  // Hanya user yang sudah login yang boleh submit testimoni
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Anda harus login untuk mengirim ulasan." }, { status: 401 });

  const body = await req.json();
  const { nama, komentar } = body;
  if (!nama || !komentar) return NextResponse.json({ error: "Nama dan komentar wajib diisi." }, { status: 400 });
  const rec = await addTestimoni({ nama: String(nama).trim(), rw: "", komentar: String(komentar).trim() });
  return NextResponse.json({ ok: true, id: rec.id });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { id, isApproved } = await req.json();
  const ok = await updateTestimoniStatus(id, Boolean(isApproved));
  return NextResponse.json({ ok });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan." }, { status: 400 });
  const ok = await deleteTestimoni(id);
  return NextResponse.json({ ok });
}
