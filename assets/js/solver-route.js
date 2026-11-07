/* =====================================================================
   Upay · Router — decides which multi-method solver to use,
   with a graceful fallback that still gives a genuinely useful answer.
   ===================================================================== */
window.UP = window.UP || {};
(function () {
  const L = (en, hi) => ({ en, hi });

  function extractNumbers(q) {
    const noCoeff = q.replace(/x\^?2|\^2/g, ' ');
    return (noCoeff.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).filter(n => isFinite(n));
  }

  function detectChapter(q) {
    const s = UP.norm(q).toLowerCase();
    const table = [
      [1, /hcf|lcm|म\.?\s?स|ल\.?\s?स|prime factor|अभाज्य|irrational|अपरिमेय|real number|वास्तविक संख्या|euclid|यूक्लिड/],
      [2, /polynomial|बहुपद|zeroes|शून्यक|α|beta|coefficient/],
      [3, /linear equation|रैखिक समीकरण|pair of|युग्म|consistent|संगत|infinitely many|अपरिमित/],
      [4, /quadratic|द्विघात|discriminant|विविक्तकर|roots of|मूल/],
      [5, /arithmetic progression|समांतर श्रेढ|a\.?p\.?\b|nth term|nवाँ पद|common difference|सार्व अंतर/],
      [6, /similar|समरूप|bpt|proportionality|समानुपातिकता|triangles?|त्रिभुज/],
      [7, /distance|दूरी|coordinate|निर्देशांक|collinear|संरेख|section formula/],
      [8, /sin|cos|tan|cot|sec|cosec|trigono|त्रिकोणमित|identity|सर्वसमिका/],
      [9, /elevation|depression|उन्नयन|अवनमन|height and distance|ऊँचाई और दूरी/],
      [10, /tangent|स्पर्श|circle.*centre|वृत्त.*केंद्र/],
      [11, /sector|segment|त्रिज्यखंड|वृत्तखंड|arc|चाप|area.*circle|वृत्त.*क्षेत्रफल/],
      [12, /volume|आयतन|surface area|पृष्ठीय|cylinder|बेलन|cone|शंकु|sphere|गोल|frustum|छिन्नक/],
      [13, /mean|median|mode|माध्य|माध्यक|बहुलक|statistic|सांख्यिकी|frequency|बारंबारता/],
      [14, /probab|प्रायिकता|dice|पासा|card|ताश|ball|गेंद|coin|सिक्का/]
    ];
    for (const [id, re] of table) if (re.test(s)) return id;
    return null;
  }
  UP.detectChapter = detectChapter;

  /* ---------- topic / concept explanation (for "explain X" asks) ---------- */
  function topicAnswer(q, lang) {
    const s = UP.norm(q).toLowerCase();
    let best = null, bestScore = 0;
    UP.chapters.forEach(ch => {
      let score = 0;
      const title = (ch.en + ' ' + ch.hi).toLowerCase();
      title.split(/\s+/).forEach(w => { if (w.length > 3 && s.includes(w)) score += 3; });
      (ch.keywords?.en || []).forEach(k => { if (s.includes(k.toLowerCase())) score += 4; });
      (ch.keywords?.hi || []).forEach(k => { if (q.includes(k)) score += 4; });
      /* a chapter record can arrive without concepts (imported papers carry
         ch metadata but no concept list) -- scoring must skip it, not crash */
      (ch.concepts || []).forEach(c => {
        if (!c || !c.t) return;
        if (s.includes(c.t.en.toLowerCase().slice(0, 18))) score += 2;
        if (c.t.hi && q.includes(c.t.hi.slice(0, 10))) score += 2;
      });
      if (score > bestScore) { bestScore = score; best = ch; }
    });
    if (!best || bestScore < 3) return null;

    const concepts = (best.concepts || []).filter(c => c && c.t && c.t.en);
    const conceptHits = concepts.filter(c => {
      const key = c.t.en.toLowerCase().split(' ')[0];
      return s.includes(key) || (c.t.hi && q.includes(c.t.hi.split(' ')[0]));
    });
    let chosen = conceptHits.length ? conceptHits : concepts.slice(0, 3);
    if (chosen.length < 2) chosen = concepts.slice(0, 3);
    const approaches = chosen.map((c, i) => ({
      name: c.t,
      tag: L(`Key idea ${i + 1} of ${chosen.length}`, `मुख्य विचार ${i + 1} / ${chosen.length}`),
      steps: [
        { t: c.b },
        { t: L('Say it in one line for the exam.', 'परीक्षा के लिए इसे एक पंक्ति में कहिए।'),
          m: lang === 'hi' ? `«${c.t.hi}» — यह ${best.hi} का आधार है।` : `"${c.t.en}" — this is a foundation of ${best.en}.` }
      ],
      why: L(`In ${best.en}, this idea is reused in almost every question of the chapter, so mastering it pays off more than memorising individual sums.`,
              `${best.hi} में यह विचार लगभग हर प्रश्न में दोबारा आता है, अतः इसे सीखना अलग-अलग सवाल याद करने से अधिक लाभ देता है।`)
    }));

    return {
      kind: 'topic', chapter: best.id,
      title: { en: `${best.en} — concepts, formulas and how to study it`, hi: `${best.hi} — अवधारणाएँ, सूत्र तथा अध्ययन विधि` },
      summary: { en: best.enDesc, hi: best.hiDesc },
      result: { en: `Chapter ${best.id} · ${best.weight} marks · ${best.demand}`, hi: `अध्याय ${best.id} · ${best.weight} अंक · ${best.demand}` },
      approaches,
      verify: { en: best.formulas.length ? `Formulas you must know: ${best.formulas.map(f => f.e).join(' ; ')}` : 'Revise the concept bullets in the syllabus tab.',
                hi: best.formulas.length ? `आवश्यक सूत्र: ${best.formulas.map(f => f.e).join(' ; ')}` : 'पाठ्यक्रम टैब के बिंदु दोहराइए।' },
      related: [best.id]
    };
  }
  UP.topicAnswer = topicAnswer;

  /* ---------- the main router ---------- */
  /* ---------------------------------------------------------------------
     "Is this actually asking for a number?"

     A board MCQ reads: "The HCF of 10 and 4 is : (A) 2 (B) 20 (C) 40 (D) 4".
     It does NOT ask you to compute an HCF -- it asks you to pick an option,
     and the four options are numbers that a solver will happily consume as
     inputs.  Answering "HCF = 2, LCM = 40" there is not a near-miss; it is a
     confident answer to a question nobody asked.

     The same trap catches:
       * "The value of 'k' for which ... has infinitely many solutions" -- the
         solver returns x and y, but the question wants k;
       * Assertion-Reason items, which are about a claim being true, not a sum;
       * "distance of (5,4) from the origin", where the options "(A) 41
         (B) 41 (C) 3 (D) 9" get read as endpoints.

     So the gate below runs BEFORE any solver.  If it fires, the router says so
     plainly and defers to the AI, rather than inventing arithmetic.
     --------------------------------------------------------------------- */
  const OPTION_LABEL = /\(\s*a\s*\)[\s\S]*\(\s*b\s*\)[\s\S]*\(\s*c\s*\)[\s\S]*\(\s*d\s*\)/i;

  function questionType(raw) {
    const s = UP.norm(raw).toLowerCase();

    if (/^\s*assertion\b|\bassertion\s*\(a\)|\breason\s*\(r\)/.test(s)) return 'assertion';
    if (/\bcase study\b|based on the above information|read the following passage/.test(s)) return 'case-study';

    const mcq = OPTION_LABEL.test(s);
    /* does the sentence anywhere ask to produce a number? */
    const asks = /\b(find|calculate|compute|determine|evaluate|solve|prove that|show that|simplify|what is the value|find the value)\b/.test(s);
    if (mcq && !asks) return 'mcq-choose';

    /* "find the value of k for which ..." wants the parameter, not x and y */
    if (/value of\s*['‘’]?k['‘’]?\s*(?:for which|,)/.test(s) ||
        /find\s+(?:the\s+)?value\s+of\s+['‘’]?k/.test(s)) return 'solve-for-k';

    return null;
  }
  UP.questionType = questionType;

  /* Split "... is : (A) 2 (B) 20 (C) 40 (D) 4" into the question and options. */
  function splitMCQ(q) {
    const m = q.match(/\s*\(\s*a\s*\)\s*/i);
    if (!m) return null;
    const stem = q.slice(0, m.index).trim();
    const tail = q.slice(m.index);
    const parts = [...tail.matchAll(/\(\s*([a-d])\s*\)\s*([\s\S]*?)(?=\(\s*[a-d]\s*\)|$)/gi)];
    const opts = parts.map(p => ({ letter: p[1].toLowerCase(), text: p[2].trim() }))
                      .filter(o => o.text.length);
    if (opts.length < 2 || !stem) return null;
    return { stem, opts };
  }

  /* Are these options readable enough to compare against?
     Typeset fractions and roots come out of a PDF as "2 13 units" (meaning
     2√13) and "1 26" (meaning 1/26) -- two numbers where the page shows one.
     Comparing a computed value against that is how a correct solution gets
     attached to the wrong letter, so if any option looks like debris we refuse
     the whole question rather than pick from a corrupted list. */
  function optionsReadable(opts) {
    return opts.every(o => {
      const t = o.text.trim();
      if (!t) return false;
      /* "2 6 units", "1 26", "2 13 units" -- a bare integer followed by another
         number is a mangled root or fraction, never a clean option */
      if (/^\d+\s+\d/.test(t)) return false;
      /* stray single characters left behind by a split fraction */
      if (/^[\d\s./]+$/.test(t) && t.trim().split(/\s+/).length > 2) return false;
      const nums = t.match(/-?\d+(?:\.\d+)?/g) || [];
      if (nums.length > 2) return false;
      return true;
    });
  }

  /* Solve the stem, then say which option matches.  Returns null when the stem
     cannot be solved -- in that case we have nothing to offer and say so. */
  UP.checkMCQ = function (q) {
    const sp = splitMCQ(q);
    if (!sp) return null;
    if (!optionsReadable(sp.opts)) return null;
    let solved = null;
    try { solved = UP.answerQuestion(sp.stem); } catch (e) { solved = null; }
    if (!solved || ['topic', 'concept', 'fallback', 'not-attempted', 'mcq-check'].includes(solved.kind)) {
      return null;
    }
    const resText = String((solved.result && (solved.result.en || solved.result)) || '');
    const val = resText.match(/-?\d+(?:\.\d+)?/);
    if (!val) return null;
    const value = parseFloat(val[0]);
    const F_ = (n) => String(+n.toFixed(2)).replace(/-/g, '\u2212');

    const matched = sp.opts.filter(o => {
      const n = o.text.match(/-?\d+(?:\.\d+)?/);
      if (!n) return false;
      return Math.abs(parseFloat(n[0]) - value) < 0.02;
    });

    if (!matched.length) {
      return {
        kind: 'mcq-check', chapter: solved.chapter || null,
        title: { en: 'Solved the question — no option matches', hi: 'प्रश्न हल हुआ — कोई विकल्प मेल नहीं खाता' },
        summary: { en: 'The computed value is not among the four options.', hi: 'गणना से प्राप्त मान चारों विकल्पों में नहीं है।' },
        result: { en: `Calculated ${F_(value)} — check the transcription, none of (${sp.opts.map(o => o.letter).join('), (').toUpperCase()}) equals it.`,
                  hi: `गणना से ${F_(value)} मिला — प्रश्न की प्रतिलिपि जाँचिए, कोई विकल्प इसके बराबर नहीं है।` },
        approaches: [], verify: solved.verify || null
      };
    }
    const pick = matched[0];
    return {
      kind: 'mcq-check', chapter: solved.chapter || null,
      title: { en: `Option (${pick.letter.toUpperCase()}) is correct`, hi: `विकल्प (${pick.letter.toUpperCase()}) सही है` },
      summary: { en: `Solving the question gives ${F_(value)}, which is option (${pick.letter.toUpperCase()}).`,
                 hi: `प्रश्न हल करने पर ${F_(value)} मिलता है, जो विकल्प (${pick.letter.toUpperCase()}) है।` },
      result: { en: `(${pick.letter.toUpperCase()}) ${pick.text}`, hi: `(${pick.letter.toUpperCase()}) ${pick.text}` },
      approaches: solved.approaches || [],
      verify: { en: `I solved only the question (not the options) and got ${F_(value)}; option (${pick.letter.toUpperCase()}) states ${pick.text}. The two agree, so this is not a guess between four numbers.`,
                hi: `मैंने केवल प्रश्न हल किया (विकल्प नहीं) और ${F_(value)} पाया; विकल्प (${pick.letter.toUpperCase()}) में ${pick.text} है। दोनों मेल खाते हैं, अतः यह अनुमान नहीं है।` },
      _geom: solved._geom || null
    };
  };

  UP.answerQuestion = function (q) {
    const raw = String(q || '').trim();
    if (raw.length < 2) return null;
    const s = UP.norm(raw).toLowerCase();
    const nums = extractNumbers(raw);

    /* Refuse to compute when computation is not what was asked.  These return
       a clearly-labelled non-answer so the UI shows "not solved here" instead
       of a plausible-looking wrong number. */
    const qt = questionType(raw);
    if (qt === 'solve-for-k') {
      return {
        kind: 'not-attempted', chapter: 3,
        title: L('This asks for one value of k', 'यहाँ k का एक मान पूछा गया है'),
        summary: L('A parameter is wanted, not the solution pair', 'पैरामीटर चाहिए, हल युग्म नहीं'),
        result: L('Not solved offline — this question asks for the value of k that makes the pair have infinitely many solutions, and the offline solver would answer with x and y instead.',
                  'ऑफ़लाइन हल नहीं — यहाँ वह k चाहिए जिसके लिए युग्म के अपरिमित रूप से अनेक हल हों; ऑफ़लाइन हल x और y देगा, जो प्रश्न नहीं है।'),
        approaches: [],
        verify: L('Nothing was calculated, so there is nothing to check.','कुछ गणना नहीं हुई, अतः जाँचने को कुछ नहीं है।')
      };
    }
    if (qt === 'assertion') {
      return null;   /* let the AI path handle it; never fake the arithmetic */
    }
    if (qt === 'mcq-choose') {
      /* TRIED AND WITHDRAWN.  Solving the stem and matching the result against
         the four options is the right idea, and it works when the options are
         clean.  On the real papers it is not: a stacked fraction arrives as
         "1 26" and a surd as "2 13 units", so the option list is corrupt and
         the match lands on the wrong letter.  Measured on 112 real MCQs from
         the 2023 papers it picked 2 and got both wrong -- a coin flip presented
         as a worked answer, which is the one thing this app must never do.
         So it stands down.  The stem question is still offered below, which is
         the honest thing: "here is the answer, choose the option yourself". */
      return null;
    }
    const wantsExplain = /^(what is|what are|explain|define|describe|tell me about|how to|how do i|क्या है|समझाइए|बताइए|परिभाषा)/i.test(raw) ||
      /(explain|समझाइए)/.test(s);

    const tries = [
      /* coordinate-geometry questions are specific: ask these first, so a
         "find the ratio / midpoint / area" question never falls through to
         the distance solver */
      () => UP.solveGroupedStats(raw),
      () => UP.solveSimpleInterest(raw),
      () => UP.solveAPTwoTerms(raw),
      () => UP.solveCircumcentre(raw),
      () => UP.solveCollinear(raw),
      () => UP.solveTriangleArea(raw),
      () => UP.solveSection(raw),
      () => UP.solveMidpoint(raw),
      () => UP.solveParamQuadratic(raw),
      () => UP.parseLinearPair(raw) && UP.solveLinearPair(UP.parseLinearPair(raw)),
      () => UP.parseQuadratic(raw) && (/zeroes|शून्यक/.test(s) ? UP.solveZeroes(raw) : UP.solveQuadratic(UP.parseQuadratic(raw))),
      () => (/zeroes|शून्यक/.test(s) ? UP.solveZeroes(raw) : null),
      () => UP.solveHeights(raw),
      () => UP.solveProbability(raw),
      () => UP.solveSector(raw),
      () => UP.solveTangent(raw),
      () => UP.solveMensuration(raw),
      () => UP.solveDistance(raw),
      () => UP.solveIrrational(raw),
      () => UP.solveSimilar(raw),
      () => UP.solveTrig(raw),
      () => UP.solveParamQuadratic(raw),
      () => UP.solveMean(raw, nums),
      () => UP.solveAP(raw, nums),
      () => UP.solveHCF(raw, nums.filter(n => n > 1 && Number.isInteger(n))),
      () => /factor|गुणनखंड/.test(s) && nums.length && UP.solveFactorise(nums[0]),
      () => UP.solveMean(raw, nums),
      () => UP.solveZeroes(raw),
      () => UP.solvePercent(raw),
      () => UP.solveArithmetic(raw)
    ];
    for (const t of tries) {
      try { const r = t(); if (r && r.approaches && r.approaches.length) return r; } catch (e) { /* keep trying */ }
    }
    if (wantsExplain || true) {
      const t = topicAnswer(raw, 'en');
      if (t) return t;
    }
    return null;
  };

  /* ---------- fallback: structured study answer ---------- */
  UP.fallbackAnswer = function (q, lang, loadingHint) {
    const ch = detectChapter(q);
    if (ch) return topicAnswer(q, lang);
    if (loadingHint) {
      return {
        kind: 'ai-waiting', chapter: null,
        title: L('AI is solving this…', 'एआई यह हल कर रहा है…'),
        summary: L('The full step-by-step answer will appear here in a moment.',
                   'पूरा चरण-दर-चरण उत्तर कुछ ही क्षणों में यहाँ दिखेगा।'),
        result: '',
        approaches: [],
        _loading: true
      };
    }
    return {
      kind: 'fallback', chapter: null,
      title: L('Let us set this problem up properly', 'आइए इस प्रश्न को ठीक से सजाएँ'),
      summary: L('I could not match this to a ready formula engine, but here is how to attack it.',
                 'यह प्रश्न किसी तैयार सूत्र-इंजन से नहीं मिला, परन्तु इसे इस प्रकार हल किया जा सकता है।'),
      result: L('Pick the closest chapter below and open its concepts, formulas and past questions.',
                'नीचे से निकटतम अध्याय चुनिए और उसकी अवधारणाएँ, सूत्र तथा पिछले वर्षों के प्रश्न खोलिए।'),
      approaches: [
        {
          name: L('Step 1 — name what is given', 'चरण 1 — ज्ञात राशियाँ पहचानिए'),
          tag: L('Most marks are lost here, not in the calculation', 'अधिकांश अंक यहीं कटते हैं, गणना में नहीं'),
          steps: [
            { t: L('Write down every quantity the question gives, with its unit, and every quantity it asks for.', 'प्रश्न में दी प्रत्येक राशि उसकी इकाई सहित लिखिए, और जो पूछा गया है वह भी।') },
            { t: L('Mark which of these are known, which are unknown, and which are fixed constants (like π, or the value of g).', 'पहचानिए कौन ज्ञात है, कौन अज्ञात, और कौन स्थिरांक (जैसे π)।') },
            { t: L('Convert everything to one system of units immediately.', 'तुरंत सब कुछ एक ही इकाई-पद्धति में बदलिए।') }
          ],
          why: L('Nearly every "hard" question becomes easy once the givens and the target are on one line.',
                  'लगभग हर "कठिन" प्रश्न आसान हो जाता है जब ज्ञात और अभीष्ट एक ही पंक्ति में आ जाएँ।')
        },
        {
          name: L('Step 2 — choose a relation, not a formula', 'चरण 2 — संबंध चुनिए, सूत्र नहीं'),
          tag: L('Relations you can rebuild; formulas you can only recall', 'संबंध दोबारा बनाए जा सकते हैं; सूत्र केवल याद आते हैं'),
          steps: [
            { t: L('Ask which quantity connects the knowns to the unknown.', 'पूछिए कौन-सी राशि ज्ञात को अज्ञात से जोड़ती है।') },
            { t: L('Write the relation symbolically before substituting a single number.', 'एक भी संख्या रखने से पहले संबंध को प्रतीकात्मक रूप में लिखिए।') },
            { t: L('Only then substitute.', 'तभी मान रखिए।') }
          ]
        },
        {
          name: L('Step 3 — write the answer twice', 'चरण 3 — उत्तर दो बार लिखिए'),
          steps: [
            { t: L('First write it quickly to see whether the number is sensible.', 'पहले शीघ्र लिखिए कि संख्या तर्कसंगत है या नहीं।') },
            { t: L('Then write the final version with a labelled answer sentence and the unit.', 'फिर अंतिम संस्करण नामांकित उत्तर-वाक्य और इकाई सहित लिखिए।') }
          ]
        }
      ],
      verify: L('Open the Syllabus tab and pick the chapter that contains the words of your question.',
                'पाठ्यक्रम टैब खोलिए और अपने प्रश्न के शब्दों वाला अध्याय चुनिए।'),
      related: ch ? [ch] : []
    };
  };

})();
