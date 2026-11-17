import { NextResponse } from "next/server";
import { getServerSession, isTutorSession } from "@/lib/auth";
import { getClasses } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
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
