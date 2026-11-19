/* A question copied out of a PDF arrives as a column of fragments. The repair
   must rebuild the sentence without inventing a single character, and must
   leave a well-formed question exactly as it was. */
'use strict';
const assert = require('node:assert/strict');
const P = require('../../assets/js/paste-repair.js');

/* ------------------------------------------------ 1. the fragmented paste */

/* The paste reported from a phone: every glyph on its own line, the charge
   split off, the degree sign alone. */
const soup = [
  'For the cell', '', 'Z', '', 'n', '', '∣', '', 'Z', '', 'n', '', '2', '', '-', '',
  '(', '', '0.10', '', ' M', '', ')', '', '∣', '', '∣', '', 'C', '', 'u', '', '2', '',
  '-', '', '(', '', '1.0', '', ' M', '', ')', '', '∣', '', 'C', '', 'u', '', ',', '',
  'calculate the cell potential at', '', '298', '', ' K', '', ', given', '', 'E', '',
  'cell', '', '∘', '', '=', '', '1.10', '', ' V'
].join('\n');
const zinc = P.tidy(soup);
assert(zinc.changed, 'a fragmented paste must be reported as changed');
assert(!/\n/.test(zinc.text), 'the fragment column becomes one line: ' + JSON.stringify(zinc.text));
assert(zinc.text.startsWith('For the cell Zn | Zn'), 'the cell notation is rebuilt: ' + zinc.text);
assert(zinc.text.includes('Zn²⁻ (0.10 M)'), 'the charge and its bracket survive: ' + zinc.text);
assert(zinc.text.includes('|| Cu²⁻ (1.0 M) | Cu'), 'the salt bridge and the second electrode survive: ' + zinc.text);
assert(zinc.text.includes('298 K'), 'the temperature is not glued to its unit: ' + zinc.text);
assert(zinc.text.includes('1.10 V'), 'the potential survives: ' + zinc.text);
assert(!/\s{2,}/.test(zinc.text) && !/\s[,.;]/.test(zinc.text), 'no fragment spacing is left over: ' + zinc.text);
/* Nothing is invented: the paste says "-" and the repair keeps "-". */
assert(!zinc.text.includes('⁺'), 'a minus sign in the paste is never turned into a plus');

/* ------------------------------------------------- 2. lost superscripts */

const cubic = P.tidy('Find the intervals on which f(x)=x3−3x2−9x+5 is increasing or decreasing');
assert(cubic.text.includes('x³−3x²−9x+5'), 'a lost power is put back: ' + cubic.text);

const quadratic = P.tidy('Solve x2 − 5x + 6 = 0 by factorisation.');
assert(quadratic.text.startsWith('Solve x² − 5x + 6 = 0'), 'quadratic paste: ' + quadratic.text);

for (const untouched of [
  'H2O and CO2 are formed in the reaction.',
  'The value of set2 must stay exactly as it is.',
  'An object is placed 30 cm from a convex lens of focal length 15 cm. Find the position and nature of the image.'
]) {
  const out = P.tidy(untouched);
  assert.equal(out.text, untouched, 'must not rewrite: ' + untouched);
  assert.equal(out.changed, false);
}

/* --------------------------------------------------- 3. well-formed text */

const clean = 'A satellite moves in a circular orbit of radius r around Earth. ' +
  'Derive its orbital speed and time period, then find how the time period changes ' +
  'if the orbital radius is doubled.';
assert.deepEqual(P.tidy(clean), { text: clean, changed: false }, 'a clean question is returned untouched');

/* Two-line questions are not soup and must not be joined into one line. */
const twoLines = 'A convex lens of focal length 20 cm forms an image of an object placed 30 cm from it.\nFind the image position and magnification.';
assert.equal(P.tidy(twoLines).text, twoLines, 'a two-line question keeps its line break');

/* Idempotent: tidying an already tidied paste changes nothing. */
assert.equal(P.tidy(zinc.text).text, zinc.text);
assert.equal(P.tidy(cubic.text).text, cubic.text);

console.log('PASS paste repair: a glyph-per-line paste is rejoined into the sentence ' +
  '(cell notation, charges, brackets, temperature), a lost power comes back as x³/x², ' +
  'chemistry and two-line questions are left alone, and the repair is idempotent');

const mathSoup = 'Find the intervals on which\nf\n(\nx\n)\n=\nx\n3\n−\n3\nx\n2\n−\n9\nx\n+\n5\nis increasing or decreasing.';
assert.match(P.tidy(mathSoup).text, /x³ − 3x² − 9x \+ 5/);
const arithmeticSoup = 'Calculate\n2\n-\n3\n+\n5\n=\n?';
assert.match(P.tidy(arithmeticSoup).text, /2 - 3 \+ 5/);
assert.equal(P.tidy('First line\nSecond line.').text, 'First line\nSecond line.');
console.log('PASS fragmented polynomial and arithmetic operators are preserved');

/* Conflicting copies are not silently "corrected" into one answer. */
const duplicate = ['For the cell','Z','n','∣','Z','n','2','-','(', '0.10','M',')','∣','∣','C','u','2','-','(', '1.0','M',')','∣','C','u','Zn∣Zn','2+','(0.10M)∣∣Cu','2+','(1.0M)∣Cu, calculate the cell potential.'].join('\n');
const preserved = P.tidy(duplicate).text;
assert(preserved.includes('Zn²⁻') && preserved.includes('2+'), 'contradictory source signs both survive');
