import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getSystemDiagnostics, readLocalDb, resetLocalDbToSeed } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Akses khusus Admin." }, { status: 403 });
  }

  const db = await readLocalDb();
  const diagnostics = getSystemDiagnostics();

  // Hitung pemain aktif hari ini & minggu ini
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeTodaySet = new Set<string>();
  const activeWeekSet = new Set<string>();

  (db.loginLog || []).forEach((log) => {
    if (log.loginAt.startsWith(todayStr)) activeTodaySet.add(log.wargaId);
    if (new Date(log.loginAt) >= oneWeekAgo) activeWeekSet.add(log.wargaId);
  });

  // Game paling sering dimainkan
  const gameCounts: Record<string, number> = {};
  (db.leaderboard || []).forEach((lb) => {
    const title = lb.moduleTitle || "Game";
    gameCounts[title] = (gameCounts[title] || 0) + 1;
  });
  const mostPlayedGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Belum ada";

  const wargaList = db.warga || [];

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
      totalWarga: wargaList.length,
      wargaRw06: wargaList.filter((w) => w.rw === "RW 06").length,
      wargaRw07: wargaList.filter((w) => w.rw === "RW 07").length,
      wargaRw08: wargaList.filter((w) => w.rw === "RW 08").length,
      activeToday: activeTodaySet.size,
      activeThisWeek: activeWeekSet.size,
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
    loginLog: (db.loginLog || []).slice(-50).reverse(),
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
