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

/* ------------------------------------------- 2b. mensuration solids */

const cyl = wf.forQuestion('Find the volume of a cylinder of radius 7 cm and height 10 cm.');
assert(cyl && cyl.type === 'solid' && cyl.solid === 'cylinder' && cyl.verified);
assert(cyl.answer.some(a => a === 'V = 1540 cm³'), 'volume must be 1540 cm³: ' + cyl.answer);
assert(cyl.answer.some(a => a.includes('440')), 'curved surface must be 440 cm²: ' + cyl.answer);
assert(cyl.answer.some(a => a.includes('748')), 'total surface must be 748 cm²: ' + cyl.answer);
assert(svgOf(cyl).includes('V = 1540 cm³') && clean(svgOf(cyl)), 'the answer must be on the drawing');

/* The same question in Hindi must produce the same numbers. */
const cylHi = wf.forQuestion('एक बेलन की त्रिज्या 7 सेमी और ऊँचाई 10 सेमी है। आयतन ज्ञात कीजिए।');
assert(cylHi && cylHi.answer[0] === 'V = 1540 cm³', 'Hindi wording must parse: ' + JSON.stringify(cylHi && cylHi.answer));

/* The quantity asked for comes first; a cone states its own slant height. */
const cone = wf.forQuestion('A cone has radius 6 cm and height 8 cm. Find its total surface area.');
assert(cone.answer[0].startsWith('Total surface area = 301.4'), cone.answer[0]);
assert(cone.answer.some(a => a.includes('l = √(r² + h²) = 10 cm')), 'slant height must be derived, not invented');

const hemi = wf.forQuestion('Find the total surface area of a hemisphere of radius 7 cm.');
assert(hemi && hemi.solid === 'hemisphere', 'hemisphere must not be read as a sphere');
assert(hemi.answer[0] === 'Total surface area = 462 cm²', hemi.answer[0]);
assert(hemi.answer.some(a => a.includes('308')), 'curved surface must be 308 cm²: ' + hemi.answer);

const sphere = wf.forQuestion('A sphere has a diameter of 14 cm. Find its surface area.');
assert(sphere.answer[0] === 'Surface area = 616 cm²', sphere.answer[0]);

/* Metres are kept as metres rather than quietly converted. */
const tank = wf.forQuestion('A cylindrical tank has radius 2 m and height 5 m. Find its volume.');
assert(tank.answer[0] === 'V = 62.8 m³', tank.answer[0]);

for (const text of [
  'A cone of slant height 13 cm and radius 5 cm has a volume to be found.',
  'A cylinder with a conical cavity of the same height has radius 7 cm and height 10 cm.',
  'A metal sphere of radius 6 cm is melted and recast into a cylinder of radius 3 cm.',
  'A cylinder has radius 7 m and height 10 cm; find its volume.',
  'A cylinder and a cone have the same radius 7 cm and height 10 cm.'
]) {
  assert.equal(wf.mensurationSolid(text), null, 'must refuse: ' + text.slice(0, 60));
}

/* ------------------------------------------- 2c. two points on a plane */

const pq = wf.forQuestion('Find the distance between the points A(3, 4) and B(7, 1).');
assert(pq && pq.type === 'distance' && pq.verified);
assert(pq.answer[0] === 'PQ = 5', pq.answer[0]);
assert(pq.answer[1] === 'midpoint = (5, 2.5)', pq.answer[1]);
assert(svgOf(pq).includes('PQ = 5') && clean(svgOf(pq)));

const pqHi = wf.forQuestion('बिंदुओं (3, 4) और (7, 1) के बीच की दूरी ज्ञात कीजिए।');
assert(pqHi && pqHi.answer[0] === 'PQ = 5', 'Hindi wording must parse: ' + JSON.stringify(pqHi && pqHi.answer));

const mid = wf.forQuestion('Find the midpoint of the line segment joining (2, 3) and (6, 7).');
assert(mid.answer[0] === 'midpoint = (4, 5)' && near(Number(mid.answer[1].replace('PQ = ', '')), Math.sqrt(32), 1e-3));

for (const text of [
  'Find the point on the x-axis which is equidistant from (2, -5) and (-2, 9).',
  'Find the area of the triangle with vertices (1, 2), (4, 6) and (7, 2).',
  'Find the coordinates of the point which divides the join of (1, 2) and (4, 5) in the ratio 2 : 3.',
  'Find the distance between the points.'
]) {
  assert.equal(wf.coordinatePoints(text), null, 'must refuse: ' + text.slice(0, 60));
}

/* ------------------------------------------------ 2d. lens / mirror ray */

const lens = wf.forQuestion('An object is placed 30 cm from a convex lens of focal length 15 cm. Find the position and nature of the image.');
assert(lens && lens.type === 'optics' && lens.verified);
assert(near(lens.v, 30) && near(lens.m, -1), 'convex lens: v = 30 cm, m = -1');
assert(lens.answer[0].includes('real') && lens.answer[1].includes('inverted'));
const lensSvg = svgOf(lens);
assert(lensSvg.includes('principal axis') && lensSvg.includes('f = 15 cm') && lensSvg.includes('v = 30 cm') && clean(lensSvg));

/* Hindi states the focal length before the words: "15 सेमी फोकस दूरी".
   Reading the nearest number is what keeps 30 cm the object, not the focus. */
const lensHi = wf.forQuestion('15 सेमी फोकस दूरी के उत्तल लेंस से 30 सेमी की दूरी पर एक वस्तु रखी है। प्रतिबिम्ब की स्थिति ज्ञात कीजिए।');
assert(lensHi && near(lensHi.f, 15) && near(lensHi.u, 30) && near(lensHi.v, 30), 'Hindi lens: f = 15, u = 30, v = 30');

const concaveMirror = wf.forQuestion('An object is placed 20 cm from a concave mirror of focal length 15 cm. Find the position, nature and size of the image.');
assert(near(concaveMirror.v, -60) && near(concaveMirror.m, -3), 'concave mirror: v = -60 cm, m = -3');
assert(concaveMirror.answer[0].includes('in front of the mirror'));

const convexMirror = wf.forQuestion('An object is placed 20 cm in front of a convex mirror of focal length 15 cm.');
assert(near(convexMirror.v, 60 / 7) && near(convexMirror.m, 3 / 7), 'convex mirror: v = 8.57 cm, m = 0.43');
assert(convexMirror.answer[0].includes('virtual') && convexMirror.answer[0].includes('behind the mirror'));

const concaveLens = wf.forQuestion('An object is placed 10 cm from a concave lens of focal length 15 cm.');
assert(near(concaveLens.v, -6) && near(concaveLens.m, 0.6), 'concave lens: v = -6 cm, m = 0.6');

for (const text of [
  'Where should an object be placed in front of a convex lens of focal length 20 cm so that the image is formed at 40 cm?',
  'An object is placed at the focus of a convex lens of focal length 15 cm.',
  'An object is placed 30 cm from a lens of focal length 15 cm.',
  'An object is placed 30 cm from a convex lens and a concave mirror of focal length 15 cm.',
  'Two lenses of focal length 10 cm and 20 cm are placed in contact.',
  'An image is formed 30 cm from a convex lens of focal length 15 cm. Find where the object is placed.'
]) {
  assert.equal(wf.opticsRay(text), null, 'must refuse: ' + text.slice(0, 60));
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
  'series/parallel chains, mensuration 1540 cm³/440 cm²/748 cm², two-point distance 5 and midpoint (5, 2.5), ' +
  'lens v = 30 cm m = −1 and mirror v = −60 cm m = −3, refusals for ladders, depression, mirror networks, ' +
  'composite solids, ratios and inverse-optics wording, and the older AI/2-resistor renderers unchanged');
