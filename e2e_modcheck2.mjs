import { chromium } from 'playwright';
(async()=>{
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const ctx = await browser.newContext({viewport:{width:1280,height:900}, locale:'id-ID'});
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:3100/admin/login',{waitUntil:'domcontentloaded',timeout:60000});
  await page.fill('input[type="email"]','dev@kampungsapen.id');
  await page.fill('input[type="password"]','devsapen2026');
  await page.click('button:has-text("Masuk ke Panel Admin")');
  await page.waitForURL(u=>u.toString().includes('/admin')&&!u.toString().includes('/login'),{timeout:30000});
  await page.goto('http://127.0.0.1:3100/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded',timeout:60000});
  const t0=Date.now();
  let canvas=false;
  for(let i=0;i<40;i++){ if(await page.locator('canvas').count()>0){canvas=true; break;} await page.waitForTimeout(500); }
  const ms=Date.now()-t0;
  const body=await page.locator('body').innerText().catch(()=> '');
  const dl=await page.locator('a:has-text("Download"),button:has-text("Download")').count();
  const zoom=await page.locator('button[title*="Zoom"]').count();
  const fs=await page.locator('button:has-text("Fullscreen")').count();
  console.log(JSON.stringify({ms,canvas,bc:await page.locator('nav[aria-label="Breadcrumb"]').count()>0,daftar:/Daftar Bab/.test(body),nav:/Bab Sebelumnya|Bab Berikutnya|Bab terakhir|Awal kelas/.test(body),dl,zoom,fs}));
  await browser.close();
})();
