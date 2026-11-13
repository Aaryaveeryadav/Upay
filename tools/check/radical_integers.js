'use strict';
const assert=require('node:assert/strict'),solver=require('../../assets/js/square-integers');
const q='Find all integers x for which √(x+6) + √(19-x) is an integer.';
for(const question of [q,q.replace('for which','such that'),q.replace('integers x','integer values of x'),q.replace('√(x+6)',String.raw`\sqrt{x+6}`).replace('√(19-x)',String.raw`\sqrt{19-x}`),q.replace(/√/g,'sqrt')]){
 const answer=solver.solve(question);
 assert.equal(answer.result,'x ∈ {-6, 3, 10, 19}');
 assert.equal(answer.approaches.length,4);assert.equal(answer.check.source,'arithmetic');
 for(const approach of answer.approaches)assert.equal(approach.steps.at(-1).m,answer.result);
 assert.deepEqual(solver.radicalCompute(question).solutions.map(v=>v.x),[-6,3,10,19]);
 assert(!solver.radicalCompute(question).solutions.some(s=>s.x===15||s.x===18));
 assert.match(answer.approaches[1].steps.map(s=>s.m).join(' '),/k = 6:.*504; no integer x/);
}
let count=0;
for(let a=0;a<=30;a++)for(let b=0;b<=30;b++){
 if(!a&&!b)continue;
 const question=`Find all integers x such that √(x+${a}) + √(${b}-x) is an integer.`;
 const data=solver.radicalCompute(question),expected=[];
 for(let x=-a;x<=b;x++){
  // Independent original-expression numerical oracle, safe for this small bounded range.
  const sum=Math.sqrt(x+a)+Math.sqrt(b-x);
  if(Math.abs(sum-Math.round(sum))<1e-10)expected.push(x);
 }
 assert.deepEqual(data.solutions.map(s=>s.x),expected,question);
 for(const approach of solver.solve(question).approaches)assert.equal(approach.steps.at(-1).m,solver.solve(question).result);
 count++;
}
for(const bad of [q.replace('integers x','real numbers x'),q+' Also require x > 0.',q.replace('x+6','2x+6'),q.replace('19-x','19+x'),q.replace('19-x','2000-x'),q.replace('is an integer','is a prime integer'),q.replace('x+6','x+6.5')])assert.equal(solver.radicalCompute(bad),null,bad);
assert.equal(solver.solve(q,'hi').result,'x ∈ {-6, 3, 10, 19}');
console.log(`PASS radical regression, exact completed cases, consistent four conclusions, unsafe-input refusal and ${count} independent bounded-domain comparisons`);
