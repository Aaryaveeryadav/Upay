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
  // Expand maths glyphs only in the spoken copy, never on screen or clipboard.
  function mathSpeech(value, lang) {
    const hi = String(lang || '').toLowerCase().startsWith('hi');
    const word = (en, hindi) => hi ? hindi : en;
    const supDigits = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-'};
    const subDigits = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₐ':'a','ₑ':'e','ₕ':'h','ᵢ':'i','ⱼ':'j','ₖ':'k','ₗ':'l','ₘ':'m','ₙ':'n','ₒ':'o','ₚ':'p','ᵣ':'r','ₛ':'s','ₜ':'t','ᵤ':'u','ᵥ':'v','ₓ':'x'};
    let s = String(value == null ? '' : value);
    /* Plain-Unicode maths is what the answer card shows, but raw TeX can still
       reach the reader (a stored older answer, a pasted question). Flatten it
       first, otherwise the voice says "h backslash nu" and "subscript open
       brace max close brace" instead of the formula. */
    if (root.UP && root.UP.answerFormat && typeof root.UP.answerFormat.text === 'function') {
      try { s = root.UP.answerFormat.text(s); } catch (_) { /* fall back to the raw text */ }
    }
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, run => {
      const exp = Array.from(run, c => supDigits[c]).join('');
      if (exp === '2') return ' ' + word('squared', 'का वर्ग') + ' ';
      if (exp === '3') return ' ' + word('cubed', 'का घन') + ' ';
      return ' ' + word('to the power', 'की घात') + ' ' + exp.replace('-', word('minus ', 'ऋण ')).replace('+', word('plus ', 'धन ')) + ' ';
    });
    /* Unicode sub/superscripts are what the answer card shows and what a
       speech engine pronounces correctly ("K sub m a x" is read as a subscript
       by en-IN and hi-IN voices), so only the TeX brace form is spelled out. */
    s = s.replace(/_\{([^{}]+)\}/g, (_, v) => ' ' + word('subscript', 'सबस्क्रिप्ट') + ' ' + v + ' ');
    const symbols = {
      '√':word('square root of','वर्गमूल'), '∛':word('cube root of','घनमूल'),
      '÷':word('divided by','भाग'), '/':word('divided by','भाग'),
      '×':word('times','गुणा'), '∗':word('times','गुणा'), '*':word('times','गुणा'), '·':word('times','गुणा'), '•':word('times','गुणा'),
      '+':word('plus','जोड़'), '−':word('minus','ऋण'), '±':word('plus or minus','धन या ऋण'),
      '≠':word('is not equal to','बराबर नहीं है'), '=':word('equals','बराबर'),
      '≤':word('is less than or equal to','से कम या बराबर'), '≥':word('is greater than or equal to','से अधिक या बराबर'),
      '<':word('is less than','से कम'), '>':word('is greater than','से अधिक'), '≈':word('is approximately equal to','लगभग बराबर'),
      '⇒':word('implies','से निष्कर्ष'), '→':word('tends to','की ओर'), '∈':word('belongs to','का अवयव है'),
      'ℚ':word('the rational numbers','परिमेय संख्याएँ'), 'ℝ':word('the real numbers','वास्तविक संख्याएँ'),
      '^':word('to the power of','की घात'), '_':word('subscript','सबस्क्रिप्ट'),
      '∞':word('infinity','अनंत'), 'π':word('pi','पाई'), '°':word('degrees','डिग्री'),
      '(':word('open bracket','कोष्ठक खोलें'), ')':word('close bracket','कोष्ठक बंद करें'),
      '[':word('open square bracket','वर्ग कोष्ठक खोलें'), ']':word('close square bracket','वर्ग कोष्ठक बंद करें'),
      '{':word('open brace','ब्रेस खोलें'), '}':word('close brace','ब्रेस बंद करें'), '|':word('vertical bar','खड़ी रेखा')
    };
    s = s.replace(/[√∛÷/×∗*·•+−±≠=≤≥<>≈⇒→∈ℚℝ∞π°()[\]{}|^_]/g, c => ' ' + symbols[c] + ' ');
    // Preserve hyphens in ordinary words; speak spaced operators and negative numbers.
    s = s.replace(/(\d)-(\d)/g, '$1 ' + word('minus','ऋण') + ' $2')
      .replace(/\s+-\s+/g, ' ' + word('minus','ऋण') + ' ')
      .replace(/(^|[\s(])-([0-9])/g, (_, before, n) => before + word('minus','ऋण') + ' ' + n);
    return s.replace(/[ \t]+/g, ' ').trim();
  }
  const api={select,mathSpeech};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.UP=root.UP||{};root.UP.teacherVoice=api;}
})(typeof window==='undefined'?globalThis:window);
