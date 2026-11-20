'use strict';
// Conservative checks, not a general mathematical proof or AI verifier.
const {resistorNetwork} = require('../assets/js/worked-figure.js');
const {solve: knownAnswer} = require('../assets/js/request-accuracy.js');
function evidence(question) {
  const c = resistorNetwork(question);
  if (c && c.battery) return {kind:'circuit', spec:c, text:'Independent circuit calculation from the given values: '+c.answer.join('; ')+'. Use these values consistently in the final answer, all methods and diagram. Exact values and equivalent rounded values must agree.'};
  const x = knownAnswer(question);
  if (x) return {kind:'known', result:x.result, text:'Independent calculation for this exact question: '+x.result+' '+x.verify+' Re-check this result; never treat a denominator-zero candidate as valid.'};
  return null;
}
function conflict(question, draft) {
  const e=evidence(question); if (!e || !draft) return '';
  const answer=String(draft.answer || draft.result || '');
  if(e.kind==='known' && /No value of k/.test(e.result) && /\bk\s*=\s*[-−]?\d/i.test(answer) && !/no\s+(?:valid\s+)?(?:value|solution)|not valid|undefined|does not exist/i.test(answer)) return 'The claimed k is excluded by the section formula denominator.';
  if(e.kind!=='circuit') return '';
  const rows=e.spec.blocks.flatMap(b=>b.resistors||[]);
  const texts=[answer, String(draft.summary||''), ...((draft.approaches||[]).flatMap(a=>(a.steps||[]).flatMap(st=>[String(st.t||''),String(st.m||'')])) )];
  const close=(v,expected)=>Math.abs(v-expected)<=Math.max(0.011,Math.abs(expected)*0.005);
  for(const text of texts){
    for(const row of rows){
      // Numeric claim tied to a named resistance, not a number from another branch.
      const r=String(row.value).replace('.', '\\.');
      const re=new RegExp('(?:current\\s+(?:through|in)\\s+(?:the\\s+)?)'+r+'\\s*(?:Ω|ohms?)\\s*(?:resistor|resistance|branch)?\\s*(?:is|=|:|of)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:A\\b|amps?\\b|amperes?\\b)','gi');
      let m; while((m=re.exec(text))) if(!close(Number(m[1]), row.current)) return `Current for ${row.value} Ω conflicts with independently calculated ${row.current} A.`;
      const reverse=new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:A\\b|amps?\\b)\\s*(?:through|in)\\s+(?:the\\s+)?'+r+'\\s*(?:Ω|ohms?)','gi');
      while((m=reverse.exec(text))) if(!close(Number(m[1]),row.current)) return `Current for ${row.value} Ω conflicts with independently calculated ${row.current} A.`;
      if (Number.isInteger(row.value) && rows.filter(x=>x.value===row.value).length === 1) {
        const label=new RegExp('\\bI(?:_?\\{?'+r+'\\}?|'+Array.from(String(row.value),c=>'₀₁₂₃₄₅₆₇₈₉'[Number(c)]).join('')+')\\s*=\\s*([^;\\n]{0,100})','gi');
        let match; while ((match=label.exec(text))) {
          const amps=Array.from(match[1].matchAll(/(\d+(?:\.\d+)?)\s*(?:A\b|amps?\b)/gi));
          if (amps.length && !close(Number(amps[amps.length-1][1]),row.current)) return `Current for ${row.value} Ω conflicts with independently calculated ${row.current} A.`;
        }
      }
    }
    const total=/(?:total|equivalent)\s+resistance\s*(?:is|=|:)\s*(\d+(?:\.\d+)?)\s*(?:Ω|ohms?)/gi;
    let m; while((m=total.exec(text))) if(!close(Number(m[1]),e.spec.equivalent)) return 'Total resistance conflicts with independent circuit calculation.';
  }
  return '';
}
module.exports={evidence,conflict};
