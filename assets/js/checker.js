/* ============================================================
   Upay — answer checker
   Works with no internet: reads the question, works it out from
   first principles, and says whether a claimed answer matches.
   Used to check AI answers, and to check the past-year bank
   itself so a wrong printed key can never reach a student.
   ============================================================ */
window.UP = window.UP || {};

UP.checker = (function () {

  const clean = (s) => String(s || '')
    .replace(/−/g, '-').replace(/[–—]/g, '-').replace(/·/g, '.')
    .replace(/×/g, 'x').replace(/÷/g, '/')
    .replace(/₹/g, ' ')
    .replace(/\b(?:Rs|INR)\b\.?/gi, ' ');

  /* every number in a string, as values (fractions and decimals both).
     Surds are folded first so "5√2" is 7.0711, not 5. */
  function nums(str) {
    const out = [];
    let pre = clean(str).replace(/(\d+(?:\.\d+)?)\s*[√]\s*(\d+(?:\.\d+)?)/g,
      (_, k, r) => ' ' + (+k * Math.sqrt(+r)) + ' ');
    /* drop thousands separators only ("1,200"), keep coordinate commas apart */
    const t = pre.replace(/(\d),(?=\d{3}(?!\d))/g, '$1').replace(/,/g, ' ');
    const re = /-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g;
    let m;
    while ((m = re.exec(t))) {
      const raw = m[0].replace(/\s+/g, '');
      if (raw.indexOf('/') !== -1) {
        const p = raw.split('/').map(Number);
        if (p[1]) out.push(p[0] / p[1]);
      } else out.push(Number(raw));
    }
    return out;
  }
  const near = (a, b) => {
    if (!isFinite(a) || !isFinite(b)) return false;
    const tol = Math.max(0.02, Math.abs(b) * 0.015);
    return Math.abs(a - b) <= tol;
  };

  /* does any number in `answer` match any of `wanted`? */
  function matches(answer, wanted) {
    const A = nums(answer);
    if (!A.length) return null;
    const W = wanted.filter(v => isFinite(v));
    if (!W.length) return null;
    for (const a of A) for (const w of W) if (near(a, w)) return true;
    return false;
  }

  /* a coordinate answer like "(4, 5)" must match both ordinates, in any order */
  function matchesPair(answer, pair) {
    const A = nums(answer);
    if (A.length < 2) return null;
    const ok = (x, y) => (near(x, pair[0]) && near(y, pair[1])) || (near(x, pair[1]) && near(y, pair[0]));
    return ok(A[0], A[1]);
  }

  /* ---------- 1. circumcentre from three vertices ---------- */
  function circumcentre(q) {
    const pts = [...clean(q).matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)]
      .map(m => [+m[1], +m[2]]);
    if (pts.length < 3 || !/circumcentre|circumcenter|परिकेंद्र/i.test(q)) return null;
    const [A, B, C] = pts;
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(d) < 1e-9) return null;
    const a2 = A[0] ** 2 + A[1] ** 2, b2 = B[0] ** 2 + B[1] ** 2, c2 = C[0] ** 2 + C[1] ** 2;
    const ux = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d;
    const uy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
    const R = Math.hypot(ux - A[0], uy - A[1]);
    return { kind: 'circumcentre', values: [ux, uy], answer: `(${+ux.toFixed(3)}, ${+uy.toFixed(3)})`, radius: +R.toFixed(3) };
  }

  /* ---------- 2. quadratic ax² + bx + c = 0 ---------- */
  function quadratic(q) {
    const raw = clean(q);
    const low = raw.toLowerCase();
    /* only when the question really is "solve this quadratic" — never for
       discriminant / nature-of-roots / "find k" questions, which a root
       finder would answer with a different number and falsely flag */
    if (/(discriminant|nature of (?:the )?roots|value of k|find k|equal roots|real roots)/i.test(low)) return null;
    if (!/(solve|roots?|zeroes?|find the roots|factorise|factorize)/i.test(low)) return null;
    const t = raw.replace(/\s+/g, '');
    const m = t.match(/(-?\d*\.?\d*)x(?:²|\^2)([+-]\d*\.?\d*)x([+-]\d+\.?\d*)=0/i);
    if (!m) return null;
    const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : +m[1];
    const b = m[2] === '+' ? 1 : m[2] === '-' ? -1 : +m[2];
    const c = +m[3];
    const D = b * b - 4 * a * c;
    if (D < 0) return { kind: 'quadratic', values: [], answer: 'no real roots', D };
    const r1 = (-b + Math.sqrt(D)) / (2 * a), r2 = (-b - Math.sqrt(D)) / (2 * a);
    return { kind: 'quadratic', values: [r1, r2], D, answer: `${+r1.toFixed(4)}, ${+r2.toFixed(4)}` };
  }

  /* ---------- 3. AP: given two terms, find d / a / aₙ / Sₙ ---------- */
  function ap(q) {
    if (!/\bA\.?P\.?\b|arithmetic progression|समांतर श्रेढ़ी/i.test(q)) return null;
    const t = clean(q).toLowerCase();
    /* "sum of n terms is 2n²+13n, find nth term" runs backwards — different job */
    if (/sum of (?:the )?first n terms|sn\s*=/i.test(t)) return null;
    if (/\bn\s*[²^]?2?\s*\+|\d+n\s*[²^]/.test(t)) return null;
    /* "nth term of an AP is 3n + 2" -> d is the coefficient */
    const lin = t.match(/n(?:th)?\s*term[^.]*?is\s*(-?\d*)n\s*([+-]\s*\d+)?/);
    if (lin && !/\d+(?:st|nd|rd|th)\s*term\s*is\s*-?\d/i.test(t)) {
      const k = lin[1] === '' || lin[1] === '+' ? 1 : lin[1] === '-' ? -1 : +lin[1];
      return { kind: 'ap-linear', values: [k], answer: `d = ${k}` };
    }
    /* two terms: "4th term ... 11" and "8th term ... 23" */
    const got = {};
    const re = /(\d+)(?:st|nd|rd|th)\s*term[^.\d]{0,22}?(-?\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(t))) got[+m[1]] = +m[2];
    const ks = Object.keys(got).map(Number).sort((x, y) => x - y);
    if (ks.length >= 2) {
      const [p, r] = [ks[0], ks[1]];
      const d = (got[r] - got[p]) / (r - p);
      const a = got[p] - (p - 1) * d;
      const vals = [a, d];
      const want = t.match(/sum of (?:the )?(?:first\s*)?(\d+)/);
      if (want) {
        const n = +want[1];
        vals.push(n * (2 * a + (n - 1) * d) / 2);        /* Sn */
        vals.push(a + (n - 1) * d);                       /* aₙ as well */
      }
      return { kind: 'ap', values: vals, answer: `a = ${+a.toFixed(3)}, d = ${+d.toFixed(3)}`, a, d };
    }
    return null;
  }

  /* ---------- 4. probability without replacement ---------- */
  function probability(q) {
    const t = clean(q).toLowerCase();
    const m = t.match(/(\d+)\s*red[^.]{0,30}?(\d+)\s*(?:blue|black|green|white|yellow)/);
    if (!m) return null;
    if (!/without replacement|one after another|both are|two are drawn/i.test(t)) return null;
    const red = +m[1], other = +m[2], total = red + other;
    const both = (red / total) * ((red - 1) / (total - 1));
    return { kind: 'probability', values: [both, +both.toFixed(4)], answer: `${+both.toFixed(4)}` };
  }

  /* ---------- 5. simple interest ---------- */
  function simpleInterest(q) {
    const t = clean(q).toLowerCase();
    if (!/simple interest/.test(t)) return null;
    const m = t.match(/(\d+(?:\.\d+)?)[^\d]{0,60}?amounts?\s*to\s*(\d+(?:\.\d+)?)[^\d]{0,40}?(\d+(?:\.\d+)?)\s*year/);
    if (!m) return null;
    const P = +m[1], A = +m[2], T = +m[3];
    const R = (A - P) * 100 / (P * T);
    return { kind: 'simple-interest', values: [R], answer: `${+R.toFixed(3)}% per annum` };
  }

  /* ---------- 6. midpoint ---------- */
  function midpoint(q) {
    if (!/midpoint|mid-point|मध्यबिंदु/i.test(q)) return null;
    const pts = [...clean(q).matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map(m => [+m[1], +m[2]]);
    if (pts.length < 2) return null;
    const x = (pts[0][0] + pts[1][0]) / 2, y = (pts[0][1] + pts[1][1]) / 2;
    return { kind: 'midpoint', values: [x, y], answer: `(${+x.toFixed(3)}, ${+y.toFixed(3)})` };
  }

  /* ---------- 7. distance between two points ---------- */
  function distance(q) {
    if (!/distance/i.test(q)) return null;
    if (!/(find|calculate|determine)[^.]{0,40}distance|distance[^.]{0,25}(?:is|between)/i.test(q)) return null;
    if (/(show that|show using|prove|verify|hence (?:find|show)|^[^.]{0,60}\bPQ is a tangent)/i.test(q)) return null;
    const pts = [...clean(q).matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map(m => [+m[1], +m[2]]);
    if (pts.length < 2) return null;
    const d = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    return { kind: 'distance', values: [d], answer: `${+d.toFixed(4)}` };
  }

  /* ---------- 8. HCF × LCM identity ---------- */
  function hcfLcm(q) {
    const t = clean(q).toLowerCase();
    if (!/(hcf|lcm|highest common factor|least common multiple)/.test(t)) return null;
    /* "HCF(98,28)=m, LCM(98,28)=n, find n − 7m" style — a blind pair answer
       would flag a correct key, so only fire when the ask is unambiguous */
    if (/(n\s*[-−+]\s*\d*m|\d*m\b.*n\b|expressed as|find the value of m\b|are the prime factors|prime factorisation|hcf\s*\(.*\)\s*=)/i.test(t)) return null;
    const productRule = /product of the (?:two )?(?:numbers|hcf and lcm)|other number|one (?:number|of them) is/.test(t);
    const hf = t.match(/hcf[^\d]{0,25}?(\d+)/);
    const lc = t.match(/lcm[^\d]{0,25}?(\d+)/);
    if (productRule && hf && lc) {
      const H = +hf[1], L = +lc[1];
      const known = (t.match(/one (?:number|of them) is\s*(\d+)|(\d+)\s*is one/i) || []);
      const k = +(known[1] || known[2] || 0);
      if (k) return { kind: 'hcf-lcm', values: [H * L / k, H * L], product: H * L,
                      answer: `other number = ${H * L / k}` };
    }
    if (!/(find|calculate|determine)\s+(?:the\s+)?(?:hcf|lcm)/.test(t)) return null;
    const pair = t.match(/(\d+)\s*(?:and|,)\s*(\d+)/);
    if (!pair) return null;
    const a = +pair[1], b = +pair[2];
    const g = (x, y) => y ? g(y, x % y) : x;
    const h = g(a, b), l = a * b / h;
    return { kind: 'hcf-lcm', values: [h, l, a * b], product: a * b, answer: `HCF = ${h}, LCM = ${l}` };
  }

  /* ---------- 9. a plain surd/trig evaluation like sin²30 + cos²45 − ... ---------- */
  function trigEval(q) {
    let t = clean(q).toLowerCase()
      .replace(/evaluate|find the value of|simplify|मान ज्ञात कीजिए|:/g, ' ')
      .replace(/\s+/g, ' ');
    if (!/(sin|cos|tan|cot|sec|cosec)/.test(t)) return null;
    /* keep only the mathematical part */
    const from = t.search(/(sin|cos|tan|cot|sec|cosec)/);
    t = t.slice(from).replace(/[^0-9+\-*/().²°a-z]/g, '').replace(/[.]+$/, '');
    if (/[+\-*/.]$/.test(t)) t = t.replace(/[+\-*/.]+$/, '');
    const V = { sin: { 0: 0, 30: .5, 45: Math.SQRT1_2, 60: Math.sqrt(3) / 2, 90: 1 },
                cos: { 0: 1, 30: Math.sqrt(3) / 2, 45: Math.SQRT1_2, 60: .5, 90: 0 },
                tan: { 0: 0, 30: 1 / Math.sqrt(3), 45: 1, 60: Math.sqrt(3) } };
    let expr = t.replace(/sin²/g, 'sin^2').replace(/cos²/g, 'cos^2').replace(/tan²/g, 'tan^2')
                .replace(/cot²/g, 'cot^2').replace(/sec²/g, 'sec^2').replace(/cosec²/g, 'cosec^2');
    expr = expr.replace(/°/g, '').replace(/−/g, '-');
    let unknowns = 0;
    expr = expr.replace(/(cosec|cot|sec|sin|cos|tan)\^2(\d+)/g, (_, f, deg) => {
      const d = +deg;
      let v;
      if (f === 'sin') v = V.sin[d]; else if (f === 'cos') v = V.cos[d]; else if (f === 'tan') v = V.tan[d];
      else if (f === 'sec') v = 1 / V.cos[d];
      else if (f === 'cosec') v = 1 / V.sin[d];
      else if (f === 'cot') v = 1 / V.tan[d];
      if (v === undefined) { unknowns++; return 'NaN'; }
      return '(' + v * v + ')';
    }).replace(/(cosec|cot|sec|sin|cos|tan)(\d+)/g, (_, f, deg) => {
      const d = +deg;
      let v;
      if (f === 'sin') v = V.sin[d]; else if (f === 'cos') v = V.cos[d]; else if (f === 'tan') v = V.tan[d];
      else if (f === 'sec') v = 1 / V.cos[d];
      else if (f === 'cosec') v = 1 / V.sin[d];
      else if (f === 'cot') v = 1 / V.tan[d];
      if (v === undefined) { unknowns++; return 'NaN'; }
      return '(' + v + ')';
    });
    if (unknowns || /[a-z]/i.test(expr.replace(/nan/gi, ''))) return null;
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
    let val;
    try { val = Function('"use strict";return (' + expr + ')')(); } catch (e) { return null; }
    if (!isFinite(val)) return null;
    return { kind: 'trig-value', values: [val, +val.toFixed(4)], answer: `${+val.toFixed(4)}` };
  }

  /* ---------- 10. median of a grouped frequency table ---------- */
  function groupedMedian(q) {
    const t = clean(q);
    if (!/median/i.test(t)) return null;
    const rows = [...t.matchAll(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*:?\s*(\d+)/g)]
      .map(m => [+m[1], +m[2], +m[3]]);
    if (rows.length < 3) return null;
    const N = rows.reduce((s, r) => s + r[2], 0);
    const half = N / 2;
    let cf = 0;
    for (const [lo, hi, f] of rows) {
      if (cf + f >= half) {
        const h = hi - lo;
        const med = lo + ((half - cf) / f) * h;
        return { kind: 'median', values: [med, +med.toFixed(2)], N, answer: `${+med.toFixed(2)}` };
      }
      cf += f;
    }
    return null;
  }


  /* ---------- 11. trig equation: "7 + 4 sin θ = 9" -> θ ---------- */
  function trigEquation(q) {
    const t = clean(q).toLowerCase();
    const m = t.match(/(-?\d+(?:\.\d+)?)\s*([+\-])\s*(\d+(?:\.\d+)?)\s*(sin|cos|tan)\s*(?:θ|theta|a|b|x)?\s*(?:deg)?\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return null;
    const [, c0, op, k, fn, rhs] = m;
    /* c0 ± k·fn = rhs */
    let v = (Number(rhs) - Number(c0)) / (op === '+' ? Number(k) : -Number(k));
    const V = {
      sin: { 0: 0, 30: .5, 45: Math.SQRT1_2, 60: Math.sqrt(3) / 2, 90: 1 },
      cos: { 0: 1, 30: Math.sqrt(3) / 2, 45: Math.SQRT1_2, 60: .5, 90: 0 },
      tan: { 0: 0, 30: 1 / Math.sqrt(3), 45: 1, 60: Math.sqrt(3) }
    }[fn];
    if (!V || !isFinite(v)) return null;
    for (const deg of Object.keys(V)) {
      if (Math.abs(V[deg] - v) < 1e-9) {
        return { kind: 'trig-equation', values: [+deg], answer: `${deg}°` };
      }
    }
    return null;
  }

  /* ---------- 12. empirical relation: mode = 3 median - 2 mean ---------- */
  function empiricalRelation(q) {
    const t = clean(q).toLowerCase();
    if (!/mode/.test(t) || !/median/.test(t) || !/mean/.test(t)) return null;
    if (/(frequency|f\s*=|p\s*=|q\s*=)/.test(t)) return null;
    /* symbolic answers like "17x" are out of scope — refuse rather than guess */
    if (/\d\s*[a-z]\b/i.test(t.replace(/[^\w\s.]/g, ' '))) return null;
    /* only the plain "two of the three are given" shape */
    if (!/(?:are|is|of)\s*-?\d+(?:\.\d+)?\s*(?:and|,)/.test(t)) return null;
    /* "mean is 43", "are 43 and 40", "mean = 43" — the number right after the
       name, never the first number in the sentence */
    const num = (name) => {
      const m = t.match(new RegExp(name + '[^a-z0-9]{0,8}(?:is|are|=|:)[^0-9-]{0,6}(-?[0-9]+(?:[.][0-9]+)?)'));
      return m ? Number(m[1]) : NaN;
    };
    const mean = num('mean');
    const med = num('median');
    const mode = num('mode');
    const f = (a, b) => 3 * a - 2 * b;
    if (isFinite(mean) && isFinite(med) && !isFinite(mode)) {
      const M = f(med, mean);
      return { kind: 'empirical', values: [M], answer: `mode = ${+M.toFixed(3)}` };
    }
    if (isFinite(mean) && isFinite(mode) && !isFinite(med)) {
      const Md = (Number(mode) + 2 * Number(mean)) / 3;
      return { kind: 'empirical', values: [Md], answer: `median = ${+Md.toFixed(3)}` };
    }
    if (isFinite(med) && isFinite(mode) && !isFinite(mean)) {
      const Mn = (3 * Number(med) - Number(mode)) / 2;
      return { kind: 'empirical', values: [Mn], answer: `mean = ${+Mn.toFixed(3)}` };
    }
    return null;
  }


  /* ---------- 13. probability from a deck ----------------------------------- */
  function cardProbability(q) {
    const t = clean(q).toLowerCase();
    if (!/probabilit/.test(t)) return null;
    if (!/deck|pack of|52 cards|pack of cards/.test(t)) return null;
    if (!/card/.test(t)) return null;
    /* only the plain single-draw shapes we can be certain about. Combined
       events ("an ace or a ten"), removals and multi-part asks are refused
       outright — a single-card count would falsely flag a correct key. */
    if (/(two|three) cards|one after another|without replacement|neither|at least|at most|assertion|removed|remaining|shuffled|\(i\)|\(ii\)| ace or| or a | or an | and a /i.test(t)) return null;
    const D = 52;
    let good = null, label = '';
    if (/red face card/.test(t)) { good = 6; label = 'red face card'; }
    else if (/black face card/.test(t)) { good = 6; label = 'black face card'; }
    else if (/a face card|face cards?/.test(t)) { good = 12; label = 'face card'; }
    else if (/red cards?/.test(t)) { good = 26; label = 'red card'; }
    else if (/black cards?/.test(t)) { good = 26; label = 'black card'; }
    else if (/\ba king\b|\bkings\b/.test(t)) { good = 4; label = 'king'; }
    else if (/\bqueens?\b/.test(t)) { good = 4; label = 'queen'; }
    else if (/\bjacks?\b/.test(t)) { good = 4; label = 'jack'; }
    else if (/\baces?\b/.test(t)) { good = 4; label = 'ace'; }
    else if (/spades?/.test(t)) { good = 13; label = 'spade'; }
    else if (/hearts?/.test(t)) { good = 13; label = 'heart'; }
    else if (/diamonds?/.test(t)) { good = 13; label = 'diamond'; }
    else if (/clubs?/.test(t)) { good = 13; label = 'club'; }
    if (good === null) return null;
    const p = good / D;
    return { kind: 'card-probability', values: [p, +p.toFixed(4)], answer: `${good}/${D}` };
  }

  /* ---------- 14. two dice ------------------------------------------------ */
  function diceProbability(q) {
    const t = clean(q).toLowerCase();
    if (!/probabilit/.test(t)) return null;
    if (!/dice|die\b/.test(t)) return null;
    if (/(assertion|at least|at most|neither|without)/.test(t)) return null;
    const bothSame = /both (?:the )?(?:obtained )?(?:numbers )?(?:are )?(?:even|odd)/.test(t);
    if (bothSame) {
      const even = /even/.test(t);
      const p = even ? (3 * 3) / 36 : (3 * 3) / 36;
      return { kind: 'dice', values: [p, +p.toFixed(4)], answer: `${even ? 9 : 9}/36 = 1/4` };
    }
    /* "sum is k" with two fair dice */
    const sum = t.match(/sum (?:of (?:the )?(?:numbers )?(?:obtained )?)?(?:is|equals|of)\s*(\d+)/);
    if (sum) {
      const k = +sum[1];
      if (k < 2 || k > 12) return null;
      const ways = 6 - Math.abs(k - 7);
      return { kind: 'dice', values: [ways / 36, +((ways / 36).toFixed(4))], answer: `${ways}/36` };
    }
    /* "difference is k" */
    const diff = t.match(/difference[^\d]{0,30}?(\d+)/);
    if (diff) {
      const k = +diff[1];
      if (k < 0 || k > 5) return null;
      const ways = 2 * (6 - k);
      return { kind: 'dice', values: [ways / 36, +((ways / 36).toFixed(4))], answer: `${ways}/36` };
    }
    return null;
  }

  const SOLVERS = [circumcentre, quadratic, ap, probability, simpleInterest,
                   midpoint, distance, hcfLcm, trigEval, groupedMedian,
                   trigEquation, empiricalRelation, cardProbability, diceProbability];

  /* ---------- the public entry ---------- */
  /* check(q, claimed) -> {ok, computed, answer} | null when it cannot tell */
  function check(question, claimed) {
    /* A chapter overview ("Chapter 8 · 7 marks · exam-favourite") is not an
       answer. Only a claimed value that actually carries a number may be
       judged — otherwise the checker would "disagree" with a heading. */
    const claim = String(claimed == null ? '' : claimed).trim();
    if (!claim) return null;
    if (!/[0-9]/.test(claim)) return null;
    if (/^chapter\b|marks?\b|^topic\b/i.test(claim) && !/^\s*[-−]?\d/.test(claim)) return null;
    for (const s of SOLVERS) {
      let res;
      try { res = s(question); } catch (e) { res = null; }
      if (!res) continue;
      if (!res.values.length) return null;
      const pairKind = res.kind === 'midpoint' || res.kind === 'circumcentre';
      const ok = pairKind ? matchesPair(claimed, res.values) : matches(claimed, res.values);
      if (ok === null) return null;
      return { ok, computed: res.answer, answer: res.answer, kind: res.kind };
    }
    return null;
  }

  /* can this question be checked offline at all? */
  function canCheck(question) {
    for (const s of SOLVERS) {
      try { const r = s(question); if (r && r.values && r.values.length) return true; } catch (e) { /* next */ }
    }
    return false;
  }

  return { check, canCheck, nums, matches, circumcentre, quadratic, ap, probability,
           simpleInterest, midpoint, distance, hcfLcm, trigEval, groupedMedian };
})();
