'use strict';
const assert=require('assert');
const {aiFailure}=require('../../lib/ai-status');
const {consumeAI}=require('../../lib/ai-usage');
const {requireStudent}=require('../../lib/supabase-auth');
function response(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;},send(b){this.body=JSON.parse(b);return this;}};}
async function main(){
 let f=aiFailure({status:429,raw:'{"retryDelay":"12.4s"}'});
 assert.equal(f.http,429);assert.equal(f.body.retryAfter,13);
 assert(!('retryAfter' in aiFailure({status:429}).body));
 assert.equal(aiFailure({status:504}).body.code,'provider_timeout');
 assert(!JSON.stringify(aiFailure(new Error('private key SECRET'))).includes('SECRET'));
 process.env.UPAY_AI_ALLOWED_USERS='user';process.env.UPAY_AI_ENABLED='false';
 global.fetch=async()=>({ok:true,status:200,json:async()=>({id:'user'})});
 let r=response();assert.equal(await requireStudent({headers:{authorization:'Bearer token'}},r),null);assert.equal(r.body.code,'ai_disabled');
 delete process.env.UPAY_AI_ENABLED;
 process.env.UPAY_AI_LIMITS_ENABLED='true';delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 r=response();assert.equal(await consumeAI({id:'user'},r),false);assert.equal(r.code,503);
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 global.fetch=async()=>({ok:true,json:async()=>({allowed:false,retryAfter:120})});
 r=response();assert.equal(await consumeAI({id:'user'},r),false);assert.equal(r.code,429);assert.equal(r.body.retryAfter,120);
 global.fetch=async()=>({ok:true,json:async()=>({allowed:true})});
 assert.equal(await consumeAI({id:'user'},response()),true);
 global.fetch=async()=>{throw new Error('network');};
 r=response();assert.equal(await consumeAI({id:'user'},r),false);assert.equal(r.code,503);
 delete process.env.UPAY_AI_LIMITS_ENABLED;
 global.UP={};require('../../assets/js/data/pyq-physics-2025');
 const ledger=require('../../assets/notes/physics-question-quality.json');
 const expected=ledger.questions.filter(q=>q.id.startsWith('phys25-') && q.status==='structurally-screened').map(q=>q.id).sort();
 assert.equal(expected.length,202);
 assert.deepEqual(UP.pyq.map(q=>q.id).sort(),expected);
 assert(UP.pyq.every(q=>q.qualityStatus==='structurally-screened'));
 for(const q of UP.pyq){
  assert([1,2,3,4,5,6].includes(q.kind));assert.equal(q.keyVerified,false);
  if(q.opts){assert.equal(q.opts.length,4);assert(q.opts.every(o=>typeof o.en==='string' && typeof o.hi==='string'));
    const norm=s=>s.replace(/\s+/g,' ').trim();
    if(q.kind===2){
      assert.equal(q.optionReview,'same-paper-instructions');
      assert(/^Assertion\s*\(A\)/.test(q.en) && /Reason\s*\(R\)/.test(q.en));
      assert(q.opts.every(o=>o.en.includes('Assertion (A)') && o.en.includes('Reason (R)')));
    }else{
      assert.equal(q.optionReview,'inline-text-recovered');
      assert(ledger.originalRows[q.id], 'missing original source row');
      assert(q.opts.every(o=>norm(ledger.originalRows[q.id].en).includes(norm(o.en))));
    }}
 }
 console.log('PASS AI status privacy, retry hints, kill switch, fail-closed usage controls and Physics structural safety');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
