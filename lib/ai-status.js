'use strict';
// Never send provider error bodies to the browser: they may contain credentials.
function aiFailure(e) {
  const raw = String(e && (e.raw || e.message) || '');
  const status = Number(e && e.status);
  const retry = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || raw.match(/retry in ([\d.]+)\s*s/i);
  let code='provider_unavailable', http=503, error='The AI provider is unavailable. Your question is preserved; try again later.';
  if (status===429 || /\b429\b|RESOURCE_EXHAUSTED/.test(raw)) {
    code='provider_rate_limit'; http=429;
    error='The AI provider has reached a quota or rate limit. Your question is preserved.';
  } else if (status===504 || /deadline|taking too long|timeout/i.test(raw)) {
    code='provider_timeout'; http=504; error='The AI took too long to respond. Your question is preserved.';
  } else if (/no API key|API key not valid|PERMISSION_DENIED|\b403\b/.test(raw)) {
    code='provider_configuration'; error='AI is unavailable because of a server configuration issue. Contact the administrator.';
  }
  const body={error,code,fallback:true,rateLimited:http===429};
  if (retry) body.retryAfter=Math.ceil(Number(retry[1]));
  return {http,body};
}
module.exports={aiFailure};
