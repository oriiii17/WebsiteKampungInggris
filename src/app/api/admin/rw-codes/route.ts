import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getRwCodes, updateRwCode } from "@/lib/db";
import { generateRwCode } from "@/lib/rw-auth";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const codes = await getRwCodes();
  // Kirim tampilan kode tapi BUKAN hash
  return NextResponse.json({
    codes: codes.map((c) => ({
      rw: c.rw,
      codeDisplay: c.codeDisplay,
      isActive: c.isActive,
      updatedAt: c.updatedAt,
      forceLogoutAt: c.forceLogoutAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const { rw, newCode: rawCode, generateNew, forceLogout } = await req.json();
  if (!rw || !["RW 06", "RW 07", "RW 08"].includes(rw)) {
    return NextResponse.json({ error: "RW tidak valid." }, { status: 400 });
  }

  const plainCode = generateNew ? generateRwCode() : String(rawCode || "").trim();
  if (!plainCode) return NextResponse.json({ error: "Kode baru tidak boleh kosong." }, { status: 400 });

  const updated = await updateRwCode(rw, plainCode, Boolean(forceLogout));
  return NextResponse.json({ ok: true, codeDisplay: updated.codeDisplay });
}
