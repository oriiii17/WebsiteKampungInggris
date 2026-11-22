import { NextRequest, NextResponse } from "next/server";
import { readLocalDb, writeLocalDb } from "@/lib/db";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { sendAppEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const limit = checkApiRateLimit(`register:${getRequestIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak permintaan pendaftaran. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !email.includes("@") || password.length < 6) {
      return NextResponse.json({ error: "Lengkapi data dengan email valid dan password minimal 6 karakter." }, { status: 400 });
    }

    if (!getSupabaseProjectUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json({ error: "Pendaftaran belum dapat diproses. Konfigurasi Supabase belum lengkap." }, { status: 503 });
    }

    const supabase = createSupabaseAdminClient();
    const db = await readLocalDb();
    const callbackUrl = new URL("/auth/callback?type=signup", request.nextUrl.origin).toString();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo: callbackUrl, data: { full_name: name, role: "umum" } },
    });

    if (error) {
      const message = `${error.message} ${error.code || ""}`.toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists") || error.code === "user_already_exists") {
        return NextResponse.json({ error: "Email sudah dipakai" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data.user || !data.properties?.action_link) return NextResponse.json({ error: "Pendaftaran gagal." }, { status: 500 });

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: name,
      role: "umum",
      origin_type: "luar",
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Data akun gagal disimpan. Pastikan skema profil Supabase sudah diperbarui." }, { status: 500 });
    }

    try {
      db.externalUsers.push({
        id: data.user.id,
        name,
        email,
        passwordHash: "",
        createdAt: data.user.created_at || new Date().toISOString(),
      });
      await writeLocalDb(db);
    } catch {
      await supabase.from("profiles").delete().eq("id", data.user.id);
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Data akun gagal disimpan. Silakan coba lagi." }, { status: 500 });
    }

    try {
      await sendAppEmail({ to: email, subject: "Verifikasi email akun Sapen English", heading: "Verifikasi email Anda", intro: `Halo ${name}, klik tombol berikut untuk mengaktifkan akun Anda.`, actionUrl: data.properties.action_link, actionLabel: "Verifikasi email" });
    } catch {
      db.externalUsers = db.externalUsers.filter((user) => user.id !== data.user?.id);
      await writeLocalDb(db).catch(() => undefined);
      await supabase.from("profiles").delete().eq("id", data.user.id);
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Layanan email belum siap. Akun belum dibuat; silakan coba lagi nanti." }, { status: 503 });
    }

    // Return no auth session; the user signs in manually on /masuk.
    return NextResponse.json({ ok: true, message: "Akun dibuat. Cek email Anda untuk verifikasi." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal memproses pendaftaran." }, { status: 500 });
  }
}
