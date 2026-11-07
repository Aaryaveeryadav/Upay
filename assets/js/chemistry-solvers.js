/* =====================================================================
   Upay · Chemistry Deterministic Solvers (Class 12)
   Computes answers for molarity/molality/mole fraction/colligative
   properties/Nernst equation/half-life (1st order).
   ===================================================================== */
(function(){
  const UP = window.UP = window.UP || {};
  if (!UP.pyq) return;

  function nums(s){
    if(!s) return [];
    s=s.replace(/–/g,'-').replace(/−/g,'-');
    const out=[];
    const re=/-?\d+\.?\d*\s*(?:×|x|\*)\s*10\s*(?:\^|\*\*)?\s*[–\-−]?\s*(-?\d+)/g;
    let r;
    while((r=re.exec(s))!==null) out.push(parseFloat(r[0].replace(/[×x*]/g,'e').replace(/\s/g,'')));
    const plain=s.replace(re,' ').match(/-?\d+\.?\d+/g)||[];
    for(const x of plain){const v=parseFloat(x); if(!isNaN(v)) out.push(v);}
    return out;
  }
  function fmt(v,s=3){ if(!isFinite(v)) return ''; return parseFloat(v.toPrecision(s+1)).toString(); }

  function solve(q){
    const t=(q.en||'').toLowerCase();
    const a=nums(q.en); if(!a.length) return null;
    // Molarity M = n/V(L)
    if(/molarity|molar concentration/i.test(t) && /dissolv|solution|made up to|water to make/i.test(t)){
      // look for "X g of Y (M g/mol) dissolved to make V mL"
      const m=/(\d+\.?\d*)\s*g/i.exec(t), vol=/(\d+\.?\d*)\s*ml/i.exec(t);
      const mm=/molar mass[^.]*?(\d+\.?\d*)\s*g/i.exec(t);
      if(m && vol){
        const M=mm?parseFloat(mm[1]):(a[2]||0);
        if(M){const g=parseFloat(m[1]),V=parseFloat(vol[1])/1000;
          return `M = (${g}/${M})/${V} = ${fmt((g/M)/V)} M.`;}
      }
    }
    // Molality m = n/kg(solvent)
    if(/molality|molal/i.test(t)){
      // simplistic: give formula
    }
    // Raoult: p = p°·X_solvent
    if(/raoult|vapour pressure.*solution|mole fraction.*vapour/i.test(t)){
      const p0=/(\d+\.?\d*)\s*(?:mm|torr|kpa|pa)/i.exec(t);
      const x=/mole fraction[^.]*?(\d+\.?\d*)/i.exec(t);
      if(p0&&x){return`Raoult's law: p = p°·X₁ = ${p0[1]}×${x[1]} = ${fmt(parseFloat(p0[1])*parseFloat(x[1]))} units.`;}
    }
    // Freezing point depression ΔTf = Kf·m·i
    if(/freezing point|depression in freezing|ΔTf|Kf/i.test(t)){
      const kf=/kf\s*[=]?\s*(\d+\.?\d*)/i.exec(t);
      const m=/molality\s*[=]?\s*(\d+\.?\d*)/i.exec(t);
      if(kf&&m){return`ΔTf = Kf·m = ${kf[1]}×${m[1]} = ${fmt(parseFloat(kf[1])*parseFloat(m[1]))} K; Tf = Tf° − ΔTf.`;}
    }
    // Nernst: E = E° - (0.059/n)log(Q) at 298K
    if(/nernst|cell potential|e\.?m\.?f\.?|calculate e/i.test(t) && /log/i.test(t)){
      const e0=/e[°o]?\s*[=]?\s*(\d+\.?\d*)\s*v/i.exec(t);
      const n=/n\s*[=]?\s*(\d)/i.exec(t);
      const logq=/log[^.]*?(\d+\.?\d*)/i.exec(t);
      if(e0&&n&&logq){const E=parseFloat(e0[1])-0.059/parseInt(n[1])*Math.log10(parseFloat(logq[1])); return`Nernst: E = E° − (0.059/n)logQ = ${fmt(E,3)} V.`;}
    }
    // 1st-order half life t½ = 0.693/k
    if(/half-?life|half life period.*first order/i.test(t)){
      const k=/rate constant[^.]*?(\d+\.?\d*(?:\s*[×x]\s*10\s*[–\-−]?\d+)?)\s*s/i.exec(t);
      if(k){const kv=parseFloat(k[1].replace(/[×x*]/g,'e').replace(/\s/g,''));
        return`First-order: t½ = 0.693/k = 0.693/${k[1]} = ${fmt(0.693/kv,2)} s.`;}
    }
    return null;
  }

  function enrich(q){
    if(q.subject!=='chemistry') return;
    if(q.ans && q.ans.length>3) return;
    const got=solve(q);
    if(got){q.ans=got; if(!q.approaches)q.approaches=[]; q.approaches.unshift({kind:'deterministic',title:'Compute directly',body:got});}
    if(!q.approaches||q.approaches.length<3){
      const a=q.approaches||[];
      if(a.length<1)a.push({kind:'identify',title:'Identify concept/reaction',body:'Which reaction type / physical law applies here? Recall the key formula or mechanism.'});
      if(a.length<2)a.push({kind:'logic',title:'Apply stoichiometry / mechanism',body:'Balance the equation; identify oxidation states or intermediates; plug in given values.'});
      if(a.length<3)a.push({kind:'verify',title:'Check units & reasonability',body:'Verify units (M, m, s, J, etc.); check that sign/direction/prediction makes physical sense.'});
      q.approaches=a;
    }
  }

  (UP.pyq||[]).forEach(enrich);
  const _push=Array.prototype.push;
  UP.pyq.push=function(){for(const q of arguments)if(q&&typeof q==='object'&&q.id){enrich(q);_push.call(this,q);}return this.length;};
})();
