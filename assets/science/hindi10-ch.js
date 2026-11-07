/* ================================================================
   Upay · CBSE Class 10 Hindi (Course-B) — chapter outline
   Four NCERT textbooks: क्षितिज, स्पर्श, संचयन, कृतिका.
   Chapter ids: hind10-bKK-NN where KK is book (ks=क्षितिज, sp=स्पर्श,
   sy=संचयन, kr=कृतिका) and NN is the chapter number within that book.
   ================================================================ */
window.UP = window.UP || {};

(function () {
  // book codes -> (prefix for file matching, Hindi book name, English)
  const BOOKS = {
    ks: { hi: 'क्षितिज भाग-2',  en: 'Kshitij Part-2' },
    sp: { hi: 'स्पर्श भाग-2',   en: 'Sparsh Part-2' },
    sy: { hi: 'संचयन भाग-2',   en: 'Sanchayan Part-2' },
    kr: { hi: 'कृतिका भाग-2',  en: 'Kritika Part-2' }
  };

  // Chapter table: [book, n, hindi title, author hi]
  const RAW = [
    // ---- क्षितिज (Kshitij) — 17 chapters ----
    ['ks',1,'सूरदास के पद','सूरदास'],
    ['ks',2,'तुलसीदास के पद','तुलसीदास'],
    ['ks',3,'देव के सबद','देव'],
    ['ks',4,'जयशंकर प्रसाद — आत्मकथ्य','जयशंकर प्रसाद'],
    ['ks',5,'सूर्यकांत त्रिपाठी \"निराला\" — उत्साह / अट नहीं रही','सूर्यकांत त्रिपाठी निराला'],
    ['ks',6,'नागार्जुन — दंतुरित मुसकान / फसल','नागार्जुन'],
    ['ks',7,'मंगलेश डबराल — संगतकार','मंगलेश डबराल'],
    ['ks',8,'स्वयं प्रकाश — छाया मत छूना / यह दंतुरित मुसकान','स्वयं प्रकाश'],
    ['ks',9,'रामविलास शर्मा — कन्यादान','रामविलास शर्मा'],
    ['ks',10,'यशपाल — बालगोबिन भगत','यशपाल'],
    ['ks',11,'मन्नू भंडारी — लेखक का तोता','मन्नू भंडारी'],
    ['ks',12,'यतीन्द्र मिश्र — न मेरी हुई न तुम्हारी','यतीन्द्र मिश्र'],
    ['ks',13,'भदंत आनंद कौसल्यायन — कहाँ चले?','भदंत आनंद कौसल्यायन'],
    // 14-17 are missing from supplied uploads; placeholders so ids stay stable
    ['ks',14,'रसखान के पद','रसखान'],
    ['ks',15,'मीरा के पद','मीराबाई'],
    ['ks',16,'ऋतुराज — यह दंतुरित मुसकान','ऋतुराज'],
    ['ks',17,'रामधारी सिंह \"दिनकर\" — कोइला','रामधारी सिंह दिनकर'],

    // ---- स्पर्श (Sparsh) — 17 chapters ----
    ['sp',1,'अज्ञेय — कबीर / साखी','अज्ञेय (साखी संग्रह)'],
    ['sp',2,'मीरा — पद','मीराबाई'],
    ['sp',3,'मैथिलीशरण गुप्त — संदेश','मैथिलीशरण गुप्त'],
    ['sp',4,'सुमित्रानंदन पंत — पर्वत प्रदेश में पावस','सुमित्रानंदन पंत'],
    ['sp',5,'वीरेन डंगवाल — तोप','वीरेन डंगवाल'],
    ['sp',6,'कैफ़ी आज़मी — कर चले हम फ़िदा','कैफ़ी आज़मी'],
    ['sp',7,'रवीन्द्रनाथ ठाकुर — आत्मत्राण','रवीन्द्रनाथ टैगोर'],
    ['sp',8,'रामविलास शर्मा — बड़े भाई साहब','रामविलास शर्मा'],
    ['sp',9,'सीताराम सेकसरिया — डायरी का एक पन्ना','सीताराम सेकसरिया'],
    ['sp',10,'लीलाधर मंडलोई — तताँरा-वामीरो कथा','लीलाधर मंडलोई'],
    ['sp',11,'प्रह्लाद अग्रवाल — तीसरी कसम के शिल्पकार शैलेंद्र','प्रह्लाद अग्रवाल'],
    ['sp',12,'निदा फ़ाज़ली — अब कहाँ दूसरे के दुख से दुखी होने वाले','निदा फ़ाज़ली'],
    ['sp',13,'जॉन वेंसलकार — पतझर में टूटी पत्तियाँ','जॉन वेंसलकार'],
    ['sp',14,'हबीब तनवीर — कारतूस','हबीब तनवीर'],
    ['sp',15,'(रहिका) —',''],
    ['sp',16,'(रहिका) —',''],
    ['sp',17,'(रहिका) —',''],

    // ---- संचयन (Sanchayan) — 3 chapters ----
    ['sy',1,'हरिहर काका','मिथिलेश्वर'],
    ['sy',2,'सपनों के-से दिन','गुरदयाल सिंह'],
    ['sy',3,'टोपी शुक्ला','संजीव'],

    // ---- कृतिका (Kritika) — 5 chapters ----
    ['kr',1,'माता का आँचल','शिवपूजन सहाय'],
    ['kr',2,'जॉर्ज पंचम की नाक','जॉर्ज पंचम (कामतानाथ)'],
    ['kr',3,'साना-साना हाथ जोड़ो','मधु कांकरिया'],
    ['kr',4,'एही ठैयाँ झुलनी हेरानी हो रामा!','संजीदा'],
    ['kr',5,'मैं क्यों लिखता हूँ?','अज्ञेय'],
  ];

  const chapters = [];
  const byId = {};
  let idSeq = 1;
  for (const [bk, n, hi, author] of RAW) {
    const book = BOOKS[bk];
    const id = 'hind10-' + bk + String(n).padStart(2,'0');
    const row = {
      id: id,
      no: idSeq++,
      cls: 10,
      subject: 'hindi',
      book: bk,
      bookHi: book.hi,
      bookEn: book.en,
      n: n,
      en: hi,            // Hindi title is the canonical title; no English supplied
      hi: hi,
      author: author,
      exNo: null,
      scanned: true,
      sections: [{ en: hi, hi: hi }],
      activities: [],
      exercises: [],
      summary: { en: '', hi: '' },
      figures: [],
      exOpts: []
    };
    chapters.push(row);
    byId[id] = row;
  }
  UP.hindi10Chapters = chapters;
  UP.hindi10ChaptersById = byId;
})();

/* Post-process: attach pyqs/concepts/plan onto Hindi-B chapters so the
   main (non-RBSE) viewChapter renderer has something to show. The sections
   branch also now works safely, but we want the same tabs UX as other subjects. */
(function attachContent() {
  if (typeof UP === 'undefined' || !UP.hindi10Chapters) return;
  const pyqs = (UP.pyq || []).filter(q => q && q.subject === 'hindi' && (q.course === 'B' || q.course === 'b' || !q.course));
  UP.hindi10Chapters.forEach(ch => {
    const title = (ch.hi || ch.en || '').toLowerCase();
    // Match PYQs: either tagged ch==n+book or containing the chapter title/author
    const hits = pyqs.filter(q => {
      if (q.book === ch.book && +q.ch === ch.n) return true;
      const hay = ((q.hi || '') + ' ' + (q.en || '')).toLowerCase();
      if (ch.author && hay.includes(ch.author.toLowerCase()) && hay.length < 400) return true;
      return false;
    }).slice(0, 6);
    ch.pyqs = hits.map(q => ({
      board: q.src || q.board || 'CBSE',
      year: q.year || '',
      marks: q.marks || (q.m ? q.m + '' : ''),
      en: q.en || '',
      hi: q.hi || '',
    }));
    ch.keywords = { en: [ch.author, ch.bookEn || ''], hi: [ch.author, ch.bookHi || ''] };
    ch.hiDesc = `${ch.author} रचित ${ch.hi} — ${ch.bookHi} का पाठ ${ch.n}।`;
    ch.enDesc = `${ch.hi} by ${ch.author} — ${ch.bookEn} chapter ${ch.n}.`;
    ch.concepts = [
      { t: { en: 'Author & context', hi: 'रचनाकार और परिचय' }, b: { en: ch.author + ' — key poet/writer of the Hindi (Course-B) syllabus.', hi: (ch.author || '') + ' — हिंदी (कोर्स-ब) पाठ्यक्रम के प्रमुख रचनाकार।' } },
      { t: { en: 'Central theme', hi: 'मुख्य भाव' }, b: { en: 'Identify the central emotion/message of the chapter and prepare a 3–4 line summary.', hi: 'पाठ के मुख्य भाव और संदेश को 3–4 पंक्तियों में सारांशित करें।' } },
      { t: { en: 'Important extracts', hi: 'महत्वपूर्ण अंश' }, b: { en: 'Re-read highlighted verses/paragraphs; board exams often ask comprehension from these.', hi: 'महत्वपूर्ण पद्यांशों/गद्यांशों को दोहराएँ — बोर्ड प्रश्न प्रायः इन्हीं से आते हैं।' } },
    ];
    ch.plan = [
      { en: 'Read the chapter once for gist, marking unknown words.', hi: 'पाठ को एक बार सारांश के लिए पढ़ें और कठिन शब्द रेखांकित करें।' },
      { en: 'Revise summaries + question-answers from NCERT; memorize author intro.', hi: 'NCERT के प्रश्नोत्तर दोहराएँ; लेखक परिचय कंठस्थ करें।' },
      { en: 'Attempt the PYQs below in writing and self-check with textbook language.', hi: 'नीचे दिए गए PYQ लिखकर हल करें और पाठ्यपुस्तक की भाषा से जाँचें।' },
    ];
    ch.weight = ch.n <= 9 ? '5-6' : '3-4';
  });
})();
