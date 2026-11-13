/* Persistent unresolved attempts. Only a checked correct answer resolves one. */
(function(root){
 const id=q=>String(q||'').normalize('NFC').replace(/\s+/g,' ').trim();
 function update(queue,item,answer,assessment,now=Date.now()){
  const list=Array.isArray(queue)?queue:[],q=id(item&&item.q);
  if(!q||!assessment||!['verified-key','exact-answer'].includes(assessment.reason))return list;
  if(assessment.status==='correct')return list.filter(entry=>id(entry.q)!==q);
  if(assessment.status!=='incorrect')return list;
  const previous=list.find(entry=>id(entry.q)===q);
  const record={q:item.q,item:JSON.parse(JSON.stringify(item)),ch:item.ch,at:previous?previous.at:now,last:now,lastAnswer:String(answer),attempts:(previous&&previous.attempts||0)+(previous&&previous.lastAnswer===String(answer)?0:1)};
  return [record,...list.filter(entry=>id(entry.q)!==q)];
 }
 const api={id,update};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.mistakeQueue=api;}
})(typeof window==='undefined'?globalThis:window);
