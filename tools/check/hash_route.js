'use strict';
const assert = require('node:assert/strict');
const route = require('../../assets/js/hash-route');
assert.deepEqual(route.parse(''), {name:'home',params:{}});
assert.deepEqual(route.parse('#/chapter/4?cls=12&sub=english'), {name:'chapter',id:'4',params:{cls:'12',sub:'english'}});
for (const question of ['x+1 = 2 & y=3?', 'प्रश्न: 50% क्या है?', 'First line\nA. yes']) {
  const parsed = route.parse(route.ask(question,{cls:10,sub:'english'}));
  assert.equal(parsed.params.q,question); assert.equal(parsed.params.cls,'10'); assert.equal(parsed.params.sub,'english');
}
assert.equal(route.parse('#/ask?q=a=b+c').params.q,'a=b+c');
assert.equal(route.parse('#/ask?q=%E0%A4%A').params.q,'%E0%A4%A');
assert.equal(route.parse('#/ask?__proto__=bad&constructor=bad&q=ok').params.q,'ok');
assert.equal({}.bad,undefined);
const fs = require('node:fs');
const boot = fs.readFileSync('assets/js/boot.js','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const html = fs.readFileSync('index.html','utf8');
assert(boot.includes('assets/js/hash-route.js?v=26react1'));
assert(sw.includes('/assets/js/hash-route.js?v=26react1'));
assert(sw.includes('/assets/js/app.js?v=26react1'));
assert(html.includes('assets/js/boot.js?v=26react1'));
console.log('PASS shared hash routes: deep links, scope, literal plus, equality and malformed escapes');
