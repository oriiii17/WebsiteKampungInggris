import { NextRequest, NextResponse } from "next/server";
import {
  createSignedPageUrl,
  getServerSession,
  hasActiveMaterialAccess,
} from "@/lib/auth";
import { getModuleBySlugOrId, getModuleGames, hasUserActiveEnrollmentForModule } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getServerSession();

  const mod = await getModuleBySlugOrId(slug);
  if (!mod) {
    return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
  }

  let hasClassAccess = false;
  if (session?.email) {
    hasClassAccess = await hasUserActiveEnrollmentForModule(session.email, mod.id);
  }

  const isWarga = session?.origin === "warga_kode";
  const isAdmin = session?.role === "pengurus" || session?.role === "developer";
  const hasSub = hasActiveMaterialAccess(session);
  const hasAccess = !mod.isPaidOnly || isWarga || isAdmin || hasSub || hasClassAccess;

  if (!hasAccess) {
    return NextResponse.json(
      {
        error:
          "Akses terkunci. Silakan masuk menggunakan Kode Akses resmi atau aktifkan kelas belajar Anda.",
      },
      { status: 403 }
    );
  }

  // Buat Signed URL yang cepat kedaluwarsa (120 detik) untuk setiap halaman
  const verifiedSessionId = session?.id || "preview-user";
  const totalPages = Math.max(1, mod.totalPages || 1);
  const signedPages = Array.from({ length: totalPages }, (_, idx) => {
    const pageNumber = idx + 1;
    return {
      pageNumber,
      imageUrl: createSignedPageUrl(mod.id, pageNumber, verifiedSessionId, 300),
    };
  });

  const games = await getModuleGames(mod.id);

  return NextResponse.json({
    module: {
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      subtitle: mod.subtitle,
      level: mod.level,
      totalPages: mod.totalPages,
    },
    signedPages,
    expiresInSeconds: 120,
    watermarkText: session?.watermarkText || "SAPEN ENGLISH",
    participantName: session?.name || "Peserta",
    games,
  });
}
