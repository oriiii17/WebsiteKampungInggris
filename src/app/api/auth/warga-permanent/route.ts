import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encodeSessionToken, getServerSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { isHttpsRequest } from "@/lib/request-security";
import type { SessionPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const wargaSession = await getServerSession();
  if (!wargaSession || wargaSession.origin !== "warga_kode") {
    return NextResponse.json({ error: "Masuk dengan Kode Warga terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmation = String(body.confirmPassword || "");
    if (!email.includes("@") || password.length < 8 || password !== confirmation) {
      return NextResponse.json({ error: "Masukkan email valid, kata sandi minimal 8 karakter, dan konfirmasi yang sama." }, { status: 400 });
    }
    if (!getSupabaseProjectUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json({ error: "Pembuatan akun belum tersedia. Coba lagi nanti atau hubungi pengurus." }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: wargaSession.name,
        role: "peserta",
        origin_type: "warga_kode",
        warga_id: wargaSession.id,
        rw: wargaSession.rw,
        rt_rw: wargaSession.rtRw,
      },
    });
    if (error || !data.user) {
      const duplicate = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
      return NextResponse.json({ error: duplicate.includes("already") || duplicate.includes("exists") ? "Email ini sudah digunakan. Masuk dengan email tersebut atau gunakan email lain." : "Akun belum dapat dibuat. Periksa data lalu coba lagi." }, { status: duplicate.includes("already") || duplicate.includes("exists") ? 409 : 400 });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: wargaSession.name,
      role: "peserta",
      origin_type: "warga",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Akun belum selesai disimpan. Periksa kembali skema profil atau coba lagi." }, { status: 500 });
    }

    const session: SessionPayload = { ...wargaSession, email, watermarkText: `${wargaSession.name} · Warga Sapen` };
    const response = NextResponse.json({ ok: true, message: "Akun permanen berhasil dibuat." });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      secure: isHttpsRequest(request),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Akun belum dapat dibuat karena koneksi terganggu. Coba lagi." }, { status: 500 });
  }
}
