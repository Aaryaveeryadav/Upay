/* =====================================================================
   Upay · Class 10 Science tutor (chat UI with cited NCERT/PYQ sources)

   Asks /api/science/ask, which retrieves from assets/science/science-index.json
   and drafts the answer with a local Ollama model. This file only renders:

     - the answer with inline [n] citation markers turned into links
     - a source card per citation: chapter, section, verified PDF page,
       the excerpt, a verified NCERT/board key when the index holds one,
       and a link into the textbook chapter or the board question bank
     - honest states: sources-only when the model is offline, abstention when
       nothing matched, a sign-in-free usage note

   It is exposed as UP.scienceTutor for the router, and the same functions
   are CommonJS-exported so node tests can render without a browser.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  root.UP = root.UP || {};
  root.UP.scienceTutor = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SUGGESTIONS = [
    'Why are bags of chips flushed with nitrogen gas?',
    'How is Plaster of Paris prepared from gypsum?',
    'What is the chlor-alkali process and what forms at the anode?',
    'Explain the cleansing action of soaps using micelles.',
    'How do guard cells open and close stomatal pores?',
    'What is a reflex arc and why has it evolved?',
    'Why does a concave mirror form a real image?',
    'State Ohm\u2019s law and derive the series formula for resistors.',
    'How does a solenoid behave like a bar magnet?',
    'What is the role of decomposers in an ecosystem?'
  ];

  const CHAPTERS = [
    [1, 'Chemical Reactions and Equations'],
    [2, 'Acids, Bases and Salts'],
    [3, 'Metals and Non-metals'],
    [4, 'Carbon and its Compounds'],
    [5, 'Life Processes'],
    [6, 'Control and Coordination'],
    [7, 'How do Organisms Reproduce?'],
    [8, 'Heredity'],
    [9, 'Light \u2013 Reflection and Refraction'],
    [10, 'The Human Eye and the Colourful World'],
    [11, 'Electricity'],
    [12, 'Magnetic Effects of Electric Current'],
    [13, 'Our Environment']
  ];

  const LIMIT = 100;              // rendered answers kept in the local store
  const STORE_KEY = 'upay.scienceTutor.chat';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function chapterName(n) {
    const hit = CHAPTERS.find(c => c[0] === Number(n));
    return hit ? hit[1] : '';
  }

  /* Inline citations: [2] becomes a link to the source card. Numbers past the
     end of the list are marked invalid rather than silently dropped — the
     server reports the same thing, and a student should see it. */
  function linkCitations(text, sourceCount) {
    return esc(text).replace(/\[(\d{1,2})\]/g, (all, digits) => {
      const n = Number(digits);
      if (n < 1 || n > sourceCount) {
        return '<mark class="tutor-bad-cite" title="This citation number has no source">[' + digits + ']</mark>';
      }
      return '<a class="tutor-cite" href="#source-' + n + '" data-cite="' + n + '" aria-label="Go to source ' + n + '">' + digits + '</a>';
    });
  }

  /* Plain text from the model: blank lines make paragraphs, numbered or
     bulleted lines stay on their own line. No HTML from the model is trusted. */
  function renderAnswerText(text, sourceCount) {
    const clean = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim();
    if (!clean) return '';
    const safe = linkCitations(clean, sourceCount)
      .split(/\n{2,}/)
      .map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        const listish = lines.length > 1 && lines.every(l => /^(?:[-*\u2022\u2013]|\d+[.)])\s+/.test(l));
        if (listish) return '<ul class="tutor-points">' + lines.map(l => '<li>' + l.replace(/^(?:[-*\u2022\u2013]|\d+[.)])\s+/, '') + '</li>').join('') + '</ul>';
        return '<p>' + lines.join('<br>') + '</p>';
      })
      .join('');
    return safe;
  }

  function textbookHref(citation) {
    return citation.chapter ? '#/chapter/' + Number(citation.chapter) : '';
  }
  function boardHref(citation) {
    if (citation.docType !== 'pyq' || !citation.chapter) return '';
    return '#/pyq?sub=science&cls=10' + (citation.year ? '&y=' + Number(citation.year) : '') + '&ch=' + Number(citation.chapter);
  }

  function authorBadge(citation) {
    if (citation.docType === 'pyq') {
      return '<span class="tag cream">CBSE board question</span>';
    }
    return '<span class="tag grey">NCERT textbook</span>';
  }

  function sourceCard(citation, lang) {
    const hi = lang === 'hi';
    const n = citation.n;
    const chLabel = citation.chapter ? 'Ch ' + citation.chapter : '';
    const chapterTitle = citation.chapterTitle || chapterName(citation.chapter);
    const page = citation.page
      ? '<span class="tutor-page">' + (citation.pageSource === 'pyq-ocr' ? (hi ? 'प्रश्नपत्र पृष्ठ ' : 'Paper page ') : (hi ? 'PDF पृष्ठ ' : 'PDF page ')) + esc(citation.page) + '</span>'
      : '<span class="tutor-page muted">' + (hi ? 'PDF पृष्ठ उपलब्ध नहीं' : 'No verified PDF page') + '</span>';
    const keyLine = citation.verifiedKey && citation.answer
      ? '<div class="tutor-key"><b>' + (citation.docType === 'pyq' ? (hi ? 'सत्यापित उत्तर-कुंजी' : 'Verified answer key') : (hi ? 'NCERT उत्तर' : 'NCERT answer')) + '</b> ' + esc(citation.answer) + '</div>'
      : '';
    const question = citation.question && citation.question !== citation.snippet
      ? '<p class="tutor-q">' + esc(citation.question) + '</p>'
      : '';
    const links = [];
    if (citation.chapter && citation.docType !== 'pyq') {
      links.push('<a class="link" href="' + textbookHref(citation) + '">' + (hi ? 'अध्याय ' : 'Open chapter ') + Number(citation.chapter) + ' \u2192</a>');
    }
    const board = boardHref(citation);
    if (board) links.push('<a class="link" href="' + board + '">' + (hi ? 'इस अध्याय के बोर्ड प्रश्न' : 'Board questions in this chapter') + ' \u2192</a>');
    return '<article class="card tutor-source" id="source-' + n + '" data-source-n="' + n + '" tabIndex="-1">' +
      '<div class="tutor-source-head"><span class="tutor-cite-badge">[' + n + ']</span>' +
      authorBadge(citation) + page + '</div>' +
      '<h3>' + esc(citation.label || ('Source ' + n)) + '</h3>' +
      '<p class="tutor-source-meta">' + esc([chLabel, chapterTitle].filter(Boolean).join(' \u00b7 ')) + '</p>' +
      question +
      '<blockquote class="tutor-excerpt">' + esc(citation.snippet) + (String(citation.snippet || '').length >= 319 ? '\u2026' : '') + '</blockquote>' +
      keyLine +
      (links.length ? '<div class="tutor-source-links">' + links.join('') + '</div>' : '') +
      '</article>';
  }

  function statusChip(status) {
    if (!status) return '';
    const index = status.index || {};
    if (!index.available) {
      return '<span class="tutor-status off" title="Run node tools/science-index/build_science_index.js">' +
        'Index not installed</span>';
    }
    const label = status.ready
      ? 'Local model \u00b7 ' + (status.model || '') + ' \u00b7 ' + index.chunks + ' chunks'
      : (status.enabled ? 'Sources only \u00b7 model ' + (status.model || '') + ' not confirmed' : 'Tutor switched off');
    return '<span class="tutor-status' + (status.ready ? '' : ' warn') + '" title="Questions stay on this server">' +
      esc(label) + '</span>';
  }

  function noticeHtml(lang) {
    const hi = lang === 'hi';
    return '<div class="callout tip tutor-notice"><span aria-hidden="true">\u2696</span><div>' +
      '<b>' + (hi ? 'स्रोत-आधारित उत्तर' : 'Grounded answers, not an answer key') + '</b> ' +
      (hi
        ? 'उत्तर स्थानीय पुस्तक-सूचकांक (NCERT अध्याय और CBSE बोर्ड प्रश्न) से बनाए जाते हैं और स्थानीय मॉडल लिखता है। हर दावे के आगे [1] जैसा स्रोत जाँचें। यह आधिकारिक उत्तर-कुंजी नहीं है।'
        : 'Each answer is drafted by a local model that reads only the indexed NCERT chapters and CBSE board questions in this app. Follow the [1] markers to the exact section and page, and check the wording there. This is a study draft, not an official answer key.') +
      '</div></div>';
  }

  /* ---------------- request ---------------- */
  function ask(payload, fetchImpl) {
    const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) return Promise.reject(new Error('offline'));
    return doFetch('/api/science/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json().catch(() => null).then(body => ({ ok: res.ok, status: res.status, body: body || {} })));
  }

  function answerBlock(entry, lang) {
    const hi = lang === 'hi';
    if (!entry) return '';
    const sources = Array.isArray(entry.citations) ? entry.citations : [];
    if (entry.kind === 'error') {
      return '<div class="tutor-answer tutor-answer-error" role="alert">' +
        '<p><b>' + (hi ? 'उत्तर नहीं बना।' : 'No draft answer this time.') + '</b> ' + esc(entry.error || '') + '</p>' +
        (sources.length
          ? '<p class="muted">' + (hi ? 'स्रोत अभी भी उपलब्ध हैं:' : 'The retrieved sources are still below and are safe to read:') + '</p>' +
            '<div class="tutor-sources">' + sources.map(c => sourceCard(c, lang)).join('') + '</div>'
          : '') +
        '</div>';
    }
    if (!entry.grounded) {
      return '<div class="tutor-answer tutor-answer-none" role="status"><p>' + renderAnswerText(entry.answer || '', 0) + '</p>' +
        '<p class="muted">' + (hi ? 'कोई स्रोत नहीं मिला, इसलिए उत्तर नहीं बनाया गया।' : 'No confident source match, so no answer was drafted.') + '</p></div>';
    }
    const check = entry.citationCheck || {};
    const warn = (check.invalid && check.invalid.length)
      ? '<p class="tutor-warn">' + (hi ? 'ड्राफ्ट ने ऐसे स्रोत का हवाला दिया जो सूची में नहीं है।' : 'The draft cited a number that is not in the source list; check it before trusting that sentence.') + '</p>'
      : '';
    const noCite = (!check.hasCitation && sources.length)
      ? '<p class="tutor-warn">' + (hi ? 'ड्राफ्ट में कोई [n] संदर्भ नहीं है — नीचे के पृष्ठ स्वयं जाँचें।' : 'The draft does not point to a source with [n]. Read the pages below and check the claim yourself.') + '</p>'
      : '';
    return '<div class="tutor-answer">' +
      '<div class="tutor-answer-meta">' +
      '<span class="tag green">' + esc(entry.model || 'local model') + '</span>' +
      '<span class="tag grey">' + esc(sources.length + (sources.length === 1 ? ' source' : ' sources')) + '</span>' +
      (entry.notice ? '<span class="muted tutor-answer-note">' + esc(entry.notice) + '</span>' : '') +
      '</div>' +
      warn + noCite +
      '<div class="tutor-answer-text">' + renderAnswerText(entry.answer, sources.length) + '</div>' +
      (sources.length ? '<h3 class="tutor-sources-title">' + (hi ? 'स्रोत' : 'Sources') +
        ' <span class="muted">' + (hi ? 'मूल पाठ से जाँचें' : 'verify against the original') + '</span></h3>' +
        '<div class="tutor-sources">' + sources.map(c => sourceCard(c, lang)).join('') + '</div>' : '') +
      '</div>';
  }

  function turnMarkup(turn, lang) {
    const hi = lang === 'hi';
    const q = '<div class="tutor-turn tutor-turn-student"><div class="tutor-bubble">' + esc(turn.question) + '</div></div>';
    if (turn.state === 'loading') {
      return '<div class="tutor-turn-group" data-turn="' + esc(turn.id) + '">' + q +
        '<div class="tutor-turn tutor-turn-tutor tutor-loading" role="status">' +
        '<span class="ai-dots" aria-hidden="true"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></span>' +
        (hi ? ' सूचकांक में खोज रहे हैं और उत्तर लिख रहे हैं\u2026' : ' Searching the index and drafting a cited answer\u2026') +
        '</div></div>';
    }
    return '<div class="tutor-turn-group" data-turn="' + esc(turn.id) + '">' + q +
      '<div class="tutor-turn tutor-turn-tutor">' + answerBlock(turn, lang) + '</div></div>';
  }

  function view(state, lang) {
    const hi = lang === 'hi';
    const turns = Array.isArray(state && state.turns) ? state.turns : [];
    const busy = !!(state && state.busy);
    const chapter = state && state.chapter ? String(state.chapter) : '';
    const suggestions = SUGGESTIONS.slice(0, 6);
    return `
    <section class="page-head tutor-head">
      <span class="eyebrow"><span class="dot"></span>${hi ? 'कक्षा 10 · विज्ञान · साक्ष्य-आधारित' : 'Class 10 · Science · evidence-first'}</span>
      <h1>${hi ? 'विज्ञान शिक्षक — स्रोत के साथ' : 'Science tutor, with the page it read'}</h1>
      <p>${hi
        ? 'NCERT पाठ्यपुस्तक और CBSE बोर्ड प्रश्नों से उत्तर, हर दावे के साथ पाठ्यपुस्तक का अध्याय, अनुभाग और PDF पृष्ठ।'
        : 'Ask a Physics, Chemistry or Biology question. The tutor answers only from the NCERT textbook and CBSE board questions indexed in this app, and cites the chapter, section and PDF page it used.'}</p>
      <div class="tutor-head-actions">${statusChip(state && state.status)}<span id="tutorStatusLine" class="muted" role="status"></span></div>
    </section>
    ${noticeHtml(lang)}
    <form class="tutor-askbox" data-form="science-tutor" autocomplete="off">
      <label class="sr-only" for="tutorQuestion">${hi ? 'अपना विज्ञान प्रश्न लिखें' : 'Type your science question'}</label>
      <textarea id="tutorQuestion" name="question" rows="2" placeholder="${hi ? 'जैसे: साबुन की सफ़ाई क्रिया मिसेल से कैसे होती है?' : 'e.g. How does a soap micelle remove grease? Why is a convex mirror used as a rear-view mirror?'}" maxlength="800">${esc(state && state.draft ? state.draft : '')}</textarea>
      <div class="tutor-askbox-foot">
        <label class="tutor-chapter"><span>${hi ? 'अध्याय' : 'Chapter'}</span>
          <select name="chapter" data-tutor-chapter>
            <option value="">${hi ? 'सभी अध्याय' : 'All chapters'}</option>
            ${CHAPTERS.map(c => `<option value="${c[0]}"${String(c[0]) === chapter ? ' selected' : ''}>${c[0]} \u00b7 ${esc(c[1])}</option>`).join('')}
          </select></label>
        <span class="tutor-flex"></span>
        <button class="btn btn-primary" type="submit"${busy ? ' disabled aria-busy="true"' : ''}>${busy ? (hi ? 'उत्तर बन रहा है\u2026' : 'Drafting\u2026') : (hi ? 'पूछें' : 'Ask the tutor')}</button>
        ${turns.length ? '<button class="btn btn-ghost" type="button" data-tutor-action="clear">' + (hi ? 'साफ़ करें' : 'Clear chat') + '</button>' : ''}
      </div>
    </form>
    ${turns.length
      ? '<div class="tutor-thread" id="tutorThread" aria-live="polite">' + turns.map(t => turnMarkup(t, lang)).join('') + '</div>'
      : `<div class="tutor-starters"><h2>${hi ? 'यहाँ से शुरू करें' : 'Start with one of these'}</h2><div class="chip-row">${
          suggestions.map(s => `<button type="button" class="chip" data-tutor-suggestion="${esc(s)}">${esc(s)}</button>`).join('')
        }</div></div>`}
    <section class="tutor-help">
      <h2>${hi ? 'यह कैसे काम करता है' : 'How this works'}</h2>
      <div class="grid grid-3">
        <article class="card flat"><h3>${hi ? '१. पहले खोज' : '1. Retrieve first'}</h3><p>${hi
          ? 'आपका प्रश्न स्थानीय सूचकांक में खोजा जाता है — NCERT अनुभाग, गतिविधियाँ, अभ्यास प्रश्न और 2026 के बोर्ड प्रश्न।'
          : 'Your question is matched (BM25 with formula, section and phrase boosts) against 1,400+ indexed chunks: NCERT sections, activities, exercise questions and CBSE 2026 board questions.'}</p></article>
        <article class="card flat"><h3>${hi ? '२. फिर उत्तर' : '2. Answer only from those pages'}</h3><p>${hi
          ? 'स्थानीय मॉडल (qwen2.5:3b) केवल मिले अंश पढ़ता है और [1] जैसे संदर्भ देता है। जानकारी न हो तो मना कर देता है।'
          : 'The local model (qwen2.5:3b via Ollama) sees only the retrieved excerpts and must cite them as [1], [2]. If the excerpts do not answer the question, it says so instead of guessing.'}</p></article>
        <article class="card flat"><h3>${hi ? '३. आप जाँचें' : '3. You verify'}</h3><p>${hi
          ? 'हर स्रोत कार्ड अध्याय, अनुभाग और सत्यापित PDF पृष्ठ दिखाता है; NCERT उत्तर केवल जहाँ सत्यापित कुंजी है।'
          : 'Every source card names the chapter, section and a verified PDF page, with a direct link. NCERT answers appear only where the app holds a verified key, and board questions are labelled as such.'}</p></article>
      </div>
      <p class="muted">${hi
        ? 'सीमाएँ: यह स्थानीय मॉडल केवल उसी सर्वर पर उत्तर दे सकता है जहाँ Ollama चल रहा है; होस्टेड परिनियोजन पर स्रोत मिलेंगे पर ड्राफ्ट नहीं बनेगा।'
        : 'Limits: the local model can answer only where this server can reach Ollama. On a hosted deployment without a reachable model the tutor still returns the cited sources, but cannot draft an answer. It also cannot see your question history beyond this page.'}</p>
    </section>`;
  }

  return {
    SUGGESTIONS, CHAPTERS, STORE_KEY, LIMIT,
    esc, chapterName, linkCitations, renderAnswerText, sourceCard, statusChip,
    answerBlock, turnMarkup, view, ask,
    textbookHref, boardHref
  };
});
