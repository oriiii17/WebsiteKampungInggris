import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { createInitialSeedData, getCurrentWeekLabel } from "./seed-data";
import { createPublicSupabaseClient, isSupabaseConfigured } from "./supabase";
import { getSupabaseServerClient as getSupabaseAdmin } from "./supabase-server";
import {
  AccessCode,
  DatabaseSchema,
  FlashcardItem,
  LeaderboardEntry,
  MatchingPair,
  ModuleItem,
  QuizQuestion,
  SubscriptionPlan,
  SubscriptionRecord,
  WordChallenge,
  GameRecord,
  GameQuestion,
} from "./types";
import { getBuiltinGames } from "./builtin-games";

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", ".data") : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PRIVATE_PAGES_DIR = path.join(DATA_DIR, "private-pages");
let memoryDb: DatabaseSchema | null = null;
const memoryFiles = new Map<string, Buffer>();

function cloneDb(data: DatabaseSchema): DatabaseSchema {
  return JSON.parse(JSON.stringify(data)) as DatabaseSchema;
}

async function persistDb(data: DatabaseSchema): Promise<void> {
  memoryDb = cloneDb(data);
  const tempFile = `${DB_FILE}.tmp`;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tempFile, DB_FILE);
  } catch {
    try { await fs.unlink(tempFile); } catch {}
  }
}

async function tryWriteFile(filePath: string, contents: Buffer | string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents);
    if (Buffer.isBuffer(contents)) memoryFiles.set(filePath, Buffer.from(contents));
  } catch {
    if (Buffer.isBuffer(contents)) memoryFiles.set(filePath, Buffer.from(contents));
  }
}

async function tryReadFile(filePath: string): Promise<Buffer> {
  try { return await fs.readFile(filePath); }
  catch {
    const cached = memoryFiles.get(filePath);
    if (cached) return Buffer.from(cached);
    throw new Error("File tidak ditemukan.");
  }
}

async function ensureDirs() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
  try { await fs.mkdir(PRIVATE_PAGES_DIR, { recursive: true }); } catch {}
}

// ============================================================================
// SINKRONISASI PENUH TABEL RELASIONAL SUPABASE POSTGRES <-> APLIKASI
// ============================================================================

function sbErrMsg(ctx: string, err: any): string {
  if (!err) return `${ctx}: error tidak diketahui.`;
  const parts = [err.message, err.details, err.hint, err.code].filter(Boolean);
  return `${ctx}: ${parts.join(" | ") || String(err)}`;
}

function throwSb(ctx: string, err: any): never {
  console.error("[Supabase]", ctx, {
    code: err?.code || "SUPABASE_ERROR",
    message: err?.message || "Error tidak diketahui.",
    details: err?.details || "",
    hint: err?.hint || "",
  });
  throw new Error(sbErrMsg(ctx, err));
}

function isMissingTableError(err: any): boolean {
  const msg = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""} ${err?.code || ""}`.toLowerCase();
  return err?.code === "42P01" || err?.code === "PGRST205" || msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("could not find the table");
}

async function upsertChecked(sb: SupabaseClient, table: string, rows: any[], opts?: any) {
  if (!rows || rows.length === 0) return;
  const q = sb.from(table).upsert(rows, opts);
  const { error } = await q;
  if (error) throwSb(`Gagal upsert ke tabel "${table}"`, error);
}

function plansMatch(left: DatabaseSchema["plans"], right: DatabaseSchema["plans"]): boolean {
  const toRows = (plans: DatabaseSchema["plans"]) => plans
    .map((p) => ({
      id: p.id,
      name: p.name,
      duration_days: p.durationDays,
      price_idr: p.priceIdr,
      badge: p.badge || null,
      description: p.description,
      features: p.features,
      is_active: p.isActive,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(toRows(left || [])) === JSON.stringify(toRows(right || []));
}

async function pushFullSchemaToSupabase(
  sb: SupabaseClient,
  data: DatabaseSchema,
  allowMissingRwCodes = false,
  skipUnchangedPlans = false,
) {
  if (!skipUnchangedPlans && data.plans.length > 0) {
    await upsertChecked(sb, "subscription_plans", data.plans.map((p) => ({
      id: p.id,
      name: p.name,
      duration_days: p.durationDays,
      price_idr: p.priceIdr,
      badge: p.badge || null,
      description: p.description,
      features: p.features,
      is_active: p.isActive,
    })));
  }

  if (data.modules.length > 0) {
    await upsertChecked(sb, "modules", data.modules.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      subtitle: m.subtitle,
      category: m.category,
      level: m.level,
      duration_label: m.durationLabel,
      schedule_label: m.scheduleLabel,
      target_audience: m.targetAudience,
      quota_note: m.quotaNote,
      summary: m.summary,
      description: m.description,
      cover_theme: m.coverTheme,
      total_pages: m.totalPages,
      has_custom_uploaded_pages: Boolean(m.hasCustomUploadedPages),
      syllabus: m.syllabus,
      learning_outcomes: m.learningOutcomes,
      benefits: m.benefits,
      preview_highlights: m.previewHighlights,
      seed_pages: m.seedPages || null,
      is_published: m.isPublished,
      created_at: m.createdAt,
    })));
  }

  if (data.accessCodes.length > 0) {
    await upsertChecked(sb, "access_codes", data.accessCodes.map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      rt_rw: c.rtRw,
      holder_type: c.holderType,
      expires_at: c.expiresAt,
      is_active: c.isActive,
      created_by: c.createdBy,
      created_at: c.createdAt,
    })));

  }

  if (data.externalUsers.length > 0) {
    await upsertChecked(sb, "external_users", data.externalUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password_hash: u.passwordHash,
      created_at: u.createdAt,
      ...(u.avatarDataUrl ? { avatar_data_url: u.avatarDataUrl } : {}),
    })));
  }

  if (data.subscriptions.length > 0) {
    await upsertChecked(sb, "subscriptions", data.subscriptions.map((s) => ({
      id: s.id,
      user_email: s.userEmail,
      user_name: s.userName,
      plan_id: s.planId,
      plan_name: s.planName,
      amount_idr: s.amountIdr,
      status: s.status,
      payment_method: s.paymentMethod,
      midtrans_order_id: s.orderId,
      midtrans_snap_token: s.snapToken || null,
      starts_at: s.startsAt || null,
      expires_at: s.expiresAt || null,
      created_at: s.createdAt,
    })));
  }

  if (data.quizzes.length > 0) {
    await upsertChecked(sb, "quiz_questions", data.quizzes.map((q) => ({
      id: q.id,
      module_id: q.moduleId,
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      order_num: q.orderNum,
    })));
  }

  if (data.flashcards.length > 0) {
    await upsertChecked(sb, "flashcards", data.flashcards.map((f) => ({
      id: f.id,
      module_id: f.moduleId,
      english: f.english,
      phonetic: f.phonetic,
      indonesian: f.indonesian,
      example_en: f.exampleEn,
      example_id: f.exampleId,
    })));
  }

  if (data.matchingPairs.length > 0) {
    await upsertChecked(sb, "matching_pairs", data.matchingPairs.map((mp) => ({
      id: mp.id,
      module_id: mp.moduleId,
      english: mp.english,
      indonesian: mp.indonesian,
    })));
  }

  if (data.wordChallenges.length > 0) {
    await upsertChecked(sb, "word_challenges", data.wordChallenges.map((wc) => ({
      id: wc.id,
      module_id: wc.moduleId,
      challenge_type: wc.challengeType,
      clue_id: wc.clueId,
      sentence_blank: wc.sentenceBlank || null,
      answer: wc.answer,
      hint: wc.hint,
    })));
  }

  if (data.leaderboard.length > 0) {
    await upsertChecked(sb, "leaderboard_entries", data.leaderboard.map((lb) => ({
      id: lb.id,
      participant_key: lb.participantKey,
      participant_name: lb.participantName,
      origin_badge: lb.originBadge,
      module_id: lb.moduleId,
      module_title: lb.moduleTitle,
      game_type: lb.gameType,
      score: lb.score,
      week_label: lb.weekLabel,
      created_at: lb.createdAt,
    })));
  }

  // Kelas, pendaftaran, dan game (wajib tersinkron ke Supabase bila tabel ada)
  const classes = data.classes || [];
  if (classes.length > 0) {
    await upsertChecked(sb, "classes", classes.map((c: any) => ({
      id: c.id,
      slug: c.slug || null,
      title: c.title,
      subtitle: c.subtitle ?? null,
      description: c.description ?? "",
      cover_theme: c.coverTheme ?? "emerald",
      price_idr: Number(c.priceIdr ?? 0),
      duration_days: Number(c.durationDays ?? 30),
      module_ids: c.moduleIds ?? [],
      modules: c.modules ?? [],
      materi: c.modules ?? [],
      game_template_ids: c.gameTemplateIds ?? [],
      is_published: c.isPublished !== false,
      tingkat: c.tingkat ?? null,
      jadwal: c.jadwal ?? null,
      kode_akses: c.kodeAkses ?? null,
      status: c.status ?? "draft",
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));
  }

  const enrollments = data.enrollments || [];
  if (enrollments.length > 0) {
    await upsertChecked(sb, "enrollments", enrollments.map((e: any) => ({
      id: e.id,
      class_id: e.classId,
      user_email: (e.userEmail || "").toLowerCase().trim(),
      user_name: e.userName || "",
      starts_at: e.startsAt || null,
      expires_at: e.expiresAt || null,
      status: e.status || "active",
      paid_amount_idr: Number(e.paidAmountIdr ?? 0),
      payment_method: e.paymentMethod ?? null,
      source: e.source || (Number(e.paidAmountIdr ?? 0) > 0 ? "beli" : "legacy"),
      created_at: e.createdAt || new Date().toISOString(),
    })));
  }

  const games = data.games || [];
  for (const game of games) {
    const { data: oldRows, error: oldRowsError } = await sb.from("game_soal")
      .select("id,game_id,urutan")
      .eq("game_id", game.id);
    if (oldRowsError) throwSb(`Gagal membaca soal game "${game.id}"`, oldRowsError);

    const oldIds = new Set((oldRows || []).map((row: any) => row.id as string));
    const seenIds = new Set<string>();
    const keptIds = new Set<string>();
    const questions = game.questions || [];
    const orders = questions.map((_, index) => index + 1);
    if (new Set(orders).size !== orders.length) throw new Error(`Urutan soal duplikat pada game "${game.title}".`);
    for (let index = 0; index < questions.length; index += 1) {
      const question: any = questions[index];
      const questionId = typeof question.id === "string" ? question.id : "";
      if (questionId && seenIds.has(questionId)) {
        throw new Error(`ID soal "${questionId}" duplikat pada game "${game.title}".`);
      }
      if (questionId) seenIds.add(questionId);
      const order = index + 1;
      const row = {
        game_id: game.id,
        pertanyaan: question.prompt || "",
        clue: question.hint || "",
        jawaban: question.answer || "",
        urutan: order,
        data: question,
      };

      if (questionId && oldIds.has(questionId)) {
        const { error } = await sb.from("game_soal").update(row).eq("id", questionId).eq("game_id", game.id);
        if (error) throwSb(`Gagal memperbarui soal "${questionId}"`, error);
        keptIds.add(questionId);
        continue;
      }

      // New questions use the database UUID default and a plain INSERT; existing IDs are updated above.
      const { data: inserted, error: insertError } = await sb.from("game_soal").insert(row).select("id").single();
      if (insertError) throwSb(`Gagal menambahkan soal ke game "${game.title}"`, insertError);
      question.id = inserted.id;
      const { error: dataError } = await sb.from("game_soal").update({ data: { ...question } }).eq("id", inserted.id).eq("game_id", game.id);
      if (dataError) throwSb(`Gagal menyimpan isi soal "${inserted.id}"`, dataError);
      keptIds.add(inserted.id);
      seenIds.add(inserted.id);
    }

    for (const oldId of oldIds) {
      if (keptIds.has(oldId)) continue;
      const { error } = await sb.from("game_soal").delete().eq("id", oldId).eq("game_id", game.id);
      if (error) throwSb(`Gagal menghapus soal "${oldId}"`, error);
    }
  }

  // Sinkronkan penghapusan (remote harus mengikuti data lokal untuk tabel yang dikelola)
  await syncDeletionsById(sb, "classes", (data.classes || []).map((c: any) => c.id));
  await syncDeletionsById(sb, "enrollments", (data.enrollments || []).map((e: any) => e.id));
  // Master game bersifat tetap: sinkronisasi aplikasi tidak menghapus baris games.

  if (data.rwCodes?.length) {
    const { error } = await sb.from("rw_codes").upsert(data.rwCodes.map((rw) => ({
      id: rw.id,
      rw: rw.rw,
      code_hash: rw.codeHash,
      code_display: rw.codeDisplay,
      is_active: rw.isActive,
      updated_at: rw.updatedAt,
      force_logout_at: rw.forceLogoutAt || null,
    })), { onConflict: "id" });
    if (error && !(allowMissingRwCodes && isMissingTableError(error))) throwSb('Gagal upsert ke tabel "rw_codes"', error);
    if (error) console.warn("[Supabase] Tabel rw_codes belum tersedia; perubahan kelas/game tetap tersinkron, perubahan kode RW menunggu migrasi.");
  }
}

async function syncDeletionsById(sb: SupabaseClient, table: string, localIds: string[]) {
  const { data: rows, error } = await sb.from(table).select("id");
  if (error) {
    if (isMissingTableError(error)) return;
    throwSb(`Gagal membaca id tabel "${table}" untuk sinkron hapus`, error);
  }
  const keep = new Set(localIds.filter(Boolean));
  const toDel = (rows || []).map((r: any) => r.id).filter((id: string) => id && !keep.has(id));
  if (toDel.length === 0) return;
  const { error: dErr } = await sb.from(table).delete().in("id", toDel);
  if (dErr) throwSb(`Gagal menghapus data dari tabel "${table}"`, dErr);
}

function mergeByIdPreferLocal<T extends { id: string }>(local: T[] = [], remote: T[] = []): T[] {
  const map = new Map<string, T>();
  for (const r of remote) if (r && r.id) map.set(r.id, r);
  for (const l of local) if (l && l.id) map.set(l.id, l); // lokal terbaru menang
  return Array.from(map.values());
}

async function fetchFullSchemaFromSupabase(
  sb: SupabaseClient
): Promise<DatabaseSchema | null> {
  const { data: modRows, error: modErr } = await sb
    .from("modules")
    .select("id,slug,title,subtitle,category,level,duration_label,schedule_label,target_audience,quota_note,summary,description,cover_theme,total_pages,has_custom_uploaded_pages,syllabus,learning_outcomes,benefits,preview_highlights,seed_pages,is_published,created_at")
    .order("created_at", { ascending: true });

  if (modErr) {
    if (isMissingTableError(modErr)) {
      // skema dasar belum siap -> fallback mode lokal (boleh) agar app tetap jalan
      return null;
    }
    throwSb('Gagal membaca tabel "modules" dari Supabase', modErr);
  }

  // Jika project Supabase baru saja dibuat & kosong, otomatis seed data awal Kampung Sapen!
  if (!modRows || modRows.length === 0) {
    const initial = createInitialSeedData();
    await pushFullSchemaToSupabase(sb, initial, true);
    return initial;
  }

  const [
    plansRes,
    codesRes,
    wargaRes,
    usersRes,
    subsRes,
    quizRes,
    fcRes,
    mpRes,
    wcRes,
    lbRes,
    classesRes,
    enrollmentsRes,
    gamesRes,
    gameQuestionsRes,
    rwCodesRes,
  ] = await Promise.all([
    sb.from("subscription_plans").select("id,name,duration_days,price_idr,badge,description,features,is_active"),
    sb.from("access_codes").select("id,code,label,rt_rw,holder_type,expires_at,is_active,created_by,created_at").order("created_at", { ascending: false }),
    sb.from("warga").select("id,nama,email,kode_warga,foto_profil,created_at").order("created_at", { ascending: false }),
    sb.from("external_users").select("id,name,email,password_hash,created_at,avatar_data_url"),
    sb.from("subscriptions").select("id,user_email,user_name,plan_id,plan_name,amount_idr,status,payment_method,midtrans_order_id,midtrans_snap_token,starts_at,expires_at,created_at").order("created_at", { ascending: false }),
    sb.from("quiz_questions").select("id,module_id,question,options,correct_index,explanation,order_num").order("order_num", { ascending: true }),
    sb.from("flashcards").select("id,module_id,english,phonetic,indonesian,example_en,example_id"),
    sb.from("matching_pairs").select("id,module_id,english,indonesian"),
    sb.from("word_challenges").select("id,module_id,challenge_type,clue_id,sentence_blank,answer,hint"),
    sb.from("leaderboard_entries").select("id,participant_key,participant_name,origin_badge,module_id,module_title,game_type,score,week_label,created_at"),
    sb.from("classes").select("id,slug,title,subtitle,description,cover_theme,price_idr,duration_days,module_ids,modules,materi,game_template_ids,is_published,tingkat,jadwal,kode_akses,status,created_at"),
    sb.from("enrollments").select("id,class_id,user_email,user_name,starts_at,expires_at,status,paid_amount_idr,payment_method,source,created_at"),
    sb.from("games").select("id,nama_game,jenis_game,deskripsi,created_at,updated_at"),
    sb.from("game_soal").select("id,game_id,pertanyaan,clue,jawaban,urutan,data,created_at"),
    sb.from("rw_codes").select("id,rw,code_hash,code_display,is_active,updated_at,force_logout_at"),
  ]);

  // kelas/enrollments/games: jika tabel belum ada (belum migrasi), laporkan jelas
  const critical = [
    { name: "classes", res: classesRes },
    { name: "enrollments", res: enrollmentsRes },
    { name: "games", res: gamesRes },
    { name: "game_soal", res: gameQuestionsRes },
  ];
  for (const c of critical) {
    if (c.res.error && !isMissingTableError(c.res.error)) {
      throwSb(`Gagal membaca tabel "${c.name}" dari Supabase`, c.res.error);
    }
  }
  if (wargaRes.error && !isMissingTableError(wargaRes.error)) {
    throwSb('Gagal membaca tabel "warga" dari Supabase', wargaRes.error);
  }

  const seed = createInitialSeedData();
  return {
    plans: (plansRes.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      durationDays: p.duration_days,
      priceIdr: p.price_idr,
      badge: p.badge || undefined,
      description: p.description || "",
      features: p.features || [],
      isActive: p.is_active,
    })),
    modules: modRows.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      subtitle: m.subtitle,
      category: m.category,
      level: m.level,
      durationLabel: m.duration_label,
      scheduleLabel: m.schedule_label,
      targetAudience: m.target_audience,
      quotaNote: m.quota_note || "Gratis dengan Kode Warga Sapen",
      summary: m.summary,
      description: m.description,
      coverTheme: m.cover_theme,
      totalPages: m.total_pages,
      hasCustomUploadedPages: Boolean(m.has_custom_uploaded_pages),
      syllabus: m.syllabus || [],
      learningOutcomes: m.learning_outcomes || [],
      benefits: m.benefits || [],
      previewHighlights: m.preview_highlights || [],
      seedPages: m.seed_pages || undefined,
      isPublished: m.is_published,
      createdAt: m.created_at,
    })),
    accessCodes: (codesRes.data || []).map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      rtRw: c.rt_rw,
      holderType: c.holder_type,
      expiresAt: c.expires_at,
      isActive: c.is_active,
      createdBy: c.created_by,
      createdAt: c.created_at,
    })),
    externalUsers: (usersRes.data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.password_hash,
      createdAt: u.created_at,
      avatarDataUrl: u.avatar_data_url || undefined,
    })),
    subscriptions: (subsRes.data || []).map((s) => ({
      id: s.id,
      userEmail: s.user_email,
      userName: s.user_name,
      planId: s.plan_id,
      planName: s.plan_name || "Paket Belajar",
      amountIdr: s.amount_idr,
      status: s.status,
      paymentMethod: s.payment_method || "QRIS",
      orderId: s.midtrans_order_id,
      snapToken: s.midtrans_snap_token || undefined,
      startsAt: s.starts_at || undefined,
      expiresAt: s.expires_at || undefined,
      createdAt: s.created_at,
    })),
    quizzes: (quizRes.data || []).map((q) => ({
      id: q.id,
      moduleId: q.module_id,
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
      explanation: q.explanation,
      orderNum: q.order_num,
    })),
    flashcards: (fcRes.data || []).map((f) => ({
      id: f.id,
      moduleId: f.module_id,
      english: f.english,
      phonetic: f.phonetic || "",
      indonesian: f.indonesian,
      exampleEn: f.example_en || "",
      exampleId: f.example_id || "",
    })),
    matchingPairs: (mpRes.data || []).map((mp) => ({
      id: mp.id,
      moduleId: mp.module_id,
      english: mp.english,
      indonesian: mp.indonesian,
    })),
    wordChallenges: (wcRes.data || []).map((wc) => ({
      id: wc.id,
      moduleId: wc.module_id,
      challengeType: wc.challenge_type,
      clueId: wc.clue_id,
      sentenceBlank: wc.sentence_blank || undefined,
      answer: wc.answer,
      hint: wc.hint || "",
    })),
    leaderboard: (lbRes.data || []).map((lb) => ({
      id: lb.id,
      participantKey: lb.participant_key,
      participantName: lb.participant_name,
      originBadge: lb.origin_badge,
      moduleId: lb.module_id || "",
      moduleTitle: lb.module_title || "Modul Bahasa Inggris",
      gameType: lb.game_type,
      score: lb.score,
      weekLabel: lb.week_label,
      createdAt: lb.created_at,
    })),
    warga: (wargaRes.data || []).flatMap((w: any) => {
      const code = (codesRes.data || []).find((item: any) => String(item.code).toUpperCase() === String(w.kode_warga || "").toUpperCase());
      const rw = String(code?.rt_rw || "").match(/RW\s*0?([0-9]+)/i)?.[1];
      if (!rw || !["06", "07", "08"].includes(rw.padStart(2, "0"))) return [];
      return [{
        id: String(w.id),
        namaPanggilan: String(w.nama || "Warga Sapen"),
        rw: `RW ${rw.padStart(2, "0")}` as WargaRecord["rw"],
        createdAt: w.created_at || new Date().toISOString(),
        lastLoginAt: w.created_at || new Date().toISOString(),
        isBlocked: false,
        totalGamesPlayed: 0,
        highScore: 0,
        avatarDataUrl: w.foto_profil || undefined,
      }];
    }),
    loginLog: [],
    rwCodes: rwCodesRes.error
      ? seed.rwCodes
      : ((rwCodesRes.data || []).length ? rwCodesRes.data.map((rw: any) => ({
          id: rw.id || `rw-${String(rw.rw).replace("RW ", "")}-1`,
          rw: rw.rw,
          codeHash: rw.code_hash,
          codeDisplay: rw.code_display,
          isActive: Boolean(rw.is_active),
          updatedAt: rw.updated_at,
          forceLogoutAt: rw.force_logout_at || undefined,
        })) : (await readNormalizedLocalDb())?.rwCodes || seed.rwCodes),
    testimoni: [],
    classes: (classesRes.error && isMissingTableError(classesRes.error)) ? [] : (classesRes.data || []).map((c: any) => ({
      id: c.id,
      slug: c.slug || "",
      title: c.title || "",
      subtitle: c.subtitle || "",
      description: c.description || "",
      coverTheme: c.cover_theme || "emerald",
      priceIdr: Number(c.price_idr ?? 0),
      durationDays: Number(c.duration_days ?? 30),
      moduleIds: Array.isArray(c.module_ids) ? c.module_ids : [],
      modules: Array.isArray(c.modules) ? c.modules : (Array.isArray(c.materi) ? c.materi : []),
      gameTemplateIds: Array.isArray(c.game_template_ids) ? c.game_template_ids : [],
      isPublished: c.is_published !== false,
      tingkat: c.tingkat || "Pemula",
      jadwal: c.jadwal || "",
      kodeAkses: c.kode_akses || "",
      status: c.status || "draft",
      createdAt: c.created_at || new Date().toISOString(),
    })),
    enrollments: (enrollmentsRes.error && isMissingTableError(enrollmentsRes.error)) ? [] : (enrollmentsRes.data || []).map((e: any) => ({
      id: e.id,
      classId: e.class_id,
      userEmail: e.user_email || "",
      userName: e.user_name || "",
      startsAt: e.starts_at || "",
      expiresAt: e.expires_at || "",
      status: e.status || "active",
      paidAmountIdr: Number(e.paid_amount_idr ?? 0),
      paymentMethod: e.payment_method || undefined,
      source: e.source || (Number(e.paid_amount_idr ?? 0) > 0 ? "beli" : "legacy"),
      createdAt: e.created_at || new Date().toISOString(),
    })),
    games: (gamesRes.error && isMissingTableError(gamesRes.error)) ? [] : (gamesRes.data || []).map((g: any) => ({
      id: g.id,
      title: g.nama_game || "",
      kind: g.jenis_game,
      questions: (gameQuestionsRes.data || []).filter((q: any) => q.game_id === g.id).map((q: any) => q.data),
      createdAt: g.created_at || new Date().toISOString(),
      updatedAt: g.updated_at || g.created_at || new Date().toISOString(),
    })),
  };
}

function ensureBuiltinGames(parsed: DatabaseSchema): boolean {
  const builtins = getBuiltinGames();
  let changed = false;
  if (!Array.isArray(parsed.games)) parsed.games = [];
  if (parsed.games.length === 0) {
    parsed.games = builtins;
    return true;
  }
  for (const bg of builtins) {
    const exists = parsed.games.some((g) => g.id === bg.id || (bg.migratedFromTemplateId && g.migratedFromTemplateId === bg.migratedFromTemplateId));
    if (!exists) { parsed.games.unshift(bg); changed = true; }
  }
  return changed;
}

async function readNormalizedLocalDb(): Promise<DatabaseSchema | null> {
  await ensureDirs();
  try {
    let raw: string;
    try { raw = await fs.readFile(DB_FILE, "utf8"); }
    catch { if (memoryDb) raw = JSON.stringify(memoryDb); else return null; }
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const initial = createInitialSeedData();
    if (!parsed.warga) parsed.warga = [];
    if (!parsed.loginLog) parsed.loginLog = [];
    if (!parsed.rwCodes || parsed.rwCodes.length === 0) parsed.rwCodes = initial.rwCodes;
    parsed.rwCodes = parsed.rwCodes.map((code: any) => ({ ...code, id: code.id || `rw-${String(code.rw).replace("RW ", "")}-1` }));
    if (!parsed.testimoni) parsed.testimoni = [];
    if (!parsed.gameScoreHistory) parsed.gameScoreHistory = [];
    if (!parsed.classes) parsed.classes = [];
    if (!parsed.enrollments) parsed.enrollments = [];
    if (!parsed.gameBlueprints) parsed.gameBlueprints = [];
    if (!parsed.classSessions) parsed.classSessions = [];
    if (!parsed.classSessionGuests) parsed.classSessionGuests = [];
    if (!parsed.classSessionAttendance) parsed.classSessionAttendance = [];
    if (!parsed.classSessionGames) parsed.classSessionGames = [];
    const changed = ensureBuiltinGames(parsed);
    if (changed) await persistDb(parsed);
    return parsed;
  } catch {
    return null;
  }
}

// TODO: Temporary Vercel /tmp and in-memory fallback until the full Supabase migration.
export async function readLocalDb(): Promise<DatabaseSchema> {
  await ensureDirs();
  const local = await readNormalizedLocalDb();
  const sb = await getSupabaseAdmin();
  if (sb) {
    const remote = await fetchFullSchemaFromSupabase(sb);
    if (remote) {
      // Gabungkan remote + lokal, tapi data lokal (baru dibuat di server ini) DIPRIORITASKAN
      const merged: DatabaseSchema = {
        ...remote,
        gameScoreHistory: local?.gameScoreHistory || [],
        games: mergeByIdPreferLocal(local?.games || [], remote.games || []),
        gameBlueprints: local?.gameBlueprints || [],
        classSessions: local?.classSessions || [],
        classSessionGuests: local?.classSessionGuests || [],
        classSessionAttendance: local?.classSessionAttendance || [],
        classSessionGames: local?.classSessionGames || [],
        classes: mergeByIdPreferLocal(local?.classes || [], remote.classes || []),
        enrollments: mergeByIdPreferLocal(local?.enrollments || [], remote.enrollments || []),
        warga: (remote.warga || []) as any,
        loginLog: [],
        rwCodes: mergeByIdPreferLocal(local?.rwCodes || [], remote.rwCodes || []),
        testimoni: mergeByIdPreferLocal(local?.testimoni || [], (remote.testimoni || []) as any) as any,
      };
      ensureBuiltinGames(merged);
      await persistDb(merged);
      return merged;
    }
  }

  if (local) return local;
  const initial = createInitialSeedData();
  initial.games = getBuiltinGames();
  await ensureDirs();
  await persistDb(initial);
  return initial;
}

// TODO: Temporary Vercel /tmp and in-memory persistence until the full Supabase migration.
export async function writeLocalDb(data: DatabaseSchema): Promise<void> {
  await ensureDirs();
  // 1) Sinkronisasi remote terlebih dahulu; jangan mengakui simpan sebelum database konfirmasi.
  const sb = await getSupabaseAdmin();
  if (sb) {
    const previous = await readNormalizedLocalDb();
    const rwCodesUnchanged = JSON.stringify(previous?.rwCodes || []) === JSON.stringify(data.rwCodes || []);
    const plansUnchanged = previous ? plansMatch(previous.plans || [], data.plans || []) : false;
    await pushFullSchemaToSupabase(sb, data, rwCodesUnchanged, plansUnchanged);
  }
  // 2) Atomik di disk, setelah remote berhasil sehingga random code tidak hilang diam-diam.
  await persistDb(data);
}

export async function resetLocalDbToSeed(): Promise<DatabaseSchema> {
  const seed = createInitialSeedData();
  await writeLocalDb(seed);
  return seed;
}

// ============================================================================
// PRIVATE PAGE IMAGE STORAGE (PDF -> GAMBAR PER HALAMAN DI PRIVATE STORAGE)
// ============================================================================

export async function savePrivatePageImage(
  moduleId: string,
  pageNumber: number,
  buffer: Buffer,
  mimeType = "image/webp"
): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : "webp";
  const storagePath = `modules/${moduleId}/page-${pageNumber}.${ext}`;

  // 1. Simpan selalu ke disk lokal sebagai salinan aman instan
  const modDir = path.join(PRIVATE_PAGES_DIR, moduleId);
  const localFilePath = path.join(modDir, `page-${pageNumber}.${ext}`);
  await tryWriteFile(localFilePath, buffer);

  // 2. Unggah juga ke Supabase Storage & tabel module_pages jika terhubung
  const sb = await getSupabaseAdmin();
  if (sb) {
    try {
      const { error: uploadError } = await sb.storage
        .from("module-pages")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

      if (!uploadError) {
        await sb.from("module_pages").upsert(
          {
            module_id: moduleId,
            page_number: pageNumber,
            storage_path: storagePath,
          },
          { onConflict: "module_id,page_number" }
        );
      }
    } catch {
      // Disk lokal sudah aman tersimpan
    }
    return storagePath;
  }

  return localFilePath;
}

export async function readPrivatePageImage(
  moduleId: string,
  pageNumber: number
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sb = await getSupabaseAdmin();
  if (sb) {
    // 1. Cek dari tabel module_pages atau langsung download dari path Supabase Storage
    const candidatePaths = [
      `modules/${moduleId}/page-${pageNumber}.webp`,
      `modules/${moduleId}/page-${pageNumber}.png`,
    ];

    try {
      const { data: row } = await sb
        .from("module_pages")
        .select("storage_path")
        .eq("module_id", moduleId)
        .eq("page_number", pageNumber)
        .maybeSingle();

      if (row?.storage_path && !candidatePaths.includes(row.storage_path)) {
        candidatePaths.unshift(row.storage_path);
      }
    } catch {
      // Lanjut coba candidatePaths
    }

    for (const sp of candidatePaths) {
      try {
        const { data: blob, error } = await sb.storage.from("module-pages").download(sp);
        if (!error && blob) {
          const arr = await blob.arrayBuffer();
          const buffer = Buffer.from(arr);
          const contentType = sp.endsWith(".png") ? "image/png" : "image/webp";

          // Simpan juga ke cache lokal agar pembacaan berikutnya instan
          const modDir = path.join(PRIVATE_PAGES_DIR, moduleId);
          await tryWriteFile(path.join(modDir, `page-${pageNumber}.${sp.endsWith(".png") ? "png" : "webp"}`), buffer);

          // Auto-repair record tabel module_pages jika belum tercatat
          Promise.resolve(
            sb.from("module_pages").upsert(
              { module_id: moduleId, page_number: pageNumber, storage_path: sp },
              { onConflict: "module_id,page_number" }
            )
          ).catch(() => {});

          return { buffer, contentType };
        }
      } catch {
        // Coba kandidat berikutnya
      }
    }
  }

  // 2. Cek disk lokal jika Supabase tidak tersedia / offline
  const modDir = path.join(PRIVATE_PAGES_DIR, moduleId);
  for (const ext of ["webp", "png"]) {
    try {
      const filePath = path.join(modDir, `page-${pageNumber}.${ext}`);
      const buf = await tryReadFile(filePath);
      return {
        buffer: buf,
        contentType: ext === "png" ? "image/png" : "image/webp",
      };
    } catch {
      // Lanjut cek ekstensi berikutnya
    }
  }

  return null;
}

// ============================================================================
// REPOSITORY HELPERS
// ============================================================================

export async function getModules(includeUnpublished = false): Promise<ModuleItem[]> {
  const db = await readLocalDb();
  return includeUnpublished ? db.modules : db.modules.filter((m) => m.isPublished);
}

export async function getModuleBySlugOrId(slugOrId: string): Promise<ModuleItem | null> {
  const db = await readLocalDb();
  return db.modules.find((m) => m.slug === slugOrId || m.id === slugOrId) || null;
}

export async function upsertModule(mod: ModuleItem): Promise<ModuleItem> {
  const db = await readLocalDb();
  const idx = db.modules.findIndex((m) => m.id === mod.id);
  if (idx >= 0) {
    db.modules[idx] = mod;
  } else {
    db.modules.unshift(mod);
  }
  await writeLocalDb(db);
  return mod;
}

export async function deleteModule(moduleId: string): Promise<void> {
  const db = await readLocalDb();
  db.modules = db.modules.filter((m) => m.id !== moduleId);
  const sb = await getSupabaseAdmin();
  if (sb) {
    await sb.from("modules").delete().eq("id", moduleId);
  }
  await writeLocalDb(db);
}

export async function getAccessCodes(): Promise<AccessCode[]> {
  const db = await readLocalDb();
  return db.accessCodes;
}

export async function createAccessCode(entry: AccessCode): Promise<AccessCode> {
  const db = await readLocalDb();
  if (db.accessCodes.some((c) => c.code.toUpperCase() === entry.code.toUpperCase())) {
    throw new Error("Kode akses tersebut sudah digunakan. Silakan pilih kode lain.");
  }
  db.accessCodes.unshift(entry);
  await writeLocalDb(db);
  return entry;
}

export async function updateAccessCodeStatus(
  codeId: string,
  action: "toggle" | "delete"
): Promise<void> {
  const db = await readLocalDb();
  const idx = db.accessCodes.findIndex((c) => c.id === codeId);
  if (idx < 0) return;

  const sb = await getSupabaseAdmin();
  if (action === "delete") {
    db.accessCodes.splice(idx, 1);
    if (sb) await sb.from("access_codes").delete().eq("id", codeId);
  } else if (action === "toggle") {
    db.accessCodes[idx].isActive = !db.accessCodes[idx].isActive;
  }
  await writeLocalDb(db);
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const db = await readLocalDb();
  return db.plans.filter((p) => p.isActive);
}

export async function getSubscriptions(): Promise<SubscriptionRecord[]> {
  const db = await readLocalDb();
  return db.subscriptions;
}

export async function getActiveSubscriptionForEmail(
  email: string
): Promise<SubscriptionRecord | null> {
  const db = await readLocalDb();
  const lower = email.trim().toLowerCase();
  return (
    db.subscriptions.find(
      (s) =>
        s.userEmail.toLowerCase() === lower &&
        s.status === "active" &&
        s.expiresAt &&
        new Date(s.expiresAt).getTime() > Date.now()
    ) || null
  );
}

export async function getModuleGames(moduleId: string): Promise<{
  quizzes: QuizQuestion[];
  flashcards: FlashcardItem[];
  matchingPairs: MatchingPair[];
  wordChallenges: WordChallenge[];
}> {
  const db = await readLocalDb();
  return {
    quizzes: db.quizzes
      .filter((q) => q.moduleId === moduleId)
      .sort((a, b) => a.orderNum - b.orderNum),
    flashcards: db.flashcards.filter((f) => f.moduleId === moduleId),
    matchingPairs: db.matchingPairs.filter((m) => m.moduleId === moduleId),
    wordChallenges: db.wordChallenges.filter((w) => w.moduleId === moduleId),
  };
}

export async function getWeeklyLeaderboard(): Promise<{
  weekLabel: string;
  entries: LeaderboardEntry[];
}> {
  const db = await readLocalDb();
  const weekLabel = getCurrentWeekLabel();
  const entries = [...db.leaderboard]
    .filter((e) => e.weekLabel === weekLabel)
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
  return { weekLabel, entries };
}

export async function recordLeaderboardScore(
  entry: Omit<LeaderboardEntry, "id" | "weekLabel" | "createdAt">
) {
  const db = await readLocalDb();
  const weekLabel = getCurrentWeekLabel();

  const existingIdx = db.leaderboard.findIndex(
    (e) =>
      e.weekLabel === weekLabel &&
      e.participantKey === entry.participantKey &&
      e.moduleId === entry.moduleId &&
      e.gameType === entry.gameType
  );

  const record: LeaderboardEntry = {
    ...entry,
    id: `lb-${Date.now()}`,
    weekLabel,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    if (entry.score >= db.leaderboard[existingIdx].score) {
      db.leaderboard[existingIdx] = record;
    }
  } else {
    db.leaderboard.push(record);
  }

  await writeLocalDb(db);
  return record;
}

export function getSystemDiagnostics() {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "(Mode Lokal .data/db.json Aktif)",
    midtransConfigured: Boolean(
      process.env.MIDTRANS_SERVER_KEY && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    ),
    midtransEnvironment:
      process.env.MIDTRANS_IS_PRODUCTION === "true" ? "Production" : "Sandbox / Simulator",
    privateStorageMode: isSupabaseConfigured()
      ? "Supabase Private Bucket (module-pages)"
      : "Server Private Folder (.data/private-pages) + Signed HMAC URL",
  };
}

// ============================================================================
// WARGA RW — Login berbasis kode per RW
// ============================================================================

import { WargaRecord, RwCode, TestimoniRecord } from "./types";

/** Ambil semua warga terdaftar */
export async function getAllWarga(): Promise<WargaRecord[]> {
  const db = await readLocalDb();
  return db.warga || [];
}

/** Ambil kode RW */
export async function getRwCodes(): Promise<RwCode[]> {
  const db = await readLocalDb();
  return db.rwCodes || [];
}

/** Blokir / unblokir warga */
export async function setWargaBlocked(wargaId: string, blocked: boolean): Promise<boolean> {
  const db = await readLocalDb();
  const w = (db.warga || []).find((w) => w.id === wargaId);
  if (!w) return false;
  w.isBlocked = blocked;
  await writeLocalDb(db);
  return true;
}

/** Hapus warga */
export async function deleteWarga(wargaId: string): Promise<boolean> {
  const db = await readLocalDb();
  const before = (db.warga || []).length;
  db.warga = (db.warga || []).filter((w) => w.id !== wargaId);
  if (db.warga.length === before) return false;
  await writeLocalDb(db);
  return true;
}

/** Statistik warga untuk beranda */
export async function getWargaStats(): Promise<{
  totalWarga: number;
  perRw: Record<string, number>;
  totalGameEntries: number;
}> {
  const db = await readLocalDb();
  const warga = db.warga || [];
  return {
    totalWarga: warga.filter((w) => !w.isBlocked).length,
    perRw: {
      "RW 06": warga.filter((w) => w.rw === "RW 06" && !w.isBlocked).length,
      "RW 07": warga.filter((w) => w.rw === "RW 07" && !w.isBlocked).length,
      "RW 08": warga.filter((w) => w.rw === "RW 08" && !w.isBlocked).length,
    },
    totalGameEntries: (db.leaderboard || []).length,
  };
}

/** Ambil testimoni yang sudah disetujui */
export async function getApprovedTestimoni(): Promise<TestimoniRecord[]> {
  const supabase = createPublicSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("reviews").select("id,user_id,rating,isi,status,display_name,created_at").eq("status", "terbit").order("created_at", { ascending: false });
    if (!error && data) {
      const db = await readLocalDb();
      return data.map((row) => {
        const user = (db.externalUsers || []).find((item) => item.id === row.user_id);
        const nama = String(row.display_name || user?.name || "Peserta Sapen");
        const isi = String(row.isi || "");
        return { id: String(row.id), userId: String(row.user_id), rating: Number(row.rating), isi, status: "terbit" as const, avatarDataUrl: user?.avatarDataUrl, nama, rw: "", komentar: isi, isApproved: true, createdAt: String(row.created_at) };
      });
    }
  }
  const db = await readLocalDb();
  return (db.testimoni || []).filter((t) => t.isApproved || t.status === "terbit").map((t) => ({ ...t, status: "terbit" as const, rating: t.rating || 5, isi: t.isi || t.komentar }));
}

/** Tambah testimoni baru */
export async function addTestimoni(t: Omit<TestimoniRecord, "id" | "createdAt" | "isApproved">): Promise<TestimoniRecord> {
  const db = await readLocalDb();
  if (!db.testimoni) db.testimoni = [];
  const rec: TestimoniRecord = {
    id: `testi-${Date.now()}`,
    ...t,
    isApproved: false,
    createdAt: new Date().toISOString(),
  };
  db.testimoni.push(rec);
  await writeLocalDb(db);
  return rec;
}

/** Update status testimoni (admin) */
export async function updateTestimoniStatus(id: string, isApproved: boolean): Promise<boolean> {
  const db = await readLocalDb();
  const t = (db.testimoni || []).find((t) => t.id === id);
  if (!t) return false;
  t.isApproved = isApproved;
  await writeLocalDb(db);
  return true;
}

/** Hapus testimoni */
export async function deleteTestimoni(id: string): Promise<boolean> {
  const db = await readLocalDb();
  const before = (db.testimoni || []).length;
  db.testimoni = (db.testimoni || []).filter((t) => t.id !== id);
  if (db.testimoni.length === before) return false;
  await writeLocalDb(db);
  return true;
}

/** Simpan skor game ke leaderboard */
export async function saveGameScore(opts: {
  participantKey: string;
  participantName: string;
  originBadge: string;
  gameId: string;
  gameTitle: string;
  score: number;
}): Promise<LeaderboardEntry> {
  const db = await readLocalDb();
  const entry: LeaderboardEntry = {
    id: `lb-game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    participantKey: opts.participantKey,
    participantName: opts.participantName,
    originBadge: opts.originBadge,
    moduleId: opts.gameId,
    moduleTitle: opts.gameTitle,
    gameType: "Quiz Pilihan Ganda",
    score: opts.score,
    weekLabel: getCurrentWeekLabel(),
    createdAt: new Date().toISOString(),
  };
  if (!db.leaderboard) db.leaderboard = [];
  db.leaderboard.push(entry);
  // Update highScore warga
  if (opts.participantKey.startsWith("warga-")) {
    const w = (db.warga || []).find((w) => w.id === opts.participantKey || `warga-${w.namaPanggilan}` === opts.participantKey);
    if (w) {
      w.totalGamesPlayed = (w.totalGamesPlayed || 0) + 1;
      if (opts.score > (w.highScore || 0)) w.highScore = opts.score;
    }
  }
  await writeLocalDb(db);
  return entry;
}

/** Ubah nama panggilan warga */
export async function updateWargaNama(wargaId: string, namaBaru: string): Promise<boolean> {
  const db = await readLocalDb();
  const w = (db.warga || []).find((w) => w.id === wargaId);
  if (!w) return false;
  w.namaPanggilan = namaBaru.trim();
  await writeLocalDb(db);
  return true;
}

/** Reset akun warga (reset skor dan total main) */
export async function resetWargaStats(wargaId: string): Promise<boolean> {
  const db = await readLocalDb();
  const w = (db.warga || []).find((w) => w.id === wargaId);
  if (!w) return false;
  w.totalGamesPlayed = 0;
  w.highScore = 0;
  await writeLocalDb(db);
  return true;
}

// ============================================================================
// MANAJEMEN KELAS & PENDAFTARAN MANDIRI (CLASSES & ENROLLMENTS)
// ============================================================================

import { ClassEnrollment, ClassItem, ClassModule } from "./types";

function normalizeClassModules(item: ClassItem, dbModules: ModuleItem[]): ClassItem {
  const baseModules = Array.isArray(item.modules) ? [...item.modules] : [];
  if (baseModules.length === 0 && Array.isArray(item.moduleIds) && item.moduleIds.length > 0) {
    item.moduleIds.forEach((mid, idx) => {
      const m = dbModules.find((x) => x.id === mid);
      baseModules.push({
        id: `cm-${item.id}-${mid}`,
        kelasId: item.id,
        judulBebas: m?.title || `Modul ${idx + 1}`,
        deskripsi: m?.subtitle || m?.summary || "Materi pembelajaran kelas.",
        urutan: idx + 1,
        status: "terbit",
        quiz: null,
      });
    });
  }
  const modules: ClassModule[] = baseModules
    .map((m, idx) => ({
      id: m.id || `cm-${item.id}-${idx + 1}`,
      kelasId: m.kelasId || item.id,
      judulBebas: m.judulBebas || `Modul ${idx + 1}`,
      deskripsi: m.deskripsi || "",
      urutan: typeof m.urutan === "number" ? m.urutan : idx + 1,
      filePDF: m.filePDF,
      fileAsli: m.fileAsli,
      fileAsliName: m.fileAsliName,
      fileType: m.fileType,
      status: (m.status === "draft" ? "draft" : "terbit") as "draft" | "terbit",
      quiz: m.quiz ?? null,
    }))
    .sort((a, b) => a.urutan - b.urutan)
    .map((m, idx) => ({ ...m, urutan: idx + 1 }));

  return {
    ...item,
    status: item.status || "berjalan",
    tingkat: item.tingkat || "Pemula",
    jadwal: item.jadwal || "",
    kodeAkses: item.kodeAkses || "",
    modules,
  };
}

const DEFAULT_INITIAL_CLASSES: ClassItem[] = [
  {
    id: "class-conversation-starter",
    slug: "conversation-starter",
    title: "Kelas Percakapan & Kosakata Praktis",
    subtitle: "Kombinasi materi berbicara, menyapa turis, dan game interaktif",
    description:
      "Program kelas terpadu untuk melatih rasa percaya diri berbicara bahasa Inggris. Berisi modul interaktif lengkap dengan audio dan kuis live.",
    coverTheme: "emerald",
    priceIdr: 49000,
    durationDays: 30,
    moduleIds: [],
    modules: [
      { id: "cm-conv-1", kelasId: "class-conversation-starter", judulBebas: "Bab 1: Sapaan & Perkenalan", deskripsi: "Dasar menyapa, memperkenalkan diri, dan membuka percakapan.", urutan: 1, status: "terbit", quiz: null, filePDF: "classes/class-conversation-starter/modules/cm-conv-1/materi-uji-flipbook.pdf", fileAsli: "classes/class-conversation-starter/modules/cm-conv-1/materi-uji-flipbook.pdf", fileType: "pdf", fileAsliName: "materi-uji-flipbook-4hal.pdf" },
      { id: "cm-conv-2", kelasId: "class-conversation-starter", judulBebas: "Bab 2: Percakapan Sehari-hari", deskripsi: "Ungkapan praktis untuk situasi harian dan menyapa tamu.", urutan: 2, status: "terbit", quiz: null },
    ],
    gameTemplateIds: ["telling-time", "word-match"],
    isPublished: true,
    createdAt: new Date().toISOString(),
    tingkat: "Pemula",
    jadwal: "Fleksibel, 2x per minggu",
    kodeAkses: "SAPEN-CONV",
    status: "berjalan",
  },
  {
    id: "class-grammar-mastery",
    slug: "grammar-mastery",
    title: "Kelas Tata Bahasa & Struktur Kalimat",
    subtitle: "Pondasi tenses, penyusunan kalimat, dan latihan mandiri",
    description:
      "Kelas komprehensif mengupas tuntas tata bahasa Inggris dari dasar dengan penjelasan santai, latihan mandiri berbobot, dan tantangan kata.",
    coverTheme: "amber",
    priceIdr: 65000,
    durationDays: 60,
    moduleIds: [],
    modules: [
      { id: "cm-gram-1", kelasId: "class-grammar-mastery", judulBebas: "Pertemuan 1: Dasar Kalimat", deskripsi: "Mengenal subjek, predikat, dan pola kalimat sederhana.", urutan: 1, status: "terbit", quiz: null },
      { id: "cm-gram-2", kelasId: "class-grammar-mastery", judulBebas: "Pertemuan 2: Tenses Dasar", deskripsi: "Present, past, dan future dalam konteks sehari-hari.", urutan: 2, status: "terbit", quiz: null },
    ],
    gameTemplateIds: ["word-builder", "quick-quiz"],
    isPublished: true,
    createdAt: new Date().toISOString(),
    tingkat: "Menengah",
    jadwal: "Fleksibel, 2x per minggu",
    kodeAkses: "SAPEN-GRAM",
    status: "berjalan",
  },
];

// TODO: Temporary Vercel /tmp and in-memory fallback until the full Supabase migration.
export async function getClasses(includeUnpublished = false): Promise<ClassItem[]> {
  const db = await readLocalDb();
  let changed = false;
  if (!db.classes || db.classes.length === 0) {
    const initial = DEFAULT_INITIAL_CLASSES.map((c) => normalizeClassModules(c, db.modules || []));
    db.classes = initial;
    await writeLocalDb(db);
    return includeUnpublished ? initial : initial.filter((c) => c.isPublished);
  }
  const normalized = db.classes.map((c) => {
    const n = normalizeClassModules(c as ClassItem, db.modules || []);
    if (JSON.stringify(n.modules) !== JSON.stringify((c as ClassItem).modules) || n.status !== (c as ClassItem).status) changed = true;
    return n;
  });
  if (changed) {
    db.classes = normalized;
    await writeLocalDb(db);
  }
  return includeUnpublished ? normalized : normalized.filter((c) => c.isPublished);
}

export async function getPublishedIndependentGameCounts(classIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(classIds.filter(Boolean))];
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;
  try {
    const supabase = await getSupabaseAdmin();
    if (supabase) {
      const { data: links, error: linksError } = await supabase.from("class_games").select("class_id,game_id").in("class_id", ids);
      if (!linksError && links) {
        if (!links.length) return counts;
        const gameIds = [...new Set(links.map((link) => String(link.game_id)))];
        const { data: games, error } = await supabase.from("game_blueprints").select("id,status,destination").in("id", gameIds).in("status", ["published", "independent"]).eq("destination", "independent");
        if (!error) {
          const valid = new Set((games || []).map((game) => String(game.id)));
          for (const link of links) if (valid.has(String(link.game_id))) counts[String(link.class_id)] = (counts[String(link.class_id)] || 0) + 1;
          return counts;
        }
      }
    }
  } catch {
    // Use the local database snapshot when the optional Supabase source is unavailable.
  }
  const db = await readLocalDb();
  const games = new Map((db.gameBlueprints || []).map((game) => [String(game.id), game]));
  for (const cls of db.classes || []) {
    if (!ids.includes(cls.id)) continue;
    counts[cls.id] = [...new Set(cls.gameBlueprintIds || [])].filter((id) => {
      const game = games.get(String(id));
      return Boolean(game && ["published", "independent"].includes(game.status) && game.destination === "independent");
    }).length;
  }
  return counts;
}

export async function getClassByIdOrSlug(idOrSlug: string): Promise<ClassItem | null> {
  const classes = await getClasses(true);
  return classes.find((c) => c.id === idOrSlug || c.slug === idOrSlug) || null;
}

export async function upsertClass(item: ClassItem): Promise<ClassItem> {
  const db = await readLocalDb();
  if (!db.classes) db.classes = [];
  const idx = db.classes.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    db.classes[idx] = item;
  } else {
    db.classes.unshift(item);
  }
  await writeLocalDb(db);
  return item;
}

export async function deleteClass(id: string): Promise<boolean> {
  const db = await readLocalDb();
  if (!db.classes) return false;
  const before = db.classes.length;
  db.classes = db.classes.filter((c) => c.id !== id);
  if (db.classes.length === before) return false;
  await writeLocalDb(db);
  return true;
}

export async function getEnrollments(): Promise<ClassEnrollment[]> {
  const db = await readLocalDb();
  return db.enrollments || [];
}

export async function getUserEnrollments(userEmail: string): Promise<ClassEnrollment[]> {
  const db = await readLocalDb();
  const list = db.enrollments || [];
  const now = new Date().getTime();
  return list.filter((e) => e.userEmail.toLowerCase() === userEmail.toLowerCase() && (!e.expiresAt || new Date(e.expiresAt).getTime() > now) && e.status === "active");
}

export async function enrollUserInClass(opts: {
  classId: string;
  userEmail: string;
  userName: string;
  paidAmountIdr: number;
  paymentMethod?: string;
}): Promise<ClassEnrollment> {
  const db = await readLocalDb();
  if (!db.enrollments) db.enrollments = [];

  const now = new Date();

  const enrollment: ClassEnrollment = {
    id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    classId: opts.classId,
    userEmail: opts.userEmail.toLowerCase().trim(),
    userName: opts.userName.trim(),
    startsAt: now.toISOString(),
    status: "active",
    paidAmountIdr: opts.paidAmountIdr,
    paymentMethod: opts.paymentMethod || "QRIS",
    createdAt: now.toISOString(),
  };

  db.enrollments.unshift(enrollment);
  await writeLocalDb(db);
  return enrollment;
}

export type ClassAccessSource = "beli" | "gratis" | "admin";

export async function activateClassesForUser(opts: {
  classIds: string[];
  userEmail: string;
  userName: string;
  source: ClassAccessSource;
  paidAmountIdr?: number;
}): Promise<{ activated: ClassEnrollment[]; alreadyOwned: string[] }> {
  const email = opts.userEmail.trim().toLowerCase();
  const classIds = [...new Set(opts.classIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!email || !classIds.length) throw new Error("Pilih setidaknya satu kelas untuk diaktifkan.");

  const db = await readLocalDb();
  const allClasses = db.classes || [];
  const selected = classIds.map((id) => allClasses.find((item) => item.id === id));
  if (selected.some((item) => !item || !item.isPublished)) throw new Error("Satu atau beberapa kelas sudah tidak tersedia.");
  if (opts.source === "gratis" && selected.some((item) => Number(item?.priceIdr) !== 0)) throw new Error("Kelas ini tidak termasuk kelas gratis.");
  if (opts.source === "beli" && selected.some((item) => Number(item?.priceIdr) <= 0)) throw new Error("Kelas gratis harus diambil melalui tombol Ambil kelas gratis.");

  db.enrollments ||= [];
  const now = new Date().toISOString();
  const activated: ClassEnrollment[] = [];
  const alreadyOwned: string[] = [];
  for (const cls of selected) {
    if (!cls) continue;
    const existing = db.enrollments.find((entry) => entry.classId === cls.id && entry.userEmail.trim().toLowerCase() === email && entry.status === "active" && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now()));
    if (existing) { alreadyOwned.push(cls.id); continue; }
    const previous = db.enrollments.find((entry) => entry.classId === cls.id && entry.userEmail.trim().toLowerCase() === email);
    const enrollment: ClassEnrollment = {
      id: previous?.id || `enr-${randomUUID()}`,
      classId: cls.id,
      userEmail: email,
      userName: opts.userName.trim(),
      startsAt: now,
      status: "active",
      paidAmountIdr: Number.isSafeInteger(opts.paidAmountIdr) ? Math.max(0, opts.paidAmountIdr as number) : opts.source === "beli" ? cls.priceIdr : 0,
      paymentMethod: opts.source === "admin" ? "Manual (Admin)" : opts.source,
      source: opts.source,
      createdAt: previous?.createdAt || now,
    };
    if (previous) Object.assign(previous, enrollment); else db.enrollments.unshift(enrollment);
    activated.push(enrollment);
  }
  if (activated.length) {
    try {
      await writeLocalDb(db);
    } catch (error) {
      // Recheck after a concurrent request wins the unique ownership constraint.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("23505") && !message.toLowerCase().includes("duplicate key")) throw error;
      const latest = await readLocalDb();
      const current = new Set((latest.enrollments || []).filter((entry) =>
        entry.userEmail.trim().toLowerCase() === email && entry.status === "active" && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now()),
      ).map((entry) => entry.classId));
      if (!classIds.every((id) => current.has(id))) throw error;
      return { activated: [], alreadyOwned: classIds };
    }
  }
  return { activated, alreadyOwned };
}

export async function revokeClassAccessForUser(enrollmentId: string): Promise<boolean> {
  const db = await readLocalDb();
  const before = (db.enrollments || []).length;
  db.enrollments = (db.enrollments || []).filter((entry) => entry.id !== enrollmentId);
  if (db.enrollments.length === before) return false;
  await writeLocalDb(db);
  return true;
}

export async function expireClassAccessForUser(enrollmentId: string): Promise<boolean> {
  const db = await readLocalDb();
  const enrollment = (db.enrollments || []).find((entry) => entry.id === enrollmentId);
  if (!enrollment) return false;
  enrollment.status = "expired";
  enrollment.expiresAt = new Date().toISOString();
  await writeLocalDb(db);
  return true;
}

export async function hasUserActiveEnrollmentForModule(
  userEmail: string,
  moduleId: string
): Promise<boolean> {
  if (!userEmail) return false;
  const activeEnrs = await getUserEnrollments(userEmail);
  if (activeEnrs.length === 0) return false;
  const db = await readLocalDb();
  const classIds = activeEnrs.map((e) => e.classId);
  const enrolledClasses = (db.classes || []).filter((c) => classIds.includes(c.id));
  return enrolledClasses.some((c) => c.moduleIds.includes(moduleId) || (c.modules || []).some((m) => m.id === moduleId && m.status === "terbit"));
}

export async function saveClassModuleFile(opts: {
  classId: string;
  moduleId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}): Promise<{ storagePath: string; fileType: "pdf" | "ppt" | "pptx" | "other"; fileName: string; pdfPath?: string }> {
  await ensureDirs();
  const safe = opts.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(PRIVATE_PAGES_DIR, "class-files", opts.classId);
  const fileName = `${opts.moduleId}-${Date.now()}-${safe}`;
  await tryWriteFile(path.join(dir, fileName), opts.buffer);
  const storagePath = `class-files/${opts.classId}/${fileName}`;
  const lower = safe.toLowerCase();
  const fileType: "pdf" | "ppt" | "pptx" | "other" = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".pptx") ? "pptx" : lower.endsWith(".ppt") ? "ppt" : "other";
  let pdfPath: string | undefined;
  if (fileType === "pdf") {
    pdfPath = storagePath;
  } else if (fileType === "ppt" || fileType === "pptx") {
    // Best-effort server-side conversion (keeps original). Requires LibreOffice if available.
    try {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      await execFileAsync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, path.join(dir, fileName)], { timeout: 120000 });
      const base = fileName.replace(/\.(pptx?|PPTX?)$/, "");
      const converted = path.join(dir, `${base}.pdf`);
      try {
        await fs.access(converted);
        pdfPath = `class-files/${opts.classId}/${base}.pdf`;
      } catch {}
    } catch {
      // LibreOffice not available; original saved for download, PDF preview may be unavailable until PDF provided.
    }
  }
  const kelas = await getClassByIdOrSlug(opts.classId);
  if (!kelas) throw new Error("Kelas tidak ditemukan saat menyimpan data materi.");
  const moduleExists = (kelas.modules || []).some((module) => module.id === opts.moduleId);
  if (!moduleExists) throw new Error("Modul tidak ditemukan saat menyimpan data materi.");
  const updatedModules = (kelas.modules || []).map((module) => module.id === opts.moduleId
    ? { ...module, fileAsli: storagePath, fileAsliName: safe, fileType, filePDF: pdfPath }
    : module);
  await upsertClass({ ...kelas, modules: updatedModules });
  return { storagePath, fileType, fileName: safe, pdfPath };
}

export async function readClassModuleFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string; fileName: string } | null> {
  try {
    const base = path.resolve(PRIVATE_PAGES_DIR);
    const resolved = path.resolve(PRIVATE_PAGES_DIR, storagePath);
    if (!resolved.startsWith(base)) return null;
    const buffer = await tryReadFile(resolved);
    const lower = resolved.toLowerCase();
    const contentType = lower.endsWith(".pdf")
      ? "application/pdf"
      : lower.endsWith(".pptx")
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : lower.endsWith(".ppt")
      ? "application/vnd.ms-powerpoint"
      : "application/octet-stream";
    return { buffer, contentType, fileName: path.basename(resolved) };
  } catch {
    return null;
  }
}

// ============================================================================
// KELOLA GAME (DB-backed, editable) — CRUD
// ============================================================================

export async function getGames(): Promise<GameRecord[]> {
  const db = await readLocalDb();
  return db.games || [];
}

export async function getGameCatalog(): Promise<GameRecord[]> {
  const sb = await getSupabaseAdmin();
  if (!sb) return (await readLocalDb()).games || [];
  const [{ data, error }, { data: questionRows, error: questionError }] = await Promise.all([
    sb.from("games").select("id,nama_game,jenis_game,deskripsi,created_at,updated_at").order("nama_game", { ascending: true }),
    sb.from("game_soal").select("game_id,data,urutan").order("urutan", { ascending: true }),
  ]);
  if (error) throwSb('Gagal membaca master game dari Supabase', error);
  if (questionError) throwSb('Gagal membaca soal game dari Supabase', questionError);
  const questionsByGame = new Map<string, GameQuestion[]>();
  for (const row of questionRows || []) {
    const questions = questionsByGame.get(row.game_id) || [];
    questions.push(row.data as GameQuestion);
    questionsByGame.set(row.game_id, questions);
  }
  return (data || []).map((game: any) => ({
    id: game.id,
    title: game.nama_game,
    kind: game.jenis_game,
    description: game.deskripsi || "",
    questions: questionsByGame.get(game.id) || [],
    createdAt: game.created_at,
    updatedAt: game.updated_at || game.created_at,
  }));
}

export async function getGameById(id: string): Promise<GameRecord | null> {
  const sb = await getSupabaseAdmin();
  if (sb) {
    const { data: game, error: gameError } = await sb.from("games")
      .select("id,nama_game,jenis_game,deskripsi,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (gameError) throwSb('Gagal membaca master game dari Supabase', gameError);
    if (!game) return null;
    const { data: rows, error: questionError } = await sb.from("game_soal")
      .select("id,game_id,pertanyaan,clue,jawaban,urutan,data,created_at")
      .eq("game_id", id)
      .order("urutan", { ascending: true });
    if (questionError) throwSb('Gagal membaca soal game dari Supabase', questionError);
    return {
      id: game.id,
      title: game.nama_game,
      kind: game.jenis_game,
      description: game.deskripsi || "",
      questions: (rows || []).map((row: any) => row.data),
      createdAt: game.created_at,
      updatedAt: game.updated_at || game.created_at,
    };
  }
  const games = await getGames();
  return games.find((g) => g.id === id) || null;
}

export async function upsertGame(game: GameRecord): Promise<GameRecord> {
  const db = await readLocalDb();
  if (!db.games) db.games = [];
  const idx = db.games.findIndex((g) => g.id === game.id);
  if (idx >= 0) db.games[idx] = game; else db.games.unshift(game);
  await writeLocalDb(db);
  return game;
}

export async function deleteGame(id: string): Promise<boolean> {
  const db = await readLocalDb();
  if (!db.games) return false;
  const before = db.games.length;
  db.games = db.games.filter((g) => g.id !== id);
  if (db.games.length === before) return false;
  await writeLocalDb(db);
  return true;
}

export async function duplicateGame(id: string): Promise<GameRecord | null> {
  const db = await readLocalDb();
  const src = (db.games || []).find((g) => g.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: GameRecord = {
    ...JSON.parse(JSON.stringify(src)),
    id: `game-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    title: `${src.title} (Salinan)`,
    createdAt: now,
    updatedAt: now,
  };
  delete (copy as any).migratedFromTemplateId;
  if (!db.games) db.games = [];
  db.games.unshift(copy);
  await writeLocalDb(db);
  return copy;
}
