'use strict';
const assert = require('node:assert/strict');
const paste = require('../../assets/js/paste-repair');
const exact = require('../../assets/js/charge-energy');
const raw = 'A particle of charge\nq\nq and mass\nm\nm is released from rest a distance\nd\nd from a fixed charge\nQ\nQ of the same sign. Using conservation of energy, derive the particle’s speed when it is a distance\n2\nd\n2d from\nQ\nQ. State any assumptions.';
const q = 'A particle of charge q and mass m is released from rest a distance d from a fixed charge Q of the same sign. Using conservation of energy, derive the particle’s speed when it is a distance 2d from Q. State any assumptions.';
assert.equal(paste.tidy(raw).text, q);
assert.equal(paste.tidy(raw.replace(/\nq\nq /, '\n**q**\nq ')).text, q);
assert(exact.matches(q));
for (const other of [q.replace('2d','3d'), q.replace('same sign','opposite sign'), q.replace('rest','an initial speed u'), q.replace('fixed charge','moving charge'), q.replace('2d','2d in water'), q+' Include gravity.', q.replace('charge q','charge 2q'), q.replace('mass m','mass 2m')]) assert.equal(exact.solve(other,'en'),null,other);
for (const unsafe of ['Find x\nx + 1 and y\ny − 2', 'The values are x\nx = 1 and y\ny = 2', 'Use x\nx for [[1,2],[3,4]] and y\ny for the vector', 'There are charges\nq\nq - 2 and mass\nm\nm - 3']) assert.equal(paste.tidy(unsafe).text,unsafe);
for (const lang of ['en','hi']) {
 const a = exact.solve(q, lang);
 assert.equal(a.source,'exact');assert.equal(a.approaches.length,4);
 assert.match(a.result, /4 × π × ε₀/);assert.doesNotMatch(a.result,/2 × π × ε₀/);
 assert(a.approaches.every(ap=>ap.steps.at(-1).m===a.result));
 assert.match(a.verify, /m > 0/);assert.equal(a.diagram.type,'charge-energy');
}
// Independently check v² = kQq/(md) against initial and final energy.
for (const [k,Q,charge,m,d] of [[9,2,3,4,5],[2,-3,-4,7,0.25],[1,0.02,0.01,0.5,2]]) {
 const v2=k*Q*charge/(m*d), initial=k*Q*charge/d, final=0.5*m*v2+k*Q*charge/(2*d);
 assert(Math.abs(initial-final) < 1e-10*Math.max(1,Math.abs(initial)));
}
console.log('PASS charge energy: copied text, variant rejection, all methods, and numerical energy checks');
