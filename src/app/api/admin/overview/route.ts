import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSystemDiagnostics, readLocalDb, resetLocalDbToSeed } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sesi admin sudah berakhir. Masuk kembali untuk melanjutkan." }, { status: 401 });
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akun ini belum memiliki akses admin." }, { status: 403 });

  const db = await readLocalDb();
  const diagnostics = getSystemDiagnostics();

  // Game paling sering dimainkan
  const gameCounts: Record<string, number> = {};
  (db.leaderboard || []).forEach((lb) => {
    const title = lb.moduleTitle || "Game";
    gameCounts[title] = (gameCounts[title] || 0) + 1;
  });
  const mostPlayedGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Belum ada";

  const wargaList = db.warga || [];
  const now = new Date();
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const supabase = await getSupabaseServerClient();
  let rwLoginStats = { totalWarga: 0, wargaRw06: 0, wargaRw07: 0, wargaRw08: 0, activeThisWeek: 0 };
  if (supabase) {
    const base = supabase.from("rw_access_login_events").select("id", { count: "exact", head: true });
    const [total, rw06, rw07, rw08, weekly] = await Promise.all([
      base,
      supabase.from("rw_access_login_events").select("id", { count: "exact", head: true }).eq("rw", "RW 06"),
      supabase.from("rw_access_login_events").select("id", { count: "exact", head: true }).eq("rw", "RW 07"),
      supabase.from("rw_access_login_events").select("id", { count: "exact", head: true }).eq("rw", "RW 08"),
      supabase.from("rw_access_login_events").select("id", { count: "exact", head: true }).gte("occurred_at", weekStart.toISOString()),
    ]);
    rwLoginStats = { totalWarga: total.count || 0, wargaRw06: rw06.count || 0, wargaRw07: rw07.count || 0, wargaRw08: rw08.count || 0, activeThisWeek: weekly.count || 0 };
  } else {
    const loginEvents = (db.loginLog || []).filter((entry) => new Date(entry.loginAt).getTime() >= weekStart.getTime());
    rwLoginStats = {
      totalWarga: db.loginLog?.length || 0,
      wargaRw06: (db.loginLog || []).filter((entry) => entry.rw === "RW 06").length,
      wargaRw07: (db.loginLog || []).filter((entry) => entry.rw === "RW 07").length,
      wargaRw08: (db.loginLog || []).filter((entry) => entry.rw === "RW 08").length,
      activeThisWeek: loginEvents.length,
    };
  }

  const recentActivity = [
    ...(db.classSessionGuests || []).map((guest) => ({ id: `guest-${guest.id}`, name: guest.name, kind: "Pendaftaran sesi", createdAt: guest.registeredAt })),
    ...(db.externalUsers || []).map((user) => ({ id: `user-${user.id}`, name: user.name, kind: "Akun peserta", createdAt: user.createdAt })),
  ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 8);
  let dashboardSessions = (db.classSessions || []).map((item) => ({ id: item.id, title: item.title, startsAt: item.startsAt, status: item.status })).filter((item) => item.status !== "closed").sort((a, b) => String(a.startsAt || "").localeCompare(String(b.startsAt || ""))).slice(0, 5);
  if (supabase) {
    const { data: sessionRows } = await supabase.from("class_sessions").select("id,title,starts_at,status").neq("status", "closed").order("starts_at", { ascending: true }).limit(5);
    if (sessionRows) dashboardSessions = sessionRows.map((item) => ({ id: item.id, title: item.title, startsAt: item.starts_at, status: item.status }));
  }
  let externalUsers = (db.externalUsers || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt }));
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    const admin = createSupabaseAdminClient();
    const [{ data: profiles }, { data: authUsers }] = await Promise.all([
      admin.from("profiles").select("id,email,full_name,origin_type").eq("origin_type", "luar"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const authById = new Map((authUsers?.users || []).map((user) => [user.id, user]));
    const merged = new Map(externalUsers.map((user) => [user.id, user]));
    for (const profile of profiles || []) {
      const authUser = authById.get(profile.id);
      if (!merged.has(profile.id)) merged.set(profile.id, { id: profile.id, name: profile.full_name || authUser?.user_metadata?.full_name || "Peserta", email: profile.email || authUser?.email || "", createdAt: authUser?.created_at || "" });
    }
    externalUsers = [...merged.values()];
  }

  return NextResponse.json({
    session,
    diagnostics,
    stats: {
      totalModules: db.modules.length,
      totalCodes: db.accessCodes.length,
      activeSubscribers: db.subscriptions.filter((s) => s.status === "active").length,
      totalRevenueIdr: db.subscriptions
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + s.amountIdr, 0),
      totalQuizQuestions: db.quizzes.length,
      totalFlashcards: db.flashcards.length,
      ...rwLoginStats,
      mostPlayedGame,
      totalTestimoni: (db.testimoni || []).length,
      pendingTestimoni: (db.testimoni || []).filter((t) => !t.isApproved).length,
    },
    modules: db.modules,
    accessCodes: db.accessCodes,
    subscriptions: db.subscriptions,
    plans: db.plans,
    quizzes: db.quizzes,
    flashcards: db.flashcards,
    matchingPairs: db.matchingPairs,
    wordChallenges: db.wordChallenges,
    warga: wargaList,
    rwCodes: (db.rwCodes || []).map((c) => ({
      id: c.id,
      rw: c.rw,
      codeDisplay: c.codeDisplay,
      isActive: c.isActive,
      updatedAt: c.updatedAt,
    })),
    testimoni: db.testimoni || [],
    classes: db.classes || [],
    dashboardSessions,
    recentActivity,
    enrollments: db.enrollments || [],
    externalUsers,
  });
}

export async function POST() {
  const session = await getServerSession();
  if (!session || session.role !== "developer") {
    return NextResponse.json(
      { error: "Hanya akun Developer yang dapat mereset data demo." },
      { status: 403 }
    );
  }
  await resetLocalDbToSeed();
  return NextResponse.json({ ok: true });
}
