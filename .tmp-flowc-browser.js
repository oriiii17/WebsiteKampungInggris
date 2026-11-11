const pw=require('playwright');
const fs=require('fs');
const base='http://localhost:3101';
(async()=>{
  const browser=await pw.chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless:true, args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1280,height:900}, acceptDownloads:true});
  const page=await ctx.newPage();
  const log=[];
  const clickLog=(name,info)=>{ const e={click:name, ...info, t:new Date().toISOString()}; log.push(e); console.log('CLICK',JSON.stringify(e)); };
  try{
    // login warga
    await page.goto(base+'/masuk?tab=warga',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(2000);
    const inputs=await page.$$('input');
    await inputs[0].fill('Warga Browser C');
    await inputs[1].fill('QTU-OP3');
    const [resp] = await Promise.all([
      page.waitForResponse(r=>r.url().includes('/api/auth/warga-rw') && r.request().method()==='POST', {timeout:30000}).catch(()=>null),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(3500);
    clickLog('login_warga_submit',{url:page.url(), apiStatus: resp?resp.status():null});
    // go to modul flipbook
    await page.goto(base+'/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(8000); // allow pdf load/render
    const info=await page.evaluate(()=>({
      url:location.href,
      body: document.body.innerText.slice(0,1200),
      canvas: document.querySelectorAll('canvas').length,
      btns: Array.from(document.querySelectorAll('button,a')).map(e=>({tag:e.tagName,text:(e.textContent||'').trim(),title:e.getAttribute('title')||'',aria:e.getAttribute('aria-label')||'',href:e.getAttribute('href')||''}))
    }));
    console.log('MATERI', JSON.stringify({url:info.url, canvas:info.canvas, hasKelas:info.body.includes('Kelas'), hasBab:info.body.includes('Bab'), hasDaftar:info.body.includes('Daftar Bab'), snippet:info.body.slice(0,300)}));
    await page.screenshot({path:'flowc-browser-materi.png', fullPage:true});

    const find = (pred)=> info.btns.find(pred);
    // zoom in/out
    const zoomBefore = await page.evaluate(()=>{ const s=document.body.innerText.match(/(\d+)%/); return s?s[1]:null; });
    const zoomIn = page.locator('button[title="Zoom In"], button:has-text("+")').first();
    const zoomOut = page.locator('button[title="Zoom Out"], button:has-text("-")').first();
    let zoomAfter=null, zoomOutAfter=null;
    if(await zoomIn.count()){ await zoomIn.click(); await page.waitForTimeout(800); zoomAfter=await page.evaluate(()=>{ const el=Array.from(document.querySelectorAll('span,div')).find(x=>/\d+%/.test(x.textContent||'')); return el?el.textContent.trim():null; }); clickLog('zoom_in',{ok:true, before:zoomBefore, after:zoomAfter}); await page.screenshot({path:'flowc-browser-zoom-in.png', fullPage:true}); }
    else clickLog('zoom_in',{ok:false});
    if(await zoomOut.count()){ await zoomOut.click(); await page.waitForTimeout(800); zoomOutAfter=await page.evaluate(()=>{ const el=Array.from(document.querySelectorAll('span,div')).find(x=>/\d+%/.test(x.textContent||'')); return el?el.textContent.trim():null; }); clickLog('zoom_out',{ok:true, after:zoomOutAfter}); }
    else clickLog('zoom_out',{ok:false});

    // fullscreen
    const fsBtn = page.locator('button:has-text("Fullscreen"), button[title*="Full"], button[title*="Layar"]').first();
    let fsState=null;
    if(await fsBtn.count()){
      await fsBtn.click(); await page.waitForTimeout(1200);
      fsState=await page.evaluate(()=>({fs: !!document.fullscreenElement, label: (Array.from(document.querySelectorAll('button')).find(b=>/Keluar|Fullscreen/i.test(b.textContent||''))||{}).textContent||''}));
      clickLog('fullscreen',{ok:true,state:fsState});
      await page.screenshot({path:'flowc-browser-fullscreen.png', fullPage:true});
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    } else clickLog('fullscreen',{ok:false});

    // download
    let downloadOk=false, downloadName=null;
    const dlBtn = page.locator('a:has-text("Download"), a[download], button:has-text("Download")').first();
    if(await dlBtn.count()){
      const [dl] = await Promise.all([
        page.waitForEvent('download', {timeout:15000}).catch(()=>null),
        dlBtn.click()
      ]);
      if(dl){ downloadName=dl.suggestedFilename(); downloadOk=true; await dl.path().catch(()=>{}); }
      else {
        // maybe navigated/opened; check href
        const href=await dlBtn.getAttribute('href'); downloadOk=!!href; downloadName=href;
      }
      clickLog('download',{ok:downloadOk, name:downloadName});
    } else clickLog('download',{ok:false});

    // logout
    await page.goto(base+'/akun',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(1500);
    const sessBefore=await page.evaluate(async()=>{ const r=await fetch('/api/auth/session'); return await r.json(); });
    clickLog('session_before_logout',{session:sessBefore});
    await page.evaluate(()=>{ const bs=Array.from(document.querySelectorAll('button')); const b=bs.find(x=>/Log Out|Keluar/i.test(x.textContent||'')); if(b) b.click(); });
    await page.waitForTimeout(4000);
    const sessAfter=await page.evaluate(async()=>{ try{ const r=await fetch('/api/auth/session'); return await r.json(); }catch(e){return {err:String(e)}} });
    const urlAfter=page.url();
    clickLog('logout',{urlAfter, sessionAfter:sessAfter});
    await page.screenshot({path:'flowc-browser-logout.png', fullPage:true});

    fs.writeFileSync('flowc-browser-log.json', JSON.stringify({log, materi: {canvas:info.canvas, hasKelas:info.body.includes('Kelas'), hasBab:info.body.includes('Bab'), hasDaftar:info.body.includes('Daftar Bab')}, controls:{zoomIn:zoomAfter, zoomOut:zoomOutAfter, fullscreen:fsState, download:downloadOk}}, null, 2));
    console.log('DONELOG', JSON.stringify(log));
  }catch(e){ console.error('ERR',e); fs.writeFileSync('flowc-browser-log.json', JSON.stringify({log,error:String(e),stack:e.stack}, null, 2)); process.exitCode=1; }
  await browser.close();
})();
