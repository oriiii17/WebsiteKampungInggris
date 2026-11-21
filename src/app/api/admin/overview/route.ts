import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSystemDiagnostics, readLocalDb, resetLocalDbToSeed } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

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
    enrollments: db.enrollments || [],
    externalUsers: (db.externalUsers || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    })),
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
