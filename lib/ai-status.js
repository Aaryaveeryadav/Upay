'use strict';
// Never send provider error bodies to the browser: they may contain credentials.
function aiFailure(e) {
  const raw = String(e && (e.raw || e.message) || '');
  const status = Number(e && e.status);
  const retry = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || raw.match(/retry in ([\d.]+)\s*s/i);
  let code='provider_unavailable', http=503, error='The AI provider is unavailable. Your question is preserved; try again later.';
  /* The model gateway's own codes are authoritative; read them before the
     message heuristics below, which exist only to classify upstream text. A
     configuration error must never be reported as "the provider is down". */
  const gatewayCode = String(e && e.code || '');
  if (gatewayCode === 'llm_configuration') {
    code='provider_configuration';
    error='AI is unavailable because of a server configuration issue. Contact the administrator.';
  } else if (gatewayCode === 'llm_disabled') {
    code='provider_disabled'; http=503;
    error='AI answers are switched off on this server. Stored answers still work.';
  } else if (gatewayCode === 'llm_model_missing') {
    code='provider_model_missing';
    error='The configured model is not installed on the model server. Contact the administrator.';
  } else if (gatewayCode === 'llm_rate_limited' || status===429 || /\b429\b|RESOURCE_EXHAUSTED/.test(raw)) {
    code='provider_rate_limit'; http=429;
    error='The AI provider has reached a quota or rate limit. Your question is preserved.';
  } else if (gatewayCode === 'llm_timeout' || status===504 || /deadline|taking too long|timeout/i.test(raw)) {
    code='provider_timeout'; http=504; error='The AI took too long to respond. Your question is preserved.';
  } else if (/no API key|API key not valid|provider configuration|PERMISSION_DENIED|\b403\b/i.test(raw)) {
    code='provider_configuration'; error='AI is unavailable because of a server configuration issue. Contact the administrator.';
  }
  const body={error,code,fallback:true,rateLimited:http===429};
  if (retry) body.retryAfter=Math.ceil(Number(retry[1]));
  return {http,body};
}
module.exports={aiFailure};
