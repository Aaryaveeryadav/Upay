'use strict';
const { callGeminiResilient, readBody, json } = require('../../lib/gemini.js');
const { requireStudent } = require('../../lib/supabase-auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'authorization,content-type');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!await requireStudent(req, res)) return;
  let b;
  try { b = await readBody(req, 4<<20); } catch (e) { return json(res, 400, { error: 'bad json' }); }
  const data = String(b.data || '');
  const mime = String(b.mime || '').toLowerCase();
  if (data.length < 200 || !/^image\/(jpeg|jpg|png|webp|heic)$/.test(mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    return json(res, 400, { ok: false, error: 'Send a readable JPG, PNG, WEBP or HEIC photo.' });
  }

  const prompt = 'This is a photo of a school question. Transcribe it exactly, including table headings, dates, amounts and debit/credit labels. Return only one complete question; do not answer it. Strip page numbers, headers, footers, and marks indicators. If none is clear, return UNREADABLE. Respond with plain text, no JSON, no quotes.';
  try {
    const out = await callGeminiResilient(prompt, null, 'gemini-3.5-flash-lite', { data, mime: mime === 'image/jpg' ? 'image/jpeg' : mime });
    const txt = (out.text || '').trim().replace(/^["']|["']$/g, '');
    if (!txt || /^UNREADABLE/i.test(txt)) return json(res, 200, { ok: false, error: 'The photo could not be read clearly. Try again or type the question.' });
    return json(res, 200, { ok: true, question: txt });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'The AI could not read the image. Please try again.' });
  }
};
