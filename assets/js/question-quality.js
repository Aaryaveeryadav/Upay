/* Shared, conservative quality gates for imported and chapter-exercise text.
   Source wording is never reconstructed here: clearly damaged records are held
   back, and an explicitly labelled extracurricular tail can be separated from
   a preceding, intact exercise. */
(function (root) {
  'use strict';

  const ACTIVITY = /पाठेतर\s*सक्रियता|परियोजना\s*कार्य|योग्यता\s*विस्तार|बड़ों\s*से\s*बातचीत|(?:कहानी|पुस्तक).{0,16}(?:ढूँढ़|ढूंढ|खोज).{0,16}पढ़िए|(?:फ़िल्म|फिल्म).{0,24}देखिए|अलबम\s+तैयार\s+करें|सूची\s+तैयार\s+कर(?:ें|िए)|\bextra[- ]curricular\s+activity\b|\bproject\s+work\b|\binterview\s+(?:an?\s+)?(?:adult|elder|parent)\b|\bwatch\s+the\s+film\b/i;
  const PAPER_CUES = [
    /इस\s*प्रश्न\s*पत्र\s*को\s*पढ़ने\s*के\s*लिए/i,
    /प्रश्न\s*पत्र\s*का\s*वितरण/i,
    /केवल\s*प्रश्न\s*पत्र\s*को\s*पढ़ेंगे/i,
    /उत्तर\s*पुस्तिका/i,
    /सामान्य\s*निर्देश/i,
    /निर्धारित\s*समय.{0,35}(?:अंक|प्रश्न)/i,
    /इस\s*प्रश्न\s*पत्र\s*में\s*कुल/i,
    /इस\s*अवधि\s*के\s*दौरान.{0,45}(?:उत्तर|लिख)/i,
    /\breading\s+time\b/i,
    /\bquestion\s+paper\b.{0,80}\b(?:read|distribution|contains|instructions)\b/i,
    /\bgeneral\s+instructions\b/i,
    /\banswer\s+book(?:let)?\b/i,
    /\bdo\s+not\s+write\b.{0,60}\b(?:answer|answer\s+book|booklet)\b/i,
    /\ball\s+questions\s+are\s+compulsory\b/i,
    /\btime\s+allowed\b/i,
  ];
  const CONTROL_OR_PRIVATE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ue000-\uf8ff]/;
  const HINDI_OCR_MARKS = /[#@$]|(?:॥\s*){5,}|^\s*\*\s*\*/;

  function asText(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return String(value.text || value.en || value.hi || value.value || '');
    return '';
  }

  function textOf(q) {
    if (!q || typeof q !== 'object') return String(q == null ? '' : q);
    return [q.sa, q.hi, q.en].filter(Boolean).map(asText).join('\n');
  }

  function hasUnbalancedSquareBrackets(text) {
    let depth = 0;
    for (const char of String(text || '')) {
      if (char === '[') depth += 1;
      else if (char === ']') {
        if (depth === 0) return true;
        depth -= 1;
      }
    }
    return depth !== 0;
  }

  function taskSignal(text) {
    const hindiTask = /(?:^|[^\p{L}\p{M}])(?:लिखिए|लिखें|बताइए|बताएँ|कीजिए|करिए|समझाइए|समझाएँ|वर्णन|स्पष्ट|सिद्ध|ज्ञात|छाँटिए|दीजिए|चर्चा|व्यक्त|तैयार|कौन|क्यों|कैसे|क्या)(?=$|[^\p{L}\p{M}])/u;
    const englishTask = /\b(?:explain|describe|write|state|find|calculate|discuss|identify|which|what|why|how|name|mention|give|compare|justify|select|choose|complete|answer|attempt|read|fill|draw|label|match|translate|construct|summari[sz]e|analyse|analyze)\b/i;
    return /[?？]/.test(text) || hindiTask.test(text) || englishTask.test(text);
  }

  /* Return the untouched pre-activity question when the source explicitly
     labels a following activity. If the prefix is only stray OCR, callers must
     withhold the whole record rather than try to complete it. */
  function activityTail(value) {
    const text = String(value == null ? '' : value);
    const match = ACTIVITY.exec(text);
    if (!match) return null;
    const prefix = text.slice(0, match.index).trim();
    const visible = prefix.replace(/[\s\p{P}\p{S}]+/gu, '');
    if (visible.length < 18 || !taskSignal(prefix)) {
      return { drop: true, reason: 'activity-only', text: '' };
    }
    return { drop: false, reason: 'activity-tail', text: prefix };
  }

  function cleanActivityTail(value) {
    const text = String(value == null ? '' : value);
    const tail = activityTail(text);
    if (!tail) return text;
    return tail.drop ? '' : tail.text;
  }

  function isGenericUncontextualized(text) {
    const clean = String(text || '').normalize('NFKC').trim()
      .replace(/^[\s\d०-९१२३४५६७८९०()[\].,:;–—-]+/, '')
      .replace(/[?？!।॥\s]+$/g, '')
      .replace(/\s+/g, ' ');
    return /^(?:अपनी\s+राय\s+व्यक्त\s+कीजिए|अपनी\s+राय\s+(?:लिखिए|दीजिए|बताइए)|अपने\s+विचार\s+(?:व्यक्त\s+कीजिए|लिखिए|दीजिए|बताइए))$/i.test(clean)
      || /^express\s+your\s+(?:opinion|views)$/i.test(clean)
      || /^give\s+your\s+opinion$/i.test(clean);
  }

  /* A match-the-column MCQ appears in the source as "stem — (a) option …". The
     extractor sometimes started a fresh record at the option list, leaving a
     row whose whole text is two options glued together with no question and no
     options array: "Communist Party of India (Marxist) C. United Progressive
     Alliance". No task, a bare `A.`/`B.`/`C.`/`D.` inside the text and nothing
     to answer — that is not a question, and asking an AI to mark an answer to
     it only wastes the student's turn. */
  /* A record whose stem is nothing but option text, and so carries no task the
     student could attempt: one option lifted out of a multiple-choice question
     ("Communist Party of India (Marxist) C. United Progressive Alliance"), or a
     run of options whose question line was lost to the import.
     The discriminator is whether a question stem comes *before* the first option
     marker, not whether a marker exists at all. Real papers number their parts
     the same way options are lettered — "Assertion (A) : …", "… is : (a) 12 (b)
     120 (C) 1200 (D) 40" — and an earlier version of this rule treated any
     inline "(b)" as proof of a fragment, which would have withheld 460 genuine
     Maths questions. A stem ends in a question cue (a colon, a question mark, a
     copula, "the following") or contains a task verb; option text does not. */
  const ASSERTION_REASON = /\bassertion\b|\breason\s*\(\s*r\s*\)|\bstatement\s*(?:-|\u2014)?\s*i\b/i;
  const TASK_VERB = /\b(?:prove|verify|find|calculate|compute|solve|evaluate|simplify|explain|describe|define|state|write|name|give|list|draw|show|derive|determine|construct|compare|distinguish|justify|comment|identify|mention|suggest|convert|represent|rationalise|rationalize|factorise|factorize|form|label|fill|match|correct|choose|select|tick|pick)\b/i;
  /* Locate the first option marker and take everything before it as the stem.
     The label's own words must NOT be consumed: "In an A.P., if d = -4 … is
     equal to 1 7 (A) 6 (B) 7" has a genuine stem in front of the marker, and
     swallowing "A.P." into the marker made the stem read "In an" — which then
     looked like an option fragment. */
  /* A letter in brackets — "(A) 6" — or a letter with a full stop — "C. United
     Progressive Alliance". NOT a capital followed by an open bracket, which is
     ordinary notation: "B(adj B)", "A(adj A)". */
  const OPTION_MARKER = /(?:(?<=\s)|^)(?:\([a-dA-D]\)|[A-Da-d]\.)(?=\s)/g;
  function firstOptionIndex(t) {
    const re = new RegExp(OPTION_MARKER.source, 'g');
    let m;
    while ((m = re.exec(t))) {
      /* Skip a bare enumerated part "(a) Prove …" only when it opens the text;
         anywhere else a letter in brackets is an option. */
      if (m.index === 0 && /^\s*(?:\([a-dA-D]\)|[a-dA-D][.)])\s/.test(t) && !/\b(?:which|choose|select|correct|of the following)\b/i.test(t)) {
        // an opening sub-part label — treat the rest as the stem
        continue;
      }
      return m.index;
    }
    return -1;
  }
  function isOptionFragment(text, q) {
    const t = String(text || '').normalize('NFKC').trim();
    if (t.length < 8 || t.length > 160) return false;
    if (q && Array.isArray(q.opts) && q.opts.length) return false;
    if (/[?\uFF1F]/.test(t)) return false;          // it asks something
    if (ASSERTION_REASON.test(t)) return false;      // Assertion/Reason wrapper, not options
    /* A "Match the following" row that kept only one of its pairs has nothing to
       match against: the import emitted each pair as its own record, so the
       student sees "Match the following. — (ii) Agmark (b) Dealing with consumer
       cases" with a single line. A usable matching question carries at least two
       pairs. */
    if (/^\s*match\s+the\s+(?:following|column|items|pairs)|^\s*match\s+column/i.test(t)) {
      const roman = (t.match(/\((?:i{1,3}|iv|vi{0,3}|ix|x)\)/gi) || []).length;
      /* "(b)" or "B." — but not the full stop of a preceding word ("Agmark."). */
      const letters = (t.match(/\([a-hA-H]\)|(?<![A-Za-z])[A-H](?:\.|\))(?=\s)/g) || []).length;
      if (roman + letters <= 2) return true;
    }
    if (TASK_VERB.test(t)) return false;             // it instructs the student
    const at = firstOptionIndex(t);
    if (at < 0) return false;
    const stem = t.slice(0, at).trim();
    const label = t.slice(at).replace(/^[\s(]*/, '');
    /* No stem at all, or a stem far too short to be a question. */
    if (stem.length < 12) return true;
    /* A section label in front of a bare option run is not a stem. */
    const sectionLabel = /^(?:multiple choice questions?|mcqs?|objectives?|choose the correct option|answer the following)\.?\s*(?:[\u2014\u2013-]\s*)?$/i.test(stem);
    if (sectionLabel) return true;
    /* A stem that asks nothing: no colon/cue ending and no copula anywhere. */
    const endsWithCue = /[:\u2014\u2013-]\s*$/.test(stem)
      || /(?:is|are|was|were|of|following|below|given)\s*$/i.test(stem);
    if (endsWithCue) return false;
    if (/\b(?:is|are|was|were)\b/i.test(stem)) return false;
    /* Title-Case throughout is a name or a table column, never a sentence
       ("Communist Party of India (Marxist)"). */
    const plain = stem.replace(/[()]/g, ' ');
    const hasLower = /\b[a-z]{3,}/.test(plain);
    const titleRuns = (label.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,}/g) || []).length;
    if (!hasLower) return true;
    if (titleRuns >= 1 && stem.split(/\s+/).filter(Boolean).length < 7) return true;
    /* A complete-looking stem that merely lost its option bodies to the import
       ("… is equal to (A)  (B)  (C)  (D)") is recoverable, not junk: the stem
       alone still tells the student what to do. */
    return false;
  }

  function isPaperDirections(text, q) {
    const t = String(text || '');
    const cues = PAPER_CUES.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
    if (cues >= 2) return true;
    const kind = q && q.kind;
    const isMcq = kind === 'mcq' || kind === 1 || kind === '1';
    if (isMcq && /^\s*(?:complete|attempt)\s+any\s+.{0,80}\b(?:of|from)\s+the\s+following\b/i.test(t)
      && t.length > 180) return true;
    return false;
  }

  // Option identity is not a word-search fingerprint: x², x2, +2, −2,
  // 2·0 and 20 must remain distinct. NFC preserves superscripts and subscripts.
  function choiceText(value) {
    return asText(value).normalize('NFC').replace(/[−–—]/g, '-').replace(/\s+/g, ' ').trim();
  }

  function keyMetadataAllows(q) {
    if (!q || q.keyVerified === false || (q.raw && q.raw.keyVerified === false)) return false;
    const rows = [q, q.raw].filter(Boolean);
    return !rows.some(row => row.qualityStatus === 'withheld' || row.optionReview === 'awaiting-source-review'
      || row.textReview === 'awaiting-source-review' || (Array.isArray(row.qualityReasons) && row.qualityReasons.length));
  }

  function choiceIndex(options, answer) {
    const target = choiceText(answer);
    if (!target || !Array.isArray(options)) return -1;
    const label = /^(?:\(([a-f])\)|([a-f])[.)]?)$/i.exec(target);
    const index = label ? (label[1] || label[2]).toUpperCase().charCodeAt(0) - 65 : -1;
    let match = -1;
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (![o, o?.en, o?.hi].some(v => choiceText(v) === target)) continue;
      if (match >= 0) return -1; // An answer text must identify just one option.
      match = i;
    }
    if (!label) return match;
    return index < options.length && (match < 0 || match === index) ? index : -1;
  }

  function optionIssue(options, subject) {
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) return 'option-count';
    const seen = new Set();
    for (const option of options) {
      const text = asText(option).normalize('NFKC').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 260 || CONTROL_OR_PRIVATE.test(text)) return 'damaged-option';
      if (/^(?:[.,;:/|]+|\uFFFD+)$/u.test(text)
        || /(?:^|\s)\/?S\s*\d{1,3}$/i.test(text)
        || (/[\p{L}]/u.test(text) && /\b[\p{L}]{1,3}\s+\d{1,3}$/u.test(text))
        || /[#@$]\s*$/.test(text)
        || /\bquestions?\s+(?:number|no\.?)\b|\bgeneral\s+instructions\b|\banswer\s+book(?:let)?\b/i.test(text)) return 'damaged-option';
      // Preserve mathematical operators and punctuation when detecting exact
      // duplicates. Stripping every symbol made distinct choices such as 1
      // and −1, or x + y and x − y, collide and falsely withheld valid MCQs.
      const key = choiceText(option).toLowerCase();
      if (!key || seen.has(key)) return 'damaged-option';
      seen.add(key);
      if (['hindi','sanskrit'].includes(subject) && /[\u0900-\u097f]/.test(text)
        && (HINDI_OCR_MARKS.test(text) || hasUnbalancedSquareBrackets(text)
          || /(?:[०-९\d]\s*){4,}/.test(text))) return 'ocr-damaged-option';
    }
    return '';
  }

  function declaredMcq(q) {
    const kind = String(q && q.kind != null ? q.kind : '').toLowerCase();
    return ['mcq', '1', '2', 'assertion-reason', 'assertion_reason', 'assertion reason'].includes(kind);
  }

  // One admission rule for source choices, used both before a record enters a
  // practice pool and when rendering it. Never trim the array or infer a key.
  // `options` may come from a separately source-matched legacy table.
  function sourceOptionIssue(q, options = q?.opts, subject = q?.subject) {
    if (!q) return 'source-review';
    if (Array.isArray(options) && options.length < 4 && declaredMcq(q)) return 'option-count';
    // The Physics curation ledger recovers AR codes from instructions in the
    // SAME series/set. This clears only that row's own four choices for display;
    // it does not clear the stem, an inline extraction, or any answer key.
    const ownPaperCodes = row => row.subject === 'physics' && +row.cls === 12 && row.kind === 2
      && row.qualityStatus === 'structurally-screened' && row.optionReview === 'same-paper-instructions'
      && options === row.opts && options?.length === 4;
    if ([q, q.raw].some(row => row && (row.qualityStatus === 'withheld' || row.optionReview === 'awaiting-source-review'
      || (row.textReview === 'awaiting-source-review' && !ownPaperCodes(row)) || (Array.isArray(row.qualityReasons) && row.qualityReasons.length))))
      return 'source-review';
    const issue = optionIssue(options, subject);
    if (issue || options.length <= 4) return issue;

    // Five or six separate answers are valid. Table headings, directions and
    // pieces of other questions in the array are evidence of extraction damage.
    const texts = options.map(option => asText(option).normalize('NFKC').trim().replace(/\s+/g, ' '));
    // A name such as “State Bank of India” or a label such as “Answer A” is
    // not an instruction. For ambiguous verbs, require an instructional phrase.
    const promptLead = /^(?:(?:write|define|describe|explain|calculate|find|draw|what|which|how|why|give reason|mention|compare|justify|identify|analyse|analyze|choose|select)\s+\S|(?:name|list|state|read|study|answer)\s+(?:the|an?|any|one|two|three|whether|which|why|how)\s+\S)/i;
    if (texts.some(text => {
      const numbered = /(?:^|\s)(?:\(\d+\.\d+\)|(?:Q(?:uestion)?\.?\s*)?\d+[.):])\s+(.+)/i.exec(text);
      return (numbered && promptLead.test(numbered[1])) || /\boptions\s*:/i.test(text)
        || /\b(?:list|column)\s*[-–]?\s*ii?\b/i.test(text)
        || /^(?:(?:choose|select) the )?(?:most )?(?:appropriate|correct) (?:option|answer)(?: from the following)?\s*[:.]?$/i.test(text)
        || /#\s*SECTION\s+[A-E]\b|\bP\.?\s*T\.?\s*O\.?\b/i.test(text)
        || /^(?:assertion|reason\s*\(?r\)?)[,:.]?$/i.test(text)
        || /^is\s+(?:true|false)\s*,?\s*but\s+reason\b/i.test(text)
        // Repeated source-pack artefacts where the first glyph was dropped
        // at a page/column boundary, not a general ban on lowercase answers.
        || /^(?:etween|iversity|ustralia|elgium|riven|onservatism|ppropriate|ssertion|oth(?=\s|\(|$)|anks\b|hhattisgarh|ropping|xplanation|urrency|ducation|ommunication|lections|gainst|rop\b|xtension|onstruction|emand\b|xchange|ccount|heque|xplain|omparative|ge of\b|xample\b)/i.test(text);
    })) return 'cross-question-extraction';
    const prompts = texts.filter(text => /[?？]/.test(text) || promptLead.test(text)
      || /^(?:कौन|क्यों|कैसे|क्या|बताइए|लिखिए|समझाइए|ज्ञात|सिद्ध|गणना|वर्णन|स्पष्ट|दीजिए)/u.test(text));
    // Four answers followed by a new question can have only one prompt in
    // the array. Require both question wording and a question mark in its tail.
    if (prompts.length >= 2 || texts.slice(4).some(text => promptLead.test(text) && /[?？]\s*\d*$/.test(text)))
      return 'cross-question-extraction';
    const stem = asText(q.en || q.hi || q.sa).trim();
    const first = texts[0];
    if (stem && !/[.?!।॥]$/.test(stem) && /^[a-z]/.test(first) && (/[?？]\s*\d*$/.test(first) || /_{3,}/.test(first)))
      return 'cross-question-extraction';
    return '';
  }

  function inspect(q, subject) {
    if (!q || typeof q !== 'object') return '';
    const kind = q.kind;
    // `text` records are chapter passages, not stand-alone questions. Do not
    // blanket-remove them because a passage contains exercise/activity prose.
    if (kind === 'text' || kind === 'passage' || kind === 'glossary') return '';
    const actualSubject = subject || q.subject || '';
    const text = textOf(q).trim();
    if (!text) return '';

    const fields = [q.sa, q.hi, q.en].map(asText).filter(value => value.trim());
    const tails = fields.map(activityTail);
    const isEnglishSourcePaper = actualSubject === 'english' && q.y != null
      && (q.src || q.source || q.paperCode || q.set != null);
    const hasUsableOptions = Array.isArray(q.opts) && q.opts.some(option => asText(option).trim());
    if (isEnglishSourcePaper && !hasUsableOptions && text.length <= 50
      && !/[?？.!।॥]$/.test(text) && !taskSignal(text)) return 'incomplete-source-fragment';
    if (tails.length && tails.every(tail => tail && tail.drop)) return 'activity-only';
    if (isGenericUncontextualized(text)) return 'uncontextualized-prompt';
    if (isOptionFragment(text, q)) return 'option-fragment';
    if (isPaperDirections(text, q)) return 'paper-directions';

    if (CONTROL_OR_PRIVATE.test(text)) return 'ocr-damaged';
    if (['hindi','sanskrit'].includes(actualSubject)) {
      if (/[\u0900-\u097f]/.test(text) && HINDI_OCR_MARKS.test(text)) return 'ocr-damaged';
      if (Array.isArray(q.opts) && q.opts.length >= 2) {
        const optionProblem = optionIssue(q.opts, actualSubject);
        if (optionProblem) return 'ocr-damaged';
      }
    }
    return '';
  }

  /* Test-readiness gate: a question may be a genuine source record yet still
     be unusable in a test — it references a figure we do not have, starts
     mid-sentence, carries marks-column debris, or lost its operators/brackets
     in extraction. The PYQ list, test and mock pools use this gate before
     rendering; withholding a record here does not modify the source bank. */
  function testReadyIssue(q) {
    if (!q || typeof q !== 'object') return 'empty';
    const text = String((q.en || q.hi || q.sa || '')).trim();
    if (!text) return 'empty';
    const hasFig = !!(q.fig || q.diagram || q.svg);
    if (/\bFig\.?\s*\(?[A-Za-z0-9]/i.test(text) || /\b(?:figure|diagram)\s+(?:below|given|shown|above)\b/i.test(text)) {
      if (!hasFig) return 'missing-figure';
    }
    if (/^[a-z]{1,3}\s*\(/.test(text)) return 'truncated-start';
    if (/^(?:Reason|Assertion)\s*\([AR]\)\s*:/i.test(text) && !(/Assertion\s*\(A\)/i.test(text) && /Reason\s*\(R\)/i.test(text))) return 'fragment';
    if (/(?:given below|following)\s*[:?]?\s*$/i.test(text) && !(Array.isArray(q.opts) && q.opts.length)) return 'missing-content';
    if (text.split(/\s+/).length <= 14 && !/[?.:।॥)\]]\s*$/.test(text) && /\b(?:are|is|was|were|the|a|an|to|of|in|on|for|with|and|or|that|which|has|have|been|being)\s*$/i.test(text)) return 'truncated-end';
    if (/\?\s*\d{1,2}\s*$/.test(text)) return 'marks-debris';
    if (/[A-Z]{2,}\/\d+\s*$/.test(text)) return 'extraction-debris';
    // Missing/short lists still reach the written/withheld-choice fallback.
    // For extended MCQs check the source array itself, not a count of long words.
    if (Array.isArray(q.opts) && q.opts.length > 4 && declaredMcq(q) && sourceOptionIssue(q)) return 'broken-options';
    if (/^Prove\s+that\b/i.test(text) && !/=/.test(text)) return 'broken-identity';
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ue000-\uf8ff]/.test(text)) return 'damaged-text';
    return '';
  }

  /* Strict admission for a board-key table row (paper, q, stem, opts, key).
     A printed board key is only trusted when the row is complete and clean:
     valid key letter, exactly four distinct options, no fraction-shred or
     paper debris in any option, and the row itself passes the test-readiness
     gate. Returns the key option index, or -1 when the key must NOT be used
     for grading (the row stays unscored practice). */
  function boardKeyAdmission(raw) {
    if (!raw || typeof raw !== 'object') return -1;
    const letter = typeof raw.key === 'string' ? raw.key.trim().toLowerCase() : '';
    if (!/^[a-d]$/.test(letter)) return -1;
    const keyIndex = letter.charCodeAt(0) - 97;
    const opts = (Array.isArray(raw.opts) ? raw.opts : []).map(function (o) {
      return String((o && (o.text || o.en || o.hi)) || (typeof o === 'string' ? o : '')).trim();
    });
    if (opts.length !== 4) return -1;
    const norm = function (s) { return s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); };
    if (new Set(opts.map(norm)).size !== 4) return -1;
    for (let i = 0; i < opts.length; i++) {
      const v = opts[i];
      if (!v || v.length > 80) return -1;
      if (/\d\s+\d/.test(v)) return -1;              /* fraction shred: '8 1', '50 3' */
      if (/\b\d{2,3}\/\d/.test(v)) return -1;       /* paper-code debris */
    }
    if (testReadyIssue({ en: raw.stem || raw.en || '', kind: 'mcq', opts: opts.map(function (en) { return { en }; }) })) return -1;
    return keyIndex;
  }

  function inspectText(text, subject) {
    return inspect({ hi: String(text == null ? '' : text), subject: subject || '', kind: 'question' }, subject);
  }

  const api = { activityTail, cleanActivityTail, inspect, inspectText, testReadyIssue, boardKeyAdmission, isGenericUncontextualized, isOptionFragment, isPaperDirections, declaredMcq, keyMetadataAllows, choiceIndex, choiceText, optionIssue, sourceOptionIssue, textOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UP = root.UP || {};
  root.UP.questionQuality = api;
})(typeof window === 'undefined' ? globalThis : window);
