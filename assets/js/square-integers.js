/* Bounded exact solver, shared by browser and both API implementations.
   Only the explicitly parsed positive-integer monic quadratic problem applies. */
(function(root){
 function compute(question){
  const q=String(question||'').replace(/\\+[()[\]]|\$/g,'').replace(/\^\{(\d+)\}/g,'^$1').replace(/²/g,'^2').replace(/[−–]/g,'-').replace(/\s+/g,' ').trim();
  const m=q.match(/^(?:find|determine) all (?:the )?positive (?:integers? n|integer values? of n) (?:for which|such that)\s+n\^2\s*\+\s*(\d+)\s*n\s*\+\s*(\d+)\s+is a perfect square[.?]?$/i);
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
 // Exact bounded class: integer x, sqrt(x+a)+sqrt(b-x) an integer.
 // Parse the whole question: never silently discard extra constraints.
 function clarification(question){
  const q=String(question||'').replace(/\\+[()[\]]|\$/g,'').replace(/\s+/g,' ').trim();
  if(!/^(?:find|determine) all (?:the )?positive integers? [n7] (?:for which|such that) n(?:2|²|\^2|\^\{2\})\s*\+\s*10\s*[mn]\s*\+\s*2026 is a perfect square[.?]?$/i.test(q))return null;
  if(!/positive integers?\s+7\b|n2\s*\+|n[²^2{} ]+\s*\+\s*10\s*m\b|n2\s*\+\s*10\s*m/i.test(q))return null;
  return {code:'question_needs_confirmation',error:'The question has ambiguous notation (7, n2 or mixed n and m). Please confirm the original expression before solving; it has not been silently changed.',originalQuestion:String(question),suggestedQuestion:'Find all positive integers n for which n² + 10n + 2026 is a perfect square.'};
 }
 function radicalCompute(question){
  const q=String(question||'').replace(/\\+[()[\]]|\$/g,'').replace(/\\sqrt\s*\{([^{}]+)\}/g,'√($1)').replace(/sqrt\s*\(/gi,'√(').replace(/[−–]/g,'-').replace(/\s+/g,' ').trim();
  const m=q.match(/^(?:find|determine) all (?:the )?(?:integers? x|integer values? of x) (?:for which|such that)\s*√\(\s*x\s*\+\s*(\d+)\s*\)\s*\+\s*√\(\s*(\d+)\s*-\s*x\s*\)\s+is an integer[.?]?$/i);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]),S=a+b;
  if(!Number.isSafeInteger(S)||S<1||S>1000)return null;
  const solutions=[],checked=[];
  for(let x=-a;x<=b;x++){
   const u=x+a,v=b-x,r=Math.floor(Math.sqrt(u)),s=Math.floor(Math.sqrt(v));
   const valid=r*r===u&&s*s===v;
   checked.push({x,u,v,valid});if(valid)solutions.push({x,r,s,k:r+s});
  }
  return {a,b,S,solutions,checked};
 }
 function radicalSolve(question,lang){
  const d=radicalCompute(question);if(!d)return null;
  const {a,b,S,solutions}=d,hi=lang==='hi',L=(en,h)=>hi?h:en;
  const expression='√(x + '+a+') + √('+b+' − x)',result=solutions.length?'x ∈ {'+solutions.map(s=>s.x).join(', ')+'}':L('No integer solutions','कोई पूर्णांक हल नहीं');
  const checks=solutions.map(s=>'x = '+s.x+': √'+s.r*s.r+' + √'+s.s*s.s+' = '+s.r+' + '+s.s+' = '+s.k);
  const kmin=Math.ceil(Math.sqrt(S)),kmax=Math.floor(Math.sqrt(2*S));
  const cases=[];
  for(let k=kmin;k<=kmax;k++){
   // u+v=S, 4uv=(k²-S)²; (u-v)²=2Sk²-k⁴.
   const D=2*S*k*k-k*k*k*k,t=Math.floor(Math.sqrt(Math.max(0,D)));
   const xs=D>=0&&t*t===D&&(S+t)%2===0?[(S-t)/2-a,(S+t)/2-a].filter((x,i,arr)=>arr.indexOf(x)===i&&solutions.some(s=>s.x===x&&s.k===k)):[];
   cases.push('k = '+k+': (u − v)² = '+D+'; '+(xs.length?'x = '+xs.join(', '):L('no integer x','कोई पूर्णांक x नहीं')));
  }
  const finish={t:L('Complete verified solution set.','सत्यापित पूर्ण हल समुच्चय।'),m:result};
  return {source:'exact',kind:'integer-radical-sum',policyVersion:'four-approaches-v3',question,result,
   summary:L('All four explanations use the same exact solution set. Integer square roots and the entire finite domain are checked, not rounded approximations.','चारों व्याख्याओं में एक ही सटीक हल समुच्चय है। पूर्णांक वर्गमूल और पूरे सीमित प्रांत की जाँच की गई है।'),
   approaches:[{
    name:L('Integer-root theorem and square pairs','पूर्णांक वर्गमूल प्रमेय और वर्ग युग्म'),
    steps:[{t:L('Both radicands are nonnegative integers; their sum is fixed.','दोनों वर्गमूलों के अंदर अऋण पूर्णांक हैं और उनका योग निश्चित है।'),m:'−'+a+' ≤ x ≤ '+b+'; u = x + '+a+', v = '+b+' − x; u + v = '+S},
     {t:L('If √u + √v = k is a positive integer, isolate √u: 2k√u = k² + u − v. Thus √u is rational. A rational square root of an integer is an integer (reduce its fraction and compare prime factors); so √v is also an integer.','यदि √u + √v = k धन पूर्णांक है, तो 2k√u = k² + u − v। अतः √u परिमेय है। पूर्णांक का परिमेय वर्गमूल पूर्णांक होता है; इसलिए √v भी पूर्णांक है।')},
     {t:L('Enumerate all nonnegative square pairs r² + s² = '+S+' and recover x = r² − '+a+'.','सभी अऋण वर्ग युग्म r² + s² = '+S+' लें और x = r² − '+a+' निकालें।'),m:solutions.map(s=>'('+s.r+'², '+s.s+'²) ⇒ x = '+s.x).join('; ')||result},finish]
   },{
    name:L('Bounded integer sums with completed cases','सीमित पूर्णांक योग और पूर्ण जाँच'),
    steps:[{t:L('The minimum sum is at an endpoint; Cauchy–Schwarz gives the maximum.','न्यूनतम योग सीमा बिंदु पर है; कॉशी–श्वार्ज से अधिकतम मिलता है।'),m:'√'+S+' ≤ k ≤ √'+(2*S)+'; k ∈ {'+Array.from({length:kmax-kmin+1},(_,i)=>kmin+i).join(', ')+'}'},
     {t:L('Use u + v = S and 2√uv = k² − S, then test the integer square discriminant and parity. Every surviving candidate must satisfy the original expression.','u + v = S और 2√uv = k² − S से पूर्णांक वर्ग विविक्तकर तथा सम-विषमता जाँचें। प्रत्येक बचे मान को मूल व्यंजक में जाँचें।'),m:'(u − v)² = 2Sk² − k⁴'},
     ...cases.map(m=>({t:L('Completed case','पूर्ण जाँच'),m})),finish]
   },{
    name:L('Exhaustive exact domain verification','पूरे प्रांत की सटीक जाँच'),
    steps:[{t:L('Check every integer in the domain, including both endpoints. This is a verification procedure, not a new independent theorem.','दोनों सीमा बिंदुओं सहित पूरे प्रांत के हर पूर्णांक की जाँच करें। यह सत्यापन प्रक्रिया है, अलग स्वतंत्र प्रमेय नहीं।'),m:'x = −'+a+', …, '+b+'; '+(S+1)+L(' integers checked',' पूर्णांकों की जाँच')},
     {t:L('For each x calculate u and v. Accept only if their integer roots square back exactly to u and v; the theorem in the first explanation proves this test is necessary and sufficient. No rounded floating-point sum is used.','प्रत्येक x पर u और v निकालें। तभी स्वीकारें जब दोनों पूर्णांक वर्गमूलों के वर्ग ठीक u और v हों; पहली व्याख्या का प्रमेय इस कसौटी को आवश्यक और पर्याप्त बनाता है।')},
     ...checks.map(m=>({t:L('Successful exact substitution','सफल सटीक प्रतिस्थापन'),m})),finish]
   },{
    name:L('Substitution and completeness certificate','प्रतिस्थापन और पूर्णता प्रमाण'),
    steps:[...checks.map(m=>({t:L('Verify in the original expression.','मूल व्यंजक में जाँचें।'),m})),
     {t:L('No other integer can work: the domain is finite, and the integer-root theorem reduces every possible solution to the square pairs already exhausted. This is a consistency/completeness check, not a fourth unrelated derivation.','अन्य कोई पूर्णांक हल नहीं है: प्रांत सीमित है और पूर्णांक वर्गमूल प्रमेय से सभी संभावित हल उन्हीं वर्ग युग्मों में आते हैं जिनकी पूरी जाँच हो चुकी है। यह संगति और पूर्णता की जाँच है, अलग चौथी व्युत्पत्ति नहीं।')},finish]
   }],verify:checks.join('; ')+'; '+result,diagram:null,conceptDiagram:null,
   check:{state:'verified',source:'arithmetic',note:L('Exact square-pair enumeration, full-domain integer tests and original-expression substitution.','सटीक वर्ग युग्म खोज, पूरे प्रांत की पूर्णांक जाँच और मूल व्यंजक में प्रतिस्थापन।')}};
 }

 function solve(question,lang){
  const radical=radicalSolve(question,lang);if(radical)return radical;
  const data=compute(question);if(!data)return null;
  const {b,c,h,D,pairs,solutions}=data,hi=lang==='hi',L=(a,b)=>hi?b:a;
  const ns=solutions.map(s=>s.n),valid=pairs.filter(p=>p.n>0);
  const result=ns.length?'n = '+ns.join(', '):L('No positive integer solutions','कोई धन पूर्णांक हल नहीं');
  const shift='(n + '+h+')', equation='m² − '+shift+'² = '+D;
  const pairText=pairs.map(p=>'('+p.u+', '+p.v+')').join(', ');
  const positive=valid.map(p=>'('+p.u+', '+p.v+') ⇒ n = '+p.n).join('; ')||result;
  return {source:'exact',kind:'integer-square',policyVersion:'four-approaches-v3',question,
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
   },{
    name:L('Finite bound on n (alternative completeness argument)','n की सीमित सीमा से पूर्णता का तर्क'),
    steps:[{t:L('Because u is a positive divisor of D, u ≥ 1 and v ≤ D.','u धन भाजक है, इसलिए u ≥ 1 और v ≤ D।'),m:'n = (v − u)/2 − '+h+' ≤ ('+D+' − 1)/2 − '+h},
     {t:L('The divisor search covers every integer candidate that can meet the square condition within this bound.','इस सीमा में वर्ग की शर्त पूरी करने वाला हर संभावित मान भाजक खोज में शामिल है।'),m:result}],
    why:L('This is an alternative way to justify the finite search, not a separate numerical solution set.','यह सीमित खोज का वैकल्पिक औचित्य है, अलग उत्तर-सूची नहीं।')
   }],
   verify:L('All same-parity positive factor pairs of '+D+' were enumerated; every retained value was checked in the original expression.','सभी समान सम-विषमता वाले धन गुणनखंड युग्म जाँचे गए और हर हल मूल व्यंजक में परखा गया।'),
   diagram:null,conceptDiagram:{type:'flow',nodes:[equation,'uv = '+D, 'n = (v − u)/2 − '+h,result],caption:L('Factor-pair proof flow; all admissible pairs are checked.','गुणनखंड युग्मों का तर्क; सभी उपयुक्त युग्म जाँचे गए।')},
   check:{state:'verified',source:'arithmetic',note:L('Exact finite factor-pair enumeration and substitution.','सटीक गुणनखंड खोज और प्रतिस्थापन।')}
  };
 }
 const api={compute,solve,radicalCompute,clarification};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.squareInteger=api;}
})(typeof window==='undefined'?globalThis:window);
