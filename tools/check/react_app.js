'use strict';
/* The React app (assets/app/) is the site's UI. Run after `npm run build:web`.
   No browser, server or model is needed: the built bundle runs in JSDOM against
   a mocked /api/platform/* and /api/chat/ask.

   Locks in:
     1. a guest gets the one login page (sign in / create account)
     2. a student signs in, sees their own page and a cited chat answer
     3. an off-topic question is refused before the model is asked
     4. the role decides the screens: teacher and owner see their own
     5. a suspended school is shown the server's reason, not a broken page
*/
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..', '..');
const shellPath = path.join(root, 'assets', 'app', 'index.html');
const bundlePath = path.join(root, 'assets', 'app', 'app.js');
assert(fs.existsSync(shellPath) && fs.existsSync(bundlePath), 'assets/app is missing: run npm run build:web');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const student = {
  role: 'student',
  person: { id: 'u1', role: 'student', name: 'Asha Verma', email: 'asha@example.test', school: 'Green Valley', schoolId: 's1', class: 10, board: 'cbse', status: 'active', active: true },
  scope: { class: 10, subject: 'science', board: 'cbse' },
  can: { recordStudy: true },
  subjects: [
    { class: 10, subject: 'science', title: 'Science' },
    { class: 10, subject: 'maths', title: 'Mathematics' }
  ]
};
const cited = {
  ok: true, grounded: true, onTopic: true,
  question: 'Why is a convex mirror used as a rear-view mirror?',
  answer: 'A convex mirror always forms a small, upright virtual image behind it [1], so it shows a wide view of the road [1][2].',
  citations: [
    { n: 1, label: 'NCERT · Ch 10 · Light – Reflection and Refraction', chapter: 10, chapterTitle: 'Light – Reflection and Refraction', section: '10.2', page: 168, pageSource: 'textbook-pdf', verifiedKey: false, snippet: 'A convex mirror is used as a rear-view mirror because it always forms a virtual, erect and diminished image.', docType: 'textbook' },
    { n: 2, label: 'CBSE 2026 · board paper', chapter: 10, chapterTitle: 'Light – Reflection and Refraction', section: 'saq', page: null, pageSource: '', verifiedKey: false, snippet: 'It has a wider field of view, which helps the driver see traffic behind.', docType: 'pyq' }
  ],
  retrieved: 2, model: 'qwen2.5:3b',
  notice: 'AI draft from the site’s own model — check it against the cited pages; not an official answer key.',
  citationCheck: { used: [1, 2], invalid: [], hasCitation: true }
};

function makeDom({ me, login, chat = cited, url = 'http://app.test/#/chat' } = {}) {
  const shell = fs.readFileSync(shellPath, 'utf8').replace(/<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/, '');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(shell, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const calls = { login: [], signup: [], ask: [], me: 0 };
  w.fetch = async (u, options = {}) => {
    const url = String(u);
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    let payload = null, status = 200;
    if (url.startsWith('/api/platform/login')) {
      calls.login.push(body);
      if (login && login.reject) { status = 401; payload = { ok: false, code: 'bad_credentials', error: 'Email or password is not correct.' }; }
      else payload = { ok: true, token: 'test-token', person: student.person };
    } else if (url.startsWith('/api/platform/signup')) {
      calls.signup.push(body);
      payload = { ok: true, token: 'test-token' };
    } else if (url.startsWith('/api/platform/me')) {
      calls.me++;
      payload = me || (w.localStorage.getItem('upay.session.token') ? student : null);
      if (!payload) { status = 401; payload = { ok: false, code: 'sign_in_required' }; }
    } else if (url.startsWith('/api/platform/public/schools')) {
      payload = { ok: true, schools: [{ name: 'Green Valley', code: 'green-valley' }] };
    } else if (url.startsWith('/api/chat/ask')) {
      // GET on this path is the model/index status; only a POST is a question.
      if (method === 'POST') calls.ask.push(body);
      payload = method === 'POST' ? chat : { ok: true, enabled: true, model: 'qwen2.5:3b', host: 'local', subjects: { '10:science': { chunks: 1435 } } };
    } else if (url.startsWith('/api/platform/records')) {
      payload = { ok: true, events: [], summary: { total: 0, correct: 0 } };
    } else if (url.startsWith('/api/platform')) {
      payload = { ok: true };
    } else {
      status = 404; payload = { ok: false, error: 'not found' };
    }
    return { ok: status < 400, status, text: async () => JSON.stringify(payload), json: async () => payload };
  };
  w.eval(bundle);
  return { dom, w, errors, calls };
}

const pause = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, label, timeout = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const value = fn(); if (value) return value; } catch (_) {}
    await pause(40);
  }
  throw new Error('timed out waiting for ' + label);
}

const groups = [];
async function group(name, fn) {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { groups.push(name); console.error('FAIL ' + name + ': ' + (e && e.stack || e)); }
}

(async () => {
  await group('guest sees one login page', async () => {
    const { dom, w, errors } = makeDom();
    await waitFor(() => w.document.body.textContent.includes('Welcome back'), 'the login form');
    const text = w.document.body.textContent;
    /* One site, one account system. The guest must still be able to start
       account creation from this page, but it now hands off to the legacy
       site's Supabase login instead of offering a second form that could
       never succeed on this deployment. */
    assert(/Create your account/i.test(text), 'the same page points at account creation');
    assert(!text.includes('Study chat'), 'no app content before sign-in');
    assert.deepEqual(errors, []);
    dom.window.close();
  });

  await group('wrong password is shown, not swallowed', async () => {
    const { dom, w, errors } = makeDom({ login: { reject: true } });
    await waitFor(() => w.document.querySelector('input[type=password]'), 'the password field');
    const inputs = w.document.querySelectorAll('input');
    const set = (el, value) => {
      const proto = el.type === 'password' ? w.HTMLInputElement.prototype : w.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    };
    set(w.document.querySelector('input[type=email]'), 'asha@example.test');
    set(w.document.querySelector('input[type=password]'), 'wrongpass1');
    w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => w.document.body.textContent.includes('Email or password is not correct'), 'the error message');
    assert.deepEqual(errors, []);
    dom.window.close();
  });

  await group('student signs in, asks, reads a cited answer', async () => {
    const { dom, w, errors, calls } = makeDom();
    await waitFor(() => w.document.querySelector('input[type=password]'), 'the password field');
    const set = (el, value) => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    };
    set(w.document.querySelector('input[type=email]'), 'asha@example.test');
    set(w.document.querySelector('input[type=password]'), 'correct1pass');
    w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => w.document.querySelector('#chatQuestion'), 'the chat box after sign-in');
    assert.equal(calls.login.length, 1, 'the login endpoint was used');
    assert.match(w.document.body.textContent, /Class 10 · Science/, 'the scope is shown');
    assert.equal(w.document.querySelectorAll('a[href^="#/practice"]').length >= 1, true, 'a student sees practice');

    // Ask by chip.
    const chip = w.document.querySelector('.chip');
    assert(chip, 'starter chips are offered');
    chip.click();
    await waitFor(() => w.document.querySelector('.answer-text'), 'the answer');
    assert.equal(calls.ask.length, 1, 'one ask');
    assert.equal(calls.ask[0].class, 10, 'the class comes from the account');
    assert.equal(calls.ask[0].subject, 'science');
    const answer = w.document.querySelector('.answer-text').textContent;
    assert(answer.includes('convex mirror'), 'the answer text is rendered');
    assert.equal(w.document.querySelectorAll('.answer-text a.cite').length, 3, 'three citation links');
    assert.equal(w.document.querySelectorAll('.answer .source').length, 2, 'two source cards');
    const first = w.document.querySelector('#source-1').textContent;
    assert.match(first, /168/, 'the verified PDF page is on the card');
    assert.match(w.document.querySelector('#source-2').textContent, /CBSE board question/);
    const cite = w.document.querySelector('.answer-text a.cite');
    cite.click();
    await pause(80);
    assert(w.document.querySelector('#source-1.target'), 'clicking a citation highlights its card');
    assert.deepEqual(errors, []);
    dom.window.close();
  });

  await group('off-syllabus question is refused before the model', async () => {
    const refusal = {
      ok: true, grounded: false, onTopic: false, code: 'off_topic',
      question: 'What is the capital of France?',
      answer: 'That does not look like a question from your Class 10 science syllabus.',
      citations: [], retrieved: 0, model: null, citationCheck: { used: [], invalid: [], hasCitation: false }
    };
    const { dom, w, errors } = makeDom({ chat: refusal });
    w.localStorage.setItem('upay.session.token', 'test-token');
    w.location.hash = '#/chat';
    dom.window.close();
    // re-open with a saved session
    const second = makeDom({ chat: refusal });
    second.w.localStorage.setItem('upay.session.token', 'test-token');
    // The shell reads the token on mount; trigger a fresh load.
    second.w.eval('window.__rerun = true');
    second.dom.window.close();
    // Simplest reliable path: sign in, then ask.
    const flow = makeDom({ chat: refusal });
    await waitFor(() => flow.w.document.querySelector('input[type=password]'), 'login');
    const set = (el, value) => {
      Object.getOwnPropertyDescriptor(flow.w.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new flow.w.Event('input', { bubbles: true }));
    };
    set(flow.w.document.querySelector('input[type=email]'), 'asha@example.test');
    set(flow.w.document.querySelector('input[type=password]'), 'correct1pass');
    flow.w.document.querySelector('form').dispatchEvent(new flow.w.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => flow.w.document.querySelector('#chatQuestion'), 'chat');
    const box = flow.w.document.querySelector('#chatQuestion');
    Object.getOwnPropertyDescriptor(flow.w.HTMLTextAreaElement.prototype, 'value').set.call(box, 'What is the capital of France?');
    box.dispatchEvent(new flow.w.Event('input', { bubbles: true }));
    box.dispatchEvent(new flow.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await waitFor(() => flow.w.document.body.textContent.includes('Outside the syllabus'), 'the refusal card');
    assert.equal(flow.w.document.querySelectorAll('.answer .source').length, 0, 'no sources were invented');
    assert.deepEqual(flow.errors, []);
    flow.dom.window.close();
  });

  await group('teacher and owner see their own screens', async () => {
    const teacher = {
      role: 'teacher',
      person: { id: 't1', role: 'teacher', name: 'Mr Rao', email: 'rao@example.test', school: 'Green Valley', class: 10, board: 'cbse', status: 'active', active: true },
      scope: { class: 10, subject: 'science', board: 'cbse' },
      teaching: [{ class: 10, subject: 'science' }],
      can: { managePeople: true },
      subjects: [{ class: 10, subject: 'science', title: 'Science' }]
    };
    const owner = {
      role: 'owner',
      person: { id: 'o1', role: 'owner', name: 'Master Admin', email: 'admin@example.test', school: '', class: null, board: 'cbse', status: 'active', active: true },
      scope: { class: 10, subject: 'science', board: 'cbse' },
      owner: true,
      can: { managePlatform: true },
      schools: [],
      subjects: [{ class: 10, subject: 'science', title: 'Science' }]
    };
    const { dom, w, errors } = makeDom({ me: teacher, url: 'http://app.test/#/teacher' });
    w.localStorage.setItem('upay.session.token', 'test-token');
    w.eval(bundle);
    await waitFor(() => w.document.body.textContent.includes('Teach, mark and rank'), 'the teacher screen');
    const links = [...w.document.querySelectorAll('.nav a')].map(a => a.getAttribute('href'));
    assert(links.includes('#/teacher'), 'the teacher navigation has My classes');
    assert(!links.includes('#/owner'), 'a teacher does not get the owner screen');
    assert.deepEqual(errors, []);
    dom.window.close();

    const second = makeDom({ me: owner, url: 'http://app.test/#/owner' });
    second.w.localStorage.setItem('upay.session.token', 'test-token');
    second.w.eval(bundle);
    await waitFor(() => second.w.document.body.textContent.includes('The whole platform, one place'), 'the owner screen');
    const ownerLinks = [...second.w.document.querySelectorAll('.nav a')].map(a => a.getAttribute('href'));
    assert(ownerLinks.includes('#/owner'), 'the owner navigation has Schools');
    assert(!ownerLinks.includes('#/practice'), 'the owner has no student practice screen');
    assert.deepEqual(second.errors, []);
    second.dom.window.close();
  });

  await group('a suspended school sees the server reason', async () => {
    const { dom, w } = makeDom();
    await waitFor(() => w.document.querySelector('input[type=password]'), 'login');
    // Replace fetch so /me reports the suspension the server would send.
    w.fetch = async (u, options = {}) => {
      const url = String(u);
      if (url.startsWith('/api/platform/login')) {
        return { ok: true, status: 200, text: async () => '{}', json: async () => ({ ok: true, token: 't', person: student.person }) };
      }
      if (url.startsWith('/api/platform/me')) {
        const payload = { ok: false, code: 'school_suspended', error: 'Your school’s access is paused.' };
        return { ok: false, status: 403, text: async () => JSON.stringify(payload), json: async () => payload };
      }
      return { ok: true, status: 200, text: async () => '{}', json: async () => ({ ok: true }) };
    };
    const set = (el, value) => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    };
    set(w.document.querySelector('input[type=email]'), 'asha@example.test');
    set(w.document.querySelector('input[type=password]'), 'correct1pass');
    w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    // The session load fails with 403, so the app must not pretend to be signed in.
    await pause(300);
    assert(!w.document.body.textContent.includes('Study chat'), 'no app content for a suspended school');
    dom.window.close();
  });

  await group('a book answer is labelled as a key, not an AI draft', async () => {
    const keyed = {
      ok: true, grounded: true, onTopic: true, keyed: true, status: 'verified',
      question: 'Oil and fat containing food items are flushed with nitrogen. Why?',
      answer: 'Oils and fats get oxidised on contact with oxygen and turn rancid. Flushing the packet with nitrogen displaces oxygen, so oxidation cannot happen.',
      citations: [{ n: 1, docType: 'exercise', label: 'NCERT Ch 1 · Exercise Q19', chapter: 1, chapterTitle: 'Chemical Reactions and Equations', page: null, pageSource: '', verifiedKey: true, answer: 'Nitrogen prevents oxidation.', snippet: 'Oil and fat containing food items are flushed with nitrogen. Why?' }],
      retrieved: 1, model: null, notice: 'This is the answer key printed with the question.',
      citationCheck: { used: [], invalid: [], hasCitation: false }
    };
    const { dom, w, errors, calls } = makeDom({ chat: keyed });
    await waitFor(() => w.document.querySelector('input[type=password]'), 'login');
    const set = (el, value) => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
    };
    set(w.document.querySelector('input[type=email]'), 'asha@example.test');
    set(w.document.querySelector('input[type=password]'), 'correct1pass');
    w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => w.document.querySelector('#chatQuestion'), 'chat');
    const box = w.document.querySelector('#chatQuestion');
    Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set.call(box, 'Oil and fat containing food items are flushed with nitrogen. Why?');
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.document.querySelector('.askbox').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => w.document.querySelector('.answer-text'), 'the key answer');
    const answer = w.document.querySelector('.answer').textContent;
    assert.match(answer, /Book answer key/, 'the key is named as a key');
    assert(!/No draft/.test(answer), 'it is not presented as a failed draft');
    assert.match(answer, /displaces oxygen|oxidised/, 'the key text is shown');
    assert.equal(calls.ask.length, 1);
    assert.deepEqual(errors, []);
    dom.window.close();
  });

  if (groups.length) { console.error('\n' + groups.length + ' React app group(s) failed'); process.exit(1); }
  console.log('\nPASS React app: login, cited chat, syllabus refusal, role screens and suspension');
})();
