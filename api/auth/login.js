'use strict';
// Local username/password accounts belong to the standalone server and are
// not available on the stateless Vercel deployment. Supabase email sign-in is
// performed by the browser SDK; this endpoint never authenticates a user.
module.exports = function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('allow', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  return res.status(401).json({ error: 'Invalid email or password. Local server accounts are not available on this hosted site.' });
};
