import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, getUserEnrollments, readClassModuleFile } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ classId: string; moduleId: string }> }
) {
  const { classId, moduleId } = await context.params;
  const cls = await getClassByIdOrSlug(classId);
  if (!cls) return new NextResponse("Kelas tidak ditemukan.", { status: 404 });
  const mod = (cls.modules || []).find((m) => m.id === moduleId);
  if (!mod) return new NextResponse("Modul tidak ditemukan.", { status: 404 });

  const session = await getServerSession();
  const isAdmin = isAdminSession(session);
  if (!cls.isPublished && !isAdmin) return new NextResponse("Kelas belum dipublikasikan.", { status: 404 });
  if (mod.status !== "terbit" && !isAdmin) return new NextResponse("Materi belum diterbitkan.", { status: 404 });
  let hasAccess = isAdmin || session?.origin === "warga_kode";
  if (!hasAccess && session?.email) {
    const enrs = await getUserEnrollments(session.email);
    hasAccess = enrs.some((e) => e.classId === cls.id);
  }
  if (!hasAccess) return new NextResponse("Akses ditolak.", { status: 403 });

  const kind = req.nextUrl.searchParams.get("kind") || "pdf"; // pdf | original | office-url
  if (kind === "office-url" && !["ppt", "pptx"].includes(mod.fileType || "")) {
    return NextResponse.json({ error: "Pratinjau Office hanya tersedia untuk file PPT/PPTX." }, { status: 415 });
  }
  const storagePath = kind === "original" ? mod.fileAsli : (mod.filePDF || mod.fileAsli);
  if (!storagePath) return new NextResponse("File belum tersedia.", { status: 404 });

  // Supabase signed URLs let the browser/pdf.js fetch large files directly, including Range requests.
  // Legacy local paths retain the authenticated streaming fallback below.
  if (!storagePath.startsWith("class-files/")) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return new NextResponse("Supabase Storage belum tersedia.", { status: 503 });
    const download = req.nextUrl.searchParams.get("download") === "1";
    const { data, error } = await supabase.storage.from("class-files").createSignedUrl(
      storagePath,
      60 * 60,
      download ? { download: mod.fileAsliName || true } : undefined,
    );
    if (error || !data?.signedUrl) return new NextResponse("Tautan file aman belum dapat dibuat. Periksa penyimpanan materi.", { status: 503 });
    if (kind === "office-url") return NextResponse.json({ signedUrl: data.signedUrl });
    return NextResponse.redirect(data.signedUrl, 307);
  }
  if (kind === "office-url") return NextResponse.json({ error: "Pratinjau Office membutuhkan file di Supabase Storage." }, { status: 503 });

  const file = await readClassModuleFile(storagePath);
  if (!file) return new NextResponse("File tidak ditemukan.", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) {
    const name = mod.fileAsliName || file.fileName || "modul";
    headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(name)}"`;
  }
  return new NextResponse(new Uint8Array(file.buffer), { status: 200, headers });
}
