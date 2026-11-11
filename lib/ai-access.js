'use strict';
const {url}=require('./supabase-public');
const enabled=()=>process.env.UPAY_AI_ACCESS_ENABLED==='true';
const isAccessAdmin=id=>!!id && String(process.env.UPAY_AI_ADMIN_USERS||'').split(/[,\s]+/).filter(Boolean).includes(id);
async function rpc(name,body) {
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret) throw new Error('access storage unavailable');
  const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
    method:'POST',signal:AbortSignal.timeout(8000),
    headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(body)
  });
  if(!r.ok) throw new Error('access storage unavailable');
  return r.json();
}
async function hasApprovedAccess(id) {
  const result=await rpc('upay_ai_access_status',{p_user:id});
  if(!result || !['none','pending','approved','revoked'].includes(result.status)) throw new Error('invalid access status');
  return result.status==='approved';
}
module.exports={enabled,isAccessAdmin,rpc,hasApprovedAccess};
