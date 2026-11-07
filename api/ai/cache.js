'use strict';
// Cache lookup endpoint — Vercel has no persistent cache between function cold starts,
// so this returns found:false. The browser will fall through to /api/ai/solve.
module.exports = function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify({ found: false }));
};
