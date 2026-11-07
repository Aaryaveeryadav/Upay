'use strict';
const { authenticate } = require('../../lib/supabase-auth.js');

module.exports = async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization,content-type');
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const header = String((req.headers && req.headers.authorization) || '').trim();
  if (!header || /^Bearer$/i.test(header)) {
    return res.status(200).json({ user: { user: 'guest', role: 'student', name: 'Guest', mustChange: false } });
  }
  const auth = await authenticate(req);
  if (auth.unavailable) return res.status(503).json({ error: 'Authentication service unavailable.' });
  if (!auth.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const email = auth.user.email;
  const name = email ? email.split('@')[0] : 'Student';
  return res.status(200).json({ user: { id: auth.user.id, user: email, role: 'student', name, mustChange: false } });
};
