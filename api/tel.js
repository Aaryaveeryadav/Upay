'use strict';
// The local server keeps an opt-out anonymous telemetry ring. The stateless
// Vercel deployment deliberately does not persist or process these events.
module.exports = function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('allow', 'POST, OPTIONS');
  if (req.method === 'POST' || req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(405).send('');
};
