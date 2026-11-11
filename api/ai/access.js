'use strict';
const {authenticate}=require('../../lib/supabase-auth');
const {json,readBody}=require('../../lib/gemini');
const {enabled,isAccessAdmin,rpc}=require('../../lib/ai-access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports=async function(req,res) {
  res.setHeader('cache-control','no-store');
  if(req.method==='OPTIONS') return res.status(204).send('');
  if(!['GET','POST'].includes(req.method)) return json(res,405,{error:'GET or POST only'});
  const auth=await authenticate(req);
  if(auth.unavailable) return json(res,503,{error:'Sign-in verification is unavailable.'});
  if(!auth.user) return json(res,401,{error:'Sign in to request AI access.'});
  // UI access never changes the app-wide student/admin role.
  const admin=isAccessAdmin(auth.user.id);
  if(!enabled()) return json(res,503,{code:'access_setup_pending',error:'Self-service AI access is awaiting secure setup. Existing permissions are unchanged.'});
  try {
    if(req.method==='GET') {
      const manage=String(req.url||'').includes('manage=1');
      if(manage && !admin) return json(res,403,{error:'AI access administrator permission required.'});
      const result=await rpc(manage?'upay_ai_access_list':'upay_ai_access_status',manage?{}:{p_user:auth.user.id});
      return json(res,200,{admin,result});
    }
    let b;try{b=await readBody(req,8192);}catch(_){return json(res,400,{error:'Invalid request.'});}
    if(b.action==='request') {
      const result=await rpc('upay_ai_access_request',{p_user:auth.user.id,p_email:auth.user.email});
      return json(res,200,{admin,result});
    }
    if(!admin) return json(res,403,{error:'AI access administrator permission required.'});
    if(!['approve','revoke'].includes(b.action)||!UUID.test(String(b.userId||''))) return json(res,400,{error:'Choose a valid account and action.'});
    if(b.userId===auth.user.id) return json(res,400,{error:'Manage other student accounts here; administrator access is configured separately.'});
    const result=await rpc('upay_ai_access_decide',{p_user:b.userId,p_actor:auth.user.id,p_status:b.action==='approve'?'approved':'revoked'});
    return json(res,200,{admin,result});
  }catch(_){return json(res,503,{error:'AI access storage is temporarily unavailable. No permission change was confirmed.'});}
};
