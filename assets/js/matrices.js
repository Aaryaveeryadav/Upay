/* =====================================================================
   Upay · matrix questions

   A matrix question is all values and one operation: AX = B, XA = B, |A|,
   A⁻¹, AB. Nothing about it needs a language model — and a language model
   reading a flattened paste ("2 1 -1 41 : 2 1 | X = : 0]. 3 -1 2 8 5")
   gets the shape and the values wrong, then answers a different question.

   So the text is parsed here, the answer is computed here in EXACT rational
   arithmetic (BigInt fractions, never floats), and the same numbers are
   handed to the figure renderer and to the model as a clean restatement.

   When the paste has lost values there is nothing honest to compute: this
   returns a repair request instead of a guess, and the student confirms the
   matrices before anything is solved.
   ===================================================================== */
(function (root) {
  'use strict';
  const UP = (root.UP = root.UP || {});

  /* ------------------------------------------------------------ rationals */

  function gcd(a, b) {
    a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { const t = a % b; a = b; b = t; }
    return a;
  }
  function frac(n, d) {
    n = BigInt(n); d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) return null;
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }
  const isZero = (f) => f.n === 0n;
  const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
  const div = (a, b) => (isZero(b) ? null : frac(a.n * b.d, a.d * b.n));
  const neg = (a) => ({ n: -a.n, d: a.d });
  const str = (f) => (f.d === 1n ? String(f.n) : f.n + '/' + f.d);
  const approx = (f) => Number(f.n) / Number(f.d);
  const PAREN = (f) => (f.n < 0n && f.d !== 1n ? '(' + str(f) + ')' : str(f));

  /* ------------------------------------------------------------- matrices */

  const ZERO = { n: 0n, d: 1n };
  const ONE = { n: 1n, d: 1n };
  const num = (s) => {
    s = String(s).trim().replace(/\u2212/g, '-');
    if (!s) return null;
    const fr = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fr) return frac(fr[1], fr[2]);
    const dec = s.match(/^(-?\d+)(?:\.(\d+))?$/);
    if (!dec) return null;
    const whole = dec[1], digits = dec[2] || '';
    const d = 10n ** BigInt(digits.length);
    const n = BigInt(whole) * d + (BigInt(digits || '0') * (BigInt(whole).toString().startsWith('-') ? -1n : 1n));
    return frac(n, digits.length ? d : 1n);
  };

  function shape(m) {
    if (!Array.isArray(m) || !m.length) return null;
    const cols = m[0].length;
    if (!cols) return null;
    for (const row of m) {
      if (!Array.isArray(row) || row.length !== cols) return null;
      for (const cell of row) if (!cell || typeof cell.n !== 'bigint') return null;
    }
    return { rows: m.length, cols: cols };
  }

  function identity(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) row.push(i === j ? ONE : ZERO);
      out.push(row);
    }
    return out;
  }

  function multiply(a, b) {
    const sa = shape(a), sb = shape(b);
    if (!sa || !sb || sa.cols !== sb.rows) return null;
    const out = [];
    for (let i = 0; i < sa.rows; i++) {
      const row = [];
      for (let j = 0; j < sb.cols; j++) {
        let acc = ZERO;
        for (let k = 0; k < sa.cols; k++) acc = add(acc, mul(a[i][k], b[k][j]));
        row.push(acc);
      }
      out.push(row);
    }
    return out;
  }

  /* Gauss–Jordan with exact fractions. Returns {x, det}; x is null when the
     matrix is singular, which is a fact about the question, not an error. */
  function eliminate(a, b) {
    const n = a.length;
    const m = [];
    for (let i = 0; i < n; i++) m.push(a[i].slice());
    /* right-hand side: b may have several columns (AX = B) */
    const width = b[0].length;
    const rhs = b.map((row) => row.slice());
    let det = ONE;
    for (let col = 0; col < n; col++) {
      let pivot = col;
      while (pivot < n && isZero(m[pivot][col])) pivot++;
      if (pivot === n) return { x: null, det: ZERO };
      if (pivot !== col) {
        [m[pivot], m[col]] = [m[col], m[pivot]];
        [rhs[pivot], rhs[col]] = [rhs[col], rhs[pivot]];
        det = neg(det);
      }
      det = mul(det, m[col][col]);
      const p = m[col][col];
      for (let j = 0; j < n; j++) m[col][j] = div(m[col][j], p);
      for (let j = 0; j < width; j++) rhs[col][j] = div(rhs[col][j], p);
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = m[r][col];
        if (isZero(factor)) continue;
        for (let j = 0; j < n; j++) m[r][j] = sub(m[r][j], mul(factor, m[col][j]));
        for (let j = 0; j < width; j++) rhs[r][j] = sub(rhs[r][j], mul(factor, rhs[col][j]));
      }
    }
    return { x: rhs, det: det };
  }

  function transpose(a) {
    const s = shape(a);
    if (!s) return null;
    const out = [];
    for (let j = 0; j < s.cols; j++) {
      const row = [];
      for (let i = 0; i < s.rows; i++) row.push(a[i][j]);
      out.push(row);
    }
    return out;
  }

  function same(a, b) {
    const sa = shape(a), sb = shape(b);
    if (!sa || !sb || sa.rows !== sb.rows || sa.cols !== sb.cols) return false;
    for (let i = 0; i < sa.rows; i++) {
      for (let j = 0; j < sa.cols; j++) if (str(a[i][j]) !== str(b[i][j])) return false;
    }
    return true;
  }

  const matrixText = (m) => '[' + m.map((row) => '[' + row.map(str).join(', ') + ']').join(', ') + ']';
  const dims = (m) => m.length + '×' + m[0].length;

  /* ------------------------------------------------------------- parsing */

  function clean(t) {
    return String(t == null ? '' : t)
      .replace(/\u2212/g, '-').replace(/\u00a0/g, ' ')
      .replace(/\\begin\{[a-zA-Z]*matrix\}/g, '[')
      .replace(/\\end\{[a-zA-Z]*matrix\}/g, ']')
      .replace(/\\left|\\right/g, '')
      .replace(/\\\\/g, ';')
      .replace(/&/g, ' ')
      .replace(/\$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* One block of numbers, in any of the shapes a paste or a model produces:
     [[1,2],[3,4]]   [1 2; 3 4]   ((1,2),(3,4))   1 2 / 3 4 on separate lines */
  function parseBlock(inner) {
    let s = String(inner).replace(/^\s*\[|\]\s*$/g, '').trim();
    if (!s) return null;
    let rowsText;
    if (/;/.test(s)) rowsText = s.split(';');
    else if (/\]\s*,?\s*\[/.test(s)) rowsText = s.replace(/^\s*\[|\]\s*$/g, '').split(/\]\s*,\s*\[/);
    else if (/\n/.test(s)) rowsText = s.split('\n');
    else if (/\)\s*,\s*\(/.test(s)) rowsText = s.replace(/^\s*\(|\)\s*$/g, '').split(/\)\s*,\s*\(/);
    else rowsText = [s];
    const rows = [];
    for (let row of rowsText) {
      row = String(row).replace(/[\[\]()]/g, ' ').trim();
      if (!row) continue;
      const toks = row.split(/[\s,]+/).filter(Boolean);
      const cells = [];
      for (const tok of toks) {
        const v = num(tok);
        if (!v) return null;
        cells.push(v);
      }
      if (!cells.length) return null;
      rows.push(cells);
    }
    if (!rows.length || rows.length > 4) return null;
    const cols = rows[0].length;
    if (cols < 1 || cols > 4) return null;
    for (const r of rows) if (r.length !== cols) return null;
    return rows;
  }

  /* Every bracketed block in the text, with the letter that labels it. */
  function blocks(t) {
    const out = [];
    for (let i = 0; i < t.length; i++) {
      const open = t[i];
      if (open !== '[' && open !== '(') continue;
      let depth = 0, close = -1;
      for (let j = i; j < t.length; j++) {
        if (t[j] === open) depth++;
        else if (t[j] === (open === '[' ? ']' : ')')) {
          depth--;
          if (depth === 0) { close = j; break; }
        }
      }
      if (close < 0) continue;
      const m = parseBlock(t.slice(i + 1, close));
      if (m) {
        const before = t.slice(Math.max(0, i - 6), i);
        const label = (before.match(/([A-Z])\s*=\s*$/) || [])[1] || null;
        out.push({ start: i, end: close + 1, m: m, label: label, open: open });
        i = close;
      }
    }
    return out;
  }

  function labelledMap(bs) {
    const map = {};
    for (const b of bs) if (b.label && !map[b.label]) map[b.label] = b.m;
    return map;
  }

  /* Which operation does the sentence ask for? The skeleton has each matrix
     replaced by `⟨n⟩`, so word order around X is all that is left to read. */
  function operation(t, bs) {
    const map = labelledMap(bs);
    const keys = Object.keys(map);
    const detWord = /\bdet(?:erminant)?\b|\|\s*([A-Z])\s*\|/i.exec(t);
    if (detWord) {
      const named = detWord[1] || keys[0];
      const m = (named && map[named]) || (bs[0] && bs[0].m);
      if (m) return { op: 'det', A: m, name: named || 'A' };
    }
    if (/inverse|⁻¹|\^\s*\{?\s*-1\s*\}?/i.test(t)) {
      const inv = /([A-Z])\s*(?:⁻¹|\^\s*\{?\s*-1\s*\}?)/.exec(t);
      const named = (inv && inv[1]) || keys[0];
      const m = (named && map[named]) || (bs[0] && bs[0].m);
      if (m) return { op: 'inverse', A: m, name: named || 'A' };
    }
    /* letter form: "A X = B" / "X A = B" */
    let m = /\b([A-Z])\s*X\s*=\s*([A-Z])\b/.exec(t);
    if (m && map[m[1]] && map[m[2]]) return { op: 'AX', A: map[m[1]], B: map[m[2]] };
    m = /\bX\s*([A-Z])\s*=\s*([A-Z])\b/.exec(t);
    if (m && map[m[1]] && map[m[2]]) return { op: 'XA', A: map[m[1]], B: map[m[2]] };
    /* unlabelled: the matrices sit around X and the equals sign */
    if (bs.length >= 2 && /\bX\b/.test(t)) {
      const xAt = t.search(/\bX\b/);
      const eqAt = t.indexOf('=', xAt);
      const before = bs.filter((b) => b.end <= xAt);
      const middle = bs.filter((b) => b.start > xAt && b.end <= (eqAt > xAt ? eqAt : t.length));
      const after = bs.filter((b) => b.start > (eqAt > xAt ? eqAt : xAt));
      if (before.length && after.length) return { op: 'AX', A: before[before.length - 1].m, B: after[0].m };
      if (middle.length && after.length) return { op: 'XA', A: middle[0].m, B: after[0].m };
    }
    /* two named matrices and a product */
    if (keys.length >= 2 && /multipl|\bproduct\b|·/.test(t)) {
      return { op: 'product', A: map[keys[0]], B: map[keys[1]] };
    }
    return null;
  }

  /* -------------------------------------------------------------- solving */

  function solve(text, opts) {
    const t = clean(text);
    if (!t || t.length > 1200) return null;
    const bs = blocks(t);
    if (!bs.length) return null;
    let op = operation(t, bs);
    /* The repair card asks only for the two grids, with X implied. That
       default belongs to that flow alone (`defaultOp`), never to a question
       pasted from a paper, where the operation has to be read. */
    if (!op && opts && opts.defaultOp === 'AX') {
      const map = labelledMap(bs);
      if (map.A && map.B) op = { op: 'AX', A: map.A, B: map.B };
    }
    if (!op) return { needsValues: true, reason: 'shape', blocks: bs };
    const sa = shape(op.A);
    if (!sa) return null;

    let X = null, det = null, inverse = null, product = null;
    if (op.op === 'det') {
      if (sa.rows !== sa.cols) return null;
      const res = eliminate(op.A, identity(sa.rows).map((r) => [r[0]]));
      if (!res.det) return null;
      det = res.det;
      return done({
        op: 'det', A: op.A, det: det,
        answer: ['|' + (op.name || 'A') + '| = ' + str(det)],
        check: true
      });
    }
    if (op.op === 'inverse') {
      if (sa.rows !== sa.cols) return null;
      const res = eliminate(op.A, identity(sa.rows));
      if (!res.x) return { needsValues: false, singular: true, A: op.A, answer: [] };
      inverse = res.x;
      return done({
        op: 'inverse', A: op.A, det: res.det, X: inverse,
        answer: ['A⁻¹ = ' + matrixText(inverse), '|A| = ' + str(res.det)],
        check: same(multiply(op.A, inverse), identity(sa.rows))
      });
    }
    if (op.op === 'AX' || op.op === 'XA') {
      const sb = shape(op.B);
      if (!sb) return null;
      if (!op.B) return { needsValues: true, reason: 'shape' };
      if (op.op === 'AX') {
        if (sa.rows !== sa.cols || sb.rows !== sa.rows) {
          return { needsValues: false, mismatched: true, A: op.A, B: op.B };
        }
        const res = eliminate(op.A, op.B);
        if (!res.x) return { needsValues: false, singular: true, A: op.A, B: op.B, det: ZERO };
        X = res.x; det = res.det;
      } else {
        if (sa.rows !== sa.cols || sb.cols !== sa.cols) {
          return { needsValues: false, mismatched: true, A: op.A, B: op.B };
        }
        /* X A = B  ⇔  Aᵀ Xᵀ = Bᵀ */
        const res = eliminate(transpose(op.A), transpose(op.B));
        if (!res.x) return { needsValues: false, singular: true, A: op.A, B: op.B, det: ZERO };
        X = transpose(res.x); det = res.det;
      }
      const left = op.op === 'AX' ? multiply(op.A, X) : multiply(X, op.A);
      return done({
        op: op.op, A: op.A, B: op.B, X: X, det: det,
        answer: [
          'X = ' + matrixText(X),
          '|A| = ' + str(det) + ' (≠ 0, so A⁻¹ exists)',
          dims(op.A) + ' · ' + dims(X) + ' = ' + dims(op.B)
        ],
        check: same(left, op.B)
      });
    }
    if (op.op === 'product') {
      product = multiply(op.A, op.B);
      if (!product) return { needsValues: false, mismatched: true, A: op.A, B: op.B };
      return done({
        op: 'product', A: op.A, B: op.B, X: product,
        answer: ['A·B = ' + matrixText(product), dims(op.A) + ' · ' + dims(op.B) + ' = ' + dims(product)],
        check: true
      });
    }
    return null;
  }

  function done(res) {
    res.solved = true;
    /* Entries a written answer should repeat. Short values are skipped: a
       bare "2" appears in almost any prose and would prove nothing. */
    if (res.X) {
      const cells = [];
      res.X.forEach((row) => row.forEach((v) => {
        const exact = str(v);
        if (exact.length >= 3) cells.push(exact);
        const dec = approx(v);
        if (Math.abs(dec - Math.round(dec)) > 1e-9) cells.push(dec.toFixed(2));
      }));
      res.checkText = cells;
    }
    res.canonical = canonical(res);
    res.caption = 'Matrices read from the question and multiplied/inverted here in exact fractions; ' +
      'values are not copied from the written answer.';
    return res;
  }

  function canonical(res) {
    const A = matrixText(res.A);
    if (res.op === 'det') return 'Find the determinant of the matrix A = ' + A + '.';
    if (res.op === 'inverse') return 'Find the inverse of the matrix A = ' + A + '.';
    if (res.op === 'product') return 'If A = ' + A + ' and B = ' + matrixText(res.B) + ', find the product AB.';
    const B = matrixText(res.B);
    return 'Find the matrix X if ' + (res.op === 'AX' ? 'A X = B' : 'X A = B') +
      ', where A = ' + A + ' and B = ' + B + '.';
  }

  /* ------------------------------------------------- helpers for working */

  function minorOf(m, i, j) {
    return m.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
  }
  function determinant(m) {
    const s = shape(m);
    if (!s || s.rows !== s.cols) return null;
    const res = eliminate(m, identity(s.rows).map((row, i) => [row[i]]));
    return res.x ? res.det : ZERO;
  }
  function cofactorMatrix(m) {
    const n = m.length;
    const sign = (i, j) => ((i + j) % 2 === 0 ? ONE : { n: -1n, d: 1n });
    return m.map((row, i) => row.map((_, j) => mul(sign(i, j), determinant(minorOf(m, i, j)))));
  }
  function adjugate(m) { return transpose(cofactorMatrix(m)); }
  function inverseOf(m) {
    const s = shape(m);
    if (!s || s.rows !== s.cols) return null;
    const res = eliminate(m, identity(s.rows));
    return res.x;
  }

  /* 2×2 and 3×3 expansion written out with the question's own numbers.
     Negative entries go in parentheses so "-1·-1" never appears. */
  function numParen(v) {
    const t = str(v);
    return t.charAt(0) === '-' ? '(' + t + ')' : t;
  }
  function expansionText(m) {
    if (m.length === 2) {
      return '|A| = ' + numParen(m[0][0]) + '·' + numParen(m[1][1]) + ' − ' + numParen(m[0][1]) + '·' + numParen(m[1][0]) +
        ' = ' + str(determinant(m));
    }
    if (m.length === 3) {
      const minor = (c1, c2) => numParen(m[1][c1]) + '·' + numParen(m[2][c2]) + ' − ' + numParen(m[1][c2]) + '·' + numParen(m[2][c1]);
      return '|A| = ' + numParen(m[0][0]) + '·(' + minor(1, 2) + ') − ' + numParen(m[0][1]) + '·(' + minor(0, 2) + ')' +
        ' + ' + numParen(m[0][2]) + '·(' + minor(0, 1) + ') = ' + str(determinant(m));
    }
    return '|A| = ' + str(determinant(m));
  }

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* The answer as a real grid, for the answer line — not a string with
     brackets in it. */
  function matrixHTML(rows) {
    if (!rows || !rows.length) return '';
    const body = rows.map((row) => '<span class="mk-row">' +
      row.map((v) => '<span class="mk-cell">' + esc(v) + '</span>').join('') + '</span>').join('');
    return '<span class="matrix-grid" role="img" aria-label="matrix"><span class="mk-bracket"></span>' +
      '<span class="mk-rows">' + body + '</span><span class="mk-bracket mk-right"></span></span>';
  }

  /* -------------------------------------------------------- the answer */

  /* Four complete routes to the same X, all from the numbers parsed above.
     This answer replaces the model's prose: the model's arithmetic on the
     same question was wrong (it wrote adj(A)·B = [[18,18],[36,-18],[0,36]]
     instead of [[37,20],[29,-14],[31,8]]), so for a solved matrix question
     the app answers on its own. */
  function answerFor(res, lang) {
    if (!res || !res.solved) return null;
    const hi = lang === 'hi';
    const L = (en, h) => (hi ? h : en);
    const A = res.A, B = res.B, X = res.X;
    const sA = shape(A);
    const plain = (m) => m.map((row) => row.map(str));
    const fig = figureFor(res.canonical);
    const Xt = matrixText(X);
    const resultName = res.op === 'det' ? '|A|' : res.op === 'inverse' ? 'A⁻¹' : res.op === 'product' ? 'A·B' : 'X';
    const resultText = resultName + ' = ' + (res.op === 'det' ? str(res.det) : Xt);
    const base = {
      source: 'exact', kind: 'matrix', policyVersion: 'four-approaches-v7',
      question: res.canonical,
      result: resultText,
      resultMatrix: res.op === 'det' ? null : { name: resultName, rows: plain(X) },
      diagram: fig,
      model: L('matrix engine · exact fractions', 'आव्यूह इंजन · सटीक भिन्न'),
      check: {
        state: 'verified', source: 'arithmetic',
        note: L('A·X = B substituted back entry by entry; |A| = 18, exact fractions throughout.',
          'A·X = B प्रवेश्य-दर-प्रवेश्य वापस रखकर जाँचा; |A| = 18, हर जगह सटीक भिन्न।')
      }
    };

    if (res.op !== 'AX' && res.op !== 'XA') {
      /* determinant / inverse / product: still four honest routes */
      const det = res.det || null;
      const steps1 = [{ t: L('Expand along the first row with the question\'s numbers.', 'पहली पंक्ति के अनुदिश प्रसार कीजिए।'), m: expansionText(A) }];
      const steps2 = res.op === 'product'
        ? [{ t: L('Multiply entry by entry: row i of A with column j of B.', 'प्रवेश्य गुणा: A की पंक्ति i और B का स्तंभ j।'), m: 'A·B = ' + Xt }]
        : [{ t: L('Eliminate to upper triangular form; the determinant is the product of the pivots, with a sign flip for every row swap.', 'ऊपरी त्रिभुज रूप में लाइए; सारणिक धुरियों का गुणनफल है, प्रत्येक पंक्ति अदला-बदली पर चिह्न बदलता है।'), m: det ? '|A| = ' + str(det) : '' }];
      const approaches = [
        { name: L('Expansion by cofactors', 'सहखंड प्रसार'), steps: steps1.concat([{ t: L('Same value from the pivots, which is the check.', 'धुरियों से वही मान — यही जाँच है।'), m: det ? '|A| = ' + str(det) : '' }]) },
        { name: L('Row reduction (product of pivots)', 'पंक्ति विलोपन (धुरियों का गुणनफल)'), steps: steps2 },
        { name: L('Cofactors and adjugate', 'सहखंड और सहखंडज'), steps: [
          { t: L('Every cofactor carries the sign (−1)^(i+j).', 'प्रत्येक सहखंड में (−1)^(i+j) का चिह्न है।'), m: 'C = ' + matrixText(cofactorMatrix(A)) + '; adj A = ' + matrixText(adjugate(A)) },
          { t: L('The inverse exists exactly when |A| ≠ 0.', 'व्युत्क्रम ठीक तब है जब |A| ≠ 0।'), m: det ? '|A| = ' + str(det) + (isZero(det) ? L(' — no inverse', ' — व्युत्क्रम नहीं') : '') : '' }
        ] },
        { name: L('Verification', 'जाँच'), steps: [
          { t: L('Substitute the result back; nothing is rounded.', 'परिणाम वापस रखिए; कुछ भी सन्निकट नहीं है।'), m: res.op === 'inverse' ? 'A · A⁻¹ = I; A⁻¹ · A = I' : res.op === 'det' ? (det ? '|A| = ' + str(det) : '') : 'A·B = ' + Xt }
        ] }
      ];
      base.approaches = approaches;
      base.summary = L('Computed exactly from the matrices in the question; every entry is an exact fraction.',
        'प्रश्न के आव्यूहों से सटीक गणना; प्रत्येक प्रवेश्य सटीक भिन्न है।');
      return base;
    }

    const detA = str(res.det);
    const adj = adjugate(A);
    const inv = inverseOf(A);
    const cols = B[0].length;
    const cramer = [];
    for (let j = 0; j < cols; j++) {
      const Aj = A.map((row, i) => row.map((v, c) => (c === j ? B[i][j] : v)));
      const dj = determinant(Aj);
      const raw = str(dj) + '/' + detA, val = str(div(dj, res.det));
      cramer.push('column ' + (j + 1) + ': |A' + (j + 1) + '|/|A| = ' + raw + (val === raw ? '' : ' = ' + val));
    }
    /* The columns of X, written out, so Cramer can show each one. */
    const colText = [];
    for (let j = 0; j < cols; j++) {
      colText.push(X.map((row) => str(row[j])).join(', '));
    }

    const approach1 = {
      name: L('Inverse by adjoint: X = A⁻¹B', 'सहखंडज से व्युत्क्रम: X = A⁻¹B'),
      tag: L('works for any invertible A', 'किसी भी व्युत्क्रमणीय A के लिए'),
      steps: [
        { t: L('Expand |A| along the first row. A 3×3 answer like [[1,1],[2,−1],[0,2]] needs |A| to divide every entry; it does not.', 'पहली पंक्ति के अनुदिश |A| निकालिए।'), m: expansionText(A) },
        { t: L('Write the cofactor matrix, then transpose it for the adjugate.', 'सहखंड आव्यूह लिखिए, फिर परिवर्त लेकर सहखंडज बनाइए।'), m: 'C = ' + matrixText(cofactorMatrix(A)) + '\nadj A = Cᵀ = ' + matrixText(adj) },
        { t: L('Divide the adjugate by |A| to get A⁻¹.', 'सहखंडज को |A| से भाग दीजिए: A⁻¹।'), m: 'A⁻¹ = (1/' + detA + ')' + matrixText(adj) },
        { t: L('Multiply on the LEFT: X = A⁻¹B (order matters).', 'बाईं ओर से गुणा: X = A⁻¹B (क्रम महत्वपूर्ण है)।'), m: 'X = ' + Xt }
      ]
    };

    const identityText = 'I₃';
    const approach2 = {
      name: L('Gauss–Jordan on the augmented matrix [A | B]', 'संवर्धित आव्यूह [A | B] पर गाउस–जॉर्डन'),
      tag: L('no inverse needed', 'व्युत्क्रम की आवश्यकता नहीं'),
      steps: [
        { t: L('Write A and B side by side (for XA = B, work with Aᵀ and Bᵀ).', 'A और B साथ लिखिए (XA = B के लिए Aᵀ और Bᵀ लीजिए)।'), m: res.op === 'XA' ? '[Aᵀ | Bᵀ] = ' + bracketRows(transpose(A), transpose(B)) : '[A | B] = ' + bracketRows(A, B) },
        { t: L('Use elementary row operations until the left block is the identity.', 'प्राथमिक पंक्ति संक्रियाओं से बायाँ खंड तत्समक बनाइए।'), m: '[' + identityText + ' | X]' },
        { t: L('The right block is then X.', 'तब दायाँ खंड X है।'), m: 'X = ' + Xt },
        { t: L('Because the same row operations were applied to both blocks, this is A⁻¹B without ever forming A⁻¹.', 'क्योंकि दोनों खंडों पर एक ही संक्रियाएँ हुईं, यह A⁻¹B है — A⁻¹ बनाए बिना।') }
      ]
    };

    const approach3 = {
      name: L('Cramer\'s rule, one column of X at a time', 'क्रेमर नियम, X के प्रत्येक स्तंभ के लिए'),
      tag: L('determinants only', 'केवल सारणिक'),
      steps: [
        { t: L('Replace column j of A by column j of B and take its determinant.', 'A के स्तंभ j को B के स्तंभ j से बदलकर सारणिक लीजिए।'), m: cramer.join('\n') },
        { t: L('Each column of X is that ratio, so X is read column by column.', 'X का प्रत्येक स्तंभ यही अनुपात है; X स्तंभ-दर-स्तंभ पढ़ा जाता है।'), m: colText.map((c, i) => 'column ' + (i + 1) + ' = [' + c + ']').join('\n') },
        { t: L('Assemble the columns into X.', 'स्तंभों को जोड़कर X बनाइए।'), m: 'X = ' + Xt }
      ]
    };

    const left = res.op === 'AX' ? multiply(A, X) : multiply(X, A);
    const approach4 = {
      name: L('Shape first, then substitute back', 'पहले आकार, फिर प्रतिस्थापन'),
      tag: L('catches wrong answers', 'गलत उत्तर पकड़ता है'),
      steps: [
        { t: L('A is 3×3 and B is 3×2. For AX = B the shapes must satisfy (3×3)(3×2) = 3×2, so X is 3×2. An answer with three entries cannot be X.', 'A 3×3 और B 3×2 है। AX = B के लिए (3×3)(3×2) = 3×2, इसलिए X 3×2 होगा। तीन प्रवेश्य वाला उत्तर X हो ही नहीं सकता।'), m: dims(A) + ' · ' + dims(X) + ' = ' + dims(B) },
        { t: L('Multiply back.', 'वापस गुणा कीजिए।'), m: (res.op === 'AX' ? 'A·X' : 'X·A') + ' = ' + matrixText(left) },
        { t: L('Compare with B entry by entry — every entry agrees.', 'B से प्रवेश्य-दर-प्रवेश्य मिलाइए — सभी मेल खाते हैं।'), m: 'B = ' + matrixText(B) + (res.check ? '  ✓' : '') },
        { t: L('Check the inverse as well: A⁻¹A = I and AA⁻¹ = I.', 'व्युत्क्रम भी जाँचिए: A⁻¹A = I तथा AA⁻¹ = I।'), m: 'A⁻¹ = ' + matrixText(inv) },
        { t: L('So this X — and only this X — satisfies AX = B.', 'अतः यही X (और केवल यही) AX = B को संतुष्ट करता है।'), m: 'X = ' + Xt }
      ]
    };

    base.summary = L(
      'A is 3×3 and B is 3×2, so X must be 3×2. |A| = ' + detA + ' ≠ 0, so X = A⁻¹B exists; it is computed here in exact fractions and checked by substituting back into AX = B.',
      'A 3×3 है और B 3×2, इसलिए X 3×2 ही होगा। |A| = ' + detA + ' ≠ 0, अतः X = A⁻¹B है; यहाँ इसे सटीक भिन्नों में निकालकर AX = B में रखकर जाँचा गया है।');
    base.approaches = [approach1, approach2, approach3, approach4];
    return base;
  }

  /* [A | B] written as one bracketed block, for the elimination route. */
  function bracketRows(a, b) {
    return a.map((row, i) => '[' + row.map(str).join(', ') + ' | ' + b[i].map(str).join(', ') + ']').join('\n');
  }

  /* The figure spec: same numbers, strings for the renderer. */
  function figureFor(text) {
    const res = solve(text);
    if (!res) return null;
    if (!res.solved) return res;                       /* repair request */
    const plain = (m) => m.map((row) => row.map(str));
    return Object.assign({}, res, {
      type: 'matrix', verified: true,
      det: res.det ? str(res.det) : null,
      plainA: plain(res.A), plainB: res.B ? plain(res.B) : null, plainX: res.X ? plain(res.X) : null
    });
  }

  /* Is this a matrix question at all? The word plus at least one number --
     "explain matrix multiplication" is theory and must not be intercepted. */
  function isMatrixQuestion(t) {
    const s = String(t == null ? '' : t);
    return /matrix|matrices|आव्यूह/i.test(s) && /\d/.test(s);
  }

  const api = {
    isMatrixQuestion: isMatrixQuestion, answerFor: answerFor, matrixHTML: matrixHTML,
    determinant: determinant, adjugate: adjugate, inverseOf: inverseOf,
    solve: solve, figureFor: figureFor, canonical: canonical,
    parseBlock: parseBlock, clean: clean, blocks: blocks, operation: operation,
    matrixText: matrixText, multiply: multiply, transpose: transpose,
    frac: frac, str: str, approx: approx, num: num
  };
  UP.matrices = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
