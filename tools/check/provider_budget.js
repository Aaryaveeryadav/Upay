'use strict';
// Virtual-clock provider tests. No credentials or network; timers are real runtime logic.
const assert=require('node:assert/strict'),{mock}=require('node:test');
const {aiFailure}=require('../../lib/ai-status');
const fresh=()=>{delete require.cache[require.resolve('../../lib/gemini')];return require('../../lib/gemini');};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const reply=text=>({ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text}]}}]})});
(async()=>{
 mock.timers.enable({apis:['setTimeout','Date']});
 let calls=0,aborts=0;
 // A 20-second complete response must not be killed by the old 10-second lite timeout.
 global.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{
  calls++; const timer=setTimeout(()=>resolve(reply('complete science answer')),20000);
  signal.addEventListener('abort',()=>{aborts++;clearTimeout(timer);reject(new Error('aborted'));},{once:true});
 });
 let api=fresh(),result;
 const slow=api.callGeminiResilient('science',['fixture-key'],null,null,{deadline:Date.now()+50000}).then(r=>result=r);
 await flush();mock.timers.tick(20000);await flush();await slow;
 assert.equal(result.text,'complete science answer');assert.equal(calls,1);assert.equal(aborts,0);
 // A stalled first model is aborted at its slice; another model gets the remaining budget.
 calls=0;aborts=0;
 global.fetch=(_url,{signal})=>{
  calls++;if(calls===2)return Promise.resolve(reply('fallback answer'));
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborts++;reject(new Error('aborted'));},{once:true}));
 };
 api=fresh();const fallback=api.callGeminiResilient('science',['fixture-key'],null,null,{deadline:Date.now()+50000});
 await flush();mock.timers.tick(24000);await flush();
 assert.equal((await fallback).text,'fallback answer');assert.equal(calls,2);assert.equal(aborts,1);
 // Repeated hangs stop at the one request deadline, rather than leaking an orphan chain.
 calls=0;aborts=0;
 global.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{calls++;signal.addEventListener('abort',()=>{aborts++;reject(new Error('aborted'));},{once:true});});
 api=fresh();let failure;
 const hung=api.callGeminiResilient('science',['fixture-key'],null,null,{deadline:Date.now()+50000}).catch(e=>failure=e);
 await flush();mock.timers.tick(24000);await flush();mock.timers.tick(24000);await flush();mock.timers.tick(2000);await flush();await hung;
 assert.equal(failure.status,504);assert.equal(aiFailure(failure).body.code,'provider_timeout');assert.equal(calls,3);assert.equal(aborts,3);
 mock.timers.tick(120000);await flush();assert.equal(calls,3,'no attempts after deadline');
 // Repair shares the original deadline, not a fresh 50 seconds.
 const expired={deadline:Date.now()-1};
 await assert.rejects(api.callGeminiResilient('repair',['fixture-key'],null,null,expired),e=>e.status===504);
 assert.equal(calls,3);
 // Caller cancellation aborts in-flight work and stops fallback attempts.
 const controller=new AbortController();api=fresh();let canceled;
 const pending=api.callGeminiResilient('science',['fixture-key'],null,null,{deadline:Date.now()+50000,signal:controller.signal}).catch(e=>canceled=e);
 await flush();controller.abort();await flush();await pending;
 assert.equal(canceled.status,504);assert.equal(calls,4);assert.equal(aborts,4);
 // Long compositions get a larger per-model slice and output budget.
 const profile=require('../../assets/js/solve-timing').forQuestion('Write a formal letter','english');
 let requestedTokens;
 global.fetch=(_url,{body,signal})=>new Promise((resolve,reject)=>{
  requestedTokens=JSON.parse(body).generationConfig.maxOutputTokens;
  const timer=setTimeout(()=>resolve(reply('complete long composition')),60000);
  signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('aborted'));},{once:true});
 });
 api=fresh();const long=api.callGeminiResilient('letter',['fixture-key'],null,null,{deadline:Date.now()+profile.serverMs,attemptMs:profile.attemptMs,maxOutputTokens:profile.maxOutputTokens});
 await flush();mock.timers.tick(60000);await flush();assert.equal((await long).text,'complete long composition');assert.equal(requestedTokens,12288);
 console.log('PASS provider budget: 20s answers, stalled-model fallback, shared total deadline, repair budget and canceled work');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>mock.timers.reset());
