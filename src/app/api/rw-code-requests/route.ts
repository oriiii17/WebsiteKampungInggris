import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const validRtByRw: Record<string, string[]> = {
  "06": ["18", "19", "20", "21"],
  "07": ["22", "23", "24"],
  "08": ["25", "26", "27", "28"],
};

export async function POST(request: NextRequest) {
  const rateKey = `rw-code-request:${getRequestIp(request)}`;
  const limit = checkApiRateLimit(rateKey, 3, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak permintaan kode. Coba lagi nanti atau hubungi pengurus." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  const body = await request.json().catch(() => ({}));
  const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ").toLocaleUpperCase("id-ID");
  const requestedPrefix = String(body.prefix || "").trim().toUpperCase();
  const rw = String(body.rw || "").trim();
  const rt = String(body.rt || "").trim();
  const typedCode = String(body.typedCode || "").trim().toUpperCase();
  if (fullName.length < 2 || fullName.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(fullName)) return NextResponse.json({ error: "Nama lengkap harus 2–80 karakter dan hanya berisi huruf, spasi, titik, apostrof, atau tanda hubung." }, { status: 400 });
  if (!/^[A-Z0-9]{3}$/.test(requestedPrefix) || !validRtByRw[rw]?.includes(rt) || typedCode !== `${requestedPrefix}${rw}${rt}`) return NextResponse.json({ error: "Kode yang diketik harus cocok dengan awalan, RW, dan RT pilihanmu." }, { status: 400 });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: settings, error: settingsError } = await supabase.from("rw_code_settings").select("active_prefix").eq("id", 1).single();
    if (settingsError || !settings?.active_prefix) throw new Error("Konfigurasi awalan kode belum tersedia.");
    const prefix = String(settings.active_prefix).toUpperCase();
    if (!/^[A-Z0-9]{3}$/.test(prefix)) throw new Error("Awalan aktif belum terdiri dari 3 karakter. Minta pengurus memperbaruinya.");
    if (requestedPrefix !== prefix) return NextResponse.json({ error: "Awalan kode sudah berubah. Periksa pengaturan terbaru lalu kirim kembali." }, { status: 409 });
    const { data: accessCodes, error: accessCodeError } = await supabase
      .from("access_codes")
      .select("code,rt_rw,expires_at")
      .eq("rt_rw", `RW ${rw}`)
      .eq("holder_type", "keluarga")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (accessCodeError) throw accessCodeError;
    const now = Date.now();
    const officialCode = (accessCodes || []).find((row) => !row.expires_at || Date.parse(row.expires_at) > now);
    if (!officialCode?.code) return NextResponse.json({ error: `Belum ada kode akses aktif untuk RW ${rw}. Hubungi pengurus RW.` }, { status: 404 });
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(String(officialCode.code))) return NextResponse.json({ error: "Kode RW aktif belum berformat enam karakter. Hubungi pengurus RW." }, { status: 409 });
    return NextResponse.json({ ok: true, code: officialCode.code, fullName, rw: `RW ${rw}` });
  } catch (error) {
    console.error("[rw-code-requests POST]", error);
    return NextResponse.json({ error: "Permintaan kode belum berhasil. Pastikan migrasi sudah diterapkan atau hubungi pengurus." }, { status: 503 });
  }
}
