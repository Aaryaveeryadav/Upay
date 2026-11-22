'use strict';
// Legacy baseline for migration work. JSDOM and mocked APIs are not a real
// browser, provider, Supabase, service worker or a React parity certification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, ResourceLoader, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '../..');
class LocalAssets extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.origin !== 'https://upay.test' || !u.pathname.startsWith('/assets/')) return null;
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(u.pathname)); } catch (_) { return null; }
    if (!file.startsWith(path.join(root, 'assets') + path.sep)) return null;
    try { return Promise.resolve(fs.readFileSync(file)); } catch (_) { return null; }
  }
}
const errors = [], calls = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', e => errors.push(e.message));
virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));
const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
  url: 'https://upay.test/', runScripts: 'dangerously', resources: new LocalAssets(),
  pretendToBeVisual: true, virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.matchMedia = () => ({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}});
    window.localStorage.setItem('upay.saved', JSON.stringify([{q:'Guest saved baseline', subject:'maths', chapter:'Test chapter'}]));
    window.fetch = async (url, options = {}) => {
      calls.push({url:String(url), body:options.body});
      return {ok:false, status:401, json:async()=>({error:'Sign in required'}), text:async()=>''};
    };
  }
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, message) {
  for (let i=0; i<100; i++) { if (predicate()) return; await pause(50); }
  throw new Error('Timed out: ' + message);
}
(async () => {
  const {window} = dom, {document} = window;
  await waitFor(() => window.UP?.S && document.body.classList.contains('up-ready'), 'production boot');
  const routes = [
    ['#/home','Your next study plan'], ['#/about','About Kritin Upaay'],
    ['#/saved','Guest saved baseline'], ['#/login','sign-in'],
    ['#/syllabus','Syllabus & chapters'], ['#/test','Build a sample paper'],
    ['#/pyq','Real board questions'], ['#/mcq','Multiple-choice practice'],
    ['#/books','Books & sources'], ['#/parent','Parent summary'],
    ['#/today',"Today's 10 practice questions"], ['#/mock','Mock test'],
    ['#/mistakes','Mistake book'], ['#/search?q=light','Search questions']
  ];
  for (const [hash, text] of routes) {
    window.location.hash = hash;
    await waitFor(() => document.querySelector('#view')?.textContent.includes(text), hash);
  }
  assert.equal(JSON.parse(window.localStorage.getItem('upay.saved'))[0].q, 'Guest saved baseline');
  const questions = ['A unique question: x + 1 = 2?', 'A different question: x + 2 = 4?'];
  for (const question of questions) {
    window.location.hash = window.UP.hashRoute.ask(question, {cls:10, sub:'maths'});
    await waitFor(() => calls.some(c => c.url === '/api/ai/solve' && JSON.parse(c.body).question === question), question);
    const request = calls.filter(c => c.url === '/api/ai/solve' && JSON.parse(c.body).question === question).at(-1);
    assert.equal(JSON.parse(request.body).selectedSubject, 'maths');
    assert.equal(JSON.parse(request.body).cls, 10);
  }
  assert.deepEqual(errors, []);
  console.log('PASS production JSDOM baseline: route rendering, guest saved data and distinct mocked AI requests');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
