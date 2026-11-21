import { NextRequest, NextResponse } from "next/server";
import { encodeSessionToken, GUEST_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { checkApiRateLimit, clearApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { isHttpsRequest } from "@/lib/request-security";
import type { SessionPayload } from "@/lib/types";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type VerifiedCode = { id: string; label: string; rt_rw: string; holder_type: "keluarga" | "individu" };

function normalizeCode(value: unknown): string {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length === 6 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : "";
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const key = `warga-access:${ip}`;
  const limit = checkApiRateLimit(key, 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan kode. Coba lagi beberapa menit." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  try {
    const body = await req.json();
    const code = normalizeCode(body.code);
    if (!code) return NextResponse.json({ error: "Masukkan enam karakter kode warga dengan format XXX-XXX." }, { status: 400 });

    const supabase = createPublicSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "Layanan login warga belum dikonfigurasi." }, { status: 503 });

    const { data, error } = await supabase.rpc("verify_access_code", { p_code: code });
    if (error) {
      console.error("[auth/warga-rw] Supabase RPC verify_access_code", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ error: "Server belum dapat memverifikasi kode. Coba lagi sebentar." }, { status: 502 });
    }

    const verified = (Array.isArray(data) ? data[0] : data) as VerifiedCode | null;
    if (!verified?.id) return NextResponse.json({ error: "Kode tidak valid atau sudah tidak aktif." }, { status: 403 });

    const rw = String(verified.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
    const rwLabel = rw ? `RW ${rw.padStart(2, "0")}` : verified.rt_rw;
    const name = verified.label || "Warga Sapen";
    if (rwLabel === "RW 06" || rwLabel === "RW 07" || rwLabel === "RW 08") {
      try {
        const admin = createSupabaseAdminClient();
        const accessCodeId = String(verified.id);
        const { error: codeError } = await admin.from("rw_access_codes").upsert({ id: accessCodeId, rw: rwLabel }, { onConflict: "id" });
        if (codeError) throw codeError;
        const { error: metricsError } = await admin.from("rw_access_login_events").insert({ rw_access_code_id: accessCodeId, rw: rwLabel });
        if (metricsError) console.warn("[auth/warga-rw] Login metric was not recorded", metricsError.code);
      } catch (metricsError) {
        console.warn("[auth/warga-rw] RW login metric setup/write failed", metricsError);
        // Login remains available if metrics migration/service credentials are not configured yet.
      }
    }
    const session: SessionPayload = {
      id: String(verified.id),
      name,
      role: "peserta",
      origin: "warga_kode",
      codeUsed: code,
      rtRw: verified.rt_rw,
      ...(rwLabel === "RW 06" || rwLabel === "RW 07" || rwLabel === "RW 08" ? { rw: rwLabel } : {}),
      watermarkText: `${name} · ${verified.rt_rw || "Warga Sapen"}`,
    };

    clearApiRateLimit(key);
    const response = NextResponse.json({ ok: true, session });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: isHttpsRequest(req),
    });
    response.cookies.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0), secure: isHttpsRequest(req) });
    response.cookies.set(SUPABASE_ACCESS_TOKEN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0), secure: isHttpsRequest(req) });
    return response;
  } catch (error) {
    console.error("[auth/warga-rw] Request failed", error);
    return NextResponse.json({ error: "Permintaan login tidak dapat diproses. Periksa kode lalu coba lagi." }, { status: 400 });
  }
}
