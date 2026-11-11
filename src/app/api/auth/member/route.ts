import { NextRequest, NextResponse } from "next/server";
import {
  encodeSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import {
  getActiveSubscriptionForEmail,
  readLocalDb,
  writeLocalDb,
} from "@/lib/db";
import { SessionPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body.mode === "register" ? "register" : "login";
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !email.includes("@") || password.length < 4) {
      return NextResponse.json(
        { error: "Masukkan email yang valid dan kata sandi minimal 4 karakter." },
        { status: 400 }
      );
    }

    const db = await readLocalDb();
    let user = db.externalUsers.find((u) => u.email.toLowerCase() === email);

    if (mode === "register") {
      if (!name) {
        return NextResponse.json(
          { error: "Mohon isi Nama Lengkap Anda untuk mendaftar." },
          { status: 400 }
        );
      }
      if (user) {
        return NextResponse.json(
          { error: "Email ini sudah terdaftar. Silakan pilih menu Masuk." },
          { status: 409 }
        );
      }
      user = {
        id: `usr-${Date.now()}`,
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      db.externalUsers.push(user);
      await writeLocalDb(db);
    } else {
      if (!user || user.passwordHash !== hashPassword(password)) {
        return NextResponse.json(
          { error: "Email atau kata sandi belum sesuai." },
          { status: 401 }
        );
      }
    }

    const activeSub = await getActiveSubscriptionForEmail(email);

    const session: SessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "peserta",
      origin: activeSub ? "luar_langganan" : "luar_belum_aktif",
      expiresAt: activeSub?.expiresAt,
      watermarkText: `${user.name} • ${user.email}`,
    };

    const res = NextResponse.json({
      ok: true,
      session,
      hasActiveSubscription: Boolean(activeSub),
    });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses akun." },
      { status: 500 }
    );
  }
}
