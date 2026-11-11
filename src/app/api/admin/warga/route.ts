import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getAllWarga, setWargaBlocked, deleteWarga, updateWargaNama, resetWargaStats } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const warga = await getAllWarga();
  return NextResponse.json({ warga });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { id, action, namaBaru } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });

  if (action === "block") await setWargaBlocked(id, true);
  else if (action === "unblock") await setWargaBlocked(id, false);
  else if (action === "rename") {
    if (!namaBaru || typeof namaBaru !== "string" || namaBaru.trim().length < 3) {
      return NextResponse.json({ error: "Nama baru minimal 3 karakter." }, { status: 400 });
    }
    await updateWargaNama(id, namaBaru.trim());
  } else if (action === "reset") {
    await resetWargaStats(id);
  } else {
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan." }, { status: 400 });
  const ok = await deleteWarga(id);
  return NextResponse.json({ ok });
}
