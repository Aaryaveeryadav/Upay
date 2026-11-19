/* Narrow exact solution for the stated like-charge, rest-to-2d setup.
   The full wording is matched so different initial speeds, signs, distances,
   forces, or media are never silently treated as this case. */
(function(root){
 'use strict';
 function matches(question){
  const q=String(question||'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
  return /^A particle of charge q and mass m is released from rest (?:at )?a distance d from a fixed charge Q of the same sign\. Using conservation of energy, derive the particle'?s speed when it is (?:at )?a distance 2\s*d from Q\. State (?:any )?assumptions\.?$/.test(q);
 }
 function solve(question,lang){
  if(!matches(question))return null;
  const hi=lang==='hi', L=(en,hindi)=>hi?hindi:en;
  const result='v = √(k × Q × q / (m × d)) = √(Q × q / (4 × π × ε₀ × m × d))';
  const final={t:L('Since Q × q > 0, take the nonnegative square root for speed.','आवेश समान चिह्न के हैं, इसलिए Q × q > 0 और चाल वास्तविक है।'),m:result};
  return {source:'exact',kind:'charge-energy',question,result,
   summary:L('The decrease in electrostatic potential energy from d to 2d becomes the kinetic energy of the moving particle.','d से 2d तक विद्युत स्थितिज ऊर्जा की कमी कण की गतिज ऊर्जा बनती है।'),
   approaches:[
    {name:L('Conservation of energy','ऊर्जा संरक्षण'),steps:[
     {t:L('For point charges in vacuum, let k = 1 / (4 π ε₀). The initial kinetic energy is zero.','निर्वात में बिंदु आवेशों के लिए k = 1 / (4 π ε₀) लें। प्रारंभिक गतिज ऊर्जा शून्य है।'),m:'U₁ = k × Q × q / d;  K₁ = 0'},
     {t:L('At separation 2d, the remaining potential energy and kinetic energy are:','2d दूरी पर स्थितिज और गतिज ऊर्जा हैं:'),m:'U₂ = k × Q × q / (2 × d);  K₂ = ½ × m × v²'},
     {t:L('The loss in potential energy equals the gain in kinetic energy.','स्थितिज ऊर्जा की कमी गतिज ऊर्जा की वृद्धि के बराबर है।'),m:'½ × m × v² = k × Q × q / d − k × Q × q / (2 × d) = k × Q × q / (2 × d)'},
     {t:L('Multiplying both sides by 2 / m cancels the 2 in the denominator.','दोनों पक्षों को 2 / m से गुणा करने पर हर का 2 कट जाता है।'),m:'v² = k × Q × q / (m × d)'},final],
     watch:L('Do not introduce another factor of 2 when taking the square root.','वर्गमूल लेते समय अतिरिक्त 2 न जोड़ें।')},
    {name:L('Potential difference','विभवांतर'),steps:[
     {t:L('The signed potential difference V(d) − V(2d) is k × Q / (2 × d).','चिह्न सहित विभवांतर V(d) − V(2d), k × Q / (2 × d) है।'),m:'V(d) − V(2d) = k × Q / (2 × d)'},
     {t:L('Multiply this signed potential difference by q to obtain the increase in kinetic energy.','गतिज ऊर्जा की वृद्धि के लिए इस विभवांतर को q से गुणा करें।'),m:'½ × m × v² = k × Q × q / (2 × d)'},final]},
    {name:L('Work by the electric force','विद्युत बल का कार्य'),steps:[
     {t:L('The outward Coulomb force is k × Q × q / r². Its work from d to 2d is:','बाहर की ओर कूलॉम बल k × Q × q / r² है। d से 2d तक उसका कार्य:'),m:'W = ∫_{d}^{2d} (k × Q × q / r²) dr = k × Q × q / (2 × d)'},
     {t:L('Work equals the kinetic energy gained from rest.','कार्य, विराम से प्राप्त गतिज ऊर्जा के बराबर है।'),m:'½ × m × v² = k × Q × q / (2 × d)'},final]},
    {name:L('Substitution check','प्रतिस्थापन से जाँच'),steps:[
     {t:L('Substitute v² = k × Q × q / (m × d) back into the kinetic energy.','v² = k × Q × q / (m × d) को गतिज ऊर्जा में रखें।'),m:'½ × m × v² = k × Q × q / (2 × d)'},
     {t:L('Adding the final potential energy recovers the initial total energy.','अंतिम स्थितिज ऊर्जा जोड़ने पर प्रारंभिक कुल ऊर्जा मिलती है।'),m:'K₂ + U₂ = k × Q × q / d = K₁ + U₁'},final]}],
   verify:L('Assume point charges in vacuum, Q fixed, m > 0, d > 0, no other work and negligible radiation; use the nonrelativistic kinetic-energy formula.','मानें कि आवेश निर्वात में बिंदु आवेश हैं, Q स्थिर है, m > 0, d > 0, अन्य कार्य नहीं है और विकिरण नगण्य है; गतिज ऊर्जा का गैर-सापेक्षिक सूत्र लें।'),
   diagram:{type:'charge-energy',verified:true,caption:L('Initial and final separations, using the question’s symbols.','प्रश्न के प्रतीकों से प्रारंभिक और अंतिम दूरी।')},
   check:{state:'passed',source:'symbolic-energy',note:L('The final energy was substituted back.','अंतिम ऊर्जा को वापस रखकर जाँचा गया।')}};
 }
 const api={matches,solve};if(typeof module==='object'&&module.exports)module.exports=api;else{root.UP=root.UP||{};root.UP.chargeEnergy=api;}
})(typeof window==='undefined'?globalThis:window);
