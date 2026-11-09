/* =====================================================================
   Upay · Boards, books, classes 11–12 and Class 10 Science outline
   ===================================================================== */
window.UP = window.UP || {};

UP.classes = [
  { id: 10, en: "Class 10", hi: "कक्षा 10", subjects: ["maths", "science", "social", "hindi", "english", "sanskrit"] },
  { id: 11, en: "Class 11", hi: "कक्षा 11", subjects: ["maths", "physics", "chemistry", "biology"] },
  { id: 12, en: "Class 12", hi: "कक्षा 12", subjects: ["maths", "applied-maths", "physics", "chemistry", "biology", "accountancy", "computerized-accounting", "economics", "business-studies", "english"] }
];

UP.subjects = {
  maths: { en: "Mathematics", hi: "गणित", icon: "sigma" },
  "applied-maths": { en: "Applied Mathematics", hi: "व्यावहारिक गणित", icon: "calc" },
  science: { en: "Science", hi: "विज्ञान", icon: "flask" },
  hindi: { en: "Hindi (Course-B)", hi: "हिंदी (ब)", icon: "book" },
  english: { en: "English", hi: "अंग्रेज़ी", icon: "book" },
  social:  { en: "Social Science", hi: "सामाजिक विज्ञान", icon: "globe" },
  sanskrit:{ en: "Sanskrit",      hi: "संस्कृत",       icon: "book" },
  physics: { en: "Physics", hi: "भौतिकी", icon: "atom" },
  chemistry: { en: "Chemistry", hi: "रसायन विज्ञान", icon: "beaker" },
  biology: { en: "Biology", hi: "जीव विज्ञान", icon: "leaf" },
  accountancy: { en: "Accountancy", hi: "लेखाशास्त्र", icon: "calc" },
  "computerized-accounting": { en: "Computerized Accounting · Option II", hi: "कम्प्यूटरीकृत लेखांकन · विकल्प II", icon: "laptop" },
  economics: { en: "Economics", hi: "अर्थशास्त्र", icon: "globe" },
  "business-studies": { en: "Business Studies", hi: "व्यवसाय अध्ययन", icon: "book" }
};

UP.boards = [
  { id: "cbse", en: "CBSE", hi: "सीबीएसई", full: { en: "Central Board of Secondary Education", hi: "केंद्रीय माध्यमिक शिक्षा बोर्ड" },
    pattern: { en: "80 marks theory + 20 internal · competency-based questions included since 2020", hi: "80 अंक सैद्धांतिक + 20 आंतरिक · 2020 से दक्षता-आधारित प्रश्न" },
    note: { en: "Past-paper questions in this app are labelled with CBSE year tags.", hi: "इस ऐप के पिछले प्रश्न CBSE वर्ष-टैग के साथ दिए हैं।" },
    on: true },
  { id: "icse", en: "ICSE / CISCE", hi: "आईसीएसई / सीआईएससीई", full: { en: "Council for the Indian School Certificate Examinations", hi: "भारतीय विद्यालय प्रमाणपत्र परीक्षा परिषद" },
    pattern: { en: "80 marks theory + 20 internal · more application-based long questions", hi: "80 अंक सैद्धांतिक + 20 आंतरिक · अधिक अनुप्रयोग-आधारित दीर्घ प्रश्न" },
    note: { en: "Chapter names are close to NCERT but sequence differs; use the chapter map.", hi: "अध्यायों के नाम NCERT के निकट हैं पर क्रम भिन्न है; अध्याय-नक्शा देखिए।" } },
  { id: "maharashtra", en: "Maharashtra Board", hi: "महाराष्ट्र बोर्ड", full: { en: "Maharashtra State Board of Secondary & Higher Secondary Education", hi: "महाराष्ट्र राज्य माध्यमिक एवं उच्च माध्यमिक शिक्षा मंडल" },
    pattern: { en: "100 marks (algebra + geometry papers for Maths) in the SSC pattern", hi: "एसएससी प्रारूप में 100 अंक (गणित में बीजगणित + ज्यामिति प्रश्नपत्र)" },
    note: { en: "Balbharati textbooks are used; laws/theorems match NCERT closely.", hi: "बालभारती पाठ्यपुस्तकें प्रयुक्त होती हैं; प्रमेय NCERT से मिलते-जुलते हैं।" } },
  { id: "up", en: "UP Board", hi: "यूपी बोर्ड", full: { en: "Board of High School and Intermediate Education, Uttar Pradesh", hi: "उत्तर प्रदेश माध्यमिक शिक्षा परिषद" },
    pattern: { en: "100 marks theory with objective + short + long answer sections", hi: "100 अंक सैद्धांतिक — वस्तुनिष्ठ + लघु + दीर्घ उत्तरीय खंड" },
    note: { en: "NCERT books are followed in most schools.", hi: "अधिकांश विद्यालयों में NCERT पुस्तकें पढ़ाई जाती हैं।" } },
  { id: "bihar", en: "Bihar Board", hi: "बिहार बोर्ड", full: { en: "Bihar School Examination Board", hi: "बिहार विद्यालय परीक्षा समिति" },
    pattern: { en: "100 marks theory, 50% objective component", hi: "100 अंक सैद्धांतिक, 50% वस्तुनिष्ठ भाग" },
    note: { en: "Objective-heavy papers — practise one-mark questions.", hi: "वस्तुनिष्ठ-प्रधान प्रश्नपत्र — एक-अंक प्रश्नों का अभ्यास कीजिए।" } },
  { id: "rajasthan", en: "RBSE Rajasthan", hi: "आरबीएसई राजस्थान", full: { en: "Rajasthan Board of Secondary Education", hi: "राजस्थान माध्यमिक शिक्षा बोर्ड" },
    pattern: { en: "100 marks theory; NCERT-aligned syllabus", hi: "100 अंक सैद्धांतिक; NCERT-संरेखित पाठ्यक्रम" },
    note: { en: "Model papers are published every year — solve them last.", hi: "प्रत्येक वर्ष आदर्श प्रश्नपत्र प्रकाशित होते हैं — अंत में उन्हें हल कीजिए।" } },
  { id: "mp", en: "MP Board", hi: "एमपी बोर्ड", full: { en: "Madhya Pradesh Board of Secondary Education", hi: "मध्य प्रदेश माध्यमिक शिक्षा मंडल" },
    pattern: { en: "75–100 marks depending on subject; blue-print based papers", hi: "विषय के अनुसार 75–100 अंक; ब्लू-प्रिंट आधारित प्रश्नपत्र" },
    note: { en: "Blue-print marks distribution is published — plan revision by weightage.", hi: "अंक-वितरण का ब्लू-प्रिंट प्रकाशित होता है — भार के अनुसार दोहराने की योजना बनाइए।" } },
  { id: "gujarat", en: "GSEB Gujarat", hi: "जीएसईबी गुजरात", full: { en: "Gujarat Secondary and Higher Secondary Education Board", hi: "गुजरात माध्यमिक एवं उच्चतर माध्यमिक शिक्षा बोर्ड" },
    pattern: { en: "100 marks theory with 20 internal", hi: "100 अंक सैद्धांतिक, 20 आंतरिक" },
    note: { en: "Gujarati/English medium textbooks follow NCERT structure.", hi: "गुजराती/अंग्रेज़ी माध्यम की पुस्तकें NCERT संरचना का पालन करती हैं।" } },
  { id: "karnataka", en: "KSEAB Karnataka", hi: "केएसईएबी कर्नाटक", full: { en: "Karnataka School Examination and Assessment Board", hi: "कर्नाटक विद्यालय परीक्षा एवं मूल्यांकन बोर्ड" },
    pattern: { en: "80 marks theory + 20 internal; MCQ section included", hi: "80 अंक सैद्धांतिक + 20 आंतरिक; बहुविकल्पीय खंड सहित" },
    note: { en: "KTBS textbooks; theorem statements are close to NCERT.", hi: "केटीबीएस पुस्तकें; प्रमेय-कथन NCERT के निकट हैं।" } }
];

/* ---------------------- books (source of truth panel) ---------------------- */
UP.books = [
  { id: "ncert10m-hi", class: 10, subject: "maths", lang: "hi",
    title: { en: "NCERT Mathematics — Class 10 (Hindi)", hi: "एनसीईआरटी गणित — कक्षा 10 (हिंदी)" },
    detail: { en: "14 chapter PDFs · KrutiDev encoding, converted to Unicode for search", hi: "14 अध्याय PDF · कृतिदेव एन्कोडिंग, खोज हेतु यूनिकोड में परिवर्तित" },
    pages: 240, loaded: true, chapters: 14 },
  { id: "ncert10m-en", class: 10, subject: "maths", lang: "en",
    title: { en: "NCERT Mathematics — Class 10 (English)", hi: "एनसीईआरटी गणित — कक्षा 10 (अंग्रेज़ी)" },
    detail: { en: "Same 14 chapters, English edition · text extracted directly", hi: "वही 14 अध्याय, अंग्रेज़ी संस्करण · पाठ सीधे निकाला गया" },
    pages: 232, loaded: true, chapters: 14 },
  { id: "ncert10s", class: 10, subject: "science", lang: "both",
    title: { en: "NCERT Science — Class 10", hi: "एनसीईआरटी विज्ञान — कक्षा 10" },
    detail: { en: "13 chapters: Physics, Chemistry, Biology", hi: "13 अध्याय: भौतिकी, रसायन, जीव विज्ञान" },
    pages: 300, loaded: true, chapters: 13 },
  { id: "ncert11m", class: 11, subject: "maths", lang: "both",
    title: { en: "NCERT Mathematics — Class 11", hi: "एनसीईआरटी गणित — कक्षा 11" },
    detail: { en: "Sets, trigonometry, calculus foundations", hi: "समुच्चय, त्रिकोणमिति, कलन की नींव" },
    pages: 500, loaded: true, chapters: 16 },
  { id: "ncert12m", class: 12, subject: "maths", lang: "both",
    title: { en: "NCERT Mathematics — Class 12", hi: "एनसीईआरटी गणित — कक्षा 12" },
    detail: { en: "Calculus, vectors, probability", hi: "कलन, सदिश, प्रायिकता" },
    pages: 600, loaded: true, chapters: 13 },
  { id: "ncert11s", class: 11, subject: "science", lang: "both",
    title: { en: "NCERT Physics, Chemistry, Biology — Class 11", hi: "एनसीईआरटी भौतिकी, रसायन, जीव — कक्षा 11" },
    detail: { en: "Chapter maps for the three science subjects", hi: "तीनों विज्ञान विषयों के अध्याय-नक्शे" },
    pages: 700, loaded: true, chapters: 42 },
  { id: "ncert12s", class: 12, subject: "science", lang: "both",
    title: { en: "NCERT Physics, Chemistry, Biology — Class 12", hi: "एनसीईआरटी भौतिकी, रसायन, जीव — कक्षा 12" },
    detail: { en: "Chapter maps for the three science subjects", hi: "तीनों विज्ञान विषयों के अध्याय-नक्शे" },
    pages: 750, loaded: true, chapters: 39 },
  { id: "ncert10h-k", class: 10, subject: "hindi", lang: "hi",
    title: { en: "NCERT Hindi (Course-B) — क्षितिज भाग-2", hi: "एनसीईआरटी हिंदी (कोर्स-B) — क्षितिज भाग-2" },
    detail: { en: "17 chapters — poets & prose writers (Sur, Tulsi, Nirala, Nagarjun, Yashpal, …) with summaries, glossed text, and exercise questions.",
              hi: "17 पाठ — पद्य (सूर, तुलसी, निराला, नागार्जुन…) एवं गद्य (यशपाल, मन्नू भंडारी…), पढ़ने से पहले परिचय, साफ-सुथरा पाठ और अभ्यास प्रश्न।" },
    pages: 160, loaded: true, chapters: 17 },
  { id: "ncert10h-sp", class: 10, subject: "hindi", lang: "hi",
    title: { en: "NCERT Hindi (Course-B) — स्पर्श भाग-2", hi: "एनसीईआरटी हिंदी (कोर्स-B) — स्पर्श भाग-2" },
    detail: { en: "17 chapters — Kabir, Meera, Pant, Tagore, Premchand-style reminiscences, stories & essays.",
              hi: "17 पाठ — कबीर, मीरा, पंत, टैगोर, बड़े भाई साहब, तताँरा-वामीरो, पतझर में टूटी पत्तियाँ आदि।" },
    pages: 150, loaded: true, chapters: 17 },
  { id: "ncert10h-sy", class: 10, subject: "hindi", lang: "hi",
    title: { en: "NCERT Hindi (Course-B) — संचयन भाग-2", hi: "एनसीईआरटी हिंदी (कोर्स-B) — संचयन भाग-2" },
    detail: { en: "3 supplementary readers: Harihar Kaka, Sapno-ke-se Din, Topi Shukla.",
              hi: "3 पूरक पाठ — हरिहर काका, सपनों के-से दिन, टोपी शुक्ला।" },
    pages: 80, loaded: true, chapters: 3 },
  { id: "ncert10h-kr", class: 10, subject: "hindi", lang: "hi",
    title: { en: "NCERT Hindi (Course-B) — कृतिका भाग-2", hi: "एनसीईआरटी हिंदी (कोर्स-B) — कृतिका भाग-2" },
    detail: { en: "5 chapters — Mata ka Aanchal, George Pancham ki Naak, Sana-sana haath jodo, etc.",
              hi: "5 पाठ — माता का आँचल, जॉर्ज पंचम की नाक, साना-साना हाथ जोड़ो, एही ठैयाँ झुलनी हेरानी हो रामा, मैं क्यों लिखता हूँ।" },
    pages: 90, loaded: true, chapters: 5 },
  { id: "ncert10e-ff", class: 10, subject: "english", lang: "en",
    title: { en: "NCERT English — First Flight", hi: "एनसीईआरटी अंग्रेज़ी — First Flight" },
    detail: { en: "11 prose + 9 poetry lessons with Before-you-read, full text and Thinking-about-the-text exercises.",
              hi: "11 गद्य + 9 काव्य पाठ — पढ़ने से पहले, पाठ और अभ्यास प्रश्न सहित।" },
    pages: 200, loaded: true, chapters: 20 },
  { id: "ncert10e-fp", class: 10, subject: "english", lang: "en",
    title: { en: "NCERT English — Footprints without Feet", hi: "एनसीईआरटी अंग्रेज़ी — Footprints without Feet" },
    detail: { en: "10 supplementary reader chapters (A Triumph of Surgery, The Thief’s Story, Bholi, …).",
              hi: "10 पूरक पाठ — A Triumph of Surgery, The Thief’s Story, Bholi आदि।" },
    pages: 120, loaded: true, chapters: 10 },
  { id: "ncert10s-g", class: 10, subject: "social", lang: "both",
    title: { en: "NCERT Social Science — Class 10 (4 books)", hi: "एनसीईआरटी सामाजिक विज्ञान — कक्षा 10 (4 पुस्तकें)" },
    detail: { en: "Geography, Economics, History (India & Contemporary World-II), Civics (Democratic Politics-II).",
              hi: "भूगोल, अर्थशास्त्र, इतिहास (भारत और समकालीन विश्व-II), नागरिकशास्त्र (लोकतांत्रिक राजनीति-II)।" },
    pages: 380, loaded: true, chapters: 28 },
  { id: "ncert10sk", class: 10, subject: "sanskrit", lang: "hi",
    title: { en: "NCERT Sanskrit — शेमुषी द्वितीयो भागः + व्याकरणवीथिः", hi: "एनसीईआरटी संस्कृत — शेमुषी द्वितीयो भागः + व्याकरणवीथिः" },
    detail: { en: "Shemushi Part-II (10 literature) + Vyakaranavithi (12 grammar) + Abhyas workbook (5 skills), with board papers as PDFs.",
              hi: "शेमुषी भाग-2 (10 साहित्य पाठ) + व्याकरणवीथी (12 व्याकरण पाठ) + अभ्यास पुस्तिका (5 कौशल); बोर्ड पेपर पीडीएफ़ भी संलग्न।" },
    pages: 250, loaded: true, chapters: 27 }
];

/* ---------------------- Class 10 Science ---------------------- */


/* ---------------------- Class 11 & 12 Mathematics outline ---------------------- */
function mk(id, en, hi, enDesc, hiDesc, formulas, weight) {
  return {
    id, subject: "maths", en, hi, enDesc, hiDesc, weight: weight || 5, demand: "outline", pages: "—",
    concepts: [
      { t: { en: "What the chapter really asks you to do", hi: "अध्याय वास्तव में क्या करवाता है" },
        b: { en: enDesc, hi: hiDesc } },
      { t: { en: "Study order that works", hi: "अध्ययन का उपयोगी क्रम" },
        b: { en: "Learn the definitions, then the two or three standard derivations, then the exercise questions in order — they are arranged by difficulty, not by topic.", hi: "परिभाषाएँ सीखिए, फिर दो-तीन मानक व्युत्पत्तियाँ, फिर प्रश्नावली के प्रश्न क्रम से — वे कठिनाई के क्रम में हैं, विषय के नहीं।" } }
    ],
    formulas: formulas.map(f => ({ n: { en: f[0], hi: f[2] || f[0] }, e: f[1] })),
    pyqs: [],
    plan: [
      { en: "Skim the whole chapter once in 20 minutes, then return to the two hardest sections with paper.", hi: "पूरा अध्याय पहले 20 मिनट में देखिए, फिर दो सबसे कठिन खंडों पर कागज़ लेकर लौटिए।" }
    ],
    keywords: { en: [], hi: [] }
  };
}

UP.course11maths = [
  mk(1, "Sets", "समुच्चय", "Notation, subsets, union and intersection, Venn diagrams.", "संकेतन, उपसमुच्चय, सम्मिलन व सर्वनिष्ठ, वेन आकृति।",
    [["Set operations", "n(A∪B) = n(A) + n(B) − n(A∩B)", "समुच्चय संक्रियाएँ"], ["Subsets", "2ⁿ subsets of a set with n elements", "उपसमुच्चय"]]),
  mk(2, "Relations and Functions", "संबंध एवं फलन", "Cartesian products, domain-range, types of functions.", "कार्तीय गुणनफल, प्रांत-परिसर, फलन के प्रकार।",
    [["Composition", "(f∘g)(x) = f(g(x))", "संयोजन"], ["Inverse", "f⁻¹ exists iff f is one-one and onto", "प्रतिलोम"]]),
  mk(3, "Trigonometric Functions", "त्रिकोणमितीय फलन", "Radian measure, general solutions, sine and cosine rules.", "रेडियन माप, व्यापक हल, साइन व कोसाइन नियम।",
    [["General solution", "sinθ = sinα ⇒ θ = nπ + (−1)ⁿα", "व्यापक हल"], ["Cosine rule", "a² = b² + c² − 2bc cos A", "कोसाइन नियम"]]),
  mk(4, "Complex Numbers and Quadratic Equations", "सम्मिश्र संख्याएँ एवं द्विघात समीकरण", "i² = −1, modulus-argument form, cube roots of unity.", "i² = −1, मापांक-कोणांक रूप, इकाई के घनमूल।",
    [["Modulus", "|z| = √(a² + b²)", "मापांक"], ["Cube roots of unity", "1 + ω + ω² = 0", "इकाई के घनमूल"]]),
  mk(5, "Linear Inequalities", "रैखिक असमिकाएँ", "Solving inequalities and graphing solution regions.", "असमिकाएँ हल करना तथा हल क्षेत्र आलेखित करना।",
    [["Rule to remember", "multiplying by a negative flips the sign", "ऋणात्मक से गुणा करने पर चिह्न बदलता है"]]),
  mk(6, "Permutations and Combinations", "क्रमचय एवं संचय", "Counting arrangements and selections, nPr and nCr.", "व्यवस्थाएँ व चयन गिनना, nPr व nCr।",
    [["Permutation", "ⁿPᵣ = n!/(n−r)!", "क्रमचय"], ["Combination", "ⁿCᵣ = n!/[r!(n−r)!]", "संचय"], ["Key identity", "ⁿCᵣ = ⁿCₙ₋ᵣ", "मुख्य सर्वसमिका"]]),
  mk(7, "Binomial Theorem", "द्विपद प्रमेय", "Expansion, general term and middle term.", "प्रसार, व्यापक पद तथा मध्य पद।",
    [["General term", "Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳ bʳ", "व्यापक पद"], ["Rows", "coefficients of (a+b)ⁿ are ⁿC₀, ⁿC₁, …", "पंक्तियाँ"]]),
  mk(8, "Sequences and Series", "अनुक्रम तथा श्रेणी", "AP, GP, and the arithmetic-geometric mean inequalities.", "समांतर श्रेढ़ी, गुणोत्तर श्रेढ़ी तथा AM-GM।",
    [["GP sum", "Sₙ = a(1 − rⁿ)/(1 − r), r ≠ 1", "गुणोत्तर योग"], ["AM-GM", "AM ≥ GM for positive numbers", "AM-GM"]]),
  mk(9, "Straight Lines", "सरल रेखाएँ", "Slope forms, angle between lines, distance from a line.", "ढाल रूप, रेखाओं के बीच कोण, रेखा से दूरी।",
    [["Slope form", "y − y₁ = m(x − x₁)", "ढाल रूप"], ["Distance", "d = |Ax₁ + By₁ + C| / √(A² + B²)", "दूरी"]]),
  mk(10, "Conic Sections", "शंकु परिच्छेद", "Circle, parabola, ellipse and hyperbola equations.", "वृत्त, परवलय, दीर्घवृत्त तथा अतिपरवलय के समीकरण।",
    [["Circle", "x² + y² = r²", "वृत्त"], ["Parabola", "y² = 4ax", "परवलय"], ["Ellipse", "x²/a² + y²/b² = 1", "दीर्घवृत्त"]]),
  mk(11, "Introduction to Three Dimensional Geometry", "त्रिविमीय ज्यामिति का परिचय", "Coordinates in space, distance and section formula.", "अंतरिक्ष में निर्देशांक, दूरी तथा अनुभाग सूत्र।",
    [["Distance", "√[(x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²]", "दूरी"]]),
  mk(12, "Limits and Derivatives", "सीमा और अवकलज", "Limit meaning, standard limits, first principles.", "सीमा का अर्थ, मानक सीमाएँ, प्रथम सिद्धांत।",
    [["Standard limit", "lim(x→0) sin x / x = 1", "मानक सीमा"], ["Derivative", "f′(x) = lim [f(x+h) − f(x)]/h", "अवकलज"]]),
  mk(13, "Statistics", "सांख्यिकी", "Mean deviation and variance for grouped data.", "वर्गीकृत आँकड़ों का माध्य विचलन तथा प्रसरण।",
    [["Variance", "σ² = Σ(xᵢ − x̄)²/n", "प्रसरण"], ["Standard deviation", "σ = √variance", "मानक विचलन"]]),
  mk(14, "Probability", "प्रायिकता", "Axiomatic probability, conditional probability basics.", "स्वयंसिद्ध प्रायिकता, सप्रतिबंध प्रायिकता की नींव।",
    [["Addition rule", "P(A∪B) = P(A) + P(B) − P(A∩B)", "योग नियम"]]),
  mk(15, "Mathematical Reasoning", "गणितीय तर्कणा", "Statements, connectives, truth tables, validity.", "कथन, संयोजक, सत्य तालिका, वैधता।",
    [["Implication", "p ⇒ q is false only when p is true and q false", "निहितार्थ"]]),
  mk(16, "Mathematical Modelling / Revision", "गणितीय निदर्शन / पुनरावृत्ति", "Building models from word problems across all chapters.", "सभी अध्यायों से शब्द समस्याओं के निदर्शन बनाना।", [["Model cycle", "real problem → assumption → math → solution → check", "निदर्शन चक्र"]])
];

UP.course12maths = [
  mk(1, "Relations and Functions", "संबंध एवं फलन", "Types of relations, inverse trigonometric functions.", "संबंधों के प्रकार, प्रतिलोम त्रिकोणमितीय फलन।",
    [["Inverse", "sin⁻¹x + cos⁻¹x = π/2", "प्रतिलोम"], ["Range", "sin⁻¹: [−1,1] → [−π/2, π/2]", "परिसर"]], 7),
  mk(2, "Inverse Trigonometric Functions", "प्रतिलोम त्रिकोणमितीय फलन", "Principal values and identities.", "मुख्य मान तथा सर्वसमिकाएँ।",
    [["Identity", "tan⁻¹x + tan⁻¹y = tan⁻¹[(x+y)/(1−xy)]", "सर्वसमिका"]], 6),
  mk(3, "Matrices", "आव्यूह", "Types of matrices, operations, transpose and symmetry.", "आव्यूह के प्रकार, संक्रियाएँ, परिवर्त तथा सममिति।",
    [["Product rule", "(AB)ᵀ = BᵀAᵀ", "गुणनफल नियम"], ["Inverse", "A⁻¹ = adj A / |A|", "प्रतिलोम"]], 6),
  mk(4, "Determinants", "सारणिक", "Properties, area of triangle, adjoint and inverse.", "गुणधर्म, त्रिभुज का क्षेत्रफल, सहखंडज तथा प्रतिलोम।",
    [["Cramer", "x = D₁/D, y = D₂/D", "क्रेमर"], ["Singular", "A is singular iff |A| = 0", "अव्युत्क्रमणीय"]], 6),
  mk(5, "Continuity and Differentiability", "सांतत्य तथा अवकलनीयता", "Continuity tests, chain rule, logarithmic differentiation.", "सांतत्य जाँच, श्रृंखला नियम, लघुगणकीय अवकलन।",
    [["Chain rule", "dy/dx = dy/du · du/dx", "श्रृंखला नियम"], ["Derivative", "d/dx[eˣ] = eˣ", "अवकलज"]], 8),
  mk(6, "Application of Derivatives", "अवकलज के अनुप्रयोग", "Rate of change, increasing/decreasing, maxima-minima.", "परिवर्तन दर, वर्धमान/ह्रासमान, उच्चिष्ठ-निम्निष्ठ।",
    [["Critical point", "f′(x) = 0", "क्रांतिक बिंदु"], ["Second derivative test", "f″<0 max, f″>0 min", "द्वितीय अवकलज परीक्षण"]], 8),
  mk(7, "Integrals", "समाकलन", "Indefinite and definite integration, standard forms.", "अनिश्चित एवं निश्चित समाकलन, मानक रूप।",
    [["Power rule", "∫xⁿ dx = xⁿ⁺¹/(n+1) + C", "घात नियम"], ["By parts", "∫u dv = uv − ∫v du", "खंडशः"]], 9),
  mk(8, "Application of Integrals", "समाकलनों के अनुप्रयोग", "Area under curves and between curves.", "वक्रों के नीचे तथा वक्रों के बीच क्षेत्रफल।",
    [["Area", "A = ∫ₐᵇ f(x) dx", "क्षेत्रफल"]], 6),
  mk(9, "Differential Equations", "अवकल समीकरण", "Order, degree, variable separable method.", "कोटि, घात, चर पृथक्करण विधि।",
    [["Separable", "dy/dx = f(x)g(y) ⇒ dy/g(y) = f(x)dx", "पृथक्करणीय"]], 7),
  mk(10, "Vector Algebra", "सदिश बीजगणित", "Dot and cross products, projections.", "अदिश व सदिश गुणनफल, प्रक्षेप।",
    [["Dot product", "a·b = |a||b| cos θ", "अदिश गुणनफल"], ["Cross product", "|a×b| = |a||b| sin θ", "सदिश गुणनफल"]], 6),
  mk(11, "Three Dimensional Geometry", "त्रिविमीय ज्यामिति", "Direction cosines, lines and planes in space.", "दिक् कोसाइन, अंतरिक्ष में रेखाएँ और समतल।",
    [["Line", "(x−x₁)/a = (y−y₁)/b = (z−z₁)/c", "रेखा"], ["Plane", "ax + by + cz = d", "समतल"]], 7),
  mk(12, "Linear Programming", "रैखिक प्रोग्रामन", "Feasible region and graphical optimisation.", "सुसंगत क्षेत्र तथा ग्राफीय अनुकूलन।",
    [["Objective", "Z = ax + by optimised at vertices", "उद्देश्य फलन"]], 5),
  mk(13, "Probability", "प्रायिकता", "Conditional probability, Bayes' theorem, binomial distribution.", "सप्रतिबंध प्रायिकता, बेज़ प्रमेय, द्विपद बंटन।",
    [["Conditional", "P(A|B) = P(A∩B)/P(B)", "सप्रतिबंध"], ["Bayes", "P(Aᵢ|B) = P(Aᵢ)P(B|Aᵢ) / ΣP(Aⱼ)P(B|Aⱼ)", "बेज़"], ["Binomial", "P(X=r) = ⁿCᵣ pʳ qⁿ⁻ʳ", "द्विपद"]], 8)
];

/* ---------------------- Class 11 / 12 science chapter maps ---------------------- */
UP.sci11 = {
  physics: [
    ["Physical World & Units", "भौतिक जगत एवं मात्रक", "SI units, dimensions, significant figures."],
    ["Motion in a Straight Line", "सरल रेखा में गति", "Kinematic equations, graphs of motion."],
    ["Motion in a Plane", "समतल में गति", "Projectile motion, relative velocity."],
    ["Laws of Motion", "गति के नियम", "Newton's three laws, friction, circular motion."],
    ["Work, Energy and Power", "कार्य, ऊर्जा और शक्ति", "Work-energy theorem, conservation of energy."],
    ["System of Particles & Rotational Motion", "कणों के निकाय तथा घूर्णी गति", "Centre of mass, torque, moment of inertia."],
    ["Gravitation", "गुरुत्वाकर्षण", "Kepler's laws, orbital velocity, escape speed."],
    ["Mechanical Properties of Solids", "ठोसों के यांत्रिक गुण", "Stress, strain, Young's modulus."],
    ["Mechanical Properties of Fluids", "तरलों के यांत्रिक गुण", "Bernoulli, viscosity, surface tension."],
    ["Thermal Properties of Matter", "पदार्थ के तापीय गुण", "Calorimetry, expansion, heat transfer."],
    ["Thermodynamics", "ऊष्मागतिकी", "First and second law, thermodynamic processes."],
    ["Kinetic Theory", "अणुगति सिद्धांत", "Kinetic interpretation of temperature, mean free path."],
    ["Oscillations", "दोलन", "SHM, energy in SHM, pendulum."],
    ["Waves", "तरंगें", "Superposition, standing waves, beats."]
  ],
  chemistry: [
    ["Some Basic Concepts of Chemistry", "रसायन विज्ञान के कुछ मूलभूत concepts", "Mole concept, stoichiometry, empirical formula."],
    ["Structure of Atom", "परमाणु की संरचना", "Quantum numbers, orbitals, electronic configuration."],
    ["Classification of Elements", "तत्वों का वर्गीकरण", "Periodic trends and anomalies."],
    ["Chemical Bonding", "रासायनिक आबंधन", "VSEPR, hybridisation, molecular orbital theory."],
    ["States of Matter", "पदार्थ की अवस्थाएँ", "Gas laws, ideal and real gases."],
    ["Thermodynamics", "ऊष्मागतिकी", "Enthalpy, entropy, Gibbs energy."],
    ["Equilibrium", "साम्य", "Kc, Kp, Le Chatelier's principle."],
    ["Redox Reactions", "रेडॉक्स अभिक्रियाएँ", "Oxidation numbers, balancing redox."],
    ["Hydrogen", "हाइड्रोजन", "Hydrides, hydrogen bonding."],
    ["s-Block Elements", "s-ब्लॉक तत्व", "Group 1 and 2 trends and compounds."],
    ["p-Block Elements (part)", "p-ब्लॉक (भाग)", "Group 13 and 14 trends."],
    ["Organic Chemistry Basics", "कार्बनिक रसायन की मूल बातें", "IUPAC nomenclature, isomerism, inductive effects."],
    ["Hydrocarbons", "हाइड्रोकार्बन", "Alkanes, alkenes, alkynes, aromaticity."],
    ["Environmental Chemistry", "पर्यावरण रसायन", "Pollution, greenhouse effect, ozone."]
  ],
  biology: [
    ["The Living World", "जीव जगत", "Taxonomy, nomenclature, taxonomic hierarchy."],
    ["Biological Classification", "जैविक वर्गीकरण", "Five kingdoms, viruses, lichens."],
    ["Plant Kingdom", "पादप जगत", "Algae to angiosperms, alternation of generations."],
    ["Animal Kingdom", "प्राणी जगत", "Phyla characteristics and symmetry."],
    ["Morphology of Flowering Plants", "पुष्पी पादपों की आकारिकी", "Root, stem, leaf, inflorescence."],
    ["Anatomy of Flowering Plants", "पुष्पी पादपों में ऊतक तंत्र", "Tissues, vascular bundles, secondary growth."],
    ["Structural Organisation in Animals", "जंतुओं में संरचनात्मक संगठन", "Animal tissues, cockroach anatomy."],
    ["Cell: The Unit of Life", "कोशिका: जीवन की इकाई", "Prokaryote vs eukaryote, organelles."],
    ["Biomolecules", "जैव अणु", "Carbohydrates, proteins, enzymes."],
    ["Cell Cycle and Cell Division", "कोशिका चक्र एवं कोशिका विभाजन", "Mitosis, meiosis, significance."],
    ["Photosynthesis in Higher Plants", "उच्च पादपों में प्रकाश संश्लेषण", "Light and dark reactions, C3 and C4."],
    ["Respiration in Plants", "पादपों में श्वसन", "Glycolysis, Krebs cycle, ETS."],
    ["Plant Growth and Development", "पादप वृद्धि एवं विकास", "Growth regulators, photoperiodism."],
    ["Breathing and Exchange of Gases", "श्वसन तथा गैसों का विनिमय", "Lung volumes, transport of gases."],
    ["Body Fluids and Circulation", "शरीर द्रव तथा परिसंचरण", "Cardiac cycle, ECG, blood groups."],
    ["Excretory Products", "उत्सर्जी उत्पाद", "Nephron, counter-current mechanism."],
    ["Locomotion and Movement", "गमन एवं संचलन", "Muscle contraction, skeletal system."],
    ["Neural Control and Coordination", "तंत्रिका नियंत्रण एवं समन्वय", "Action potential, synapse, brain."],
    ["Chemical Coordination", "रासायनिक समन्वय", "Endocrine glands and hormones."]
  ]
};

UP.sci12 = {
  physics: [
    ["Electric Charges and Fields", "विद्युत आवेश तथा क्षेत्र", "Coulomb's law, Gauss's law, dipoles."],
    ["Electrostatic Potential and Capacitance", "स्थिर विद्युत विभव तथा धारिता", "Potential, capacitors, energy stored."],
    ["Current Electricity", "विद्युत धारा", "Ohm's law, Kirchhoff, potentiometer, drift velocity."],
    ["Moving Charges and Magnetism", "गतिमान आवेश और चुंबकत्व", "Biot-Savart, Ampere, cyclotron."],
    ["Magnetism and Matter", "चुंबकत्व एवं द्रव्य", "Dipoles, hysteresis, earth's magnetism."],
    ["Electromagnetic Induction", "विद्युतचुंबकीय प्रेरण", "Faraday, Lenz, eddy currents."],
    ["Alternating Current", "प्रत्यावर्ती धारा", "AC circuits, resonance, transformers."],
    ["Electromagnetic Waves", "विद्युतचुंबकीय तरंगें", "Displacement current, EM spectrum."],
    ["Ray Optics", "किरण प्रकाशिकी", "Mirrors, lenses, total internal reflection."],
    ["Wave Optics", "तरंग प्रकाशिकी", "Interference, diffraction, polarisation."],
    ["Dual Nature of Radiation", "विकिरण की द्वैत प्रकृति", "Photoelectric effect, de Broglie."],
    ["Atoms", "परमाणु", "Bohr model, spectra, energy levels."],
    ["Nuclei", "नाभिक", "Binding energy, fission, fusion."],
    ["Semiconductor Devices", "अर्धचालक युक्तियाँ", "Diodes, transistors, rectifiers."]
  ],
  chemistry: [
    ["Solutions", "विलयन", "Concentration, Raoult's law, colligative properties."],
    ["Electrochemistry", "विद्युत-रसायन", "Nernst equation, conductance, batteries."],
    ["Chemical Kinetics", "रासायनिक बलगतिकी", "Rate laws, order, Arrhenius."],
    ["d and f Block Elements", "d एवं f ब्लॉक तत्व", "Transition metal trends, lanthanoid contraction."],
    ["Coordination Compounds", "उपसहसंयोजन यौगिक", "Werner, CFT, isomerism."],
    ["Haloalkanes and Haloarenes", "हैलोऐल्केन तथा हैलोऐरीन", "SN1, SN2, substitution patterns."],
    ["Alcohols, Phenols and Ethers", "ऐल्कोहॉल, फीनॉल एवं ईथर", "Preparation, reactions, acidity."],
    ["Aldehydes, Ketones, Carboxylic Acids", "ऐल्डिहाइड, कीटोन, कार्बोक्सिलिक अम्ल", "Nucleophilic addition, tests."],
    ["Amines", "ऐमीन", "Basicity, diazonium salts."],
    ["Biomolecules", "जैव अणु", "Proteins, nucleic acids, vitamins."]
  ],
  biology: [
    ["Sexual Reproduction in Flowering Plants", "पुष्पी पादपों में लैंगिक जनन", "Microsporogenesis, double fertilisation."],
    ["Human Reproduction", "मानव जनन", "Gametogenesis, menstrual cycle, parturition."],
    ["Reproductive Health", "जनन स्वास्थ्य", "Contraception, ART, STDs."],
    ["Principles of Inheritance", "वंशागति के सिद्धांत", "Mendel, linkage, sex-linked disorders."],
    ["Molecular Basis of Inheritance", "वंशागति का आण्विक आधार", "DNA replication, transcription, lac operon."],
    ["Evolution", "विकास", "Darwin, Hardy-Weinberg, human evolution."],
    ["Human Health and Disease", "मानव स्वास्थ्य एवं रोग", "Immunity, pathogens, cancer, HIV."],
    ["Microbes in Human Welfare", "मानव कल्याण में सूक्ष्मजीव", "Fermentation, antibiotics, biogas."],
    ["Biotechnology: Principles", "जैव प्रौद्योगिकी: सिद्धांत", "Restriction enzymes, vectors, PCR."],
    ["Biotechnology: Applications", "जैव प्रौद्योगिकी: अनुप्रयोग", "Bt cotton, gene therapy, insulin."],
    ["Organisms and Populations", "जीव एवं जनसंख्या", "Population growth, interactions."],
    ["Ecosystem", "पारितंत्र", "Energy flow, productivity, nutrient cycling."],
    ["Biodiversity and Conservation", "जैव विविधता एवं संरक्षण", "Patterns, hotspots, in-situ and ex-situ."]
  ]
};

/* subject-aware chapter lookup used by the engine */
UP.catalogue = function (cls, subject) {
  var out;
  if (String(subject) === 'maths') {
    if (+cls === 10) out = UP.chapters;
    else if (+cls === 11) out = (UP.course11maths||[]).map(c => Object.assign({}, c, { className: 11 }));
    else if (+cls === 12) out = (UP.course12maths||[]).map(c => Object.assign({}, c, { className: 12 }));
  }
  if (String(subject) === 'applied-maths') {
    if (+cls === 12 && UP.course12applied) out = UP.course12applied.map(c => Object.assign({}, c, { className: 12 }));
  }
  if (+cls === 12 && String(subject) === 'accountancy') {
    return (UP.course12accountancy || []).map(c => Object.assign({}, c, { className: 12, subject: 'accountancy' }));
  }
  if (+cls === 12 && String(subject) === 'computerized-accounting') {
    return (UP.course12computerized || []).map(c => Object.assign({}, c, { className: 12, subject: 'computerized-accounting' }));
  }
  if (+cls === 12 && String(subject) === 'business-studies') {
    return (UP.course12business || []);
  }
  if (+cls === 12 && String(subject) === 'economics') {
    return (UP.course12economics || []).map(c => Object.assign({}, c, { className: 12, subject: 'economics' }));
  }
  if (+cls === 12 && String(subject) === 'english') {
    return (UP.course12english || []).map(c => Object.assign({}, c, { className: 12, subject: 'english' }));
  }
  if (out) return out;
  /* Class 12 Chemistry (NCERT): 10 units, id range 701–710 */
  if (+cls === 12 && subject === 'chemistry') return (window.UP && UP.chemistry12) || [];
  /* Class 12 Physics (NCERT): 14 chapters, id range 601–614 (leaving 700+ for chemistry, 800+ for biology).
     Loaded lazily via assets/js/data/physics12.js. */
  if (+cls === 12 && subject === 'physics') return (window.UP && UP.physics12) || [];
  /* Class 10 Science now comes from the extracted textbook (loaded from
     assets/science/science10.js), which carries the real sections, figures and
     exercise questions -- not the 13-line outline that used to live here. */
  if (+cls === 10 && subject === 'science') return UP.science10 || [];
  /* Class 10 Hindi (Course-B): four NCERT textbooks. Loaded from
     assets/science/hindi10-ch.js. */
  if (+cls === 10 && subject === 'hindi') return UP.hindi10Chapters || [];
  /* Class 10 English: First Flight + Footprints without Feet.
     Loaded from assets/js/data/english10.js. */
  if (+cls === 10 && subject === 'english') return (window.UP && UP.english10) || [];
  /* Class 10 Social Science: Geography + Economics + History + Civics (NCERT).
     Loaded from assets/js/data/social10-q.js -> Q_BANK entries with course sst10 / sst10-hi.
     We build a chapter outline from the question bank so that chapter selection works. */
  if (+cls === 10 && subject === 'social') return buildSocialChapters();
  /* Class 10 Sanskrit: Shemushi Part-II + Vyakaranavithi (two NCERT textbooks).
     Loaded from assets/sanskrit/sanskrit10-ch.js. */
  if (+cls === 10 && subject === 'sanskrit') return UP.sanskrit10Chapters || [];
  if (+cls === 11 && subject && UP.sci11[subject]) {
    return UP.sci11[subject].map((r, i) => ({
      id: i + 1, subject, en: r[0], hi: r[1], enDesc: r[2], hiDesc: r[2], weight: 4, demand: 'outline',
      concepts: [{ t: { en: 'What this chapter covers', hi: 'यह अध्याय क्या समेटता है' }, b: { en: r[2], hi: r[2] } }],
      formulas: [], pyqs: [], plan: [], keywords: { en: [r[0]], hi: [r[1]] }
    }));
  }
  if (+cls === 12 && subject && UP.sci12[subject]) {
    return UP.sci12[subject].map((r, i) => ({
      id: i + 1, subject, en: r[0], hi: r[1], enDesc: r[2], hiDesc: r[2], weight: 4, demand: 'outline',
      concepts: [{ t: { en: 'What this chapter covers', hi: 'यह अध्याय क्या समेटता है' }, b: { en: r[2], hi: r[2] } }],
      formulas: [], pyqs: [], plan: [], keywords: { en: [r[0]], hi: [r[1]] }
    }));
  }
  return [];
};

/* Build Class 10 Social Science chapter outline from the extracted Q bank. */
function buildSocialChapters() {
  var bank = (window.UP && UP.social10Q) ? UP.social10Q : [];
  var pyqs = (window.UP && UP.socialPyq) ? UP.socialPyq : [];
  var bookMeta = {
    geo:  { en: 'Geography — Contemporary India II', hi: 'भूगोल — समकालीन भारत II' },
    eco:  { en: 'Economics — Understanding Economic Development', hi: 'अर्थशास्त्र — आर्थिक विकास की समझ' },
    hist: { en: 'History — India & the Contemporary World II', hi: 'इतिहास — भारत और समकालीन विश्व II' },
    civ:  { en:'Civics — Democratic Politics II', hi:'नागरिकशास्त्र — लोकतांत्रिक राजनीति II' }
  };
  var chCount = {};
  bank.forEach(function(q){ var k = q.book + '-' + q.ch; chCount[k] = (chCount[k]||0) + 1; });
  var pyqByCh = {};
  pyqs.forEach(function(q){ if (q && q.ch) { var k=q.ch; if(!pyqByCh[k])pyqByCh[k]=[]; pyqByCh[k].push(q); } });
  var contentMap = {};
  (window.UP && UP.socialChapters || []).forEach(function(c){ contentMap[c.b+'-'+c.ch] = c; });
  var bookOrder = ['geo','eco','hist','civ'];
  var out = []; var gid = 1;
  bookOrder.forEach(function(bk){
    out.push({
      id: gid++, subject:'social',
      en: '📘 ' + bookMeta[bk].en, hi: '📘 ' + bookMeta[bk].hi,
      enDesc: 'NCERT textbook — exercise questions + CBSE board PYQs.',
      hiDesc: 'NCERT पाठ्यपुस्तक — अभ्यास प्रश्न + CBSE बोर्ड PYQ.',
      weight: 1, demand: 'book', concepts:[], formulas:[], pyqs:[], plan:[],
      keywords:{en:[],hi:[]}, _bookHeader:true
    });
    var chs = Object.keys(chCount).filter(function(k){ return k.indexOf(bk+'-')===0; })
      .map(function(k){ var m=k.split('-'); return {book:bk,ch:+m[1],count:chCount[k]}; })
      .sort(function(a,b){ return a.ch-b.ch; });
    (window.UP && UP.socialChapters || []).forEach(function(c){
      if (c.b!==bk) return;
      if (!chs.some(function(x){ return x.ch===c.ch; })) chs.push({book:bk,ch:c.ch,count:0});
    });
    chs.sort(function(a,b){ return a.ch-b.ch; });
    chs.forEach(function(c){
      var content = contentMap[c.book+'-'+c.ch] || {};
      var chName = content.en || ('Chapter '+c.ch);
      var chNameHi = content.hi || ('अध्याय '+c.ch);
      var concepts = [];
      (content.concepts || []).forEach(function(pt){
        concepts.push({ t:{en:'Key idea',hi:'मुख्य बिंदु'}, b:{en:pt.en, hi:pt.hi || pt.en} });
      });
      if (!concepts.length) concepts.push({ t:{en:'In this chapter',hi:'इस अध्याय में'}, b:{en:chName, hi:chNameHi} });
      var chPyqs = [];
      (pyqByCh[c.ch] || []).slice().sort(function(a,b){ return (a.m||1)-(b.m||1); }).slice(0,5).forEach(function(q){
        chPyqs.push({ board:'CBSE', year: q.y||'2025', marks: q.m||1, en: q.en||'', hi: q.hi||'' });
      });
      var plan = [
        { en:'Read chapter once, underline definitions; write a one-sentence summary for each section.',
          hi:'अध्याय एक बार पढ़िए, परिभाषाएँ रेखांकित कीजिए; प्रत्येक उपखंड का एक-वाक्य सार लिखिए।' },
        { en:'Solve all NCERT exercise Qs ('+c.count+' in bank) and mark any you miss.',
          hi:'सभी NCERT अभ्यास प्रश्न ('+c.count+') हल कीजिए और जो छूटे चिह्नित कीजिए।' },
        { en:'Practise 5 board PYQs of this chapter against the clock.',
          hi:'इस अध्याय के 5 बोर्ड PYQ समय-सीमा में हल कीजिए।' }
      ];
      var kwEn = [chName].concat((content.terms||'').split(',').filter(Boolean).slice(0,8));
      out.push({
        id: gid++, subject:'social',
        en: 'Ch ' + c.ch + ' — ' + chName,
        hi: 'अध्याय ' + c.ch + ' — ' + chNameHi,
        enDesc: bookMeta[bk].en + ' · ' + c.count + ' NCERT Qs' + (chPyqs.length?' · '+chPyqs.length+' PYQ samples':''),
        hiDesc: bookMeta[bk].hi + ' · ' + c.count + ' NCERT प्रश्न' + (chPyqs.length?' · '+chPyqs.length+' PYQ नमूने':''),
        weight: 5, demand: 'exercise', book: c.book, ch: c.ch,
        concepts: concepts, formulas: [], pyqs: chPyqs, plan: plan,
        keywords: { en: kwEn, hi: [chNameHi] }
      });
    });
  });
  return out;
}
