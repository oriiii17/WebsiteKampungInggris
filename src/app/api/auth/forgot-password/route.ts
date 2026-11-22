import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { sendAppEmail } from "@/lib/email";
import { getRequestIp } from "@/lib/api-rate-limit";
import { checkEmailRateLimit } from "@/lib/email-rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

const genericMessage = "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan segera dikirim.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: true, message: genericMessage });
    const ip = getRequestIp(request);
    let admin: SupabaseClient | null = null;
    if (getSupabaseProjectUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) admin = createSupabaseAdminClient();
    const allowed = await checkEmailRateLimit(admin, email, ip, 3, 3, 3600);
    if (!allowed || !admin) return NextResponse.json({ ok: true, message: genericMessage });
    try {
      const redirectTo = new URL("/auth/callback?type=recovery", request.nextUrl.origin).toString();
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
      if (!error && data.user && data.properties?.action_link) {
        await sendAppEmail({ to: email, subject: "Atur ulang kata sandi Sapen English", heading: "Atur ulang kata sandi", intro: "Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.", actionUrl: data.properties.action_link, actionLabel: "Atur kata sandi baru", note: "Tautan ini hanya dapat digunakan sekali dan akan kedaluwarsa." });
      }
    } catch { /* Keep the response identical so email existence is never disclosed. */ }
    return NextResponse.json({ ok: true, message: genericMessage });
  } catch {
    return NextResponse.json({ ok: true, message: genericMessage });
  }
}
