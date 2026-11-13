/* Bounded exact solver, shared by browser and both API implementations.
   Only the explicitly parsed positive-integer monic quadratic problem applies. */
(function(root){
 function compute(question){
  const q=String(question||'').replace(/\\+[()[\]]|\$/g,'').replace(/\^\{(\d+)\}/g,'^$1').replace(/²/g,'^2').replace(/[−–]/g,'-').trim();
  const m=q.match(/^(?:find|determine) all (?:the )?positive integers? n (?:for which|such that)\s+n\^2\s*\+\s*(\d+)\s*n\s*\+\s*(\d+)\s+is a perfect square[.?]?$/i);
  if(!m)return null;
  const b=Number(m[1]),c=Number(m[2]),h=b/2,D=c-h*h;
  if(!Number.isSafeInteger(c)||b>2000||b%2||D<=0||D>10000000)return null;
  const pairs=[],solutions=[];
  for(let u=1;u*u<=D;u++){
   if(D%u)continue;
   const v=D/u;if((u+v)%2)continue;
   const n=(v-u)/2-h, square=(u+v)/2;
   pairs.push({u,v,n,square});
   if(n>0 && Number.isSafeInteger(n) && n*n+b*n+c===square*square)solutions.push({n,square});
  }
  solutions.sort((a,b)=>a.n-b.n);
  return {b,c,h,D,pairs,solutions};
 }
 function solve(question,lang){
  const data=compute(question);if(!data)return null;
  const {b,c,h,D,pairs,solutions}=data,hi=lang==='hi',L=(a,b)=>hi?b:a;
  const ns=solutions.map(s=>s.n),valid=pairs.filter(p=>p.n>0);
  const result=ns.length?'n = '+ns.join(', '):L('No positive integer solutions','कोई धन पूर्णांक हल नहीं');
  const shift='(n + '+h+')', equation='m² − '+shift+'² = '+D;
  const pairText=pairs.map(p=>'('+p.u+', '+p.v+')').join(', ');
  const positive=valid.map(p=>'('+p.u+', '+p.v+') ⇒ n = '+p.n).join('; ')||result;
  return {source:'exact',kind:'integer-square',policyVersion:'three-approaches-v1',question,
   title:L('All positive integer solutions','सभी धन पूर्णांक हल'),result,
   summary:L('Complete the square, then enumerate every same-parity factor pair. This finds all solutions, not just one candidate.', 'पूर्ण वर्ग बनाकर समान सम-विषमता वाले सभी गुणनखंड युग्म जाँचें। इससे सभी हल मिलते हैं।'),
   approaches:[{
    name:L('Difference-of-squares derivation','वर्गों के अंतर से हल'),
    steps:[{t:L('Let the required square be m² and complete the square.','पूर्ण वर्ग को m² मानकर वर्ग पूरा करें।'),m:equation},
     {t:L('Factor the difference.','वर्गों का अंतर गुणनखंडित करें।'),m:'(m − n − '+h+')(m + n + '+h+') = '+D},
     {t:L('Use every positive factor pair of matching parity and keep n > 0.','समान सम-विषमता वाले सभी धन गुणनखंड युग्म लें और n > 0 रखें।'),m:positive}]
   },{
    name:L('Finite divisor search (same identity)','सीमित भाजक खोज (उसी सर्वसमिका से)'),
    steps:[{t:L('Set u = m − n − '+h+' and v = m + n + '+h+'. Then uv = '+D+'.','u = m − n − '+h+' तथा v = m + n + '+h+' रखने पर uv = '+D+'।'),m:'1 ≤ u ≤ √'+D+'; v = '+D+'/u'},
     {t:L('Enumerate all divisors up to the square root; u and v must have the same parity.','वर्गमूल तक सभी भाजक जाँचें; u और v की सम-विषमता समान होनी चाहिए।'),m:pairText||L('No same-parity factor pairs','समान सम-विषमता वाला युग्म नहीं')},
     {t:L('Recover n from each pair and discard zero/negative values.','प्रत्येक युग्म से n निकालें; शून्य/ऋण मान हटाएँ।'),m:'n = (v − u)/2 − '+h+'; '+result}],
    why:L('Every positive solution has exactly one such pair, so this enumeration is exhaustive. This is a systematic form of the first method, not a different theorem.','हर धन हल का ऐसा एक युग्म होता है, इसलिए सूची पूर्ण है। यह पहली विधि की व्यवस्थित जाँच है।')
   },{
    name:L('Exact substitution and completeness check','सटीक प्रतिस्थापन और पूर्णता जाँच'),
    steps:solutions.length?solutions.map(s=>({t:L('Substitute n = '+s.n+' into the original expression.','मूल व्यंजक में n = '+s.n+' रखें।'),m:s.n+'² + '+b+' × '+s.n+' + '+c+' = '+(s.square*s.square)+' = '+s.square+'²'})):[{t:L('No same-parity factor pair yields n > 0.','किसी समान सम-विषमता वाले युग्म से n > 0 नहीं मिलता।'),m:result}],
    why:L('Substitution verifies each listed value; the exhaustive factor-pair search proves there are no other positive solutions. Checking examples alone would not prove completeness.','प्रतिस्थापन हर मान की जाँच करता है; सभी गुणनखंड युग्मों की खोज से सिद्ध होता है कि अन्य धन हल नहीं हैं।')
   }],
   verify:L('All same-parity positive factor pairs of '+D+' were enumerated; every retained value was checked in the original expression.','सभी समान सम-विषमता वाले धन गुणनखंड युग्म जाँचे गए और हर हल मूल व्यंजक में परखा गया।'),
   diagram:null,conceptDiagram:{type:'flow',nodes:[equation,'uv = '+D, 'n = (v − u)/2 − '+h,result],caption:L('Factor-pair proof flow; all admissible pairs are checked.','गुणनखंड युग्मों का तर्क; सभी उपयुक्त युग्म जाँचे गए।')},
   check:{state:'verified',source:'arithmetic',note:L('Exact finite factor-pair enumeration and substitution.','सटीक गुणनखंड खोज और प्रतिस्थापन।')}
  };
 }
 const api={compute,solve};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.squareInteger=api;}
})(typeof window==='undefined'?globalThis:window);
