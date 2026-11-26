import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, saveClassModuleFile, upsertClass } from "@/lib/db";
import { getSupabaseProjectUrl } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const documentExtensions = new Set(["pdf", "ppt", "pptx"]);

function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() || "";
}

function fileTypeOf(extension: string): "pdf" | "ppt" | "pptx" | "image" | null {
  if (extension === "pdf" || extension === "ppt" || extension === "pptx") return extension;
  return imageExtensions.has(extension) ? "image" : null;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "materi";
}

function validateIds(classId: string, moduleId: string) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(classId) && /^[a-zA-Z0-9_-]{1,120}$/.test(moduleId);
}

async function verifyModule(classId: string, moduleId: string) {
  const kelas = await getClassByIdOrSlug(classId);
  return kelas?.modules?.some((module) => module.id === moduleId) ? kelas : null;
}

function revalidateClassViews() {
  revalidateTag("public-classes");
  revalidatePath("/kelas");
  revalidatePath("/admin");
}

/** Create a short-lived signed Storage upload URL. The file itself never passes through a Vercel function. */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });

  if (!req.headers.get("content-type")?.includes("application/json")) {
    if (getSupabaseProjectUrl()) return NextResponse.json({ error: "Unggah Supabase langsung belum siap di browser. Periksa NEXT_PUBLIC_SUPABASE_ANON_KEY." }, { status: 503 });
    return uploadLocalFallback(req);
  }

  const body = await req.json().catch(() => ({}));
  const classId = String(body.classId || "").trim();
  const moduleId = String(body.moduleId || "").trim();
  const originalName = String(body.fileName || "").trim();
  const size = Number(body.size);
  const extension = extensionOf(originalName);
  const fileType = fileTypeOf(extension);
  if (!classId || !moduleId || !originalName || !Number.isFinite(size) || size < 1 || !validateIds(classId, moduleId)) {
    return NextResponse.json({ error: "Data unggahan tidak lengkap atau ID kelas tidak valid." }, { status: 400 });
  }
  if (!fileType) return NextResponse.json({ error: "Format file tidak didukung. Gunakan PDF, PPT, PPTX, JPG, PNG, atau WebP." }, { status: 415 });
  const limit = fileType === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (size > limit) return NextResponse.json({ error: fileType === "image" ? "Ukuran gambar maksimal 10 MB." : "Ukuran dokumen maksimal 25 MB." }, { status: 413 });
  if (!(await verifyModule(classId, moduleId))) return NextResponse.json({ error: "Kelas atau bab tidak ditemukan." }, { status: 404 });
  if (!getSupabaseProjectUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase Storage belum siap. Periksa konfigurasi penyimpanan di server." }, { status: 503 });
  }

  try {
    const storage = createSupabaseAdminClient().storage.from("class-files");
    const path = `${classId}/${moduleId}/${randomUUID()}-${safeName(originalName)}`;
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
    if (error || !data) {
      const missingBucket = error?.message.toLowerCase().includes("bucket") && error.message.toLowerCase().includes("not found");
      return NextResponse.json({ error: missingBucket ? "Bucket class-files belum tersedia di Supabase Storage." : "Tautan unggah aman belum dapat dibuat. Periksa konfigurasi Storage." }, { status: 503 });
    }
    return NextResponse.json({ path, token: data.token, fileName: originalName, fileType, maxBytes: limit });
  } catch {
    return NextResponse.json({ error: "Tautan unggah aman belum dapat dibuat. Periksa konfigurasi Supabase Storage." }, { status: 503 });
  }
}

/** Persist metadata only after the browser confirms the signed upload completed. */
export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const classId = String(body.classId || "").trim();
  const moduleId = String(body.moduleId || "").trim();
  const path = String(body.path || "");
  const originalName = String(body.fileName || "").trim();
  const extension = extensionOf(originalName);
  const fileType = fileTypeOf(extension);
  if (!classId || !moduleId || !originalName || !fileType || !validateIds(classId, moduleId)) {
    return NextResponse.json({ error: "Data unggahan tidak valid." }, { status: 400 });
  }
  const pathPrefix = `${classId}/${moduleId}/`;
  const leaf = path.startsWith(pathPrefix) ? path.slice(pathPrefix.length) : "";
  if (!/^[a-f0-9-]{36}-[a-zA-Z0-9._-]+$/i.test(leaf) || extensionOf(leaf) !== extension) {
    return NextResponse.json({ error: "Lokasi file unggahan tidak valid." }, { status: 400 });
  }
  const kelas = await verifyModule(classId, moduleId);
  if (!kelas) return NextResponse.json({ error: "Kelas atau bab tidak ditemukan." }, { status: 404 });
  try {
    const storage = createSupabaseAdminClient().storage.from("class-files");
    const { data: files, error: listError } = await storage.list(`${classId}/${moduleId}`, { search: leaf, limit: 10 });
    if (listError) return NextResponse.json({ error: "File belum dapat diverifikasi di Supabase Storage." }, { status: 503 });
    const uploaded = files?.find((file) => file.name === leaf);
    if (!uploaded) return NextResponse.json({ error: "Unggahan belum ditemukan. Coba unggah kembali." }, { status: 404 });
    const uploadedSize = Number((uploaded.metadata as { size?: unknown } | null)?.size || 0);
    const maxBytes = fileType === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
    if (!uploadedSize || uploadedSize > maxBytes) {
      await storage.remove([path]);
      return NextResponse.json({ error: fileType === "image" ? "Ukuran gambar maksimal 10 MB." : "Ukuran dokumen maksimal 25 MB." }, { status: 413 });
    }

    const safeOriginalName = safeName(originalName);
    const modules = (kelas.modules || []).map((module) => module.id === moduleId
      ? { ...module, fileAsli: path, fileAsliName: safeOriginalName, fileType, filePDF: fileType === "pdf" ? path : undefined }
      : module);
    await upsertClass({ ...kelas, modules });
    revalidateClassViews();
    return NextResponse.json({ ok: true, storagePath: path, fileName: safeOriginalName, fileType, pdfPath: fileType === "pdf" ? path : undefined });
  } catch {
    return NextResponse.json({ error: "File sudah terunggah, tetapi data bab belum berhasil diperbarui. Simpan ulang kelas." }, { status: 503 });
  }
}

async function uploadLocalFallback(req: NextRequest) {
  try {
    const form = await req.formData();
    const classId = String(form.get("classId") || "").trim();
    const moduleId = String(form.get("moduleId") || "").trim();
    const file = form.get("file") as File | null;
    if (!classId || !moduleId || !file || !validateIds(classId, moduleId)) return NextResponse.json({ error: "Data upload tidak lengkap." }, { status: 400 });
    const extension = extensionOf(file.name);
    const fileType = fileTypeOf(extension);
    if (!fileType) return NextResponse.json({ error: "Format file tidak didukung. Gunakan PDF, PPT, PPTX, JPG, PNG, atau WebP." }, { status: 415 });
    const maxBytes = fileType === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
    if (file.size > maxBytes) return NextResponse.json({ error: fileType === "image" ? "Ukuran gambar maksimal 10 MB." : "Ukuran dokumen maksimal 25 MB." }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const validSignature = fileType === "pdf" ? buffer.subarray(0, 5).toString("ascii") === "%PDF-"
      : fileType === "pptx" ? buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
        : fileType === "ppt" ? buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
          : buffer.length > 8;
    if (!validSignature) return NextResponse.json({ error: "Isi file tidak sesuai dengan format dokumen." }, { status: 415 });
    const result = await saveClassModuleFile({ classId, moduleId, buffer, mimeType: file.type || "application/octet-stream", originalName: file.name });
    revalidateClassViews();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengunggah file materi." }, { status: 500 });
  }
}
