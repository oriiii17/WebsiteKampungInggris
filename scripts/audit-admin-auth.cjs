// Read-only authenticated admin responsive audit. Credentials are never logged or written.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

try { process.loadEnvFile(".env.local"); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Audit dihentikan: isi ADMIN_EMAIL dan ADMIN_PASSWORD di .env.local atau environment shell.");
  process.exit(2);
}

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];
// These query tabs are the source-defined ADMIN_TABS in AdminDashboardClient.tsx.
const tabs = ["dashboard", "classes", "warga", "testimoni", "codes", "games", "game-builder", "sessions", "public", "payments"];
const adminRoutes = ["/admin", ...tabs.map((tab) => `/admin?tab=${tab}`)];
const outputDir = path.resolve("docs/screenshots/mobile-audit-2026-11-22");
const storageStatePath = path.resolve(".playwright-auth/admin.storageState.json");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

function slug(route) {
  return (route === "/admin" ? "dashboard-default" : route.replace("/admin?tab=", "admin-"))
    .replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function redacted(value) {
  return String(value || "").replaceAll(email, "[EMAIL DISEMBUNYIKAN]").replaceAll(password, "[PASSWORD DISEMBUNYIKAN]");
}
async function launchBrowser() {
  try { return await chromium.launch({ channel: "chrome", headless: true }); }
  catch { return chromium.launch({ channel: "msedge", headless: true }); }
}

(async () => {
  const browser = await launchBrowser();
  try {
    // Capture the actual admin login route at every requested viewport (no credentials entered yet).
    const loginScreens = await Promise.all(viewports.map(async (viewport) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      let status = null;
      let error = null;
      try {
        const response = await page.goto(`${baseUrl}/admin/masuk`, { waitUntil: "domcontentloaded", timeout: 20000 });
        status = response?.status() ?? null;
        await page.waitForTimeout(300);
        const screenshot = `admin-login-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), animations: "disabled" });
        return { route: "/admin/masuk", viewport, responseStatus: status, landedAt: new URL(page.url()).pathname, screenshot, failed: status !== 200 };
      } catch (reason) {
        error = redacted(reason.message);
        return { route: "/admin/masuk", viewport, responseStatus: status, screenshot: null, failed: true, error };
      } finally { await context.close(); }
    }));

    // Authenticate exactly once. This only submits the normal login form; no data-management action is used.
    const loginContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${baseUrl}/admin/masuk`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await loginPage.getByLabel("Email Admin").fill(email);
    await loginPage.getByLabel("Kata Sandi").fill(password);
    await loginPage.getByRole("button", { name: "Masuk ke Panel Admin" }).click();
    try {
      await loginPage.waitForFunction(() => location.pathname !== "/admin/masuk", { timeout: 25000 });
    } catch {
      const message = await loginPage.locator('[role="alert"]').first().innerText().catch(() => "Tidak ada pesan galat yang tampil.");
      console.error(`LOGIN_ADMIN_GAGAL: ${redacted(message).trim().slice(0, 300)}`);
      await loginContext.close();
      await browser.close();
      process.exit(3);
    }
    const loginLanding = new URL(loginPage.url());
    if (!loginLanding.pathname.startsWith("/admin")) {
      console.error(`LOGIN_ADMIN_GAGAL: setelah login browser mendarat di ${loginLanding.pathname}, bukan area admin.`);
      await loginContext.close();
      await browser.close();
      process.exit(3);
    }
    await loginPage.waitForTimeout(500);
    await loginContext.storageState({ path: storageStatePath });
    await loginContext.close();

    const pages = await Promise.all(viewports.map(async (viewport) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, storageState: storageStatePath });
      return { viewport, context, page: await context.newPage() };
    }));
    const results = [];
    for (const [index, route] of adminRoutes.entries()) {
      const routeResults = await Promise.all(pages.map(async ({ viewport, page }) => {
        const pageErrors = [];
        const onPageError = (error) => pageErrors.push(redacted(error.message));
        page.on("pageerror", onPageError);
        let responseStatus = null;
        let navigationError = null;
        try {
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          responseStatus = response?.status() ?? null;
          await page.waitForTimeout(700);
        } catch (reason) { navigationError = redacted(reason.message); }

        let check;
        try {
          check = await page.evaluate(() => {
            const text = document.body.innerText || "";
            const width = window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const errorScreen = /Dashboard belum dapat dibuka|Sesi admin tidak ditemukan|Sesi admin sudah berakhir/i.test(text);
            return {
              landedAt: location.pathname + location.search,
              title: document.title,
              heading: document.querySelector("h1")?.innerText?.trim() || document.querySelector("h2")?.innerText?.trim() || "",
              viewportWidth: width,
              documentWidth: scrollWidth,
              bodyWidth: bodyScrollWidth,
              horizontalOverflow: scrollWidth > width || bodyScrollWidth > width,
              errorScreen,
              errorMessage: errorScreen ? (text.match(/Sesi admin[^\n]*|Dashboard belum dapat dibuka[^\n]*/i)?.[0] || "Layar error admin") : null,
            };
          });
        } catch (reason) { check = { checkError: redacted(reason.message) }; }

        const screenshot = `admin-auth-${slug(route)}-${viewport.width}x${viewport.height}.png`;
        try { await page.screenshot({ path: path.join(outputDir, screenshot), animations: "disabled" }); }
        catch (reason) { navigationError ||= `Screenshot gagal: ${redacted(reason.message)}`; }
        page.off("pageerror", onPageError);
        const failed = Boolean(navigationError || check?.checkError || check?.errorScreen || !check?.landedAt?.startsWith("/admin") || (route !== "/admin/masuk" && check?.landedAt?.startsWith("/admin/masuk")) || responseStatus !== 200);
        return { route, viewport, responseStatus, screenshot, navigationError, pageErrors, failed, ...check };
      }));
      results.push(...routeResults);
      console.log(`Admin ${index + 1}/${adminRoutes.length}: ${route}`);
    }

    await Promise.all(pages.map(({ context }) => context.close()));
    const resultPath = path.join(outputDir, "admin-auth-results.json");
    fs.writeFileSync(resultPath, JSON.stringify({ baseUrl, capturedAt: new Date().toISOString(), loginRoute: "/admin/masuk", viewports, adminRoutes, loginScreens, screenshotCount: loginScreens.filter((x) => x.screenshot).length + results.filter((x) => x.screenshot).length, storageStatePath: ".playwright-auth/admin.storageState.json", results }, null, 2));
    console.log(`HASIL ${resultPath}`);
    console.log(`ADMIN_SCREENSHOTS ${loginScreens.filter((x) => x.screenshot).length + results.filter((x) => x.screenshot).length}; ADMIN_ROUTE_VIEWPORTS ${results.length}; GAGAL ${results.filter((x) => x.failed).length}`);
  } finally { await browser.close().catch(() => {}); }
})().catch((error) => {
  console.error(`AUDIT_ADMIN_GAGAL: ${redacted(error?.message || "Kesalahan tidak dikenal")}`);
  process.exitCode = 1;
});

