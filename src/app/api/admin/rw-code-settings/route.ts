import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const { data, error } = await createSupabaseAdminClient().from("rw_code_settings").select("active_prefix,updated_at").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ prefix: data?.active_prefix || "SAP", updatedAt: data?.updated_at || null });
  } catch (error) {
    console.error("[admin/rw-code-settings GET]", error);
    return NextResponse.json({ error: "Pengaturan awalan belum tersedia. Terapkan migrasi pengaturan kode warga." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const prefix = String(body.prefix || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(prefix)) return NextResponse.json({ error: "Awalan harus terdiri dari 3–4 huruf atau angka, misalnya K12 atau SPN1." }, { status: 400 });
  try {
    const { data, error } = await createSupabaseAdminClient().from("rw_code_settings").upsert({ id: 1, active_prefix: prefix, updated_at: new Date().toISOString(), updated_by: session?.name || "Pengurus" }, { onConflict: "id" }).select("active_prefix,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, prefix: data.active_prefix, updatedAt: data.updated_at });
  } catch (error) {
    console.error("[admin/rw-code-settings PATCH]", error);
    return NextResponse.json({ error: "Awalan belum dapat disimpan. Periksa migrasi database lalu coba lagi." }, { status: 503 });
  }
}
