'use strict';
// Key management is not exposed by the stateless deployment. Configure the
// provider key in the hosting project's protected environment settings instead.
// In particular, do not reveal key fragments to an unauthenticated caller.
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(403).json({
    error: 'Key management is unavailable here. Configure provider keys in the deployment environment.'
  });
};
