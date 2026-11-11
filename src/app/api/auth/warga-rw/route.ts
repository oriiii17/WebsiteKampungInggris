import { NextRequest, NextResponse } from "next/server";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { loginWargaRw } from "@/lib/db";
import { checkRateLimit } from "@/lib/rw-auth";
import { SessionPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  // Rate limiting per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rateCheck.retryAfterSec / 60)} menit.`,
      },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const inputCode = String(body.code || "").trim();
    const namaPanggilan = String(body.nama || "").trim();
    const deviceId = String(body.deviceId || `dev-${Date.now()}`).trim();
    const forceNew = Boolean(body.forceNew); // true jika user pilih "Pakai nama lain"

    if (!inputCode || !namaPanggilan) {
      return NextResponse.json(
        { error: "Mohon isi Nama Panggilan dan Kode RW terlebih dahulu." },
        { status: 400 }
      );
    }

    const result = await loginWargaRw({
      inputCode,
      namaPanggilan: forceNew ? `${namaPanggilan}2` : namaPanggilan,
      deviceId,
      ipHint: ip,
    });

    // Nama bentrok dengan warga lain
    if (result.nameConflict && !forceNew) {
      return NextResponse.json(
        {
          nameConflict: true,
          message: `Nama "${namaPanggilan}" sudah dipakai warga lain di ${result.rw?.rw}. Ini akun kamu, atau pakai nama lain?`,
        },
        { status: 409 }
      );
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const warga = result.warga!;
    const rw = result.rw!;

    const session: SessionPayload = {
      id: warga.id,
      name: warga.namaPanggilan,
      role: "peserta",
      origin: "warga_kode",
      codeUsed: rw.codeDisplay,
      rw: rw.rw,
      rtRw: rw.rw,
      deviceId,
      watermarkText: `${warga.namaPanggilan} · ${rw.rw}`,
      rwForceLogoutAt: rw.forceLogoutAt,
    };

    const res = NextResponse.json({ ok: true, session });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 hari
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
