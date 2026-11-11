import { NextRequest, NextResponse } from "next/server";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { validateAndBindWargaCode } from "@/lib/db";
import { SessionPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const deviceId = String(body.deviceId || `dev-${Date.now()}`).trim();

    if (!code || !name) {
      return NextResponse.json(
        { error: "Mohon isi Nama Panggilan dan Kode Akses Warga terlebih dahulu." },
        { status: 400 }
      );
    }

    const ua = req.headers.get("user-agent") || "Browser";
    const deviceLabel = ua.includes("Mobile") ? "HP / Mobile Browser" : "Laptop / Desktop Browser";

    const result = await validateAndBindWargaCode({
      codeInput: code,
      participantName: name,
      deviceId,
      deviceLabel,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const ac = result.accessCode;
    const session: SessionPayload = {
      id: `warga-${ac.code}-${deviceId.slice(0, 8)}`,
      name,
      role: "peserta",
      origin: "warga_kode",
      codeUsed: ac.code,
      rtRw: ac.rtRw,
      deviceId,
      expiresAt: ac.expiresAt,
      watermarkText: `WARGA SAPEN • ${ac.code} • ${name}`,
    };

    const res = NextResponse.json({ ok: true, session });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
