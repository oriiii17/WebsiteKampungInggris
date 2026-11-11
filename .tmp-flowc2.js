const pw=require('playwright');
const fs=require('fs');
const base='http://localhost:3101';
(async()=>{
  const browser=await pw.chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless:true, args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1280,height:900}, acceptDownloads:true});
  const page=await ctx.newPage();
  const log=[];
  const L=(name,data)=>{ const e={step:name,...(data||{})}; log.push(e); console.log('LOG',JSON.stringify(e)); };
  try{
    await page.goto(base+'/masuk?tab=warga',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(2000);
    const inputs=await page.$$('input');
    await inputs[0].fill('Warga FlowC Browser');
    await inputs[1].fill('QTU-OP3');
    const respP = page.waitForResponse(r=>r.url().includes('/api/auth/warga-rw') && r.request().method()==='POST', {timeout:30000}).catch(()=>null);
    await page.click('button[type="submit"]');
    const resp = await respP;
    await page.waitForTimeout(5000);
    L('login',{url:page.url(), status: resp?resp.status():null, body: resp? await resp.text().catch(()=>null):null});
    // if still on masuk, navigate to kelas anyway (cookie may be set)
    await page.goto(base+'/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(10000);
    const info=await page.evaluate(()=>({
      url:location.href, title:document.title,
      text: document.body.innerText.slice(0,1500),
      canvas: document.querySelectorAll('canvas').length,
      controls: Array.from(document.querySelectorAll('button,a')).map(e=>({tag:e.tagName,text:(e.textContent||'').trim(),title:e.getAttribute('title')||'',aria:e.getAttribute('aria-label')||'',href:e.getAttribute('href')||''}))
    }));
    L('materi',{url:info.url, canvas:info.canvas, hasKelas:info.text.includes('Kelas'), hasBab:info.text.includes('Bab'), hasDaftar:info.text.includes('Daftar Bab'), hasFlipbook:info.text.toLowerCase().includes('flipbook')||info.canvas>0, snippet:info.text.slice(0,350)});
    await page.screenshot({path:'flowc-materi-browser.png', fullPage:true});

    // try click controls by visible text/title
    const clickBtn = async (name, selectors)=>{
      for(const sel of selectors){
        const loc=page.locator(sel).first();
        if(await loc.count()){ try{ await loc.scrollIntoViewIfNeeded(); await loc.click({timeout:5000}); await page.waitForTimeout(1200); return {ok:true, sel}; }catch(e){ return {ok:false, sel, err:String(e)} } }
      }
      // fallback by text search
      const res = await page.evaluate((name)=>{
        const els=Array.from(document.querySelectorAll('button,a'));
        const t=name.toLowerCase();
        const el=els.find(e=>((e.textContent||'')+(e.title||'')+(e.getAttribute('aria-label')||'')).toLowerCase().includes(t));
        if(el){ el.click(); return {ok:true, sel:'text:'+name, text:(el.textContent||el.title||'').trim()}; }
        return {ok:false, sel:'notfound'};
      }, name);
      await page.waitForTimeout(1000);
      return res;
    };

    const zoomBefore = await page.evaluate(()=>{ const m=document.body.innerText.match(/(\d+)%/); return m?m[0]:null; });
    const zoomInR = await clickBtn('Zoom In',['button[title="Zoom In"]','button:has-text("+")']);
    const zoomMid = await page.evaluate(()=>{ const m=document.body.innerText.match(/(\d+)%/); return m?m[0]:null; });
    L('zoom_in',{before:zoomBefore, after:zoomMid, result:zoomInR});
    const zoomOutR = await clickBtn('Zoom Out',['button[title="Zoom Out"]','button:has-text("-")']);
    const zoomAfterOut = await page.evaluate(()=>{ const m=document.body.innerText.match(/(\d+)%/); return m?m[0]:null; });
    L('zoom_out',{after:zoomAfterOut, result:zoomOutR});
    await page.screenshot({path:'flowc-zoom-browser.png', fullPage:true});

    const fsR = await clickBtn('Fullscreen',['button:has-text("Fullscreen")','button[title*="Full"]']);
    await page.waitForTimeout(1200);
    const fsState = await page.evaluate(()=>({fullscreen: !!document.fullscreenElement, label: (Array.from(document.querySelectorAll('button')).find(b=>/Keluar|Fullscreen/i.test(b.textContent||''))||{}).textContent||''}));
    L('fullscreen',{result:fsR, state:fsState});
    await page.screenshot({path:'flowc-fullscreen-browser.png', fullPage:true});
    await page.keyboard.press('Escape').catch(()=>{});
    await page.waitForTimeout(500);

    let dlInfo={ok:false};
    try{
      const dlPromise = page.waitForEvent('download',{timeout:8000}).catch(()=>null);
      const dlR = await clickBtn('Download',['a:has-text("Download")','button:has-text("Download")','a[download]']);
      const dl = await dlPromise;
      if(dl){ dlInfo={ok:true, suggested: dl.suggestedFilename()}; }
      else { const href=await page.evaluate(()=>{ const a=Array.from(document.querySelectorAll('a,button')).find(e=>/download/i.test((e.textContent||'')+(e.getAttribute('href')||''))); return a?(a.getAttribute('href')||a.textContent):null; }); dlInfo={ok:!!href || dlR.ok, href, result:dlR}; }
    }catch(e){ dlInfo={ok:false, err:String(e)} }
    L('download', dlInfo);

    // Logout from akun
    await page.goto(base+'/akun',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(2000);
    const sessBefore=await page.evaluate(async()=>{ try{const r=await fetch('/api/auth/session'); return await r.json()}catch(e){return {err:String(e)}} });
    L('session_before_logout', sessBefore);
    await clickBtn('Log Out',['button:has-text("Log Out")','button:has-text("Keluar")']);
    await page.waitForTimeout(4000);
    const afterUrl=page.url();
    const sessAfter=await page.evaluate(async()=>{ try{const r=await fetch('/api/auth/session'); return await r.json()}catch(e){return {err:String(e)}} });
    L('logout',{afterUrl, sessionAfter: sessAfter});
    await page.screenshot({path:'flowc-logout-browser.png', fullPage:true});

    fs.writeFileSync('flowc-browser-proof.json', JSON.stringify({log, controlsFound: info.controls.filter(c=>/download|zoom|full|\+|-/i.test((c.text||'')+(c.title||'')+(c.aria||'')))}, null, 2));
    console.log('DONE');
  }catch(e){ console.error('ERR',e); fs.writeFileSync('flowc-browser-proof.json', JSON.stringify({log,error:String(e),stack:e.stack},null,2)); process.exitCode=1; }
  await browser.close();
})();
