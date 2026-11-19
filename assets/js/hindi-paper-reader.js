/* Source archive only. Never fold OCR or unconfirmed mark labels into a graded bank. */
(() => {
  const url = '/assets/papers/hindi-core/questions.json';
  let pending;
  function archive() {
    if (!pending) pending = fetch(url).then(r => {
      if (!r.ok) throw Error('Paper archive unavailable');
      return r.json();
    }).catch(e => { pending = null; throw e; });
    return pending;
  }
  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function link(label, href, cls='link') {
    const a = el('a',label,cls); a.href=href; return a;
  }
  const target=(p,n=1)=>`#/pyq?paper=${encodeURIComponent(p.id)}&number=${n}`;
  function source(p,page=1) {
    const a=link(`मूल PDF · पृष्ठ ${page} ↗`,p.pdf+'#page='+page,'btn btn-ghost btn-sm');
    a.target='_blank';a.rel='noopener';return a;
  }
  class HindiPaperReader extends HTMLElement {
    async connectedCallback() {
      this.textContent='प्रश्नपत्र लोड हो रहे हैं…';
      try {
        const {papers}=await archive();
        if(!this.isConnected) return;
        this.replaceChildren();
        const id=this.getAttribute('paper'), p=papers.find(row=>row.id===id);
        this.append(el('h2','हिंदी आधार · दिए गए प्रश्नपत्र'));
        const download=link('सभी प्रश्नपत्रों का डेटा (JSON)',url,'btn btn-cream btn-sm');
        download.download='hindi-core-test-papers.json';this.append(download);
        this.append(el('p','मशीन से निकाली गई प्रतिलिपि की समीक्षा शेष है। विकल्प, मात्राएँ और अंक मूल PDF से मिलाएँ। आधिकारिक उत्तर-कुंजी उपलब्ध नहीं है।','callout warn'));
        if(!id) { this.showList(papers); return; }
        this.append(link('← सभी प्रश्नपत्र','#/pyq'));
        if(!p){this.append(el('p','यह प्रश्नपत्र इस पाठ्यक्रम में नहीं है।'));return;}
        const q=p.questions.find(row=>row.number===Number(this.getAttribute('number')||1));
        this.append(el('h3',`${p.code} · ${p.series} · सेट ${p.set}`));
        const nav=el('nav');nav.setAttribute('aria-label','प्रश्न चुनें');
        for(const row of p.questions){const a=link(String(row.number),target(p,row.number),'btn btn-ghost btn-sm');a.setAttribute('aria-label',`प्रश्न ${row.number}`);if(q===row)a.setAttribute('aria-current','page');nav.append(a,' ');}
        this.append(nav);
        if(!q){this.append(el('p','यह प्रश्न क्रमांक नहीं मिला।'));return;}
        this.append(el('h3',`प्रश्न ${q.number}${q.printedMarks ? " · अंक: "+q.printedMarks : ""}`));
        for(const part of q.parts){const section=el('section');const text=el('p',part.text);text.style.whiteSpace='pre-wrap';text.style.overflowWrap='anywhere';section.append(source(p,part.page),text);this.append(section);}
      }catch(_){if(this.isConnected){this.replaceChildren(el('p','प्रश्नपत्र लोड नहीं हो सके।'));const retry=el('button','फिर प्रयास करें','btn');retry.onclick=()=>this.connectedCallback();this.append(retry);}}
    }
    showList(papers){
      const input=el('input');input.type='search';input.placeholder='प्रश्नपत्र कोड या प्रश्न के शब्द';
      const label=el('label','प्रश्नपत्रों में खोजें ');label.append(input);this.append(label);
      const box=el('section',null,'grid grid-2');this.append(box);
      const update=()=>{
        box.replaceChildren();const term=input.value.trim().toLocaleLowerCase();
        for(const p of papers){
          const all=!term || [p.code,p.id,p.series].some(v=>v.toLowerCase().includes(term));
          const matches=all?[]:p.questions.filter(q=>q.parts.some(s=>s.text.replace(/\s+/g,' ').toLowerCase().includes(term)));
          if(!all&&!matches.length)continue;
          const card=el('article',null,'card');card.style.padding='1rem';card.append(link(`${p.code} · ${p.series}`,target(p)),el('p',`सेट ${p.set} · ${p.questions.length} प्रश्न · ${p.maxMarks} अंक · ${p.durationMinutes} मिनट`),source(p));
          for(const q of matches)card.append(' ',link(`प्रश्न ${q.number}`,target(p,q.number)));
          box.append(card);
        }
        if(!box.childElementCount)box.append(el('p','कोई मेल नहीं मिला।'));
      };
      input.addEventListener('input',update);update();
    }
  }
  if(!customElements.get('hindi-paper-reader'))customElements.define('hindi-paper-reader',HindiPaperReader);
})();
