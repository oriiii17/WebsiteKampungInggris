import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encodeSessionToken, GUEST_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { createPublicSupabaseClient, getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SessionPayload, UserRole } from "@/lib/types";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { isHttpsRequest } from "@/lib/request-security";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const limit = checkApiRateLimit(`admin:${getRequestIp(req)}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan masuk. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase belum terpasang, cek .env.local dan restart server" },
        { status: 503 }
      );
    }
    const sb = createPublicSupabaseClient();
    const publicConfig = getSupabasePublicConfig();
    if (!sb) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase belum terpasang, cek .env.local dan restart server" },
        { status: 503 }
      );
    }
    const accessToken = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return NextResponse.json({ error: "Email / kata sandi salah" }, { status: 401 });
    }

    const { data: authData, error: authError } = await sb.auth.getUser(accessToken);
    if (authError || !authData.user) {
      const authMessage = authError?.message.toLowerCase() || "";
      if (authMessage.includes("invalid api key") || authMessage.includes("invalid supabase url")) {
        return NextResponse.json(
          { error: "Konfigurasi Supabase belum terpasang, cek .env.local dan restart server" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Email / kata sandi salah" }, { status: 401 });
    }

    const user = authData.user;
    let profile: { role?: string; full_name?: string } | null = null;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (serviceKey) {
      const adminDb = createSupabaseAdminClient();
      const { data, error } = await adminDb
        .from("profiles")
        .select("role,full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: "Peran admin belum dapat diverifikasi. Periksa tabel profiles." }, { status: 503 });
      }
      profile = data;
    } else {
      if (!publicConfig) return NextResponse.json({ error: "Konfigurasi Supabase belum lengkap. Periksa URL proyek dan anon key di .env.local lalu restart server." }, { status: 503 });
      const userDb = createClient(publicConfig.url, publicConfig.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data, error } = await userDb
        .from("profiles")
        .select("role,full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error && !user.app_metadata?.role) {
        return NextResponse.json({ error: "Peran admin belum dapat diverifikasi. Periksa tabel profiles." }, { status: 503 });
      }
      profile = data;
    }

    const role = profile?.role || user.app_metadata?.role;
    if (role !== "admin" && role !== "pengurus" && role !== "developer") {
      return NextResponse.json({ error: "Akun ini bukan akun admin" }, { status: 403 });
    }

    const matchedRole = role as UserRole;
    const email = (user.email || "").trim().toLowerCase();
    const adminName = profile?.full_name || user.user_metadata?.full_name || (matchedRole === "developer" ? "Developer Sistem Sapen" : "Pengurus Kampung Sapen");

    const session: SessionPayload = {
      id: user.id,
      name: adminName,
      email,
      role: matchedRole,
      origin: "admin",
      lastActivityAt: Date.now(),
      watermarkText: `PREVIEW ADMIN • ${adminName.toUpperCase()}`,
    };

    const res = NextResponse.json({ ok: true, session });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), sessionCookieOptions(session, isHttpsRequest(req)));
    res.cookies.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0), secure: isHttpsRequest(req) });
    res.cookies.set(SUPABASE_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isHttpsRequest(req),
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Gagal memproses login admin." }, { status: 500 });
  }
}
