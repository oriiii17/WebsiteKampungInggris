import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3100/', { waitUntil: 'domcontentloaded' });
  console.log(await page.title());
  await browser.close();
})();
