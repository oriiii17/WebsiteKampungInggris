import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const BUCKET = "game-media";
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNATURES: Record<string, { mime: string; starts: number[]; extra?: (bytes: Buffer) => boolean }> = {
  png: { mime: "image/png", starts: [0x89, 0x50, 0x4e, 0x47] },
  jpg: { mime: "image/jpeg", starts: [0xff, 0xd8, 0xff] },
  jpeg: { mime: "image/jpeg", starts: [0xff, 0xd8, 0xff] },
  webp: { mime: "image/webp", starts: [0x52, 0x49, 0x46, 0x46], extra: (bytes) => bytes.toString("ascii", 8, 12) === "WEBP" },
  gif: { mime: "image/gif", starts: [0x47, 0x49, 0x46, 0x38], extra: (bytes) => bytes.toString("ascii", 0, 6) === "GIF87a" || bytes.toString("ascii", 0, 6) === "GIF89a" },
};

function errorResponse(context: string, error: { code?: string; message?: string; details?: string; hint?: string }) {
  console.error(`[admin/games/media] ${context}`, { code: error.code, message: error.message, details: error.details, hint: error.hint });
  return NextResponse.json({ error: `Supabase ${error.code || "error"}: ${error.message || "Gagal memproses media."}` }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const gameId = String(form.get("gameId") || "").trim();
    const questionId = String(form.get("questionId") || "").trim();
    if (!(file instanceof File)) return NextResponse.json({ error: "Pilih file gambar terlebih dahulu." }, { status: 400 });
    if (!gameId || !questionId) return NextResponse.json({ error: "Game dan soal harus dipilih sebelum mengunggah gambar." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 413 });

    const ext = file.name.toLowerCase().split(".").pop() || "";
    const signature = SIGNATURES[ext];
    if (!signature || file.type !== signature.mime) return NextResponse.json({ error: "Format yang didukung: JPEG, PNG, WebP, atau GIF." }, { status: 415 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!signature.starts.every((byte, index) => bytes[index] === byte) || signature.extra?.(bytes) === false) {
      return NextResponse.json({ error: "Isi file tidak cocok dengan format gambarnya." }, { status: 415 });
    }

    const safeGameId = gameId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeQuestionId = questionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `games/${safeGameId}/${safeQuestionId}-${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: signature.mime, upsert: false, cacheControl: "31536000" });
    if (error) return errorResponse("Gagal mengunggah objek", error);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl, path });
  } catch (error) {
    console.error("[admin/games/media] Request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengunggah gambar." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });

  const { url, path: suppliedPath } = await req.json().catch(() => ({}));
  let path = typeof suppliedPath === "string" ? suppliedPath : "";
  if (!path && typeof url === "string") {
    const marker = "/storage/v1/object/public/" + BUCKET + "/";
    const index = url.indexOf(marker);
    if (index >= 0) path = decodeURIComponent(url.slice(index + marker.length));
  }
  if (!path.startsWith("games/") || path.split("/").length !== 3 || path.includes("..")) {
    return NextResponse.json({ error: "Lokasi media tidak valid." }, { status: 400 });
  }
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return errorResponse("Gagal menghapus objek", error);
  return NextResponse.json({ ok: true });
}
