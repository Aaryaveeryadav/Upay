'use strict';
/* ============================================================================
   Deterministic answer checker.

   WHY THIS FILE EXISTS
   The app's second pass asked the same model to check the first one. Measured on
   this bank it was wrong in BOTH directions:
     - it marked k = 6 "verified" when the correct answer is k = 3
     - it rejected five correct answers (m = 4, 89 numbers, 718·67 cm³, ratio 3:5
       with x = 9, and a four-part probability that all four parts were right)

   You told me a correct key must never be flagged, and that a NO-CHECK is better
   than a false FAIL. A model checking a model cannot honour that rule. These
   questions are arithmetic: where the numbers can be read out of the question,
   the answer can be computed exactly, with no model in the loop.

   So: compute it. If this file can settle the question, its verdict wins. If it
   cannot, the answer is reported as NOT CHECKED -- never as "verified".
   ========================================================================== */

const TOL = (x) => Math.max(0.02, Math.abs(x) * 1e-3);

const n = (s) => Number(String(s).replace(/[−–—]/g, '-'));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/* every number in a claimed answer, including fractions like 3/7 and 2·5 */
function claimedNumbers(text) {
  const t = String(text || '').replace(/[−–—]/g, '-').replace(/·/g, '.');
  const out = [];
  for (const m of t.matchAll(/(\d+)\s*\/\s*(\d+)/g)) out.push(Number(m[1]) / Number(m[2]));
  for (const m of t.matchAll(/-?\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  return out;
}
const mentions = (text, want) => claimedNumbers(text).some((v) => Math.abs(v - want) <= TOL(want));

/* ---------------------------------------------------------------- helpers */
function pointsIn(text) {
  return [...String(text).matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
    .map((m) => [n(m[1]), n(m[2])]);
}
const shoelace = (p) => Math.abs(p.reduce((s, q, i) => {
  const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1];
}, 0)) / 2;

/* ------------------------------------------------------------- the checks */
/* Each returns {answer, how} -- a number, an array of numbers, or {parts:[...]}
   -- or null when the question cannot be read with confidence. */
const CHECKS = [];

/* probability from counted objects in a container */
CHECKS.push(function probabilityCounts(q) {
  const box = q.match(/(\d+)\s+(red|yellow|blue|black|white|green|orange)\b/gi);
  if (!box || box.length < 2) return null;
  const parts = box.map((b) => {
    const m = b.match(/(\d+)\s+(\w+)/); return [m[2].toLowerCase(), Number(m[1])];
  });
  const total = parts.reduce((s, p) => s + p[1], 0);
  const get = (c) => (parts.find((p) => p[0] === c) || [0, 0])[1];
  const out = [];
  if (/\(i\)/.test(q) && /\bblue\b/i.test(q)) out.push(get('blue') / total);
  if (/not a yellow|not yellow/i.test(q)) out.push((total - get('yellow')) / total);
  if (/neither yellow nor.*blue/i.test(q)) out.push((total - get('yellow') - get('blue')) / total);
  if (!out.length) return null;
  return { answer: { parts: out }, how: `counted over ${total}` };
});

/* sum of the first N terms of an AP */
CHECKS.push(function apSum(q) {
  const m = q.match(/sum of (?:the )?first (\d+) terms/i);
  if (!m) return null;
  const N = Number(m[1]);
  let a = null, d = null;
  const nth = q.match(/nth term is\s*\(?\s*(\d*)n\s*([+-]\s*\d+)?\s*\)?/i);
  if (nth) { d = nth[1] ? Number(nth[1]) : 1; a = d + (nth[2] ? n(nth[2].replace(/\s/g, '')) : 0); }
  if (a === null) {
    const ap = q.match(/(?:A\.P\.?|AP)\s*[: ]\s*(-?\d+)\s*,\s*(-?\d+)/i);
    if (ap) { a = Number(ap[1]); d = Number(ap[2]) - a; }
  }
  if (a === null || d === null) return null;
  return { answer: (N / 2) * (2 * a + (N - 1) * d), how: `a=${a}, d=${d}, n=${N}` };
});

/* area of a triangle given three points */
CHECKS.push(function triangleArea(q) {
  const p = pointsIn(q);
  if (p.length !== 3 || !/area/i.test(q) || /quadrilateral/i.test(q)) return null;
  return { answer: shoelace(p), how: 'shoelace on the three given points' };
});

/* area of a quadrilateral given four points */
CHECKS.push(function quadArea(q) {
  const p = pointsIn(q);
  if (p.length !== 4 || !/area/i.test(q)) return null;
  return { answer: shoelace(p), how: 'shoelace in the stated order' };
});

/* distance between two points */
CHECKS.push(function distance(q) {
  const seg = q.match(/distance between the points?\s*(\(\s*-?\d+\s*,\s*-?\d+\s*\))\s*and\s*(\(\s*-?\d+\s*,\s*-?\d+\s*\))/i);
  if (!seg) return null;
  const p = pointsIn(seg[1])[0], r = pointsIn(seg[2])[0];
  return { answer: Math.hypot(r[0] - p[0], r[1] - p[1]), how: 'distance formula' };
});

/* midpoint */
CHECKS.push(function midpoint(q) {
  const seg = q.match(/(\(\s*-?\d+\s*,\s*-?\d+\s*\))\s*and\s*(\(\s*-?\d+\s*,\s*-?\d+\s*\))/);
  if (!seg || !/mid-?point/i.test(q)) return null;
  const p = pointsIn(seg[1])[0], r = pointsIn(seg[2])[0];
  return { answer: [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2], how: 'midpoint formula' };
});

/* sum of 3-digit multiples of k */
CHECKS.push(function threeDigitMultiples(q) {
  const m = q.match(/three[- ]digit natural numbers?,?\s*(?:which are\s*)?multiples of\s*(\d+)/i);
  if (!m) return null;
  const k = Number(m[1]); let s = 0, c = 0;
  for (let i = 100; i <= 999; i++) if (i % k === 0) { s += i; c++; }
  return { answer: s, how: `${c} multiples of ${k}` };
});

/* how many numbers between a and b are divisible by both p and q */
CHECKS.push(function countBoth(q) {
  const m = q.match(/between\s*(\d+)\s*and\s*(\d+)[^.]*divisible by both\s*(\d+)\s*and\s*(\d+)/i);
  if (!m) return null;
  const lo = Number(m[1]), hi = Number(m[2]), L = lcm(Number(m[3]), Number(m[4]));
  let c = 0; for (let i = lo + 1; i < hi; i++) if (i % L === 0) c++;
  return { answer: c, how: `multiples of lcm ${L} strictly between ${lo} and ${hi}` };
});

/* LCM / HCF of two numbers */
CHECKS.push(function lcmHcf(q) {
  const m = q.match(/(?:HCF|LCM)[^.]*?(\d{2,5})\s*and\s*(\d{2,5})/i);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  const h = gcd(a, b), l = lcm(a, b);
  if (/find (?:the )?lcm/i.test(q)) return { answer: l, how: `HCF=${h}` };
  if (/find (?:the )?hcf/i.test(q)) return { answer: h, how: `LCM=${l}` };
  return null;
});

/* equal roots: find k */
CHECKS.push(function equalRoots(q) {
  if (!/equal roots|real and equal/i.test(q)) return null;
  const m = q.match(/([kma])\s*(?:x\s*)?\(\s*(\d*)\s*x\s*-\s*(\d+)\s*\)\s*\+\s*(\d+)\s*=\s*0/i);
  if (m) {
    const v = m[1], A = (Number(m[2]) || 1); const B = -Number(m[3]); const C = Number(m[4]);
    const ks = []; for (let t = -60; t <= 60; t++) { if (!t) continue; if (Math.abs(A * t * B * t - 4 * A * t * C) < 1e-9) {} const a2 = A * t, b2 = B * t; if (Math.abs(b2 * b2 - 4 * a2 * C) < 1e-9) ks.push(t); }
    if (ks.length) return { answer: ks, how: 'discriminant = 0' };
  }
  const m2 = q.match(/(\d+)\s*x\s*2\s*\+\s*([a-z])\s*x\s*\+\s*(\d+)\s*=\s*0/i);
  if (m2) {
    const A = Number(m2[1]), C = Number(m2[3]);
    const b = 2 * Math.sqrt(A * C);
    return { answer: [b, -b], how: 'discriminant = 0 gives b = ±2√(ac)' };
  }
  const m3 = q.match(/(\d+)\s*x2?\s*[-+]\s*k?\s*x\s*\+\s*(\d+)\s*\/\s*(\d+)\s*=\s*0/i);
  if (m3) return null;
  return null;
});

/* solid volumes/surface with a given radius or diameter */
CHECKS.push(function solids(q) {
  if (/hemisphere/i.test(q)) {
    const S = q.match(/total surface area of (?:a )?solid hemisphere(?:\s*of radius\s*(\d+(?:\.\d+)?))?\s*is\s*(\d+(?:\.\d+)?)/i);
    if (S) {
      const r = S[1] ? Number(S[1]) : Math.sqrt(Number(S[2]) / (3 * Math.PI));
      return { answer: (2 / 3) * Math.PI * r ** 3, how: `r=${r.toFixed(3)}, V=(2/3)πr³` };
    }
  }
  return null;
});

/* simple "find the value of x" linear equations */
CHECKS.push(function linearXY(q) {
  const m = q.match(/(\d+)\s*x\s*\+\s*(\d+)\s*y\s*=\s*(-?\d+)[^0-9-]+(\d+)\s*x\s*-\s*(\d+)\s*y\s*=\s*(-?\d+)/i);
  if (!m) return null;
  const [a1, b1, c1, a2, b2, c2] = m.slice(1).map(Number);
  const det = a1 * (-b2) - a2 * (b1);
  if (!det) return null;
  const x = (c1 * (-b2) - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return { answer: [x, y], how: "Cramer's rule" };
});


/* point equidistant from two points that contain an unknown */
CHECKS.push(function equidistantUnknown(q) {
  const m = q.match(/P\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*is equidistant from the points?\s*A\s*\(\s*(-?\d+)\s*,\s*k\s*\)\s*and\s*B\s*\(\s*k\s*,\s*(-?\d+)\s*\)/i);
  if (!m) return null;
  const px = n(m[1]), py = n(m[2]), ax = n(m[3]), by = n(m[4]);
  const ks = [];
  for (let k = -40; k <= 40; k++) {
    if (Math.abs((px - ax) ** 2 + (py - k) ** 2 - ((px - k) ** 2 + (py - by) ** 2)) < 1e-9) ks.push(k);
  }
  return ks.length ? { answer: ks, how: 'PA² = PB²' } : null;
});

/* three points collinear with a stated area, where one coordinate is unknown */
CHECKS.push(function triangleAreaUnknown(q) {
  const pts = [...q.matchAll(/\(\s*(-?\d+)\s*,\s*(-?[a-z]|-?\d+)\s*\)/g)];
  if (pts.length !== 3) return null;
  const stated = q.match(/area\s*(?:is|equal to|=)\s*(\d+(?:\.\d+)?)/i);
  const unknownKey = q.match(/value\(?s\)? of\s*([a-z])/i);
  if (!stated || !unknownKey) return null;
  const key = unknownKey[1];
  const idx = pts.findIndex((p) => p[2] === key);
  if (idx < 0) return null;
  const fixed = pts.map((p) => [n(p[1]), p[2] === key ? null : n(p[2])]);
  const want = Number(stated[1]);
  const hits = [];
  for (let v = -40; v <= 40; v++) {
    const p = fixed.map((q2) => [q2[0], q2[1] === null ? v : q2[1]]);
    if (Math.abs(shoelace(p) - want) < 1e-9) hits.push(v);
  }
  return hits.length ? { answer: hits, how: `area fixed at ${want}` } : null;
});


/* "do these four points form a parallelogram / rectangle / rhombus / square?"
   The interesting part is that the SHAPE is decidable and the diagonals give it
   away: a parallelogram iff both diagonals share a midpoint; then rectangle iff
   the diagonals are equal, rhombus iff they are perpendicular, square iff both. */
CHECKS.push(function quadrilateralType(q) {
  if (!/\b(parallelogram|rectangle|rhombus|square)\b/i.test(q)) return null;
  if (!/\b(vertices|form|verify|show that|prove that|are the)\b/i.test(q)) return null;
  const pts = pointsIn(q);
  if (pts.length !== 4) return null;
  const [A, B, C, D] = pts;
  const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const eq = (P, Q) => Math.abs(P[0] - Q[0]) < 1e-9 && Math.abs(P[1] - Q[1]) < 1e-9;
  const dist2 = (P, Q) => (P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2;
  const m1 = mid(A, C), m2 = mid(B, D);
  if (!eq(m1, m2)) return { answer: 'neither a parallelogram nor a rectangle', how: 'diagonals AC and BD have different midpoints' };
  const d1 = [C[0] - A[0], C[1] - A[1]];
  const d2 = [D[0] - B[0], D[1] - B[1]];
  const equalDiag = Math.abs(dist2(A, C) - dist2(B, D)) < 1e-9;
  const perpDiag = Math.abs(d1[0] * d2[0] + d1[1] * d2[1]) < 1e-9;
  const kind = equalDiag && perpDiag ? 'a square'
    : equalDiag ? 'a rectangle'
      : perpDiag ? 'a rhombus'
        : 'a parallelogram but not a rectangle';
  return { answer: kind, how: `diagonals both bisect at (${m1[0]}, ${m1[1]}); |AC|²=${dist2(A, C)}, |BD|²=${dist2(B, D)}` };
});

/* A string answer is a claim about WHICH thing is true, not a number to find.
   "a parallelogram but not a rectangle" is satisfied by "it is a parallelogram
   but NOT a rectangle" and contradicted by "it is a rectangle". */
function stringVerdict(want, say) {
  const PARENT = { square: ['rhombus', 'rectangle'], rhombus: ['parallelogram'], rectangle: ['parallelogram'], parallelogram: [] };
  const SHAPES = ['parallelogram', 'rectangle', 'rhombus', 'square'];

  /* which shapes does this text actually ASSERT (i.e. not "not a rectangle",
     "neither X nor Y")? */
  function positives(text) {
    const t = String(text || '').toLowerCase();
    const out = new Set();
    for (const sh of SHAPES) {
      const re = new RegExp('\\b' + sh + '\\b', 'g');
      let m;
      while ((m = re.exec(t))) {
        const before = t.slice(Math.max(0, m.index - 30), m.index);
        if (/(\bnot|\bisn[’']t|\bnever|\bneither|\bnor)\s+(\w+\s+){0,3}$/.test(before)) continue;
        out.add(sh);
      }
    }
    return out;
  }
  const related = (a, b) => a === b || PARENT[a].includes(b) || PARENT[b].includes(a);

  const W = positives(want), S = positives(say);
  if (!W.size) return false;
  for (const sh of W) if (!S.has(sh)) return false;          // missed what was asked
  for (const sh of S) if (![...W].some((w) => related(w, sh))) return false; // claimed something else
  return true;
}


/* "Given that HCF(a, b) = h, find the LCM(a, b)" -- the answer is fixed by the
   identity product = HCF x LCM, so there is no reason to ask a model about it. */
CHECKS.push(function lcmFromHcf(q) {
  const m = q.match(/HCF\s*\(?\s*(\d+)\s*,\s*(\d+)\s*\)?\s*=\s*(\d+)/i);
  if (!m) return null;
  if (!/\bLCM\b/i.test(q)) return null;
  const [a, b, h] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!a || !b || !h) return null;
  if (a % h || b % h) return null;                 // inconsistent question: no verdict
  return { answer: (a * b) / h, how: `LCM = (${a} × ${b}) ÷ ${h}` };
});

/* "Find LCM(a, b)" / "find HCF(a, b)" with no help given: compute it outright. */
CHECKS.push(function lcmHcfBoth(q) {
  const m = q.match(/\b(LCM|HCF)\s*(?:of\s*)?\(?\s*(\d+)\s*(?:,|and)\s*(\d+)\s*\)?/i);
  if (!m) return null;
  if (/HCF\s*\(?\s*\d+\s*,\s*\d+\s*\)?\s*=/i.test(q)) return null;   // handled above
  const want = m[1].toUpperCase(), a = Number(m[2]), b = Number(m[3]);
  if (!a || !b) return null;
  const g = gcd(a, b);
  return { answer: want === 'HCF' ? g : (a * b) / g, how: want === 'HCF' ? `gcd(${a}, ${b})` : `(${a} × ${b}) ÷ ${g}` };
});

/* "The LCM of two numbers is L and their HCF is H. If one is a, find the other."
   other = (L x H) / a. */
CHECKS.push(function otherNumberFromLcmHcf(q) {
  const l = q.match(/\bLCM\b[^.]{0,40}?(\d+)/i);
  const h = q.match(/\bHCF\b[^.]{0,40}?(\d+)/i);
  if (!l || !h) return null;
  if (/HCF\s*\(?\s*\d+\s*,\s*\d+/i.test(q)) return null;         // the "(a, b) = h" form
  const given = q.match(/\bone of the numbers is\s*(\d+)/i) || q.match(/\bnumber is\s*(\d+)/i);
  if (!given) return null;
  const L = Number(l[1]), H = Number(h[1]), a = Number(given[1]);
  if (!L || !H || !a) return null;
  if ((L * H) % a) return null;
  return { answer: (L * H) / a, how: `other = (${L} × ${H}) ÷ ${a}` };
});

/* --------------------------------------------------------------- verdict */
/**
 * @param {string} question the original text
 * @param {string} claimed  what the AI said
 * @returns {{state:'verified'|'wrong', answer:any, how:string}|null}
 *          null  =  this checker cannot settle it. Say NOT CHECKED, do not guess.
 */
function check(question, claimed) {
  const q = String(question || '');
  for (const fn of CHECKS) {
    let r = null;
    try { r = fn(q); } catch (e) { r = null; }
    if (!r) continue;

    if (r.answer && r.answer.parts) {
      /* multi-part: every part must be present in the claimed answer */
      const ok = r.answer.parts.every((p) => mentions(claimed, p));
      return { state: ok ? 'verified' : 'wrong', answer: r.answer.parts, how: r.how };
    }
    if (Array.isArray(r.answer)) {
      /* Every value we computed must appear -- AND the answer must not offer
         extra values we did not compute. "k = 3 or k = 11" is not correct just
         because 3 is in it; the student would carry a wrong second root. */
      const missing = r.answer.filter((v) => !mentions(claimed, v));
      const given = claimedNumbers(claimed);
      const extra = given.filter((g) => !r.answer.some((v) => Math.abs(v - g) <= TOL(v)));
      const ok = r.answer.length > 0 && missing.length === 0 && extra.length === 0;
      return { state: ok ? 'verified' : 'wrong', answer: r.answer, how: r.how,
               missing, extra };
    }
    if (typeof r.answer === 'string') {
      /* a classification: the named shape must be asserted, and any shape the
         verdict rules OUT must not be asserted in its place */
      const say = String(claimed || '').toLowerCase();
      const ok = stringVerdict(r.answer, say);
      return { state: ok ? 'verified' : 'wrong', answer: r.answer, how: r.how };
    }
    return { state: mentions(claimed, r.answer) ? 'verified' : 'wrong', answer: r.answer, how: r.how };
  }
  return null;
}

module.exports = { check, claimedNumbers, CHECKS };
