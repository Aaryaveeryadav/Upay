/* Conservative practice marking: no AI/unknown key is silently treated as official. */
(function(root){
 'use strict';
 function marks(item){const m=item.source?.m;return (typeof m==='number'||typeof m==='string')&&/^[1-5]$/.test(String(m).trim())?Number(m):null;}
 const text=v=>typeof v==='string'?v:v&&v.en||'';
 const norm=v=>text(v).normalize('NFC').replace(/[−–]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
 // Compare bounded decimal/fraction inputs exactly: a nearby decimal (or an
 // integer beyond Number's precision) must not become the answer to an exact sum.
 function decimal(s){
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const [whole,frac='']=s.split('.');
  return {n:BigInt((whole+frac).replace(/^\+/,'')),d:10n**BigInt(frac.length)};
 }
 function numeric(s){
  const t=norm(s);if(!t||t.length>100)return null;
  const parts=t.split('/').map(v=>decimal(v.trim()));
  if(parts.length===1)return parts[0];
  if(parts.length!==2||!parts[0]||!parts[1]||parts[1].n===0n)return null;
  return {n:parts[0].n*parts[1].d,d:parts[0].d*parts[1].n};
 }
 const equalNumber=(a,b)=>!!a&&!!b&&a.n*b.d===b.n*a.d;
 const tidy=v=>String(v??'').normalize('NFC').replace(/[−–—]/g,'-').trim().replace(/[.,;]$/,'').replace(/\s*([=+*/(),;-])\s*/g,'$1').replace(/\s+/g,' ').trim();
 function quantity(s){
  // Only interpret a complete scalar with a known suffix. Never erase unit
  // substrings from symbolic answers or collapse internal digits/operators.
  const m=/(mm|cm|km|m)(?:\^([23])|([²³]))?$|(?:°|degrees?|units?)$/.exec(s);
  const v=numeric(m?s.slice(0,m.index):s);if(!v)return null;
  if(!m)return {...v,unit:'',scale:1n};
  if(!m[1])return {...v,unit:/degree|°/.test(m[0])?'angle':'unit',scale:1n};
  const power=m[2]||({'²':'2','³':'3'}[m[3]])||'1';
  return {...v,unit:'length'+power,scale:({mm:1n,cm:10n,m:1000n,km:1000000n}[m[1]])**BigInt(power)};
 }
 function samePracticeAnswer(given,want){
  const g=tidy(given),w=tidy(want);if(!g||!w)return false;
  const b=quantity(w);if(!b)return g===w;
  const a=quantity(g);if(!a)return false;
  // A bare number can use the unit implied by the question. If a student
  // explicitly supplies a unit, both dimension and scale must match.
  if(!a.unit)return equalNumber(a,b);
  return a.unit===b.unit&&a.n*a.scale*b.d===b.n*b.scale*a.d;
 }
 const quality=typeof module==='object'&&module.exports?require('./question-quality'):root.UP.questionQuality;
 function key(item){
  const s=item.source||{};
  if(s.keyVerified!==true||!quality.keyMetadataAllows(s)||s.paperCode||s.raw?.paperCode)return '';
  const expected=text(s.ans).trim();
  if(s.opts!=null&&!Array.isArray(s.opts))return '';
  if(!s.opts?.length&&(s.raw?.opts?.length||quality.declaredMcq(s.raw)))return '';
  if(s.opts?.length||quality.declaredMcq(s)){
   if(quality.sourceOptionIssue(s)||quality.choiceIndex(s.opts,expected)<0)return '';
  }
  return expected;
 }
 function assess(item,answer){
  const s=item.source||{},max=marks(item),expected=key(item),value=norm(answer);
  const options=Array.isArray(s.opts)?s.opts:[];
  const mcq=options.length>=2 && options.length<=6;
  // Multi-mark workings, essays and semantic theory answers need human rubric review.
  let target=norm(expected),picked=value,canMark=false;
  if(expected&&mcq){
   target=quality.choiceIndex(options,expected);picked=quality.choiceIndex(options,answer);
   canMark=target>=0&&(!value||picked>=0);
  }else if(expected&&max===1&&numeric(expected)!==null){canMark=!value||numeric(answer)!==null;target=numeric(expected);picked=numeric(answer);}
  if(!canMark)return {status:value?'pending':'unattempted',awarded:null,max,expected,reason:'review'};
  const ok=value!==''&&(mcq?picked===target:equalNumber(picked,target));
  return {status:!value?'unattempted':ok?'correct':'incorrect',awarded:max===null?null:ok?max:0,max,expected,reason:'verified-key'};
 }
 function score(test){
  const r={earned:0,gradable:0,knownTotal:0,unknownMarks:0,pendingMarks:0,pending:0,attempted:0,total:test.items.length,selfEarned:0,selfPossible:0,selfReviewed:0};
  test.items.forEach((item,i)=>{
   const value=String((test.answers||{})[i]||'');const a=assess(item,value);
   if(value.trim())r.attempted++;
   if(a.max===null)r.unknownMarks++;else r.knownTotal+=a.max;
   if(a.awarded===null){
    r.pending++;if(a.max!==null)r.pendingMarks+=a.max;
    const review=(test.reviewMarks||{})[i];
    if(typeof review==='number'&&Number.isFinite(review)&&a.max!==null&&review>=0&&review<=a.max&&Number.isInteger(review*2)){
     r.selfEarned+=review;r.selfPossible+=a.max;r.selfReviewed++;
    }
   }
   else{r.earned+=a.awarded;r.gradable+=a.max;}
  });return r;
 }
 const api={marks,key,assess,score,samePracticeAnswer};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.mockAssessment=api;}
})(typeof window==='undefined'?globalThis:window);
