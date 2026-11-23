import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { sendAppEmail } from "@/lib/email";
import { getRequestIp } from "@/lib/api-rate-limit";
import { checkEmailRateLimit } from "@/lib/email-rate-limit";
import { getSiteUrl } from "@/lib/site";
import type { SupabaseClient } from "@supabase/supabase-js";

const message = "Jika akun belum terverifikasi, tautan verifikasi akan dikirim ke email tersebut.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: true, message });
    let admin: SupabaseClient | null = null;
    if (getSupabaseProjectUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) admin = createSupabaseAdminClient();
    const allowed = await checkEmailRateLimit(admin, email, getRequestIp(request), 1, 5, 60);
    if (!allowed || !admin) return NextResponse.json({ ok: true, message });
    try {
      let page = 1;
      let pendingUser: { email_confirmed_at?: string | null } | undefined;
      while (page <= 100 && !pendingUser) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        pendingUser = data.users.find((user) => user.email?.toLowerCase() === email && !user.email_confirmed_at);
        if (pendingUser || page >= (data.lastPage || 1)) break;
        page += 1;
      }
      if (!pendingUser) return NextResponse.json({ ok: true, message });
      const redirectTo = new URL("/auth/callback?type=signup", `${getSiteUrl()}/`).toString();
      // A magic link for the existing unverified user also confirms the email; signup links require a password.
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      if (!error && data.user && data.properties?.action_link) await sendAppEmail({ to: email, subject: "Verifikasi email akun Sapen English", heading: "Verifikasi email Anda", intro: "Selesaikan verifikasi akun Kampung Inggris Sapen melalui tombol berikut.", actionUrl: data.properties.action_link, actionLabel: "Verifikasi email" });
    } catch { /* Generic response prevents disclosing account state. */ }
    return NextResponse.json({ ok: true, message });
  } catch {
    return NextResponse.json({ ok: true, message });
  }
}
