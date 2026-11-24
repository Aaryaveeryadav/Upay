'use strict';
/* The site's own model: one local LLM behind one boundary.
 *
 *   - The operator runs the model (Ollama on the club GPU, an RTX 3050 with a
 *     quantised 3B/7B model, or any HTTPS gateway that speaks /api/chat).
 *     Nothing is sent to a cloud provider, so there is no API key to leak and
 *     no per-answer spend.
 *   - Every model-facing feature (Science tutor, general study chat) calls
 *     generate(), so the guard, redaction and citation rules live in one place.
 *   - Request data can never choose the host or the model name.
 *
 * Environment (server-side only)
 *   UPAY_LOCAL_LLM_URL     base URL, default http://127.0.0.1:11434
 *   UPAY_LOCAL_LLM_MODEL   model tag, default qwen2.5:3b
 *   UPAY_LOCAL_LLM_KEY     optional bearer token for a private gateway
 *   UPAY_LOCAL_LLM=off     switch the model off entirely (sources still answer)
 */
// Lazy: science-rag.js itself requires this module, so the tokeniser is
// resolved at call time (after both modules have finished loading).
function scienceTokens(text) { return require('./science-rag.js').tokenize(text); }

const DEFAULT_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen2.5:3b';
const MAX_OUTPUT = 1024 * 1024;

function configError(message) {
  const e = new Error(message || 'The study model is not configured correctly on this server.');
  e.status = 503; e.code = 'llm_configuration';
  return e;
}

function baseUrl() {
  const raw = String(process.env.UPAY_LOCAL_LLM_URL || process.env.UPAY_OLLAMA_URL || DEFAULT_URL).trim();
  let parsed;
  try { parsed = new URL(raw); } catch (_) { throw configError(); }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw configError();
  return parsed.toString().replace(/\/$/, '');
}
function modelName() {
  const raw = String(process.env.UPAY_LOCAL_LLM_MODEL || process.env.UPAY_OLLAMA_MODEL || DEFAULT_MODEL).trim();
  if (!/^[A-Za-z0-9._:\/-]{1,80}$/.test(raw)) throw configError();
  return raw;
}
function enabled() { return String(process.env.UPAY_LOCAL_LLM || 'on').toLowerCase() !== 'off'; }

/* Who may answer: the site's own model only. A configuration that still asks
   for a cloud provider is refused rather than silently falling back. */
function providerGuard() {
  const chosen = String(process.env.UPAY_SOLVE_PROVIDER || 'local').trim().toLowerCase();
  if (chosen === 'local' || chosen === 'ollama') return true;
  const e = new Error('This build answers with the local model only. Cloud providers are switched off.');
  e.status = 503; e.code = 'cloud_provider_disabled';
  throw e;
}

/* One place for every outbound model request.
   `codes` lets a caller keep its own contract (the Science tutor's
   tutor_* codes) while every other protection stays identical. */
function coded(e, codes) {
  if (!e || !codes) return e;
  const map = { llm_unavailable: 'tutor_unavailable', llm_timeout: 'tutor_timeout',
    llm_model_missing: 'tutor_model_missing', llm_error: 'tutor_model_error',
    llm_configuration: 'tutor_configuration', llm_disabled: 'tutor_disabled' };
  if (map[e.code]) {
    e.code = codes[map[e.code]] || map[e.code];
    if (e.code === 'tutor_unavailable') e.message = 'The local Science model is not reachable from this server.';
    if (e.code === 'tutor_timeout') e.message = 'The local Science model took too long to answer.';
    if (e.code === 'tutor_model_missing') e.message = 'The configured model tag is not installed on the model server.';
  }
  return e;
}

async function generate({ messages, model, temperature, maxTokens, numCtx, timeoutMs, codes }) {
  providerGuard();
  if (!enabled()) {
    const e = new Error('The study model is switched off by the administrator.');
    e.status = 503; e.code = 'llm_disabled';
    throw e;
  }
  if (!Array.isArray(messages) || !messages.length) {
    const e = new Error('Nothing to answer.'); e.status = 400; e.code = 'empty_prompt'; throw e;
  }
  const base = baseUrl();
  const tag = model || modelName();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2000, Number(timeoutMs) || 30000));
  const headers = { 'content-type': 'application/json' };
  const key = String(process.env.UPAY_LOCAL_LLM_KEY || '').trim();
  if (key) headers.authorization = 'Bearer ' + key;
  try {
    let response;
    try {
      response = await fetch(base + '/api/chat', {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          model: tag,
          messages,
          stream: false,
          options: {
            temperature: temperature == null ? 0.2 : temperature,
            num_ctx: numCtx || 4096,
            num_predict: maxTokens || 700
          }
        })
      });
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        const err = new Error('The study model took too long to answer.');
        err.status = 504; err.code = 'llm_timeout'; throw coded(err, codes);
      }
      const err = new Error('The study model is not reachable from this server.');
      err.status = 503; err.code = 'llm_unavailable'; throw coded(err, codes);
    }
    if (!response.ok) {
      const err = new Error(response.status === 404
        ? 'The configured model tag is not installed on the model server.'
        : 'The study model rejected the request.');
      err.status = response.status === 404 ? 503 : 502;
      err.code = response.status === 404 ? 'llm_model_missing' : 'llm_error';
      throw coded(err, codes);
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_OUTPUT) {
      const err = new Error('The study model returned too much data.');
      err.status = 502; err.code = 'llm_error'; throw coded(err, codes);
    }
    let payload;
    try { payload = JSON.parse(text); } catch (_) {
      const err = new Error('The study model returned an unreadable response.');
      err.status = 502; err.code = 'llm_error'; throw coded(err, codes);
    }
    const message = payload && payload.message && typeof payload.message.content === 'string'
      ? payload.message.content
      : (typeof (payload && payload.response) === 'string' ? payload.response : '');
    return { text: String(message || '').trim(), model: tag };
  } finally {
    clearTimeout(timer);
  }
}

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

/* Student-facing status for the UI. Never exposes the model host or key. */
function status() {
  let model = DEFAULT_MODEL, ok = true;
  try { baseUrl(); model = modelName(); if (!enabled()) ok = false; }
  catch (_) { ok = false; }
  let cloudOff = true;
  try { providerGuard(); } catch (_) { cloudOff = false; }
  return { enabled: enabled() && ok && cloudOff, model, host: 'local', note: 'Answers come from the site\u2019s own model; questions stay on the server.' };
}

module.exports = {
  DEFAULT_URL, DEFAULT_MODEL,
  generate, guardQuestion, vocabFor, status, coded,
  baseUrl, modelName, enabled, providerGuard,
  configError
};
