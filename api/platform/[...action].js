'use strict';
/* Multi-tenant platform API on Vercel. Every action lives in lib/platform-api.js
   so the local Node server and this handler answer identically.

   Routes: /api/platform/<action>  (see lib/platform-api.js for the list) */
const { handle } = require('../../lib/platform-api.js');
const { aiRateFloor } = require('../../lib/rate-limit.js');

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/', 'https://upay.local');
  // Signup and login are the only unauthenticated writes; give them the same
  // per-address floor as the AI routes so a script cannot churn accounts.
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'POST' && /\/(signup|login)$/.test(path)) {
    if (!aiRateFloor(req, res, null)) return;
  }
  await handle(req, res, url);
};
