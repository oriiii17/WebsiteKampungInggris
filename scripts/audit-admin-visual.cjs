// Read-only visual/DOM audit for already-authenticated admin pages.
// Uses the saved Playwright storage state; never submits forms or triggers mutations.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const storageStatePath = path.resolve(".playwright-auth/admin.storageState.json");
const outputDir = path.resolve("docs/screenshots/mobile-audit-2026-11-22");
const outputPath = path.join(outputDir, "admin-visual-results.json");
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];
const tabs = [
  { id: "dashboard", heading: "Dashboard Pengurus" },
  { id: "classes", heading: "Kelas" },
  { id: "warga", heading: "Akses RW & Peserta" },
  { id: "testimoni", heading: "Testimoni" },
  { id: "codes", heading: "Peserta & Akses Kelas" },
  { id: "games", heading: "Host Kuis / Game" },
  { id: "game-builder", heading: "Kelola Game" },
  { id: "sessions", heading: "Sesi Tatap Muka" },
  { id: "public", heading: "Situs Publik" },
  { id: "payments", heading: "Pembayaran" },
];

if (!fs.existsSync(storageStatePath)) {
  console.error("Storage state admin tidak ditemukan. Jalankan scripts/audit-admin-auth.cjs terlebih dahulu.");
  process.exit(2);
}

(async () => {
  let browser;
  try {
    try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
    catch { browser = await chromium.launch({ channel: "msedge", headless: true }); }
    const context = await browser.newContext({ storageState: storageStatePath, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const results = [];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const tab of tabs) {
        const route = `/admin?tab=${tab.id}`;
        const record = { tab: tab.id, viewport, route, ready: false, findings: [] };
        try {
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          record.httpStatus = response?.status() ?? null;
          await page.locator("main").getByRole("heading", { level: 1, name: tab.heading, exact: true })
            .waitFor({ state: "visible", timeout: 20000 });
          await page.waitForFunction(() => !/\bMemuat\b/i.test(document.body.innerText), null, { timeout: 20000 });
          await page.waitForTimeout(500);
          record.ready = true;
          const screenshotName = `admin-full-${tab.id}-${viewport.width}x${viewport.height}.png`;
          record.screenshot = screenshotName;
          try {
            await page.screenshot({
              path: path.join(outputDir, screenshotName),
              fullPage: true,
              animations: "disabled",
            });
          } catch (error) {
            record.screenshotError = String(error.message || error).replace(/[\r\n]+/g, " ").slice(0, 250);
            record.findings.push("Screenshot full-page gagal disimpan");
          }
          const audit = await page.evaluate(() => {
            const width = window.innerWidth;
            const visible = (el) => {
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0
                && rect.width > 0 && rect.height > 0;
            };
            const labelOf = (el) => {
              const labelledBy = (el.getAttribute("aria-labelledby") || "").split(/\s+/)
                .map((id) => document.getElementById(id)?.innerText || "").join(" ");
              const associatedLabels = el.labels ? [...el.labels].map((label) => label.innerText).join(" ") : "";
              const imageAlt = [...el.querySelectorAll("img")].map((img) => img.alt).join(" ");
              return [el.getAttribute("aria-label"), labelledBy, associatedLabels, el.getAttribute("title"), el.innerText, el.value, imageAlt]
                .filter(Boolean).join(" ").trim();
            };
            const clips = [...document.querySelectorAll("body *")].filter((el) => {
              if (!visible(el)) return false;
              const rect = el.getBoundingClientRect();
              return rect.right > width + 1 || rect.left < -1;
            }).slice(0, 40).map((el) => ({
              tag: el.tagName.toLowerCase(), role: el.getAttribute("role"),
              text: (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 80),
              right: Math.round(el.getBoundingClientRect().right), left: Math.round(el.getBoundingClientRect().left),
              className: typeof el.className === "string" ? el.className.slice(0, 100) : "",
            }));
            const smallTargets = [...document.querySelectorAll('button, a[href], input, select, [role="button"]')]
              .filter(visible).map((el) => ({ el, rect: el.getBoundingClientRect() }))
              .filter(({ rect }) => rect.height < 44 || rect.width < 44)
              .slice(0, 60).map(({ el, rect }) => ({
                tag: el.tagName.toLowerCase(), text: labelOf(el).replace(/\s+/g, " ").slice(0, 80),
                width: Math.round(rect.width), height: Math.round(rect.height),
              }));
            const unlabeledIconButtons = [...document.querySelectorAll('button, a[href], [role="button"]')]
              .filter(visible).filter((el) => !labelOf(el) && el.querySelector("svg, img, [data-icon]"))
              .slice(0, 60).map((el) => ({ tag: el.tagName.toLowerCase(), className: typeof el.className === "string" ? el.className.slice(0, 100) : "" }));
            const verticalText = [...document.querySelectorAll("body *")].filter((el) => {
              if (!visible(el) || el.children.length > 0) return false;
              const text = (el.textContent || "").trim();
              if (text.length < 5) return false;
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.writingMode !== "horizontal-tb"
                || (rect.width <= parseFloat(style.fontSize) * 1.15 && rect.height > rect.width * 3 && /\S/.test(text));
            }).slice(0, 30).map((el) => ({
              text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
              writingMode: getComputedStyle(el).writingMode,
              width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height),
            }));
            return {
              pageTitle: document.title,
              heading: document.querySelector("main h1")?.textContent?.trim() || "",
              loadingVisible: /\bMemuat\b/i.test(document.body.innerText),
              errorVisible: /Dashboard belum dapat dibuka|Sesi admin tidak ditemukan|Sesi admin sudah berakhir/i.test(document.body.innerText),
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: width,
              overflowElements: clips,
              smallTargets,
              unlabeledIconButtons,
              verticalText,
            };
          });
          record.audit = audit;
          if (audit.loadingVisible || audit.errorVisible || !audit.heading) record.findings.push("Konten tidak siap / layar error");
          if (audit.verticalText.length) record.findings.push("Teks vertikal atau menyempit per huruf");
          if (audit.overflowElements.length) record.findings.push("Elemen melewati batas viewport (termasuk dalam kontainer overflow)");
          if (audit.smallTargets.length) record.findings.push("Target sentuh terlihat berukuran di bawah 44 px");
          if (audit.unlabeledIconButtons.length) record.findings.push("Tombol ikon tanpa nama aksesibel terlihat");
        } catch (error) {
          record.error = String(error.message || error).replace(/[\r\n]+/g, " ").slice(0, 300);
          record.findings.push("GAGAL memuat konten tab untuk pemeriksaan DOM");
        }
        results.push(record);
        console.log(`${tab.id} ${viewport.width}: ${record.ready ? "READY" : "GAGAL"}; temuan=${record.findings.length}`);
      }
    }

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2));
    await context.close();
    await browser.close();
    console.log(`HASIL=${outputPath}`);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error(`AUDIT_GAGAL: ${String(error.message || error).replace(/[\r\n]+/g, " ").slice(0, 300)}`);
    process.exit(1);
  }
})();
