import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const maxBytes = 2 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > maxBytes) {
    return NextResponse.json({ error: "Pilih gambar JPG, PNG, atau WebP dengan ukuran maksimal 2 MB." }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return NextResponse.json({ error: "Penyimpanan gambar kuis belum siap. Minta admin mengatur Supabase Storage." }, { status: 503 });
  try {
    const client = createSupabaseAdminClient();
    const path = `${randomUUID()}.${file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"}`;
    const { error } = await client.storage.from("quiz-images").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) return NextResponse.json({ error: error.message.includes("Bucket not found") ? "Bucket quiz-images belum tersedia. Jalankan migrasi bucket Supabase Storage." : "Gambar kuis belum berhasil disimpan. Coba lagi." }, { status: 503 });
    const { data } = client.storage.from("quiz-images").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Gambar kuis belum berhasil disimpan. Coba lagi." }, { status: 503 });
  }
}
