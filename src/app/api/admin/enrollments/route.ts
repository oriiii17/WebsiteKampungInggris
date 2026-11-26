import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { activateClassesForUser, expireClassAccessForUser, getClassByIdOrSlug, getEnrollments, revokeClassAccessForUser } from "@/lib/db";

function revalidateClassAccessViews() {
  revalidateTag("public-classes");
  revalidatePath("/kelas");
  revalidatePath("/admin");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(params.get("perPage") || 20)));
    const query = (params.get("search") || "").trim().toLocaleLowerCase("id-ID");
    const classId = params.get("classId") || "all";
    const payment = params.get("payment") || "all";
    const sort = params.get("sort") || "newest";
    const filtered = (await getEnrollments()).filter((entry) =>
      (!query || `${entry.userName} ${entry.userEmail}`.toLocaleLowerCase("id-ID").includes(query)) &&
      (classId === "all" || entry.classId === classId) &&
      (payment === "all" || (payment === "free" ? Number(entry.paidAmountIdr || 0) === 0 : Number(entry.paidAmountIdr || 0) > 0))
    );
    filtered.sort((a, b) => sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const currentPage = Math.min(page, pages);
    return NextResponse.json({ ok: true, enrollments: filtered.slice((currentPage - 1) * size, currentPage * size), total, page: currentPage, perPage: size, pages });
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
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || email).trim();
    if (!classId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Pilih kelas dan masukkan email akun yang valid." }, { status: 400 });
    const cls = await getClassByIdOrSlug(classId);
    if (!cls) return NextResponse.json({ ok: false, error: "Kelas tidak ditemukan." }, { status: 404 });

    const result = await activateClassesForUser({ classIds: [classId], userEmail: email, userName: name, source: "admin", paidAmountIdr: cls.priceIdr });
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
    revalidateClassAccessViews();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/enrollments DELETE]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Gagal mencabut akses." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action !== "revoke" || typeof body.id !== "string") return NextResponse.json({ ok: false, error: "Aksi pencabutan tidak valid." }, { status: 400 });
    const revoked = await expireClassAccessForUser(body.id);
    if (!revoked) return NextResponse.json({ ok: false, error: "Akses kelas tidak ditemukan atau sudah dicabut." }, { status: 404 });
    revalidateClassAccessViews();
    return NextResponse.json({ ok: true, revoked: true });
  } catch (e: any) {
    console.error("[admin/enrollments PATCH]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Gagal mencabut akses kelas." }, { status: 500 });
  }
}
