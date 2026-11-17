import { NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { createLiveGameSessionFromGame } from "@/lib/game-session";
import { getGameById, getGames } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { readLocalDb } from "@/lib/db";
import type { GameBlueprint } from "@/lib/game-blueprint";
import type { GameRecord, GameQuestion } from "@/lib/types";

function blueprintToLiveGame(game: GameBlueprint): GameRecord {
  const items = game.template === "word-bank"
    ? game.items.flatMap((item) => (item.vocabulary || []).map((word, index) => ({ ...item, id: `${item.id}-${index + 1}`, vocabulary: [word] })))
    : game.template === "word-search"
      ? game.items.flatMap((item) => (item.words || []).map((word, index) => ({ ...item, id: `${item.id}-${index + 1}`, prompt: `${item.prompt || "Temukan kata target"} · kata ${index + 1}`, answer: word, words: [word] })))
    : game.items;
  const questions: GameQuestion[] = items.map((item, index) => {
    const base = { id: item.id || `q-${index + 1}`, prompt: item.prompt || game.topic, timeLimitSec: game.settings.timeLimitSec || 20, points: "standard" as const, choiceMode: "single" as const, explanation: item.explanation };
    if (game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") {
      const options = (item.options || []).map((option) => option.text).filter(Boolean);
      return { ...base, type: "kuis_live", prompt: game.template === "listen-and-choose" && item.audioText ? (item.prompt || "Dengarkan audio, lalu pilih jawabannya.") : base.prompt, audioText: game.template === "listen-and-choose" ? item.audioText : undefined, mediaUrl: item.mediaUrl, options, correctIndexes: [Math.max(0, item.correctIndex || 0)] } as GameQuestion;
    }
    if (game.template === "sentence-builder") {
      const words = item.words || [];
      return { ...base, type: "susun_kalimat", words, sentence: words.join(" ") } as GameQuestion;
    }
    if (game.template === "matching") return { ...base, type: "pasangkan_kata", pairs: item.pairs || [] } as GameQuestion;
    if (game.template === "drag-and-sort") {
      const categoryNames = new Map((item.categories || []).map((category) => [category.id, category.label]));
      return { ...base, type: "pasangkan_kata", pairs: (item.sortItems || []).map((sortItem) => ({ left: sortItem.text, right: categoryNames.get(sortItem.categoryId) || sortItem.categoryId })) } as GameQuestion;
    }
    if (game.template === "word-bank") {
      const vocabulary = item.vocabulary || [];
      const word = vocabulary[index % Math.max(1, vocabulary.length)];
      return { ...base, type: "tebak_kata", prompt: word ? `Apa arti “${word.term}”${word.pronunciation ? ` (${word.pronunciation})` : ""}?` : base.prompt, answer: word?.translation || item.answer || "", acceptAlternatives: word?.translation ? [word.translation] : [] } as GameQuestion;
    }
    return { ...base, type: "tebak_kata", prompt: item.prompt || "Temukan kata target", answer: item.answer || item.words?.[0] || "" } as GameQuestion;
  });
  return { id: game.id, title: game.title, kind: "kuis_live", questions, createdAt: game.createdAt || new Date().toISOString(), updatedAt: game.updatedAt || new Date().toISOString() };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!isAdminSession(session)) {
      return NextResponse.json({ ok: false, error: "Hanya pengajar/admin yang berwenang membuka sesi kuis live." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const gameId = String(body.gameId || body.templateId || "");
    let game = null as GameRecord | null;
    if (body.source === "blueprint") {
      const supabase = await getSupabaseServerClient();
      let blueprint: GameBlueprint | null = null;
      if (supabase) {
        const { data, error } = await supabase.from("game_blueprints").select("*").eq("id", gameId).eq("status", "published").maybeSingle();
        if (error) return NextResponse.json({ ok: false, error: "Blueprint tidak dapat dimuat." }, { status: 503 });
        if (data) blueprint = { id: data.id, title: data.title, template: data.template, level: data.level, topic: data.topic, language: data.language, coverImage: data.cover_image || undefined, status: data.status, plays: data.play_count || 0, settings: data.settings, items: data.items, createdAt: data.created_at, updatedAt: data.updated_at };
      } else {
        blueprint = (await readLocalDb()).gameBlueprints?.find((entry) => entry.id === gameId && entry.status === "published") || null;
      }
      if (blueprint) game = blueprintToLiveGame(blueprint);
    } else {
      game = gameId ? await getGameById(gameId) : null;
      if (!game) {
        const games = await getGames();
        game = games.find((g) => g.migratedFromTemplateId === gameId) || null;
      }
    }
    if (!game) return NextResponse.json({ ok: false, error: "Game tidak ditemukan. Buat game di Kelola Game." }, { status: 400 });
    if (!game.questions || game.questions.length === 0) return NextResponse.json({ ok: false, error: "Game belum memiliki soal." }, { status: 400 });

    const hostId = session?.id || `host-${Date.now()}`;
    const hostName = session?.name || "Host Sapen English";
    const gameSession = createLiveGameSessionFromGame(game, hostId, hostName);
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from("game_sessions").insert({
        game_id: game.id,
        pin: gameSession.pin,
        host_user_id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(hostId) ? hostId : null,
        host_name: hostName,
        status: "lobby",
        current_question_index: 0,
        total_questions: gameSession.totalQuestions,
        game_snapshot: { title: game.title, kind: game.kind, questions: gameSession.questions },
      });
      if (error) {
        console.error("[game/live/create] Supabase", { code: error.code, message: error.message, details: error.details, hint: error.hint });
        return NextResponse.json({ ok: false, error: error.code === "PGRST205" || error.code === "42P01" ? "Terapkan migrasi supabase/migrations/20261117130000_live_game_sessions.sql untuk mengaktifkan sesi game." : `Gagal menyimpan sesi (${error.code || "Supabase"}): ${error.message}` }, { status: 503 });
      }
    }
    return NextResponse.json({ ok: true, pin: gameSession.pin, hostId: gameSession.hostId, templateTitle: gameSession.templateTitle, gameId: game.id, gameKind: game.kind });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Gagal membuat sesi kuis." }, { status: 500 });
  }
}
