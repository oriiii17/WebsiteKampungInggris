const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

const routes = [
  // Publik
  "/", "/kelas", "/kelas/grammar-basic", "/kelas/speaking-percakapan-harian",
  "/kelas/english-for-kids", "/kelas/toefl-reading-structure", "/games",
  "/games/audit-sample", "/sesi", "/sesi/XT2PA7", "/tentang", "/faq",
  "/keranjang", "/masuk", "/masuk?mode=warga", "/daftar", "/lupa-password",
  "/reset-password", "/login", "/berlangganan", "/paket", "/checkout", "/leaderboard",
  // Peserta, warga, materi, permainan, dan tutor
  "/akun", "/modul", "/modul/grammar-basic", "/materi", "/materi/grammar-basic",
  "/belajar/grammar-basic", "/kelas/grammar-basic/modul/mod-grammar-basic", "/sesi/kelola",
  "/game", "/game/telling-time", "/game/word-match", "/game/word-builder",
  "/game/story-quest", "/game/quick-quiz", "/game/join?pin=123456", "/game/host",
  "/game/host/123456", "/game/play/123456",
  // Seluruh route admin dan tab yang dikendalikan query string
  "/admin", "/admin/masuk", "/admin/login", "/admin?tab=dashboard", "/admin?tab=classes",
  "/admin?tab=sessions", "/admin?tab=warga", "/admin?tab=testimoni", "/admin?tab=codes",
  "/admin?tab=games", "/admin?tab=game-builder", "/admin?tab=public", "/admin?tab=payments",
];

const outputDir = path.resolve("docs/screenshots/mobile-audit-2026-11-22");
fs.mkdirSync(outputDir, { recursive: true });

function routeSlug(route) {
  return (route === "/" ? "beranda" : route.slice(1))
    .replace(/[/?=&]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "halaman";
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch (chromeError) {
    console.warn(`Chrome tidak dapat dibuka (${chromeError.message}); mencoba Microsoft Edge.`);
    browser = await chromium.launch({ channel: "msedge", headless: true });
  }

  const results = [];
  const pages = await Promise.all(viewports.map(async (viewport) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    return { viewport, context, page: await context.newPage() };
  }));
  for (const [routeIndex, route] of routes.entries()) {
    const routeResults = await Promise.all(pages.map(async ({ viewport, page }) => {
      const pageErrors = [];
      const onPageError = (error) => pageErrors.push(error.message);
      page.on("pageerror", onPageError);
      let responseStatus = null;
      let navigationError = null;
      try {
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "commit", timeout: 15000 });
        responseStatus = response?.status() ?? null;
        await page.waitForFunction(() => document.readyState !== "loading", { timeout: 8000 }).catch(() => {});
        // Give client-side redirects and responsive hydration time to settle before measuring.
        await page.waitForTimeout(450);
        await page.evaluate(() => Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 250))]));
      } catch (error) {
        navigationError = error.message;
      }

      const inspectPage = () => page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        };
        const controls = [...document.querySelectorAll("button, a[href], input, select, textarea")].filter(visible);
        const shortControls = controls.filter((element) => element.getBoundingClientRect().height < 44).map((element) => ({
          tag: element.tagName.toLowerCase(),
          text: (element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().slice(0, 55),
          height: Math.round(element.getBoundingClientRect().height),
        }));
        const clippedText = [...document.querySelectorAll("h1,h2,h3,p,a,button,label,th,td")].filter((element) => {
          if (!visible(element)) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (style.textOverflow === "ellipsis" || style.overflowX === "hidden") && element.scrollWidth > element.clientWidth + 2 && rect.width > 0;
        }).map((element) => (element.innerText || "").trim().slice(0, 50)).filter(Boolean).slice(0, 12);
        const rootMain = [...body.children].find((element) => element.tagName === "MAIN");
        const rootFooter = [...body.children].find((element) => element.tagName === "FOOTER");
        const nav = document.querySelector(".bottomNav");
        return {
          viewportWidth: window.innerWidth,
          documentWidth: doc.scrollWidth,
          bodyWidth: body.scrollWidth,
          horizontalOverflow: doc.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth,
          shortControls,
          clippedText,
          footerBelowMain: !rootFooter || !rootMain || rootFooter.getBoundingClientRect().top >= rootMain.getBoundingClientRect().bottom - 2,
          bottomNavVisible: Boolean(nav && visible(nav)),
          bottomNavLabels: nav ? [...nav.querySelectorAll("a")].map((link) => (link.innerText || "").trim()) : [],
          title: document.title,
          landedAt: `${location.pathname}${location.search}`,
          pageHeading: document.querySelector("h1")?.innerText?.trim() || "",
        };
      });
      let checks;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          checks = await inspectPage();
          break;
        } catch (error) {
          if (attempt === 2) checks = { checkError: error.message };
          else await page.waitForTimeout(350);
        }
      }

      const screenshotName = `${routeSlug(route)}-${viewport.width}x${viewport.height}.png`;
      try {
        await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: process.env.FULL_PAGE === "true", animations: "disabled" });
      } catch (error) {
        navigationError ||= `screenshot: ${error.message}`;
      }
      page.off("pageerror", onPageError);
      return { route, viewport, responseStatus, screenshot: screenshotName, navigationError, pageErrors, ...checks };
    }));
    results.push(...routeResults);
    console.log(`Route ${routeIndex + 1}/${routes.length}: ${route}`);
  }

  const resultPath = path.join(outputDir, "results.json");
  fs.writeFileSync(resultPath, JSON.stringify({ baseUrl, capturedAt: new Date().toISOString(), viewports, routeCount: routes.length, results }, null, 2));
  await Promise.all(pages.map(({ context }) => context.close()));
  await browser.close();
  console.log(`HASIL ${resultPath}`);
  console.log(`ROUTES ${routes.length}; SCREENSHOTS ${results.filter((result) => !result.navigationError).length}/${results.length}`);
  console.log(`HORIZONTAL_OVERFLOW ${results.filter((result) => result.horizontalOverflow).length}; NAVIGATION_OR_CAPTURE_ERRORS ${results.filter((result) => result.navigationError).length}; PAGE_ERRORS ${results.reduce((sum, result) => sum + result.pageErrors.length, 0)}`);
})();
