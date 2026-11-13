const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const UP={},ctx=vm.createContext({UP,window:{UP},console});
for(const n of ['core','arith','geo','route'])vm.runInContext(fs.readFileSync(`assets/js/solver-${n}.js`,'utf8'),ctx);
const question='If the least common multiple (LCM) of two positive integers $p = a^3b^2$ and $q = ab^3$, where $a$ and $b$ are prime numbers, is divided by their highest common factor (HCF), what is the resulting expression?';
const answer=UP.answerQuestion(question);
assert.equal(answer.kind,'prime-power-ratio');
assert(answer.result.en.startsWith('a²b'));
assert(answer.result.en.includes('if a = b, the ratio is a'));
assert.equal(answer.approaches.length,4);
const rendered=JSON.stringify(answer);
assert(rendered.includes('LCM = a³b³') && rendered.includes('HCF = ab²'));
assert(!rendered.includes('HCF = 3'));
assert.equal(UP.solveHCF(question,[3,3]).kind,'prime-power-ratio','direct calculator entry must also be guarded');
for(const pair of [['a^{3}b^{2}','ab^{3}'],['a³b²','ab³'],['b^2*a^3','b^3*a']]){
 const q=`p = ${pair[0]}, q = ${pair[1]}, where a and b are distinct primes. Find LCM/HCF.`;
 assert.equal(UP.answerQuestion(q).result.en,'a²b');
}
for(const q of [
 'p = a^3b^2 + 1, q = ab^3 where a and b are primes. Find LCM/HCF.',
 'p = a^3b^2c, q = ab^3 where a and b are primes. Find LCM/HCF.',
 'Find the HCF of p = a^3b^2 and q = ab^3, where a and b are primes.',
 'p = a^3b^2, q = ab^3. Find LCM/HCF.',
 'Find the HCF of x^3 and y^3.'
]) assert.equal(UP.answerQuestion(q).kind,'not-attempted',q);
assert.equal(UP.answerQuestion('Find HCF and LCM of 12 and 18').result.en,'HCF = 6, LCM = 36');
// Exhaustively compare the supported monomials against actual gcd/lcm for
// distinct primes a=2,b=3, not merely the hand-authored string example.
for(let i=1;i<=4;i++)for(let j=1;j<=4;j++)for(let k=1;k<=4;k++)for(let l=1;l<=4;l++){
 const p=2**i*3**j,q=2**k*3**l;
 const actual=UP.num.lcmAll([p,q])/UP.num.hcfAll([p,q]);
 const expected=2**Math.abs(i-k)*3**Math.abs(j-l);
 assert.equal(actual,expected);
 const symbolic=UP.answerQuestion(`p = a^${i}b^${j}, q = a^${k}b^${l}, where a and b are distinct primes. Find LCM/HCF.`);
 const power=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
 const expectedText=[['a',Math.abs(i-k)],['b',Math.abs(j-l)]].map(([v,e])=>e===0?'':e===1?v:v+power(e)).join('')||'1';
 assert.equal(symbolic.result.en,expectedText);
 assert.equal(symbolic.kind,'prime-power-ratio');
 assert(!symbolic.result.en.includes('HCF ='));
}
console.log('PASS requested symbolic quotient, four approaches, ambiguity caveat, notation variants, unsafe-input refusal, numeric HCF regression and 256 exponent combinations');
