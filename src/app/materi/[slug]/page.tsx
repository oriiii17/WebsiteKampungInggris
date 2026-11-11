import React from "react";
import { notFound } from "next/navigation";
import { createSignedPageUrl, getServerSession, hasActiveMaterialAccess } from "@/lib/auth";
import { getModuleBySlugOrId, hasUserActiveEnrollmentForModule } from "@/lib/db";
import MateriReader from "@/components/MateriReader";
import FlipbookViewer from "@/components/FlipbookViewer";

export default async function SingleMateriPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, mod] = await Promise.all([
    getServerSession(),
    getModuleBySlugOrId(slug),
  ]);

  if (!mod) {
    notFound();
  }

  const isWarga = session?.origin === "warga_kode";
  const isAdmin = session?.role === "pengurus" || session?.role === "developer";
  const hasSub = hasActiveMaterialAccess(session);
  let hasClassAccess = false;
  if (session?.email) {
    hasClassAccess = await hasUserActiveEnrollmentForModule(session.email, mod.id);
  }
  const hasAccess = !mod.isPaidOnly || isWarga || isAdmin || hasSub || hasClassAccess;

  // Jika modul memiliki halaman PDF yang diupload, tampilkan sebagai Flipbook 3D
  if (mod.hasCustomUploadedPages && hasAccess) {
    const totalPages = Math.max(1, mod.totalPages || 1);
    const signedPages = Array.from({ length: totalPages }, (_, idx) => {
      const pageNumber = idx + 1;
      return {
        pageNumber,
        imageUrl: createSignedPageUrl(mod.id, pageNumber, session?.id || "preview-user", 3600),
      };
    });

    const watermarkText =
      isAdmin
        ? "PREVIEW ADMIN"
        : session?.name
        ? session.name.toUpperCase()
        : "SAPEN ENGLISH";

    return (
      <div className="bg-[#0d1117] min-h-screen flex flex-col items-center justify-center p-2 sm:p-4">
        <FlipbookViewer
          slug={mod.slug}
          moduleTitle={mod.title}
          initialPages={signedPages}
          watermarkText={watermarkText}
        />
      </div>
    );
  }

  // Default: tampilkan MateriReader (teks HTML responsif)
  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-16">
      <MateriReader module={mod} session={session} hasAccess={hasAccess} />
    </div>
  );
}
