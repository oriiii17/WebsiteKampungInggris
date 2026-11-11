import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { saveClassModuleFile } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const classId = String(form.get("classId") || "").trim();
    const moduleId = String(form.get("moduleId") || "").trim();
    const file = form.get("file") as File | null;
    if (!classId || !moduleId || !file) {
      return NextResponse.json({ error: "Data upload tidak lengkap." }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await saveClassModuleFile({
      classId,
      moduleId,
      buffer,
      mimeType: file.type || "application/octet-stream",
      originalName: file.name || "modul",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengunggah file modul." }, { status: 500 });
  }
}