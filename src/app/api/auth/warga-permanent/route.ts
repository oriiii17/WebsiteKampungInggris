import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { sendAppEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const wargaSession = await getServerSession();
  if (!wargaSession || wargaSession.origin !== "warga_kode") {
    return NextResponse.json({ error: "Masuk dengan Kode Warga terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmation = String(body.confirmPassword || "");
    if (fullName.length < 2 || fullName.length > 80 || !email.includes("@") || password.length < 8 || password !== confirmation) {
      return NextResponse.json({ error: "Masukkan nama lengkap, email valid, kata sandi minimal 8 karakter, dan konfirmasi yang sama." }, { status: 400 });
    }
    if (!getSupabaseProjectUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json({ error: "Layanan email belum siap" }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const callbackUrl = new URL("/auth/callback?type=signup", request.nextUrl.origin).toString();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo: callbackUrl, data: {
        full_name: fullName,
        role: "peserta",
        origin_type: "warga_kode",
        warga_id: wargaSession.id,
        rw: wargaSession.rw,
        rt_rw: wargaSession.rtRw,
      } },
    });
    if (error || !data.user || !data.properties?.action_link) {
      const duplicate = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
      return NextResponse.json({ error: duplicate.includes("already") || duplicate.includes("exists") ? "Email ini sudah digunakan. Masuk dengan email tersebut atau gunakan email lain." : "Akun belum dapat dibuat. Periksa data lalu coba lagi." }, { status: duplicate.includes("already") || duplicate.includes("exists") ? 409 : 400 });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: "peserta",
      origin_type: "warga",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Akun belum selesai disimpan. Periksa kembali skema profil atau coba lagi." }, { status: 500 });
    }
    try {
      await sendAppEmail({ to: email, subject: "Verifikasi email akun Sapen English", heading: "Verifikasi email Anda", intro: `Halo ${fullName}, klik tombol berikut untuk mengaktifkan akun permanen Anda. Akses Kode Akses Anda tetap dapat digunakan.`, actionUrl: data.properties.action_link, actionLabel: "Verifikasi email" });
    } catch {
      await admin.from("profiles").delete().eq("id", data.user.id);
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Layanan email belum siap" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, message: "Cek email Anda untuk verifikasi" });
  } catch {
    return NextResponse.json({ error: "Akun belum dapat dibuat karena koneksi terganggu. Coba lagi." }, { status: 500 });
  }
}
