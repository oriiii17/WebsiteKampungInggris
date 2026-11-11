import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:3100';
const out = { steps: [], errors: [], console: [] };
function log(s){ out.steps.push(s); console.log(s); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if(m.type()==='error') out.console.push('console:'+m.text()); });
  page.on('pageerror', e => out.console.push('pageerror:'+e.message));
  page.on('requestfailed', r => out.console.push('reqfail:'+r.url()+':'+(r.failure()?.errorText||'')));

  try {
    // (a) Admin host kuis
    log('A:start admin login');
    await page.goto(BASE+'/admin/login', { waitUntil: 'networkidle' });
    // try dev credentials form fields
    await page.fill('input[type="email"], input[name="email"]', 'dev@kampungsapen.id').catch(()=>{});
    await page.fill('input[type="password"], input[name="password"]', 'devsapen2026').catch(()=>{});
    await page.click('button[type="submit"]').catch(()=>{});
    await page.waitForTimeout(2500);
    log('A:url after login '+page.url());
    await page.goto(BASE+'/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // click Host Kuis / Game tab
    const hostTab = page.getByRole('button', { name: /Host Kuis/i }).first();
    await hostTab.click({ timeout: 10000 });
    await page.waitForTimeout(800);
    // create session
    const createBtn = page.getByRole('button', { name: /Buat Sesi|Dapatkan PIN/i }).first();
    await createBtn.click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    const bodyText = await page.locator('body').innerText();
    const pinMatch = bodyText.match(/\b(\d{6})\b/);
    if(!pinMatch) throw new Error('PIN not found in admin page: '+bodyText.slice(0,400));
    const pin = pinMatch[1];
    log('A:PIN='+pin);
    // open host screen in new page
    const hostPage = await ctx.newPage();
    hostPage.on('console', m => { if(m.type()==='error') out.console.push('hostconsole:'+m.text()); });
    await hostPage.goto(BASE+'/game/host/'+pin, { waitUntil: 'networkidle' });
    await hostPage.waitForTimeout(2000);
    // participant join via UI
    const playerPage = await ctx.newPage();
    playerPage.on('console', m => { if(m.type()==='error') out.console.push('playerconsole:'+m.text()); });
    await playerPage.goto(BASE+'/game/join?pin='+pin, { waitUntil: 'networkidle' });
    await playerPage.waitForTimeout(1000);
    await playerPage.fill('input[placeholder*="849201"], input[inputmode="numeric"], input[type="text"]', pin).catch(()=>{});
    // name field: second text input or by placeholder
    const nameInput = playerPage.locator('input[placeholder*="Budi"]');
    await nameInput.fill('Budi E2E');
    const submitJoin = playerPage.getByRole('button', { name: /Mulai Masuk Kuis/i });
    await submitJoin.click();
    await playerPage.waitForTimeout(3000);
    log('A:player url '+playerPage.url());
    const joinErr = await playerPage.locator('text=/Gagal|error|harus|salah/i').first().textContent().catch(()=>null);
    if(joinErr && !/PIN/i.test(joinErr)==false) {}
    if(playerPage.url().includes('/game/play/')) log('A:JOIN_OK name=Budi E2E'); else { log('A:JOIN_FAIL '+playerPage.url()); out.errors.push('join fail '+(joinErr||'')); }
    // host start game
    await hostPage.bringToFront();
    const startBtn = hostPage.getByRole('button', { name: /Mulai|Start|Lanjut/i }).first();
    if(await startBtn.isVisible().catch(()=>false)) { await startBtn.click(); log('A:host start clicked'); }
    await hostPage.waitForTimeout(2500);
    // player answer if options visible
    await playerPage.bringToFront();
    const optBtn = playerPage.locator('button').filter({ hasText: /^(A|B|C|D)$|^/ }).first();
    const opts = playerPage.locator('button:has-text("A."), button:has-text("B."), button:has-text("C."), [data-option], .option, button').all ? null : null;
    // generic: click any answer-like button inside play
    const answerBtn = playerPage.locator('button').nth(0);
    // better: find buttons in grid
    const choiceButtons = await playerPage.locator('main button, [class*="option"] button, button').allTextContents().catch(()=>[]);
    log('A:player buttons sample '+JSON.stringify(choiceButtons.slice(0,8)));
    const candidates = await playerPage.locator('button').all();
    let answered=false;
    for(const b of candidates){ const t=(await b.textContent().catch(()=>''))||''; if(t.trim().length>0 && t.trim().length<120 && !/keluar|kembali|menu/i.test(t) && await b.isVisible().catch(()=>false)){ try{ await b.click({timeout:1000}); answered=true; log('A:clicked answer '+t.slice(0,30)); break;}catch{} } }
    await playerPage.waitForTimeout(1500);
    // host reveal/next to progress
    await hostPage.bringToFront();
    for(let i=0;i<3;i++){
      const btns = await hostPage.locator('button').all();
      for(const b of btns){ const t=((await b.textContent().catch(()=>''))||'').trim(); if(/tampilkan|reveal|jawaban|lanjut|next|soal berikut|podium|selesai/i.test(t) && await b.isVisible().catch(()=>false)){ try{ await b.click({timeout:1000}); log('A:host action '+t); await hostPage.waitForTimeout(1500);}catch{} } }
    }
    await hostPage.waitForTimeout(1500);
    const hostText = await hostPage.locator('body').innerText().catch(()=>'');
    const playerText = await playerPage.locator('body').innerText().catch(()=>'');
    log('A:hostHasScore='+/skor|Budi E2E|peserta/i.test(hostText)+' hostHasDist='+/(A|B|C|D)/.test(hostText));
    log('A:playerHasResult='+/benar|salah|poin|podium|skor/i.test(playerText));
    out.flowA = { pin, playerUrl: playerPage.url(), hostScore:/skor|Budi E2E/i.test(hostText), hostDist:/Distribusi|jawaban/i.test(hostText)||/[ABCD]/.test(hostText), playerResult:/benar|salah|poin|podium/i.test(playerText), hostSnippet: hostText.slice(0,600), playerSnippet: playerText.slice(0,600) };

  } catch(e){ out.errors.push('A:'+e.message); log('A:ERR '+e.message); }

  try {
    // (c) Login warga -> Kelas -> Bab -> Flipbook -> Logout
    log('C:start');
    const u = await ctx.newPage();
    await u.goto(BASE+'/masuk', { waitUntil: 'networkidle' });
    await u.waitForTimeout(1000);
    // fill warga form
    await u.fill('input[placeholder*="Budi"]', 'Tester E2E').catch(()=>{});
    await u.fill('input[placeholder*="QTU"]', 'QTU-OP3').catch(()=>{});
    await u.click('button:has-text("Masuk ke Ruang Belajar")').catch(()=>{});
    await u.waitForTimeout(3000);
    log('C:after login '+u.url());
    await u.goto(BASE+'/kelas/conversation-starter', { waitUntil: 'networkidle' });
    await u.waitForTimeout(1500);
    // open bab 1
    const babLink = u.locator('a:has-text("Buka Modul"), a:has-text("Bab 1")').first();
    if(await babLink.isVisible().catch(()=>false)) await babLink.click(); else await u.goto(BASE+'/kelas/conversation-starter/modul/cm-conv-1');
    await u.waitForTimeout(2000);
    // if locked, enter class code SAPEN-CONV
    const codeInput = u.locator('input[placeholder*="kode akses"], input[placeholder*="Kode akses"]').first();
    if(await codeInput.isVisible().catch(()=>false)){
      await codeInput.fill('SAPEN-CONV');
      await u.click('button:has-text("Masukkan Kode Akses")');
      await u.waitForTimeout(2500);
      log('C:entered class code SAPEN-CONV');
    }
    await u.waitForTimeout(2000);
    const mText = await u.locator('body').innerText().catch(()=>'');
    const hasBreadcrumb = /Kelas.*Bab|Kelas ›|Breadcrumb/i.test(mText) || await u.locator('nav[aria-label="Breadcrumb"]').count()>0;
    const hasDaftarBab = /Daftar Bab/i.test(mText);
    const hasNav = /Bab Sebelumnya|Bab Berikutnya|Bab terakhir/i.test(mText);
    const hasDl = await u.locator('a:has-text("Download"), button:has-text("Download")').count()>0 || /Download/i.test(mText);
    const hasZoom = /Zoom|%/.test(mText) || await u.locator('button[title*="Zoom"]').count()>0;
    const hasFs = await u.locator('button:has-text("Fullscreen")').count()>0 || /Fullscreen/i.test(mText);
    const hasCanvas = await u.locator('canvas').count()>0;
    log(`C:breadcrumb=${hasBreadcrumb} daftar=${hasDaftarBab} nav=${hasNav} dl=${hasDl} zoom=${hasZoom} fs=${hasFs} canvas=${hasCanvas}`);
    // wait for first page render
    await u.waitForTimeout(3000);
    const canvas2 = await u.locator('canvas').count();
    log('C:canvas after wait '+canvas2);
    // logout via avatar
    const avatarBtn = u.locator('button[aria-label="Menu akun"], button:has(span.rounded-full)').first();
    if(await avatarBtn.isVisible().catch(()=>false)) { await avatarBtn.click(); await u.waitForTimeout(600); }
    const logoutBtn = u.locator('button:has-text("Log Out"), button:has-text("Keluar")').first();
    if(await logoutBtn.isVisible().catch(()=>false)) { await logoutBtn.click(); await u.waitForTimeout(2000); log('C:logout clicked'); }
    else { // try mobile/menu
      await u.goto(BASE+'/akun',{waitUntil:'networkidle'}); await u.waitForTimeout(1000);
      const lo = u.locator('button:has-text("Log Out"), button:has-text("Keluar")').first();
      if(await lo.isVisible().catch(()=>false)){ await lo.click(); await u.waitForTimeout(1500); log('C:logout via akun'); }
    }
    const afterUrl = u.url(); log('C:after logout '+afterUrl);
    out.flowC = { breadcrumb:hasBreadcrumb, daftarBab:hasDaftarBab, nav:hasNav, download:hasDl, zoom:hasZoom, fullscreen:hasFs, canvas:canvas2>0, logoutUrl: afterUrl };
  } catch(e){ out.errors.push('C:'+e.message); log('C:ERR '+e.message); }

  fs.writeFileSync('e2e_result.json', JSON.stringify(out,null,2));
  console.log('DONE');
  await browser.close();
})();
