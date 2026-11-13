/* Conservative practice marking: no AI/unknown key is silently treated as official. */
(function(root){
 'use strict';
 function marks(item){const n=Number(item.source && item.source.m);return Number.isInteger(n)&&n>=1&&n<=5?n:null;}
 const text=v=>typeof v==='string'?v:v&&v.en||'';
 const norm=v=>text(v).normalize('NFC').replace(/[−–]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
 function numeric(s){
  const m=norm(s).match(/^([+-]?\d+(?:\.\d+)?)(?:\s*\/\s*([+-]?\d+(?:\.\d+)?))?$/);
  if(!m)return null;const n=Number(m[1])/(m[2]===undefined?1:Number(m[2]));return Number.isFinite(n)?n:null;
 }
 function key(item){const s=item.source||{};return s.keyVerified===true&&s.qualityStatus!=='withheld'&&s.optionReview!=='awaiting-source-review'?text(s.ans).trim():'';}
 function assess(item,answer){
  const s=item.source||{},max=marks(item),expected=key(item),value=norm(answer);
  const options=Array.isArray(s.opts)?s.opts:[];
  const mcq=options.length>=2 && options.length<=6;
  // Multi-mark workings, essays and semantic theory answers need human rubric review.
  let target=norm(expected),picked=value,canMark=false;
  if(expected&&mcq){
   const optionIndex=v=>{const letter=v.match(/^\(?([a-f])\)?[.)]?$/i);if(letter)return letter[1].toLowerCase().charCodeAt(0)-97;return options.findIndex(o=>norm(o)===v||o&&norm(o.hi)===v);};
   const ki=optionIndex(target),ai=optionIndex(picked);
   if(ki>=0&&ki<options.length){canMark=true;target=String(ki);picked=ai>=0?String(ai):'';}
  }else if(expected&&max===1&&numeric(expected)!==null){canMark=!value||numeric(answer)!==null;target=numeric(expected);picked=numeric(answer);}
  if(!canMark)return {status:value?'pending':'unattempted',awarded:null,max,expected,reason:'review'};
  const ok=value!==''&&picked===target;
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
 const api={marks,key,assess,score};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.mockAssessment=api;}
})(typeof window==='undefined'?globalThis:window);
