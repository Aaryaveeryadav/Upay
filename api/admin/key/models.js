'use strict';
// Do not claim a list is live/verified when no provider call has been made.
module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  return res.status(200).json({ models: [], note: 'Provider model availability has not been checked.' });
};
