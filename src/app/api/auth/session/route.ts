import { NextResponse } from "next/server";
import {
  encodeSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
  hashPassword,
} from "@/lib/auth";
import { getActiveSubscriptionForEmail, readLocalDb, writeLocalDb } from "@/lib/db";
import { SessionPayload } from "@/lib/types";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ session: null });

  if (session.role === "peserta" && session.email) {
    const activeSub = await getActiveSubscriptionForEmail(session.email);
    const updated: SessionPayload = activeSub
      ? { ...session, origin: "luar_langganan", expiresAt: activeSub.expiresAt, watermarkText: session.name + " - " + session.email }
      : { ...session, origin: "luar_belum_aktif", expiresAt: undefined };

    const res = NextResponse.json({ session: updated });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  return NextResponse.json({ session });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "update_name") {
      const name = String(body.name || "").trim();
      if (name.length < 2) return NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 });
      const updated: SessionPayload = { ...session, name, watermarkText: session.watermarkText?.includes("-") ? (name + " - " + (session.email || session.codeUsed || "")).trim() : (session.watermarkText || name) };
      const res = NextResponse.json({ ok: true, session: updated });
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      return res;
    }

    if (action === "update_password") {
      const password = String(body.password || "");
      if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
      const email = (session.email || "").toLowerCase();
      if (!email) return NextResponse.json({ error: "Akun ini tidak memiliki password untuk diganti." }, { status: 400 });
      const db = await readLocalDb();
      const user = db.externalUsers?.find((u) => u.email.toLowerCase() === email);
      if (!user) return NextResponse.json({ error: "Password tidak dapat diganti untuk jenis akun ini." }, { status: 400 });
      user.passwordHash = hashPassword(password);
      await writeLocalDb(db);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui akun." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0) });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
