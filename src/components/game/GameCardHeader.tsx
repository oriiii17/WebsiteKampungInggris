import type { CSSProperties } from "react";
import type { GameBlueprint, GameLevel } from "@/lib/game-blueprint";

const templateSurfaces: Record<GameBlueprint["template"], string> = {
  "multiple-choice-quiz": "#DCE5DC",
  "drag-and-sort": "#F2E6C9",
  "listen-and-choose": "#EED6CE",
  "sentence-builder": "#D6E2E8",
  matching: "#E6DDD3",
  "word-bank": "#E3DCE8",
  "word-search": "#D8E6DF",
};

export function gameLevelAccent(level: GameLevel) {
  if (level.startsWith("A")) return { ink: "#355641", border: "#9EBAA7", badge: "#e7efe8" };
  if (level.startsWith("B")) return { ink: "#8A3F24", border: "#C88357", badge: "#F3E0D4" };
  return { ink: "#fffaf0", border: "#27352D", badge: "#27352D" };
}

export default function GameCardHeader({ game, compact = false }: { game: GameBlueprint; compact?: boolean }) {
  const accent = gameLevelAccent(game.level);
  const style = { backgroundColor: game.level.startsWith("C") ? "#27352D" : templateSurfaces[game.template], color: accent.ink, borderColor: accent.border } as CSSProperties;
  const patternId = `quiz-card-pattern-${game.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return <div className={`relative isolate flex items-center justify-center overflow-hidden border-b ${compact ? "h-20" : "h-28"}`} style={style}>
    <svg aria-hidden="true" className="absolute inset-0 z-0 h-full w-full opacity-[.16]" viewBox="0 0 240 120" preserveAspectRatio="none"><defs><pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="currentColor"/><path d="M-5 20 20-5M5 25 25 5" stroke="currentColor" strokeWidth=".7"/></pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId})`}/></svg>
    <span className={`relative z-10 font-display font-extrabold tracking-[.06em] ${compact ? "text-3xl" : "text-5xl"}`}>{game.cardInitials || game.title.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toLocaleUpperCase("id-ID") || "KU"}</span>
  </div>;
}
