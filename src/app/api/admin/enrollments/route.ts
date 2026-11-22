import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { activateClassesForUser, getClassByIdOrSlug, getEnrollments, revokeClassAccessForUser } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const enrollments = await getEnrollments();
    return NextResponse.json({ ok: true, enrollments });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Gagal memuat enrollment." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await req.json();
    const classId = String(body.classId || "");
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || email).trim();
    if (!classId || !email) return NextResponse.json({ ok: false, error: "classId dan email wajib diisi." }, { status: 400 });
    const cls = await getClassByIdOrSlug(classId);
    if (!cls) return NextResponse.json({ ok: false, error: "Kelas tidak ditemukan." }, { status: 404 });

    const result = await activateClassesForUser({ classIds: [classId], userEmail: email, userName: name, source: "admin" });
    return NextResponse.json({ ok: true, enrollment: result.activated[0] || null, alreadyOwned: result.alreadyOwned.length > 0, verified: true });
  } catch (e: any) {
    console.error("[admin/enrollments POST]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Gagal menyimpan akses kelas." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "ID diperlukan." }, { status: 400 });
    const removed = await revokeClassAccessForUser(id);
    if (!removed) return NextResponse.json({ ok: false, error: "Enrollment tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/enrollments DELETE]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Gagal mencabut akses." }, { status: 500 });
  }
}
