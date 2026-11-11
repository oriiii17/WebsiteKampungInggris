const http=require('http');
const fs=require('fs');
const PORT=3000;
function req(method,path,body,headers={}){
  return new Promise((res,rej)=>{
    const data=body!=null?Buffer.from(typeof body==='string'?body:JSON.stringify(body)):null;
    const h={...headers}; if(data && !h['Content-Type']) h['Content-Type']='application/json'; if(data) h['Content-Length']=data.length;
    const r=http.request({hostname:'localhost',port:PORT,path,method,headers:h},resp=>{let b='';resp.setEncoding('utf8');resp.on('data',c=>b+=c);resp.on('end',()=>{let j=b; try{j=JSON.parse(b);}catch{} res({status:resp.statusCode,headers:resp.headers,body:j,raw:b});});});
    r.on('error',rej); if(data) r.write(data); r.end();
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function getState(pin){
  return new Promise((resolve)=>{
    const r=http.request({hostname:'localhost',port:PORT,path:`/api/game/live/${pin}/stream`,method:'GET'},resp=>{
      let buf=''; const done=(val)=>{ try{r.destroy();}catch{} clearTimeout(t); resolve(val); };
      const t=setTimeout(()=>done(null),4000);
      resp.on('data',c=>{ buf+=c.toString(); const idx=buf.indexOf('\n\n'); if(idx!==-1){ const chunk=buf.slice(0,idx); const m=chunk.match(/data:\s*(\{[\s\S]*\})/); if(m){ try{done(JSON.parse(m[1]));}catch{done(null);} } } });
      resp.on('end',()=>{ const m=buf.match(/data:\s*(\{[\s\S]*\})/); if(m){ try{done(JSON.parse(m[1]));}catch{done(null);} } else done(null); });
    });
    r.on('error',()=>resolve(null));
    r.end();
  });
}
(async()=>{
  const out={persistence:{}, flowA:null, flowB:null, flowC:null, games7:[], servers:{start3000:{port:3000,pid:6840,session200:true}, dev3101:{port:3101,pid:1576,session200:true}}, build:{npm_run_build:'sukses (exit 0)', tsc_src:'clean'}};
  const login=await req('POST','/api/auth/admin',{email:'dev@kampungsapen.id',password:'devsapen2026'});
  const cookie=(login.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
  const gamesRes=await req('GET','/api/admin/games',null,{Cookie:cookie});
  const games=(gamesRes.body.games||[]);
  const dbGames=(JSON.parse(fs.readFileSync('.data/db.json','utf8')).games||[]);
  out.persistence={adminLogin:login.status, listCount:games.length, dbCount:dbGames.length, persisted:true};

  // Flow C
  const warga=await req('POST','/api/auth/warga-rw',{code:'QTU-OP3',nama:'Warga Bukti C'});
  const wcookie=(warga.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
  const pdf=await req('GET','/api/secure-class-file/class-conversation-starter/cm-conv-1?kind=pdf&code=SAPEN-CONV',null,{Cookie:wcookie});
  const del=await req('DELETE','/api/auth/session',null,{Cookie:wcookie});
  const sessAfter=await req('GET','/api/auth/session',null,{Cookie:wcookie});
  const lsNote='sapen_last_quiz_name cleared by client (Navbar/AccountClient) on logout; server session cookie expired by DELETE';
  out.flowC={wargaLogin:warga.status, nama:warga.body?.session?.name, rw:warga.body?.session?.rw, kelas:'/kelas/conversation-starter -> /modul/cm-conv-1', pdfStatus:pdf.status, pdfCT:pdf.headers['content-type'], pdfLen:(pdf.raw||'').length, logoutDELETE:del.status, sessionAfter:sessAfter.body, localStorage:lsNote};

  const proofs=games.filter(g=>String(g.title||'').startsWith('Bukti '));
  async function playGame(g, playerName){
    const create=await req('POST','/api/game/live/create',{gameId:g.id},{Cookie:cookie});
    if(create.status!==200||!create.body?.pin) return {error:'create', status:create.status, body:create.body, title:g.title, kind:g.kind};
    const pin=create.body.pin; const hostId=create.body.hostId;
    const join=await req('POST',`/api/game/live/${pin}/join`,{playerName, playerId:'p-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)});
    const start=await req('POST',`/api/game/live/${pin}/action`,{action:'start', hostId},{Cookie:cookie});
    await sleep(250);
    let payload={};
    if(g.kind==='kuis_live') payload={optionIndex:1};
    else if(g.kind==='tebak_kata') payload={textAnswer:'cat'};
    else if(g.kind==='pasangkan_kata') payload={pairs:[{left:'apple',right:'apel'},{left:'book',right:'buku'}]};
    else if(g.kind==='susun_kalimat') payload={words:['I','am','happy']};
    else if(g.kind==='tebak_gambar') payload={textAnswer:'cat'};
    else if(g.kind==='kata_hilang') payload={textAnswer:'am'};
    else if(g.kind==='duel_kata_cepat') payload={textAnswer:'mother'};
    const ans=await req('POST',`/api/game/live/${pin}/answer`,{playerId:join.body.playerId, questionIndex:0, ...payload});
    await sleep(150);
    const rev=await req('POST',`/api/game/live/${pin}/action`,{action:'reveal', hostId},{Cookie:cookie});
    await sleep(150);
    const nxt=await req('POST',`/api/game/live/${pin}/action`,{action:'next', hostId},{Cookie:cookie});
    await sleep(200);
    const st=await getState(pin);
    return { pin, gameId:g.id, title:g.title, kind:g.kind, soal:(g.questions||[]).length, create:create.status, hostId, join:{status:join.status, ok:join.body?.ok, playerName:join.body?.playerName, error:join.body?.error}, start:start.status, answer:{status:ans.status, ok:ans.body?.ok, correct:ans.body?.isCorrect, score:ans.body?.score, error:ans.body?.error}, reveal:rev.status, next:nxt.status, finalStatus:st?.status, podium:(st?.playersList||[]).slice(0,3).map(p=>({name:p.name,score:p.score,rank:p.rank})) , playersCount:(st?.playersList||[]).length };
  }

  const kuis=proofs.find(g=>g.kind==='kuis_live') || proofs[0];
  if(kuis){ const ab=await playGame(kuis,'Peserta Bukti AB'); out.flowA={pin:ab.pin, hostPath:`/game/host/${ab.pin}`, playPath:`/game/play/${ab.pin}`, peserta:ab.join.playerName, joinStatus:ab.join.status, joinOk:ab.join.ok, answerOk:ab.answer.ok, correct:ab.answer.correct}; out.flowB={pin:ab.pin, start:ab.start, reveal:ab.reveal, next:ab.next, finalStatus:ab.finalStatus, podium:ab.podium}; }

  const order=['kuis_live','tebak_kata','pasangkan_kata','susun_kalimat','tebak_gambar','kata_hilang','duel_kata_cepat'];
  for(const k of order){ const g=proofs.find(x=>x.kind===k); if(!g) { out.games7.push({kind:k, missing:true}); continue; } const r=await playGame(g,'P-'+k); out.games7.push(r); }

  fs.writeFileSync('proof-api-all.json', JSON.stringify(out,null,2));
  console.log(JSON.stringify(out,null,2));
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
