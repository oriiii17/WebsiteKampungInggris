const http=require('http');
const PORT=3101;
function req(method,path,body,headers={}){
  return new Promise((res,rej)=>{
    const data=body!=null?Buffer.from(typeof body==='string'?body:JSON.stringify(body)):null;
    const h={...headers}; if(data && !h['Content-Type']) h['Content-Type']='application/json'; if(data) h['Content-Length']=data.length;
    const r=http.request({hostname:'localhost',port:PORT,path,method,headers:h},resp=>{let b='';resp.setEncoding('utf8');resp.on('data',c=>b+=c);resp.on('end',()=>{let j=b; try{j=JSON.parse(b);}catch{} res({status:resp.statusCode,headers:resp.headers,body:j,raw:b});});});
    r.on('error',rej); if(data) r.write(data); r.end();
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function getState(pin){ return new Promise((resolve)=>{ const r=http.request({hostname:'localhost',port:PORT,path:`/api/game/live/${pin}/stream`,method:'GET'},resp=>{ let buf=''; const done=(v)=>{try{r.destroy()}catch{} clearTimeout(t); resolve(v)}; const t=setTimeout(()=>done(null),4000); resp.on('data',c=>{buf+=c.toString(); const m=buf.match(/data:\s*(\{[\s\S]*?\})\n\n/); if(m){ try{done(JSON.parse(m[1]))}catch{} }}); resp.on('end',()=>{const m=buf.match(/data:\s*(\{[\s\S]*\})/); if(m){try{done(JSON.parse(m[1]))}catch{done(null)}} else done(null)}); }); r.on('error',()=>resolve(null)); r.end(); }); }
(async()=>{
  const login=await req('POST','/api/auth/admin',{email:'dev@kampungsapen.id',password:'devsapen2026'});
  const cookie=(login.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
  const gamesRes=await req('GET','/api/admin/games',null,{Cookie:cookie});
  const g=(gamesRes.body.games||[]).find(x=>x.id==='game-1794384474951-f2n1');
  const create=await req('POST','/api/game/live/create',{gameId:g.id},{Cookie:cookie});
  const pin=create.body.pin, hostId=create.body.hostId;
  const join=await req('POST',`/api/game/live/${pin}/join`,{playerName:'P-susun_kalimat', playerId:'p-susun-'+Date.now()});
  await req('POST',`/api/game/live/${pin}/action`,{action:'start', hostId},{Cookie:cookie});
  await sleep(300);
  const ans=await req('POST',`/api/game/live/${pin}/answer`,{playerId:join.body.playerId, questionIndex:0, words:['I','am','happy']});
  await sleep(150);
  await req('POST',`/api/game/live/${pin}/action`,{action:'reveal', hostId},{Cookie:cookie});
  await sleep(150);
  await req('POST',`/api/game/live/${pin}/action`,{action:'next', hostId},{Cookie:cookie});
  await sleep(250);
  const st=await getState(pin);
  console.log(JSON.stringify({pin, join:{status:join.status,ok:join.body.ok,name:join.body.playerName}, answer:{status:ans.status,ok:ans.body.ok,correct:ans.body.isCorrect,score:ans.body.score}, finalStatus:st?.status, podium:(st?.playersList||[]).slice(0,3).map(p=>({name:p.name,score:p.score}))}, null, 2));
})().catch(e=>{console.error(e);process.exit(1)});
