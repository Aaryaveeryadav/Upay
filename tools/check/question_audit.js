/* What happens to a question when it arrives.

   The reported failure was a photo of a matrix question: the scanner flattened
   the grid into "2 1 -1 41 / : 2 1|X= : 0]. / 3 -1 2 8 5", the solver could
   not read it, and the question went to the model as that line-soup — so the
   model answered a different matrix (or timed out). This audit walks a spread
   of real question shapes through the same decision the Ask screen makes and
   records, for each one, which pipeline takes it and what comes out.

     exact      the app answers it itself, from the question's own numbers
     repair     it looks like matrices but cannot be read: the student confirms
     figure+ai  the model writes the prose; the figure is computed here
     ai         the model takes it unchanged

   The hard rule: a question that really is a matrix must never reach the model
   as unreadable line-soup. It is either solved here or handed back to the
   student to confirm.

   No browser, no provider, no bank data. */

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { UP: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of [
  'assets/js/matrices.js',
  'assets/js/figures.js',
  'assets/js/worked-figure.js',
  'assets/js/square-integers.js',
  'assets/js/task-routing.js'
]) {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
}
const UP = sandbox.UP;
assert(UP.matrices && UP.figures && UP.workedFigure && UP.squareInteger && UP.taskRouting,
  'the engines must load');

/* ------------------------------------------------------------------ routing */

function route(q, subject) {
  const r = UP.taskRouting.resolve(q, subject || 'maths');
  const maths = ['maths', 'applied-maths'].includes(r.subject);
  const out = { subject: r.subject, pipeline: 'ai', answer: '', figure: null, block: null };

  if (maths) {
    let res = UP.matrices.solve(q);
    if (res && res.solved) {
      out.pipeline = 'exact';
      out.answer = 'matrix';
      out.res = res;
      out.figure = UP.matrices.figureFor(res.canonical);
      return out;
    }
    const rebuilt = UP.matrices.fromRows(q);
    if (rebuilt.ok) {
      const again = UP.matrices.solve(rebuilt.text);
      if (again && again.solved) {
        out.pipeline = 'exact';
        out.answer = 'matrix (rows rebuilt)';
        out.res = again;
        out.canonical = rebuilt.text;
        out.figure = UP.matrices.figureFor(again.canonical);
        return out;
      }
    }
    if (res && res.singular) { out.pipeline = 'exact'; out.answer = 'no unique X'; out.block = 'singular'; return out; }
    if (UP.matrices.isMatrixQuestion(q)) { out.pipeline = 'repair'; out.block = 'matrix-repair'; return out; }

    const exact = UP.squareInteger.solve(q, 'en');
    if (exact) { out.pipeline = 'exact'; out.answer = 'arithmetic'; out.res = exact; return out; }

  }

  /* Computed figures are not maths-only: optics and circuits live in physics. */
  const fig = UP.workedFigure.forQuestion(q);
  if (fig) { out.pipeline = 'figure+ai'; out.figure = fig; return out; }
  return out;
}

const rows = [];
function check(kind, subject, q, expect, verify) {
  const got = route(q, subject);
  let verdict = 'ok';
  try {
    assert.equal(got.pipeline, expect, kind + ': expected ' + expect + ', got ' + got.pipeline);
    if (verify) verify(got);
  } catch (e) {
    verdict = 'FAIL ' + e.message;
  }
  rows.push({ kind, subject: got.subject, q, pipeline: got.pipeline, answer: got.answer || '', verdict });
  return got;
}

/* ------------------------------------------------------------- the cases */

/* The photo in the report: rows survive, digits do not. Nothing may be
   invented to make a shape — the student confirms instead. */
const OCR_LOST = 'Hard Matrix Question: Find the matrix X if\n2 1 -1 41\n: 2 1|X= : 0].\n3 -1 2 8 5';
check('matrix · photo, digits lost', 'maths', OCR_LOST, 'repair', (g) => {
  assert.equal(UP.matrices.fromRows(OCR_LOST).ok, false, 'no reconstruction from incomplete rows');
});

/* A copy out of a PDF keeps every number but loses the grid: rebuild it. */
const FLAT = 'Find the matrix X if\n2 1 -1 4 1\n1 2 1 7 0\n3 -1 2 8 5';
check('matrix · flat rows, complete', 'maths', FLAT, 'exact', (g) => {
  assert.match(g.canonical, /A = \[\[2, 1, -1\], \[1, 2, 1\], \[3, -1, 2\]\]/);
  assert.match(g.canonical, /B = \[\[4, 1\], \[7, 0\], \[8, 5\]\]/);
});

const CANON = 'Find the matrix X if A X = B, where A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]] and B = [[4, 1], [7, 0], [8, 5]].';
check('matrix · canonical AX = B', 'maths', CANON, 'exact', (g) => {
  assert.equal(UP.matrices.matrixText(g.res.X), '[[37/18, 10/9], [29/18, -7/9], [31/18, 4/9]]');
});
check('matrix · XA = B', 'maths',
  'A = [[2, 1], [1, 3]]\nB = [[1, 0], [0, 1]]\nFind X such that X A = B.', 'exact', (g) => {
    assert.equal(UP.matrices.matrixText(g.res.X), '[[3/5, -1/5], [-1/5, 2/5]]');
  });
check('matrix · determinant', 'maths', 'Find the determinant of the matrix A = [[1, 2], [3, 4]].', 'exact', (g) => {
  assert.equal(g.res.det.n, -2n);
});
check('matrix · inverse', 'maths', 'Find the inverse of the matrix A = [[1, 2], [3, 4]].', 'exact', (g) => {
  assert.equal(UP.matrices.matrixText(g.res.X), '[[-2, 1], [3/2, -1/2]]');
});
check('matrix · product, no word "product"', 'maths',
  'A = [[1, 2], [3, 4]]\nB = [[5, 6], [7, 8]]\nFind AB.', 'exact', (g) => {
    assert.equal(UP.matrices.matrixText(g.res.X), '[[19, 22], [43, 50]]');
  });
check('matrix · singular', 'maths',
  'A = [[1, 2], [2, 4]]\nB = [[1], [2]]\nFind X such that A X = B.', 'exact', (g) => {
    assert.equal(g.block, 'singular');
  });
check('matrix · theory question', 'maths', 'Explain matrix multiplication with examples.', 'ai');
check('matrix · question with no numbers', 'maths', 'What is a matrix?', 'ai');

/* Arithmetic the app settles itself: the two integer families it carries. */
check('arithmetic · perfect square', 'maths',
  'Find all positive integers n for which n²+10n+2026 is a perfect square.', 'exact', (g) => {
    assert.equal(g.res.result, 'n = 15, 27, 327, 995');
  });
check('arithmetic · integer radical sum', 'maths',
  'Find all integers x for which √(x+6) + √(19-x) is an integer.', 'exact', (g) => {
    assert.equal(g.res.result, 'x ∈ {-6, 3, 10, 19}');
  });
/* A plain surd has no local solver — the table says so rather than pretending. */
check('arithmetic · √1764 (no local solver)', 'maths', 'Find the square root of 1764.', 'ai');

/* Computed figures: the drawing comes from the question, the prose from AI. */
check('mensuration · cylinder', 'maths',
  'Find the volume of a cylinder of radius 7 cm and height 10 cm.', 'figure+ai', (g) => {
    assert(g.figure && g.figure.verified, 'the cylinder figure must be computed');
  });
check('mensuration · cone', 'maths',
  'A cone has radius 6 cm and height 8 cm. Find its total surface area.', 'figure+ai');
check('mensuration · hemisphere', 'maths',
  'Find the total surface area of a hemisphere of radius 7 cm.', 'figure+ai');
check('coordinate geometry · distance', 'maths',
  'Find the distance between the points A(3, 4) and B(7, 1).', 'figure+ai');
check('trigonometry · tower', 'maths',
  'From a point P on the ground the angle of elevation of the top of a tower is 30°. After walking 20 m towards the tower the angle becomes 60°. Find the height of the tower.', 'figure+ai');
check('optics · convex lens', 'physics',
  'An object is placed 30 cm from a convex lens of focal length 15 cm. Find the position and nature of the image.', 'figure+ai');
check('optics · concave mirror', 'physics',
  'An object is placed 20 cm from a concave mirror of focal length 15 cm. Find the position, nature and size of the image.', 'figure+ai');
check('circuits · resistors', 'physics',
  'A 6 Ω and a 3 Ω resistor are connected in parallel, and that combination is connected in series with a 4 Ω resistor to a 12 V battery. Find the total resistance and the current supplied by the battery.', 'figure+ai');

/* Subjects the app must not pretend to solve. */
check('hindi · poem meaning', 'hindi', 'बादल गरजो कविता में बादल किन अर्थों की ओर संकेत करता है?', 'ai');
check('chemistry · balance equation', 'chemistry', 'Balance the chemical equation H2 + O2 → H2O.', 'ai');
check('physics · statement of law', 'physics', "State Newton's second law of motion.", 'ai');
check('biology · process', 'biology', 'Explain anaerobic respiration in muscle cells.', 'ai');

/* Numbers on separate lines must not silently become a matrix. */
check('arithmetic · data rows, not a matrix', 'maths',
  'A shop sold:\n3 4 25\n5 6 41\nFind the total money collected.', 'ai', () => {
    assert.equal(UP.matrices.fromRows('3 4 25\n5 6 41').reason, 'no-signal');
  });

/* ------------------------------------------------------------------ report */

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(pad('question type', 38) + pad('subject', 15) + pad('pipeline', 12) + 'verdict');
console.log('-'.repeat(96));
let failed = 0;
for (const r of rows) {
  if (r.verdict !== 'ok') failed++;
  console.log(pad(r.kind, 38) + pad(r.subject, 15) + pad(r.pipeline, 12) + r.verdict);
}
console.log('-'.repeat(96));
const count = (p) => rows.filter((r) => r.pipeline === p).length;
console.log(rows.length + ' questions audited: ' + count('exact') + ' answered exactly here, ' +
  count('repair') + ' sent back for confirmation, ' + count('figure+ai') + ' with a computed figure, ' +
  count('ai') + ' to the model.');

assert.equal(failed, 0, failed + ' question types are routed wrongly');
console.log('PASS question audit: every sampled question type reaches the pipeline that can answer it — ' +
  'a matrix with unreadable rows is never forwarded to the model as line-soup, a complete flat paste is ' +
  'rebuilt into [[row], [row]] and solved exactly, and ordinary number rows are never mistaken for a matrix');
