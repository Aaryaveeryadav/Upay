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
    'sum difference numerator denominator divisible divisibility digit digits place value rounding estimation ' +
    /* Class 11-12 Mathematics. Without these the gate refused real homework
       such as "nCr formula" while the student was plainly doing Maths: 67 of
       99 core senior-secondary terms were missing from the original list. */
    'permutation permutations combination combinations binomial sequence series ' +
    'continuity continuous differentiable integral integrals definite indefinite ' +
    'differential conic parabola ellipse hyperbola eccentricity directrix focus vertex ' +
    'complex imaginary argand modulus conjugate discriminant symmetric skew symmetric ' +
    'scalar dot cross direction projection conditional bayes random variance deviation ' +
    'distribution normal bernoulli poisson integrate differentiate antiderivative ' +
    'logarithm exponential codomain composition trigonometric principal amplitude period ' +
    'straight collinear normal approximation curve axis objective feasible constraint ' +
    'optimal programming formula formulae ncr npr factorial notation').split(/\s+/),
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
    'theorem formula equation').split(/\s+/),
  /* Accountancy, Economics, Business Studies, Applied Maths and Sanskrit had
     no entry, so vocabFor() fell back to the SCIENCE list and refused genuine
     questions such as "What is a balance sheet?" as off-syllabus. A subject
     with no words of its own is worse than no guard: it blocks the work the
     student actually has. */
  accountancy: ('account accountancy accounting journal ledger trial balance sheet trading profit loss ' +
    'appropriation partner partnership capital drawings current liabilities assets ' +
    'debit credit voucher cash book bank reconciliation depreciation provision bad debts ' +
    'debtors creditors stock inventory purchase sale sales purchase returns gross net ' +
    'trading manufacturing cash flow statement financial ratio ratios liquidity solvency ' +
    'share shares debenture debentures company companies issue forfeiture premium ' +
    'reserve surplus fund goodwill valuation admission retirement death dissolution ' +
    'realisation realisation executor executor\'s loan interest dividend ' +
    'cost costing material labour overhead marginal absorption budget variance ' +
    'standard contract process joint by-product operating profit ' +
    'gst receivable payable outstanding prepaid accrued income expenditure receipt payment ' +
    'balance carried forward accountancy cbse marks item itemwise workings working note').split(/\s+/),
  economics: ('economy economics micro macro demand supply elasticity utility consumer producer ' +
    'market price cost revenue profit equilibrium monopoly oligopoly competition perfect ' +
    'indifference curve budget line marginal average total fixed variable ' +
    'gdp gnp national income aggregate consumption saving investment multiplier ' +
    'inflation deflation unemployment poverty inequality employment labour workforce ' +
    'money banking central bank commercial credit reserve interest repo ' +
    'fiscal revenue deficit budget taxation tax subsidy government public expenditure ' +
    'balance payment exchange rate foreign trade export import tariff quota ' +
    'development planning sustainable environment resource agriculture industry service ' +
    'sector primary secondary tertiary infrastructure population human capital ' +
    'index number statistics mean median mode dispersion correlation regression ' +
    'probability sampling census collection data presentation diagram graph ' +
    'indian economic development british colonial planning liberalisation globalisation ' +
    'privatisation poverty line food security').split(/\s+/),
  'business-studies': ('business management management organisation organisational ' +
    'planning organising staffing directing controlling coordination delegation ' +
    'authority responsibility accountability span supervision decentralisation ' +
    'departmentalisation formal informal structure leadership motivation ' +
    'maslow herzberg communication barrier barriers ' +
    'marketing product price place promotion branding labelling packaging ' +
    'advertising sales personal selling publicity consumer protection ' +
    'rights responsibilities redressal quality hallmark ' +
    'finance financial capital fixed working requirement ' +
    'share debenture retained earning ploughing dividend ' +
    'stock exchange sebi primary secondary market ' +
    'trade commerce industry sole proprietor partnership company ' +
    'private public sector enterprise multinational joint venture ' +
    'entrepreneur entrepreneurship startup small scale msme ' +
    'social responsibility ethics environment sustainability ' +
    'business studies cbse chapter unit marks').split(/\s+/),
  'applied-maths': ('number numbers integer fraction decimal rational irrational prime composite ' +
    'hcf lcm factor multiple modulo congruence congruence\'s ' +
    'matrix matrices determinant inverse transpose order element ' +
    'equation equations linear quadratic simultaneous inequality ' +
    'function domain range limit continuity derivative derivatives ' +
    'differentiation integration integral integrals differential ' +
    'slope tangent normal maxima minima rate increase decrease ' +
    'application applications probability distribution random variable ' +
    'mean median mode expected variance standard deviation binomial poisson ' +
    'normal index number weighted aggregate base current ' +
    'financial mathematics annuity present value future value ' +
    'compound simple interest instalment perpetuity sinking fund ' +
    'effective rate nominal rate emi loan ' +
    'statistics data sampling correlation regression trend time series ' +
    'linear programming feasible region objective constraint optimisation ' +
    'constraints graph vertex corner point ' +
    'network graph critical path activity node ' +
    'of complete total etc').split(/\s+/),
  /* English as a taught subject is grammar AND literature. The list was
     grammar only (73 words), so every real literature question -- "How does
     Franz view his last lesson?", "What is the theme of the poem?" -- was
     refused as off-syllabus. These are the words the textbook questions
     actually use. */
  'english-literature': ('theme themes plot character characters narrator author poet speaker ' +
    'story stories lesson lessons text extract passage line lines stanza ' +
    'tone mood irony satire imagery symbol symbols metaphor simile ' +
    'setting scene act drama play prose poetry poem ' +
    'describe explain analyse analyze discuss compare contrast comment ' +
    'attitude view views opinion feelings message moral central idea ' +
    'title ending beginning twist climax conflict resolution ' +
    'refer context quote evidence support justify ' +
    'franz valli mukesh m. hamel saheb kalam aiyar bismillah khan ' +
    'anne frank helen keller salvatore walter hudson ' +
    'flamingo vistas kaleidoscope first flight footprints ' +
    'prose poetry reading comprehension writing letter notice report grammar ' +
    'tense tenses voice active passive speech reported direct indirect ' +
    'clause phrase noun pronoun verb adjective adverb preposition conjunction ' +
    'meaning synonym antonym sentence paragraph essay article diary entry ' +
    'studies indicate that').split(/\s+/),
  sanskrit: ('sanskrit संस्कृत shabda dhatu dhatu रूप रुप sandhi samasa samaas ' +
    /* सन्धि (conjunct) and संधि (anusvara) are the same word written two ways;
       a student may type either, and the syllabus chapter uses both. */
    'vibhakti karak kaarak pratyaya समास संधि सन्धि कारक विभक्ति प्रत्यय ' +
    'shlok shloka श्लोक gadyam padyam gadya padya prose poetry ' +
    'anuvad अनुवाद translation nirmana rachna रचना निर्माण ' +
    'patram पत्रम् chitram चित्रम् vartalap संवादः ' +
    'साहित्य literature sahitya lekhanam लेखनम् ' +
    /* Chapter and text names a student types to ask about them. The vocabulary
       test is the difference between answering "शुचिपर्यावरणम्" and refusing
       it as off-topic on a site that teaches it. */
    'shemushi vyakaranavithi शुचिपर्यावरणम् वातावरणम् पर्यावरण ' +
    'बुद्धिर्बलवती शेमुषी').split(/\s+/)
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

/* The reviewed vocabulary lists are written in their natural spelling
   ("resources", "planning"), but guardQuestion compares them against *stemmed*
   tokens from lib/science-rag.js — "resources" becomes "resourc". The two never
   matched, so a real Social Science question ("What is resource planning?") was
   refused as off-syllabus while the list actually contained the word. Stemming
   both sides makes the lookup what it was meant to be.

   cache: vocabFor is called on every gated question, and stemming a 5,367-word
   set on each call would be wasteful. */
const VOCAB_CACHE = new Map();
function stemmedSet(list) {
  const out = new Set();
  for (const word of list || []) {
    const stem = require('./science-rag.js').normalizeWord(String(word).toLowerCase());
    if (stem) out.add(stem);
    /* Keep the original too: a proper noun or an acronym ("nCr", "Mandela")
       can be typed exactly as listed and must still match. */
    out.add(String(word).toLowerCase());
  }
  return out;
}

function vocabFor(scope) {
  const subject = String(scope && scope.subject || 'science').toLowerCase();
  const cls = Number(scope && scope.class) || 0;
  const key = subject + ':' + cls;
  if (VOCAB_CACHE.has(key)) return VOCAB_CACHE.get(key);

  let vocab;
  if (subject === 'science' || subject === 'physics' || subject === 'chemistry' || subject === 'biology') {
    vocab = scienceVocab();
  } else if (subject === 'english') {
    /* English is grammar AND literature: the literature words were kept under
       their own key, so merge them for the 'english' subject rather than
       maintaining two lists that can drift apart. */
    vocab = stemmedSet([].concat(OTHER_SUBJECT_WORDS.english || [], OTHER_SUBJECT_WORDS['english-literature'] || []));
  } else {
    vocab = stemmedSet(OTHER_SUBJECT_WORDS[subject] || OTHER_SUBJECT_WORDS.science);
  }
  VOCAB_CACHE.set(key, vocab);
  return vocab;
}

function isFormulaLike(text) {
  // "Fe + O2 -> Fe2O3", "2H2 + O2 → 2H2O", "x^2 + 5x + 6 = 0"
  return /[=→\u2192>]/.test(text) && /[A-Za-z0-9)\]]/.test(text) && text.split(/\s+/).length <= 20
    && /\b[A-Z][a-z]?\d*\b|\d+\s*[A-Za-z]/.test(text);
}

/* How many leading characters two Devanagari words share, counted by Unicode
   code point (a combining vowel sign is its own code point, and the script
   encodes inflections there). Used only to recognise an inflected form of a
   reviewed word, never to compare Latin text. */
function sharedDevanagariPrefix(a, b) {
  const A = Array.from(String(a || '')), B = Array.from(String(b || ''));
  let n = 0;
  while (n < A.length && n < B.length && A[n] === B[n]) n++;
  return n;
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
  /* The tokeniser returns [] for a Devanagari-only question (it matches
     [A-Za-z0-9] only), and the old code then reported "no tokens" as
     off_topic. That refused *every* Hindi and Sanskrit question before the
     vocabulary test ever ran - "सन्धिं कुरुत" and "कबीर की साखी का भावार्थ"
     both came back off_topic on a site that teaches both subjects. Splitting
     the script on whitespace keeps words like सन्धिं / कुरुत so the reviewed
     Hindi and Sanskrit lists (which are Devanagari) can match them. */
  const tokens = nonLatin
    ? lower.replace(/[?.,;:!()[\]{}"'`\u2018\u2019\u201c\u201d\u0964\u0965+—–-]/g, ' ')
        .split(/\s+/).filter(t => t.length >= 2)
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
    /* Devanagari compounds carry case endings (सन्धि + िं, साखी + का), so a
       reviewed word is usually a *prefix* of the inflected token rather than
       equal to it. The original check only tried `t.startsWith(w)`, which
       misses the common direction - "सन्धिं" begins with "सन्धि" only after the
       vowel sign, and "साखी" is not a prefix of "साखीका". Comparing a shared
       Devanagari prefix of at least 3 characters catches the inflected form
       without letting "राम" match "रामायण" style unrelated words through. */
    if (nonLatin) {
      for (const w of vocab) {
        if (w.length < 3) continue;
        if (t.startsWith(w) || w.startsWith(t)) { hits++; break; }
        if (sharedDevanagariPrefix(t, w) >= 3) { hits++; break; }
      }
    }
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
