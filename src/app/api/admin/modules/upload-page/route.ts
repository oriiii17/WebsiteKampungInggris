import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { savePrivatePageImage } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const moduleId = String(form.get("moduleId") || "").trim();
    const pageNumber = Number(form.get("pageNumber") || 0);
    const file = form.get("image") as File | null;

    if (!moduleId || pageNumber < 1 || !file) {
      return NextResponse.json(
        { error: "Data halaman gambar tidak lengkap." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = await savePrivatePageImage(
      moduleId,
      pageNumber,
      buffer,
      file.type || "image/webp"
    );

    return NextResponse.json({ ok: true, pageNumber, storagePath });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan gambar halaman." },
      { status: 500 }
    );
  }
}
