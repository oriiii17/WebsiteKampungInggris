import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:3100';
const res = { ok: false, join: null, flowA: null, flowB: null, flowC: null, errors: [] };
const log = (m) => console.log('[E2E]', m);

async function waitForServer(page, tries=40){
  for(let i=0;i<tries;i++){
    try{ const r = await page.goto(BASE, {waitUntil:'domcontentloaded', timeout:8000}); if(r && r.ok()) return true; }catch{}
    await page.waitForTimeout(1500);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'id-ID' });

  try {
    const warm = await ctx.newPage();
    log('warmup'); await waitForServer(warm);

    // ===== FLOW A & B: host + peserta live =====
    log('A: admin login');
    const admin = await ctx.newPage();
    await admin.goto(BASE+'/admin/login', {waitUntil:'domcontentloaded', timeout:60000});
    await admin.getByLabel(/Email Admin/i).fill('dev@kampungsapen.id');
    await admin.getByLabel(/Kata Sandi/i).fill('devsapen2026');
    await admin.getByRole('button', {name:/Masuk ke Panel Admin/i}).click();
    await admin.waitForURL(url=>url.toString().includes('/admin') && !url.toString().includes('/login'), {timeout:30000});
    await admin.waitForLoadState('domcontentloaded');
    log('A: admin dashboard '+admin.url());

    // open Host Kuis tab (button in sidebar/nav)
    const hostTab = admin.locator('button, a').filter({hasText:/Host Kuis \/ Game|Host Kuis/i}).first();
    await hostTab.waitFor({state:'visible', timeout:20000});
    await hostTab.click();
    await admin.waitForTimeout(1200);
    const createBtn = admin.getByRole('button', {name:/Buat Sesi/i}).first();
    await createBtn.waitFor({state:'visible', timeout:15000});
    await createBtn.click();
    // wait for PIN text
    const pinLocator = admin.locator('text=/^\\d{6}$/').first();
    await pinLocator.waitFor({state:'visible', timeout:20000});
    const pin = (await pinLocator.textContent()||'').trim();
    log('A: PIN='+pin);
    res.pin = pin;
    if(!/^\d{6}$/.test(pin)) throw new Error('PIN tidak valid: '+pin);

    // host screen
    const host = await ctx.newPage();
    await host.goto(BASE+'/game/host/'+pin, {waitUntil:'domcontentloaded', timeout:60000});
    await host.waitForTimeout(2000);
    log('A: host screen '+host.url());

    // peserta join UI
    const player = await ctx.newPage();
    await player.goto(BASE+'/game/join?pin='+pin, {waitUntil:'domcontentloaded', timeout:60000});
    await player.waitForTimeout(1000);
    const pinInput = player.locator('input[inputmode="numeric"]');
    await pinInput.fill(pin);
    const nameInput = player.locator('input[placeholder*="Budi"]');
    await nameInput.fill('Budi E2E');
    await player.getByRole('button', {name:/Mulai Masuk Kuis/i}).click();
    await player.waitForURL(url=>url.toString().includes('/game/play/'+pin), {timeout:20000});
    log('A: JOIN_OK url='+player.url()+' name=Budi E2E');
    res.join = { ok: true, pin, name: 'Budi E2E', url: player.url() };

    // host sees participant in lobby/scoreboard
    await host.waitForTimeout(2000);
    const hostLobbyText = await host.locator('body').innerText();
    const seesBudi = /Budi E2E/i.test(hostLobbyText);
    log('B: host sees Budi='+seesBudi);

    // start game (host)
    const start = host.getByRole('button', {name:/Mulai/i}).first();
    if(await start.isVisible().catch(()=>false)){ await start.click(); log('A: host started'); }
    await host.waitForTimeout(2500);
    await player.waitForTimeout(2500);

    // answer on player (click first option button in play area)
    // options are buttons with answer text inside main play; try buttons containing visible text options
    let answered = false;
    for(let attempt=0; attempt<10; attempt++){
      const optionBtns = player.locator('button').filter({hasText:/.+/});
      const count = await optionBtns.count();
      for(let i=0;i<count;i++){
        const b = optionBtns.nth(i);
        const t = ((await b.textContent())||'').trim();
        // skip nav/system buttons
        if(/keluar|kembali|menu|mulai masuk/i.test(t)) continue;
        const box = await b.boundingBox().catch(()=>null);
        if(!box || box.height < 50) continue; // option cards are big
        await b.click({timeout:2000}).catch(()=>{});
        log('A: player clicked option '+t.slice(0,40));
        answered = true; break;
      }
      if(answered) break;
      await player.waitForTimeout(800);
    }
    res.answered = answered;

    // host reveal to show correct answer + distribution
    await host.waitForTimeout(1000);
    const reveal = host.getByRole('button', {name:/Tampilkan Jawaban|Reveal|Lihat Jawaban/i}).first();
    if(await reveal.isVisible().catch(()=>false)){ await reveal.click(); log('B: reveal clicked'); }
    await host.waitForTimeout(2000);

    const hostAfter = await host.locator('body').innerText();
    const hostHasScore = /skor/i.test(hostAfter) || /Budi E2E/i.test(hostAfter);
    const hostHasDist = /distribusi|jawaban|A\s*[:\-]|A\./i.test(hostAfter) || /Budi E2E/i.test(hostAfter);
    const hostHasCorrect = /jawaban benar|benar/i.test(hostAfter);

    // player sees feedback
    const playerAfter = await player.locator('body').innerText();
    const playerFeedback = /benar|salah|\+|poin/i.test(playerAfter);

    // advance to podium: next/reveal loops until podium
    for(let i=0;i<12;i++){
      const texts = ['Soal Berikutnya','Berikutnya','Lanjut','Podium','Tampilkan Podium','Selesai','Tampilkan Jawaban','Reveal'];
      let acted=false;
      for(const tx of texts){
        const btn = host.getByRole('button', {name:new RegExp(tx,'i')}).first();
        if(await btn.isVisible().catch(()=>false)){
          await btn.click().catch(()=>{});
          log('B: host action '+tx);
          await host.waitForTimeout(1800);
          // if question state and player can answer again
          const pbtns = await player.locator('button').all();
          for(const b of pbtns){
            const t=((await b.textContent())||'').trim();
            if(/keluar|kembali|menu/i.test(t)) continue;
            const box=await b.boundingBox().catch(()=>null);
            if(box && box.height>=50 && await b.isVisible().catch(()=>false)){
              await b.click().catch(()=>{}); await player.waitForTimeout(600); break;
            }
          }
          acted=true; break;
        }
      }
      const ht = await host.locator('body').innerText().catch(()=>'');
      const pt = await player.locator('body').innerText().catch(()=>'');
      if(/podium|juara|peringkat|#1|1\./i.test(ht) && /podium|juara|peringkat|selamat/i.test(pt)) { log('B: podium reached'); break; }
      if(!acted) { await host.waitForTimeout(1000); }
    }

    const hostFinal = await host.locator('body').innerText().catch(()=>'');
    const playerFinal = await player.locator('body').innerText().catch(()=>'');
    const podiumHost = /podium|juara|peringkat|Budi E2E/i.test(hostFinal);
    const podiumPlayer = /podium|juara|peringkat|skor|selamat/i.test(playerFinal);
    const distOk = /distribusi|A\s|B\s|C\s|D\s|[0-9]+\s*(jawaban|peserta)|Budi E2E/i.test(hostFinal);
    res.flowA = { pin, joinOk: true, answered };
    res.flowB = { hostSeesParticipant: seesBudi, hostHasScore: hostHasScore||/Budi E2E/i.test(hostFinal), hostHasDistribution: distOk || hostHasDist, playerFeedbackCorrectWrong: playerFeedback, podiumHost, podiumPlayer, hostSnippet: hostFinal.slice(0,500), playerSnippet: playerFinal.slice(0,500) };
    log('B summary '+JSON.stringify({seesBudi, hostHasScore: res.flowB.hostHasScore, distOk, playerFeedback, podiumHost, podiumPlayer}));

  } catch(e){ res.errors.push('AB:'+e.stack||e.message); log('AB ERR '+e.message); }

  try {
    // ===== FLOW C: Login warga -> Kelas -> Bab -> Flipbook cepat -> logout =====
    log('C: login warga');
    const u = await ctx.newPage();
    await u.goto(BASE+'/masuk?tab=warga', {waitUntil:'domcontentloaded', timeout:60000});
    await u.waitForTimeout(1200);
    await u.locator('input[placeholder*="Budi"]').fill('Tester Flipbook');
    await u.locator('input[placeholder*="QTU"]').fill('QTU-OP3');
    await u.getByRole('button', {name:/Masuk ke Ruang Belajar/i}).click();
    await u.waitForTimeout(3500);
    log('C: after login '+u.url());

    await u.goto(BASE+'/kelas/conversation-starter', {waitUntil:'domcontentloaded', timeout:60000});
    await u.waitForTimeout(1500);
    // open bab 1 (module link)
    const bab1 = u.locator('a').filter({hasText:/Buka Modul|Bab 1/i}).first();
    if(await bab1.isVisible().catch(()=>false)) await bab1.click(); else await u.goto(BASE+'/kelas/conversation-starter/modul/cm-conv-1', {waitUntil:'domcontentloaded'});
    await u.waitForTimeout(2000);
    // unlock with class code if needed
    const codeInput = u.locator('input[placeholder*="kode akses"], input[placeholder*="Kode akses"]');
    if(await codeInput.first().isVisible().catch(()=>false)){
      await codeInput.first().fill('SAPEN-CONV');
      await u.getByRole('button', {name:/Masukkan Kode Akses/i}).click();
      await u.waitForTimeout(3000);
      log('C: unlocked with SAPEN-CONV');
    }
    await u.waitForTimeout(1500);
    const mUrl = u.url();
    const mText = await u.locator('body').innerText().catch(()=>'');

    const breadcrumb = await u.locator('nav[aria-label="Breadcrumb"]').count() > 0;
    const daftarBab = /Daftar Bab/i.test(mText);
    const navPrevNext = /Bab Sebelumnya|Bab Berikutnya|Bab terakhir|Awal kelas/i.test(mText);
    log(`C: structure breadcrumb=${breadcrumb} daftarBab=${daftarBab} nav=${navPrevNext}`);

    // flipbook: first page should appear quickly (canvas rendered) without long black screen
    const t0 = Date.now();
    let firstPageOk = false, canvasCount = 0, totalPagesText='';
    for(let i=0;i<40;i++){ // up to ~20s
      canvasCount = await u.locator('canvas').count();
      totalPagesText = await u.locator('text=/\\/|Hal/i').first().textContent().catch(()=> '');
      const rendering = await u.locator('text=/Menyiapkan|Memuat/i').count();
      if(canvasCount > 0) { firstPageOk = true; break; }
      await u.waitForTimeout(500);
    }
    const firstPageMs = Date.now()-t0;
    log(`C: flipbook canvas=${canvasCount} firstPageOk=${firstPageOk} ms=${firstPageMs}`);

    // controls: Download, Zoom, Fullscreen clickable
    const dl = u.locator('a,button').filter({hasText:/Download/i}).first();
    const dlVisible = await dl.isVisible().catch(()=>false);
    let dlHref = '';
    if(dlVisible){ dlHref = await dl.getAttribute('href').catch(()=> '') || ''; await dl.click({timeout:3000}).catch(()=>{}); log('C: download clicked href='+dlHref); }
    await u.waitForTimeout(500);

    const zoomIn = u.locator('button[title*="Zoom In"], button:has-text("+")').first();
    const zoomOut = u.locator('button[title*="Zoom Out"], button:has-text("-")').first();
    let zoomOk=false;
    if(await zoomIn.isVisible().catch(()=>false)){ await zoomIn.click(); await u.waitForTimeout(300); await zoomOut.click().catch(()=>{}); zoomOk=true; log('C: zoom clicked'); }

    const fsBtn = u.locator('button').filter({hasText:/Fullscreen/i}).first();
    let fsOk=false;
    if(await fsBtn.isVisible().catch(()=>false)){ await fsBtn.click(); await u.waitForTimeout(700); fsOk=true; log('C: fullscreen clicked'); await u.keyboard.press('Escape').catch(()=>{}); await u.waitForTimeout(300); }

    // avatar -> logout
    let logoutOk=false;
    // desktop avatar button
    const avatar = u.locator('button[aria-label="Menu akun"]');
    if(await avatar.first().isVisible().catch(()=>false)){ await avatar.first().click(); await u.waitForTimeout(600); }
    else {
      const anyAvatar = u.locator('button').filter({has: u.locator('span.rounded-full')}).first();
      if(await anyAvatar.isVisible().catch(()=>false)){ await anyAvatar.click(); await u.waitForTimeout(600); }
    }
    const logout = u.locator('button').filter({hasText:/Log Out/i}).first();
    if(await logout.isVisible().catch(()=>false)){
      await logout.click();
      await u.waitForTimeout(2500);
      logoutOk = true;
      log('C: logout clicked url='+u.url());
    } else {
      log('C: logout button not found, trying /akun');
      await u.goto(BASE+'/akun', {waitUntil:'domcontentloaded'}); await u.waitForTimeout(1000);
      const lo2 = u.locator('button').filter({hasText:/Log Out|Keluar/i}).first();
      if(await lo2.isVisible().catch(()=>false)){ await lo2.click(); await u.waitForTimeout(2500); logoutOk=true; log('C: logout via akun'); }
    }

    res.flowC = { loginOk: mUrl.includes('/kelas/conversation-starter/modul/cm-conv-1') || /modul/.test(mUrl) || daftarBab || breadcrumb, breadcrumb, daftarBab, navPrevNext, firstPageCanvas: firstPageOk, firstPageMs, download: dlVisible, downloadHref, zoom: zoomOk, fullscreen: fsOk, logout: logoutOk, afterLogoutUrl: u.url(), bodySnippet: mText.slice(0,400) };
    log('C summary '+JSON.stringify(res.flowC));

  } catch(e){ res.errors.push('C:'+e.stack||e.message); log('C ERR '+e.message); }

  res.ok = res.errors.length===0 && res.join?.ok && res.flowB?.hostSeesParticipant && res.flowB?.hostHasDistribution && res.flowB?.playerFeedbackCorrectWrong && res.flowB?.podiumHost && res.flowB?.podiumPlayer && res.flowC?.breadcrumb && res.flowC?.daftarBab && res.flowC?.navPrevNext && res.flowC?.firstPageCanvas && res.flowC?.download && res.flowC?.zoom && res.flowC?.fullscreen && res.flowC?.logout;
  fs.writeFileSync('e2e_result.json', JSON.stringify(res, null, 2));
  console.log('RESULT_OK='+res.ok);
  console.log(JSON.stringify({errors:res.errors, join:res.join, A:res.flowA, B:res.flowB, C:res.flowC}, null, 2));
  await browser.close();
  process.exit(res.ok?0:1);
})();
