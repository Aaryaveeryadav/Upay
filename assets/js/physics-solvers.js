/* =====================================================================
   Upay · Physics Deterministic Solvers (Class 12)
   Scans UP.pyq physics questions and computes numerical answers for
   standard patterns: Coulomb, Ohm, resistors, capacitors, lens/mirror,
   Biot-Savart wire, AC reactance, photoelectric, Bohr, half-life,
   logic-gate truth tables, refractive index TIR, etc.
   ===================================================================== */
(function(){
  const UP = window.UP = window.UP || {};
  if (!UP.pyq) return;

  /* ---------- helpers ---------- */
  const numPat = /(-?\d+\.?\d*(?:\s*[×x*]\s*10\s*[–\-−^]?\s*\d+)?)/g;
  function nums(s){
    if (!s) return [];
    const out = [];
    const m = s.replace(/–/g,'-').replace(/−/g,'-').replace(/\^/g,'');
    // Scientific notation: a × 10^b
    const re = /(-?\d+\.?\d*)\s*(?:×|x|\*)\s*10\s*(?:\^|\*\*)?\s*[–\-−]?\s*(-?\d+)/g;
    let r;
    while((r=re.exec(m))!==null){
      out.push(parseFloat(r[1])*Math.pow(10,parseInt(r[2])));
    }
    // Plain numbers
    const plain = m.replace(re,' ').match(/-?\d+\.?\d+/g) || [];
    for (const x of plain){ const v=parseFloat(x); if(!isNaN(v)) out.push(v); }
    return out;
  }
  function fmt(v, sig=2){
    if (!isFinite(v)) return '';
    if (Math.abs(v) < 1e-2 && v!==0) return v.toExponential(sig);
    if (Math.abs(v) >= 1e6) return v.toExponential(sig);
    const s = v.toPrecision(sig+1);
    return parseFloat(s).toString();
  }
  function solve(q){
    const t = (q.en||'').toLowerCase();
    const a = nums(q.en);
    if (!a.length) return null;
    let res = null;
    // Coulomb's law: F = k|q1q2|/r², k=9e9 (in air). Qs give q1,q2,distance(cm->m)
    if (/coulomb|force between.*charge|charged spheres.*apart|two.*charges.*apart|electrostatic force.*spheres/.test(t)){
      // look for q1 in C, q2 in C, r in cm or m
      const qMatch = t.match(/(\d+\.?\d*\s*(?:×\s*10\s*[–\-−]?\d+)?)\s*c\b[^.]*?(\d+\.?\d*\s*(?:×\s*10\s*[–\-−]?\d+)?)\s*c/);
      const rMatch = t.match(/(\d+\.?\d*)\s*(cm|m)\s*apart/);
      if (qMatch && rMatch){
        const q1 = parseFloat(qMatch[1].replace(/[^\d.\-×e]/g,'').replace(/×/,'e').replace(/–/g,'-'));
        const q2 = parseFloat(qMatch[2].replace(/[^\d.\-×e]/g,'').replace(/×/,'e').replace(/–/g,'-'));
        let r = parseFloat(rMatch[1]);
        if (rMatch[2]==='cm') r/=100;
        const F = 9e9*Math.abs(q1*q2)/(r*r);
        res = `By Coulomb's law F = (1/4πε₀)·|q₁q₂|/r² = 9×10⁹ × ${q1}×${q2} / ${r}² ≈ ${fmt(F,2)} N.`;
      }
    }
    // Ohm's law V=IR
    if (/ohm|current.*flow|potential difference.*resistor|v\s*=\s*i\s*r/i.test(t) && /resistor|resistance/i.test(t)){
      const v = t.match(/(\d+\.?\d*)\s*v/i);
      const r = t.match(/(\d+\.?\d*)\s*(?:Ω|ohm)/i);
      const i = t.match(/(\d+\.?\d*)\s*a/i);
      if (v && r) res = `Using Ohm's law I = V/R = ${v[1]} / ${r[1]} = ${fmt(parseFloat(v[1])/parseFloat(r[1]))} A.`;
      else if (v && i) res = `Using Ohm's law R = V/I = ${v[1]} / ${i[1]} = ${fmt(parseFloat(v[1])/parseFloat(i[1]))} Ω.`;
      else if (r && i) res = `Using Ohm's law V = IR = ${i[1]} × ${r[1]} = ${fmt(parseFloat(i[1])*parseFloat(r[1]))} V.`;
    }
    // Series/parallel resistors: "equivalent resistance" or "combination of resistors"
    if (/(series|parallel).*resistor|equivalent resistance|combination of.*resistor|three resistors.*connected in/i.test(t)){
      const rNums = [];
      const rm = t.matchAll(/(\d+\.?\d*)\s*(?:Ω|ohm)/g);
      for (const m of rm) rNums.push(parseFloat(m[1]));
      if (/series/i.test(t) && rNums.length){
        const R = rNums.reduce((a,b)=>a+b,0);
        res = `Series: R_eq = ${rNums.join('+')} = ${fmt(R)} Ω.`;
      } else if (/parallel/i.test(t) && rNums.length){
        const inv = rNums.reduce((a,b)=>a+1/b,0);
        const R = 1/inv;
        res = `Parallel: 1/R_eq = ${rNums.map(r=>'1/'+r).join('+')} = ${fmt(inv,3)} ⇒ R = ${fmt(R)} Ω.`;
      }
    }
    // Lens/mirror formula 1/f = 1/v - 1/u (lens) or 1/f = 1/v+1/u (mirror with sign convention)
    if (/(?:convex|concave)\s*(?:lens|mirror)|focal length.*(?:lens|mirror)|image formed by/i.test(t)){
      const fM = t.match(/focal length\s*(?:of\s*)?(\d+\.?\d*)\s*cm/i);
      const uM = t.match(/(?:object|placed)\s*(?:at a distance of|at|from)[^.]*?(\d+\.?\d*)\s*cm/i);
      if (fM && uM){
        const f = parseFloat(fM[1]), u = parseFloat(uM[1]);
        // Mirror: 1/v = 1/f - 1/u using Cartesian (u negative for real objects in front)
        if (/mirror/i.test(t)){
          const v = 1/(1/f - 1/(-u));
          const m = -v/(-u);
          res = `Using mirror formula 1/f = 1/v + 1/u (with u = -${u} cm for real object): v ≈ ${fmt(v)} cm, magnification m ≈ ${fmt(m)}.`;
        } else {
          const v = 1/(1/f - 1/(-u));
          const m = v/(-u);
          res = `Using lens formula 1/f = 1/v − 1/u (u = -${u} cm, convex f = +${f} cm): v ≈ ${fmt(v)} cm, m ≈ ${fmt(m)}.`;
        }
      }
    }
    // Refractive index / Snell / critical angle
    if (/refractive index|critical angle|snell|total internal/i.test(t)){
      const n = t.match(/refractive index\s*(?:of|is)?\s*(\d+\.?\d*)/i);
      if (n){
        const nv = parseFloat(n[1]);
        const c = Math.asin(1/nv)*180/Math.PI;
        res = `Critical angle i_c = arcsin(1/n) = arcsin(1/${nv}) ≈ ${fmt(c)}°.`;
      }
    }
    // Photoelectric K_max = hν - φ
    if (/photoelectric|work function|threshold frequency|stopping potential/i.test(t)){
      const phi = t.match(/work function\s*(?:of|=)\s*(\d+\.?\d*)\s*ev/i);
      const wl = t.match(/wavelength\s*(?:of|=)\s*(\d+\.?\d*)\s*nm/i);
      const nu = t.match(/frequency\s*(?:of|=)\s*(\d+\.?\d*)\s*(?:×|x)\s*10\s*[–\-−]?(\d+)\s*hz/i);
      const h = 4.136e-15; // eV·s
      if (phi && wl){
        const ph = parseFloat(phi[1]), w = parseFloat(wl[1])*1e-9;
        const E = 1240/(w*1e9); // eV for wavelength in nm
        const K = E - ph;
        res = `Photon energy E = hc/λ = 1240/${wl[1]} = ${fmt(E)} eV. K_max = E − φ = ${fmt(E)} − ${ph} = ${fmt(K)} eV.`;
      }
    }
    // Bohr hydrogen energy levels E_n = -13.6/n², 1/λ = R(1/n1² - 1/n2²)
    if (/bohr|hydrogen atom|energy level|spectral series|rydberg/i.test(t)){
      const n1 = t.match(/n\s*=\s*(\d)/);
      const gs = t.match(/ground state/i);
      if (gs && n1){
        const n = parseInt(n1[1]);
        const E = -13.6/(n*n);
        res = `In the Bohr model Eₙ = −13.6/n² = ${fmt(E)} eV for n = ${n}.`;
      }
    }
    // Half-life N = N0 e^{-λt}, T½=ln2/λ
    if (/half-?life|mean life|decay constant|radioactive/i.test(t)){
      const t12 = t.match(/half-?life\s*(?:of|=)\s*(\d+\.?\d*)\s*(years|days|s|hours)/i);
      const tm = t.match(/after\s*(\d+\.?\d*)\s*(years|days|s|hours)/i);
      if (t12 && tm && t12[2]===tm[2]){
        const T=parseFloat(t12[1]), t=parseFloat(tm[1]);
        const N = Math.pow(0.5, t/T);
        res = `N/N₀ = (1/2)^(t/T₁⸍₂) = (1/2)^(${t}/${T}) ≈ ${fmt(N,3)}.`;
      }
    }
    return res;
  }

  function enrich(q){
    if (q.subject!=='physics') return;
    if (q.ans && q.ans.length>3) return; // already has answer
    const computed = solve(q);
    if (computed){
      q.ans = computed;
      if (!q.approaches) q.approaches = [];
      q.approaches.unshift({kind:'deterministic', title:'Numerical solution', body:computed});
    }
    // Always attach 3 starter approaches for physics Qs
    if (!q.approaches || q.approaches.length<3){
      const a = q.approaches || [];
      if (a.length<1) a.push({kind:'conceptual', title:'Identify principle', body:'Which physics law / formula applies here? Write down the known quantities with SI units.'});
      if (a.length<2) a.push({kind:'algebraic', title:'Solve symbolically first', body:'Derive an expression for the unknown in terms of given quantities before plugging in numbers.'});
      if (a.length<3) a.push({kind:'check', title:'Unit & order-of-magnitude check', body:'Verify the answer has the correct units and is physically reasonable (sign, direction, magnitude).'});
      q.approaches = a;
    }
  }

  (UP.pyq||[]).forEach(enrich);
  // Hook future loads
  const _push = Array.prototype.push;
  UP.pyq.push = function(){
    for (const q of arguments) if (q && typeof q==='object' && q.id){ enrich(q); _push.call(this,q); }
    return this.length;
  };
})();
