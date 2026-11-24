import { NextResponse } from "next/server";
import { getClassByIdOrSlug } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const classId = typeof body.classId === "string" ? body.classId.trim() : "";
    if (!classId) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 400 });
    const classItem = await getClassByIdOrSlug(classId);
    if (!classItem?.isPublished || classItem.priceIdr <= 0) return NextResponse.json({ error: "Kelas ini tidak dapat ditambahkan ke keranjang." }, { status: 404 });
    return NextResponse.json({ ok: true, classId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Kelas belum dapat diverifikasi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
