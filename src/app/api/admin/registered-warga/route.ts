import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getRegisteredWargaAccounts } from "@/lib/admin-registered-warga";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const requestedSize = Number(url.searchParams.get("perPage") || 20);
    const perPage = [10, 20, 50].includes(requestedSize) ? requestedSize : 20;
    const search = (url.searchParams.get("search") || "").trim().toLocaleLowerCase("id-ID");
    const rw = url.searchParams.get("rw") || "ALL";
    const sort = url.searchParams.get("sort") || "newest";
    const all = (await getRegisteredWargaAccounts()).filter((person) =>
      (rw === "ALL" || person.rw === rw) && (!search || person.name.toLocaleLowerCase("id-ID").includes(search))
    );
    all.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "id-ID") : b.createdAt.localeCompare(a.createdAt));
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(page, pages);
    return NextResponse.json({ warga: all.slice((currentPage - 1) * perPage, currentPage * perPage), total, page: currentPage, perPage, pages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Daftar akun warga belum dapat dimuat." }, { status: 503 });
  }
}
