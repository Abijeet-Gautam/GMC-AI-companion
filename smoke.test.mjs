import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('visitor, reception and staff flows', {timeout:25_000},async t=>{
  const reservation=createServer().listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const {port}=reservation.address();
  await new Promise(resolve=>reservation.close(resolve));
  const dir=await mkdtemp(join(tmpdir(),'gmc-smoke-'));
  const base='http://127.0.0.1:'+port;
  const password='isolated-smoke-test-password';
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),
    PUBLIC_BASE_URL:base,DATA_DIR:dir,STAFF_PASSWORD:password,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  let logs='';
  child.stdout.on('data',data=>logs+=data);
  child.stderr.on('data',data=>logs+=data);
  t.after(async()=>{
    if (child.exitCode===null && child.signalCode===null) { child.kill(); await once(child,'exit'); }
    await rm(dir,{recursive:true,force:true});
  });
  let up=false;
  for (let i=0;i<70;i++) {
    try { up=(await fetch(base+'/healthz')).ok; } catch { /* Waiting for the test server. */ }
    if (up || child.exitCode!==null) break;
    await new Promise(resolve=>setTimeout(resolve,90));
  }
  assert.ok(up,logs);
  async function call(path,{method='GET',body,cookie,origin=base,status=200}={}) {
    const res=await fetch(base+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),
      ...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const json=res.headers.get('content-type').includes('json');
    const data=await (json ? res.json() : res.text());
    assert.equal(res.status,status,JSON.stringify(data));
    return {data,cookie:res.headers.get('set-cookie')?.split(';')[0]};
  }
  for (const path of ['/screen','/chat','/admin','/styles.css','/app.js','/avatars.svg','/landscape.svg']) {
    assert.ok((await call(path)).data.length,path);
  }
  assert.match((await call('/api/qr?chamber=economy')).data,/<svg/);
  const guest=(await call('/api/session',{method:'POST'})).cookie;
  const other=(await call('/api/session',{method:'POST'})).cookie;
  assert.notEqual(other,guest);
  const ask=(chamber,message,cookie=guest)=>call('/api/chat',{method:'POST',cookie,body:{chamber,message}});
  const starters=['What is the vision for GMC?','How is GMC being planned?','What are the eight priority sectors?','How does GMC plan for community life?'];
  for (const [i,chamber] of ['vision','blueprint','economy','life'].entries()) {
    const {data}=await ask(chamber,starters[i]);
    assert.equal(data.sources.length,1,chamber);
    assert.equal(data.mode,'guide');
  }
  const {data:redirect}=await ask('vision','What are the eight priority sectors?');
  assert.equal(redirect.redirect,'economy');
  const {data:follow}=await ask('economy','Tell me more about that');
  assert.equal(follow.sources.length,1);
  assert.equal((await call('/api/history',{cookie:other})).data.turns.length,0);
  await call('/api/feedback/answer',{method:'PUT',cookie:other,body:{id:follow.id,score:0},status:404});
  await call('/api/feedback/answer',{method:'PUT',cookie:guest,body:{id:follow.id,score:0,comment:'Please clarify the priorities.'}});
  await call('/api/feedback/satisfaction',{method:'PUT',cookie:guest,body:{score:3}});
  await call('/api/feedback/satisfaction',{method:'PUT',cookie:guest,body:{score:5}});
  const {data:screen}=await call('/api/info');
  assert.deepEqual(screen.satisfaction,{count:1,average:5});
  assert.ok(!JSON.stringify(screen).includes('Please clarify'));
  await call('/api/staff/dashboard',{cookie:guest,status:401});
  await call('/api/staff/login',{method:'POST',body:{password},origin:'http://foreign.invalid',status:403});
  const staff=(await call('/api/staff/login',{method:'POST',body:{password}})).cookie;
  const dashboard=async()=> (await call('/api/staff/dashboard',{cookie:staff})).data;
  const {feedback,knowledge}=await dashboard();
  assert.equal(feedback.length,2);
  const update=(path,body)=>call('/api/staff/'+path,{method:'POST',body,cookie:staff});
  await update('feedback',{id:feedback[0].id,status:'reviewing'});
  await update('news',{title:'Staff test',body:'Draft only.',state:'draft'});
  await update('news',{title:'Official test',url:'https://www.gmc.bt/news/example',origin:'official',state:'draft'});
  assert.ok(!(await call('/api/info')).data.news.some(item=>item.title==='Staff test'));
  const item=(await dashboard()).news.find(item=>item.title==='Staff test');
  await update('news',{...item,state:'published'});
  assert.ok((await call('/api/info')).data.news.some(item=>item.title==='Staff test'));
  const previous=knowledge.find(row=>row.chamber==='vision' && row.title==='Founding vision');
  await update('knowledge',{...previous,replaces:previous.id,body:'Reviewed founding vision summary for the isolated test.'});
  assert.notEqual((await ask('vision','What is the vision?')).data.text,'Reviewed founding vision summary for the isolated test.');
  const draft=(await dashboard()).knowledge.find(row=>row.state==='draft');
  await update('knowledge/publish',{id:draft.id});
  assert.equal((await ask('vision','What is the vision?')).data.text,'Reviewed founding vision summary for the isolated test.');
  await call('/api/session',{method:'DELETE',cookie:guest});
  assert.equal((await call('/api/history',{cookie:guest})).data.turns.length,0);
  assert.equal((await call('/api/info')).data.satisfaction.count,1);
  await update('logout');
  await call('/api/staff/dashboard',{cookie:staff,status:401});
});

