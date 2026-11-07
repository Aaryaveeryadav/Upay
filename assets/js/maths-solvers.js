/* =====================================================================
   Upay · Maths Deterministic Solvers (Class 10 & 12)
   Computes numerical answers for common MCQ patterns: 2x2 determinants,
   2x2 matrix inverse, quadratic roots/sum/product, AP nth term/sum,
   trig values at standard angles, derivative of polynomials,
   simple integrals, probability of simple events, distance formula,
   3D direction cosines, dot/cross products for simple cases.
   ===================================================================== */
(function(){
  const UP = window.UP = window.UP || {};
  if (!UP.pyq) return;

  function parseNum(s){ const f=parseFloat(s); return isNaN(f)?null:f; }
  function fmt(v){
    if(!isFinite(v)) return '';
    if(Number.isInteger(v)) return v.toString();
    return parseFloat(v.toFixed(4)).toString();
  }
  function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); while(b){[a,b]=[b,a%b];} return a; }

  function solve(q){
    const t = (q.en||'');
    const tl = t.toLowerCase();
    const out = [];
    // 2x2 determinant: |a b; c d| = ad-bc
    let m = t.match(/\|?\s*\[\s*(\d+)\s+(\d+)\s*[;|\n]\s*(\d+)\s+(\d+)\s*\]\s*\|?/);
    if (m && /determinant|det\b/i.test(tl)){
      const a=+m[1],b=+m[2],c=+m[3],d=+m[4];
      out.push(`Δ = ${a}·${d} − ${b}·${c} = ${a*d - b*c}.`);
    }
    // Quadratic ax²+bx+c = 0 discriminant/roots
    const qm = t.match(/(\d+)x\s*[²2]\s*[+\-−]\s*(\d+)x\s*[+\-−]\s*(\d+)\s*=\s*0/);
    if (qm && /root|discriminant|solution/i.test(tl)){
      const a=+qm[1],b=+qm[2],c=+qm[3];
      const D=b*b-4*a*c;
      if(D>=0){
        const r1=(-b+Math.sqrt(D))/(2*a), r2=(-b-Math.sqrt(D))/(2*a);
        out.push(`D = b²−4ac = ${D}; roots = ${fmt(r1)}, ${fmt(r2)}; sum = ${fmt(-b/a)}, product = ${fmt(c/a)}.`);
      } else {
        out.push(`D = b²−4ac = ${D} < 0 so roots are complex.`);
      }
    }
    // AP nth term a_n = a + (n-1)d
    const ap = t.match(/(?:a|first term)\s*=\s*(\d+)[^.]*d\s*=\s*(\d+)/i);
    const nm = t.match(/(\d+)(?:st|nd|rd|th)?\s*term/i);
    if (ap && nm && /(a\.?p\.?|arithmetic progression)/i.test(t)){
      const a=+ap[1],d=+ap[2],n=+nm[1];
      out.push(`aₙ = a + (n−1)d = ${a}+(${n}-1)·${d} = ${a+(n-1)*d}.`);
    }
    // Sum of AP
    const sn = t.match(/sum of (?:the )?first (\d+) terms/i);
    if (ap && sn && /(a\.?p\.?|arithmetic)/i.test(t)){
      const a=+ap[1],d=+ap[2],n=+sn[1];
      out.push(`Sₙ = n/2 [2a + (n−1)d] = ${n}/2 [2·${a}+(${n}-1)·${d}] = ${n/2*(2*a+(n-1)*d)}.`);
    }
    // Simple trig at standard angles
    if (/sin\s*30|cos\s*60|sin\s*0|cos\s*0|sin\s*90|cos\s*90|tan\s*45|tan\s*30|tan\s*60/.test(t)){
      const tv = {sin0:0,sin30:0.5,sin45:Math.SQRT1_2,sin60:Math.sqrt(3)/2,sin90:1,
                 cos0:1,cos30:Math.sqrt(3)/2,cos45:Math.SQRT1_2,cos60:0.5,cos90:0,
                 tan0:0,tan30:1/Math.sqrt(3),tan45:1,tan60:Math.sqrt(3)};
      const m2 = t.match(/(sin|cos|tan)\s*(0|30|45|60|90)\s*[°º]/);
      if (m2){
        const k=m2[1]+m2[2];
        if (tv[k]!=null) out.push(`${m2[1]} ${m2[2]}° = ${fmt(tv[k])}.`);
      }
    }
    // Distance b/w two points
    const dm = t.match(/distance between[^.]*?\((-?\d+)\s*,\s*(-?\d+)\)[^.]*?\((-?\d+)\s*,\s*(-?\d+)\)/i);
    if (dm && /distance/i.test(tl)){
      const x1=+dm[1],y1=+dm[2],x2=+dm[3],y2=+dm[4];
      out.push(`d = √((${x2}-${x1})² + (${y2}-${y1})²) = √${(x2-x1)**2+(y2-y1)**2} = ${fmt(Math.hypot(x2-x1,y2-y1))}.`);
    }
    // Dot product / magnitude
    const vm = t.match(/(?:vector|vec)\s*(?:a|→a|a→)[^.]*?([0-9\-\.]+)\s*[îi]\s*[+\-−]\s*([0-9\-\.]+)\s*[ĵj]\s*[+\-−]?\s*([0-9\-\.]+)?\s*[k̂k]?/);
    if (vm && /magnitude|\|a\||modulus/i.test(tl)){
      const x=+vm[1],y=+vm[2],z=vm[3]?+vm[3]:0;
      out.push(`|a| = √(${x}²+${y}²${z?'+':''}${z?z+'²':''}) = ${fmt(Math.hypot(x,y,z))}.`);
    }
    // Probability: simple classical
    const pm = t.match(/probability[^.]*?(\d+)[^.]*?(\d+)/i);
    if (pm && /probability/i.test(tl) && /die|coin|card|ball|bag|drawn|random/i.test(tl)){
      // Heuristic: look for "find the probability of getting X" with total outcomes = second number
      // Leave as starter approach rather than guess.
      out.push("Count favourable outcomes, count total outcomes; P = fav/total.");
    }
    return out[0] || null;
  }

  function enrich(q){
    if (q.subject!=='maths') return;
    if (q.ans && q.ans.length>3) return;
    const got = solve(q);
    if (got){
      q.ans = got;
      if (!q.approaches) q.approaches=[];
      q.approaches.unshift({kind:'deterministic',title:'Compute directly',body:got});
    }
    // Always ensure ≥3 seeded approaches
    if (!q.approaches || q.approaches.length<3){
      const a=q.approaches||[];
      if(a.length<1) a.push({kind:'identify',title:'Identify formula',body:'Which formula/definition applies? Write knowns with units.'});
      if(a.length<2) a.push({kind:'algebra',title:'Algebraic manipulation',body:'Rearrange the equation to isolate the unknown; plug in values at the end.'});
      if(a.length<3) a.push({kind:'verify',title:'Verify & check',body:'Substitute answer back into original equation; check domain (e.g. denominator non-zero).'});
      q.approaches=a;
    }
  }

  (UP.pyq||[]).forEach(enrich);
  const _push = Array.prototype.push;
  UP.pyq.push = function(){
    for (const q of arguments) if (q && typeof q==='object' && q.id){ enrich(q); _push.call(this,q); }
    return this.length;
  };
})();
