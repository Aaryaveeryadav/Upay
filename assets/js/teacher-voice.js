/* Browser voices have no standard gender field. Prefer recognizable feminine
   voice names in the requested language; never infer gender from pitch. */
(function(root){
  function select(voices, lang) {
    const base=lang.toLowerCase().split('-')[0];
    const matches=(voices||[]).filter(v=>String(v.lang||'').toLowerCase().split('-')[0]===base);
    const feminine=v=>/\bfemale\b|\b(neerja|heera|swara|kalpana|zira|samantha|victoria|karen|moira|tessa|susan|hazel|aria|jenny|natasha|sonia|sara)\b/i.test(v.name||'');
    const female=matches.filter(feminine);
    const pool=female.length?female:matches;
    const exact=v=>String(v.lang||'').toLowerCase()===lang.toLowerCase();
    const voice=pool.find(exact)||pool.find(v=>v.default)||pool[0]||null;
    return {voice,preferred:!!voice && feminine(voice),rate:base==='hi'?.86:.88,pitch:1,volume:1};
  }
  const api={select};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.UP=root.UP||{};root.UP.teacherVoice=api;}
})(typeof window==='undefined'?globalThis:window);
