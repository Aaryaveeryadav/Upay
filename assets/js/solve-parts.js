/* A long question can outrun one request's budget. When that happens the app
   stops throwing the whole answer away and asks for it in parts:

     core      the answer, its summary, the check, and the first method
     approach  one more method per request, told which methods are already shown

   This module holds that state machine so it can be tested without a browser:
   `create` → `next` → `absorb` → `finish`, plus the banner text. Each part is
   small enough to finish inside the function limit, so a student with a big
   question gets the answer and as many methods as the model manages, instead
   of "The AI took too long". */
(function (root) {
  'use strict';
  const WANT = 4;

  function create(question, seed) {
    const usable = seed && Array.isArray(seed.approaches) && seed.approaches.length ? seed : null;
    const state = { question: String(question || ''), answer: usable, failed: 0, done: false };
    if (state.answer) {
      state.answer._parts = { have: have(state), want: WANT, failed: 0, done: have(state) >= WANT };
      state.answer._partial = have(state) < WANT;
    }
    return state;
  }

  function have(state) {
    return state.answer && Array.isArray(state.answer.approaches) ? state.answer.approaches.length : 0;
  }

  /* The next request to send, or null when there is nothing left to ask for. */
  function next(state, base) {
    if (!state || state.done) return null;
    const count = have(state);
    if (count >= WANT) { state.done = true; return null; }
    const payload = Object.assign({}, base || {});
    if (!state.answer) {
      payload.part = 'core';
      return payload;
    }
    payload.part = 'approach';
    payload.index = Math.min(count + 1, WANT);
    const shown = Array.isArray(state.answer.approaches) ? state.answer.approaches : [];
    payload.taken = shown.map((a) => String((a && a.name) || 'method')).slice(0, 6);
    payload.core = {
      answer: String(state.answer.result || ''),
      summary: String(state.answer.summary || '')
    };
    return payload;
  }

  /* Fold one part into the answer. Returns how many new methods it added. */
  function absorb(state, payload) {
    if (!payload || !Array.isArray(payload.approaches) || !payload.approaches.length) {
      state.failed += 1;
      return 0;
    }
    if (!state.answer) {
      state.answer = payload;
      state.answer._parts = { have: payload.approaches.length, want: WANT, failed: 0, done: false };
      state.answer._partial = payload.approaches.length < WANT;
      return payload.approaches.length;
    }
    if (!Array.isArray(state.answer.approaches)) state.answer.approaches = [];
    const norm = text => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const work = a => norm((a.steps || []).map(s => String(s.t || '') + ' ' + String(s.m || '')).join(' '));
    const known = new Set(state.answer.approaches.map((a) => norm(a && a.name)));
    const workings = new Set(state.answer.approaches.map(work));
    let added = 0;
    payload.approaches.forEach((a) => {
      if (!a || !Array.isArray(a.steps)) return;
      const key = norm(a.name), value = work(a);
      if (!key || !value || known.has(key) || workings.has(value)) return;            /* never show the same method twice */
      known.add(key); workings.add(value);
      state.answer.approaches.push(a);
      added += 1;
    });
    ['result', 'summary', 'verify', 'questionUnderstood', 'diagram', 'concepts'].forEach((field) => {
      if (!state.answer[field] && payload[field]) state.answer[field] = payload[field];
    });
    if (!added) state.failed += 1;
    const count = have(state);
    state.answer._parts = { have: count, want: WANT, failed: state.failed, done: count >= WANT };
    state.answer._partial = count < WANT;
    return added;
  }

  function finish(state) {
    if (!state) return;
    state.done = true;
    if (state.answer) {
      const count = have(state);
      state.answer._parts = { have: count, want: WANT, failed: state.failed, done: true };
      state.answer._partial = count < WANT;
    }
  }

  /* What to tell the student while the answer is assembled in parts. */
  function status(state, lang) {
    const hi = lang === 'hi';
    const count = have(state);
    if (!state || !state.answer) return '';
    /* Even a complete split answer says so: the student should know why the
       card came back in pieces, and that nothing is missing. */
    if (count >= WANT) {
      return hi
        ? 'यह लंबा प्रश्न टुकड़ों में हल हुआ: 4 में से ' + count + ' तरीके मिले।'
        : 'This long question was answered in parts: ' + count + ' of ' + WANT + ' methods came back.';
    }
    if (!state.done) {
      return hi
        ? 'उत्तर तैयार है — बाकी तरीके अभी लिखे जा रहे हैं (4 में से ' + count + ')।'
        : 'The answer is ready — the remaining methods are still being written (' + count + ' of ' + WANT + ').';
    }
    return hi
      ? 'यह उत्तर लंबा था, इसलिए टुकड़ों में लिखा गया: 4 में से ' + count + ' तरीके मिले। शेष तरीके दोबारा माँगे जा सकते हैं।'
      : 'This question was long, so the answer arrived in parts: ' + count + ' of ' + WANT +
        ' methods came back. The rest can be requested again.';
  }

  const api = { create: create, next: next, absorb: absorb, finish: finish, status: status, have: have, WANT: WANT };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.UP = root.UP || {}; root.UP.solveParts = api; }
})(typeof window === 'undefined' ? globalThis : window);
