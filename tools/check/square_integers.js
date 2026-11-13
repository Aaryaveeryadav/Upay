const assert=require('node:assert/strict'),s=require('../../assets/js/square-integers');
const q='Find all positive integers n for which n²+10n+2026 is a perfect square.';
const data=s.compute(q),answer=s.solve(q);
assert.deepEqual(data.solutions.map(v=>v.n),[15,27,327,995]);
assert.deepEqual(data.solutions.map(v=>v.square),[49,55,335,1001]);
assert.equal(answer.result,'n = 15, 27, 327, 995');
assert.equal(answer.check.source,'arithmetic');assert.equal(answer.approaches.length,3);
assert.notEqual(Math.sqrt(191**2+10*191+2026),Math.floor(Math.sqrt(191**2+10*191+2026)));
for(const variant of [q.replace('²','^2'),q.replace('n²+10n+2026',String.raw`\(n^{2}+10n+2026\)`)])assert.deepEqual(s.compute(variant).solutions,data.solutions);
for(let b=0;b<=16;b+=2)for(let D=1;D<=100;D++){
 const c=D+(b/2)**2;
 const got=s.compute(`Find all positive integers n for which n^2+${b}n+${c} is a perfect square.`).solutions.map(s=>s.n);
 const expected=[];
 // The positive factor bound gives n <= (D-1)/2 - b/2, so n<=D suffices.
 for(let n=1;n<=D;n++){const val=n*n+b*n+c;if(Number.isInteger(Math.sqrt(val)))expected.push(n);}
 assert.deepEqual(got,expected,`b=${b}, c=${c}`);
}
for(const bad of [q.replace('positive integers','integers'),q.replace('10n','11n'),q+' Also require n to be prime.',q.replace('n²','2n²'),q.replace('2026','10'),q.replace('2026','1000000000'),q.replace('perfect square','perfect cube')])assert.equal(s.compute(bad),null,bad);
console.log('PASS exact four solutions, wrong 191 rejected, 900 brute-force comparisons, notation and strict unsupported-input refusal');
