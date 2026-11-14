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

  function taskSignal(text) {
    const hindiTask = /(?:^|[^\p{L}\p{M}])(?:लिखिए|लिखें|बताइए|बताएँ|कीजिए|करिए|समझाइए|समझाएँ|वर्णन|स्पष्ट|सिद्ध|ज्ञात|छाँटिए|दीजिए|चर्चा|व्यक्त|तैयार|कौन|क्यों|कैसे|क्या)(?=$|[^\p{L}\p{M}])/u;
    const englishTask = /\b(?:explain|describe|write|state|find|calculate|discuss|identify|which|what|why|how)\b/i;
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
      const key = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      if (!key || seen.has(key)) return 'damaged-option';
      seen.add(key);
      if (['hindi','sanskrit'].includes(subject) && /[\u0900-\u097f]/.test(text)
        && (HINDI_OCR_MARKS.test(text) || /(?:[०-९\d]\s*){4,}/.test(text))) return 'ocr-damaged-option';
    }
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
    if (tails.length && tails.every(tail => tail && tail.drop)) return 'activity-only';
    if (isGenericUncontextualized(text)) return 'uncontextualized-prompt';
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

  function inspectText(text, subject) {
    return inspect({ hi: String(text == null ? '' : text), subject: subject || '', kind: 'question' }, subject);
  }

  const api = { activityTail, cleanActivityTail, inspect, inspectText, isGenericUncontextualized, isPaperDirections, optionIssue, textOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UP = root.UP || {};
  root.UP.questionQuality = api;
})(typeof window === 'undefined' ? globalThis : window);
