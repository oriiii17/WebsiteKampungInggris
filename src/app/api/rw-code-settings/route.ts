import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return NextResponse.json({ prefix: "SAP" }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await supabase.from("rw_code_settings").select("active_prefix").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[rw-code-settings GET]", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Pengaturan kode warga belum dapat dimuat." }, { status: 503 });
  }
  return NextResponse.json({ prefix: data?.active_prefix || "SAP" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
