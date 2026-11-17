import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import ts from "typescript";
import QRCode from "qrcode";

const schema = JSON.parse(await readFile(new URL("../src/lib/game.schema.json", import.meta.url), "utf8"));
const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);

test("contoh game Sapen valid sesuai skema JSON", async () => {
  for (const file of ["telling-the-time.json", "sort-it-out-sapen.json", "descriptive-text-jogja.json"]) {
    const game = JSON.parse(await readFile(new URL(`../data/games/${file}`, import.meta.url), "utf8"));
    assert.equal(validate(game), true, `${file}: ${JSON.stringify(validate.errors)}`);
  }
});

test("skema menolak pilihan ganda tanpa jawaban benar", async () => {
  const game = JSON.parse(await readFile(new URL("../data/games/telling-the-time.json", import.meta.url), "utf8"));
  delete game.items[0].correctIndex;
  assert.equal(validate(game), false);
});

test("skema membatasi pilihan jawaban hingga lima", async () => {
  const game = JSON.parse(await readFile(new URL("../data/games/telling-the-time.json", import.meta.url), "utf8"));
  game.items[0].options.push({ id: "d", text: "D" }, { id: "e", text: "E" }, { id: "f", text: "F" });
  assert.equal(validate(game), false);
});

test("engine menambah skor, streak, dan mengurangi nyawa", async () => {
  const source = await readFile(new URL("../src/lib/game-engine.ts", import.meta.url), "utf8");
  const javascript = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
  const engine = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
  const game = { settings: { hearts: 2 }, items: [{}, {}], template: "multiple-choice-quiz" };
  let progress = engine.initialGameProgress(game);
  let result = engine.submitBlueprintAnswer(game, progress, true);
  assert.deepEqual(result.progress, { score: 100, hearts: 2, streak: 1, bestStreak: 1, answered: 1, correct: 1 });
  result = engine.submitBlueprintAnswer(game, result.progress, false);
  assert.deepEqual(result.progress, { score: 100, hearts: 1, streak: 0, bestStreak: 1, answered: 2, correct: 1 });
  assert.equal(result.finished, true);
});

test("engine mengevaluasi interaksi semua tujuh template pratinjau", async () => {
  const source = await readFile(new URL("../src/lib/game-engine.ts", import.meta.url), "utf8");
  const javascript = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
  const engine = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
  const cases = [
    ["multiple-choice-quiz", { correctIndex: 1 }, 1],
    ["listen-and-choose", { correctIndex: 0 }, 0],
    ["drag-and-sort", { sortItems: [{ categoryId: "a" }, { categoryId: "b" }] }, ["a", "b"]],
    ["sentence-builder", { words: ["We", "learn", "English"] }, ["We", "learn", "English"]],
    ["matching", { pairs: [{ left: "hello", right: "halo" }] }, [{ left: "hello", right: "halo" }]],
    ["word-bank", { vocabulary: [{ term: "hello", translation: "halo" }] }, "halo"],
    ["word-search", { words: ["SAPEN", "LEARN"] }, ["SAPEN", "LEARN"]],
  ];
  for (const [template, item, answer] of cases) {
    const game = { template };
    assert.equal(engine.evaluateBlueprintAnswer(game, item, answer), true, `${template} must accept its correct preview answer`);
  }
});

test("kode, status pendaftaran, dan QR mengarah ke alur presensi sesi", async () => {
  const source = await readFile(new URL("../src/lib/class-session.ts", import.meta.url), "utf8");
  const javascript = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
  const attendance = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
  assert.equal(attendance.normalizeClassCode("ab-c123"), "ABC123");
  assert.deepEqual(attendance.validateGuestRegistration("  Siti   Aminah ", "+62 812-3456-7890"), { name: "Siti Aminah", whatsapp: "+6281234567890" });
  assert.equal(attendance.resolveGuestEntry("open", false), "approved");
  assert.equal(attendance.resolveGuestEntry("open", true), "pending");
  assert.equal(attendance.resolveGuestEntry("closed", false), "closed");
  const joinUrl = attendance.classSessionJoinUrl("https://kampungsapen.id/", "ab-c123");
  assert.equal(joinUrl, "https://kampungsapen.id/sesi/ABC123");
  assert.match(await QRCode.toDataURL(joinUrl), /^data:image\/png;base64,/);
});
