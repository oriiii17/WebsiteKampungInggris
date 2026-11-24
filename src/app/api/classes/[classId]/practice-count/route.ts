import { NextResponse } from "next/server";
import { getPublicPracticeCounts } from "@/lib/public-data-cache";

export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  if (!classId || classId.length > 180) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 400 });
  try {
    const counts = await getPublicPracticeCounts([classId]);
    return NextResponse.json({ count: counts[classId] || 0 }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "Jumlah latihan belum dapat dimuat." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
