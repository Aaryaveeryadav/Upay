'use strict';
/* Simple OCR endpoint stub.
   For now returns null text — the client falls back to the existing
   photo-upload flow. Real OCR (Tesseract.js WASM in the browser, or
   a Vision API call) plugs in here. */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin','*');
    res.setHeader('access-control-allow-headers','authorization,content-type');
    res.writeHead(204); return res.end('');
  }
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST only'); }
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin','*');
  res.end(JSON.stringify({ text: null, note: 'server-side OCR not yet configured — use the photo upload or try on Chrome Android' }));
};
