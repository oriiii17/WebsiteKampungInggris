import { NextRequest, NextResponse } from "next/server";
import {
  encodeSessionToken,
  getAdminCredentials,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { SessionPayload, UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    let matchedRole: UserRole | null = null;
    let adminName = "";

    // 1. Autentikasi langsung lewat Supabase Auth bila terhubung
    const sb = createPublicSupabaseClient();
    if (sb) {
      const { data } = await sb.auth.signInWithPassword({ email, password });
      const roleClaim = data.user?.app_metadata?.role;
      if (roleClaim === "pengurus" || roleClaim === "developer") {
        matchedRole = roleClaim;
        adminName =
          data.user?.user_metadata?.full_name ||
          (roleClaim === "developer"
            ? "Developer Sistem Sapen"
            : "Pengurus Kampung Sapen");
      }
    }

    // 2. Fallback kredensial env lokal bila mode offline
    if (!matchedRole) {
      const creds = getAdminCredentials();
      if (email === creds.pengurus.email && password === creds.pengurus.password) {
        matchedRole = "pengurus";
        adminName = creds.pengurus.name;
      } else if (
        email === creds.developer.email &&
        password === creds.developer.password
      ) {
        matchedRole = "developer";
        adminName = creds.developer.name;
      }
    }

    if (!matchedRole) {
      return NextResponse.json(
        {
          error:
            "Email atau kata sandi Admin tidak valid. Hanya 2 akun resmi (Pengurus & Developer) yang dapat masuk ke panel ini.",
        },
        { status: 401 }
      );
    }

    const session: SessionPayload = {
      id: `admin-${matchedRole}`,
      name: adminName,
      email,
      role: matchedRole,
      origin: "admin",
      watermarkText: `PREVIEW ADMIN • ${adminName.toUpperCase()}`,
    };

    const res = NextResponse.json({ ok: true, session });
    res.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Gagal memproses login admin." }, { status: 500 });
  }
}
