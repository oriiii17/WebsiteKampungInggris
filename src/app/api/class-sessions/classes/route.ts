import { NextResponse } from "next/server";
import { getServerSession, isTutorSession } from "@/lib/auth";
import { getClasses } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!isTutorSession(session)) return NextResponse.json({ error: "Akses khusus tutor." }, { status: 403 });
  try {
    const classes = await getClasses(true);
    return NextResponse.json({ classes: classes.filter((item) => item.isPublished).map(({ id, title, slug }) => ({ id, title, slug })) });
  } catch (error) {
    console.error("[api/class-sessions/classes]", error);
    return NextResponse.json({ error: "Daftar kelas belum dapat dimuat.", code: "CLASS_LIST_FAILED" }, { status: 503 });
  }
}
