const pw=require('playwright');
const fs=require('fs');
const base='http://localhost:3101';
(async()=>{
  const browser=await pw.chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless:true, args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1280,height:900}, acceptDownloads:true});
  const page=await ctx.newPage();
  const log=[];
  const L=(step,data)=>{ log.push({step,...(data||{})}); console.log('LOG',JSON.stringify({step,...(data||{})})); };
  try{
    await page.goto(base+'/masuk?tab=warga',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(2000);
    const inputs=await page.$$('input');
    await inputs[0].fill('Warga Bukti FlowC');
    await inputs[1].fill('QTU-OP3');
    const respP=page.waitForResponse(r=>r.url().includes('/api/auth/warga-rw') && r.request().method()==='POST',{timeout:30000}).catch(()=>null);
    await page.click('button[type="submit"]');
    const resp=await respP; await page.waitForTimeout(4000);
    L('login',{url:page.url(), status: resp?resp.status():null});
    await page.goto(base+'/kelas/conversation-starter/modul/cm-conv-1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(3000);
    // if locked, redeem code SAPEN-CONV
    const locked = await page.evaluate(()=>document.body.innerText.includes('Materi Terkunci'));
    L('locked_before',{locked});
    if(locked){
      const codeInput = page.locator('input[placeholder*="kode"], input').first();
      if(await codeInput.count()) await codeInput.fill('SAPEN-CONV');
      await page.click('button:has-text("Masukkan Kode Akses")');
      await page.waitForTimeout(2000);
    }
    const afterRedeem = await page.evaluate(()=>({locked:document.body.innerText.includes('Materi Terkunci'), canvas:document.querySelectorAll('canvas').length, text:document.body.innerText.slice(0,400)}));
    L('after_redeem', afterRedeem);
    await page.waitForTimeout(8000); // pdf render
    const st = await page.evaluate(()=>({
      url:location.href, canvas:document.querySelectorAll('canvas').length,
      hasBreadcrumb: document.body.innerText.includes('Kelas') && document.body.innerText.includes('Sapaan'),
      hasDaftar: document.body.innerText.includes('Daftar Bab'),
      text: document.body.innerText.slice(0,500)
    }));
    L('flipbook_state', st);
    await page.screenshot({path:'flowc-flipbook.png', fullPage:true});

    const zoomPct=async()=>await page.evaluate(()=>{ const m=document.body.innerText.match(/(\d+)%/); return m?m[0]:null; });
    const before=await zoomPct();
    await page.locator('button[title="Zoom In"]').first().click({timeout:10000});
    await page.waitForTimeout(1200);
    const afterIn=await zoomPct();
    L('click_zoom_in',{before, after:afterIn});
    await page.screenshot({path:'flowc-zoom-in.png', fullPage:true});
    await page.locator('button[title="Zoom Out"]').first().click({timeout:10000});
    await page.waitForTimeout(1000);
    L('click_zoom_out',{after:await zoomPct()});

    await page.locator('button:has-text("Fullscreen")').first().click({timeout:10000});
    await page.waitForTimeout(1200);
    const fsState=await page.evaluate(()=>!!document.fullscreenElement);
    L('click_fullscreen',{fullscreen:fsState});
    await page.screenshot({path:'flowc-fullscreen.png', fullPage:true});
    await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(500);

    let dl={ok:false};
    try{
      const p=page.waitForEvent('download',{timeout:10000}).catch(()=>null);
      await page.locator('a:has-text("Download")').first().click({timeout:10000});
      const d=await p; if(d){ dl={ok:true, suggested:d.suggestedFilename()}; try{await d.path();}catch{} }
      else { const href=await page.locator('a:has-text("Download")').first().getAttribute('href'); dl={ok:!!href, href}; }
    }catch(e){ dl={ok:false,err:String(e)} }
    L('click_download', dl);

    await page.goto(base+'/akun',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(1500);
    const sessBefore=await page.evaluate(async()=> (await fetch('/api/auth/session')).json());
    L('session_before_logout', sessBefore);
    await page.locator('button:has-text("Log Out")').first().click({timeout:10000});
    await page.waitForTimeout(4000);
    const afterUrl=page.url();
    const sessAfter=await page.evaluate(async()=>{ try{return await (await fetch('/api/auth/session')).json()}catch(e){return {err:String(e)}} });
    L('logout',{afterUrl, sessionAfter:sessAfter});
    await page.screenshot({path:'flowc-logout.png', fullPage:true});
    fs.writeFileSync('flowc-browser-proof-final.json', JSON.stringify(log,null,2));
    console.log('DONE');
  }catch(e){ console.error('ERR',e); fs.writeFileSync('flowc-browser-proof-final.json', JSON.stringify({log,error:String(e),stack:e.stack},null,2)); process.exitCode=1; }
  await browser.close();
})();
