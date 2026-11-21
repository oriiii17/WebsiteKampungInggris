import { NextRequest, NextResponse } from "next/server";
import {
  encodeSessionToken,
  GUEST_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { getActiveSubscriptionForEmail } from "@/lib/db";
import { SessionPayload } from "@/lib/types";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { isHttpsRequest } from "@/lib/request-security";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const limit = checkApiRateLimit(`member:${getRequestIp(req)}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan masuk. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (body.mode === "register") {
      return NextResponse.json({ error: "Gunakan alur pendaftaran peserta umum." }, { status: 400 });
    }

    if (!email || !email.includes("@") || password.length < 4) {
      return NextResponse.json(
        { error: "Masukkan email yang valid dan kata sandi minimal 4 karakter." },
        { status: 400 }
      );
    }

    const authClient = createPublicSupabaseClient();
    if (!authClient) {
      return NextResponse.json({ error: "Layanan login belum tersedia." }, { status: 503 });
    }
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Email atau kata sandi belum sesuai." },
        { status: 401 }
      );
    }

    const profile = await authClient.from("profiles").select("full_name,role,origin_type").eq("id", authData.user.id).maybeSingle();
    const role = profile.data?.role || authData.user.user_metadata?.role;
    if (role !== "umum" && role !== "peserta" && role !== "tutor") {
      return NextResponse.json({ error: "Akun ini tidak dapat masuk melalui Peserta Umum." }, { status: 403 });
    }
    const authName = profile.data?.full_name || String(authData.user.user_metadata?.full_name || email.split("@")[0]);

    const isWargaAccount = profile.data?.origin_type === "warga" || authData.user.user_metadata?.origin_type === "warga_kode";
    const wargaId = typeof authData.user.user_metadata?.warga_id === "string" ? authData.user.user_metadata.warga_id : undefined;
    const activeSub = isWargaAccount ? null : await getActiveSubscriptionForEmail(email);
    const metadataRw = String(authData.user.user_metadata?.rw || "");
    const rw = ["RW 06", "RW 07", "RW 08"].includes(metadataRw) ? metadataRw as SessionPayload["rw"] : undefined;

    const session: SessionPayload = {
      id: isWargaAccount && wargaId ? wargaId : authData.user.id,
      name: authName,
      email,
      role,
      origin: role === "tutor" ? "tutor" : isWargaAccount ? "warga_kode" : activeSub ? "luar_langganan" : "luar_belum_aktif",
      ...(isWargaAccount ? { rw, rtRw: typeof authData.user.user_metadata?.rt_rw === "string" ? authData.user.user_metadata.rt_rw : undefined } : {}),
      expiresAt: activeSub?.expiresAt,
      watermarkText: `${authName} • ${email}`,
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
      secure: isHttpsRequest(req),
    });
    res.cookies.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0), secure: isHttpsRequest(req) });
    if (role === "tutor" && authData.session?.access_token) {
      res.cookies.set(SUPABASE_ACCESS_TOKEN_COOKIE, authData.session.access_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
        secure: isHttpsRequest(req),
      });
    } else {
      res.cookies.set(SUPABASE_ACCESS_TOKEN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0), secure: isHttpsRequest(req) });
    }
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses akun." },
      { status: 500 }
    );
  }
}
