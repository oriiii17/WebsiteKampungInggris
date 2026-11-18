const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const pages = ['/', '/kelas', '/games', '/sesi', '/tentang', '/masuk', '/admin/masuk'];
const widths = [360, 390, 768, 1440];
const out = path.resolve('docs/screenshots');
fs.mkdirSync(out, { recursive: true });

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
  catch (chromeError) {
    console.warn(`Chrome launch failed: ${chromeError.message}`);
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const results = [];
  for (const width of widths) for (const route of pages) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(async e => { errors.push(`navigation: ${e.message}`); });
    await page.screenshot({ path: path.join(out, `${route === '/' ? 'beranda' : route.slice(1).replaceAll('/', '-')}-${width}.png`), fullPage: true });
    const checks = await page.evaluate((width) => {
      const doc = document.documentElement;
      const body = document.body;
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      const visible = [...document.querySelectorAll('button, a[href]')].filter(el => {
        const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      });
      const short = visible.filter(el => el.getBoundingClientRect().height < 44).map(el => ({ tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0,60), height: Math.round(el.getBoundingClientRect().height) }));
      const nav = document.querySelector('header nav');
      const back = [...document.querySelectorAll('a,button')].filter(el => /kembali|back|←/i.test(`${el.innerText} ${el.getAttribute('aria-label')||''}`)).some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      return { scroll: Math.max(doc.scrollWidth, body.scrollWidth) <= doc.clientWidth, clientWidth: doc.clientWidth, scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth), footerBelowMain: !footer || !main || footer.getBoundingClientRect().top >= main.getBoundingClientRect().bottom - 2, short: width <= 390 ? short : [], fullNavbar: !!nav && nav.getBoundingClientRect().width > 0, backVisible: back, title: document.title };
    }, width);
    results.push({ route, width, ...checks, errors });
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'responsive-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some(r => !r.scroll || !r.footerBelowMain || r.short.length || ((!r.fullNavbar) && !r.backVisible))) process.exitCode = 1;
})();
