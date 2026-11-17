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

  let code = (body.generateNew ? generateRwCode() : String(body.newCode || ""))
    .toUpperCase()
    .replace(/[\s-]/g, "");
  if (body.generateNew) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = generateRwCode().toUpperCase().replace(/[\s-]/g, "");
      const formatted = `${candidate.slice(0, 3)}-${candidate.slice(3)}`;
      const { data: existing } = await supabase.from("access_codes").select("id").eq("code", formatted).maybeSingle();
      if (!existing || existing.id === String(body.id || "")) { code = candidate; break; }
    }
  }
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
  if (id) {
    const { data: existing, error: lookupError } = await supabase.from("access_codes").select("id,rt_rw").eq("id", id).single();
    const existingRw = String(existing?.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
    if (lookupError || !existing || !RWS.includes(`RW ${String(existingRw || "").padStart(2, "0")}` as (typeof RWS)[number]) || `RW ${String(existingRw).padStart(2, "0")}` !== rw) {
      return NextResponse.json({ error: "Kode RW yang akan diubah tidak ditemukan atau tidak sesuai dengan RW pilihan." }, { status: 404 });
    }
  }
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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id || !["toggle"].includes(String(body.action))) return NextResponse.json({ error: "Aksi atau ID kode tidak valid." }, { status: 400 });
  const { data: current, error: readError } = await supabase.from("access_codes").select("id,is_active,rt_rw").eq("id", id).single();
  if (readError || !current) return NextResponse.json({ error: "Kode akses tidak ditemukan." }, { status: 404 });
  const rw = String(current.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
  if (!RWS.includes(`RW ${String(rw || "").padStart(2, "0")}` as (typeof RWS)[number])) return NextResponse.json({ error: "Kode bukan kode RW yang dikelola." }, { status: 400 });
  const { error } = await supabase.from("access_codes").update({ is_active: !current.is_active }).eq("id", id);
  if (error) return NextResponse.json({ error: "Status kode gagal diperbarui." }, { status: 500 });
  return NextResponse.json({ ok: true, isActive: !current.is_active });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi di server." }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID kode diperlukan." }, { status: 400 });
  const { data: current, error: readError } = await supabase.from("access_codes").select("id,rt_rw").eq("id", id).single();
  if (readError || !current) return NextResponse.json({ error: "Kode akses tidak ditemukan." }, { status: 404 });
  const rw = String(current.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
  if (!RWS.includes(`RW ${String(rw || "").padStart(2, "0")}` as (typeof RWS)[number])) return NextResponse.json({ error: "Kode bukan kode RW yang dikelola." }, { status: 400 });
  const { error } = await supabase.from("access_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Kode akses gagal dihapus." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
