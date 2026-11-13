/* Source/context guards: preserve original text; do not manufacture language questions. */
(function(root){
 function issue(q){
  if(!q||!['hindi','english','sanskrit'].includes(q.subject))return '';
  if(['text','passage','vocabulary','glossary'].includes(q.kind))return 'Reading passage/glossary, not a standalone exam question';
  if(q.subject==='sanskrit'&&q.sourceVerified!==true)return 'Legacy Hindi study prompt: original Sanskrit wording not source-verified';
  if(/बरामदा\s*22[.।]?\s*साफ़?,?\s*शुद्ध/.test(q.hi||''))return 'Glossary/OCR fragment, not a complete question';
  return '';
 }
 function contextRequest(question,subject,title){
  if(!['hindi','english','sanskrit'].includes(subject))return null;
  const q=String(question||'').trim();let error='';
  if(/बरामदा\s*22[.।]?\s*साफ़?,?\s*शुद्ध/.test(q))error='This appears to be a glossary/OCR fragment, not a complete question. Please provide the full question and its source page.';
  else if(!title&&q.length<450&&/पाठ पढ़ते[ -]पढ़ते|इस पाठ|प्रस्तुत पाठ|इस कहानी|this (?:poem|lesson|chapter|passage)/i.test(q))error='Which chapter or passage does this question refer to? Please provide its title or the relevant extract; I will not guess the missing context.';
  else if(q.length>600&&!/[?？]\s*$/.test(q)&&!/(?:बताइए|बताइये|लिखिए|कीजिए|समझाइए|सारांश|भावार्थ|व्याख्या|अनुवाद|प्रश्नों.*उत्तर|explain|summari[sz]e|analyse|analyze|translate|answer the following)/i.test(q))error='You supplied a reading passage but no clear task. Please specify whether you want a summary, explanation, translation, or answers to particular questions.';
  return error?{code:'language_context_required',error,originalQuestion:q}:null;
 }
 function usableApproach(approach,question,subject){
  if(subject!=='sanskrit'||/(?:हिन्दी|हिंदी|Hindi|English).*(?:अर्थ|अनुवाद|meaning|translation)|(?:translate|अनुवाद).*(?:हिन्दी|हिंदी|Hindi|English)/i.test(question))return true;
  const text=(approach.steps||[]).map(s=>String(s.t||'')+' '+String(s.m||'')).join(' ');
  if(!/[\u0900-\u097f]/.test(text))return false;
  const hindi=text.match(/(?:^|[\s।])(?:है|हैं|क्या|क्यों|कैसे|लिखिए|बताइए|होता|करता|के अनुसार)(?=$|[\s।])/g)||[];
  return hindi.length<2;
 }
 const instructions='LANGUAGE ACCURACY: Answer Sanskrit subject questions in grammatical Sanskrit (Devanagari), not Hindi by default. Provide Hindi/English meanings only when explicitly requested. Preserve the supplied original question/verse; never translate a Hindi study prompt and claim the translation was printed on a Sanskrit board paper. For Hindi and English literature, use the named chapter and supplied extract; a chapter title is context, NOT proof that its complete source text was supplied. Do not invent quotations, authors, characters, chapter mappings, vocabulary prompts or unseen subquestions. If a question depends on a missing extract, ask for it. A passage without a task is not a solved question. Distinguish interpretation from explicit textual evidence, and state uncertainty instead of claiming verification. For questions outside the bank, general grammar/composition is allowed but source-specific claims still require adequate context.';
 const api={issue,contextRequest,instructions,usableApproach};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.languagePolicy=api;}
})(typeof window==='undefined'?globalThis:window);
