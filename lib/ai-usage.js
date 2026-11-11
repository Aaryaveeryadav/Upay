'use strict';
const {url}=require('./supabase-public.js');
const {json}=require('./gemini.js');
function limit(name, fallback) {
  const n=Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(n) || n<1 || n>100000) throw new Error('invalid usage configuration');
  return n;
}
async function consumeAI(user,res) {
  // Explicit rollout: install the migration and service-role credential first.
  // When enabled, missing configuration or database errors fail CLOSED.
  if (process.env.UPAY_AI_LIMITS_ENABLED !== 'true') return true;
  try {
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error('usage credential missing');
    const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/upay_consume_ai_call',{
      method:'POST',signal:AbortSignal.timeout(8000),
      headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json'},
      body:JSON.stringify({p_user:user.id,p_user_limit:limit('UPAY_AI_USER_DAILY_LIMIT',30),p_global_limit:limit('UPAY_AI_GLOBAL_DAILY_LIMIT',300)})
    });
    if (!r.ok) throw new Error('usage database unavailable');
    const usage=await r.json();
    if (!usage || typeof usage.allowed !== 'boolean') throw new Error('invalid usage response');
    if (!usage.allowed) {
      const retryAfter=Math.max(1,Math.ceil(Number(usage.retryAfter)||1));
      res.setHeader('retry-after',String(retryAfter));
      json(res,429,{code:'daily_usage_limit',error:'The daily AI request limit has been reached. Study material remains available.',retryAfter});
      return false;
    }
    // No prompts, user IDs or keys in alert payloads. Configure an HTTPS webhook
    // owned by the administrator; delivery failure never leaks provider data.
    const hook=process.env.UPAY_AI_ALERT_WEBHOOK;
    if (usage.alert && hook && hook.startsWith('https://')) {
      try { await fetch(hook,{method:'POST',signal:AbortSignal.timeout(2000),headers:{'content-type':'application/json'},body:JSON.stringify({event:'ai_daily_usage_80_percent',calls:usage.globalCalls})}); }
      catch (_) { console.warn('AI usage alert delivery failed'); }
    }
    return true;
  } catch (_) {
    json(res,503,{code:'usage_guard_unavailable',error:'AI usage checks are temporarily unavailable. Please try again later.'});
    return false;
  }
}
module.exports={consumeAI};
