import type { GameBlueprintItem, GameTemplateId } from "@/lib/game-blueprint";

type QuizImportTemplate = {
  filename: string;
  headers: string[];
  exampleRows: string[][];
  notes: string;
};

export const QUIZ_IMPORT_TEMPLATES: Record<GameTemplateId, QuizImportTemplate> = {
  "multiple-choice-quiz": {
    filename: "template-pilihan-ganda.csv",
    headers: ["pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "jawaban_benar"],
    exampleRows: [
      ["What is the plural of child?", "Childs", "Children", "Childes", "Childrens", "B"],
      ["Choose the correct greeting.", "Good morning", "Good night", "Goodbye", "See you", "A"],
    ],
    notes: "Jawaban benar memakai huruf A–D; minimal dua opsi harus diisi.",
  },
  "listen-and-choose": {
    filename: "template-dengar-dan-pilih.csv",
    headers: ["pertanyaan", "teks_audio", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "jawaban_benar"],
    exampleRows: [
      ["Which word did you hear?", "apple", "Apple", "Apply", "April", "Able", "A"],
      ["Choose the spoken greeting.", "Good afternoon", "Good morning", "Good afternoon", "Good evening", "Good night", "B"],
    ],
    notes: "Teks audio wajib; jawaban benar memakai huruf A–D.",
  },
  "drag-and-sort": {
    filename: "template-kelompokkan-kata.csv",
    headers: ["instruksi", "kategori_1", "kata_kategori_1", "kategori_2", "kata_kategori_2", "kategori_3", "kata_kategori_3", "kategori_4", "kata_kategori_4"],
    exampleRows: [
      ["Kelompokkan berdasarkan jenis kata.", "Noun", "book;teacher", "Verb", "read;write", "", "", "", ""],
      ["Kelompokkan berdasarkan tempat.", "At school", "classroom;library", "At home", "kitchen;bedroom", "Outside", "garden;park", "", ""],
    ],
    notes: "Pisahkan beberapa kata dalam kategori dengan titik koma (;).",
  },
  "sentence-builder": {
    filename: "template-susun-kalimat.csv",
    headers: ["instruksi", "kalimat_benar"],
    exampleRows: [
      ["Susun kata menjadi kalimat yang benar.", "I learn English every day"],
      ["Susun kata untuk menceritakan kebiasaan.", "She reads a book at night"],
    ],
    notes: "Kalimat benar dipecah menjadi kartu kata berdasarkan spasi.",
  },
  matching: {
    filename: "template-pasangkan-kata.csv",
    headers: ["instruksi", "pasangan_1_kiri", "pasangan_1_kanan", "pasangan_2_kiri", "pasangan_2_kanan", "pasangan_3_kiri", "pasangan_3_kanan", "pasangan_4_kiri", "pasangan_4_kanan"],
    exampleRows: [
      ["Pasangkan kata dengan artinya.", "Book", "Buku", "Teacher", "Guru", "School", "Sekolah", "", ""],
      ["Pasangkan ungkapan dengan artinya.", "Good morning", "Selamat pagi", "Thank you", "Terima kasih", "Goodbye", "Sampai jumpa", "", ""],
    ],
    notes: "Isi minimal dua pasangan; pasangan tambahan boleh dikosongkan.",
  },
  "word-bank": {
    filename: "template-kartu-kosakata.csv",
    headers: ["instruksi", "kata", "arti", "pelafalan", "contoh"],
    exampleRows: [
      ["Pelajari kosakata berikut.", "friendly", "ramah", "frend-li", "She is friendly to everyone."],
      ["Pelajari kosakata berikut.", "journey", "perjalanan", "jer-ni", "The journey was exciting."],
    ],
    notes: "Setiap baris membuat satu kartu kosakata; kata dan arti wajib diisi.",
  },
  "word-search": {
    filename: "template-cari-kata.csv",
    headers: ["instruksi", "kata_dicari", ...Array.from({ length: 20 }, (_, index) => `baris_${index + 1}`)],
    exampleRows: [
      ["Cari nama buah berikut.", "APPLE;PEAR", "APPLE", "XQWERT", "PEARXX", "", ""],
      ["Cari kata yang berkaitan dengan sekolah.", "BOOK;PEN", "BOOKXX", "PENABC", "QWERTY", "", ""],
    ],
    notes: "Pisahkan kata dengan titik koma; isi 3–20 baris, masing-masing 3–20 huruf.",
  },
};

export class QuizTemplateHeaderError extends Error {}

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function splitSemicolon(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean);
}

function cell(row: string[], index: number) {
  return String(row[index] ?? "").trim();
}

export function buildQuizImportItems(templateId: GameTemplateId, rows: string[][]): GameBlueprintItem[] {
  const template = QUIZ_IMPORT_TEMPLATES[templateId];
  const normalizedHeaders = (rows[0] || []).map(normalizeHeader);
  const expectedHeaders = template.headers.map(normalizeHeader);
  const headerMatches = normalizedHeaders.length === expectedHeaders.length
    && expectedHeaders.every((header) => normalizedHeaders.includes(header));
  if (!headerMatches) throw new QuizTemplateHeaderError();

  const headerIndex = new Map(normalizedHeaders.map((header, index) => [header, index]));
  const get = (row: string[], header: string) => cell(row, headerIndex.get(normalizeHeader(header)) ?? -1);
  const dataRows = rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim()));
  if (!dataRows.length) throw new Error("Tidak ada baris soal yang dapat diimpor.");
  if (dataRows.length > 200) throw new Error("Maksimal 200 soal dapat diimpor sekaligus.");

  return dataRows.map((row, rowIndex) => {
    const id = `item-import-${Date.now()}-${rowIndex}`;
    if (templateId === "multiple-choice-quiz" || templateId === "listen-and-choose") {
      const prompt = get(row, "pertanyaan");
      const audioText = templateId === "listen-and-choose" ? get(row, "teks_audio") : "";
      const sourceOptions = (["A", "B", "C", "D"] as const).map((letter) => ({ letter, text: get(row, `opsi_${letter.toLocaleLowerCase("id-ID")}`) })).filter((option) => option.text);
      const answer = get(row, "jawaban_benar").toLocaleUpperCase("id-ID");
      const correctIndex = sourceOptions.findIndex((option) => option.letter === answer || option.text === get(row, "jawaban_benar"));
      if (!prompt || prompt.length > 500 || (templateId === "listen-and-choose" && !audioText) || sourceOptions.length < 2 || correctIndex < 0) {
        throw new Error(`Baris ${rowIndex + 2}: pertanyaan, audio (jika wajib), minimal dua opsi, dan jawaban benar A–D harus diisi.`);
      }
      return { id, prompt, options: sourceOptions.map((option, index) => ({ id: `${id}-option-${index + 1}`, text: option.text })), correctIndex, ...(audioText ? { audioText } : {}) };
    }

    if (templateId === "drag-and-sort") {
      const prompt = get(row, "instruksi");
      const categories = [1, 2, 3, 4].map((number) => ({ label: get(row, `kategori_${number}`), words: splitSemicolon(get(row, `kata_kategori_${number}`)) })).filter((category) => category.label || category.words.length);
      const totalWords = categories.reduce((total, category) => total + category.words.length, 0);
      if (!prompt || prompt.length > 500 || categories.length < 2 || categories.length > 4 || categories.some((category) => !category.label || !category.words.length) || totalWords < 2 || totalWords > 40) throw new Error(`Baris ${rowIndex + 2}: isi instruksi, 2–4 kategori, dan 2–40 kata dengan kategori untuk setiap kata.`);
      const normalizedCategories = categories.map((category, index) => ({ id: `${id}-category-${index + 1}`, label: category.label }));
      return { id, prompt, categories: normalizedCategories, sortItems: categories.flatMap((category, index) => category.words.map((text) => ({ text, categoryId: normalizedCategories[index].id }))) };
    }

    if (templateId === "sentence-builder") {
      const prompt = get(row, "instruksi");
      const words = get(row, "kalimat_benar").split(/\s+/).filter(Boolean);
      if (!prompt || prompt.length > 500 || words.length < 2 || words.length > 40) throw new Error(`Baris ${rowIndex + 2}: isi instruksi dan kalimat benar 2–40 kata.`);
      return { id, prompt, words };
    }

    if (templateId === "matching") {
      const prompt = get(row, "instruksi");
      const pairs = [1, 2, 3, 4].map((number) => ({ left: get(row, `pasangan_${number}_kiri`), right: get(row, `pasangan_${number}_kanan`) })).filter((pair) => pair.left || pair.right);
      if (!prompt || prompt.length > 500 || pairs.length < 2 || pairs.some((pair) => !pair.left || !pair.right)) throw new Error(`Baris ${rowIndex + 2}: isi instruksi dan minimal dua pasangan lengkap.`);
      return { id, prompt, pairs };
    }

    if (templateId === "word-bank") {
      const prompt = get(row, "instruksi");
      const term = get(row, "kata");
      const translation = get(row, "arti");
      if (!prompt || prompt.length > 500 || !term || !translation) throw new Error(`Baris ${rowIndex + 2}: isi instruksi, kata, dan arti.`);
      return { id, prompt, vocabulary: [{ term, translation, ...(get(row, "pelafalan") ? { pronunciation: get(row, "pelafalan") } : {}), ...(get(row, "contoh") ? { example: get(row, "contoh") } : {}) }] };
    }

    const prompt = get(row, "instruksi");
    const words = splitSemicolon(get(row, "kata_dicari")).map((word) => word.toLocaleUpperCase("id-ID"));
    const grid = Array.from({ length: 20 }, (_, index) => get(row, `baris_${index + 1}`).replace(/\s/g, "").toLocaleUpperCase("id-ID")).filter(Boolean);
    if (!prompt || prompt.length > 500 || words.length < 2 || words.length > 40 || grid.length < 3 || grid.some((line) => line.length < 3 || line.length > 20)) {
      throw new Error(`Baris ${rowIndex + 2}: isi instruksi, 2–40 kata, dan 3–5 baris kotak (3–20 huruf per baris).`);
    }
    return { id, prompt, words, grid };
  });
}

export function serializeQuizTemplate(templateId: GameTemplateId) {
  const template = QUIZ_IMPORT_TEMPLATES[templateId];
  const quote = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  return [template.headers, ...template.exampleRows].map((row) => row.map(quote).join(",")).join("\r\n");
}
