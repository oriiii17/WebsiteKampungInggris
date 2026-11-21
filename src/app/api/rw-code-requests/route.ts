import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const validRws = new Set(["06", "07", "08"]);

export async function POST(request: NextRequest) {
  const rateKey = `rw-code-request:${getRequestIp(request)}`;
  const limit = checkApiRateLimit(rateKey, 3, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak permintaan kode. Coba lagi nanti atau hubungi pengurus." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  const body = await request.json().catch(() => ({}));
  const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ").toLocaleUpperCase("id-ID");
  const rw = String(body.rw || "").trim();
  const rt = String(body.rt || "").trim();
  if (fullName.length < 2 || fullName.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(fullName)) return NextResponse.json({ error: "Nama lengkap harus 2–80 karakter dan hanya berisi huruf, spasi, titik, apostrof, atau tanda hubung." }, { status: 400 });
  if (!validRws.has(rw) || !/^\d{2}$/.test(rt)) return NextResponse.json({ error: "Pilih RW dan RT yang valid." }, { status: 400 });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: settings, error: settingsError } = await supabase.from("rw_code_settings").select("active_prefix").eq("id", 1).single();
    if (settingsError || !settings?.active_prefix) throw new Error("Konfigurasi awalan kode belum tersedia.");
    const prefix = String(settings.active_prefix).toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(prefix)) throw new Error("Konfigurasi awalan kode tidak valid.");
    const code = `${prefix}-RW${rw}-RT${rt}`;
    const rtRw = `RT ${rt} / RW ${rw}`;
    const { data: existing, error: lookupError } = await supabase.from("access_codes").select("id,is_active,rt_rw").eq("code", code).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (!existing.is_active || existing.rt_rw !== rtRw) return NextResponse.json({ error: "Kode untuk RT ini sedang dinonaktifkan pengurus. Silakan hubungi pengurus RW." }, { status: 409 });
      return NextResponse.json({ ok: true, code, fullName, reused: true });
    }
    const { error: insertError } = await supabase.from("access_codes").insert({
      id: randomUUID(), code, label: fullName, rt_rw: rtRw, holder_type: "keluarga",
      is_active: true, created_by: "Permintaan kode warga", expires_at: null,
    });
    if (insertError?.code === "23505") {
      const { data: raced } = await supabase.from("access_codes").select("id,is_active,rt_rw").eq("code", code).maybeSingle();
      if (raced?.is_active && raced.rt_rw === rtRw) return NextResponse.json({ ok: true, code, fullName, reused: true });
      return NextResponse.json({ error: "Kode belum bisa diterbitkan. Hubungi pengurus RW." }, { status: 409 });
    }
    if (insertError) throw insertError;
    return NextResponse.json({ ok: true, code, fullName, reused: false }, { status: 201 });
  } catch (error) {
    console.error("[rw-code-requests POST]", error);
    return NextResponse.json({ error: "Permintaan kode belum berhasil. Pastikan migrasi sudah diterapkan atau hubungi pengurus." }, { status: 503 });
  }
}
