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

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 8 MB." }, { status: 413 });
    }
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Format gambar yang didukung: PNG, JPG, atau WebP." }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const signatureValid = file.type === "image/png"
      ? buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      : file.type === "image/jpeg"
        ? buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
        : buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (!signatureValid) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan format gambar." }, { status: 415 });
    }
    const storagePath = await savePrivatePageImage(
      moduleId,
      pageNumber,
      buffer,
      file.type || "image/webp"
    );

    return NextResponse.json({ ok: true, pageNumber, storagePath });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menyimpan gambar halaman." },
      { status: 500 }
    );
  }
}
