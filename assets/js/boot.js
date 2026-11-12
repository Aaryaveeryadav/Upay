/* =====================================================================
   Upay · boot.js  —  fast parallel loader
   Strategy for first paint:
     1. CRITICAL_CORE: scripts required for app.js to render the home page.
        These are fetched in parallel (Promise.all) and executed in order.
     2. POST_PAINT: data that only accelerates autocomplete, starter cards,
        older PYQ years, etc. Loaded on idle after first render.
     3. Subject packs lazy-loaded on subject switch (unchanged).
   ===================================================================== */
(function () {
  window.UP = window.UP || {};
  UP.pyq = [];
  UP.chapters = [];
  UP.loaded = { core: false, postPaint: false, packs: {} };
  const loaded = new Set();
  const loading = {};

  function loadScript(src, opts) {
    if (loaded.has(src)) return Promise.resolve();
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;                 // preserve execution order
      if (opts && opts.defer) s.defer = true;
      if (opts && opts.fetchPriority) s.fetchPriority = opts.fetchPriority;
      s.onload = function () { loaded.add(src); resolve(); };
      s.onerror = function () { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }

  // Load an unordered batch in parallel while preserving exec order via .async=false
  function loadParallel(list, opts) {
    return Promise.all(list.map(function (s) { return loadScript(s, opts); }));
  }

  /* --- CRITICAL CORE: required before app.js boots --- */
  const CRITICAL_CORE = [
    'assets/js/data-extra.js?v=26b5',
    'assets/js/data/chapters1.js',
    'assets/js/data/chapters2.js',
    'assets/js/data/pyq.js',
    'assets/js/data/pyq-2024.js',
    'assets/js/data/pyq-keys.js',
    'assets/js/data/chapters12-maths.js',   // Class 12 Maths KB + PYQ seed (must load AFTER pyq.js which resets UP.pyq)
    'assets/js/data/chapters12-applied-maths.js',  // Class 12 Applied Maths KB + PYQ seed
    'assets/js/data/chapters12-accountancy.js', // Class 12 Accountancy + Computerised Accounting chapter maps
    'assets/js/data/accountancy-chapters.js?v=26ab', // extracted NCERT outline: objectives and numbered sections
    'assets/js/data/business-studies12.js?v=26b5', // CBSE English outlines
    'assets/js/data/economics12.js?v=26ab', // Class 12 Economics guides, including deep links
    'assets/js/data/economics-sources.js?v=26ab', // the original Economics PDF catalogue
    'assets/js/data/english12.js?v=26ab', // Class 12 English reading notes and direct links
    'assets/js/data/english12-sources.js?v=26ab', // original chapter PDFs (removed; kept as provenance)
    'assets/js/data/chapter-summary.js?v=26ab', // extracted Class 12 chapter study summaries
    'assets/js/data/class12-original-test-papers.js?v=26ab', // supplied Economics, Biology and English papers, source only
    'assets/js/data/pyq-cbse2025-cls12.js', // CBSE 2025 (series 65/) Class 12 Maths PYQs
    'assets/js/data/pyq-accountancy-2023-2026-extracted.js?v=26ab', // 34 source-tagged Accountancy papers, loaded into both Class 12 tracks
    'assets/js/data/accountancy-original-papers.js?v=26ab', // source-only PDFs, not searchable questions
    'assets/js/data/mcq-keyed.js',
    'assets/js/data/question-overrides.js', // question-bank curation, applied once packs are in
    'assets/js/approach-enrich.js?v=26ab',
      'assets/js/maths-solvers.js',  // attaches three solution methods to every PYQ (all classes/subjects)
    'assets/js/data/figures-c12.js',
      'assets/js/physics-solvers.js',
      'assets/js/chemistry-solvers.js',
      'assets/js/data/figures-physics.js', // embedded page-image diagrams for 33 Class 12 2025 Qs
    'assets/js/corrupt_gate.js',
    'assets/js/solver-core.js',
    'assets/js/solver-arith.js',
    'assets/js/solver-geo.js',
    'assets/js/solver-route.js',
    'assets/js/figures.js',
    'assets/js/checker.js',
    'assets/js/testgen.js',
    'assets/js/panel.js',
    'assets/js/answers.js'
  ];

  /* --- POST_PAINT: non-critical, loaded after first render --- */
  const POST_PAINT = [
    'assets/js/data/quotes.js',
    'assets/js/data/snippets.js',
    'assets/js/data/pyq-old.js'
  ];

  /* --- Subject packs (lazy) --- */
  const PACKS = {
    maths:   [],
    science: [
      'assets/science/science10.js',
      'assets/science/hindi10-ch.js',
      'assets/js/data/science10-q.js',
      'assets/js/data/pyq-science.js'
    ],
    social: [
      'assets/js/data/social-chapters.js',
      'assets/js/data/social10-q.js',
      'assets/js/data/pyq-social.js'
    ],
    hindi: [
      'assets/js/data/hindi-extra.js',
      'assets/js/data/hindi10-q.js',
      'assets/js/data/hindi10-rich.js',
      'assets/js/data/pyq-hindi-final.js',
      'assets/js/data/pyq-hindi-a5b4.js',
      'assets/js/data/pyq-hindi-a6b5.js'
    ],
    english: [
      'assets/js/data/english10-ff.js',
      'assets/js/data/english10-fp.js',
      'assets/js/data/english10.js',
      'assets/js/data/pyq-english.js'
    ],
    sanskrit: [
      'assets/sanskrit/sanskrit10-ch.js',
      'assets/sanskrit/sanskrit10-rich.js',
      'assets/sanskrit/sanskrit10-q.js',
      'assets/sanskrit/sanskrit-papers.js'
    ],
    physics: [
      'assets/js/data/physics12.js',
      'assets/js/data/physics-outlines.js?v=26b5', // CBSE 2026–27 outline view per chapter
      'assets/js/data/pyq-physics-2025.js'
    ],
    chemistry: [
      'assets/js/data/chemistry12.js',
      'assets/js/data/chemistry-outlines.js', // CBSE 2026–27 outline view per unit, attached to each chemistry chapter
      'assets/js/data/pyq-chemistry-2022.js?v=25e',
      'assets/js/data/pyq-chemistry-2023.js?v=25e',
      'assets/js/data/pyq-chemistry-2025.js?v=25e'
    ],
    biology: [
      'assets/js/data/biology-outlines.js' // CBSE 2026–27 outline view + verified source-crop figures per chapter
    ],
    economics: [], // guide and source catalogue are loaded in CRITICAL_CORE
    // Loaded in CRITICAL_CORE because their chapter maps and PYQ bank are a
    // self-contained app feature; these empty packs make saved subjects valid
    // for the boot-time subject check and the standard switchSubject path.
    'business-studies': [], // outline data is in the critical core
    accountancy: [],
    'computerized-accounting': []
  };

  const BOARD_PACKS = {
    rajasthan: ['assets/js/data/rbse-chapters.js', 'assets/js/data/rbse.js']
  };

  UP.loadPack = function (name) {
    if (!PACKS[name] || UP.loaded.packs[name]) return Promise.resolve();
    UP.loaded.packs[name] = true;
    return loadParallel(PACKS[name]).then(foldLiteratureIntoBank);
  };
  UP.loadBoardPack = function (name) {
    const key = 'board:' + name;
    if (!BOARD_PACKS[name] || UP.loaded.packs[key]) return Promise.resolve();
    UP.loaded.packs[key] = true;
    return loadParallel(BOARD_PACKS[name]).then(foldLiteratureIntoBank);
  };

  function foldLiteratureIntoBank() {
    UP.pyq = UP.pyq || [];
    const existingIds = new Set(UP.pyq.map(q => q.id));
    function pushQ(q) { if (!existingIds.has(q.id)) { UP.pyq.push(q); existingIds.add(q.id); } }

    /* Backfill: any literature/sample PYQ with ch=null gets assigned ch = 1 of its subject
       so it doesn't disappear from chapter-filtered practice views. Better heuristic mapping
       is done per-subject in the individual PYQ loader scripts where they can. */
    (UP.pyq || []).forEach(function (q) {
      if (q && q.subject && (q.ch == null) && q.cls === 10) {
        // defer to catalogue at runtime? No, set ch to a sentinel "0" meaning "misc" and
        // treat 0 as a "general" chapter that always appears
        q.ch = 0;
      }
    });
    if (UP.english10) {
      UP.english10.forEach(function (ch, idx) {
        if (!ch || !ch.exercises) return;
        ch.exercises.forEach(function (raw, ei) {
          splitExerciseQs(raw).forEach(function (txt, qi) {
            if (txt.length < 8) return;
            pushQ({ id: 'eng10-' + (ch.id || ch.bookCode || idx) + '-q' + (qi + 1),
              cls: 10, subject: 'english', board: 'cbse', ch: ch.id || ('eng-' + idx),
              m: 2, kind: 'saq', d: 2, lv: 'Standard', en: txt, hi: '', ans: '', opts: null,
              src: (ch.book || 'First Flight') + ' · ' + (ch.en || ch.title || '') });
          });
        });
      });
    }
    if (UP.hindi10Chapters) {
      UP.hindi10Chapters.forEach(function (ch, idx) {
        const exs = ch.exercises || ch.questions || [];
        exs.forEach(function (raw, ei) {
          if (typeof raw === 'string') {
            splitExerciseQs(raw).forEach(function (txt, qi) {
              if (txt.length < 6) return;
              pushQ({ id: 'hind10-' + (ch.id || idx) + '-q' + (qi + 1),
                cls: 10, subject: 'hindi', board: 'cbse', ch: ch.id || ('hnd-' + idx),
                m: 2, kind: 'saq', d: 2, lv: 'Standard', en: '', hi: txt, ans: '', opts: null,
                src: ch.en || ch.hi || '' });
            });
          }
        });
      });
    }
    if (UP.sanskrit10Chapters) {
      UP.sanskrit10Chapters.forEach(function (ch, idx) {
        const exs = ch.exercises || ch.questions || [];
        exs.forEach(function (raw, ei) {
          if (typeof raw === 'string') {
            splitExerciseQs(raw).forEach(function (txt, qi) {
              if (txt.length < 6) return;
              pushQ({ id: 'san10-' + (ch.id || idx) + '-q' + (qi + 1),
                cls: 10, subject: 'sanskrit', board: 'cbse', ch: ch.id || ('san-' + idx),
                m: 2, kind: 'saq', d: 2, lv: 'Standard', en: '', hi: txt, sa: '', ans: '', opts: null,
                src: ch.en || ch.hi || '' });
            });
          }
        });
      });
    }
    // pyq-old, if loaded, folds via UP.pyq = UP.pyq.concat(...) at end of that file
    applyCuration();
  }

  /* Question-bank curation.
     The source data files are left untouched; assets/js/data/question-overrides.js
     carries the corrections computed by tools/curate/build-curation.js. Entries
     that hold no question are held back, duplicate ids are given fresh names so
     no content is lost, and print debris is stripped from the text. Applied once
     per record, so repeated calls after each pack load are safe. */
  function applyCuration() {
    const ov = UP.questionOverrides;
    if (!ov || !UP.pyq || !UP.pyq.length) return;
    const dropSet = new Set((ov.drop || []).concat(ov.duplicates || []));
    const renames = ov.renames || {};
    const patched = ov.patched || {};
    const taken = new Set();
    const out = [];

    for (let i = 0; i < UP.pyq.length; i++) {
      const q = UP.pyq[i];
      if (!q || typeof q !== 'object') continue;

      if (q.__curated) {
        taken.add(q.id);
        out.push(q);
        continue;
      }
      if (dropSet.has(q.id)) continue;
      q.__curated = true;

      const fix = patched[q.id];
      if (fix) {
        if (fix.en !== undefined) q.en = fix.en;
        if (fix.hi !== undefined) q.hi = fix.hi;
      }

      if (taken.has(q.id)) {
        const candidates = renames[q.id] || [];
        let fresh = null;
        for (let c = 0; c < candidates.length; c++) {
          if (!taken.has(candidates[c])) { fresh = candidates[c]; break; }
        }
        for (let n = 2; !fresh; n++) {
          const alt = q.id + '-d' + n;
          if (!taken.has(alt)) fresh = alt;
        }
        q.id = fresh;
      }

      taken.add(q.id);
      out.push(q);
    }
    UP.pyq = out;
  }

  function splitExerciseQs(raw) {
    if (!raw) return [];
    const out = []; let buf = '';
    const parts = String(raw).split(/\s*(?:^|\n)\s*(?:\d+|[१२३४५६७८९०]+)\s*[\.\)\u0964]\s+/);
    parts.forEach(function (p) {
      const t = p.trim();
      if (t.length > 4) out.push(t.replace(/\s+/g, ' ').slice(0, 300));
    });
    if (!out.length) { const t = String(raw).trim(); if (t.length > 4) out.push(t.slice(0, 300)); }
    return out;
  }

  function bootApp() {
    UP.loaded.core = true;
    foldLiteratureIntoBank();
    UP.answers.loadSeed(lastSubject);
    document.documentElement.classList.add('up-ready');
    if (typeof UP._onCoreReady === 'function') UP._onCoreReady();
    return loadScript('assets/js/app.js?v=26b5');
  }

  function loadPostPaint() {
    if (UP.loaded.postPaint) return;
    UP.loaded.postPaint = true;
    loadParallel(POST_PAINT, { defer: true }).then(foldLiteratureIntoBank).catch(function () {});
  }

  function savedString(key, fallback) {
    try {
      const raw = localStorage.getItem('upay.' + key);
      if (!raw) return fallback;
      // app.js stores strings as JSON; retain compatibility with older raw values.
      try { const parsed = JSON.parse(raw); return typeof parsed === 'string' ? parsed : fallback; }
      catch (e) { return raw; }
    } catch (e) { return fallback; }
  }
  let lastSubject = savedString('subject', 'maths');
  const lastBoard = savedString('board', 'cbse');
  if (!PACKS[lastSubject]) lastSubject = 'maths';

  loadParallel(CRITICAL_CORE)
    .then(function () { return Promise.all([UP.loadPack(lastSubject), UP.loadBoardPack(lastBoard)]); })
    .then(bootApp)
    .then(function () {
      // Defer post-paint work until the browser is idle or after a short delay
      if ('requestIdleCallback' in window) requestIdleCallback(loadPostPaint, { timeout: 1500 });
      else setTimeout(loadPostPaint, 400);
    })
    .catch(function (err) {
      console.error('Upay boot failed:', err);
      const view = document.getElementById('view');
      if (view) view.innerHTML = '<div class="page" style="padding:40px;text-align:center"><h2>Could not load Upay</h2><p>' + (err.message || 'network error') + '</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>';
    });

  UP.switchSubject = function (subject) {
    return UP.loadPack(subject).then(function () { foldLiteratureIntoBank(); return UP.answers.loadSeed(subject); });
  };

  /* Allow app.js to request post-paint assets sooner if it needs them */
  UP.loadPostPaint = loadPostPaint;
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
