import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClasses, getClassByIdOrSlug, upsertClass, deleteClass } from "@/lib/db";
import { ClassItem, ClassModule, ClassQuiz } from "@/lib/types";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeQuiz(input: any, kelasId: string, moduleId: string): ClassQuiz | null {
  if (!input) return null;
  const soal = Array.isArray(input.soal)
    ? input.soal.map((s: any, i: number) => ({
        id: String(s.id || `q-${moduleId}-${i + 1}`),
        question: String(s.question || "").trim(),
        options: [
          String(s.options?.[0] || ""),
          String(s.options?.[1] || ""),
          String(s.options?.[2] || ""),
          String(s.options?.[3] || ""),
        ] as [string, string, string, string],
        correctIndex: Math.min(3, Math.max(0, Number(s.correctIndex || 0))),
        explanation: String(s.explanation || ""),
      })).filter((s: any) => s.question)
    : [];
  return {
    id: String(input.id || `quiz-${moduleId}`),
    moduleId,
    kelasId,
    judul: String(input.judul || "Kuis Modul"),
    soal,
    status: ["terkunci", "terbuka", "selesai"].includes(input.status) ? input.status : "terkunci",
    dibukaPada: input.dibukaPada,
    ditutupPada: input.ditutupPada,
  };
}

function normalizeModules(modulesInput: any, kelasId: string): ClassModule[] {
  if (!Array.isArray(modulesInput)) return [];
  return modulesInput.map((m: any, idx: number) => {
    const id = String(m.id || `cm-${kelasId}-${idx + 1}-${Date.now()}`);
    const quiz = normalizeQuiz(m.quiz, kelasId, id);
    return {
      id,
      kelasId,
      judulBebas: String(m.judulBebas || `Modul ${idx + 1}`).trim(),
      deskripsi: String(m.deskripsi || "").trim(),
      urutan: typeof m.urutan === "number" ? m.urutan : idx + 1,
      filePDF: m.filePDF ? String(m.filePDF) : undefined,
      fileAsli: m.fileAsli ? String(m.fileAsli) : undefined,
      fileAsliName: m.fileAsliName ? String(m.fileAsliName) : undefined,
      fileType: m.fileType,
      status: m.status === "draft" ? "draft" : "terbit",
      quiz: quiz && quiz.soal.length > 0 ? quiz : (m.quiz === null ? null : quiz),
    } as ClassModule;
  }).sort((a, b) => a.urutan - b.urutan).map((m, i) => ({ ...m, urutan: i + 1 }));
}

function buildClass(body: any, existing?: ClassItem): ClassItem {
  const title = String(body.title || existing?.title || "").trim();
  const id = body.id ? String(body.id) : (existing?.id || `class-${Date.now()}`);
  const slug = body.slug ? slugify(String(body.slug)) : (existing?.slug || `${slugify(title || "kelas")}-${Date.now().toString().slice(-4)}`);
  const modules = normalizeModules(body.modules ?? existing?.modules ?? [], id);
  const status = ["draft", "berjalan", "selesai"].includes(body.status) ? body.status : (existing?.status || "draft");
  const isPublished = body.isPublished !== undefined ? Boolean(body.isPublished) : (status !== "draft");
  return {
    id,
    slug,
    title,
    subtitle: String(body.subtitle ?? existing?.subtitle ?? ""),
    description: String(body.description ?? existing?.description ?? ""),
    coverTheme: ["emerald", "amber", "sky", "rose", "violet"].includes(body.coverTheme ?? existing?.coverTheme) ? (body.coverTheme ?? existing?.coverTheme) : "emerald",
    priceIdr: Math.max(0, Number(body.priceIdr ?? existing?.priceIdr ?? 0)),
    durationDays: Math.max(1, Number(body.durationDays ?? existing?.durationDays ?? 30)),
    moduleIds: Array.isArray(body.moduleIds) ? body.moduleIds : (existing?.moduleIds || []),
    modules,
    gameTemplateIds: Array.isArray(body.gameTemplateIds) ? body.gameTemplateIds : (existing?.gameTemplateIds || []),
    isPublished,
    createdAt: existing?.createdAt || body.createdAt || new Date().toISOString(),
    tingkat: ["Pemula", "Menengah", "Lanjutan"].includes(body.tingkat) ? body.tingkat : (existing?.tingkat || "Pemula"),
    jadwal: String(body.jadwal ?? existing?.jadwal ?? ""),
    kodeAkses: String(body.kodeAkses ?? existing?.kodeAkses ?? ""),
    status,
  };
}

export async function GET() {
  try {
    const classes = await getClasses(true);
    return NextResponse.json({ ok: true, classes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat kelas.";
    console.error("[api/admin/classes GET]", err);
    return NextResponse.json({ ok: false, error: message, classes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await req.json();
    if (!String(body.title || "").trim()) return NextResponse.json({ ok: false, error: "Judul kelas wajib diisi." }, { status: 400 });
    const toSave = buildClass(body);
    await upsertClass(toSave);
    const verified = await getClassByIdOrSlug(toSave.id);
    if (!verified) {
      console.error("[api/admin/classes POST] verifikasi gagal, kelas tidak ditemukan setelah simpan", toSave.id);
      return NextResponse.json({ ok: false, error: "Kelas gagal tersimpan ke database (verifikasi setelah simpan tidak menemukan data). Coba lagi." }, { status: 500 });
    }
    const classes = await getClasses(true);
    console.log("[api/admin/classes POST] tersimpan & terverifikasi", { id: verified.id, title: verified.title, modules: verified.modules?.length || 0 });
    return NextResponse.json({ ok: true, class: verified, classes, verified: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat kelas.";
    console.error("[api/admin/classes POST]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ ok: false, error: "ID kelas diperlukan." }, { status: 400 });
    const all = await getClasses(true);
    const existing = all.find((c) => c.id === body.id);
    if (!existing) return NextResponse.json({ ok: false, error: `Kelas dengan ID ${body.id} tidak ditemukan di database.` }, { status: 404 });
    const toSave = buildClass(body, existing);
    await upsertClass(toSave);
    const verified = await getClassByIdOrSlug(toSave.id);
    if (!verified) {
      console.error("[api/admin/classes PATCH] verifikasi gagal", toSave.id);
      return NextResponse.json({ ok: false, error: "Perubahan kelas gagal tersimpan ke database (verifikasi gagal)." }, { status: 500 });
    }
    const classes = await getClasses(true);
    console.log("[api/admin/classes PATCH] tersimpan & terverifikasi", { id: verified.id, title: verified.title, modules: verified.modules?.length || 0 });
    return NextResponse.json({ ok: true, class: verified, classes, verified: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kelas.";
    console.error("[api/admin/classes PATCH]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "ID kelas diperlukan." }, { status: 400 });
    const ok = await deleteClass(id);
    const stillThere = await getClassByIdOrSlug(id);
    if (ok && stillThere) {
      console.error("[api/admin/classes DELETE] masih ada setelah hapus", id);
      return NextResponse.json({ ok: false, error: "Kelas gagal dihapus dari database (masih ditemukan setelah penghapusan)." }, { status: 500 });
    }
    if (!ok && !stillThere) {
      return NextResponse.json({ ok: true, deleted: false, message: "Kelas tidak ditemukan (mungkin sudah dihapus)." });
    }
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Gagal menghapus kelas dari database." }, { status: 500 });
    }
    const classes = await getClasses(true);
    console.log("[api/admin/classes DELETE] terhapus & terverifikasi", { id });
    return NextResponse.json({ ok: true, deleted: true, classes, verified: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas.";
    console.error("[api/admin/classes DELETE]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
