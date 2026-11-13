/* Plain-Unicode presentation for AI maths. No HTML or provider markup executes. */
(function(root) {
  const symbols = {nu:'ν',Phi:'Φ',phi:'φ',alpha:'α',beta:'β',gamma:'γ',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',omega:'ω',Delta:'Δ',delta:'δ',epsilon:'ε',tau:'τ',eta:'η',Omega:'Ω',times:'×',cdot:'·',pm:'±',propto:'∝',implies:'⇒',rightarrow:'→',leftarrow:'←',leq:'≤',geq:'≥',neq:'≠',approx:'≈',infty:'∞',degree:'°',sin:'sin',cos:'cos',tan:'tan',cot:'cot',sec:'sec',csc:'csc',log:'log',ln:'ln'};
  const subs = '₀₁₂₃₄₅₆₇₈₉', supers = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function text(value) {
    let s = String(value == null ? '' : value);
    // Only recognized TeX commands are transformed; unknown notation is retained.
    s = s.replace(/\\(?:left|right)\b/g,'').replace(/\\[()[\]]/g,'').replace(/\$\$?([^$]+)\$\$?/g,'$1');
    s = s.replace(/\\([A-Za-z]+)/g,(all,k)=>symbols[k] || all);
    s=s.replace(/_\{([^{}]+)\}|_([A-Za-z0-9]+)/g,(_,a,b)=>{
      const v=a||b; const letters={a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ'};
      return /^[0-9aehijklmnoprstuvx]+$/.test(v)?Array.from(v,c=>letters[c]||subs[+c]).join(''):'_['+v+']';
    }).replace(/\^\{([^{}]+)\}|\^([+-]?[0-9]+)/g,(_,a,b)=>{
      const v=a||b;return /^[0-9+-]+$/.test(v)?v.replace(/[0-9+-]/g,d=>d==='+'?'⁺':d==='-'?'⁻':supers[+d]):'^('+v+')';
    }).replace(/\\[,;:!]/g,' ');
    for(let i=0;i<8;i++) {
      const before=s;
      s=s.replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,(_,a,b)=>{
        const group=v=>/[+\-=/\s]/.test(v.trim()) ? '('+v.trim()+')' : v.trim();
        return '('+group(a)+'/'+group(b)+')';
      }).replace(/\\sqrt\s*\{([^{}]*)\}/g,'√($1)')
        .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g,'$1');
      if(s===before) break;
    }
    return s;
  }
  const fields = new Set(['answer','result','summary','final','finalAnswer','t','m','note','why','watch','name','tag','caption','nodes','label','text','verify','questionUnderstood']);
  function answer(value,key) {
    if(typeof value==='string') return fields.has(key)?text(value):value;
    if(Array.isArray(value)) return value.map(v=>answer(v,key));
    if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,answer(v,k)]));
    return value;
  }
  // Pasted questions may contain escaped or double-escaped TeX delimiters.
  // Only use this for student input/presentation, never rewrite source banks.
  function question(value) {
    const s=String(value == null ? '' : value);
    if (!/\\+[()[\]]|\$[^$]+\$|\\+(?:frac|sqrt|nu|Phi)\b/.test(s)) return s;
    return text(s.replace(/\\+(?=[()[\]A-Za-z])/g, '\\'));
  }
  const api={text,answer,question};
  if(typeof module==='object' && module.exports) module.exports=api;
  else {root.UP=root.UP||{};root.UP.answerFormat=api;}
})(typeof window==='undefined'?globalThis:window);
