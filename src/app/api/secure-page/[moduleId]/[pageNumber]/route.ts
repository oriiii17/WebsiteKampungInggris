import { NextRequest, NextResponse } from "next/server";
import {
  getServerSession,
  hasActiveMaterialAccess,
  verifySignedPageRequest,
} from "@/lib/auth";
import { getModuleBySlugOrId, hasUserActiveEnrollmentForModule, readPrivatePageImage } from "@/lib/db";
import { renderSeedBookPageSvg } from "@/lib/page-svg";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ moduleId: string; pageNumber: string }> }
) {
  const { moduleId, pageNumber } = await context.params;
  const pageNum = Number(pageNumber);

  // Tolak pembukaan link file secara langsung di tab browser (Poin 5 Rancangan)
  const fetchDest = req.headers.get("sec-fetch-dest");
  const referer = req.headers.get("referer") || "";
  if (
    fetchDest === "document" ||
    (referer && !referer.includes("/materi/") && !referer.includes("/belajar/") && !referer.includes("/admin") && !referer.includes("/kelas/"))
  ) {
    return new NextResponse(
      "Akses Ditolak: Link langsung ke file materi tidak diizinkan. Silakan buka materi melalui halaman Flipbook Reader.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const mod = await getModuleBySlugOrId(moduleId);
  if (!mod || pageNum < 1 || pageNum > Math.max(1, mod.totalPages || 1)) {
    return new NextResponse("Halaman tidak ditemukan.", { status: 404 });
  }

  const session = await getServerSession();
  let hasClassAccess = false;
  if (session?.email) {
    hasClassAccess = await hasUserActiveEnrollmentForModule(session.email, mod.id);
  }

  const isWarga = session?.origin === "warga_kode";
  const isAdmin = session?.role === "pengurus" || session?.role === "developer";
  const hasSub = hasActiveMaterialAccess(session);
  const hasAccess = !mod.isPaidOnly || isWarga || isAdmin || hasSub || hasClassAccess;

  if (!hasAccess) {
    return new NextResponse("Sesi tidak aktif atau masa akses habis.", { status: 401 });
  }

  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  const verifiedSessionId = session?.id || "preview-user";
  if (!verifySignedPageRequest(moduleId, pageNum, verifiedSessionId, exp, sig)) {
    return new NextResponse("Signed URL kedaluwarsa atau tidak sah.", { status: 403 });
  }

  // 1. Cek apakah ada gambar hasil konversi upload PDF di Private Storage
  const customImage = await readPrivatePageImage(mod.id, pageNum);
  if (customImage) {
    return new NextResponse(new Uint8Array(customImage.buffer), {
      status: 200,
      headers: {
        "Content-Type": customImage.contentType,
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // 2. Jika modul bawaan (seed), render halaman buku bergambar SVG secara aman
  const seedPage =
    mod.seedPages?.find((p) => p.pageNumber === pageNum) || {
      pageNumber: pageNum,
      kind: "lesson" as const,
      heading: `${mod.title} - Halaman ${pageNum}`,
      subheading: mod.subtitle,
      bullets: mod.syllabus.slice(0, 4).map((s) => `${s.day}: ${s.topic}`),
      tip: "Gunakan tombol navigasi di bawah buku untuk berpindah halaman.",
    };

  const svg = renderSeedBookPageSvg(mod, seedPage, mod.totalPages);
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
