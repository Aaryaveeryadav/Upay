'use strict';
/* Compatibility name for lib/model-gateway.js.
 *
 * This module used to own the model transport (Ollama, one URL, one tag). The
 * transport now lives in lib/model-gateway.js so that the study chat, the
 * Science tutor and the solve route all reach a model the same way, and so an
 * operator can point the whole site at their own model with one variable. What
 * stays here is the part that is not transport: the syllabus guard that decides
 * whether a question belongs to the subject at all.
 *
 * Callers can keep requiring this file; nothing needs to change.
 */
const gateway = require('./model-gateway.js');

const DEFAULT_URL = gateway.DEFAULT_URL;
const DEFAULT_MODEL = gateway.DEFAULT_MODEL;

// Lazy: science-rag.js itself requires this module, so the tokeniser is
// resolved at call time (after both modules have finished loading).
function scienceTokens(text) { return require('./science-rag.js').tokenize(text); }

function configError(message) { return gateway.configError(message); }
function baseUrl() { return gateway.baseUrl(); }
function modelName() { return gateway.modelName(); }
function enabled() { return gateway.enabled(); }
function providerGuard() { return gateway.providerGuard(); }
function status() { return gateway.status(); }
function generate(input) { return gateway.generate(input); }
function coded(e) { return e; }

/* ---------------------------------------------------------------- guard ----
   A student's question must be about study. The guard runs before retrieval so
   an off-topic request costs no model time, and the refusal is worded like a
   teacher, not a firewall.

   It decides with the vocabulary of the subject being studied: for Science it
   uses the committed index (every chapter, section, activity and PYQ word), and
   for the other subjects a reviewed term list. A question that uses none of the
   subject's vocabulary is refused. This matters because the question the site
   must reject is exactly "What is the capital of France?", which is ordinary
   English but has nothing to do with the class subject. */

const OFF_TOPIC = [
  /\b(joke|funny|meme|rap|song|lyrics|movie|film|actor|actress|celebrity|web ?series)\b/i,
  /\b(president|prime minister|chief minister|election result|ipl|world cup|oscar|box office|match score|scorecard)\b/i,
  /\b(hack|hacking|exploit|bypass|jailbreak|ignore (all )?(the )?(previous|above) instructions|system prompt)\b/i,
  /\b(porn|sex|nude|gambling|betting|casino|drugs?|alcohol|cigarette|vape)\b/i,
  /\b(girlfriend|boyfriend|dating|flirt|marry|marriage|relationship advice)\b/i,
  /\b(caste|religion|communal|riot|terrorist|suicide|kill (myself|him|her)|self[- ]harm)\b/i,
  /\b(bitcoin|crypto|stock tip|trading tip|lottery|loan|credit card|otp|password)\b/i,
  /\b(are you (human|real|chatgpt|gemini|ai)|who (made|built|created) you|what model are you|your name)\b/i
];
const WRITING_TASK = /\b(write|draft|compose|make|prepare)\b.{0,40}\b(essay|application|letter|speech|story|poem|paragraph|article|debate|notice|report)\b/i;

const OTHER_SUBJECT_WORDS = {
  maths: ('number numbers integer fraction decimal rational irrational real prime composite hcf lcm factor multiple ' +
    'algebra polynomial quadratic linear equation equations variable coefficient root roots solution identity ' +
    'arithmetic progression ap term common difference sum product square cube root power exponent ' +
    'triangle triangles congruence similarity Pythagoras theorem circle circles tangent chord arc sector segment ' +
    'coordinate geometry distance midpoint slope area perimeter volume surface curved total ' +
    'trigonometry sine cosine tangent ratio angle angles height distance ' +
    'statistics mean median mode frequency class interval probability event outcome ' +
    'percentage profit loss interest compound simple discount tax gst ratio proportion ' +
    'matrix matrices determinant inverse adjoint transpose integration derivative limit function ' +
    'vector vectors calculus differentiation application maxima minima increasing decreasing ' +
    'set sets relation relations mapping domain range binary operation inverse ' +
    'perimeter mensuration cylinder cone sphere hemisphere frustum quadrilateral parallelogram rhombus trapezium ' +
    'simultaneous substitution elimination graph graphical construction bisector perpendicular parallel ' +
    'sum difference numerator denominator divisible divisibility digit digits place value rounding estimation').split(/\s+/),
  social: ('history chapter source inscription manuscript archaeologist colonial british empire revolt rebellion ' +
    'movement nationalism satyagraha noncooperation civil disobedience independence partition constitution federalism ' +
    'democracy election parliament judiciary legislature executive fundamental rights duties secular sovereignty ' +
    'power sharing federal unitary decentralisation coalition party parties alliance ' +
    'resources soil forest wildlife agriculture crop irrigation dam river basin mineral energy coal petroleum ' +
    'manufacturing industry globalisation liberalisation trade transport road railway port ' +
    'development human poverty literacy census population migration urbanisation ' +
    'map latitude longitude monsoon climate weather soil erosion vegetation ' +
    'nationalism romanticism print culture novel novels ' +
    'money credit banking loan self help group cooperative ' +
    'sectors primary secondary tertiary services gdp income employment organised unorganised ' +
    'world war civil war colonisation nation state ' +
    'gender caste religion community identity diversity discrimination ' +
    'judiciary supreme court high court writ petition right to information').split(/\s+/),
  hindi: ('हिंदी हिन्दी पाठ कविता कहानी निबंध व्याकरण संज्ञा सर्वनाम क्रिया विशेषण अव्यय कारक विभक्ति वचन लिंग ' +
    'काल वर्तमान भूतकाल भविष्यत् प्रत्यय उपसर्ग समास संधि अलंकार रस छंद मात्रा लेखक कवि कवयित्री पात्र ' +
    'पाठ्यपुस्तक अपठित गद्यांश पद्यांश पत्र पत्रलेखन अनुच्छेद निबंधलेखन वाक्य वाक्यांश मुहावरा लोकोक्ति ' +
    'तत्सम तद्भव शब्द शब्दार्थ अर्थ कथावस्तु उद्देश्य संदेश भाव सौंदर्य मूल्यांकन प्रश्न उत्तर सारांश ' +
    'कविता का भाव कवि परिचय नाटक एकांकी संस्मरण रिपोर्ताज जीवनी आत्मकथा पत्रकारिता').split(/\s+/),
  english: ('reading comprehension passage prose poetry poem poet chapter letter writing notice report ' +
    'grammar tense tenses voice active passive speech reported direct indirect clause phrase ' +
    'noun pronoun verb adjective adverb preposition conjunction determiner article determiners ' +
    'synonym antonym meaning word vocabulary sentence paragraph essay narrative descriptive ' +
    'debate speech article story character theme plot summary stanza rhyme poetic device metaphor simile ' +
    'alliteration personification first person third person perspective author playwright drama scene ' +
    'unseen extract answer question solution explanation analysis').split(/\s+/),
  science: ('science physics chemistry biology ncert experiment activity observation observation ' +
    'theorem formula equation').split(/\s+/)
};

let scienceVocabCache = null;
function scienceVocab() {
  if (scienceVocabCache) return scienceVocabCache;
  const words = new Set();
  try {
    const { chunks } = require('./science-rag.js').loadIndex();
    let n = 0;
    for (const chunk of chunks) {
      if (chunk.chapter == null) continue;
      // Every content word of every indexed chunk names something the book
      // actually teaches (including chemical formulae and apparatus names).
      for (const t of scienceTokens((chunk.text || '') + ' ' + (chunk.question || ''))) {
        if (t.length >= 3) { words.add(t); n++; }
      }
      if (n > 400000) break; // plenty; the index is 1.4k chunks
    }
  } catch (_) { /* no index: the curated list below still applies */ }
  for (const w of OTHER_SUBJECT_WORDS.science) words.add(w);
  scienceVocabCache = words;
  return words;
}

function vocabFor(scope) {
  const subject = String(scope && scope.subject || 'science').toLowerCase();
  if (subject === 'science' || subject === 'physics' || subject === 'chemistry' || subject === 'biology') return scienceVocab();
  const list = OTHER_SUBJECT_WORDS[subject];
  return new Set(list || OTHER_SUBJECT_WORDS.science);
}

function isFormulaLike(text) {
  // "Fe + O2 -> Fe2O3", "2H2 + O2 → 2H2O", "x^2 + 5x + 6 = 0"
  return /[=→\u2192>]/.test(text) && /[A-Za-z0-9)\]]/.test(text) && text.split(/\s+/).length <= 20
    && /\b[A-Z][a-z]?\d*\b|\d+\s*[A-Za-z]/.test(text);
}

/* Returns { ok:true } or { ok:false, code, message }. */
function guardQuestion(question, scope) {
  const text = String(question || '').replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  if (text.length < 3) return { ok: false, code: 'too_short', message: 'Type your question first.' };
  if (/^(hi|hello|hey|ok|okay|thanks|thank you|hmm|yes|no|sure|good morning|good evening)[.!]?$/i.test(text)) {
    return { ok: false, code: 'greeting', message: 'Ask me a question from your book or a previous-year paper — for example, "Why is a convex mirror used as a rear-view mirror?"' };
  }
  for (const re of OFF_TOPIC) {
    if (re.test(lower)) {
      return {
        ok: false, code: 'off_topic',
        message: 'That is outside what this site teaches. I only answer questions from your Class ' + ((scope && scope.class) || 10) + ' ' + (scope && scope.subject || 'subject') + ' book and previous-year papers.'
      };
    }
  }
  // Devanagari and other non-Latin scripts: the science tokeniser only keeps
  // ASCII words, so split on whitespace and keep the script as-is.
  const nonLatin = /[^\u0000-\u024F]/.test(text);
  const tokens = nonLatin
    ? lower.replace(/[?.,;:!()[\]{}"'`\u2018\u2019\u201c\u201d]/g, ' ').split(/\s+/).filter(t => t.length >= 2)
    : scienceTokens(lower);
  if (!tokens.length) return { ok: false, code: 'off_topic', message: 'Ask a question about your subject and chapter.' };

  // A writing task is legitimate in an English or Hindi paper; anywhere else it
  // is off-syllabus homework. (The subject vocabulary check below still applies.)
  const writingSubject = ['english', 'hindi'].includes(String(scope && scope.subject || '').toLowerCase());
  if (WRITING_TASK.test(lower) && !writingSubject) {
    return {
      ok: false, code: 'off_topic',
      message: 'This site is for your syllabus, not outside writing work. Ask about a chapter, a question or a concept from your book.'
    };
  }
  if (isFormulaLike(text)) return { ok: true };

  const vocab = vocabFor(scope);
  let hits = 0;
  for (const t of tokens) {
    if (vocab.has(t)) { hits++; continue; }
    // Devanagari compounds carry suffixes (साखी + का); a prefix match on a
    // reviewed word still counts as subject vocabulary.
    if (nonLatin) for (const w of vocab) { if (w.length >= 3 && t.startsWith(w)) { hits++; break; } }
  }
  if (hits > 0) return { ok: true };
  return {
    ok: false, code: 'off_topic',
    message: 'That does not look like a question from your Class ' + ((scope && scope.class) || 10) + ' ' + (scope && scope.subject || 'subject') + ' syllabus. Ask about a chapter, a formula, a reaction, a diagram or a previous-year question.'
  };
}


module.exports = {
  DEFAULT_URL, DEFAULT_MODEL,
  generate, guardQuestion, vocabFor, status, coded,
  baseUrl, modelName, enabled, providerGuard,
  configError,
  gateway
};
