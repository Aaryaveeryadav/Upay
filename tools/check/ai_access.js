'use strict';
const assert=require('assert');
const endpoint=require('../../api/ai/access');
const {requireStudent}=require('../../lib/supabase-auth');
const STUDENT='10000000-0000-4000-8000-000000000001', ADMIN='10000000-0000-4000-8000-000000000002';
process.env.UPAY_AI_ADMIN_USERS=ADMIN;
process.env.UPAY_AI_ALLOWED_USERS=STUDENT;
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
let state='none',storageDown=false,lastRequest=null;
global.fetch=async(url,opts)=>{
 if(url.endsWith('/auth/v1/user')) {
  const t=opts.headers.authorization;
  if(t==='Bearer invalid') return {ok:false,status:401};
  return {ok:true,status:200,json:async()=>({id:t==='Bearer admin'?ADMIN:STUDENT,email:'student@example.test',user_metadata:{role:'admin'}})};
 }
 if(storageDown) throw new Error('database private details');
 const b=JSON.parse(opts.body);lastRequest=b;
 if(url.endsWith('/upay_ai_access_request')) {if(state==='none')state='pending';return {ok:true,json:async()=>({status:state})};}
 if(url.endsWith('/upay_ai_access_decide')) {state=b.p_status;return {ok:true,json:async()=>({status:state})};}
 if(url.endsWith('/upay_ai_access_list')) return {ok:true,json:async()=>[{user_id:STUDENT,status:state}]};
 return {ok:true,json:async()=>({status:state})};
};
function res(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;},send(b){this.body=b?JSON.parse(b):null;return this;}};}
async function call(method='GET',token='student',body,query='') {const r=res();await endpoint({method,url:'/api/ai/access'+query,headers:token?{authorization:'Bearer '+token}:{},body},r);return r;}
(async()=>{
 assert.equal((await call('GET','')).code,401);
 assert.equal((await call('GET','invalid')).code,401);
 assert.equal((await call()).code,503); // not rolled out
 process.env.UPAY_AI_ACCESS_ENABLED='true';
 let blocked=res();assert.equal(await requireStudent({headers:{authorization:'Bearer student'}},blocked),null);assert.equal(blocked.body.code,'usage_setup_pending');
 process.env.UPAY_AI_LIMITS_ENABLED='true';
 assert.equal((await call('GET','student',null,'?manage=1')).code,403);
 assert.equal((await call('POST','student',{action:'approve',userId:STUDENT})).code,403);
 let r=await call('POST','student',{action:'request',userId:ADMIN});assert.equal(r.code,200);assert.equal(lastRequest.p_user,STUDENT);
 assert.equal(state,'pending');
 r=res();assert.equal(await requireStudent({headers:{authorization:'Bearer student'}},r),null);assert.equal(r.code,403); // legacy allowlist cannot override DB
 assert.equal((await call('POST','admin',{action:'approve',userId:'bad-id'})).code,400);
 assert.equal((await call('POST','admin',{action:'approve',userId:STUDENT})).code,200);assert.equal(lastRequest.p_actor,ADMIN);
 r=res();assert.equal((await requireStudent({headers:{authorization:'Bearer student'}},r)).id,STUDENT);
 assert.equal((await call('POST','admin',{action:'revoke',userId:STUDENT})).code,200);
 r=res();assert.equal(await requireStudent({headers:{authorization:'Bearer student'}},r),null);assert.equal(r.code,403);
 assert.equal((await call('POST','student',{action:'request'})).code,200);assert.equal(state,'revoked');
 storageDown=true;r=await call();assert.equal(r.code,503);assert(!JSON.stringify(r.body).includes('private'));
 r=res();assert.equal(await requireStudent({headers:{authorization:'Bearer student'}},r),null);assert.equal(r.code,503);
 console.log('PASS AI access auth, anti-spoofing, admin decisions, revocation precedence and fail-closed storage (mocked; no live migration)');
})().catch(e=>{console.error(e);process.exitCode=1;});
