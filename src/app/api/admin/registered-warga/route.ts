import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getRegisteredWargaAccounts } from "@/lib/admin-registered-warga";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    return NextResponse.json({ warga: await getRegisteredWargaAccounts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Daftar akun warga belum dapat dimuat." }, { status: 503 });
  }
}
