import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads", "games");

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "Ukuran file maksimal 8MB." }, { status: 400 });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    const safe = (file.name || "media").replace(/[^a-zA-Z0-9._-]/g, "_");
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe}`;
    await fs.writeFile(path.join(PUBLIC_DIR, name), buf);
    const url = `/uploads/games/${name}`;
    return NextResponse.json({ ok: true, url, name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal upload." }, { status: 500 });
  }
}
