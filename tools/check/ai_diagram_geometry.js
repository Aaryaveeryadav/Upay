/* Regression for the blank AI schematic: object segments poisoned SVG bounds. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const UP = {};
vm.runInNewContext(fs.readFileSync('assets/js/figures.js', 'utf8'), {UP, window:{UP}});
const base = {type:'triangle',points:[{x:0,y:0,label:'A'},{x:4,y:0,label:'B'},{x:2,y:3,label:'C'}]};
const reference = UP.figures.generic({...base, segments:[[0,0,4,0]]});
const object = UP.figures.generic({...base, segments:[{x1:'0',y1:'0',x2:'4',y2:'0'}]});
assert.equal(object, reference, 'equivalent object/numeric-string coordinates must render exactly the same');
assert(/polygon points="(?!0,0 0,0 0,0)/.test(object));
for (const spec of [
  {...base, segments:[{x1:0,y1:0,x2:4}]},
  {...base, segments:[[0,0,null,1]]},
  {...base, labels:[{text:'missing coordinates'}]},
  {...base, circles:[{cx:0,cy:0}]},
  {...base, circles:[{cx:0,cy:0,r:-2}]},
  {...base, points:[{x:0,y:0}]},
  {...base, segments:{x1:0}},
  {...base, segments:[[0,0,Infinity,1]]},
  {type:'plane'}, {type:'bars',bars:[{value:'not a number'}]}
]) assert.equal(UP.figures.generic(spec), '', 'malformed geometry must not make a blank/misleading drawing');
assert(UP.figures.generic({type:'circle',circles:[{cx:'0',cy:'0',r:'2'}]}).includes('<circle'));
assert(UP.figures.generic({type:'bars',bars:[{label:'A',value:'3'}]}).includes('<rect'));
console.log('PASS AI geometry: equivalent arrays/objects/numeric strings, invalid coordinates refused, circles/bars preserved');
