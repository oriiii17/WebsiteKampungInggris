import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { generateRwCode } from "@/lib/rw-auth";

const RWS = ["RW 06", "RW 07", "RW 08"] as const;

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });

  const { data, error } = await supabase
    .from("access_codes")
    .select("id,code,rt_rw,is_active,created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[admin/rw-codes GET] Supabase", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return NextResponse.json({ error: `Gagal memuat kode akses (${error.code || "Supabase"}): ${error.message}` }, { status: 500 });
  }

  const codes = (data || []).flatMap((row) => {
    const rw = String(row.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
    const rwLabel = rw ? `RW ${rw.padStart(2, "0")}` : "";
    if (!RWS.includes(rwLabel as (typeof RWS)[number])) return [];
    return [{ id: row.id, rw: rwLabel, codeDisplay: row.code, isActive: row.is_active, updatedAt: row.created_at }];
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session) || !session) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const rw = String(body.rw || "").trim();
  if (!RWS.includes(rw as (typeof RWS)[number])) return NextResponse.json({ error: "RW tidak valid." }, { status: 400 });

  const code = (body.generateNew ? generateRwCode() : String(body.newCode || ""))
    .toUpperCase()
    .replace(/[\s-]/g, "");
  const formattedCode = code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
  if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(formattedCode)) {
    return NextResponse.json({ error: "Kode harus terdiri dari enam huruf atau angka, dengan format XXX-XXX." }, { status: 400 });
  }

  const values = {
    code: formattedCode,
    label: `Kode Warga ${rw}`,
    rt_rw: rw,
    holder_type: "keluarga" as const,
    is_active: true,
    created_by: session.name,
    expires_at: null,
  };
  const id = String(body.id || "");
  const query = id
    ? supabase.from("access_codes").update({ ...values, created_by: session.name }).eq("id", id).select("id,code,rt_rw,is_active,created_at").single()
    : supabase.from("access_codes").insert(values).select("id,code,rt_rw,is_active,created_at").single();
  const { data, error } = await query;
  if (error) {
    console.error("[admin/rw-codes POST] Supabase", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    if (error.code === "23505") return NextResponse.json({ error: `Kode ${formattedCode} sudah digunakan. Buat kode lain.` }, { status: 409 });
    return NextResponse.json({ error: `Gagal menyimpan kode (${error.code || "Supabase"}): ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code: { id: data.id, rw: data.rt_rw, codeDisplay: data.code, isActive: data.is_active, updatedAt: data.created_at } });
}
