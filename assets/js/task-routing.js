/* Conservative task hints, not a general classifier. Script alone never means
   Hindi subject: Hindi maths/science questions keep their content subject. */
(function(root){
 function resolve(question,selected){
  const q=String(question||'').replace(/\\+[()[\]]|\$/g,''),base=selected||'maths';let subject=base,task='subject',reason='Using the selected subject';
  const devanagari=/[\u0900-\u097f]/.test(q);
  if(devanagari && /निबंध|अनुच्छेद|विचार\s*लिख|पत्र\s*लिख|शब्दों[\s\S]{0,100}लिख|लिख[\s\S]{0,100}शब्दों/.test(q)){
   subject='hindi';task='writing';reason='Hindi composition/word-limit task';
  }else if(/\b(?:write|draft|compose)\b[\s\S]{0,90}\b(?:letter|essay|article|speech|paragraph|story|report)\b/i.test(q)){
   subject='english';task='writing';reason='English composition task';
  }else if(devanagari && /(?:^|[\s।?,])(?:संज्ञा|सर्वनाम|समास|अलंकार|संधि|कारक)(?=$|[\s।?,])/.test(q)){
   subject='hindi';reason='Explicit Hindi grammar task';
  }else if(/\b(?:identify|explain|define)\b[\s\S]{0,50}\b(?:nouns?|pronouns?|adjectives?|tenses?|active voice|passive voice)\b/i.test(q)){
   subject='english';reason='Explicit English grammar task';
  }else if(/electrolytic refining|electroly.*copper|copper.*electroly|balance (?:the )?(?:chemical )?equation|विद्युत अपघटनी परिष्करण|तांबे का शोधन/i.test(q)){
   subject='chemistry';reason='Explicit chemistry process';
  }else if(/glucose|lactic acid|anaerobic|photosynthesis|muscle cells|ग्लूकोज|प्रकाश संश्लेषण/i.test(q)){
   subject='biology';reason='Explicit biology process';
  }else if(/\b(?:resistors?|ohms?)\b|Ω|\bbattery\b[\s\S]{0,90}\b(?:current|voltage|series|parallel)\b|प्रतिरोध|विद्युत परिपथ|ओम/i.test(q)){
   subject='physics';reason='Explicit electrical circuit';
  }else if(/civil disobedience|power sharing|belgium|sri lanka|rainwater harvesting|groundwater recharge|water.management plan|income[\s\S]{0,120}sustainability|सविनय अवज्ञा|बेल्जियम|श्रीलंका|वर्षा जल संचयन|भूजल पुनर्भरण/i.test(q)){
   subject='social';reason='Explicit social-science task';
  }else if(/\b(?:hcf|lcm|positive integers|integer x|perfect square|prime numbers)\b|महत्तम समापवर्तक|लघुत्तम समापवर्त्य/.test(q.toLowerCase())){
   subject='maths';reason='Explicit mathematical task';
  }
  return {selected:base,subject,task,changed:subject!==base,reason,language:subject==='hindi'?'hi':task==='writing'?'en':null};
 }
 const api={resolve};if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.UP=root.UP||{};root.UP.taskRouting=api;}
})(typeof window==='undefined'?globalThis:window);
