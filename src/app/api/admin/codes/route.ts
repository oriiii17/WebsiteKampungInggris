import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import {
  createAccessCode,
  getAccessCodes,
  updateAccessCodeStatus,
} from "@/lib/db";
import { AccessCode } from "@/lib/types";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }
  const codes = await getAccessCodes();
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rawCode = String(body.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");
    const label = String(body.label || "").trim();
    const rtRw = String(body.rtRw || "RT 01 / RW 01").trim();
    const holderType = body.holderType === "individu" ? "individu" : "keluarga";
    const validDays = Math.max(1, Number(body.validDays || 180));

    if (!rawCode || !label) {
      return NextResponse.json(
        { error: "Kode akses dan Nama Keluarga/Warga wajib diisi." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

    const created = await createAccessCode({
      id: `code-${Date.now()}`,
      code: rawCode,
      label,
      rtRw,
      holderType,
      expiresAt,
      isActive: true,
      createdBy: session.name,
      createdAt: new Date().toISOString(),
    } satisfies AccessCode);

    return NextResponse.json({ ok: true, code: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat kode akses." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  const body = await req.json();
  const codeId = String(body.codeId || "");
  const action = body.action as "toggle" | "delete";
  await updateAccessCodeStatus(codeId, action);
  return NextResponse.json({ ok: true });
}
