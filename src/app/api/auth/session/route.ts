import { NextResponse } from "next/server";
import {
  encodeSessionToken,
  GUEST_SESSION_COOKIE_NAME,
  getGuestServerSession,
  getServerSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { getActiveSubscriptionForEmail, readLocalDb, writeLocalDb } from "@/lib/db";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SessionPayload } from "@/lib/types";
import { isHttpsRequest } from "@/lib/request-security";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/supabase-server";
import { getGuestApprovalStatus } from "@/lib/guest-approval";

function canEditAccount(session: SessionPayload) {
  if (["admin", "pengurus", "developer"].includes(session.role)) return true;
  return Boolean(session.email && session.emailVerified === true && ["peserta", "umum", "member"].includes(session.role));
}

export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope");
  if (scope === "attendance") {
    const session = (await getServerSession()) || await getGuestServerSession();
    const approvalStatus = session?.guestSessionId
      ? await getGuestApprovalStatus(session)
      : null;
    return NextResponse.json({ session, approvalStatus }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  if (scope === "guest") {
    const guestSession = await getGuestServerSession();
    const approvalStatus = guestSession ? await getGuestApprovalStatus(guestSession) : null;
    return NextResponse.json({ session: guestSession, approvalStatus }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const session = await getServerSession();
  if (!session) return NextResponse.json({ session: null });

  if ((session.role === "peserta" || session.role === "umum") && session.email) {
    const activeSub = await getActiveSubscriptionForEmail(session.email);
    const updated: SessionPayload = activeSub
      ? { ...session, origin: "luar_langganan", expiresAt: activeSub.expiresAt, watermarkText: session.name + " - " + session.email }
      : { ...session, origin: "luar_belum_aktif", expiresAt: undefined };

    const res = NextResponse.json({ session: updated });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), sessionCookieOptions(updated, isHttpsRequest(req)));
    return res;
  }

  return NextResponse.json({ session });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: "Belum login." }, { status: 401 });
  try {
    const body = await req.json();
    const action = body.action as string;

    if (["update_profile", "update_name", "update_password"].includes(action) && body.sessionId !== session.id) {
      return NextResponse.json({ ok: false, error: "Sesi akun berubah. Muat ulang halaman sebelum melanjutkan." }, { status: 409 });
    }

    if (action === "clear_class_session") {
      const updated: SessionPayload = { ...session };
      delete updated.guestSessionId;
      delete updated.guestRegistrationId;
      delete updated.guestClassHref;
      const res = NextResponse.json({ ok: true, session: updated });
      updated.lastActivityAt = Date.now();
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), sessionCookieOptions(updated, isHttpsRequest(req)));
      return res;
    }

    if (action === "update_profile") {
      if (!canEditAccount(session)) return NextResponse.json({ ok: false, error: "Akun Kode Akses belum dapat mengubah profil. Buat akun permanen dan verifikasi email terlebih dahulu." }, { status: 403 });
      const name = String(body.name || "").trim();
      if (name.length < 2) return NextResponse.json({ ok: false, error: "Nama minimal 2 karakter." }, { status: 400 });
      const avatarDataUrl = typeof body.avatarDataUrl === "string" ? body.avatarDataUrl : undefined;
      if (avatarDataUrl) {
        if (!/^data:image\/(png|jpeg|jpg);base64,/i.test(avatarDataUrl)) {
          return NextResponse.json({ ok: false, error: "Foto harus berformat JPG atau PNG." }, { status: 400 });
        }
        const b64 = avatarDataUrl.split(",")[1] || "";
        const size = Math.floor((b64.length * 3) / 4);
        if (size > 10 * 1024 * 1024) {
          return NextResponse.json({ ok: false, error: "Ukuran foto maksimal 10MB." }, { status: 400 });
        }
        const imageBytes = Buffer.from(b64, "base64");
        const isPng = /^data:image\/png;base64,/i.test(avatarDataUrl) && imageBytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        const isJpeg = /^data:image\/(?:jpeg|jpg);base64,/i.test(avatarDataUrl) && imageBytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
        if (!isPng && !isJpeg) {
          return NextResponse.json({ ok: false, error: "Isi foto tidak sesuai dengan format PNG atau JPG." }, { status: 415 });
        }
      }
      const db = await readLocalDb();
      const email = (session.email || "").toLowerCase();
      if (email) {
        db.externalUsers ||= [];
        const authUserId = session.authUserId || session.id;
        let user = db.externalUsers.find((entry) => entry.email.toLowerCase() === email);
        if (!user) {
          user = { id: authUserId, name, email, passwordHash: "", createdAt: new Date().toISOString() };
          db.externalUsers.push(user);
        }
        user.name = name;
        if (avatarDataUrl) user.avatarDataUrl = avatarDataUrl;
        await writeLocalDb(db);

        if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
          const admin = createSupabaseAdminClient();
          await admin.auth.admin.updateUserById(authUserId, { user_metadata: { full_name: name } });
          await admin.from("profiles").update({ full_name: name }).eq("id", authUserId);
        }
      }
      const updated: SessionPayload = { ...session, name, lastActivityAt: Date.now(), watermarkText: session.watermarkText?.includes(" - ") ? `${name} - ${(session.email || session.codeUsed || "")}`.trim() : (session.watermarkText || name) };
      delete updated.avatarDataUrl;
      const res = NextResponse.json({ ok: true, session: updated });
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), sessionCookieOptions(updated, isHttpsRequest(req)));
      return res;
    }

    if (action === "update_name") {
      if (!canEditAccount(session)) return NextResponse.json({ ok: false, error: "Akun Kode Akses belum dapat mengubah profil. Buat akun permanen dan verifikasi email terlebih dahulu." }, { status: 403 });
      const name = String(body.name || "").trim();
      if (name.length < 2) return NextResponse.json({ ok: false, error: "Nama minimal 2 karakter." }, { status: 400 });
      const updated: SessionPayload = { ...session, name, lastActivityAt: Date.now(), watermarkText: session.watermarkText?.includes(" - ") ? `${name} - ${(session.email || session.codeUsed || "")}`.trim() : (session.watermarkText || name) };
      const res = NextResponse.json({ ok: true, session: updated });
      res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(updated), sessionCookieOptions(updated, isHttpsRequest(req)));
      return res;
    }

    if (action === "update_password") {
      if (!canEditAccount(session)) return NextResponse.json({ ok: false, error: "Akun Kode Akses belum dapat mengubah kata sandi. Buat akun permanen dan verifikasi email terlebih dahulu." }, { status: 403 });
      const oldPassword = String(body.oldPassword || "");
      const password = String(body.password || body.newPassword || "");
      const confirm = body.confirmPassword != null ? String(body.confirmPassword) : null;
      if (!oldPassword) return NextResponse.json({ ok: false, error: "Kata sandi lama wajib diisi." }, { status: 400 });
      if (password.length < 8) return NextResponse.json({ ok: false, error: "Kata sandi baru minimal 8 karakter." }, { status: 400 });
      if (confirm !== null && password !== confirm) return NextResponse.json({ ok: false, error: "Konfirmasi kata sandi baru tidak cocok." }, { status: 400 });
      const email = (session.email || "").toLowerCase();
      if (!email) return NextResponse.json({ ok: false, error: "Akun ini tidak memiliki password untuk diganti." }, { status: 400 });
      const supabase = createPublicSupabaseClient();
      if (!supabase) return NextResponse.json({ ok: false, error: "Layanan akun belum tersedia." }, { status: 503 });
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      const accountUserId = session.authUserId || session.id;
      if (authError || !authData.user || authData.user.id !== accountUserId || !authData.session) {
        return NextResponse.json({ ok: false, error: "Kata sandi lama salah." }, { status: 400 });
      }
      const { error: setSessionError } = await supabase.auth.setSession({ access_token: authData.session.access_token, refresh_token: authData.session.refresh_token });
      if (setSessionError) return NextResponse.json({ ok: false, error: "Sesi verifikasi kata sandi belum dapat disiapkan. Coba lagi." }, { status: 400 });
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) return NextResponse.json({ ok: false, error: "Kata sandi baru belum dapat disimpan." }, { status: 400 });
      return NextResponse.json({ ok: true, message: "Kata sandi berhasil diperbarui." });
    }

    return NextResponse.json({ ok: false, error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (e: any) {
    console.error("[auth/session PATCH]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Gagal memperbarui akun." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  if (new URL(req.url).searchParams.get("scope") === "guest") {
    res.cookies.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: isHttpsRequest(req), path: "/", maxAge: 0, expires: new Date(0) });
    res.cookies.delete(GUEST_SESSION_COOKIE_NAME);
    return res;
  }
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: isHttpsRequest(req), path: "/", maxAge: 0, expires: new Date(0) });
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.set(SUPABASE_ACCESS_TOKEN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isHttpsRequest(req), path: "/", maxAge: 0, expires: new Date(0) });
  res.cookies.delete(SUPABASE_ACCESS_TOKEN_COOKIE);
  res.cookies.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: isHttpsRequest(req), path: "/", maxAge: 0, expires: new Date(0) });
  res.cookies.delete(GUEST_SESSION_COOKIE_NAME);
  return res;
}
