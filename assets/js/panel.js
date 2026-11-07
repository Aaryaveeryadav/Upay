/* ============================================================
   Upay — the panel
   How a question would be answered by different assistant styles.
   Everything here is generated locally from the same numbers the
   solvers already computed, so the comparison is honest: the maths
   is identical, only the presentation and the priorities differ.
   ============================================================ */
window.UP = window.UP || {};

UP.panel = (function () {
  const L = (en, hi) => ({ en, hi });

  /* the four assistant "voices" — named after their behaviour, not a product */
  const STYLES = [
    {
      id: 'methodical',
      name: { en: 'Methodical tutor', hi: 'व्यवस्थित शिक्षक' },
      model: { en: 'Behaves like ChatGPT in study mode', hi: 'ChatGPT के अध्ययन-मोड जैसा' },
      colour: 'sky',
      best: { en: 'learning a method for the first time', hi: 'पहली बार कोई विधि सीखने के लिए' },
      shape: 'linear'
    },
    {
      id: 'concise',
      name: { en: 'Exam formalist', hi: 'परीक्षा-केंद्रित' },
      model: { en: 'Behaves like Gemini answering a past paper', hi: 'Gemini द्वारा बोर्ड प्रश्नपत्र जैसा' },
      colour: 'cream',
      best: { en: 'writing the answer inside the time limit', hi: 'समय-सीमा में उत्तर लिखने के लिए' },
      shape: 'linear'
    },
    {
      id: 'visual',
      name: { en: 'Visual explainer', hi: 'चित्र-आधारित व्याख्याकार' },
      model: { en: 'Behaves like an assistant that draws first', hi: 'पहले चित्र बनाने वाले सहायक जैसा' },
      colour: 'green',
      best: { en: 'understanding *why* before *how*', hi: 'कैसे से पहले क्यों समझने के लिए' },
      shape: 'visual'
    },
    {
      id: 'checker',
      name: { en: 'Skeptical checker', hi: 'संदेहवादी जाँचकर्ता' },
      model: { en: 'Behaves like an agent that verifies its own work', hi: 'अपने काम की स्वयं जाँच करने वाले एजेंट जैसा' },
      colour: 'violet',
      best: { en: 'catching a sign error before it costs marks', hi: 'अंक जाने से पहले चिह्न-भूल पकड़ने के लिए' },
      shape: 'linear'
    }
  ];

  /* ---------- helpers ---------- */
  const stepsOf = (a) => (a.steps || []).filter((s) => s && s.t);
  const en = (x) => (x == null ? '' : (typeof x === 'string' ? x : x.en || ''));

  /* ---------- four answer shapes, built from the same solved object ---------- */
  function build(ans) {
    const A = ans.approaches || [];
    const first = A[0] || { steps: [], name: L('', '') };
    const steps = stepsOf(first);
    const result = en(ans.result);
    const summary = en(ans.summary);
    const verify = en(ans.verify);
    const title = en(ans.title);

    /* 1. Methodical tutor — the full walkthrough of the first method */
    const methodical = {
      verdict: L(
        `Explains ${steps.length} steps with the reasoning attached. Slowest to read, but you could reproduce it in an exam without the app.`,
        `${steps.length} चरण कारण सहित समझाता है। पढ़ने में धीमा, पर इसे देखकर आप परीक्षा में दोबारा लिख सकते हैं।`),
      body: steps.map((s, i) => ({
        kind: 'step',
        text: `${i + 1}. ${en(s.t)}`,
        math: s.m || ''
      })),
      tail: L(`Why this works: ${en(first.why) || '—'}`, `यह क्यों चलता है: ${first.why ? first.why.hi || '' : '—'}`)
    };

    /* 2. Exam formalist — the minimum a marking scheme wants */
    const maths = steps.filter((s) => s.m).map((s) => s.m.split('\n')[0]);
    const concise = {
      verdict: L(
        'Given, formula, substitution, answer — nothing padded. This is what earns full marks fastest.',
        'दिया है, सूत्र, प्रतिस्थापन, उत्तर — कोई अतिरिक्त शब्द नहीं। यही सबसे तेज़ी से पूरे अंक दिलाता है।'),
      body: [
        { kind: 'line', text: 'Given: ' + (summary || '—') },
        { kind: 'math', text: maths.slice(0, 3).join('  →  ') || '—' },
        { kind: 'line', text: 'Therefore: ' + (result || '—') }
      ],
      tail: L('Verification line (optional but free marks): ' + (verify || '—'), 'जाँच पंक्ति (वैकल्पिक पर अंक दिलाती है): ' + (verify || '—'))
    };

    /* 3. Visual explainer — the figure first, then a one-line reading of it */
    const fig = UP.figures && UP.figures.figure(ans);
    const visual = {
      verdict: L(
        'Leads with the picture. Easiest to remember a week later; weakest when a proof needs words.',
        'पहले चित्र दिखाता है। सप्ताह बाद याद रहना सबसे आसान; पर जहाँ प्रमाण में शब्द चाहिए वहाँ कमज़ोर।'),
      body: [
        { kind: 'figure' },
        { kind: 'line', text: fig ? en(fig.caption) : L('', '') },
        { kind: 'line', text: 'Answer read off the figure: ' + (result || '—') }
      ],
      tail: L('', '')
    };

    /* 4. Skeptical checker — attacks the answer instead of presenting it */
    const checks = [
      L(`Substitute everything back: ${verify || 'put the answer into the original statement.'}`,
        `सब वापस रखिए: ${ans.verify ? ans.verify.hi || '' : 'उत्तर को मूल कथन में रखिए।'}`),
      L(`Does the order of magnitude make sense? ${en(first.watch) || 'Check units and signs.'}`,
        `परिमाण का क्रम उचित है? ${first.watch ? first.watch.hi || '' : 'इकाइयाँ और चिह्न जाँचिए।'}`),
      L(`Is there a second route that agrees? ${A.length > 1 ? `Yes — ${A.length - 1} other method(s) in this app give the same value.` : 'Only one route was available.'}`,
        `कोई दूसरा मार्ग भी वही उत्तर देता है? ${A.length > 1 ? `हाँ — इस ऐप की ${A.length - 1} अन्य विधियाँ वही मान देती हैं।` : 'केवल एक मार्ग उपलब्ध था।'}`)
    ];
    const checker = {
      verdict: L(
        'Never states the answer confidently until it has been re-derived. Best at spotting sign slips, worst to read if you just want the result.',
        'जब तक उत्तर दोबारा न निकले, उसे आत्मविश्वास से नहीं कहता। चिह्न-भूल पकड़ने में सर्वश्रेष्ठ, पर केवल उत्तर चाहिए तो पढ़ना कठिन।'),
      body: checks.map((c) => ({ kind: 'line', text: en(c) })),
      tail: L(`Only after all three checks: **${result}**`, `तीनों जाँच के बाद ही: **${result}**`)
    };

    const bodies = { methodical, concise, visual, checker };

    /* ---------- which one is best, and why ---------- */
    const byKind = {
      'linear-pair': { id: 'methodical', why: L('A method that carries you from two equations to a point is worth more than a result you cannot redo.', 'दो समीकरणों से बिंदु तक ले जाने वाली विधि उस उत्तर से अधिक मूल्यवान है जिसे दोबारा न कर सकें।') },
      'quadratic': { id: 'methodical', why: L('Four approaches cover every quadratic, so the walkthrough transfers to the exam.', 'चारों विधियाँ हर द्विघात पर लागू होती हैं, अतः यह व्याख्या परीक्षा में काम आती है।') },
      'ap': { id: 'methodical', why: L('Off-by-one on n − 1 is the classic mistake; step-by-step is the defence.', 'n − 1 में एक की गलती सबसे सामान्य भूल है; चरणबद्ध व्याख्या ही बचाव है।') },
      'heights': { id: 'visual', why: L('The angle sits between the eye, the horizontal and the tower — a figure prevents the wrong ratio.', 'कोण आँख, क्षैतिज और मीनार के बीच है — चित्र गलत अनुपात से बचाता है।') },
      'trig-ratios': { id: 'visual', why: L('A single triangle gives all three ratios; the picture is faster than memorising.', 'एक ही त्रिभुज तीनों अनुपात दे देता है; चित्र रटने से तेज़ है।') },
      'trig-evaluate': { id: 'methodical', why: L('Signs and squares of standard angles are where marks are lost; the table walkthrough catches both.', 'मानक कोणों के चिह्न और वर्ग ही अंक डुबोते हैं; तालिका-वाली व्याख्या दोनों पकड़ती है।') },
      'trig-identity': { id: 'methodical', why: L('Identity proofs need one line after another, not a picture.', 'सर्वसमिका-प्रमाण में एक के बाद एक पंक्ति चाहिए, चित्र नहीं।') },
      'sector': { id: 'visual', why: L('Seeing that the sector is a fraction of the circle makes θ/360 obvious instead of memorised.', 'यह देखना कि त्रिज्यखंड वृत्त का एक भाग है, θ/360 को रटने की चीज़ नहीं बना देता।') },
      'mensuration': { id: 'visual', why: L('Radius-height mix-ups cause most errors; the labelled solid kills them.', 'त्रिज्या-ऊँचाई की उलझन से सबसे अधिक भूलें होती हैं; अंकित ठोस उन्हें समाप्त करता है।') },
      'prob-dice': { id: 'visual', why: L('The 36-cell table proves the count instead of asserting it.', '36 कोष्ठकों की तालिका गिनती को कहने के बजाय सिद्ध करती है।') },
      'probability': { id: 'concise', why: L('Probability answers are short; padding them does not add marks.', 'प्रायिकता के उत्तर छोटे होते हैं; लंबा करने से अंक नहीं बढ़ते।') },
      'distance': { id: 'visual', why: L('The right triangle makes the sign of each difference harmless — the commonest error disappears.', 'समकोण त्रिभुज प्रत्येक अंतर के चिह्न को हानिरहित बना देता है — सबसे सामान्य भूल समाप्त हो जाती है।') },
      'area-ratio': { id: 'visual', why: L('Area ratio = (side ratio)² is remembered by looking, not by reciting.', 'क्षेत्रफल अनुपात = (भुजा अनुपात)² देखकर याद रहता है, रटने से नहीं।') },
      'bpt': { id: 'methodical', why: L('Examiners want the proportion written line by line.', 'परीक्षक अनुपात को पंक्ति-दर-पंक्ति लिखा देखना चाहते हैं।') },
      'tangent': { id: 'visual', why: L('The right angle at the point of contact is the whole question — once seen, t² = d² − r² is obvious.', 'स्पर्श बिंदु पर समकोण ही पूरा प्रश्न है — एक बार दिख जाए तो t² = d² − r² स्वयं स्पष्ट है।') },
      'hcf-lcm': { id: 'methodical', why: L('Prime factorisation must be shown, not guessed; the steps are the answer.', 'अभाज्य गुणनखंडन दिखाना पड़ता है, अनुमान नहीं लगाना; चरण ही उत्तर हैं।') },
      'factorise': { id: 'visual', why: L('The factor tree shows completeness — no prime is left behind.', 'गुणनखंड वृक्ष पूर्णता दिखाता है — कोई अभाज्य छूटता नहीं।') },
      'irrational': { id: 'checker', why: L('This is a proof by contradiction: the value of a skeptical, line-by-line verification.', 'यह विरोधाभास द्वारा प्रमाण है: संदेहपूर्ण, पंक्ति-दर-पंक्ति जाँच ही इसका मूल्य है।') },
      'mean': { id: 'concise', why: L('A mean is one division; the table adds nothing to the answer.', 'माध्य एक भाग है; तालिका उत्तर में कुछ नहीं जोड़ती।') },
      'zeroes': { id: 'visual', why: L('Zeroes are where the curve cuts the axis — the graph makes the definition concrete.', 'शून्यक वहीं हैं जहाँ वक्र अक्ष को काटता है — ग्राफ परिभाषा को ठोस बनाता है।') }
    };
    let winner = 'methodical', why = L('No single style wins everywhere; the walkthrough is the safest default.', 'हर जगह कोई एक शैली नहीं जीतती; चरणबद्ध व्याख्या सबसे सुरक्षित है।');
    if (byKind[ans.kind]) { winner = byKind[ans.kind].id; why = byKind[ans.kind].why; }

    /* a fallback: if the winning style has nothing to show, hand it to the tutor */
    if (winner === 'visual' && !fig) { winner = 'methodical'; why = L('A figure was not available for this one, so the walkthrough is the better answer.', 'इस प्रश्न के लिए चित्र उपलब्ध नहीं है, अतः चरणबद्ध व्याख्या बेहतर उत्तर है।'); }

    return {
      styles: STYLES.map((st) => Object.assign({}, st, bodies[st.id])),
      winner,
      why,
      scores: score(ans, fig)
    };
  }

  /* ---------- a transparent rubric, not a mysterious number ---------- */
  function score(ans, fig) {
    const A = ans.approaches || [];
    const hasMath = A.some((a) => stepsOf(a).some((s) => s.m));
    const hasWhy = A.some((a) => a.why);
    const hasWatch = A.some((a) => a.watch);
    const rows = [
      { k: L('Method count', 'विधियों की संख्या'), v: Math.min(4, A.length), max: 4 },
      { k: L('Shows the working', 'कार्य दिखता है'), v: hasMath ? 1 : 0, max: 1 },
      { k: L('Explains why it works', 'क्यों चलता है बताता है'), v: hasWhy ? 1 : 0, max: 1 },
      { k: L('Warns about the trap', 'जाल से सावधान करता है'), v: hasWatch ? 1 : 0, max: 1 },
      { k: L('Has a figure', 'चित्र उपलब्ध है'), v: fig ? 1 : 0, max: 1 },
      { k: L('Shows how to verify', 'जाँच का तरीका'), v: ans.verify ? 1 : 0, max: 1 }
    ];
    const got = rows.reduce((n, r) => n + r.v, 0);
    const total = rows.reduce((n, r) => n + r.max, 0);
    return { rows, got, total, pct: Math.round((got / total) * 100) };
  }

  return { build, STYLES };
})();
