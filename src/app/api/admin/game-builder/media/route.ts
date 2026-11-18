import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const MAX_BYTES = 2 * 1024 * 1024;
const signatures = [
  { mime: "image/png", ext: "png", valid: (bytes: Buffer) => bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  { mime: "image/jpeg", ext: "jpg", valid: (bytes: Buffer) => bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  { mime: "image/webp", ext: "webp", valid: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
];

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Pengurus." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pilih gambar terlebih dahulu." }, { status: 400 });
  if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "Ukuran gambar maksimal 2 MB." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const match = signatures.find((signature) => signature.valid(bytes));
  if (!match) return NextResponse.json({ error: "Gunakan gambar JPG, PNG, atau WebP." }, { status: 415 });
  const gameId = String(form.get("gameId") || "game").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const itemId = String(form.get("itemId") || "item").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const filename = `${gameId}-${itemId}-${randomUUID()}.${match.ext}`;
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const objectPath = `builder/${filename}`;
    const { error } = await supabase.storage.from("game-media").upload(objectPath, bytes, { contentType: match.mime, upsert: false, cacheControl: "31536000" });
    if (error) {
      console.error("[api/admin/game-builder/media] Supabase storage", { code: error.name, message: error.message });
      return NextResponse.json({ error: "Gambar belum dapat diunggah. Periksa konfigurasi penyimpanan.", code: "MEDIA_UPLOAD_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ url: `/api/game-media/${filename}` });
  }
  const directory = path.join(process.cwd(), "data", "uploads", "games");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return NextResponse.json({ url: `/api/game-media/${filename}` });
}
