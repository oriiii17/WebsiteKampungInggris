import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,160}\.(?:jpg|png|webp)$/i.test(filename)) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const ext = filename.split(".").pop()!.toLowerCase();
  const headers = { "Content-Type": MIME[ext], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" };
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.storage.from("game-media").download(`builder/${filename}`);
    if (!error && data) return new NextResponse(data, { headers });
  }
  try {
    const root = path.resolve(process.cwd(), "data", "uploads", "games");
    const target = path.resolve(root, filename);
    if (!target.startsWith(`${root}${path.sep}`)) return new NextResponse("Tidak ditemukan.", { status: 404 });
    const bytes = await readFile(target);
    return new NextResponse(bytes, { headers });
  } catch {
    // Existing uploads were written under public before the public media route existed.
    try {
      const legacyRoot = path.resolve(process.cwd(), "public", "uploads", "games");
      const bytes = await readFile(path.resolve(legacyRoot, filename));
      return new NextResponse(bytes, { headers });
    } catch { return new NextResponse("Tidak ditemukan.", { status: 404 }); }
  }
}
