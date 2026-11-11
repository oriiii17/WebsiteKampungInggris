import fs from "fs/promises";
import path from "path";
import { SupabaseClient } from "@supabase/supabase-js";
import { createInitialSeedData, getCurrentWeekLabel } from "./seed-data";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
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
} from "./types";
import { getBuiltinGames } from "./builtin-games";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const PRIVATE_PAGES_DIR = path.join(DATA_DIR, "private-pages");

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PRIVATE_PAGES_DIR, { recursive: true });
}

// ============================================================================
// SINKRONISASI PENUH TABEL RELASIONAL SUPABASE POSTGRES <-> APLIKASI
// ============================================================================

async function pushFullSchemaToSupabase(sb: SupabaseClient, data: DatabaseSchema) {
  if (data.plans.length > 0) {
    await sb.from("subscription_plans").upsert(
      data.plans.map((p) => ({
        id: p.id,
        name: p.name,
        duration_days: p.durationDays,
        price_idr: p.priceIdr,
        badge: p.badge || null,
        description: p.description,
        features: p.features,
        is_active: p.isActive,
      }))
    );
  }

  if (data.modules.length > 0) {
    await sb.from("modules").upsert(
      data.modules.map((m) => ({
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
      }))
    );
  }

  if (data.accessCodes.length > 0) {
    await sb.from("access_codes").upsert(
      data.accessCodes.map((c) => ({
        id: c.id,
        code: c.code,
        label: c.label,
        rt_rw: c.rtRw,
        holder_type: c.holderType,
        max_devices: c.maxDevices,
        expires_at: c.expiresAt,
        is_active: c.isActive,
        created_by: c.createdBy,
        created_at: c.createdAt,
      }))
    );

    const allDevices = data.accessCodes.flatMap((c) =>
      c.devices.map((d) => ({
        code_id: c.id,
        device_id: d.deviceId,
        participant_name: d.participantName,
        device_label: d.deviceLabel,
        last_seen_at: d.lastSeenAt,
        created_at: d.createdAt,
      }))
    );
    if (allDevices.length > 0) {
      await sb
        .from("access_code_devices")
        .upsert(allDevices, { onConflict: "code_id,device_id" });
    }
  }

  if (data.externalUsers.length > 0) {
    await sb.from("external_users").upsert(
      data.externalUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password_hash: u.passwordHash,
        created_at: u.createdAt,
      }))
    );
  }

  if (data.subscriptions.length > 0) {
    await sb.from("subscriptions").upsert(
      data.subscriptions.map((s) => ({
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
      }))
    );
  }

  if (data.quizzes.length > 0) {
    await sb.from("quiz_questions").upsert(
      data.quizzes.map((q) => ({
        id: q.id,
        module_id: q.moduleId,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        order_num: q.orderNum,
      }))
    );
  }

  if (data.flashcards.length > 0) {
    await sb.from("flashcards").upsert(
      data.flashcards.map((f) => ({
        id: f.id,
        module_id: f.moduleId,
        english: f.english,
        phonetic: f.phonetic,
        indonesian: f.indonesian,
        example_en: f.exampleEn,
        example_id: f.exampleId,
      }))
    );
  }

  if (data.matchingPairs.length > 0) {
    await sb.from("matching_pairs").upsert(
      data.matchingPairs.map((mp) => ({
        id: mp.id,
        module_id: mp.moduleId,
        english: mp.english,
        indonesian: mp.indonesian,
      }))
    );
  }

  if (data.wordChallenges.length > 0) {
    await sb.from("word_challenges").upsert(
      data.wordChallenges.map((wc) => ({
        id: wc.id,
        module_id: wc.moduleId,
        challenge_type: wc.challengeType,
        clue_id: wc.clueId,
        sentence_blank: wc.sentenceBlank || null,
        answer: wc.answer,
        hint: wc.hint,
      }))
    );
  }

  if (data.leaderboard.length > 0) {
    await sb.from("leaderboard_entries").upsert(
      data.leaderboard.map((lb) => ({
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
      }))
    );
  }
}

async function fetchFullSchemaFromSupabase(
  sb: SupabaseClient
): Promise<DatabaseSchema | null> {
  const { data: modRows, error: modErr } = await sb
    .from("modules")
    .select("*")
    .order("created_at", { ascending: true });

  // Jika tabel belum dibuat di SQL Editor, fallback dengan aman ke mode lokal
  if (modErr) {
    return null;
  }

  // Jika project Supabase baru saja dibuat & kosong, otomatis seed data awal Kampung Sapen!
  if (!modRows || modRows.length === 0) {
    const initial = createInitialSeedData();
    await pushFullSchemaToSupabase(sb, initial);
    return initial;
  }

  const [
    plansRes,
    codesRes,
    devsRes,
    usersRes,
    subsRes,
    quizRes,
    fcRes,
    mpRes,
    wcRes,
    lbRes,
  ] = await Promise.all([
    sb.from("subscription_plans").select("*"),
    sb.from("access_codes").select("*").order("created_at", { ascending: false }),
    sb.from("access_code_devices").select("*"),
    sb.from("external_users").select("*"),
    sb.from("subscriptions").select("*").order("created_at", { ascending: false }),
    sb.from("quiz_questions").select("*").order("order_num", { ascending: true }),
    sb.from("flashcards").select("*"),
    sb.from("matching_pairs").select("*"),
    sb.from("word_challenges").select("*"),
    sb.from("leaderboard_entries").select("*"),
  ]);

  const devsByCode = new Map<string, AccessCode["devices"]>();
  for (const d of devsRes.data || []) {
    const list = devsByCode.get(d.code_id) || [];
    list.push({
      deviceId: d.device_id,
      participantName: d.participant_name,
      deviceLabel: d.device_label || "Browser",
      lastSeenAt: d.last_seen_at,
      createdAt: d.created_at,
    });
    devsByCode.set(d.code_id, list);
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
      maxDevices: c.max_devices,
      expiresAt: c.expires_at,
      isActive: c.is_active,
      createdBy: c.created_by,
      createdAt: c.created_at,
      devices: devsByCode.get(c.id) || [],
    })),
    externalUsers: (usersRes.data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.password_hash,
      createdAt: u.created_at,
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
    warga: [],
    loginLog: [],
    rwCodes: seed.rwCodes,
    testimoni: [],
    classes: [],
    enrollments: [],
    games: [],
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
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const initial = createInitialSeedData();
    if (!parsed.warga) parsed.warga = [];
    if (!parsed.loginLog) parsed.loginLog = [];
    if (!parsed.rwCodes || parsed.rwCodes.length === 0) parsed.rwCodes = initial.rwCodes;
    if (!parsed.testimoni) parsed.testimoni = [];
    if (!parsed.classes) parsed.classes = [];
    if (!parsed.enrollments) parsed.enrollments = [];
    const changed = ensureBuiltinGames(parsed);
    if (changed) await fs.writeFile(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    return parsed;
  } catch {
    return null;
  }
}

export async function readLocalDb(): Promise<DatabaseSchema> {
  const sb = await getSupabaseAdmin();
  if (sb) {
    const remote = await fetchFullSchemaFromSupabase(sb);
    if (remote) {
      // Koleksi lokal-only (games/kelas/warga/dll) belum ada di schema Supabase: gabungkan dari .data/db.json agar persist & tidak hilang
      const local = await readNormalizedLocalDb();
      if (local) {
        remote.games = local.games || [];
        remote.classes = local.classes || [];
        remote.enrollments = local.enrollments || [];
        remote.warga = local.warga || [];
        remote.loginLog = local.loginLog || [];
        remote.rwCodes = local.rwCodes && local.rwCodes.length > 0 ? local.rwCodes : remote.rwCodes;
        remote.testimoni = local.testimoni || [];
      } else {
        const seeded = createInitialSeedData();
        remote.games = getBuiltinGames();
        remote.classes = [];
        remote.enrollments = [];
        remote.warga = [];
        remote.loginLog = [];
        remote.rwCodes = seeded.rwCodes;
        remote.testimoni = [];
        await writeLocalDb(remote);
      }
      return remote;
    }
  }

  const local = await readNormalizedLocalDb();
  if (local) return local;
  const initial = createInitialSeedData();
  initial.games = getBuiltinGames();
  await ensureDirs();
  await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
  return initial;
}

export async function writeLocalDb(data: DatabaseSchema): Promise<void> {
  const sb = await getSupabaseAdmin();
  if (sb) {
    await pushFullSchemaToSupabase(sb, data);
  }
  await ensureDirs();
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
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
  await fs.mkdir(modDir, { recursive: true });
  const localFilePath = path.join(modDir, `page-${pageNumber}.${ext}`);
  await fs.writeFile(localFilePath, buffer);

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
          await fs.mkdir(modDir, { recursive: true }).catch(() => {});
          await fs.writeFile(path.join(modDir, `page-${pageNumber}.${sp.endsWith(".png") ? "png" : "webp"}`), buffer).catch(() => {});

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
      const buf = await fs.readFile(filePath);
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
  action: "toggle" | "reset_devices" | "delete"
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
  } else if (action === "reset_devices") {
    db.accessCodes[idx].devices = [];
    if (sb) await sb.from("access_code_devices").delete().eq("code_id", codeId);
  }
  await writeLocalDb(db);
}

export async function validateAndBindWargaCode(params: {
  codeInput: string;
  participantName: string;
  deviceId: string;
  deviceLabel: string;
}): Promise<{ ok: true; accessCode: AccessCode } | { ok: false; error: string }> {
  const db = await readLocalDb();
  const normalized = params.codeInput.trim().toUpperCase();
  const found = db.accessCodes.find((c) => c.code.toUpperCase() === normalized);

  if (!found) {
    return {
      ok: false,
      error: "Kode akses tidak ditemukan. Pastikan penulisan sesuai dari Pengurus Kampung Sapen.",
    };
  }
  if (!found.isActive) {
    return {
      ok: false,
      error: "Kode akses ini sedang dinonaktifkan oleh pengurus.",
    };
  }
  if (new Date(found.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      error: "Masa berlaku kode akses ini sudah habis. Silakan hubungi pengurus untuk perpanjangan.",
    };
  }

  const existingDev = found.devices.find((d) => d.deviceId === params.deviceId);
  if (existingDev) {
    existingDev.participantName = params.participantName;
    existingDev.lastSeenAt = new Date().toISOString();
  } else {
    if (found.devices.length >= found.maxDevices) {
      return {
        ok: false,
        error: `Batas perangkat untuk kode ini sudah penuh (${found.maxDevices}/${found.maxDevices} perangkat terpakai). Hubungi Pengurus jika berganti HP.`,
      };
    }
    found.devices.push({
      deviceId: params.deviceId,
      participantName: params.participantName,
      deviceLabel: params.deviceLabel,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  await writeLocalDb(db);
  return { ok: true, accessCode: found };
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

import {
  findMatchingRw,
  validateNamaPanggilan,
  generateWargaId,
  createLoginLogEntry,
} from "./rw-auth";
import { WargaRecord, RwCode, LoginLogEntry, TestimoniRecord } from "./types";

/** Cari kode RW yang cocok dan proses login warga */
export async function loginWargaRw(opts: {
  inputCode: string;
  namaPanggilan: string;
  deviceId: string;
  ipHint?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  warga?: WargaRecord;
  rw?: RwCode;
  nameConflict?: boolean; // nama sudah dipakai warga lain di RW ini
}> {
  const db = await readLocalDb();

  // Pastikan kolom baru ada (backward compat)
  if (!db.rwCodes) db.rwCodes = [];
  if (!db.warga) db.warga = [];
  if (!db.loginLog) db.loginLog = [];
  if (!db.testimoni) db.testimoni = [];

  // Validasi nama
  const namaValidation = validateNamaPanggilan(opts.namaPanggilan);
  if (!namaValidation.valid) {
    return { ok: false, error: namaValidation.error };
  }
  const namaClean = opts.namaPanggilan.trim();

  // Cocokkan kode dengan RW
  const matchedRw = findMatchingRw(opts.inputCode, db.rwCodes);
  if (!matchedRw) {
    return {
      ok: false,
      error: "Kode RW tidak dikenali. Tanyakan kode yang benar ke ketua RW kamu ya.",
    };
  }

  // Cek apakah nama sudah dipakai warga lain di RW ini (case-insensitive)
  const namaLower = namaClean.toLowerCase();
  const existingWithName = db.warga.find(
    (w) =>
      w.rw === matchedRw.rw &&
      w.namaPanggilan.toLowerCase() === namaLower &&
      !w.isBlocked
  );

  if (existingWithName) {
    // Cek apakah deviceId cocok (pemilik asli)
    if (existingWithName.deviceId === opts.deviceId) {
      // Pemilik asli login kembali — update lastLoginAt
      existingWithName.lastLoginAt = new Date().toISOString();
      existingWithName.totalGamesPlayed = existingWithName.totalGamesPlayed || 0;
      const logEntry = createLoginLogEntry(existingWithName, opts.deviceId, opts.ipHint);
      db.loginLog.push(logEntry);
      await writeLocalDb(db);
      return { ok: true, warga: existingWithName, rw: matchedRw };
    }
    // Nama dipakai warga lain — beritahu client
    return { ok: true, warga: existingWithName, rw: matchedRw, nameConflict: true };
  }

  // Buat warga baru
  const newWarga: WargaRecord = {
    id: generateWargaId(),
    namaPanggilan: namaClean,
    rw: matchedRw.rw,
    deviceId: opts.deviceId,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isBlocked: false,
    totalGamesPlayed: 0,
    highScore: 0,
  };
  db.warga.push(newWarga);
  const logEntry = createLoginLogEntry(newWarga, opts.deviceId, opts.ipHint);
  db.loginLog.push(logEntry);
  await writeLocalDb(db);
  return { ok: true, warga: newWarga, rw: matchedRw };
}

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

/** Perbarui kode RW */
export async function updateRwCode(
  rw: "RW 06" | "RW 07" | "RW 08",
  newCodePlain: string,
  forceLogout = false
): Promise<RwCode> {
  const db = await readLocalDb();
  if (!db.rwCodes) db.rwCodes = [];
  const { createRwCodeRecord: makeCode } = await import("./rw-auth");
  const newCode = makeCode(rw, newCodePlain);
  if (forceLogout) {
    newCode.forceLogoutAt = new Date().toISOString();
  }
  const idx = db.rwCodes.findIndex((r) => r.rw === rw);
  if (idx >= 0) {
    db.rwCodes[idx] = newCode;
  } else {
    db.rwCodes.push(newCode);
  }
  await writeLocalDb(db);
  return newCode;
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
  const db = await readLocalDb();
  return (db.testimoni || []).filter((t) => t.isApproved);
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
  return list.filter((e) => e.userEmail.toLowerCase() === userEmail.toLowerCase() && new Date(e.expiresAt).getTime() > now && e.status === "active");
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

  const classItem = (db.classes || []).find((c) => c.id === opts.classId);
  const durationDays = classItem?.durationDays || 30;

  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const enrollment: ClassEnrollment = {
    id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    classId: opts.classId,
    userEmail: opts.userEmail.toLowerCase().trim(),
    userName: opts.userName.trim(),
    startsAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
    paidAmountIdr: opts.paidAmountIdr,
    paymentMethod: opts.paymentMethod || "QRIS",
    createdAt: now.toISOString(),
  };

  db.enrollments.unshift(enrollment);
  await writeLocalDb(db);
  return enrollment;
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
  return enrolledClasses.some((c) => c.moduleIds.includes(moduleId));
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
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${opts.moduleId}-${Date.now()}-${safe}`;
  await fs.writeFile(path.join(dir, fileName), opts.buffer);
  const storagePath = `class-files/${opts.classId}/${fileName}`;
  const lower = safe.toLowerCase();
  const fileType = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".pptx") ? "pptx" : lower.endsWith(".ppt") ? "ppt" : "other";
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
  return { storagePath, fileType, fileName: safe, pdfPath };
}

export async function readClassModuleFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string; fileName: string } | null> {
  try {
    const base = path.resolve(PRIVATE_PAGES_DIR);
    const resolved = path.resolve(PRIVATE_PAGES_DIR, storagePath);
    if (!resolved.startsWith(base)) return null;
    const buffer = await fs.readFile(resolved);
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

export async function getGameById(id: string): Promise<GameRecord | null> {
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
