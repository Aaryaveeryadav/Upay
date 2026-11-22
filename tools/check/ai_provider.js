'use strict';
// No network or real credentials: validate provider boundary and solve contract.
const assert = require('node:assert/strict');
process.env.UPAY_SOLVE_PROVIDER='openai-compatible';
process.env.UPAY_LLM_URL='https://model.example.test/v1/chat/completions';
process.env.UPAY_LLM_KEY='test-secret-do-not-log';
process.env.UPAY_LLM_MODEL='test-model';
process.env.UPAY_AI_ALLOWED_USERS='allowed-provider-test';
process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';
const provider = require('../../lib/ai-provider');
const solve = require('../../api/ai/solve');
let sent;
const choices = ['Definitions','Comparison','Example','Verification'].map((name,i)=>({name,steps:[{t:`Independent explanation number ${i} with sufficient details to explain the supplied question.`}]}));
global.fetch = async (url, options) => {
  if (String(url).includes('/auth/v1/user')) {
    const token = String(options.headers.authorization || '');
    if (token !== 'Bearer valid') return {ok:false,status:401};
    return {ok:true,status:200,json:async()=>({id:'allowed-provider-test',email:'student@example.test'})};
  }
  sent={url,options,body:JSON.parse(options.body)};
  const text=JSON.stringify({answer:'A sample answer',approaches:choices});
  return {ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:text}}]})};
};
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},send(v){this.body=JSON.parse(v);return this},json(v){this.body=v;return this}}}
(async()=>{
  const result=await provider.generateSolve('A prompt',null,null,{maxOutputTokens:800,deadline:Date.now()+10000});
  assert.match(result.text,/sample answer/); assert.equal(result.model,'test-model');
  assert.equal(sent.url,'https://model.example.test/v1/chat/completions'); assert.equal(sent.options.redirect,'error');
  assert.equal(sent.options.headers.authorization,'Bearer test-secret-do-not-log');
  assert.equal(sent.body.messages[0].content,'A prompt'); assert.equal(sent.body.max_tokens,800);
  const r=res(); await solve({method:'POST',headers:{authorization:'Bearer valid'},body:{question:'Explain the significance of this concept',subject:'english',cls:10}},r);
  assert.equal(r.code,200); assert.equal(r.body.approaches.length,4); assert(!JSON.stringify(r.body).includes('test-secret-do-not-log'));
  const noAuth=res(); sent=null; await solve({method:'POST',headers:{},body:{question:'Explain this question'}},noAuth);
  assert.equal(noAuth.code,401); assert.equal(sent,null);
  const original=process.env.UPAY_LLM_URL;
  for (const url of ['http://model.example.test','https://user:pass@model.example.test/v1','https://model.example.test/v1?secret=x']) {
    process.env.UPAY_LLM_URL=url; await assert.rejects(provider.generateSolve('x'),/configuration/);
  }
  process.env.UPAY_LLM_URL=original;
  process.env.UPAY_SOLVE_PROVIDER='not-supported'; await assert.rejects(provider.generateSolve('x'),/configuration/);
  process.env.UPAY_SOLVE_PROVIDER='openai-compatible';
  global.fetch=async()=>({ok:false,status:429,text:async()=>{throw Error('must not read upstream errors')}});
  await assert.rejects(provider.generateSolve('x'),e=>e.status===429&&!e.message.includes('test-secret'));
  global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({bad:'shape'})});
  await assert.rejects(provider.generateSolve('x'),/request failed/);
  const ac=new AbortController();ac.abort(); await assert.rejects(provider.generateSolve('x',null,null,{signal:ac.signal}),e=>e.status===504);
  global.fetch=async(_url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('private timeout details'))));
  await assert.rejects(provider.generateSolve('x',null,null,{attemptMs:10,deadline:Date.now()+1000}),e=>e.status===504&&!e.message.includes('private'));
  console.log('PASS custom provider solve, authentication, HTTPS configuration, redaction, errors and timeouts');
})().catch(e=>{console.error(e);process.exitCode=1});
