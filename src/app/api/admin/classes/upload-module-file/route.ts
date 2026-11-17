import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, saveClassModuleFile } from "@/lib/db";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

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
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(classId) || !/^[a-zA-Z0-9_-]{1,120}$/.test(moduleId)) {
      return NextResponse.json({ error: "ID kelas atau modul tidak valid." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 50 MB." }, { status: 413 });
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "ppt", "pptx"].includes(extension || "")) {
      return NextResponse.json({ error: "Format yang didukung: PDF, PPT, atau PPTX." }, { status: 415 });
    }
    const kelas = await getClassByIdOrSlug(classId);
    if (!kelas || !kelas.modules?.some((module) => module.id === moduleId)) {
      return NextResponse.json({ error: "Kelas atau modul tidak ditemukan." }, { status: 404 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isPdf = extension === "pdf" && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    const isPptx = extension === "pptx" && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const isPpt = extension === "ppt" && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    if (!isPdf && !isPpt && !isPptx) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan format dokumen." }, { status: 415 });
    }
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
