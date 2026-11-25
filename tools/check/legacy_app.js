'use strict';
/* The legacy study pages are still part of the site: index.html/app.js is the
   full practice viewer the React app links to for the paper-level work that
   has not moved yet. This check keeps that route alive after the React build
   changed the front door — a missing practice screen is a broken site, not a
   cosmetic issue. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, ResourceLoader, VirtualConsole} = require('jsdom');

const root = path.resolve(__dirname, '..', '..');
const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

class Fixtures extends ResourceLoader {
  fetch(url) {
    const m = url.match(/\/assets\/js\/data\/([\w-]+\.js)$/);
    if (m) {
      const file = path.join(root, 'assets', 'js', 'data', m[1]);
      if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
    }
    return null;
  }
}
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = String(e.message || ''); if (!/Could not load|not implemented/i.test(m)) errors.push(m); });
const dom = new JSDOM(shell, {
  url: 'https://app.example.test/index.html', runScripts: 'dangerously',
  resources: new Fixtures(), pretendToBeVisual: true, virtualConsole: vc
});
const w = dom.window;
w.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
w.scrollTo = () => {};
w.fetch = async () => ({ok: false, status: 503, text: async () => '{}', json: async () => ({})});

(async () => {
  await new Promise(r => setTimeout(r, 700));
  const {document} = w;
  const text = document.body.textContent.replace(/\s+/g, ' ');
  assert(text.length > 400, 'the legacy shell rendered something');
  assert(document.querySelector('#shell.app'), 'the server-rendered study shell is in the page');
  // The React app links to this page; it must not be an error page.
  assert(!/404|not found|cannot be found/i.test(text), 'the shell is not a 404 page');
  assert.deepEqual(errors, []);
  console.log('PASS legacy practice shell still loads as the deep-study screen');
  w.close();
})().catch(e => { console.error(e); w.close(); process.exitCode = 1; });
