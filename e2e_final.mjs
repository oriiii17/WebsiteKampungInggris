import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:3100';
const res = { ok:false, pdf:'test-flipbook-4hal.pdf (4 halaman, disalin ke .data/private-pages/.../cm-conv-1/materi-uji-flipbook.pdf, terpasang di cm-conv-1)', join:null, flowA:null, flowB:null, flowC:null, errors:[] };
const log = (m)=>console.log('[E2E]', m);
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  const ctx = await browser.newContext({ viewport:{width:1366,height:900}, locale:'id-ID' });
  try{
    // --- Flow A & B ---
    const admin = await ctx.newPage();
    await admin.goto(BASE+'/admin/login',{waitUntil:'domcontentloaded',timeout:60000});
    await admin.locator('input[type="email"]').fill('dev@kampungsapen.id');
    await admin.locator('input[type="password"]').fill('devsapen2026');
    await admin.locator('button:has-text("Masuk ke Panel Admin")').click();
    await admin.waitForURL(u=>u.toString().includes('/admin') && !u.toString().includes('/login'),{timeout:30000});
    log('admin logged in '+admin.url());
    // sidebar button "Host Kuis / Game"
    const tab = admin.locator('button:has-text("Host Kuis / Game"), button:has-text("Host Kuis")').first();
    await tab.waitFor({state:'visible', timeout:15000});
    await tab.click();
    await admin.locator('button:has-text("Buat Sesi")').first().click();
    await admin.locator('text=/^\\d{6}$/').first().waitFor({state:'visible', timeout:20000});
    const pin = ((await admin.locator('p:has-text(/^[0-9]{6}$/), .font-mono').filter({hasText:/^\d{6}$/}).first().textContent().catch(()=>''))||'').trim() || ((await admin.locator('text=/^\\d{6}$/').first().textContent())||'').trim();
    log('PIN='+pin);
    if(!/^\d{6}$/.test(pin)) throw new Error('PIN invalid '+pin);

    const host = await ctx.newPage();
    await host.goto(BASE+'/game/host/'+pin,{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(1500);
    const player = await ctx.newPage();
    await player.goto(BASE+'/game/join?pin='+pin,{waitUntil:'domcontentloaded',timeout:60000});
    await player.locator('input[inputmode="numeric"]').fill(pin);
    await player.locator('input[placeholder*="Budi"]').fill('Budi E2E');
    await player.locator('button:has-text("Mulai Masuk Kuis")').click();
    await player.waitForURL(u=>u.toString().includes('/game/play/'+pin),{timeout:20000});
    log('JOIN_OK '+player.url());
    res.join = {ok:true, pin, name:'Budi E2E', url:player.url()};
    await sleep(1500);
    const hostLobby = await host.locator('body').innerText();
    const sees = /Budi E2E/i.test(hostLobby);
    log('host sees Budi='+sees);

    // start
    const startBtn = host.locator('button').filter({hasText:/Mulai Kuis/i}).first();
    if(await startBtn.isVisible().catch(()=>false)) await startBtn.click();
    await sleep(2500);

    const clickPlayerOption = async()=>{
      const btns = await player.locator('main button, button').all();
      for(const b of btns){
        if(!(await b.isVisible().catch(()=>false))) continue;
        const box = await b.boundingBox().catch(()=>null);
        const t=((await b.textContent().catch(()=>''))||'').trim();
        if(box && box.height>=80 && t && !/keluar|kembali|menu/i.test(t)) { await b.click().catch(()=>{}); return t; }
      }
      return null;
    };
    const clickHost = async(regex)=>{
      const b = host.locator('button').filter({hasText:regex}).first();
      if(await b.isVisible().catch(()=>false)){ await b.click().catch(()=>{}); return true; }
      return false;
    };

    await clickPlayerOption();
    await sleep(1200);
    await clickHost(/Tampilkan Jawaban/i);
    await sleep(1800);
    let hostText = await host.locator('body').innerText();
    let playerText = await player.locator('body').innerText();
    const playerFeedback = /Benar|Salah|poin|\+/i.test(playerText);
    const hostDist = /Distribusi|jawaban|A\s|B\s|C\s|D\s/i.test(hostText) || /Budi E2E/i.test(hostText);
    log('feedback='+playerFeedback+' dist='+hostDist);

    for(let i=0;i<10;i++){
      const h = await host.locator('body').innerText();
      const p = await player.locator('body').innerText();
      if(/podium|Pemenang|Juara|peringkat/i.test(h) && /podium|Juara|Peringkat|skor|selamat/i.test(p.toLowerCase())) break;
      if(await clickHost(/Soal Berikutnya|Lihat Pemenang|Podium|Lanjut/i)) { await sleep(1800); await clickPlayerOption(); await sleep(800); await clickHost(/Tampilkan Jawaban/i); await sleep(1500); continue; }
      if(await clickHost(/Tampilkan Jawaban/i)) { await sleep(1500); continue; }
      await sleep(1000);
    }
    await sleep(1500);
    hostText = await host.locator('body').innerText();
    playerText = await player.locator('body').innerText();
    const hostScore = /Budi E2E/i.test(hostText) && /skor|Papan Skor|peringkat|Podium|Juara/i.test(hostText);
    const podiumH = /podium|Juara|Peringkat/i.test(hostText);
    const podiumP = /podium|Juara|Peringkat|Skor Akhir|selamat/i.test(playerText);
    res.flowA = {pin, joinOk:true, name:'Budi E2E', answered:true};
    res.flowB = {hostSeesParticipant:sees, hostLiveScoreAndDistribution: hostScore && hostDist, playerCorrectWrongAndPodium: playerFeedback && podiumP, hostPodium: podiumH, hostSnippet: hostText.slice(0,400), playerSnippet: playerText.slice(0,400)};
    log('B '+JSON.stringify({sees,hostScore,hostDist,playerFeedback,podiumH,podiumP}));

    // --- Flow C ---
    const u = await ctx.newPage();
    await u.goto(BASE+'/masuk?tab=warga',{waitUntil:'domcontentloaded',timeout:60000});
    await u.locator('input[placeholder*="Budi"]').fill('Tester Flipbook');
    await u.locator('input[placeholder*="QTU"]').fill('QTU-OP3');
    await u.locator('button:has-text("Masuk ke Ruang Belajar")').click();
    await sleep(3500);
    log('C login url '+u.url());
    await u.goto(BASE+'/kelas/conversation-starter',{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(1200);
    const bab1 = u.locator('a:has-text("Buka Modul"), a:has-text("Bab 1")').first();
    if(await bab1.isVisible().catch(()=>false)) await bab1.click();
    else await u.goto(BASE+'/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded'});
    await sleep(2500);
    const codeIn = u.locator('input[placeholder*="kode akses"], input[placeholder*="Kode akses"]');
    if(await codeIn.first().isVisible().catch(()=>false)){
      await codeIn.first().fill('SAPEN-CONV');
      await u.locator('button:has-text("Masukkan Kode Akses")').click();
      await sleep(3000);
      log('C unlocked SAPEN-CONV');
    }
    const t0=Date.now();
    let canvasOk=false;
    for(let i=0;i<30;i++){ if(await u.locator('canvas').count()>0){ canvasOk=true; break; } await sleep(500); }
    const firstMs = Date.now()-t0;
    const body = await u.locator('body').innerText();
    const breadcrumb = await u.locator('nav[aria-label="Breadcrumb"]').count()>0;
    const daftarBab = /Daftar Bab/i.test(body);
    const nav = /Bab Sebelumnya|Bab Berikutnya|Bab terakhir|Awal kelas/i.test(body);
    const dl = u.locator('a,button').filter({hasText:/Download/i}).first();
    const dlOk = await dl.isVisible().catch(()=>false);
    const dlHref = dlOk ? await dl.getAttribute('href').catch(()=> '') : '';
    if(dlOk) await dl.click({timeout:2000}).catch(()=>{});
    const zoomIn = u.locator('button[title*="Zoom In"]').first();
    let zoomOk=false;
    if(await zoomIn.isVisible().catch(()=>false)){ await zoomIn.click(); await sleep(300); await u.locator('button[title*="Zoom Out"]').first().click().catch(()=>{}); zoomOk=true; }
    const fs = u.locator('button:has-text("Fullscreen")').first();
    let fsOk=false;
    if(await fs.isVisible().catch(()=>false)){ await fs.click(); await sleep(600); fsOk=true; await u.keyboard.press('Escape').catch(()=>{}); await sleep(300); }
    log(`C struct bc=${breadcrumb} daftar=${daftarBab} nav=${nav} canvas=${canvasOk} ms=${firstMs} dl=${dlOk} zoom=${zoomOk} fs=${fsOk}`);

    // logout
    let logoutOk=false;
    const avatar = u.locator('button[aria-label="Menu akun"]').first();
    if(await avatar.isVisible().catch(()=>false)){ await avatar.click(); await sleep(600); }
    else { const any = u.locator('button:has(span.flex.h-8.w-8)').first(); if(await any.isVisible().catch(()=>false)){ await any.click(); await sleep(600);} }
    let lo = u.locator('button:has-text("Log Out")').first();
    if(await lo.isVisible().catch(()=>false)){ await lo.click(); await sleep(2500); logoutOk=true; }
    else { await u.goto(BASE+'/akun',{waitUntil:'domcontentloaded'}); await sleep(1000); lo = u.locator('button:has-text("Log Out"), button:has-text("Keluar")').first(); if(await lo.isVisible().catch(()=>false)){ await lo.click(); await sleep(2500); logoutOk=true; } }
    // verify logged out: session null
    let sessNull=false;
    try{ const s = await u.evaluate(async()=>{ const r=await fetch('/api/auth/session'); return r.json(); }); sessNull = !s.session; }catch{}
    log('C logout='+logoutOk+' sessionNull='+sessNull+' url='+u.url());

    res.flowC = {breadcrumb, daftarBab, navPrevNext:nav, flipbookFirstPageFast: canvasOk && firstMs < 15000, canvasOk, firstPageMs:firstMs, downloadOk:dlOk, zoomOk, fullscreenOk:fsOk, logoutOk: logoutOk||sessNull, sessionNull:sessNull, downloadHref:dlHref, snippet: body.slice(0,350)};
  }catch(e){ res.errors.push(String(e.stack||e.message)); log('ERR '+e.message); }
  res.ok = res.errors.length===0 && res.join?.ok && res.flowB?.hostSeesParticipant && res.flowB?.hostLiveScoreAndDistribution && res.flowB?.playerCorrectWrongAndPodium && res.flowB?.hostPodium && res.flowC?.breadcrumb && res.flowC?.daftarBab && res.flowC?.navPrevNext && res.flowC?.flipbookFirstPageFast && res.flowC?.downloadOk && res.flowC?.zoomOk && res.flowC?.fullscreenOk && res.flowC?.logoutOk;
  fs.writeFileSync('e2e_result.json', JSON.stringify(res,null,2));
  console.log('RESULT_OK='+res.ok);
  console.log(JSON.stringify({join:res.join, A:res.flowA, B:{...res.flowB, hostSnippet:undefined, playerSnippet:undefined}, C:res.flowC, errors:res.errors}, null, 2));
  await browser.close();
  process.exit(res.ok?0:1);
})();
