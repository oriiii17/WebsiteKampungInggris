import Ajv, { ErrorObject } from "ajv";
import schema from "./game.schema.json";

export const GAME_TEMPLATES = [
  { id: "multiple-choice-quiz", title: "Kuis Pilihan Ganda", description: "Pilih jawaban yang paling tepat." },
  { id: "drag-and-sort", title: "Kelompokkan Kata", description: "Pindahkan kata ke kategori yang sesuai." },
  { id: "listen-and-choose", title: "Dengar dan Pilih", description: "Dengarkan pengucapan, lalu pilih jawabannya." },
  { id: "sentence-builder", title: "Susun Kalimat", description: "Susun kata menjadi kalimat yang benar." },
  { id: "matching", title: "Pasangkan Kata", description: "Temukan pasangan istilah dan artinya." },
  { id: "word-bank", title: "Kartu Kosakata", description: "Pelajari kosakata, arti, dan pengucapannya." },
  { id: "word-search", title: "Cari Kata", description: "Temukan kosakata di dalam kotak huruf." },
] as const;

export type GameTemplateId = (typeof GAME_TEMPLATES)[number]["id"];
export type GameLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type GameBlueprintStatus = "draft" | "published" | "session" | "independent";
export type GameBlueprintDestination = "public" | "session" | "independent";

export interface GameBlueprintItem {
  id: string;
  prompt: string;
  imageUrl?: string;
  explanation?: string;
  options?: { id: string; text: string }[];
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
  cardInitials: string;
  template: GameTemplateId;
  level: GameLevel;
  topic: string;
  language: "id" | "en" | "id-en";
  status: GameBlueprintStatus;
  destination?: GameBlueprintDestination;
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

/** Coerces older text-backed editor values into the array shape used by current game editors. */
export function normalizeGameBlueprint(value: unknown): GameBlueprint {
  const game = (value && typeof value === "object" ? value : {}) as Record<string, any>;
  const template = String(game.template || "");
  const list = (raw: unknown, separators = /[,;\/\n]+/) => Array.isArray(raw)
    ? raw.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : typeof raw === "string" ? raw.split(separators).map((entry) => entry.trim()).filter(Boolean) : [];
  const items = Array.isArray(game.items) ? game.items.map((raw: any, itemIndex: number) => {
    const item = raw && typeof raw === "object" ? raw : {};
    const categories = Array.isArray(item.categories)
      ? item.categories.map((category: any, index: number) => typeof category === "string" ? { id: `category-${index}`, label: category.trim() } : { ...category, id: String(category?.id || `category-${index}`), label: String(category?.label || "").trim() }).filter((category: any) => category.label)
      : list(item.categories).map((label, index) => ({ id: `category-${index}`, label }));
    const words = list(item.words, template === "sentence-builder" ? /\s+/ : /[,;\/\n]+/);
    const grid = list(item.grid, /[\/\n]+/).map((row) => row.replace(/\s/g, "").toUpperCase());
    const sortItems = Array.isArray(item.sortItems)
      ? item.sortItems.map((entry: any) => typeof entry === "string" ? { text: entry.trim(), categoryId: categories[0]?.id || "" } : { ...entry, text: String(entry?.text || "").trim(), categoryId: String(entry?.categoryId || categories[0]?.id || "") }).filter((entry: any) => entry.text)
      : list(item.sortItems).map((text) => ({ text, categoryId: categories[0]?.id || "" }));
    const normalized: Record<string, any> = {
      id: String(item.id || `item-${itemIndex + 1}`),
      prompt: String(item.prompt || ""),
    };
    if (typeof item.imageUrl === "string" && /^https?:\/\//.test(item.imageUrl)) normalized.imageUrl = item.imageUrl;
    if (item.explanation !== undefined) normalized.explanation = String(item.explanation || "");
    if (item.answer !== undefined) normalized.answer = String(item.answer || "");
    if (template === "multiple-choice-quiz" || template === "listen-and-choose") {
      normalized.options = Array.isArray(item.options) ? item.options.map((option: any, index: number) => ({ id: String(option?.id || `option-${index + 1}`), text: String(option?.text || "") })) : [];
      if (item.correctIndex !== undefined) normalized.correctIndex = item.correctIndex;
      if (template === "listen-and-choose" || item.audioText !== undefined) normalized.audioText = String(item.audioText || "");
    } else if (template === "drag-and-sort") {
      normalized.categories = categories;
      normalized.sortItems = sortItems;
    } else if (template === "sentence-builder" || template === "word-search") {
      normalized.words = words;
      if (template === "word-search") normalized.grid = grid;
    } else if (template === "matching") {
      normalized.pairs = Array.isArray(item.pairs) ? item.pairs : [];
    } else if (template === "word-bank") {
      normalized.vocabulary = Array.isArray(item.vocabulary) ? item.vocabulary : [];
    }
    return normalized;
  }) : game.items;
  const status = ["draft", "published", "session", "independent"].includes(String(game.status))
    ? game.status as GameBlueprintStatus
    : "draft";
  const destination = ["public", "session", "independent"].includes(String(game.destination))
    ? game.destination as GameBlueprintDestination
    : status === "session" ? "session" : status === "independent" ? "independent" : "public";
  const gameWithoutCover = Object.fromEntries(Object.entries(game).filter(([key]) => key !== "coverImage"));
  const initialsSource = String(game.cardInitials || game.card_initials || "").replace(/[^\p{L}\p{N}]/gu, "");
  const titleInitials = String(game.title || "Kuis").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2);
  const cardInitials = (initialsSource || titleInitials || "KU").slice(0, 4).toLocaleUpperCase("id-ID");
  return { ...gameWithoutCover, cardInitials, status, destination, items } as GameBlueprint;
}

const validator = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);

export function validateGameBlueprint(value: unknown): { valid: boolean; errors: string[] } {
  const valid = validator(value);
  const errors = (validator.errors || []).map((error: ErrorObject) => {
    const path = error.dataPath || "Game";
    return `${path}: ${error.message || "nilai tidak valid"}`;
  });
  if (value && typeof value === "object" && Array.isArray((value as GameBlueprint).items)) {
    const game = value as GameBlueprint;
    if (game.cardInitials.length < 2 || game.cardInitials.length > 4) errors.push("Kuis.inisial: isi 2–4 karakter.");
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

export interface GameBlueprintPublishIssue {
  step: 0 | 1 | 2;
  field: string;
  itemIndex?: number;
  message: string;
}

/** Finds the first publish blocker in terms the editor can show beside its field. */
export function getGameBlueprintPublishIssue(game: GameBlueprint): GameBlueprintPublishIssue | null {
  if (!game.title.trim() || game.title.trim().toLocaleLowerCase("id-ID") === "game baru") return { step: 0, field: "title", message: "Beri game ini judul yang jelas sebelum diterbitkan." };
  if (game.title.length > 100) return { step: 0, field: "title", message: "Judul game maksimal 100 karakter." };
  if (!game.topic.trim()) return { step: 0, field: "topic", message: "Topik game belum diisi." };
  if (game.topic.length > 80) return { step: 0, field: "topic", message: "Topik game maksimal 80 karakter." };
  if (!game.items.length) return { step: 1, field: "items", itemIndex: 0, message: "Tambahkan setidaknya satu soal." };
  for (const [index, item] of game.items.entries()) {
    const issue = (field: string, message: string): GameBlueprintPublishIssue => ({ step: 1, field, itemIndex: index, message: `Soal ${index + 1}: ${message}` });
    if (!item.prompt.trim()) return issue("prompt", "instruksi untuk peserta belum diisi.");
    if (game.template === "multiple-choice-quiz" || game.template === "listen-and-choose") {
      if (game.template === "listen-and-choose" && !item.audioText?.trim()) return issue("audioText", "teks yang dibacakan belum diisi.");
      if (!item.options || item.options.length < 2 || item.options.length > 6 || item.options.some((option) => !option.text.trim())) return issue("options", "isi minimal dua pilihan jawaban dan pastikan tidak ada yang kosong.");
      if (!Number.isInteger(item.correctIndex) || item.correctIndex! < 0 || item.correctIndex! >= item.options.length) return issue("correctIndex", "tandai satu pilihan sebagai jawaban benar.");
      if (new Set(item.options.map((option) => option.id)).size !== item.options.length) return issue("options", "pilihan jawaban perlu diperbarui agar masing-masing unik.");
    } else if (game.template === "drag-and-sort") {
      if (!item.categories || item.categories.length < 2 || item.categories.length > 8 || item.categories.some((category) => !category.label.trim())) return issue("categories", "isi nama minimal dua kategori.");
      if (!item.sortItems || item.sortItems.length < 2 || item.sortItems.length > 40 || item.sortItems.some((entry) => !entry.text.trim())) return issue("sortItems", "masukkan minimal dua kata untuk dikelompokkan.");
      const categoryIds = new Set(item.categories.map((category) => category.id));
      if (item.sortItems.some((entry) => !categoryIds.has(entry.categoryId))) return issue("sortItems", "pilih kategori untuk setiap kata.");
    } else if (game.template === "sentence-builder") {
      if (!item.words || item.words.length < 2 || item.words.length > 40 || item.words.some((word) => !word.trim())) return issue("words", "masukkan kalimat yang terdiri dari minimal dua kata.");
    } else if (game.template === "matching") {
      if (!item.pairs || item.pairs.length < 2 || item.pairs.length > 30 || item.pairs.some((pair) => !pair.left.trim() || !pair.right.trim())) return issue("pairs", "lengkapi minimal dua pasangan kata dan arti.");
    } else if (game.template === "word-bank") {
      if (!item.vocabulary?.length || item.vocabulary.length > 100 || item.vocabulary.some((entry) => !entry.term.trim() || !entry.translation.trim())) return issue("vocabulary", "lengkapi kosakata dan artinya.");
    } else if (game.template === "word-search") {
      if (!item.words || item.words.length < 2 || item.words.length > 40 || item.words.some((word) => !word.trim())) return issue("words", "masukkan minimal dua kata yang dicari.");
      if (!item.grid || item.grid.length < 3 || item.grid.length > 20 || item.grid.some((row) => row.trim().length < 3 || row.trim().length > 20)) return issue("grid", "isi minimal tiga baris kotak huruf (masing-masing 3–20 huruf).");
    }
  }
  if (!Number.isInteger(game.settings?.hearts) || game.settings.hearts < 1 || game.settings.hearts > 10) return { step: 2, field: "settings", message: "Jumlah nyawa harus antara 1 dan 10." };
  if (!Number.isInteger(game.settings?.timeLimitSec) || game.settings.timeLimitSec < 0 || game.settings.timeLimitSec > 3600) return { step: 2, field: "settings", message: "Batas waktu harus antara 0 dan 3.600 detik." };
  const validation = validateGameBlueprint(game);
  if (!validation.valid) {
    const itemNumber = validation.errors.map((message) => message.match(/item (\d+)/i)?.[1]).find(Boolean);
    const itemIndex = itemNumber ? Number(itemNumber) - 1 : undefined;
    return { step: itemIndex === undefined ? 2 : 1, field: "structure", itemIndex, message: itemIndex === undefined ? "Periksa pengaturan game sebelum diterbitkan." : `Soal ${itemIndex + 1}: periksa kembali pilihan dan isi jawaban.` };
  }
  return null;
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
    cardInitials: "KU",
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
