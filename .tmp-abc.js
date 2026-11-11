const pw=require('playwright');
const fs=require('fs');
const base='http://localhost:3101';
const out={steps:[], errors:[]};
function log(...a){ out.steps.push(a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')); console.log(...a); }
(async()=>{
  const browser=await pw.chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless:true});
  try{
    // ---- FLOW C: warga login -> kelas -> flipbook -> logout ----
    {
      const ctx=await browser.newContext({viewport:{width:390,height:844}});
      const page=await ctx.newPage();
      await page.goto(base+'/masuk?tab=warga',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForTimeout(1500);
      const inputs=await page.$$('input');
      await inputs[0].fill('Warga Bukti');
      await inputs[1].fill('QTU-OP3');
      await Promise.all([page.click('button[type="submit"]'), page.waitForTimeout(4000)]);
      log('C1 loginUrl', page.url());
      await page.goto(base+'/kelas/conversation-starter',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForTimeout(2000);
      const ktxt=await page.evaluate(()=>document.body.innerText);
      log('C2 kelas sapaan=',ktxt.includes('Sapaan'),'bab=',ktxt.includes('Bab'));
      await page.goto(base+'/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForTimeout(6000);
      const st=await page.evaluate(()=>({
        url:location.href,
        crumb: document.body.innerText.includes('Kelas') && document.body.innerText.includes('Conversation'),
        daftar: document.body.innerText.includes('Daftar Bab'),
        prevnext: document.body.innerText.includes('Sebelumnya') || document.body.innerText.includes('Berikutnya'),
        canvas: document.querySelectorAll('canvas').length,
        texts: Array.from(document.querySelectorAll('button,a')).map(e=>(e.textContent||e.title||e.getAttribute('aria-label')||'').trim()).filter(Boolean)
      }));
      log('C3 materi', JSON.stringify({crumb:st.crumb,daftar:st.daftar,prevnext:st.prevnext,canvas:st.canvas}));
      log('C3 controls', JSON.stringify(st.texts.filter(t=>/download|zoom|\+|\-|full|perbesar|kecil/i.test(t))));
      await page.screenshot({path:'proof-flowc-materi.png', fullPage:true});
      await page.evaluate(()=>{ try{ localStorage.setItem('sapen_last_quiz_name','Warga Bukti'); }catch{} });
      await page.goto(base+'/akun',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForTimeout(1500);
      await page.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/Log Out|Keluar/i.test(x.textContent||'')); if(b) b.click(); });
      await page.waitForTimeout(4000);
      log('C4 afterLogoutUrl', page.url());
      const nameAfter=await page.evaluate(()=>{ try{return localStorage.getItem('sapen_last_quiz_name');}catch(e){return 'err';} });
      log('C4 sapen_last_quiz_name', JSON.stringify(nameAfter));
      const sess=await page.request.get(base+'/api/auth/session');
      log('C4 session', await sess.text());
      await page.screenshot({path:'proof-flowc-logout.png', fullPage:false});
      await ctx.close();
    }
  }catch(e){ out.errors.push('flowC:'+e.message); console.error('FLOWC ERR',e); }
  try{
    // ---- FLOW A+B: admin host kuis live -> PIN -> peserta join & jawab -> host reveal/next -> podium ----
    // admin login
    const adminCtx=await browser.newContext({viewport:{width:1280,height:900}});
    const admin=await adminCtx.newPage();
    await admin.goto(base+'/admin/login',{waitUntil:'domcontentloaded',timeout:60000});
    await admin.waitForTimeout(1000);
    await admin.fill('input[type="email"]','dev@kampungsapen.id');
    await admin.fill('input[type="password"]','devsapen2026');
    await admin.click('button[type="submit"]');
    await admin.waitForTimeout(4000);
    log('A0 adminUrl', admin.url());
    // go host tab and select proof kuis live
    await admin.goto(base+'/admin?tab=games',{waitUntil:'domcontentloaded',timeout:60000});
    await admin.waitForTimeout(2500);
    await admin.screenshot({path:'proof-admin-games.png', fullPage:true});
    // select game "Bukti Kuis Live 1 Soal" in select/dropdown
    const pageTxt=await admin.evaluate(()=>document.body.innerText);
    log('A1 hasBuktiKuis', pageTxt.includes('Bukti Kuis Live 1 Soal'));
    // try select element
    const selects=await admin.$$('select');
    if(selects.length){ await selects[0].selectOption({label:'Bukti Kuis Live 1 Soal'}).catch(()=>{}); }
    await admin.waitForTimeout(500);
    // click create/start button
    await admin.evaluate(()=>{
      const bs=Array.from(document.querySelectorAll('button'));
      const b=bs.find(x=>/buat sesi|mulai|buka sesi|host/i.test(x.textContent||''));
      if(b) b.click();
    });
    await admin.waitForTimeout(5000);
    log('A2 hostUrl', admin.url());
    // extract pin from url or text
    let pin = (admin.url().match(/\/game\/host\/(\d{6})/)||[])[1];
    if(!pin){ pin = await admin.evaluate(()=>{ const m=document.body.innerText.match(/\b(\d{6})\b/); return m?m[1]:''; }); }
    log('A3 PIN', pin);
    await admin.screenshot({path:'proof-a-host-lobby.png', fullPage:true});
    if(pin){
      const pctx=await browser.newContext({viewport:{width:390,height:844}});
      const p=await pctx.newPage();
      await p.goto(base+'/game/join?pin='+pin,{waitUntil:'domcontentloaded',timeout:60000});
      await p.waitForTimeout(1500);
      const pinVal=await p.evaluate(()=>{ const i=document.querySelector('input[inputmode="numeric"], input[maxlength="6"]'); return i?i.value:''; });
      const nameI=await p.$$('input');
      // fill name (second input or by placeholder)
      if(nameI.length>=2) await nameI[1].fill('Peserta Bukti A'); else await nameI[0].fill('Peserta Bukti A');
      log('A4 join pinPrefill', pinVal);
      await p.click('button[type="submit"]');
      await p.waitForTimeout(4000);
      log('A4 playUrl', p.url(), 'has400=', (await p.evaluate(()=>document.body.innerText)).includes('400'));
      await p.screenshot({path:'proof-a-participant-joined.png', fullPage:true});
      // host start
      await admin.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/mulai/i.test(x.textContent||'') && !/buka sesi/i.test(x.textContent||'')); if(b) b.click(); });
      await admin.waitForTimeout(3000);
      await p.waitForTimeout(2000);
      log('A5 hostStatus', admin.url(), 'playUrl', p.url());
      await admin.screenshot({path:'proof-b-host-question.png', fullPage:true});
      await p.screenshot({path:'proof-a-participant-question.png', fullPage:true});
      // participant answer: click option B (index 1, correct for 2+2) or any button in grid
      await p.evaluate(()=>{
        const bs=Array.from(document.querySelectorAll('main button, button'));
        // prefer button containing '4'
        let b=bs.find(x=>/^\s*4\s*$/.test((x.textContent||'').replace(/[^0-9]/g,' ')) || (x.textContent||'').includes('4'));
        if(!b) b=bs.find(x=>x.querySelector('span') && !/mulai|kirim|submit/i.test(x.textContent||''));
        if(b) b.click();
      });
      await p.waitForTimeout(500);
      // submit if needed
      await p.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/kirim|jawab|submit/i.test(x.textContent||'') && !b.disabled); if(b) b.click(); });
      await p.waitForTimeout(2500);
      await p.screenshot({path:'proof-a-participant-answered.png', fullPage:true});
      // host reveal
      await admin.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/buka jawaban|reveal|pembahasan/i.test(x.textContent||'')); if(b) b.click(); });
      await admin.waitForTimeout(2500);
      await admin.screenshot({path:'proof-b-host-reveal.png', fullPage:true});
      // host next -> podium (1 soal)
      await admin.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/podium|pemenang|soal berikutnya|selesai|lihat/i.test(x.textContent||'')); if(b) b.click(); });
      await admin.waitForTimeout(3500);
      await admin.screenshot({path:'proof-b-host-podium.png', fullPage:true});
      await p.waitForTimeout(2000);
      await p.screenshot({path:'proof-b-participant-podium.png', fullPage:true});
      log('B podium hostText', (await admin.evaluate(()=>document.body.innerText)).slice(0,400));
      await pctx.close();
    }
    await adminCtx.close();
  }catch(e){ out.errors.push('flowAB:'+e.message); console.error('FLOWAB ERR',e); }
  await browser.close();
  fs.writeFileSync('proof-flow-abc.json', JSON.stringify(out,null,2));
  console.log('DONE', JSON.stringify(out.errors));
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
