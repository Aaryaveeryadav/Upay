/* Shared browser/API timing profile. Keep below the configured 180s solve function. */
(function(root){
 function forQuestion(question,subject){
  const q=String(question||'');
  const extended=['english','hindi','sanskrit'].includes(subject)||q.length>600||/\b(?:essay|letter|long[ -]answer|in detail|detailed|compose|draft|report|speech)\b|निबंध|अनुच्छेद|विस्तार से|पत्र\s*लिख/i.test(q);
  return extended?{extended:true,serverMs:140000,attemptMs:70000,clientMs:165000,maxOutputTokens:12288}:{extended:false,serverMs:50000,attemptMs:24000,clientMs:65000,maxOutputTokens:6144};
 }
 const api={forQuestion};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.solveTiming=api;}
})(typeof window==='undefined'?globalThis:window);
