/* Shared browser/API timing profile. Keep below the configured 180s solve function. */
(function(root){
 function forQuestion(question,subject){
  const q=String(question||'');
  const extended=['english','hindi','sanskrit','social'].includes(subject)||q.length>350||/\(\s*[a-d]\s*\)[\s\S]*\(\s*[b-d]\s*\)|\bOR\b[\s\S]*\bOR\b|\b(?:essay|letter|long[ -]answer|in detail|detailed|compose|draft|report|speech|case study|source based|passage)\b|निबंध|अनुच्छेद|विस्तार से|पत्र\s*लिख/i.test(q);
  return extended?{extended:true,serverMs:140000,attemptMs:100000,clientMs:165000,maxOutputTokens:12288}:{extended:false,serverMs:50000,attemptMs:24000,clientMs:65000,maxOutputTokens:6144};
 }
 /* Split requests. A long question that blows the single budget is answered in
   parts instead of being lost: part 1 carries the answer, then one method at a
   time. Each part is small enough to finish well inside the function limit. */
 function forPart(part){
  if(part==='core')return{part:'core',serverMs:42000,attemptMs:20000,clientMs:50000,maxOutputTokens:4096};
  if(part==='approach')return{part:'approach',serverMs:38000,attemptMs:18000,clientMs:46000,maxOutputTokens:3072};
  return null;
 }
 const api={forQuestion,forPart};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.solveTiming=api;}
})(typeof window==='undefined'?globalThis:window);
