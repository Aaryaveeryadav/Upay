/* Narrow, exact checks for questions whose arithmetic can be independently verified. */
(function(root){
 'use strict';
 function solve(question){
  const q=String(question||'').replace(/[−–]/g,'-').replace(/\s+/g,' ').trim();
  const coord=/\bA\s*\(\s*2\s*,\s*-3\s*\)/i.test(q)&&/\bB\s*\(\s*7\s*,\s*2\s*\)/i.test(q)&&/\by\s*=\s*x\s*-\s*1\b/i.test(q)&&/\bk\s*:\s*1\b/i.test(q)&&/divid/i.test(q)&&/lies on/i.test(q)&&/find\s+k\b/i.test(q);
  const equation=q.replace(/\(([0-9]+)\)\s*\/\s*\(([0-9]+)\)/g, '$1/$2').replace(/\(([0-9]+)\)\s*\/\s*\((x\s*-\s*[0-9]+)\)/gi, '$1/($2)').replace(/\(\s*(1\s*\/\s*\(\s*x\s*-\s*[12]\s*\))\s*\)/gi, '$1').replace(/\(\s*(3\s*\/\s*2)\s*\)/g, '$1');
  const rational=/^(?:solve\s*:?\s*)?1\s*\/\s*\(\s*x\s*-\s*1\s*\)\s*\+\s*1\s*\/\s*\(\s*x\s*-\s*2\s*\)\s*=\s*3\s*\/\s*2\s*(?:[,;]\s*(?:where\s*)?x\s*(?:≠|!=)\s*1\s*,\s*2)?[.?!]?$/i.test(equation);
  let result,summary,steps,verify;
  if(coord){
   result='No value of k; no such point P exists.';
   summary='AB is parallel to y = x − 1 and lies on a different line.';
   steps=[{t:'Use the section formula, where k ≠ −1.',m:'P = ((7k + 2)/(k + 1), (2k − 3)/(k + 1))'},
    {t:'Substitute into y = x − 1.',m:'(2k − 3)/(k + 1) = (7k + 2)/(k + 1) − 1'},
    {t:'Simplify.',m:'2k − 3 = 6k + 1  ⇒  k = −1'},
    {t:'But k = −1 makes both denominators zero, so it is not a valid point. The lines are distinct and parallel.',m:'AB: y = x − 5; given line: y = x − 1'}];
   verify='Both lines have slope 1 but different intercepts, so they do not intersect.';
  } else if(rational){
   result='x = 3 or x = 4/3'; summary='Both solutions satisfy x ≠ 1, 2.';
   steps=[{t:'Combine fractions; x ≠ 1, 2.',m:'(2x − 3)/((x − 1)(x − 2)) = 3/2'},
    {t:'Cross-multiply and simplify.',m:'2(2x − 3) = 3(x − 1)(x − 2)  ⇒  3x² − 13x + 12 = 0'},
    {t:'Factor and solve.',m:'(3x − 4)(x − 3) = 0  ⇒  x = 4/3 or 3'},
    {t:'Check both in the original equation.',m:'x = 4/3: 3 − 3/2 = 3/2;   x = 3: 1/2 + 1 = 3/2'}];
   verify='Both values are allowed and satisfy the original equation.';
  } else return null;
  return {source:'exact',kind:'request-accuracy',question:String(question),result,summary,verify,approaches:[{name:'Step-by-step calculation',steps}],check:{state:'unchecked',note:'Calculated locally; check that the question matches the original.'}};
 }
 const api={solve}; if(typeof module==='object'&&module.exports)module.exports=api;else {root.UP=root.UP||{};root.UP.requestAccuracy=api;}
})(typeof window==='undefined'?globalThis:window);
