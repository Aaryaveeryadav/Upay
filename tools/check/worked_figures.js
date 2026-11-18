/* Contract for the answer-labelled worked figures.

   Two families only — heights & distances, and resistor networks — and in
   both the picture, its labels and the answer come from ONE calculation
   over the question's own values. These assertions pin the arithmetic, the
   refusals (an ambiguous sentence must produce no drawing at all) and the
   rendered SVG. No browser, no provider, no bank data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { UP: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInNewContext(fs.readFileSync('assets/js/worked-figure.js', 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync('assets/js/figures.js', 'utf8'), sandbox);
const wf = sandbox.UP.workedFigure, figures = sandbox.UP.figures;
assert(wf && figures, 'worked figures and the renderer must load');

const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b));
const svgOf = spec => figures.generic(spec);
const clean = svg => !/NaN|undefined|Infinity/.test(svg);

/* ---------------------------------------------- 1. heights and distances */

/* The question as students paste it, including the repeated unit tokens a
   copy from a PDF leaves behind ("30∘30∘"). */
const tower = 'A tower stands on level ground. From a point P*P*, the angle of elevation to its top is 30∘30∘. ' +
  'After walking 20 m toward the tower to point Q*Q*, the angle becomes 60∘60∘. ' +
  'Find the tower’s height and the original distance from P*P* to its base.';
const t = wf.forQuestion(tower);
assert(t && t.type === 'elevation' && t.verified, 'the tower question must produce an elevation figure');
assert(near(t.height, 10 * Math.sqrt(3)), 'height must be 10√3 m, got ' + t.height);
assert(near(t.farDistance, 30), 'original distance must be 30 m, got ' + t.farDistance);
assert(near(t.nearDistance, 10), 'distance from Q must be 10 m, got ' + t.nearDistance);
assert.equal(t.walked, 20);
assert(t.answer[0].includes('10√3 m') && t.answer[0].includes('17.32 m'),
  'the answer must give the exact surd and its decimal: ' + t.answer[0]);
assert(t.chip.some(line => line.includes('P → base = 30 m')), 'the figure must label the original distance');
const towerSvg = svgOf(t);
assert(towerSvg && clean(towerSvg), 'the elevation figure must render without NaN/undefined');
for (const token of ['30°', '60°', '20 m walked', '10√3', '17.32', '30 m', '10 m']) {
  assert(towerSvg.includes(token), 'elevation figure is missing "' + token + '"');
}
assert(/<path d="M [\d.]+ 300 A/.test(towerSvg), 'both angle arcs must be drawn');

/* One observation, distance given -> height asked. */
const single = wf.heightsAndDistances('From a point 30 m away from the foot of a tower, the angle of elevation of its top is 30°. Find the height of the tower.');
assert(single && near(single.height, 10 * Math.sqrt(3)) && near(single.farDistance, 30) && single.nearDistance == null);
assert(svgOf(single).includes('given: 30 m'));

/* One observation, height given -> distance asked. */
const given = wf.heightsAndDistances('A tower is 20 m high. The angle of elevation of its top from a point on the ground is 30°. Find the distance of the point from the foot of the tower.');
assert(given && given.heightGiven && near(given.height, 20) && near(given.farDistance, 20 * Math.sqrt(3)));
const givenSvg = svgOf(given);
assert(givenSvg.includes('(given)') && givenSvg.includes('34.64'), 'the given height and the computed distance must both be labelled');
assert(/Q/.test(givenSvg), 'the single observation point must be drawn');

/* Other geometries, and ambiguous or incomplete wording, must draw nothing. */
for (const text of [
  'A ladder 10 m long leans against a wall; the angle of elevation of its top is 60°.',
  'From the top of a cliff 20 m high, the angle of depression of a boat is 30°. Find the distance of the boat.',
  'The angles of elevation of the tops of two towers from a point are 30° and 60°, and the towers are 20 m apart.',
  'A tower is 20 m high and the angle of elevation is 30°. From a point 40 m away the angle is 60°.',
  'The angle of elevation of the top of a tower is 30°. Find its height.',
  'From a point on the ground, the angle of elevation of the top of a tree is 45°, and the tree casts a shadow.'
]) {
  assert.equal(wf.heightsAndDistances(text), null, 'must refuse: ' + text.slice(0, 60));
}

/* An absurd proportion means a number came from the wrong place. */
assert.equal(wf.heightsAndDistances('A tower stands 2000 m tall. From a point 20 m away the angle of elevation is 1°.'), null);

/* ------------------------------------------------ 2. resistor networks */

const circuit = 'A 6 Ω6Ω resistor and a 3 Ω3Ω resistor are connected in parallel, and that combination is ' +
  'connected in series with a 4 Ω4Ω resistor to a 12 V12 V battery. Find the total resistance, the current ' +
  'supplied by the battery, and the current through each parallel resistor.';
const c = wf.forQuestion(circuit);
assert(c && c.type === 'circuit' && c.layout === 'mixed', 'the posed circuit must be recognised as a mixed network');
assert(near(c.equivalent, 6), 'equivalent resistance must be 6 Ω, got ' + c.equivalent);
assert(near(c.totalCurrent, 2), 'battery current must be 2 A, got ' + c.totalCurrent);
const byValue = v => c.blocks.flatMap(b => b.resistors).find(r => r.value === v);
assert(near(byValue(6).current, 2 / 3), '6 Ω branch must carry 2/3 A');
assert(near(byValue(3).current, 4 / 3), '3 Ω branch must carry 4/3 A');
assert(near(byValue(4).current, 2), 'the series 4 Ω resistor must carry the full 2 A');
assert(c.chip.includes('R_eq = 6 Ω') && c.chip.some(l => l.includes('I = 2 A')));
const circuitSvg = svgOf(c);
assert(circuitSvg && clean(circuitSvg), 'the circuit must render without NaN/undefined');
for (const token of ['6 Ω', '3 Ω', '4 Ω', '12 V', '2/3 A', '4/3 A', 'R_eq = 6 Ω']) {
  assert(circuitSvg.includes(token), 'circuit figure is missing "' + token + '"');
}
assert(!circuitSvg.includes('5 Ω'), 'no resistance the question never gave may appear');

/* The mirror wording ("… in series, in parallel with …") is a different
   circuit; the renderer must refuse rather than mislabel it. */
assert.equal(wf.resistorNetwork('A 6 Ω and a 3 Ω resistor are connected in series, and the combination is connected in parallel with a 4 Ω resistor to a 12 V battery.'), null);

/* Series and parallel chains, with and without a supply. */
const series = wf.resistorNetwork('Three resistors of 2 Ω, 3 Ω and 5 Ω are connected in series with a 12 V battery.');
assert(near(series.equivalent, 10) && near(series.totalCurrent, 1.2) && series.layout === 'series');
assert(svgOf(series).includes('I = 6/5 A'));
const parallel = wf.resistorNetwork('Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel across a 12 V battery.');
assert(near(parallel.equivalent, 1) && near(parallel.totalCurrent, 12) && parallel.layout === 'parallel');
assert(parallel.blocks[0].resistors.every(r => near(r.voltage, 12)));
const two = wf.resistorNetwork('Two resistors of 4 Ω and 6 Ω are connected in parallel across a 12 V battery.');
assert(near(two.equivalent, 2.4) && near(two.totalCurrent, 5));
const noSupply = wf.resistorNetwork('Find the equivalent resistance of a 6 Ω and a 3 Ω resistor connected in parallel.');
assert(noSupply && near(noSupply.equivalent, 2) && noSupply.totalCurrent == null && noSupply.battery == null);
assert(svgOf(noSupply) && clean(svgOf(noSupply)));

/* Unsupported or under-specified networks draw nothing. */
for (const text of [
  'Four resistors of 2 Ω, 4 Ω, 6 Ω and 8 Ω are connected in a network across a 12 V battery.',
  'Two resistors of 4 Ω and 6 Ω are connected in a bridge with a galvanometer and a 12 V battery.',
  'Two resistors of 4 Ω and 6 Ω are connected in series with a capacitor across a 12 V battery.',
  'A 6 Ω resistor and a 3 Ω resistor are connected in parallel to a 12 V battery and also in series with a 4 Ω resistor.',
  'Find the equivalent resistance of two resistors.'
]) {
  assert.equal(wf.resistorNetwork(text), null, 'must refuse: ' + text.slice(0, 60));
}

/* A missing or nonsensical value must not become a label. */
assert.equal(figures.generic({ type: 'circuit', network: true, battery: 12,
  blocks: [{ kind: 'series', resistors: [{ label: 'R₁', value: 0 }] }] }), '');
assert.equal(figures.generic({ type: 'elevation', verified: true, height: 10, farDistance: -1, answer: ['x'] }), '');

/* --------------------------------------------- 3. the existing renderers */

/* The older two-resistor circuit path and the AI geometry path are intact. */
const legacy = figures.circuitForQuestion({ type: 'circuit' }, 'Two resistors 4 Ω and 6 Ω are connected in parallel.');
assert(legacy && legacy.topology === 'parallel' && legacy.resistors.length === 2);
assert(figures.generic(legacy).includes('R₁'));
assert(figures.generic({ type: 'triangle', points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 3 }] }).includes('<polygon'));

/* Determinism: the same question always yields the same picture. */
assert.equal(svgOf(wf.forQuestion(tower)), towerSvg);
assert.equal(svgOf(wf.forQuestion(circuit)), circuitSvg);

console.log('PASS worked figures: tower 10√3 m/30 m/10 m, mixed 6 Ω network 2 A with 2/3 and 4/3 A branches, ' +
  'series/parallel chains, refusals for ladders, depression, mirror networks and unsupported components, ' +
  'and the older AI/2-resistor renderers unchanged');
