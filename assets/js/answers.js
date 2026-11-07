/* =====================================================================
   Upay answer cache
   ---------------------------------------------------------------------
   Lookup order:
     1. in-memory ANS (loaded from /assets/answers/<subject>.json seed bundle)
     2. localStorage (key upay.ans.<id>, populated by prior AI calls)
     3. live AI call (then cached to both memory + localStorage)
   The seed bundles ship pre-generated answers for the most-asked PYQs in
   each subject, so returning students get instant answers without waiting
   on AI even on first open.
   ===================================================================== */
(function(){
  window.UP = window.UP || {};
  const ANS = {};      // id -> answer JSON
  const LS_PREFIX = 'upay.ans.';
  const LS_META = 'upay.ansMeta';
  let meta = {};
  try { meta = JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch(e){}

  UP.answers = {
    has: function(id){ return !!(ANS[id] || loadLocal(id)); },
    get: function(id){ return ANS[id] || loadLocal(id) || null; },
    set: function(id, answer){
      ANS[id] = answer;
      try {
        localStorage.setItem(LS_PREFIX + id, JSON.stringify(answer));
        meta[id] = { at: Date.now(), subj: answer._subj || null };
        localStorage.setItem(LS_META, JSON.stringify(meta));
      } catch(e){ /* quota */ }
    },
    /* load a seed bundle for a subject (called after lazy pack loads) */
    loadSeed: function(subject){
      if (UP.answers._loaded[subject]) return Promise.resolve();
      UP.answers._loaded[subject] = true;
      return fetch('assets/answers/' + subject + '.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null)
        .then(bundle => {
          if (!bundle || typeof bundle !== 'object') return;
          Object.keys(bundle).forEach(id => { if (!ANS[id]) ANS[id] = bundle[id]; });
        }).catch(()=>{});
    },
    _loaded: {}
  };

  function loadLocal(id){
    try {
      const raw = localStorage.getItem(LS_PREFIX + id);
      if (raw) { const j = JSON.parse(raw); ANS[id] = j; return j; }
    } catch(e){}
    return null;
  }

  /* ----- progressive warm-up: while the student is reading an answer,
     silently pre-fetch answers for the next 3 related questions ----- */
  UP.answers.warm = function(ids, subject){
    if (!Array.isArray(ids)) ids = [ids];
    ids.slice(0, 3).forEach((id, i) => {
      if (ANS[id]) return;
      setTimeout(() => _fetchOne(id, subject), 1500 + i * 2000);
    });
  };

  function _fetchOne(id, subject){
    if (ANS[id]) return Promise.resolve(ANS[id]);
    const q = (UP.pyq || []).find(x => x.id === id);
    if (!q) return Promise.resolve(null);
    const txt = (window.UP && UP.P) ? UP.P({ en: q.en, hi: q.hi }) : (q.en || q.hi);
    if (!txt || txt.length < 5) return Promise.resolve(null);
    const body = {
      question: txt, chapter: q.ch || 0, subject: subject || q.subject,
      cls: (q.cls || 10), lang: (window.S && S.lang) || 'en',
      imported: true, topUp: true, options: (q.opts && q.opts.length) || 0
    };
    return fetch('/api/ai/solve', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (localStorage.getItem('upay.token')||'') },
      body: JSON.stringify(body)
    }).then(r => r.json().then(j => ({ ok: r.ok, j }))).then(({ ok, j }) => {
      if (ok && j && j.approaches && j.approaches.length) {
        j._subj = subject || q.subject;
        j._id = id;
        UP.answers.set(id, j);
        return j;
      }
      return null;
    }).catch(() => null);
  }
  UP.answers.fetch = _fetchOne;

  /* Estimate cache hit rate for progress/debug */
  UP.answers.stats = function(){
    const ids = Object.keys(ANS);
    const local = Object.keys(meta).length;
    return { inMemory: ids.length, persisted: local };
  };
})();
