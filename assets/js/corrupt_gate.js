/* =====================================================================
   Is this question text intact enough to answer?
   ---------------------------------------------------------------------
   These CBSE PDFs are typeset in Word's equation editor.  Extraction
   knocks the maths apart, so a fraction arrives as "1 2", a theta as "q"
   and a triangle as "D".  A question whose maths was lost is a DIFFERENT
   question -- answering it and showing the result as verified is exactly
   the failure this project exists to prevent.

   The test is deliberately conservative: it fires only on signatures that
   cannot occur in a correctly extracted sentence, so it never throws away
   a question the student could have used.
   ===================================================================== */
(function (root) {
  const ENGLISH_FUNCTION_WORDS = new Set([
    'the','and','or','but','if','then','which','what','who','when','where','why','how',
    'is','are','was','were','be','been','being','of','to','in','on','for','from','with',
    'by','at','as','into','between','than','that','this','these','those','each','any',
    'all','given','following','below','above','after','before','there','their','its','whose'
  ]);
  const ENGLISH_TASK_WORDS = new Set([
    'find','calculate','compute','determine','state','write','give','show','prove','solve',
    'identify','choose','select','explain','describe','compare','predict','estimate','simplify',
    'evaluate','construct','draw','name','mention','represent','factorise','factorize'
  ]);

  const HARD = [
    [/[çèøö÷æîïðòóôõúûüýø]/, 'equation brackets lost'],
    [/[æö]\s*\d/, 'over-bracket lost'],
    [/úú|ú\s*ú/, 'parallel sign lost'],
    [/\b[DΔ]\s*[A-Z]{3}\b/, 'triangle sign lost'],
    /* Only a trig function butted against a bare q is proof of a lost theta.
       "q" on its own is a perfectly ordinary variable -- (p - q)x² + ... is a
       real question, and flagging it would throw away a good question. */
    [/\b(?:tan|cot|sin|cos|sec|cosec)\s*q\b/i, 'theta lost (written as q)'],
    [/^\s*(?:is|are|equals?)\s+(?:equal|of|to|the|a|an)\b/i, 'stem starts mid-sentence'],
    [/\bvalue\s+æ|æ\s*\d?\s*ö/, 'fraction box in prose'],
  ];

  /* Number piles.  "the first term 'a' is equal to 1 7 (A) 6 (B) 7" has a
     fraction that became two loose digits; a real question never has three
     bare one-or-two-digit numbers in a row separated by single spaces. */
  function numberPile(t) {
    /* A frequency table is a long run of class intervals -- numbers that are
       SUPPOSED to be next to each other.  Only flag runs outside one. */
    const tableRows = (t.match(/\d+\s*[-–]\s*\d+/g) || []).length;
    if (tableRows >= 4) return false;
    return /(?:^|[\s(])\d{1,2}\s+\d{1,2}\s+\d{1,2}(?=[\s)/]|$)/.test(t);
  }

  /* A stem that ends on a preposition has had its object torn off. */
  function brokenTail(t) {
    return /\b(?:of|in|to|for|with|by|from|is|are|and|or)\s*$/i.test(t.trim());
  }

  /* Devanagari-density test for Hindi OCR garbage.
     Real Hindi prose has >50% of its characters in the Devanagari Unicode
     block once whitespace is stripped.  A line like "/ll | शा ] 792० 5 ०7 6 40/ : ||"
     is pure OCR soup: less than 20% Devanagari, mostly digits & punctuation. */
  function devanagariRot(t) {
    const stripped = t.replace(/\s/g, '');
    if (stripped.length < 8) return null;
    let dev = 0;
    for (const c of stripped) {
      const cp = c.codePointAt(0);
      if ((cp >= 0x0900 && cp <= 0x097F) || c === '।' || c === '॥') dev++;
    }
    const ratio = dev / stripped.length;
    /* Heuristic: if less than 30% Devanagari AND the text clearly isn't a
       maths/English question (no Latin letters forming words), it's soup. */
    const latinWords = (stripped.match(/[A-Za-z]{3,}/g) || []).length;
    if (ratio < 0.30 && latinWords === 0) return 'Hindi OCR produced only digits and punctuation';
    // Krutidev/mojibake: lots of ASCII letters but no Devanagari in a Hindi-set question
    const asciiLetters = (stripped.match(/[A-Za-z]/g) || []).length;
    if (dev < 3 && asciiLetters > 15 && ratio < 0.15) return 'Hindi text came through as Latin mojibake';
    // Excessive PUA / control garbage (pdfminer tokens etc.)
    const pua = Array.from(stripped).filter(c => {
      const cp = c.codePointAt(0);
      return (cp >= 0xE000 && cp <= 0xF8FF) || (cp < 32 && c !== '\n' && c !== '\r' && c !== '\t');
    }).length;
    if (pua >= 3) return 'embedded PDF control characters';
    return null;
  }

  function why(raw, opts) {
    const t = String(raw == null ? '' : raw);
    if (!t.trim()) return 'empty';
    for (const [re, label] of HARD) if (re.test(t)) return label;
    if (numberPile(t)) return 'numbers torn out of a fraction';
    if (brokenTail(t)) return 'sentence cut off mid-clause';
    /* Devanagari-rot checks only fire when the caller is expecting Hindi /
       when the text is NOT a clear English/Maths question. If the text
       contains enough English words to be a real question, don't flag it as
       Latin-mojibake — that was firing on perfectly good English MCQs
       because they happen to have zero Devanagari characters. */
    const expectHindi = opts && opts.expectHindi;
    const latinWords = (t.match(/[A-Za-z]{2,}/g) || []).map(word => word.toLowerCase());
    const functionWords = latinWords.filter(word => ENGLISH_FUNCTION_WORDS.has(word)).length;
    const hasEnglishTask = latinWords.some(word => ENGLISH_TASK_WORDS.has(word));
    const looksLikeEnglish = (latinWords.length >= 3 && functionWords >= 2)
      || (latinWords.length >= 2 && hasEnglishTask);
    // A Hindi/Sanskrit subject can still contain an English-language source
    // question. Do not let `expectHindi` override clear English function/task
    // words; that was the source of false Latin-mojibake warnings on intact
    // English MCQs. Damaged Latin-script Hindi still reaches this gate because
    // it does not form a coherent English sentence.
    if (!looksLikeEnglish && (expectHindi || latinWords.length > 0 || /[^A-Za-z\s]/.test(t))) {
      const dg = devanagariRot(t); if (dg) return dg;
    }
    const fr = fragment(t); if (fr) return fr;
    return null;
  }

  const api = { why: why, ok: q => !why(q) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  (root.UP = root.UP || {}).corrupt = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Fragment: short lowercase phrase that is clearly a bullet/option torn off a
   lead-in sentence (e.g. "start car pooling" is an MCQ option, not a question). */
function fragment(t) {
  const s = String(t || '').trim();
  if (s.length < 3 || s.length > 40) return null;
  const words = s.split(/\s+/);
  if (words.length > 5) return null;
  /* starts with a lowercase letter, is not a complete sentence (no .?!) */
  if (!/[a-z\u0900-\u097F]/.test(s[0])) return null;
  if (/[.?!।॥]$/.test(s)) return null;
  /* Must NOT contain the patterns of a real question: "why/how/what/when/define/explain" etc. */
  if (/^(why|how|what|when|where|who|which|find|prove|solve|show|calculate|simplify|evaluate|write|give|name|state|mention|explain|define|distinguish|compare|क्या|क्यों|कैसे|कौन|परिभाषित|लिखिए|बताइए|दीजिए)\b/i.test(s)) return null;
  /* If it's a noun-phrase fragment (a bullet or MCQ option), flag it */
  return 'this looks like an option / bullet — the lead-in sentence of the question was not captured from the PDF';
}
