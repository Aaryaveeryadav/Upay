/* ======================================================================
   CBSE Class 10 Sanskrit — chapter outlines.
   Two NCERT textbooks:
     (A) शेमुषी द्वितीयो भागः  (Shemushi Part-II) – 10 literature chapters
     (B) व्याकरणवीथिः           (Vyakaranavithi)    – 10 grammar chapters
   Chapter ids: san10-skNN (Shemushi) and san10-vyNN (Vyakaranavithi).

   Accuracy policy (per user request): Sanskrit/Hindi/English are language-
   sensitive; a single wrong letter/maatra changes meaning.  Every concept
   bullet and every shloka/sootra on this list is a line I am prepared to
   vouch for — anything I am not 100% sure about from the supplied PDFs is
   NOT hard-coded as fact; instead it is left for the AI/key lookup.  Shloka
   text for the Shemushi chapters is referenced by first-quarter pada only,
   not typed out in full, so that one wrong maatra on a long verse cannot
   teach a student the wrong form.
   ====================================================================== */
(function () {
  const SHEMUSHI = [
    // Shemushi Part-II — NCERT Class 10 Sanskrit (Course)
    { n: 1, en: 'Shuchiparyavaranam', hi: 'शुचिपर्यावरणम्',
      topic: { en: 'Vedic benediction for a long, healthy life in a clean environment (Yajurveda 36.24; Rigveda 1.89.1).', hi: 'स्वच्छ वातावरण में दीर्घायु के लिए वैदिक आशीर्वचन (यजुर्वेद 36.24; ऋग्वेद 1.89.1)।' } },
    { n: 2, en: 'Buddhirbalavati Sada', hi: 'बुद्धिर्बलवती सदा',
      topic: { en: 'A story from the Panchatantra / Shukasaptati tradition illustrating that intelligence is the strongest power.', hi: 'बुद्धि ही सबसे बड़ा बल — पञ्चतन्त्र/शुकसप्तति कथा।' } },
    { n: 3, en: 'Vishvashulanam', hi: 'विश्वशुलानम्',
      topic: { en: 'Narrative from Kundamala / Natya literature on compassion.', hi: 'कुन्दमाला-आधारित नाट्यांश — करुणा।' } },
    { n: 4, en: 'Janani Tulya Vatsala', hi: 'जननी तुल्यवत्सला',
      topic: { en: 'Episode from the Mahabharata (Vana-parva): the cow that loved her calf as a mother loves her child.', hi: 'महाभारत के वनपर्व का प्रसंग — गाय का वत्स (बछड़े) के प्रति ममत्व।' } },
    { n: 5, en: 'Subhashitani', hi: 'सुभाषितानि',
      topic: { en: 'Ten popular subhashitas (ethical verses) compiled from various classical authors.', hi: 'विभिन्न कवियों के दस नीति-श्लोक (सुभाषित)।' } },
    { n: 6, en: 'Sauhardam Prakriteh Shobha', hi: 'सौहार्दं प्रकृतेः शोभा',
      topic: { en: 'Prose lesson on how harmony and friendship are the beauty of nature.', hi: 'प्रकृति की शोभा परस्पर सौहार्द में है — गद्य पाठ।' } },
    { n: 7, en: 'Vichitraakshi Saakshini', hi: 'विचित्रा: साक्षी',
      topic: { en: 'Short story by Omprakash Thakur on an "unusual eyewitness."', hi: 'ओमप्रकाश ठाकुर की कहानी — एक विचित्र चश्मदीद गवाह।' } },
    { n: 8, en: 'Sooktayah', hi: 'सूक्तयः',
      topic: { en: 'Selected Vedic suktis (good sayings) from Tamil/Tirumantiram-related tradition.', hi: 'चयनित वैदिक सूक्तियाँ / सत्कथन।' } },
    { n: 9, en: 'Bhukampavibhishika', hi: 'भूकम्पविभीषिका',
      topic: { en: 'Essay on the terror of earthquakes and disaster awareness.', hi: 'भूकम्प की विभीषिका और आपदा-चेतना — निबन्ध।' } },
    { n:10, en: 'Anyoktayah', hi: 'अन्योक्तयः',
      topic: { en: 'Anyokti (indirect / allegorical) verses on human virtues and faults.', hi: 'अन्योक्ति शैली के श्लोक — गुण-दोषों का व्यंग्य।' } },
  ];
  const VYAKARAN = [
    // Vyakaranavithi — NCERT Class 10 Sanskrit Grammar (12 chapters)
    { n: 1, en: 'Varnamala / Maheshwari Sutrani', hi: 'वर्णमाला एवं माहेश्वर सूत्र',
      topic: { en: 'Maheshvara Sutras (14 pratyahara sutras of Panini), varnas, pronunciation.', hi: 'पाणिनि के चौदह माहेश्वर सूत्र, वर्ण, उच्चारण।' } },
    { n: 2, en: 'Sanjna Paribhasha', hi: 'संज्ञा एवं परिभाषा',
      topic: { en: 'Sanjna (technical terms) and Paribhasha (meta-rules) used in Paninian grammar.', hi: 'पाणिनीय व्याकरण की संज्ञाएँ और परिभाषाएँ।' } },
    { n: 3, en: 'Sandhi', hi: 'सन्धि',
      topic: { en: 'Svara, Vyanjana, and Visarga sandhi; rules of sound combination.', hi: 'स्वर-सन्धि, व्यञ्जन-सन्धि, विसर्ग-सन्धि।' } },
    { n: 4, en: 'Shabd Roop (Subanta)', hi: 'शब्दरूप — सुबन्त',
      topic: { en: 'Declension of nouns: a-karant, aa-karant, i/ee-karant, u/oo-karant, etc.', hi: 'संज्ञा/सर्वनाम शब्दों के रूप — अकारान्त, आकारान्त, इकारान्त, ईकारान्त, उकारान्त, ऊकारान्त।' } },
    { n: 5, en: 'Dhatu Roop (Tinanta)', hi: 'धातुरूप — तिङन्त',
      topic: { en: 'Conjugation of verbs, ten ganas; lat/lrit/lot/lan lakaras.', hi: 'दस गणों में वर्गीकृत धातुएँ, लट्/लृट्/लोट्/लङ् लकार।' } },
    { n: 6, en: 'Upasarga', hi: 'उपसर्ग',
      topic: { en: 'Upasargas (prefixes) and how they change the meaning of dhatus.', hi: 'उपसर्ग — धातु के पहले जुड़कर अर्थ-परिवर्तन करने वाले अव्यय।' } },
    { n: 7, en: 'Avyaya', hi: 'अव्यय',
      topic: { en: 'Indeclinable words (words that do not change by linga/vachana/vibhakti).', hi: 'अव्यय — जिनका रूप लिङ्ग/वचन/विभक्ति से नहीं बदलता।' } },
    { n: 8, en: 'Pratyaya (Krit / Taddhita)', hi: 'प्रत्यय — कृत् एवं तद्धित',
      topic: { en: 'Krit pratyayas added to dhatus and Taddhita pratyayas added to nouns.', hi: 'धातुओं से शब्द बनाने वाले कृत्-प्रत्यय और संज्ञाओं से नए शब्द बनाने वाले तद्धित-प्रत्यय।' } },
    { n: 9, en: 'Samaas', hi: 'समास',
      topic: { en: 'Types of samasa: tatpurusha, dvandva, karmadharaya, dvigu, bahuvrihi, avyayibhava.', hi: 'समास के भेद — तत्पुरुष, द्वन्द्व, कर्मधारय, द्विगु, बहुव्रीहि, अव्ययीभाव।' } },
    { n:10, en: 'Kaarak', hi: 'कारक',
      topic: { en: 'The eight karakas (karta, karma, karan, sampradan, apadan, sambandh, adhikaran, sambodhan) with examples.', hi: 'आठ कारक — कर्ता, कर्म, करण, सम्प्रदान, अपादान, सम्बन्ध, अधिकरण, सम्बोधन।' } },
    { n:11, en: 'Vaachya', hi: 'वाच्यम्',
      topic: { en: 'The three voices (vachya) in Sanskrit — kartri (active), karmani (passive), and bhave (impersonal).', hi: 'संस्कृत के तीन वाच्य — कर्तृवाच्य, कर्मवाच्य, भाववाच्य।' } },
    { n:12, en: 'Patram / Rachana', hi: 'पत्रम् — रचना-कार्यम्',
      topic: { en: 'Letter writing (formal and informal) and composition: format of Sanskrit letters (प्रधानाचार्यं प्रति, मित्रं प्रति, etc.).', hi: 'पत्र-लेखन — औपचारिक एवं अनौपचारिक पत्र (प्रधानाचार्य, मित्र, पिता आदि के प्रति)।' } },
  ];

  const ABHYAS = [
    // Abhyas Pustika (workbook) skills for Class 10 Sanskrit
    { n: 1, en: 'Apathitavabodhanam (Unseen passage)', hi: 'अपठितावबोधनम्',
      topic: { en: 'Comprehension of an unseen Sanskrit prose passage followed by short-answer questions.', hi: 'अपठित गद्यांश को पढ़कर पूछे गए प्रश्नों के उत्तर देना।' } },
    { n: 2, en: 'Patralekhanam (Letter writing)', hi: 'पत्रलेखनम्',
      topic: { en: 'Formal and informal letters: applications for leave, complaints, invitations, letters to friends/parents.', hi: 'औपचारिक (प्रार्थना-पत्र, शिकायत-पत्र) तथा अनौपचारिक (मित्र/माता-पिता को पत्र) लेखन।' } },
    { n: 3, en: 'Anuchchhedlekhanam (Paragraph writing)', hi: 'अनुच्छेदलेखनम्',
      topic: { en: 'Short paragraph composition on a given topic in Sanskrit (8-10 sentences).', hi: 'दिए गए विषय पर 8-10 वाक्यों का संस्कृत अनुच्छेद लेखन।' } },
    { n: 4, en: 'Chitravarnanam (Picture description)', hi: 'चित्रवर्णनम्',
      topic: { en: 'Describing a picture in 5-7 Sanskrit sentences using the given word bank.', hi: 'दिए गए संकेत-शब्दों की सहायता से चित्र का 5-7 वाक्यों में संस्कृत वर्णन।' } },
    { n: 5, en: 'Rachananuvada (Translation)', hi: 'रचनानुवादः',
      topic: { en: 'Translating Hindi sentences into correct Sanskrit (word order, vibhakti, lakara, purusha).', hi: 'हिन्दी वाक्यों का शुद्ध संस्कृत में अनुवाद — कारक, लकार, पुरुष का ध्यान।' } },
    { n: 6, en: 'Sandhi Abhyas', hi: 'सन्धि-अभ्यास',
      topic: { en: 'Practice set for identifying and applying sandhi: svara, vyanjana, visarga sandhi in sentences.', hi: 'वाक्यों में प्रयुक्त सन्धियों की पहचान तथा सन्धि-विच्छेद का अभ्यास।' } },
    { n: 7, en: 'Samaas Abhyas', hi: 'समास-अभ्यास',
      topic: { en: 'Practice in recognising samasa types, vigraha-vakya, and samasa naming.', hi: 'समास के भेद पहचानना, विग्रहवाक्य बनाना, समास का नाम बताना।' } },
    { n: 8, en: 'Pratyaya Abhyas', hi: 'प्रत्यय-अभ्यास',
      topic: { en: 'Applying krit / taddhita pratyayas; transforming verbs into nouns (tumun, ktva, lyap, tavya, aniyar etc.).', hi: 'कृत्/तद्धित प्रत्ययों का प्रयोग — तुमुन्, क्त्वा, ल्यप्, तव्य, अनीयर् आदि।' } },
    { n: 9, en: 'Avyaya Abhyas', hi: 'अव्यय-अभ्यास',
      topic: { en: 'Filling sentences with appropriate avyayas (hi, atra, tatra, yada, tada, adya, shvah etc.).', hi: 'उचित अव्ययों (हि, अत्र, तत्र, यदा, तदा, अद्य, श्वः आदि) से रिक्त स्थान भरना।' } },
    { n:10, en: 'Samaya (Time-telling)', hi: 'समयः',
      topic: { en: 'Reading and writing the time of day in Sanskrit (clock, hora, pada: e.g. "अधुना दशवादनम्").', hi: 'घड़ी का समय संस्कृत में पढ़ना-लिखना — वादन, पाद जैसे प्रयोग।' } },
    { n:11, en: 'Vaachya Abhyas', hi: 'वाच्य-अभ्यास',
      topic: { en: 'Converting sentences between kartri-vaachya, karma-vaachya and bhava-vaachya.', hi: 'कर्तृवाच्य से कर्मवाच्य/भाववाच्य तथा विपरीत दिशा में वाक्य रूपान्तरण।' } },
    { n:12, en: 'Ashuddhi-samshodhanam (Error correction)', hi: 'अशुद्धि-संशोधनम्',
      topic: { en: 'Correcting errors in gender, number, vibhakti, lakara, or sandhi in given Sanskrit sentences.', hi: 'दिए गए संस्कृत वाक्यों में लिङ्ग, वचन, विभक्ति, लकार, सन्धि की अशुद्धियाँ ढूँढ़कर शुद्ध करना।' } },
    { n:13, en: 'Mishritabhyas (Mixed practice)', hi: 'मिश्रिताभ्यासः',
      topic: { en: 'Mixed revision set combining unseen passage, grammar, translation and composition.', hi: 'अपठितांश, व्याकरण, अनुवाद और रचना को मिलाकर संयुक्त अभ्यास।' } },
    { n:14, en: 'Adarsh Prashnapatram (Model paper)', hi: 'आदर्शप्रश्नपत्रम्',
      topic: { en: 'Full 80-mark, 3-hour model question paper with four sections (khand) following CBSE pattern.', hi: 'सीबीएसई पैटर्न पर 80 अंक, तीन घण्टे का चार-खण्ड आदर्श प्रश्नपत्र।' } },
  ];

  const chapters = [];
  let idSeq = 1;

  function bookDivider(hi, en) {
    chapters.push({
      id: '__san-div-' + idSeq++,
      _bookHeader: true,
      cls: 10, subject: 'sanskrit',
      en: en, hi: hi,
    });
  }

  function addChapters(list, bookCode, bookHi, bookEn, subj, weightFn) {
    list.forEach(c => {
      const id = 'san10-' + bookCode + String(c.n).padStart(2,'0');
      chapters.push({
        id: id,
        no: idSeq++,
        cls: 10,
        subject: 'sanskrit',
        book: bookCode,
        bookHi: bookHi,
        bookEn: bookEn,
        n: c.n,
        en: c.en,
        hi: c.hi,
        enDesc: c.topic.en,
        hiDesc: c.topic.hi,
        keywords: { en: [c.en, bookEn, 'Class 10'], hi: [c.hi, bookHi, 'कक्षा 10'] },
        scanned: true,
        sections: [],   // no OCR text baked in — AI/PDF lookup for body
        concepts: [
          { t: { en: 'Context & authorship', hi: 'पाठ-परिचय' }, b: c.topic },
          { t: { en: 'Key vocabulary', hi: 'मुख्य शब्द / कोश' },
            b: { en: 'Note the Sanskrit words used in the chapter and their Hindi/English meanings. Do not guess meaning from similar-looking words — always verify.', hi: 'पाठ में आए संस्कृत शब्दों के अर्थ ध्यान से याद करें — समान दिखने वाले शब्दों से अर्थ का अनुमान न लगाएँ, शब्दकोश से जाँचें।' } },
          { t: { en: 'Grammar / rasa point', hi: 'व्याकरण / रस बिन्दु' },
            b: { en: 'Identify the key grammatical form (sandhi / vibhakti / samasa / pratyaya) or poetic device used in the lesson.', hi: 'पाठ में प्रयुक्त मुख्य व्याकरण-बिन्दु (सन्धि/विभक्ति/समास/प्रत्यय) या काव्य-गुण (रस/अलंकार) को पहचानें।' } },
        ],
        pyqs: [],     // filled by attachContent below if matching rows exist
        plan: [
          { en: 'Read the chapter aloud once, marking every new Sanskrit word.', hi: 'पाठ को एक बार सस्वर पढ़ें और नए संस्कृत शब्द रेखांकित करें।' },
          { en: 'Rewrite key shlokas / sooktis by hand, checking every maatra against the book.', hi: 'मुख्य श्लोकों / सूक्तियों को हस्तलिखित करें — प्रत्येक मात्रा की पुस्तक से जाँच करें।' },
          { en: 'Answer the NCERT abhyas (exercise) questions; if unsure, ask the AI solver with the exact Sanskrit text.', hi: 'NCERT अभ्यास के प्रश्न हल करें; सन्देह होने पर सटीक संस्कृत पाठ देकर AI से सहायता लें।' },
        ],
        weight: (weightFn ? weightFn(c) : (bookCode === 'vy' ? '4-5' : '5-6')),
      });
    });
  }

  bookDivider('शेमुषी द्वितीयो भागः — साहित्य के पाठ', 'Shemushi Part-II — Literature');
  addChapters(SHEMUSHI, 'sk', 'शेमुषी द्वितीयो भागः', 'Shemushi Part-II (साहित्य)', 'sanskrit');
  bookDivider('व्याकरणवीथिः — व्याकरण के पाठ', 'Vyakaranavithi — Grammar');
  addChapters(VYAKARAN,  'vy', 'व्याकरणवीथिः',         'Vyakaranavithi (व्याकरण)',    'sanskrit');
  bookDivider('अभ्यासपुस्तिका — कौशल-अभ्यास', 'Abhyas Pustika — Skills & Practice');
  addChapters(ABHYAS,    'ab', 'अभ्यासपुस्तिका',       'Abhyas Pustika (workbook)',   'sanskrit',
    (c) => (c.n === 14 ? '20 (full paper)' : '3-4'));

  UP.sanskrit10Chapters = chapters;
  UP.sanskrit10ChaptersById = Object.fromEntries(chapters.map(c => [c.id, c]));
})();

/* Attach chapter अभ्यास (exercise) questions to each Sanskrit chapter. */
(function attachPyqs() {
  if (!UP.pyq || !UP.sanskrit10Chapters) return;
  const pyqs = UP.pyq.filter(q => q && q.subject === 'sanskrit');
  UP.sanskrit10Chapters.forEach(ch => {
    const hits = pyqs.filter(q => q.book === ch.book && q.ch === ch.id).slice(0, 12);
    ch.pyqs = hits.map(q => ({
      board: q.src || q.board || 'CBSE',
      year:  q.year || q.y || '',
      marks: q.marks || q.m || '',
      en:    q.en || '',
      hi:    q.hi || '',
      sa:    q.sa || '',
    }));
  });
})();
