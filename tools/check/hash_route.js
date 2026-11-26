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
/* The version string is a cache key, not a fact about the code. The invariant
   that matters is that every place which names a script uses the SAME version,
   because the service worker is cache-first: if boot.js asks for an app.js
   version the worker did not precache, a returning visitor keeps the old file
   indefinitely. Pinning the literal here made this check fail whenever anyone
   bumped a version (and, worse, said nothing about a mismatch), so this reads
   the versions out of the files and compares them. */
function versionsOf(text, script) {
  const re = new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=([A-Za-z0-9._-]+)', 'g');
  const out = new Set();
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  return out;
}
function onlyVersion(text, script, where) {
  const found = versionsOf(text, script);
  assert.equal(found.size, 1, where + ' names exactly one version of ' + script + ' (found: ' + [...found].join(', ') + ')');
  return [...found][0];
}
const bootVersion = onlyVersion(html, 'assets/js/boot.js', 'index.html');
assert.equal(onlyVersion(sw, 'assets/js/boot.js', 'sw.js'), bootVersion, 'sw.js precaches the boot.js version index.html loads');

const appInBoot = onlyVersion(boot, 'assets/js/app.js', 'boot.js');
assert.equal(onlyVersion(sw, 'assets/js/app.js', 'sw.js'), appInBoot, 'sw.js precaches the app.js version boot.js loads');

const hashInBoot = onlyVersion(boot, 'assets/js/hash-route.js', 'boot.js');
assert.equal(onlyVersion(sw, 'assets/js/hash-route.js', 'sw.js'), hashInBoot, 'sw.js precaches the hash-route version boot.js loads');

/* A precached asset whose file is missing fails the whole install, which
   leaves the previous service worker serving a stale shell. Keep that honest. */
const precache = (sw.match(/const PRECACHE = \[([\s\S]*?)\];/) || [])[1] || '';
for (const entry of precache.split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)) {
  const file = entry.split('?')[0];
  if (file === '/') continue;
  assert(fs.existsSync('.' + file), 'a precached asset exists on disk: ' + entry);
}
console.log('PASS shared hash routes: deep links, scope, literal plus, equality and malformed escapes');
