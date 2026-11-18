/* Contract for matrix questions.

   The failure this pins: a paste (or OCR) of a matrix question flattens the
   grid — "2 1 -1 41 : 2 1 | X = : 0]. 3 -1 2 8 5" — and a model reading that
   calls a 3×3 matrix 2×2 and answers a different question. So the values are
   parsed here, the answer is computed here in exact fractions, and the same
   numbers go to the figure. When the values did not survive, nothing is
   guessed: the student is asked for them.

   No browser, no provider, no bank data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { UP: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInNewContext(fs.readFileSync('assets/js/matrices.js', 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync('assets/js/figures.js', 'utf8'), sandbox);
const M = sandbox.UP.matrices, figures = sandbox.UP.figures;
assert(M && figures, 'the matrix engine and the renderer must load');

const clean = (svg) => !/NaN|undefined|Infinity/.test(svg);

/* ------------------------------------------- the question in the report */

const A = '[[2,1,-1],[1,2,1],[3,-1,2]]';
const B = '[[4,1],[7,0],[8,5]]';
const question = 'Hard Matrix Question: Find the matrix X if A X = B, where A = ' + A + ' and B = ' + B + '.';

const res = M.solve(question);
assert(res && res.solved, 'the equation must be recognised');
assert.equal(res.op, 'AX');
assert.equal(M.matrixText(res.A), '[[2, 1, -1], [1, 2, 1], [3, -1, 2]]', 'A must keep its 3×3 shape');
assert.equal(M.matrixText(res.B), '[[4, 1], [7, 0], [8, 5]]', 'B must keep its 3×2 shape');
assert.equal(M.str(res.det), '18', '|A| = 18');
assert.equal(M.matrixText(res.X), '[[37/18, 10/9], [29/18, -7/9], [31/18, 4/9]]', 'X must be exact');
assert(res.check === true, 'A·X must equal B exactly');
assert(res.answer[0].startsWith('X = [[37/18, 10/9]'), res.answer[0]);
assert(res.answer.some((a) => a.includes('3×3 · 3×2 = 3×2')), 'the dimensions must be stated: ' + res.answer
  .join(' | '));

/* A floating-point answer would show 2.0555555555555554; exact fractions do
   not. And the decimals in the answer stay short. */
assert(!/\.\d{6,}/.test(res.answer.join(' ')), 'no float noise in the answer');

/* The canonical restatement is what the model is asked, so its prose cannot
   read the shape wrong any more. */
assert.equal(res.canonical,
  'Find the matrix X if A X = B, where A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]] and B = [[4, 1], [7, 0], [8, 5]].');
assert(M.solve(res.canonical).canonical === res.canonical, 'the restatement must be stable');

/* ------------------------------------------------------------ the figure */

/* ------------------------------------------- the answer, not just a solve */

const ans = M.answerFor(res, 'en');
assert(ans && ans.source === 'exact' && ans.kind === 'matrix');
assert(ans.result === 'X = [[37/18, 10/9], [29/18, -7/9], [31/18, 4/9]]', ans.result);
assert.equal(ans.approaches.length, 4, 'four complete routes');
assert(ans.approaches.every((a) => a.steps.length >= 2 && a.steps.every((st) => st.t)));
assert(ans.approaches[0].name.includes('adjoint'));
assert(ans.approaches.some((a) => /Cramer/.test(a.name)));
assert(ans.approaches.every((a) => a.steps.some((st) => (st.m || '').includes('37/18'))),
  'every route must end at the same X');
assert(ans.check.state === 'verified' && ans.check.source === 'arithmetic',
  'the badge must claim arithmetic, not a second AI');
assert(ans.diagram && ans.diagram.type === 'matrix', 'the answer carries its figure');
assert.equal(JSON.stringify(ans.resultMatrix.rows[0]), JSON.stringify(['37/18', '10/9']));

/* The answer line renders as a grid, escaped, with three rows and brackets. */
const html = M.matrixHTML(ans.resultMatrix.rows);
assert(html.includes('mk-row') && html.includes('mk-bracket') && html.includes('37/18'));
assert.equal((html.match(/mk-cell/g) || []).length, 6, 'six entries of a 3×2 matrix');
assert(!/<script/i.test(M.matrixHTML([['<img src=x onerror=alert(1)>']])), 'entries must be escaped');

/* The paste that had no word "matrix" in it and timed out in the app. */
const PASTE = 'A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]]\nB = [[4, 1], [7, 0], [8, 5]]\n\nFind X such that AX = B.';
assert.equal(M.isMatrixQuestion(PASTE), true, 'a pasted block is recognised without the word "matrix"');
assert.equal(M.solve(PASTE).solved, true, 'and it solves');
assert.equal(M.answerFor(M.solve(PASTE), 'en').result, ans.result);
assert.equal(M.isMatrixQuestion('A = [[1,2],[3,4]], B=[[5,6],[7,8]]. Find AB.'), true);

/* "Find AB" — the juxtaposition is the operation. */
const prodAns = M.answerFor(M.solve('A = [[1,2],[3,4]]\nB = [[5,6],[7,8]]\nFind AB.'), 'en');
assert.equal(prodAns.result, 'A·B = [[19, 22], [43, 50]]');
assert.equal(prodAns.approaches.length, 4);
assert.equal(JSON.stringify(prodAns.resultMatrix.rows), JSON.stringify([['19', '22'], ['43', '50']]));

/* Determinant: no result matrix, but a grid-free answer and four routes. */
const detAns = M.answerFor(M.solve('Find the determinant of [[1, 2], [3, 4]].'), 'en');
assert.equal(detAns.result, '|A| = -2');
assert.equal(detAns.resultMatrix, null, 'a determinant is a number, not a matrix');
assert.equal(detAns.approaches.length, 4);
assert(detAns.approaches[1].name.includes('first column'), 'the second expansion is genuinely different');
assert(detAns.approaches.every((a) => a.steps.some((st) => /-2/.test(st.m || ''))));

/* Inverse: drawn as a matrix, and the verification survives. */
const invAns = M.answerFor(M.solve('Find the inverse of the matrix A = [[1,2],[3,4]].'), 'en');
assert.equal(invAns.result, 'A⁻¹ = [[-2, 1], [3/2, -1/2]]');
assert.equal((M.matrixHTML(invAns.resultMatrix.rows).match(/mk-cell/g) || []).length, 4);
assert(invAns.approaches[3].steps[0].m.includes('✓'), 'the multiply-back check passes');

const ansHi = M.answerFor(res, 'hi');
assert(ansHi.result === ans.result && /सहखंडज/.test(ansHi.approaches[0].name), 'Hindi routes, same numbers');

const spec = M.figureFor(question);
assert(spec && spec.type === 'matrix' && spec.verified);
assert.equal(JSON.stringify(spec.plainA), JSON.stringify([['2', '1', '-1'], ['1', '2', '1'], ['3', '-1', '2']]));
assert.equal(JSON.stringify(spec.plainB), JSON.stringify([['4', '1'], ['7', '0'], ['8', '5']]));
const svg = figures.generic(spec);
assert(clean(svg), 'the SVG must not contain NaN/undefined');
assert(svg.includes('37/18') && svg.includes('10/9'), 'X must be drawn with its values');
assert(svg.includes('|A| = 18'), 'the determinant belongs on the figure');
assert((svg.match(/<path/g) || []).length >= 6, 'each matrix needs its brackets');
assert.equal(figures.generic(M.figureFor(question)), svg, 'the same question must draw the same figure');

/* --------------------------------------------------------- other shapes */

const inv = M.solve('Find the inverse of A = [[2,1],[3,4]].');
assert(inv && M.matrixText(inv.X) === '[[4/5, -1/5], [-3/5, 2/5]]' && M.str(inv.det) === '5');

const det = M.solve('Find the determinant of [[1,2],[3,4]].');
assert(det && det.op === 'det' && det.answer[0] === '|A| = -2', JSON.stringify(det && det.answer));

const product = M.solve('If A = [[1,2],[3,4]] and B = [[5,6],[7,8]], find the product AB.');
assert(product && M.matrixText(product.X) === '[[19, 22], [43, 50]]');

/* X A = B is solved as Aᵀ Xᵀ = Bᵀ; check by substituting back. */
const xa = M.solve('X A = B where A = [[2,1],[3,4]] and B = [[4,1],[7,0]].');
assert(xa && xa.check, 'XA = B must verify');
assert(M.matrixText(xa.X) === '[[13/5, -2/5], [28/5, -7/5]]', M.matrixText(xa.X));

/* The semicolon form the repair card suggests, and a multi-row block. */
assert(M.matrixText(M.solve('A = [2 1; 3 4], find A inverse').X) === '[[4/5, -1/5], [-3/5, 2/5]]');
assert(M.matrixText(M.solve('A X = B where A = [[1,2],[3,4]] and B = [[1,2,3],[4,5,6]]').X) ===
  '[[2, 1, 0], [-1/2, 1/2, 3/2]]');

/* ---------------------------------------------------------- refusals */

/* Singular: a fact about the question, not a number to invent. */
const singular = M.solve('A X = B where A = [[1,2],[2,4]] and B = [[1],[2]]');
assert(singular && singular.singular === true && !singular.solved);

/* Wrong shape: A must be square and B must have as many rows as A. */
const mismatched = M.solve('A X = B where A = [[1,2],[3,4]] and B = [[1,2,3]]');
assert(mismatched && mismatched.mismatched === true && !mismatched.solved);

/* The flattened paste from the report has no blocks left: nothing to solve. */
assert.equal(M.solve('2 1 -1 41 : 2 1 | X = : 0]. 3 -1 2 8 5'), null);

/* Five rows / five columns is outside what this parser accepts. */
assert.equal(M.solve('A = [[1,2,3,4,5],[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3],[4,4,4,4,4]]'), null);

/* A coordinate pair is a 1×2 block; without the word "matrix" it is not a
   matrix question and must not be intercepted. */
assert.equal(M.isMatrixQuestion('Find the distance between the points (3, 4) and (7, 1).'), false);
assert.equal(M.isMatrixQuestion('Explain matrix multiplication with examples.'), false);
assert.equal(M.isMatrixQuestion('Find the matrix X if A X = B where A = [[1,0],[0,1]] and B = [[2],[3]].'), true);

console.log('PASS matrix answers: four routes (adjoint, Gauss–Jordan, Cramer, substitution) all end at the same ' +
  'exact X, the answer line is a drawn grid, and the badge claims arithmetic, not a model\n' +
  'PASS matrix questions: exact X = [[37/18, 10/9], [29/18, −7/9], [31/18, 4/9]] for the ' +
  '3×3 · X = 3×2 question with |A| = 18 and A·X = B verified, inverse [[4/5, −1/5], [−3/5, 2/5]], ' +
  'det −2, AB = [[19, 22], [43, 50]], XA solved and checked, the figure carrying the values, and ' +
  'refusals for singular, mismatched, unparsable and out-of-range input');
