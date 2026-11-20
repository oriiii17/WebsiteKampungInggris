import { NextResponse } from "next/server";
import { canManageSessions, getServerSession } from "@/lib/auth";
import { getClasses } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." }, { status: 401 });
  if (!canManageSessions(session)) return NextResponse.json({ error: "Akun ini belum memiliki akses untuk mengelola sesi. Gunakan akun pengurus atau tutor." }, { status: 403 });
  try {
    const classes = await getClasses(true);
    const published = classes
      .filter((item) => item.isPublished && item.status !== "draft")
      .map(({ id, title, slug, isPublished, status }) => ({ id, title, slug, isPublished, status }));
    return NextResponse.json({ classes: published }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[api/class-sessions/classes]", error);
    return NextResponse.json({ error: "Daftar kelas terbit belum dapat dimuat. Coba muat ulang atau periksa koneksi database.", code: "CLASS_LIST_FAILED" }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
