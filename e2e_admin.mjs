import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:3100/admin/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'dev@kampungsapen.id');
  await page.fill('input[type="password"]', 'devsapen2026');
  await page.click('button:has-text("Masuk ke Panel Admin")');
  await page.waitForTimeout(4000);
  console.log('URL', page.url());
  if(!page.url().includes('/admin/login')){
    await page.waitForTimeout(2000);
    const txt = await page.locator('body').innerText().catch(()=>'');
    console.log('hasHostTab', /Host Kuis/i.test(txt));
  } else {
    console.log(await page.locator('body').innerText().catch(()=>'').then(t=>t.slice(0,300)));
  }
  await browser.close();
})();
