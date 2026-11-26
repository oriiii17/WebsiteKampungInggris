import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClasses, getClassByIdOrSlug, upsertClass, deleteClass, readLocalDb } from "@/lib/db";
import { ClassItem, ClassModule, ClassQuiz } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { formatIDR, MAX_PRICE_IDR } from "@/lib/currency";
import { isPublishedIndependentGame, normalizeGameBlueprint } from "@/lib/game-blueprint";
import { revalidatePath, revalidateTag } from "next/cache";

async function withInstalledGames(items: ClassItem[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !items.length) return items;
  const { data, error } = await supabase.from("class_games").select("class_id,game_id").in("class_id", items.map((item) => item.id));
  if (error) { console.error("[api/admin/classes] class_games", { code: error.code, message: error.message, details: error.details, hint: error.hint }); return items; }
  return items.map((item) => ({ ...item, gameBlueprintIds: (data || []).filter((row) => row.class_id === item.id).map((row) => row.game_id) }));
}

function revalidateClassViews() {
  revalidateTag("public-classes");
  revalidatePath("/kelas");
  revalidatePath("/admin");
}

async function validateIndependentGameIds(ids: unknown): Promise<string[]> {
  const gameIds = Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string"))].slice(0, 100) : [];
  if (!gameIds.length) return [];
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: published, error: validateError } = await supabase.from("game_blueprints").select("id,status,destination").in("id", gameIds);
    if (validateError) throw new Error("Game terbit belum dapat diverifikasi.");
    const validIds = new Set((published || []).map(normalizeGameBlueprint).filter(isPublishedIndependentGame).map((game) => game.id));
    if (validIds.size !== gameIds.length) throw new Error("Pilih hanya game terbit dengan kategori Latihan Mandiri.");
    return gameIds;
  }
  const db = await readLocalDb();
  const validIds = new Set((db.gameBlueprints || []).map(normalizeGameBlueprint).filter(isPublishedIndependentGame).map((game) => game.id));
  if (gameIds.some((id) => !validIds.has(id))) throw new Error("Pilih hanya game terbit dengan kategori Latihan Mandiri.");
  return gameIds;
}

async function saveInstalledGames(classId: string, ids: string[]) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  const desiredIds = [...new Set(ids)];
  const { data: currentRows, error: readError } = await supabase.from("class_games").select("game_id").eq("class_id", classId);
  if (readError) throw new Error(`Relasi latihan mandiri belum dapat dibaca (${readError.code}).`);
  const currentIds = new Set((currentRows || []).map((row) => String(row.game_id)));
  const additions = desiredIds.filter((gameId) => !currentIds.has(gameId));
  const removals = [...currentIds].filter((gameId) => !desiredIds.includes(gameId));

  // Add before removing so a failed write cannot silently clear existing class practice links.
  if (additions.length) {
    const { error } = await supabase.from("class_games").upsert(
      additions.map((game_id) => ({ class_id: classId, game_id })),
      { onConflict: "class_id,game_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`Latihan mandiri gagal disimpan (${error.code}).`);
  }
  if (removals.length) {
    const { error } = await supabase.from("class_games").delete().eq("class_id", classId).in("game_id", removals);
    if (error) throw new Error(`Latihan mandiri gagal diperbarui (${error.code}).`);
  }

  const { data: savedRows, error: verifyError } = await supabase.from("class_games").select("game_id").eq("class_id", classId);
  if (verifyError) throw new Error(`Perubahan latihan mandiri belum dapat diverifikasi (${verifyError.code}).`);
  const savedIds = new Set((savedRows || []).map((row) => String(row.game_id)));
  if (savedIds.size !== desiredIds.length || desiredIds.some((gameId) => !savedIds.has(gameId))) {
    throw new Error("Pilihan latihan mandiri belum tersimpan seluruhnya. Silakan simpan kelas sekali lagi.");
  }
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function hasValidPrice(value: unknown): boolean {
  const price = Number(value ?? 0);
  return Number.isSafeInteger(price) && price >= 0 && price <= MAX_PRICE_IDR;
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
      status: m.status === "terbit" ? "terbit" : "draft",
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
    priceIdr: Math.max(0, Number.isFinite(Number(body.priceIdr ?? existing?.priceIdr ?? 0)) ? Math.round(Number(body.priceIdr ?? existing?.priceIdr ?? 0)) : 0),
    durationDays: 0,
    moduleIds: Array.isArray(body.moduleIds) ? body.moduleIds : (existing?.moduleIds || []),
    modules,
    gameTemplateIds: Array.isArray(body.gameTemplateIds) ? body.gameTemplateIds : (existing?.gameTemplateIds || []),
    gameBlueprintIds: Array.isArray(body.gameBlueprintIds) ? body.gameBlueprintIds : (existing?.gameBlueprintIds || []),
    isPublished,
    createdAt: existing?.createdAt || body.createdAt || new Date().toISOString(),
    tingkat: ["Pemula", "Menengah", "Lanjutan"].includes(body.tingkat) ? body.tingkat : (existing?.tingkat || "Pemula"),
    jadwal: String(body.jadwal ?? existing?.jadwal ?? ""),
    kodeAkses: String(body.kodeAkses ?? existing?.kodeAkses ?? ""),
    status,
  };
}

async function getSessionImpact(classId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    const db = await readLocalDb();
    const sessions = (db.classSessions || []).filter((entry) => entry.classId === classId && entry.status === "open");
    const ids = new Set(sessions.map((entry) => entry.id));
    return { sessions: sessions.length, attendance: (db.classSessionAttendance || []).filter((entry) => ids.has(entry.sessionId)).length };
  }
  const { data, error } = await supabase.from("class_sessions").select("id").eq("class_id", classId).eq("status", "open");
  if (error) throw new Error(`Gagal memeriksa sesi kelas (${error.code || "Supabase"}).`);
  const ids = (data || []).map((row) => row.id);
  if (!ids.length) return { sessions: 0, attendance: 0 };
  const { count, error: attendanceError } = await supabase.from("class_session_attendance").select("id", { count: "exact", head: true }).in("session_id", ids);
  if (attendanceError) throw new Error(`Gagal memeriksa presensi (${attendanceError.code || "Supabase"}).`);
  return { sessions: ids.length, attendance: count || 0 };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ ok: false, error: "Akses ditolak." }, { status: 403 });
  try {
    const impactId = req.nextUrl.searchParams.get("impact");
    if (impactId) return NextResponse.json({ ok: true, impact: await getSessionImpact(impactId) });
    const classes = await getClasses(true);
    return NextResponse.json({ ok: true, classes: await withInstalledGames(classes) });
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
    if (!hasValidPrice(body.priceIdr)) return NextResponse.json({ ok: false, error: `Harga harus berupa bilangan bulat dari Rp 0 sampai ${formatIDR(MAX_PRICE_IDR)}.` }, { status: 400 });
    const toSave = buildClass(body);
    toSave.gameBlueprintIds = await validateIndependentGameIds(toSave.gameBlueprintIds);
    await upsertClass(toSave);
    await saveInstalledGames(toSave.id, toSave.gameBlueprintIds);
    revalidateClassViews();
    const verified = await getClassByIdOrSlug(toSave.id);
    if (!verified) {
      console.error("[api/admin/classes POST] verifikasi gagal, kelas tidak ditemukan setelah simpan", toSave.id);
      return NextResponse.json({ ok: false, error: "Kelas gagal tersimpan ke database (verifikasi setelah simpan tidak menemukan data). Coba lagi." }, { status: 500 });
    }
    const classes = await withInstalledGames(await getClasses(true));
    const [savedWithGames] = await withInstalledGames([verified]);
    console.log("[api/admin/classes POST] tersimpan & terverifikasi", { id: verified.id, title: verified.title, modules: verified.modules?.length || 0 });
    return NextResponse.json({ ok: true, class: savedWithGames, classes, verified: true });
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
    if (!hasValidPrice(body.priceIdr ?? existing.priceIdr)) return NextResponse.json({ ok: false, error: `Harga harus berupa bilangan bulat dari Rp 0 sampai ${formatIDR(MAX_PRICE_IDR)}.` }, { status: 400 });
    const toSave = buildClass(body, existing);
    toSave.gameBlueprintIds = await validateIndependentGameIds(toSave.gameBlueprintIds);
    await upsertClass(toSave);
    await saveInstalledGames(toSave.id, toSave.gameBlueprintIds);
    revalidateClassViews();
    const verified = await getClassByIdOrSlug(toSave.id);
    if (!verified) {
      console.error("[api/admin/classes PATCH] verifikasi gagal", toSave.id);
      return NextResponse.json({ ok: false, error: "Perubahan kelas gagal tersimpan ke database (verifikasi gagal)." }, { status: 500 });
    }
    const classes = await withInstalledGames(await getClasses(true));
    const [savedWithGames] = await withInstalledGames([verified]);
    console.log("[api/admin/classes PATCH] tersimpan & terverifikasi", { id: verified.id, title: verified.title, modules: verified.modules?.length || 0 });
    return NextResponse.json({ ok: true, class: savedWithGames, classes, verified: true });
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
    revalidateClassViews();
    const classes = await getClasses(true);
    return NextResponse.json({
      ok: true,
      deleted: ok,
      message: ok ? "Kelas berhasil dihapus." : "Kelas sudah tidak ada. Daftar diperbarui.",
      classes,
      verified: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelas.";
    const blocked = message.includes("Sesi tatap muka kelas masih terbuka") || message.includes("Kelas berbayar ini sudah dibeli");
    return NextResponse.json({ ok: false, error: message }, { status: blocked ? 409 : 500 });
  }
}
