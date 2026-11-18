import Ajv, { ErrorObject } from "ajv";
import schema from "./game.schema.json";

export const GAME_TEMPLATES = [
  { id: "multiple-choice-quiz", title: "Kuis Pilihan Ganda", description: "Pilih jawaban yang paling tepat.", image: "/images/game-quiz.svg" },
  { id: "drag-and-sort", title: "Kelompokkan Kata", description: "Pindahkan kata ke kategori yang sesuai.", image: "/images/game-match.svg" },
  { id: "listen-and-choose", title: "Dengar dan Pilih", description: "Dengarkan pengucapan, lalu pilih jawabannya.", image: "/images/game-time.svg" },
  { id: "sentence-builder", title: "Susun Kalimat", description: "Susun kata menjadi kalimat yang benar.", image: "/images/game-builder.svg" },
  { id: "matching", title: "Pasangkan Kata", description: "Temukan pasangan istilah dan artinya.", image: "/images/game-match.svg" },
  { id: "word-bank", title: "Kartu Kosakata", description: "Pelajari kosakata, arti, dan pengucapannya.", image: "/images/game-story.svg" },
  { id: "word-search", title: "Cari Kata", description: "Temukan kosakata di dalam kotak huruf.", image: "/images/game-quiz.svg" },
] as const;

export type GameTemplateId = (typeof GAME_TEMPLATES)[number]["id"];
export type GameLevel = "A1" | "A2" | "B1" | "B2";
export type GameBlueprintStatus = "draft" | "published";

export interface GameBlueprintItem {
  id: string;
  prompt: string;
  explanation?: string;
  mediaUrl?: string;
  options?: { id: string; text: string; image?: string }[];
  correctIndex?: number;
  audioText?: string;
  answer?: string;
  categories?: { id: string; label: string }[];
  sortItems?: { text: string; categoryId: string }[];
  words?: string[];
  pairs?: { left: string; right: string }[];
  vocabulary?: { term: string; translation: string; pronunciation?: string; example?: string }[];
  grid?: string[];
}

export interface GameBlueprint {
  id: string;
  title: string;
  template: GameTemplateId;
  level: GameLevel;
  topic: string;
  language: "id" | "en" | "id-en";
  coverImage?: string;
  status: GameBlueprintStatus;
  plays?: number;
  createdAt?: string;
  updatedAt?: string;
  settings: {
    hearts: number;
    timeLimitSec: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    mode: "solo" | "class" | "both";
    theme: "forest" | "tomato" | "saffron" | "ocean";
    mascot?: string;
  };
  items: GameBlueprintItem[];
}

const validator = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);

export function validateGameBlueprint(value: unknown): { valid: boolean; errors: string[] } {
  const valid = validator(value);
  const errors = (validator.errors || []).map((error: ErrorObject) => {
    const path = error.dataPath || "Game";
    return `${path}: ${error.message || "nilai tidak valid"}`;
  });
  if (valid && value && typeof value === "object") {
    const game = value as GameBlueprint;
    game.items.forEach((item, index) => {
      if ((game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") && (item.correctIndex === undefined || item.correctIndex >= (item.options?.length || 0))) {
        errors.push(`item ${index + 1}: tandai satu pilihan sebagai jawaban benar.`);
      }
      if (game.template === "drag-and-sort") {
        const categoryIds = new Set((item.categories || []).map((category) => category.id));
        if ((item.sortItems || []).some((entry) => !categoryIds.has(entry.categoryId))) errors.push(`item ${index + 1}: pilih kategori yang sesuai untuk setiap kata.`);
      }
      if ((game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") && item.options && new Set(item.options.map((option) => option.id)).size !== item.options.length) {
        errors.push(`item ${index + 1}: pilihan jawaban harus memiliki ID yang berbeda.`);
      }
    });
  }
  return {
    valid: Boolean(valid) && errors.length === 0,
    errors,
  };
}

export function createEmptyBlueprint(template: GameTemplateId, now = new Date().toISOString()): GameBlueprint {
  const starterItem: GameBlueprintItem = { id: `item-${Date.now()}`, prompt: "" };
  if (template === "multiple-choice-quiz" || template === "listen-and-choose") {
    Object.assign(starterItem, {
      ...(template === "listen-and-choose" ? { audioText: "" } : {}),
      options: [{ id: "option-a", text: "Pilihan A" }, { id: "option-b", text: "Pilihan B" }],
      correctIndex: 0,
    });
  } else if (template === "drag-and-sort") {
    Object.assign(starterItem, { categories: [{ id: "a", label: "Kategori 1" }, { id: "b", label: "Kategori 2" }], sortItems: [{ text: "kata", categoryId: "a" }, { text: "word", categoryId: "b" }] });
  } else if (template === "sentence-builder" || template === "word-search") {
    Object.assign(starterItem, { words: ["kata", "baru"] }, template === "word-search" ? { grid: ["abc", "def", "ghi"] } : {});
  } else if (template === "matching") {
    Object.assign(starterItem, { pairs: [{ left: "Kata", right: "Arti" }, { left: "Kata 2", right: "Arti 2" }] });
  } else {
    Object.assign(starterItem, { vocabulary: [{ term: "hello", translation: "halo" }] });
  }
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    template,
    level: "A1",
    topic: "Kosakata sehari-hari",
    language: "id-en",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    settings: { hearts: 3, timeLimitSec: 0, randomizeQuestions: false, randomizeOptions: false, mode: "both", theme: "forest" },
    items: [starterItem],
  };
}
