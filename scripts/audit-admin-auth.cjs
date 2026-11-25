// Read-only authenticated admin responsive audit. No credential values are logged or stored in source.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

try { process.loadEnvFile(".env.local"); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const email = process.env.ADMIN_PENGURUS_EMAIL?.trim();
const password = process.env.ADMIN_PENGURUS_PASSWORD;
if (!email || !password) {
  console.error("LOGIN_GAGAL: kredensial admin tidak tersedia di .env.local.");
  process.exit(2);
}

const baseUrl = "http://localhost:3000";
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
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
const routes = tabs.map((tab) => ({ route: `/admin?tab=${tab.id}`, ...tab }));
const outputDir = path.resolve("docs/screenshots/mobile-audit-2026-11-22");
const storageStatePath = path.resolve(".playwright-auth/admin.storageState.json");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

function safeMessage(value) {
  return String(value || "").replaceAll(email, "[EMAIL]").replaceAll(password, "[PASSWORD]").replace(/[\r\n]+/g, " ").slice(0, 300);
}
function routeSlug(route) { return route.replace("/admin?tab=", "admin-"); }

(async () => {
  let browser;
  try {
    try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
    catch { browser = await chromium.launch({ channel: "msedge", headless: true }); }
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const authResponses = [];
    const responseTasks = [];
    const authRequestFailures = [];
    const requestProbe = new WeakMap();
    let activeProbe = null;
    const safeRequestUrl = (rawUrl) => {
      try { const url = new URL(rawUrl); return `${url.origin}${url.pathname}`; }
      catch { return "URL tidak valid"; }
    };
    const trackedRequest = (request) => ["document", "fetch", "xhr"].includes(request.resourceType());
    const networkIssues = (probe) => [...new Map(
      probe.requests.filter((item) => item.pending || item.failed)
        .map(({ url, status }) => [`${url}|${status}`, { url, status }]),
    ).values()];
    page.on("request", (request) => {
      if (!activeProbe || !trackedRequest(request)) return;
      const record = { url: safeRequestUrl(request.url()), status: null, pending: true, failed: false };
      activeProbe.requests.push(record);
      requestProbe.set(request, record);
    });
    page.on("response", (response) => {
      const record = requestProbe.get(response.request());
      if (!record) return;
      record.status = response.status();
      record.failed = response.status() >= 400;
    });
    page.on("requestfinished", (request) => {
      const record = requestProbe.get(request);
      if (record) record.pending = false;
    });
    page.on("requestfailed", (request) => {
      const record = requestProbe.get(request);
      if (record) { record.pending = false; record.failed = true; }
    });
    page.on("console", (message) => {
      if (message.type() === "error" && activeProbe) activeProbe.consoleErrors.push(safeMessage(message.text()));
    });
    page.on("pageerror", (error) => {
      if (activeProbe) activeProbe.pageErrors.push(safeMessage(error.message));
    });
    page.on("response", (response) => {
      const request = response.request();
      const url = new URL(response.url());
      const isSupabaseLogin = url.pathname.includes("/auth/v1/token") && request.method() === "POST";
      const isAdminLogin = url.pathname === "/api/auth/admin" && request.method() === "POST";
      if (!isSupabaseLogin && !isAdminLogin) return;
      responseTasks.push((async () => {
        const item = { endpoint: url.origin + url.pathname, status: response.status(), message: null };
        if (!response.ok()) {
          try {
            const body = await response.json();
            item.message = safeMessage(body.msg || body.message || body.error_description || body.error || "Respons gagal tanpa pesan.");
          } catch { item.message = "Respons gagal, body bukan JSON yang dapat dibaca."; }
        }
        authResponses.push(item);
      })());
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const isSupabaseLogin = url.pathname.includes("/auth/v1/token") && request.method() === "POST";
      const isAdminLogin = url.pathname === "/api/auth/admin" && request.method() === "POST";
      if (isSupabaseLogin || isAdminLogin) {
        authRequestFailures.push({ endpoint: url.origin + url.pathname, error: safeMessage(request.failure()?.errorText) });
      }
    });

    const loginProbe = { requests: [], consoleErrors: [], pageErrors: [] };
    activeProbe = loginProbe;
    await page.goto(`${baseUrl}/admin/masuk`, { waitUntil: "domcontentloaded", timeout: 12000 });
    const emailInput = page.getByLabel("Email Admin");
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(email);
    await passwordInput.fill(password);
    // Check controlled input values without exposing their contents.
    const emailLength = (await emailInput.inputValue()).length;
    const passwordLength = (await passwordInput.inputValue()).length;
    if (emailLength !== email.length || passwordLength !== password.length) {
      console.error("LOGIN_GAGAL: panjang nilai input tidak cocok dengan nilai sumber.");
      await context.close();
      await browser.close();
      process.exit(3);
    }

    const loginDeadline = Date.now() + 20_000;
    const loginTimeLeft = () => Math.max(1, loginDeadline - Date.now());
    await page.getByRole("button", { name: /Masuk ke Panel Admin/ }).click();
    await page.waitForFunction(() => location.pathname === "/admin" || Boolean(document.querySelector('[role="alert"]')), { timeout: loginTimeLeft() }).catch(() => {});
    let landing = new URL(page.url());
    if (landing.pathname === "/admin") {
      try {
        await page.locator("main").getByRole("heading", { level: 1, name: "Dashboard Pengurus", exact: true })
          .waitFor({ state: "visible", timeout: loginTimeLeft() });
        await page.waitForFunction(() => !/\bMemuat\b/i.test(document.body.innerText), null, { timeout: loginTimeLeft() });
      } catch { /* Report the still-loading dashboard and its pending/failed requests below. */ }
    }
    await page.waitForTimeout(200);
    await Promise.all(responseTasks);
    landing = new URL(page.url());
    const firstScreen = await page.locator("body").innerText().catch(() => "");
    const loginDashboardIncomplete = landing.pathname === "/admin"
      && (!firstScreen.includes("Dashboard Pengurus") || /\bMemuat\b/i.test(firstScreen));
    const loginFailed = landing.pathname !== "/admin" || !firstScreen.includes("Dashboard Pengurus") || loginDashboardIncomplete
      || /Dashboard belum dapat dibuka|Sesi admin tidak ditemukan|Sesi admin sudah berakhir/i.test(firstScreen);
    if (loginFailed) {
      const uiError = await page.locator('[role="alert"]').first().innerText().catch(() => "");
      const responseSummary = authResponses.length
        ? authResponses.map((item) => `${item.endpoint} HTTP ${item.status}${item.message ? ` — ${safeMessage(item.message)}` : ""}`).join(" | ")
        : "Tidak ada respons HTTP login yang tertangkap.";
      const failureSummary = authRequestFailures.length
        ? authRequestFailures.map((item) => `${item.endpoint} gagal jaringan: ${item.error || "tanpa detail"}`).join(" | ")
        : "";
      console.error(`LOGIN_GAGAL: ${responseSummary}${failureSummary ? ` | ${failureSummary}` : ""}${uiError ? ` | Pesan UI: ${safeMessage(uiError)}` : ""}`);
      if (loginDashboardIncomplete) {
        console.error(`DASHBOARD_TIDAK_MEMUAT: pending_or_failed_requests=${JSON.stringify(networkIssues(loginProbe))} console_errors=${JSON.stringify(loginProbe.consoleErrors)}`);
      }
      await context.close();
      await browser.close();
      process.exit(3);
    }
    await context.storageState({ path: storageStatePath });
    activeProbe = null;
    console.log(`LOGIN_OK URL=${landing.pathname} dashboardTextVisible=true EMAIL_LENGTH=${emailLength} PASSWORD_LENGTH=${passwordLength}`);
    console.log(`LOGIN_HTTP ${authResponses.map((item) => `${item.endpoint}=${item.status}`).join(" | ") || "request login tidak tertangkap"}`);

    const results = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const tab of routes) {
        const { route, heading: expectedHeading } = tab;
        const tabStartedAt = Date.now();
        const tabTimeoutMs = 20_000;
        let responseStatus = null;
        let navigationError = null;
        const probe = { requests: [], consoleErrors: [], pageErrors: [] };
        activeProbe = probe;
        const remainingMs = () => Math.max(1, tabTimeoutMs - (Date.now() - tabStartedAt));
        try {
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: remainingMs() });
          responseStatus = response?.status() ?? null;
        } catch (error) { navigationError = safeMessage(error.message); }

        let renderReady = false;
        let renderTimeout = false;
        if (!navigationError) {
          try {
            await page.locator("main").getByRole("heading", { level: 1, name: expectedHeading, exact: true })
              .waitFor({ state: "visible", timeout: remainingMs() });
            await page.waitForFunction(() => !/\bMemuat\b/i.test(document.body.innerText), null, { timeout: remainingMs() });
            renderReady = true;
          } catch {
            renderTimeout = Date.now() - tabStartedAt >= tabTimeoutMs - 100;
          }
        }

        const uniqueNetworkIssues = networkIssues(probe);
        if (renderReady) await page.waitForTimeout(500);

        let check = {};
        try {
          check = await page.evaluate(() => {
            const text = document.body.innerText || "";
            const width = innerWidth;
            const documentWidth = document.documentElement.scrollWidth;
            const bodyWidth = document.body.scrollWidth;
            const errorScreen = /Dashboard belum dapat dibuka|Sesi admin tidak ditemukan|Sesi admin sudah berakhir/i.test(text);
            return {
              landedAt: location.pathname + location.search,
              title: document.title,
              heading: document.querySelector("h1")?.innerText?.trim() || document.querySelector("h2")?.innerText?.trim() || "",
              viewportWidth: width,
              documentWidth,
              bodyWidth,
              horizontalOverflow: documentWidth > width || bodyWidth > width,
              errorScreen,
              errorMessage: errorScreen ? (text.match(/Sesi admin[^\n]*|Dashboard belum dapat dibuka[^\n]*/i)?.[0] || "Layar error admin") : null,
            };
          });
        } catch (error) { check = { checkError: safeMessage(error.message) }; }

        const screenshot = `admin-auth-${routeSlug(route)}-${viewport.width}x${viewport.height}.png`;
        try { await page.screenshot({ path: path.join(outputDir, screenshot), animations: "disabled" }); }
        catch (error) { navigationError ||= `Screenshot gagal: ${safeMessage(error.message)}`; }
        const redirectedToLogin = check.landedAt?.startsWith("/admin/masuk");
        const failed = Boolean(
          navigationError || renderTimeout || !renderReady || check.checkError || check.errorScreen
          || redirectedToLogin || !check.landedAt?.startsWith("/admin?tab=") || responseStatus !== 200
        );
        results.push({
          route, expectedHeading, viewport, responseStatus, screenshot, navigationError,
          renderReady, renderTimeout, redirectedToLogin, pendingOrFailedRequests: uniqueNetworkIssues,
          pageErrors: probe.pageErrors, consoleErrors: probe.consoleErrors, failed, ...check,
        });
        console.log(`Admin viewport ${viewport.width}: ${route} ${failed ? "GAGAL" : "OK"}`);
        if (!renderReady) {
          console.log(`  PENDING_OR_FAILED ${JSON.stringify(uniqueNetworkIssues)} CONSOLE_ERRORS ${JSON.stringify(probe.consoleErrors)}`);
        }
        activeProbe = null;
      }
    }

    const resultPath = path.join(outputDir, "admin-auth-results.json");
    fs.writeFileSync(resultPath, JSON.stringify({
      baseUrl, capturedAt: new Date().toISOString(), loginRoute: "/admin/masuk",
      credentialLengths: { email: emailLength, password: passwordLength },
      loginHttp: authResponses,
      viewports, routes, storageStatePath: ".playwright-auth/admin.storageState.json", results,
    }, null, 2));
    console.log(`HASIL ${resultPath}`);
    console.log(`ADMIN_TAB_CHECKS ${results.length}; GAGAL ${results.filter((item) => item.failed).length}; OVERFLOW ${results.filter((item) => item.horizontalOverflow).length}`);
    await context.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
})().catch((error) => {
  console.error(`LOGIN_GAGAL: ${safeMessage(error.message)}`);
  process.exitCode = 1;
});

