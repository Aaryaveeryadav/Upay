/* =====================================================================
   Upay · Multi-method solver — core utilities, quadratic equations,
   pairs of linear equations.
   Every solver returns:
   { kind, chapter, title:{en,hi}, approaches:[{name, tag, steps, why, watch}],
     verify:{en,hi}, related:[chapterId,...] }
   ===================================================================== */
window.UP = window.UP || {};

/* ---------------------------- number utils --------------------------- */
UP.num = (function () {
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };

  function toFrac(x, tol = 1e-9) {
    if (!isFinite(x)) return { n: 0, d: 1, ok: false };
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    if (Math.abs(x - Math.round(x)) < tol) return { n: sign * Math.round(x), d: 1, ok: true };
    for (let d = 2; d <= 4000; d++) {
      const n = Math.round(x * d);
      if (Math.abs(x - n / d) < tol * Math.max(1, x)) {
        const g = gcd(n, d) || 1;
        return { n: sign * n / g, d: d / g, ok: true };
      }
    }
    return { n: x, d: 1, ok: false };
  }

  // pretty number: integers plain, simple fractions as a/b, else 3-dp
  function fmt(x, dp = 2) {
    if (typeof x === 'string') return x;
    if (!isFinite(x)) return '—';
    if (Math.abs(x) < 1e-12) return '0';
    const f = toFrac(x);
    /* fractions are for values that are actually fractional and simple; a measured
       answer like 1539.38 must stay a decimal, not become 76969/50 */
    if (f.ok && f.d !== 1 && f.d <= 60 && Math.abs(f.n) <= 2000) return `${f.n}/${f.d}`.replace(/-/g, '−');
    if (f.ok && f.d === 1) return String(f.n).replace(/-/g, '−');
    /* surd fractions such as √7/4 cannot be written as a/b — try that shape before a decimal */
    const ax = Math.abs(x);
    for (let d2 = 1; d2 <= 24; d2++) {
      const n2 = Math.round((ax * d2) * (ax * d2));
      if (n2 < 2) continue;
      if (Math.abs(ax - Math.sqrt(n2) / d2) > 1e-9) continue;
      const r = Math.round(Math.sqrt(n2));
      if (r * r === n2) continue;
      /* pull out the largest square factor so √63/7 is written √7·3/7 = 3√7/7 */
      let outside = 1, inside = n2;
      for (let q3 = 2; q3 * q3 <= inside; q3++) {
        while (inside % (q3 * q3) === 0) { inside /= q3 * q3; outside *= q3; }
      }
      /* outside√inside / d2 — written the way a student would */
      const head = `${outside === 1 ? '' : outside}√${inside}`;
      const top = d2 === 1 ? head : `${head}/${d2}`;
      return (x < 0 ? '−' : '') + top;
    }
    return Number(x.toFixed(dp)).toString();
  }
  const dec = (x, dp = 3) => Number(x.toFixed(dp)).toString().replace(/-/g, '−');

  /* mensuration answers: 22π, 49π/2, 38.48 … — exact first, decimal second */
  function piStr(x) {
    const k = x / Math.PI;
    const f = toFrac(k, 1e-7);
    if (f.ok && f.d !== 1 && f.d <= 12) return `${f.n}π/${f.d}`.replace(/-/g, '−');
    if (f.ok && f.d === 1) return `${f.n}π`.replace(/-/g, '−');
    return `${dec(x, 2)}`;
  }

  /* exact text for surd coefficients: 2√6 survives the numeric pipeline as 4.898979… */
  const SURD_NOTE = { '4.8989794856': '2√6', '0.8164965809': '√6/3', '1.6329931619': '2√6/3' };
  function exactly(x) {
    const k = String(Number(Number(Math.abs(x)).toFixed(10)));
    const sign = x < 0 ? '−' : '';
    if (UP._surdCache && UP._surdCache[k]) return sign + UP._surdCache[k];
    if (SURD_NOTE[k]) return sign + SURD_NOTE[k];
    const f = toFrac(x);
    if (f.ok && f.d !== 1) return `${f.n}/${f.d}`.replace(/-/g, '−');
    return fmt(x);
  }

  function factorise(n) {
    n = Math.abs(Math.round(n));
    if (n < 2) return [];
    const out = [];
    for (let p = 2; p * p <= n; p++) {
      while (n % p === 0) { out.push(p); n /= p; }
    }
    if (n > 1) out.push(n);
    return out;
  }

  function factorString(n) {
    const f = factorise(n);
    if (!f.length) return String(n);
    const map = new Map();
    f.forEach(p => map.set(p, (map.get(p) || 0) + 1));
    return [...map.entries()].map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join(' × ');
  }
  function powerString(n) {
    const f = factorise(n);
    const map = new Map();
    f.forEach(p => map.set(p, (map.get(p) || 0) + 1));
    return [...map.entries()].map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join(' × ') || '1';
  }
  function hcf(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function lcm(a, b) { return Math.abs(a * b) / (hcf(a, b) || 1); }
  const hcfAll = arr => arr.reduce((a, b) => hcf(a, b));
  const lcmAll = arr => arr.reduce((a, b) => lcm(a, b));

  // superscripts for x^2 → x², (x+1)^3 → (x+1)³
  function sup(s) {
    const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
    return String(s).replace(/\^(-?\d+)/g, (_, d) => d.split('').map(c => map[c] || c).join(''));
  }
  function sqrtStr(x) {
    if (x < 0) return '√(−' + (-x) + ')';
    const r = Math.sqrt(x);
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    // simplify √n = a√b
    let a = 1, b = Math.round(x);
    for (let k = 2; k * k <= b; k++) {
      while (b % (k * k) === 0) { a *= k; b /= k * k; }
    }
    return (a === 1 ? '' : a) + '√' + b;
  }
  const isNum = v => typeof v === 'number' && isFinite(v) && !isNaN(v);
  return { gcd, toFrac, fmt, dec, exactly, piStr, factorise, factorString, powerString, hcf, lcm, hcfAll, lcmAll, sup, sqrtStr, isNum };
})();

/* ------------------------------ normalise ---------------------------- */
UP.norm = function (s) {
  return String(s || '')
    .replace(/[−–—]/g, '-')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[²]/g, '^2').replace(/[³]/g, '^3')
    .replace(/[“”„″]/g, '"')
    .replace(/,/g, m => m)           // keep commas, parsed later
    .replace(/\s+/g, ' ')
    .trim();
};

/* ============================ QUADRATIC ============================== */
/* Detects ax² + bx + c = 0 in many spellings and solves it 4 ways. */
UP.parseQuadratic = function (q) {
  let s = UP.norm(q).toLowerCase().replace(/[−–—]/g, '-');

  // numeric value for surds such as 2√6, so the algebra stays exact to 15 digits
  const surd = /√|sqrt/.test(s);
  UP._surdCache = {};
  // a√b  →  a·√b
  s = s.replace(/(\d+(?:\.\d+)?)\s*√\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/g, (m, a, b) => {
    const v = parseFloat(a) * Math.sqrt(parseFloat(b));
    UP._surdCache[String(Number(Math.abs(v)))] = `${parseFloat(a) === 1 ? '' : parseFloat(a)}√${parseFloat(b)}`;
    return String(v);
  });
  s = s.replace(/√\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/g, (m, n) => {
    const v = Math.sqrt(parseFloat(n));
    UP._surdCache[String(Number(v))] = `√${parseFloat(n)}`;
    return String(v);
  });
  s = s.replace(/sqrt\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/g, (m, n) => String(Math.sqrt(parseFloat(n))));
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (m, n, d) => (d !== '0' ? String(parseFloat(n) / parseFloat(d)) : m));
  s = s.replace(/x\s*\^\s*2/g, 'x^2').replace(/x2\b/g, 'x^2');
  if (!/x\^2/.test(s)) return null;
  // cut anything before the first token that can start an equation
  const start = s.search(/[-+]?\d*\.?\d*\s*x\^2/);
  if (start > -1) s = s.slice(start);
  // drop words: keep only maths characters and x
  s = s.replace(/[^0-9x^+\-*/().=√ ]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!/x\^2/.test(s)) return null;
  let a = 0, b = 0, c = 0, seen = 0;
  const eq = s.match(/^(.*?)=(.*)$/);
  let body = s, rhsTxt = '0';
  if (eq) { body = eq[1]; const rm = eq[2].match(/[-+]?\d*\.?\d*/); rhsTxt = rm ? rm[0] : '0'; }
  const rhsVal = parseFloat(rhsTxt); 
  if (isFinite(rhsVal)) c -= rhsVal;
  body = body.replace(/[()]/g, ' ');
  const re = /([+-]?)\s*(\d*\.?\d*)\s*(x\^2|x)?/g;
  let m, guard = 0;
  while ((m = re.exec(body)) !== null && guard++ < 200) {
    if (m[0] === '') { re.lastIndex++; continue; }
    const sign = m[1] === '-' ? -1 : 1;
    const numTxt = m[2], kind = m[3];
    if (!numTxt && !kind) continue;
    let val = numTxt === '' ? 1 : parseFloat(numTxt);
    if (!isFinite(val)) continue;
    seen++;
    if (kind === 'x^2') a += sign * val;
    else if (kind === 'x') b += sign * val;
    else c += sign * val;
  }
  if (!seen || Math.abs(a) < 1e-12) return null;
  return { a, b, c, raw: q, surd };
};

UP.solveQuadratic = function (parsed) {
  const { a, b, c } = parsed;
  if (![a, b, c].every(v => typeof v === 'number' && isFinite(v))) return null;
  if (parsed.uk === false) return null;
  const A = UP.num.fmt(a), B = UP.num.fmt(b), C = UP.num.fmt(c);
  let D = b * b - 4 * a * c;
  if (Math.abs(D) < 1e-9) D = 0;
  const Db = UP.num.dec(D, 4);
  const approaches = [];
  const L = (en, hi) => ({ en, hi });

  const bD = UP.num.dec(Math.abs(b), 3), cD = UP.num.fmt(Math.abs(c));
  /* (1/2)x reads unambiguously where 1/2x does not */
  const coefX = (v) => {
    const t = UP.num.exactly(Math.abs(v));
    return (t.includes('/') ? `(${t})` : t) + 'x';
  };
  /* standard form with the coefficient formatting students actually write */
  const eqA = A === '1' ? '' : (A === '-1' ? '−' : A);
  const bAbs = Math.abs(b);
  const eqB = b === 0 ? '' : `${b < 0 ? '− ' : '+ '}${bAbs === 1 ? '' : UP.num.fmt(bAbs)}x`;
  const eqC = c === 0 ? '' : `${c < 0 ? '− ' : '+ '}${UP.num.exactly(Math.abs(c))}`;
  const eqLine = `${eqA}x²${eqB ? ' ' + eqB : ''}${eqC ? ' ' + eqC : ''} = 0`;

  /* ---- Approach 1: splitting the middle term ---- */
  {
    const ac = a * c;
    let p = null, qq = null;
    if (Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c)) {
      const absac = Math.abs(ac);
      for (let i = 1; i <= absac && p === null; i++) {
        if (ac % i !== 0) continue;
        const j = ac / i;
        for (const x1 of [i, -i, j, -j]) {
          const x2 = ac / x1;
          if (x1 + x2 === b) { p = x1; qq = x2; break; }
        }
      }
    }

    /* small formatter: 1x → x, −3x → −3x, +2 → + 2 */
    const term = (co, isVar, first) => {
      if (co === 0) return '';
      const sign = co < 0 ? '−' : (first ? '' : '+');
      const mag = Math.abs(co);
      const body = isVar ? (mag === 1 ? 'x' : `${mag}x`) : `${mag}`;
      return (sign ? sign + ' ' : '') + body;
    };
    const fac = (co) => (Math.abs(co) === 1 ? '' : String(Math.abs(co))).replace(/^1$/, '');
    const coeff = (co) => (Math.abs(co) === 1 ? '' : `${Math.abs(co)}`);
    const poly = (co1, con) => `${term(co1, true, true)}${con === 0 ? '' : ' ' + term(con, false, false)}`.trim();

    const steps = [];
    steps.push({
      t: L(`Write the equation in standard form and note a = ${A}, b = ${B}, c = ${C}.`,
           `समीकरण को मानक रूप में लिखिए और a = ${A}, b = ${B}, c = ${C} नोट कीजिए।`),
      m: eqLine
    });

    if (p !== null) {
      steps.push({
        t: L(`We need two numbers with product a × c = ${UP.num.fmt(ac)} and sum b = ${UP.num.fmt(b)}. They are ${UP.num.fmt(p)} and ${UP.num.fmt(qq)} — split the middle term with them.`,
             `हमें दो संख्याएँ चाहिए जिनका गुणनफल a × c = ${UP.num.fmt(ac)} और योग b = ${UP.num.fmt(b)} हो। वे ${UP.num.fmt(p)} और ${UP.num.fmt(qq)} हैं — इनसे मध्य पद तोड़िए।`),
        m: `${a === 1 ? '' : UP.num.fmt(a)}x² ${term(p, true, false)} ${term(qq, true, false)} ${term(c, false, false)} = 0`
      });
      /* group the four terms in pairs: g1(inner1 x + k) + g2(inner2 x + k) */
      const g1 = (a < 0 ? -1 : 1) * (UP.num.hcf(a, p) || 1);
      const i1 = a / g1, k1 = p / g1;
      const g2 = (qq < 0 ? -1 : 1) * (UP.num.hcf(qq, c) || 1);
      const i2 = qq / g2, k2 = c / g2;
      steps.push({
        t: L('Group the terms in pairs and take out the common factor from each pair.',
             'पदों को जोड़ों में समूहित कीजिए और प्रत्येक जोड़े से सामान्य गुणनखंड निकालिए।'),
        m: `${g1 === 1 ? 'x' : (g1 === -1 ? '−x' : `${coeff(g1)}x`)}(${i1 === 1 ? '' : UP.num.fmt(i1)}x ${k1 < 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(k1))}) ${g2 < 0 ? '−' : '+'} ${coeff(g2)}(${i2 === 1 ? '' : UP.num.fmt(i2)}x ${k2 < 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(k2))}) = 0`
      });
      steps.push({
        t: L('The same bracket appears in both groups. Take it out — that bracket gives one root, the outside terms give the other.',
             'दोनों समूहों में एक ही कोष्ठक आता है। उसे बाहर निकालिए — वह कोष्ठक एक मूल देता है, बाहरी पद दूसरा मूल।'),
        m: `(${i1 === 1 ? '' : UP.num.fmt(i1)}x ${k1 < 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(k1))})(${g1 === 1 ? 'x' : (g1 === -1 ? '−x' : `${coeff(g1)}x`)} ${g2 < 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(g2))}) = 0`
      });
      const rA = -k1 / i1, rB = -g2 / g1;
      steps.push({
        t: L('Set each factor to zero and solve. These are the two roots.',
             'प्रत्येक गुणनखंड को शून्य के बराबर रखकर हल कीजिए। ये दोनों मूल हैं।'),
        m: `x = ${UP.num.exactly(rA)},   x = ${UP.num.exactly(rB)}`,
        note: L(`Root set: { ${[UP.num.fmt(rA), UP.num.fmt(rB)].join(', ')} }${Math.abs(rA - rB) < 1e-12 ? ' — both roots equal' : ''}`,
                `मूल समुच्चय: { ${[UP.num.fmt(rA), UP.num.fmt(rB)].join(', ')} }${Math.abs(rA - rB) < 1e-12 ? ' — दोनों मूल बराबर' : ''}`)
      });
      approaches.push({
        name: L('Splitting the middle term', 'मध्य पद को विभाजित करना'),
        tag: L('Fastest when the roots are nice integers or fractions', 'जब मूल सरल पूर्णांक या भिन्न हों तब सबसे तेज़'),
        steps,
        why: L(`Expanding (x − α)(x − β) rebuilds b as α + β and c as αβ — so finding the pair is the same as finding the roots. NCERT uses this method first (Exercise 4.2), which is why examiners expect it when the roots are clean.`,
                `(x − α)(x − β) को खोलने पर b = α + β और c = αβ मिलता है — अतः युग्म खोजना मूल खोजना ही है। एनसीईआरटी पहले यही विधि (प्रश्नावली 4.2) देती है, इसीलिए जब मूल साफ हों तो परीक्षक इसकी अपेक्षा करते हैं।`),
        watch: L('If no integer pair gives product ac and sum b, this method stalls — switch to the formula instead of forcing it.',
                 'यदि गुणनफल ac और योग b देने वाला कोई पूर्णांक युग्म न मिले, तो यह विधि रुक जाती है — ज़बरदस्ती करने के बजाय सूत्र पर आ जाइए।')
      });
    } else {
      steps.push({
        t: L('No integer pair multiplies to a × c and adds to b, so factorisation will not give clean brackets here. This is exactly when the formula is the right tool.',
             'कोई पूर्णांक युग्म a × c का गुणनफल और b का योग नहीं देता, अतः यहाँ गुणनखंडन से साफ कोष्ठक नहीं मिलेंगे। यही वह स्थिति है जब सूत्र सही उपकरण है।'),
        m: `a × c = ${UP.num.fmt(ac)},  need sum = ${UP.num.fmt(b)}`
      });
      approaches.push({
        name: L('Factorisation check (why it is skipped)', 'गुणनखंडन जाँच (क्यों छोड़ी)'),
        tag: L('Knowing when to switch methods is itself a skill', 'कब विधि बदलनी है, यह जानना भी कौशल है'),
        steps,
        why: L('Showing why a method fails is worth marks in a "choose the method" question, and it saves you minutes of guessing at factors that do not exist.',
                '"विधि चुनिए" वाले प्रश्न में यह दिखाना कि कोई विधि क्यों नहीं चलती, अंक दिलाता है और ऐसे गुणनखंड खोजने में लगने वाले मिनट बचाता है जो हैं ही नहीं।'),
        watch: L('Do not write "no solution" just because factorisation failed — the formula may still give two roots.',
                 'केवल गुणनखंडन न चलने पर "हल नहीं है" न लिखिए — सूत्र से दो मूल मिल सकते हैं।')
      });
    }
  }

  /* ---- Approach 2: quadratic formula ---- */
  {
    const rows = [];
    rows.push({
      t: L('Compare the equation with ax² + bx + c = 0 and write down a, b, c with their signs.',
           'समीकरण की तुलना ax² + bx + c = 0 से कीजिए और चिह्नों सहित a, b, c लिखिए।'),
      m: `a = ${UP.num.exactly(a)},   b = ${UP.num.exactly(b)},   c = ${UP.num.exactly(c)}`
    });
    rows.push({
      t: L('Compute the discriminant D = b² − 4ac. Its sign decides how many real roots exist.',
           'विविक्तकर D = b² − 4ac निकालिए। इसका चिह्न बताता है कि कितने वास्तविक मूल हैं।'),
      m: `D = b² − 4ac\n  = (${UP.num.exactly(b)})² − 4(${UP.num.exactly(a)})(${UP.num.exactly(c)})\n  = ${UP.num.dec(b * b, 4)} − ${4 * a * c < 0 ? '(' + UP.num.dec(4 * a * c, 4) + ')' : UP.num.dec(4 * a * c, 4)}\n  = ${Db}`
    });
    rows.push({
      t: L('Write both roots from x = (−b ± √D) / 2a, keeping the signs of a and b as they are.',
           'x = (−b ± √D) / 2a से दोनों मूल लिखिए, a और b के चिह्न जैसे हैं वैसे ही रखिए।'),
      m: `x = (−b ± √D) / 2a = (${UP.num.exactly(-b)} ± √${Db}) / ${UP.num.exactly(2 * a)}`
    });
    if (D >= 0) {
      const r1 = (-b + Math.sqrt(D)) / (2 * a), r2 = (-b - Math.sqrt(D)) / (2 * a);
      const sroot = Number.isInteger(Math.sqrt(D)) ? String(Math.sqrt(D)) : `√${Db}`;
      rows.push({
        t: L('Take the square root and simplify each sign separately.',
             'वर्गमूल लीजिए और प्रत्येक चिह्न के लिए अलग-अलग सरल कीजिए।'),
        m: `√D = ${sroot}\nx₁ = (${UP.num.exactly(-b)} + ${sroot}) / ${UP.num.exactly(2 * a)} = ${UP.num.exactly(r1)}\nx₂ = (${UP.num.exactly(-b)} − ${sroot}) / ${UP.num.exactly(2 * a)} = ${UP.num.exactly(r2)}`,
        note: Math.abs(r1 - r2) < 1e-9
          ? L('Because D = 0 both values collapse to the same number — one repeated root.', 'चूँकि D = 0, दोनों मान एक ही संख्या देते हैं — एक ही मूल दोहराया गया है।')
          : L(`Check with Vieta: x₁ + x₂ = ${UP.num.fmt(-b / a)}, x₁x₂ = ${UP.num.fmt(c / a)}.`,
              `वीटा से जाँचिए: x₁ + x₂ = ${UP.num.fmt(-b / a)}, x₁x₂ = ${UP.num.fmt(c / a)}.`)
      });
    } else {
      rows.push({
        t: L('√D is not a real number, so this quadratic has no real root. In Class 10 the answer stops here — you would write "no real roots".',
             '√D कोई वास्तविक संख्या नहीं है, अतः इस द्विघात का कोई वास्तविक मूल नहीं। कक्षा 10 में उत्तर यहीं रुकता है — "कोई वास्तविक मूल नहीं"।'),
        m: `√${Db} is imaginary · the graph never touches the x-axis`
      });
    }
    approaches.push({
      name: L('Quadratic formula', 'द्विघात सूत्र'),
      tag: L('Works every time — the safe choice in the exam', 'हर बार काम करता है — परीक्षा में सुरक्षित विकल्प'),
      steps: rows,
      why: L('The formula comes from completing the square on the general equation, so it is not a trick to memorise — it is the general case of the next method. Because it needs no guessing, examiners accept it for every quadratic.',
              'यह सूत्र सामान्य समीकरण पर पूर्ण वर्ग बनाकर निकलता है, अतः यह याद करने की युक्ति नहीं — अगली विधि का सामान्य रूप है। इसमें अनुमान नहीं लगाना पड़ता, इसलिए परीक्षक इसे हर द्विघात के लिए स्वीकार करते हैं।'),
      watch: L('Keep b² and 4ac separate until the last step. Most lost marks come from writing −b² instead of (−b)², or from dropping the minus sign on c.',
               'अंतिम चरण तक b² और 4ac अलग रखिए। अधिकांश अंक इसलिए कटते हैं कि (−b)² के स्थान पर −b² लिख दिया जाता है या c का ऋण चिह्न छूट जाता है।')
    });
  }

  /* ---- Approach 3: completing the square ---- */
  if (a !== 0) {
    const rows = [];
    const p = b / a, q2 = c / a;           // x² + p x + q2 = 0
    const h = p / 2;                        // half of the coefficient of x

    rows.push({
      t: L('Divide the whole equation by a so the coefficient of x² becomes 1.',
           'पूरे समीकरण को a से भाग दीजिए ताकि x² का गुणांक 1 हो जाए।'),
      m: `x² ${p < 0 ? '−' : '+'} ${coefX(p)} ${q2 < 0 ? '−' : '+'} ${UP.num.exactly(Math.abs(q2))} = 0`
    });
    rows.push({
      t: L('Move the constant to the right, then add the square of half the coefficient of x — (b/2a)² — to both sides.',
           'अचर पद को दाएँ ले जाइए, फिर x के गुणांक के आधे का वर्ग — (b/2a)² — दोनों पक्षों में जोड़िए।'),
      m: `x² ${p < 0 ? '−' : '+'} ${coefX(p)} = ${UP.num.exactly(-q2)}\nadd (${UP.num.exactly(h)})² = ${UP.num.exactly(h * h)} on both sides`
    });
    rows.push({
      t: L('The left side is now a perfect square — write it as one bracket squared.',
           'बायाँ पक्ष अब पूर्ण वर्ग है — उसे एक कोष्ठक के वर्ग के रूप में लिखिए।'),
      m: `(x ${h < 0 ? '−' : '+'} ${UP.num.exactly(Math.abs(h))})² = ${UP.num.exactly(-q2 + h * h)}`
    });

    let rhs = -q2 + h * h;
    if (Math.abs(rhs) < 1e-9) rhs = 0;
    if (rhs >= 0) {
      const s1 = -h + Math.sqrt(rhs), s2 = -h - Math.sqrt(rhs);
      rows.push({
        t: L('Take the square root of both sides — remember the ± — and solve the two simple equations.',
             'दोनों पक्षों का वर्गमूल लीजिए — ± अवश्य लिखिए — और दोनों सरल समीकरण हल कीजिए।'),
        m: `x ${h < 0 ? '−' : '+'} ${UP.num.exactly(Math.abs(h))} = ±${Math.abs(rhs) === 0 ? '0' : `√(${UP.num.exactly(rhs)})`}\nx = ${UP.num.exactly(s1)}  or  x = ${UP.num.exactly(s2)}`
      });
    } else {
      rows.push({
        t: L('A square can never be negative, so the equation has no real root — same conclusion as the discriminant test.',
             'किसी का वर्ग ऋणात्मक नहीं हो सकता, अतः समीकरण का कोई वास्तविक मूल नहीं — वही निष्कर्ष जो विविक्तकर देता है।'),
        m: `(x ${h < 0 ? '−' : '+'} ${UP.num.exactly(Math.abs(h))})² = ${UP.num.exactly(rhs)} < 0`
      });
    }
    approaches.push({
      name: L('Completing the square', 'पूर्ण वर्ग बनाना'),
      tag: L('Best for showing the minimum or maximum value', 'न्यूनतम/अधिकतम मान दिखाने के लिए सर्वोत्तम'),
      steps: rows,
      why: L('This is where the quadratic formula comes from, and it is the only method that exposes the turning point: the expression is smallest (or largest) when the bracket is zero, i.e. at x = −b/2a.',
              'द्विघात सूत्र यहीं से आता है, और यही एकमात्र विधि है जो शीर्ष बिंदु दिखाती है: कोष्ठक शून्य होने पर व्यंजक न्यूनतम (या अधिकतम) होता है, अर्थात् x = −b/2a पर।'),
      watch: L('Do not forget to square half the coefficient — a very common slip that changes the answer completely.',
               'गुणांक के आधे का वर्ग करना न भूलिए — यह सामान्य भूल उत्तर पूरी तरह बदल देती है।')
    });
  }

  /* ---- Approach 4: sum & product (Vieta) check / mental method ---- */
  {
    const steps = [];
    const S = -b / a, P = c / a;
    steps.push({
      t: L('For ax² + bx + c = 0 the two roots must add up to −b/a and multiply to c/a. Write both targets down first.',
           'ax² + bx + c = 0 के दोनों मूलों का योग −b/a और गुणनफल c/a होना चाहिए। पहले दोनों लक्ष्य लिखिए।'),
      m: `sum = −(${UP.num.fmt(b)})/${UP.num.fmt(a)} = ${UP.num.fmt(S)}\nproduct = ${UP.num.fmt(c)}/${UP.num.fmt(a)} = ${UP.num.fmt(P)}`
    });
    const roots = D >= 0 ? [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)] : [];
    if (roots.length) {
      steps.push({
        t: L('Search for two numbers with that sum and that product — integer factors of the product are tried first. This can be done mentally in seconds.',
             'उसी योग और गुणनफल वाली दो संख्याएँ खोजिए — पहले गुणनफल के पूर्णांक गुणनखंड आज़माइए। यह मन में सेकंडों में हो सकता है।'),
        m: `${UP.num.fmt(roots[0])} + ${UP.num.fmt(roots[1])} = ${UP.num.fmt(S)}\n${UP.num.fmt(roots[0])} × ${UP.num.fmt(roots[1])} = ${UP.num.fmt(P)}  ✓`
      });
      steps.push({
        t: L('Use the same two identities to check any answer you get by another method. If they hold, the roots are right.',
             'किसी अन्य विधि से मिले उत्तर की जाँच इन्हीं दो सर्वसमिकाओं से कीजिए। यदि वे संतुष्ट हों, तो मूल सही हैं।'),
        m: `α + β = ${UP.num.fmt(S)} , αβ = ${UP.num.fmt(P)}`
      });
    }
    approaches.push({
      name: L('Sum-and-product check (Vieta)', 'योग-गुणनफल जाँच (वीटा)'),
      tag: L('Two-line verification, or a mental shortcut', 'दो पंक्तियों में सत्यापन, या मानसिक त्वरित विधि'),
      steps,
      why: L('Expanding (x − α)(x − β) gives x² − (α + β)x + αβ. Comparing coefficients gives both relations instantly, which is why NCERT Chapter 2 uses the same idea one chapter earlier.',
              '(x − α)(x − β) को खोलने पर x² − (α + β)x + αβ मिलता है। गुणांकों की तुलना से दोनों संबंध तुरंत मिलते हैं, इसीलिए एनसीईआरटी अध्याय 2 में यही विचार एक अध्याय पहले आता है।'),
      watch: L('This verifies an answer; it does not replace showing the working when the question says "find the roots".',
               'यह उत्तर की जाँच करता है; जब प्रश्न "मूल ज्ञात कीजिए" कहता है तो यह कार्य-प्रदर्शन का स्थान नहीं ले सकता।')
    });
  }

  const roots = D >= 0 ? [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)] : [];
  const exactRoot = (r) => (parsed.surd ? UP.num.exactly(r) : UP.num.fmt(r));
  const rootTxt = roots.length
    ? (Math.abs(roots[0] - roots[1]) < 1e-9 ? `x = ${exactRoot(roots[0])} (repeated)` : `x = ${exactRoot(roots[0])} or x = ${exactRoot(roots[1])}`)
    : '';
  return {
    kind: 'quadratic',
    chapter: 4,
    title: { en: 'Quadratic equation — solved four ways', hi: 'द्विघात समीकरण — चार विधियों से हल' },
    summary: {
      en: `${eqLine.replace(/−\s*0/g, '')} · D = ${Db} · ${D > 0 ? 'two distinct real roots' : D === 0 ? 'two equal real roots' : 'no real roots'}`,
      hi: `${eqLine.replace(/−\s*0/g, '')} · D = ${Db} · ${D > 0 ? 'दो भिन्न वास्तविक मूल' : D === 0 ? 'दो बराबर वास्तविक मूल' : 'कोई वास्तविक मूल नहीं'}`
    },
    result: roots.length ? { en: rootTxt.replace(' or ', ' or '), hi: rootTxt.replace(' or ', ' अथवा ') } : { en: 'No real roots', hi: 'कोई वास्तविक मूल नहीं' },
    approaches,
    verify: {
      en: `Substitute each root back: both must make the expression 0, and they must satisfy α + β = ${UP.num.fmt(-b / a)}, αβ = ${UP.num.fmt(c / a)}.`,
      hi: `प्रत्येक मूल वापस रखिए: दोनों से व्यंजक 0 होना चाहिए, तथा α + β = ${UP.num.fmt(-b / a)}, αβ = ${UP.num.fmt(c / a)} संतुष्ट होना चाहिए।`
    },
    related: [2, 4],
    _geom: { a, b, c }
  };
};

/* ====================== PAIR OF LINEAR EQUATIONS ====================== */
UP.parseLinearPair = function (q) {
  const clean = UP.norm(q).toLowerCase().replace(/[−–—]/g, '-');
  if (!/x/.test(clean) || !/y/.test(clean)) return null;
  if (/x\^2|y\^2/.test(clean)) return null;
  const segs = clean.match(/[-+0-9xy.\s]+=[-+0-9xy.\s]+/g) || [];
  const eqs = [];
  for (let seg of segs) {
    seg = seg.trim();
    const m = seg.match(/^(.+?)=(.+)$/);
    if (!m) continue;
    const lhs = UP.parseLinExpr(m[1]), rhs = UP.parseLinExpr(m[2]);
    if (!lhs || !rhs) continue;
    const A = lhs.x - rhs.x, B = lhs.y - rhs.y, C = rhs.c - lhs.c;
    if (Math.abs(A) + Math.abs(B) < 1e-9) continue;
    if (!B && !/y/.test(seg)) continue;
    eqs.push({ a: A, b: B, c: C, raw: seg });
    if (eqs.length === 2) break;
  }
  if (eqs.length < 2) return null;
  return eqs;
};

UP.parseLinExpr = function (txt) {
  if (!txt) return null;
  /* A sentence-final full stop must not survive into the arithmetic: "1." is
     not a number, and that single character used to reject every equation
     pair written as a normal sentence. */
  let raw = String(txt).replace(/[.](?![0-9])/g, '').replace(/\s+/g, '')
    .replace(/[−–—]/g, '-').replace(/×/g, '*');
  if (!raw) return null;
  raw = raw.replace(/\*/g, '');
  // insert + before interior minus signs so tokens split cleanly
  raw = raw.replace(/(.)-/g, '$1+-');
  const tokens = raw.match(/[+-]?[^+-]+/g) || [];
  let x = 0, y = 0, c = 0, found = false;
  for (let tk of tokens) {
    let sign = 1;
    if (tk[0] === '+') tk = tk.slice(1);
    else if (tk[0] === '-') { sign = -1; tk = tk.slice(1); }
    if (!tk) continue;
    if (/x$/.test(tk)) { const n = tk.slice(0, -1); x += sign * (n === '' ? 1 : parseFloat(n) || 0); found = true; }
    else if (/y$/.test(tk)) { const n = tk.slice(0, -1); y += sign * (n === '' ? 1 : parseFloat(n) || 0); found = true; }
    else if (/^\d*\.?\d+$/.test(tk)) { c += sign * (parseFloat(tk) || 0); found = true; }
    else return null;
  }
  if (!found) return null;
  return { x, y, c };
};

UP.solveLinearPair = function (eqs) {
  const [e1, e2] = eqs;
  const { a: a1, b: b1, c: c1 } = e1, { a: a2, b: b2, c: c2 } = e2;
  const det = a1 * b2 - a2 * b1;
  const L = (en, hi) => ({ en, hi });
  const show = (n, v) => (n === 1 ? '' : n === -1 ? '−' : UP.num.fmt(n));
  const eqStr = (a, b, c) => `${show(a)}x ${b < 0 ? '−' : '+'} ${b === -1 || b === 1 ? '' : UP.num.fmt(Math.abs(b))}y = ${UP.num.fmt(c)}`;
  const approaches = [];

  const x = det ? (c1 * b2 - c2 * b1) / det : null;
  const y = det ? (a1 * c2 - a2 * c1) / det : null;

  /* 1. Elimination */
  {
    const steps = [];
    steps.push({
      t: L('Write both equations in the form ax + by = c and align them.', 'दोनों समीकरणों को ax + by = c के रूप में लिखिए और संरेखित कीजिए।'),
      m: `${eqStr(a1, b1, c1)}\n${eqStr(a2, b2, c2)}`
    });
    // choose the variable with smaller multiplier product
    const elimX = Math.abs(a1 * a2) <= Math.abs(b1 * b2);
    const target = elimX ? 'x' : 'y';
    const m1 = elimX ? a2 : b2, m2 = elimX ? a1 : b1;
    steps.push({
      t: L(`Multiply the equations so the coefficients of ${target} become equal. Equation 1 × ${Math.abs(m1)} and equation 2 × ${Math.abs(m2)}.`,
           `समीकरणों को ऐसे गुणा कीजिए कि ${target} के गुणांक बराबर हो जाएँ। समीकरण 1 × ${Math.abs(m1)} तथा समीकरण 2 × ${Math.abs(m2)}।`),
      m: `(${a1 * m1})x ${b1 * m1 >= 0 ? '+' : '−'} ${Math.abs(b1 * m1)}y = ${UP.num.fmt(c1 * m1)}\n(${a2 * m2})x ${b2 * m2 >= 0 ? '+' : '−'} ${Math.abs(b2 * m2)}y = ${UP.num.fmt(c2 * m2)}`
    });
    if (det !== 0) {
      steps.push({
        t: L(`Subtract to remove ${target}, then solve the remaining one-variable equation.`,
             `घटाकर ${target} को हटाइए, फिर बचे एक-चर समीकरण को हल कीजिए।`),
        m: `${UP.num.fmt(x)} and ${UP.num.fmt(y)}`
      });
      // nicer explicit
      const keep = elimX ? 'y' : 'x';
      const coef = elimX ? (b1 * m1 - b2 * m2) : (a1 * m2 - a2 * m1);
      const rhs = elimX ? (c1 * m1 - c2 * m2) : (c1 * m2 - c2 * m1);
      const val = elimX ? y : x;
      steps[steps.length - 1].m = `(${UP.num.fmt(coef)})${keep} = ${UP.num.fmt(rhs)}  ⟹  ${keep} = ${UP.num.fmt(val)}\nThen substitute back: ${elimX ? 'x' : 'y'} = ${UP.num.fmt(elimX ? x : y)}`;
      approaches.push({
        name: L('Elimination (addition / subtraction)', 'विलोपन (जोड़ / घटाव)'),
        tag: L('Best default for boards — shortest working', 'बोर्ड के लिए सर्वोत्तम — सबसे छोटा कार्य'),
        steps,
        why: L('It scales both equations before touching the numbers, so no fractions appear. When coefficients are large or fractional, this is measurably less error-prone than substitution.',
                'यह संख्याओं को छूने से पहले दोनों समीकरणों को समायोजित करता है, अतः कोई भिन्न नहीं आती। जब गुणांक बड़े या भिन्नात्मक हों, यह प्रतिस्थापन से काफी कम त्रुटिपूर्ण है।'),
        watch: L('While subtracting, change the sign of every term of the second equation — the most common mistake in this method.',
                 'घटाते समय दूसरे समीकरण के प्रत्येक पद का चिह्न बदलिए — इस विधि की सबसे सामान्य भूल।')
      });
    }
  }

  /* 2. Substitution */
  if (det !== 0) {
    const steps = [];
    // choose the equation and variable with the smallest coefficient to isolate
    const opts = [
      { e: e1, eo: e2, coef: a1, other: b1, solFor: 'x', label: 0 },
      { e: e1, eo: e2, coef: b1, other: a1, solFor: 'y', label: 0 },
      { e: e2, eo: e1, coef: a2, other: b2, solFor: 'x', label: 1 },
      { e: e2, eo: e1, coef: b2, other: a2, solFor: 'y', label: 1 }
    ].filter(o => Math.abs(o.coef) > 1e-9).sort((p, q) => Math.abs(p.coef) - Math.abs(q.coef));
    const o = opts[0];
    const k = o.solFor === 'x' ? o.other : o.other;      // coefficient of the other variable
    const isX = o.solFor === 'x';
    const subj = isX ? 'x' : 'y', otherV = isX ? 'y' : 'x';
    const eqNo = o.label + 1;
    steps.push({
      t: L(`In equation ${eqNo} the coefficient of ${subj} is the smallest, so make ${subj} the subject there.`,
           `समीकरण ${eqNo} में ${subj} का गुणांक सबसे छोटा है, अतः वहीं ${subj} को विषय बनाइए।`),
      m: `${subj} = (${UP.num.fmt(o.e.c)} ${k >= 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(k))}${otherV}) / ${UP.num.fmt(o.coef)}`
    });
    const coOther = isX ? o.eo.b : o.eo.a;
    const coSubj = isX ? o.eo.a : o.eo.b;
    steps.push({
      t: L(`Substitute this expression into the other equation, so only ${otherV} is left.`,
           `इस व्यंक को दूसरे समीकरण में रखिए, जिससे केवल ${otherV} बचे।`),
      m: `${UP.num.fmt(coSubj)} · [(${UP.num.fmt(o.e.c)} ${k >= 0 ? '−' : '+'} ${UP.num.fmt(Math.abs(k))}${otherV}) / ${UP.num.fmt(o.coef)}] ${coOther >= 0 ? '+' : '−'} ${UP.num.fmt(Math.abs(coOther))}${otherV} = ${UP.num.fmt(o.eo.c)}`
    });
    steps.push({
      t: L(`Multiply through by ${UP.num.fmt(o.coef)} to clear the fraction, collect terms, and solve for ${otherV}.`,
           `भिन्न हटाने के लिए पूरे समीकरण को ${UP.num.fmt(o.coef)} से गुणा कीजिए, पद समेटिए और ${otherV} के लिए हल कीजिए।`),
      m: `${otherV} = ${isX ? UP.num.fmt(y) : UP.num.fmt(x)}`
    });
    steps.push({
      t: L(`Put that value back into the rearranged equation to get ${subj}.`,
           `वह मान पुनर्व्यवस्थित समीकरण में रखकर ${subj} ज्ञात कीजिए।`),
      m: `${subj} = ${isX ? UP.num.fmt(x) : UP.num.fmt(y)}  ⟹  (x, y) = (${UP.num.fmt(x)}, ${UP.num.fmt(y)})`
    });
    approaches.push({
      name: L('Substitution', 'प्रतिस्थापन'),
      tag: L('Best when a coefficient is 1 or −1', 'जब कोई गुणांक 1 या −1 हो तब सर्वोत्तम'),
      steps,
      why: L('It replaces one unknown with an expression, reducing two equations to one. Because the reasoning is a direct translation, it is also the easiest method to explain to someone else.',
              'यह एक अज्ञात को व्यंजक से बदल देता है, जिससे दो समीकरण एक हो जाते हैं। तर्क सीधा अनुवाद है, इसलिए किसी और को समझाना भी सबसे आसान है।'),
      watch: L('After substituting, multiply the whole equation by the denominator before simplifying — never simplify term-by-term.',
               'प्रतिस्थापित करने के बाद सरल करने से पहले पूरे समीकरण को हर से गुणा कीजिए — पद-दर-पद सरल न कीजिए।')
    });
  }

  /* 3. Graphical */
  {
    const steps = [];
    const intercepts = (a, b, c) => {
      const out = [];
      if (Math.abs(b) > 1e-9) out.push(`y = 0 ⇒ x = ${UP.num.fmt(c / a)}`);
      if (Math.abs(a) > 1e-9) out.push(`x = 0 ⇒ y = ${UP.num.fmt(c / b)}`);
      return out.join(' , ');
    };
    steps.push({
      t: L('Find two easy points on each line by setting y = 0 and x = 0. Two points fix a straight line.',
           'प्रत्येक रेखा पर दो सरल बिंदु ज्ञात कीजिए: y = 0 और x = 0 रखकर। दो बिंदु एक सरल रेखा निर्धारित करते हैं।'),
      m: `L₁: ${intercepts(a1, b1, c1)}\nL₂: ${intercepts(a2, b2, c2)}`
    });
    steps.push({
      t: L('Plot both lines on the same axes and read the point where they cross. The coordinates of that point are (x, y).',
           'दोनों रेखाएँ एक ही अक्ष पर खींचिए और जहाँ वे मिलती हैं वह बिंदु पढ़िए। उसी बिंदु के निर्देशांक (x, y) हैं।'),
      m: det !== 0 ? `Lines intersect at (${UP.num.fmt(x)}, ${UP.num.fmt(y)})` : `Lines are parallel / coincident — no single intersection point`
    });
    if (det !== 0) {
      steps.push({
        t: L('Check by reading the graph: does the crossing point sit on both lines? Mark it and label the axes.',
             'ग्राफ पढ़कर जाँचिए: क्या प्रतिच्छेद बिंदु दोनों रेखाओं पर है? उसे चिह्नित कीजिए और अक्षों पर नाम लिखिए।'),
        m: `${a1}(${UP.num.fmt(x)}) + ${b1}(${UP.num.fmt(y)}) = ${UP.num.fmt(a1 * x + b1 * y)} ✓`
      });
    }
    approaches.push({
      name: L('Graphical method', 'ग्राफीय विधि'),
      tag: L('Required when the question says "solve graphically"', 'जब प्रश्न "ग्राफीय विधि से हल कीजिए" कहे तब आवश्यक'),
      steps,
      why: L('Graphing shows why the three cases exist: two lines can cross once, never cross, or lie on each other. That picture is what makes the ratio test in the textbook believable.',
              'ग्राफ दिखाता है कि तीन स्थितियाँ क्यों होती हैं: दो रेखाएँ एक बार मिल सकती हैं, कभी नहीं मिल सकतीं, या एक-दूसरे पर हो सकती हैं। यही चित्र पाठ्यपुस्तक की अनुपात-जाँच को विश्वसनीय बनाता है।'),
      watch: L('Scale the axes equally, otherwise the intersection looks right but reads wrong. Write the coordinates of two points in the answer.',
               'अक्षों का पैमाना समान रखिए, अन्यथा प्रतिच्छेद सही दिखते हुए भी गलत पढ़ा जाएगा। उत्तर में दो बिंदुओं के निर्देशांक अवश्य लिखिए।')
    });
  }

  /* 4. Cross multiplication + consistency */
  {
    const steps = [];
    steps.push({
      t: L('First test consistency with the three ratios. This tells you what kind of answer to expect before you solve anything.',
           'पहले तीन अनुपातों से संगतता जाँचिए। इससे हल करने से पहले पता चल जाता है कि किस प्रकार का उत्तर आएगा।'),
      m: `a₁/a₂ = ${UP.num.fmt(a1 / a2)} , b₁/b₂ = ${UP.num.fmt(b1 / b2)} , c₁/c₂ = ${UP.num.fmt(c1 / c2)}`
    });
    const unique = Math.abs(a1 * b2 - a2 * b1) > 1e-12;
    const sameAB = Math.abs(a1 * b2 - a2 * b1) < 1e-12;
    const sameC = sameAB && Math.abs(a1 * c2 - a2 * c1) < 1e-12;
    steps.push({
      t: L(unique ? 'The first two ratios differ, so the lines intersect and the pair has a unique solution.'
                  : sameC ? 'All three ratios are equal, so the lines coincide and there are infinitely many solutions.'
                          : 'The first two ratios are equal but the third differs, so the lines are parallel and there is no solution.',
           unique ? 'पहले दो अनुपात भिन्न हैं, अतः रेखाएँ प्रतिच्छेद करती हैं और युग्म का अद्वितीय हल है।'
                  : sameC ? 'तीनों अनुपात बराबर हैं, अतः रेखाएँ संपाती हैं और अपरिमित अनेक हल हैं।'
                          : 'पहले दो अनुपात बराबर हैं पर तीसरा भिन्न है, अतः रेखाएँ समांतर हैं और कोई हल नहीं है।')
    });
    if (unique) {
      steps.push({
        t: L('Apply the cross-multiplication formula directly — one line gives both unknowns.',
             'सीधे वज्र-गुणन सूत्र लगाइए — एक ही पंक्ति से दोनों अज्ञात मिल जाते हैं।'),
        m: `x/(b₁c₂ − b₂c₁) = y/(c₁a₂ − c₂a₁) = 1/(a₁b₂ − a₂b₁)\nx = ${UP.num.fmt(x)},  y = ${UP.num.fmt(y)}`
      });
    }
    approaches.push({
      name: L('Cross-multiplication + consistency test', 'वज्र-गुणन + संगतता जाँच'),
      tag: L('Ideal for "for what value of k…" questions', '"k के किस मान के लिए…" प्रश्नों के लिए आदर्श'),
      steps,
      why: L('The ratio test converts a solving question into a comparing question. For "find k" problems you never solve — you only set ratios equal, which is far quicker and exactly what the marking scheme expects.',
              'अनुपात-जाँच हल करने के प्रश्न को तुलना के प्रश्न में बदल देती है। "k ज्ञात कीजिए" प्रश्नों में हल नहीं करना होता — केवल अनुपात बराबर रखने होते हैं, जो बहुत तेज़ है और अंक-योजना की अपेक्षा भी यही है।'),
      watch: L('The formula is symmetric but easy to mis-remember: the middle denominator uses c₁a₂ − c₂a₁, not a₁c₂ − a₂c₁.',
               'सूत्र सममित है पर भ्रमित करने वाला: मध्य हर में c₁a₂ − c₂a₁ आता है, a₁c₂ − a₂c₁ नहीं।')
    });
  }

  const sol = x !== null ? { en: `x = ${UP.num.fmt(x)}, y = ${UP.num.fmt(y)}`, hi: `x = ${UP.num.fmt(x)}, y = ${UP.num.fmt(y)}` }
    : { en: 'Check consistency — this pair has no unique solution.', hi: 'संगतता जाँचिए — इस युग्म का अद्वितीय हल नहीं है।' };

  return {
    kind: 'linear-pair',
    chapter: 3,
    title: { en: 'Pair of linear equations — solved four ways', hi: 'रैखिक समीकरण युग्म — चार विधियों से हल' },
    summary: { en: eqStr(a1, b1, c1) + '  |  ' + eqStr(a2, b2, c2), hi: eqStr(a1, b1, c1) + '  |  ' + eqStr(a2, b2, c2) },
    result: sol,
    approaches,
    verify: {
      en: 'Put both values back into BOTH original equations. Each must give a true statement.',
      hi: 'दोनों मान दोनों मूल समीकरणों में वापस रखिए। प्रत्येक से सत्य कथन मिलना चाहिए।'
    },
    related: [3, 4],
    _geom: { a1, b1, c1, a2, b2, c2, x: x !== null ? x : 0, y: y !== null ? y : 0 }
  };
};
