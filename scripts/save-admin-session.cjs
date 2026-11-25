// Login manual, lalu simpan sesi. Tidak membaca atau mencetak kredensial.
const { chromium } = require("playwright");
const readline = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const dir = ".playwright-auth";
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/admin/masuk", {
    timeout: 90000,
    waitUntil: "domcontentloaded",
  });
  console.log("Login manual di jendela yang terbuka. Setelah dashboard tampil, tekan Enter di sini.");
  await new Promise((r) => readline.createInterface({ input: process.stdin }).once("line", r));
  await ctx.storageState({ path: path.join(dir, "admin.storageState.json") });
  await browser.close();
  console.log("Sesi tersimpan.");
  process.exit(0);
})();