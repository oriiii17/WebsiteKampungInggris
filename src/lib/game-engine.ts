import type { GameBlueprint, GameBlueprintItem } from "./game-blueprint";

export interface GameProgress {
  score: number;
  answered: number;
  correct: number;
}

export interface AnswerResult {
  correct: boolean;
  progress: GameProgress;
  finished: boolean;
}

export const initialGameProgress = (_game: Pick<GameBlueprint, "settings">): GameProgress => ({
  score: 0,
  answered: 0,
  correct: 0,
});

export function evaluateBlueprintAnswer(game: GameBlueprint, item: GameBlueprintItem, answer: unknown): boolean {
  switch (game.template) {
    case "multiple-choice-quiz":
    case "listen-and-choose":
      return Number(answer) === item.correctIndex;
    case "sentence-builder":
      return Array.isArray(answer) && Array.isArray(item.words)
        && answer.join(" ").trim().toLocaleLowerCase() === item.words.join(" ").trim().toLocaleLowerCase();
    case "matching":
      return Array.isArray(answer) && Array.isArray(item.pairs)
        && answer.length === item.pairs.length
        && answer.every((pair: unknown, index) => {
          if (typeof pair !== "object" || pair === null) return false;
          const selected = pair as { left?: unknown; right?: unknown };
          return selected.left === item.pairs?.[index]?.left && selected.right === item.pairs?.[index]?.right;
        });
    case "drag-and-sort":
      return Array.isArray(answer) && Array.isArray(item.sortItems)
        && answer.length === item.sortItems.length
        && answer.every((categoryId: unknown, index) => categoryId === item.sortItems?.[index]?.categoryId);
    case "word-bank":
      return String(answer).trim().length > 0;
    case "word-search":
      return Array.isArray(answer) && Array.isArray(item.words)
        && item.words.every((word) => answer.map(String).some((found) => found.toLocaleLowerCase() === word.toLocaleLowerCase()));
  }
}

export function submitBlueprintAnswer(game: GameBlueprint, progress: GameProgress, correct: boolean, speedBonus = 0): AnswerResult {
  const next: GameProgress = {
    score: progress.score + (correct ? 100 + Math.max(0, Math.min(100, Math.floor(speedBonus))) : 0),
    answered: progress.answered + 1,
    correct: progress.correct + (correct ? 1 : 0),
  };
  return { correct, progress: next, finished: next.answered >= game.items.length };
}
