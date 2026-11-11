const http=require('http');
const fs=require('fs');
const basePort=3000;
function req(method,path,body,headers={}){
  return new Promise((res,rej)=>{
    const data=body!=null?Buffer.from(typeof body==='string'?body:JSON.stringify(body)):null;
    const h={...headers}; if(data && !h['Content-Type']) h['Content-Type']='application/json'; if(data) h['Content-Length']=data.length;
    const r=http.request({hostname:'localhost',port:basePort,path,method,headers:h},resp=>{let b='';resp.setEncoding('utf8');resp.on('data',c=>b+=c);resp.on('end',()=>{let j=b; try{j=JSON.parse(b);}catch{} res({status:resp.statusCode,headers:resp.headers,body:j,raw:b});});});
    r.on('error',rej); if(data) r.write(data); r.end();
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out={persistence:{}, flowA:null, flowB:null, flowC:null, games7:[], build:{build:'exit 0 (see earlier)', start3000:'GET /api/auth/session 200, listening :3000 PID 6840', dev3101:'listening :3101 PID 1576, compiled'}};
  // persistence check
  const login=await req('POST','/api/auth/admin',{email:'dev@kampungsapen.id',password:'devsapen2026'});
  const cookie=(login.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
  const gamesRes=await req('GET','/api/admin/games',null,{Cookie:cookie});
  const games=(gamesRes.body.games||[]);
  out.persistence={adminLogin:login.status, gamesCount:games.length, allPersistedInDb: (JSON.parse(fs.readFileSync('.data/db.json','utf8')).games||[]).length};

  // flow C via API
  const warga=await req('POST','/api/auth/warga-rw',{code:'QTU-OP3',nama:'Warga Bukti C'});
  const wcookie=(warga.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
  const pdf=await req('GET','/api/secure-class-file/class-conversation-starter/cm-conv-1?kind=pdf&code=SAPEN-CONV',null,{Cookie:wcookie});
  const del=await req('DELETE','/api/auth/session',null,{Cookie:wcookie});
  const sessAfter=await req('GET','/api/auth/session',null,{Cookie:wcookie});
  out.flowC={wargaLogin:warga.status, wargaName:warga.body?.session?.name, wargaRw:warga.body?.session?.rw, pdfStatus:pdf.status, pdfCT:pdf.headers['content-type'], pdfLen:(pdf.raw||'').length, logout:del.status, sessionAfter: sessAfter.body};

  const proofs=games.filter(g=>String(g.title||'').startsWith('Bukti '));
  // flow A/B use kuis_live proof
  const kuis=proofs.find(g=>g.kind==='kuis_live');
  async function playGame(g, playerName){
    const create=await req('POST','/api/game/live/create',{gameId:g.id},{Cookie:cookie});
    if(create.status!==200||!create.body.pin) return {error:create.status, body:create.body};
    const pin=create.body.pin;
    const join=await req('POST',`/api/game/live/${pin}/join`,{playerName, playerId:'p-'+Date.now()+Math.random()});
    await req('POST',`/api/game/live/${pin}/action`,{action:'start', hostId:create.body.hostId},{Cookie:cookie});
    await sleep(300);
    // answer depending on type - fetch state
    const st=await req('GET',`/api/game/live/${pin}/stream`,null,{}).catch(()=>null);
    // simpler: submit answer payload for known single-question proofs
    let payload={};
    if(g.kind==='kuis_live') payload={optionIndex:1};
    else if(g.kind==='tebak_kata') payload={textAnswer:'cat'};
    else if(g.kind==='pasangkan_kata') payload={pairs:[{left:'apple',right:'apel'},{right:'buku',left:'book'}]};
    else if(g.kind==='susun_kalimat') payload={words:['I','am','happy']};
    else if(g.kind==='tebak_gambar') payload={textAnswer:'cat'};
    else if(g.kind==='kata_hilang') payload={textAnswer:'am'};
    else if(g.kind==='duel_kata_cepat') payload={textAnswer:'mother'};
    const ans=await req('POST',`/api/game/live/${pin}/answer`,{playerId:join.body.playerId, questionIndex:0, ...payload});
    await sleep(200);
    const rev=await req('POST',`/api/game/live/${pin}/action`,{action:'reveal', hostId:create.body.hostId},{Cookie:cookie});
    await sleep(200);
    const nxt=await req('POST',`/api/game/live/${pin}/action`,{action:'next', hostId:create.body.hostId},{Cookie:cookie});
    await sleep(200);
    // get final state via a fresh stream read? easier: use internal? but stream is SSE. try GET state by hitting join? no. but sanitize via stream first chunk
    let podium=null, finalStatus=null, players=null;
    try{
      const s=await new Promise((resolve,reject)=>{
        const r=http.request({hostname:'localhost',port:basePort,path:`/api/game/live/${pin}/stream`,method:'GET'},resp=>{let b='';resp.on('data',c=>{b+=c.toString(); if(b.includes('\n\n')){r.destroy(); const m=b.match(/data: (\{.*\})/); resolve(m?JSON.parse(m[1]):b);} }); resp.on('end',()=>{const m=b.match(/data: (\{[\s\S]*\})/); resolve(m?JSON.parse(m[1]):null);} );}); r.on('error',reject); setTimeout(()=>{try{r.destroy()}catch{} resolve(null);},2000); r.end();
      });
      podium=s?.playersList?.slice(0,3); finalStatus=s?.status; players=s?.playersList;
    }catch(e){}
    return {pin, gameId:g.id, title:g.title, kind:g.kind, soal:(g.questions||[]).length, create:create.status, join:{status:join.status, ok:join.body.ok, name:join.body.playerName}, answer:{status:ans.status, ok:ans.body.ok, correct:ans.body.isCorrect, score:ans.body.score}, reveal:rev.status, next:nxt.status, finalStatus, podium, players};
  }

  if(kuis){ const ab=await playGame(kuis,'Peserta Bukti AB'); out.flowA={pin:ab.pin, join:ab.join, answer:ab.answer, participantPlayPath:`/game/play/${ab.pin}`}; out.flowB={hostPath:`/game/host/${ab.pin}`, reveal:ab.reveal, next:ab.next, finalStatus:ab.finalStatus, podium:ab.podium}; }

  for(const g of proofs){
    const name='P-'+g.kind.replace(/_/g,'').slice(0,8);
    const r=await playGame(g,name);
    out.games7.push(r);
  }

  fs.writeFileSync('proof-api-all.json', JSON.stringify(out,null,2));
  console.log(JSON.stringify(out,null,2));
})().catch(e=>{ console.error('FATAL',e); process.exit(1); });
