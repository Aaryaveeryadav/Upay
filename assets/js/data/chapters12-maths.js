/* =====================================================================
   Upay · Class 12 Mathematics · NCERT (2024–25 syllabus — full book)
   Chapter knowledge base (Ch 1–13, both Part I and Part II)
   Bilingual (en/hi). Every learner-facing string is {en, hi}.

   Chapter IDs use the 100-series to avoid collision with Class 10 (1–14)
   and future Class 11 (which uses 200+ in this codebase). The catalogue()
   function in data-extra.js maps class 12 → this file's chapters.
   ===================================================================== */
(function () {
  window.UP = window.UP || {};
  UP.pyq = UP.pyq || [];

  const CHAPTERS = [
    {
      id: 1,
      en: "Relations and Functions",
      hi: "संबंध एवं फलन",
      enDesc: "Types of relations (reflexive, symmetric, transitive, equivalence), types of functions (one-one, onto, bijective), composition and invertible functions, and binary operations.",
      hiDesc: "संबंधों के प्रकार (स्वतुल्य, सममित, संक्रामक, तुल्यता), फलनों के प्रकार (एकैकी, आच्छादक, एकैकी-आच्छादक), संयुक्त फलन और व्युत्क्रमणीय फलन तथा द्विआधारी संक्रियाएँ।",
      weight: 5, demand: "definition-heavy", pages: "1–17",
      chaptersTag: { en: "Algebra / set theory", hi: "बीजगणित / समुच्चय सिद्धांत" },
      concepts: [
        { t: { en: "Empty, universal and identity relations", hi: "रिक्त, सार्वत्रिक और तत्समक संबंध" },
          b: { en: "Empty relation: no element is related to any other (R = ∅). Universal relation: every pair is related (R = A×A). Both are trivial equivalence relations on A.",
               hi: "रिक्त संबंध: कोई भी अवयव किसी दूसरे से संबंधित नहीं (R = ∅)। सार्वत्रिक संबंध: प्रत्येक युग्म संबंधित है (R = A×A)। दोनों A पर तुच्छ तुल्यता संबंध हैं।" } },
        { t: { en: "Reflexive, symmetric, transitive", hi: "स्वतुल्य, सममित, संक्रामक" },
          b: { en: "R is reflexive iff (a,a) ∈ R for all a∈A; symmetric iff (a,b)∈R ⇒ (b,a)∈R; transitive iff (a,b)∈R and (b,c)∈R ⇒ (a,c)∈R. An equivalence relation is all three.",
               hi: "R स्वतुल्य है यदि सभी a∈A के लिए (a,a)∈R; सममित है यदि (a,b)∈R ⇒ (b,a)∈R; संक्रामक है यदि (a,b)∈R और (b,c)∈R ⇒ (a,c)∈R। तुल्यता संबंध तीनों होता है।" } },
        { t: { en: "One-one (injective) and onto (surjective)", hi: "एकैकी (इंजेक्टिव) और आच्छादक (सर्जेक्टिव)" },
          b: { en: "f:X→Y is one-one if f(x₁)=f(x₂) ⇒ x₁=x₂; onto if every y∈Y has at least one pre-image in X. A function that is both is bijective and has an inverse f⁻¹.",
               hi: "f:X→Y एकैकी है यदि f(x₁)=f(x₂) ⇒ x₁=x₂; आच्छादक है यदि प्रत्येक y∈Y का कम से कम एक पूर्व-प्रतिबिंब X में हो। दोनों होने पर यह एकैकी-आच्छादक होता है और इसका प्रतिलोम f⁻¹ होता है।" } },
        { t: { en: "Composition of functions", hi: "फलनों का संयोजन" },
          b: { en: "For f:A→B and g:B→C, g∘f:A→C is defined by (g∘f)(x) = g(f(x)). Composition is associative but NOT commutative. If f and g are both bijective, so is g∘f, and (g∘f)⁻¹ = f⁻¹∘g⁻¹.",
               hi: "f:A→B और g:B→C के लिए, g∘f:A→C को (g∘f)(x) = g(f(x)) से परिभाषित करते हैं। संयोजन साहचर्य है पर क्रमविनिमेय नहीं। यदि f और g दोनों एकैकी-आच्छादक हों तो g∘f भी होता है, और (g∘f)⁻¹ = f⁻¹∘g⁻¹।" } },
        { t: { en: "Inverse function", hi: "प्रतिलोम फलन" },
          b: { en: "f⁻¹ exists ⇔ f is bijective. The graph of f⁻¹ is the reflection of the graph of f across the line y=x. Dom(f⁻¹) = Ran(f) and Ran(f⁻¹) = Dom(f).",
               hi: "f⁻¹ का अस्तित्व ⇔ f एकैकी-आच्छादक है। f⁻¹ का आलेख f के आलेख का रेखा y=x पर परावर्तन है। प्रांत(f⁻¹) = परिसर(f) और परिसर(f⁻¹) = प्रांत(f)।" } },
        { t: { en: "Binary operations", hi: "द्विआधारी संक्रियाएँ" },
          b: { en: "A binary operation ∗ on A maps A×A to A. Properties: commutative (a∗b=b∗a), associative ((a∗b)∗c=a∗(b∗c)), identity e (a∗e=e∗a=a), inverse a⁻¹ (a∗a⁻¹=e).",
               hi: "A पर एक द्विआधारी संक्रिया ∗, A×A को A में प्रतिचित्रित करती है। गुणधर्म: क्रमविनिमेय (a∗b=b∗a), साहचर्य ((a∗b)∗c=a∗(b∗c)), तत्समक e (a∗e=e∗a=a), प्रतिलोम a⁻¹ (a∗a⁻¹=e)।" } }
      ],
      formulas: [
        { n: { en: "One-one test", hi: "एकैकी जाँच" }, e: "f(x₁) = f(x₂) ⇒ x₁ = x₂" },
        { n: { en: "Onto test", hi: "आच्छादक जाँच" }, e: "∀y∈Y ∃x∈X: f(x) = y" },
        { n: { en: "Inverse of composition", hi: "संयोजन का प्रतिलोम" }, e: "(g∘f)⁻¹ = f⁻¹∘g⁻¹" },
        { n: { en: "Equivalence classes", hi: "तुल्यता वर्ग" }, e: "[a] = {x ∈ A : (a,x) ∈ R}; classes partition A" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Show that the relation R in the set R of real numbers defined as R = {(a,b) : a ≤ b²} is neither reflexive nor symmetric nor transitive.", hi: "दर्शाइए कि वास्तविक संख्याओं के समुच्चय R में R = {(a,b) : a ≤ b²} द्वारा परिभाषित संबंध R न तो स्वतुल्य, न सममित, न संक्रामक है।" },
        { board: "CBSE", year: "2022", marks: 2, en: "Let R be the relation in the set {1,2,3,4} given by R = {(1,2),(2,2),(1,1),(4,4),(1,3),(3,3),(3,2)}. Determine whether R is reflexive, symmetric or transitive.", hi: "मान लीजिए समुच्चय {1,2,3,4} में R = {(1,2),(2,2),(1,1),(4,4),(1,3),(3,3),(3,2)}। जाँचिए कि क्या R स्वतुल्य, सममित या संक्रामक है।" },
        { board: "CBSE", year: "2020", marks: 3, en: "Let A = R − {3} and B = R − {1}. Prove that f:A→B defined by f(x) = (x−2)/(x−3) is bijective.", hi: "मान लीजिए A = R − {3} और B = R − {1}। सिद्ध कीजिए कि f(x) = (x−2)/(x−3) द्वारा परिभाषित f:A→B एकैकी-आच्छादक है।" },
        { board: "CBSE", year: "2024", marks: 1, en: "Let ∗ be a binary operation on N given by a∗b = LCM(a,b). Find 20∗16.", hi: "N पर a∗b = LCM(a,b) द्वारा परिभाषित द्विआधारी संक्रिया ∗ के लिए 20∗16 ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — list each type of relation (empty, universal, reflexive, symmetric, transitive) with one concrete example each.", hi: "दिन 1 — प्रत्येक प्रकार के संबंध (रिक्त, सार्वत्रिक, स्वतुल्य, सममित, संक्रामक) की एक ठोस उदाहरण सहित सूची बनाइए।" },
        { en: "Day 2 — prove bijectivity for 8 rational functions of the form (ax+b)/(cx+d).", hi: "दिन 2 — (ax+b)/(cx+d) रूप के 8 परिमेय फलनों के लिए एकैकी-आच्छादकता सिद्ध कीजिए।" },
        { en: "Day 3 — binary operations: identify identity and inverse for +, ×, ∗=LCM, a∗b=a+b−ab.", hi: "दिन 3 — द्विआधारी संक्रियाएँ: +, ×, ∗=LCM, a∗b=a+b−ab के लिए तत्समक और प्रतिलोम पहचानिए।" }
      ],
      keywords: { en: ["reflexive", "symmetric", "transitive", "equivalence", "one-one", "onto", "bijective", "composition", "binary operation"], hi: ["स्वतुल्य", "सममित", "संक्रामक", "तुल्यता", "एकैकी", "आच्छादक", "द्विआधारी संक्रिया"] }
    },

    {
      id: 2,
      en: "Inverse Trigonometric Functions",
      hi: "प्रतिलोम त्रिकोणमितीय फलन",
      enDesc: "Principal value branches, domain and range, properties and identities relating the six inverse trigonometric functions.",
      hiDesc: "मुख्य मान शाखाएँ, प्रांत और परिसर, छह प्रतिलोम त्रिकोणमितीय फलनों के गुणधर्म और सर्वसमिकाएँ।",
      weight: 5, demand: "identity-proving", pages: "18–34",
      chaptersTag: { en: "Trigonometry", hi: "त्रिकोणमिति" },
      concepts: [
        { t: { en: "Principal value branches", hi: "मुख्य मान शाखाएँ" },
          b: { en: "sin⁻¹: [−1,1] → [−π/2, π/2]; cos⁻¹: [−1,1] → [0, π]; tan⁻¹: R → (−π/2, π/2); cosec⁻¹: |x|≥1 → [−π/2, π/2]\\{0}; sec⁻¹: |x|≥1 → [0, π]\\{π/2}; cot⁻¹: R → (0, π).",
               hi: "sin⁻¹: [−1,1] → [−π/2, π/2]; cos⁻¹: [−1,1] → [0, π]; tan⁻¹: R → (−π/2, π/2); cosec⁻¹: |x|≥1 → [−π/2, π/2]\\{0}; sec⁻¹: |x|≥1 → [0, π]\\{π/2}; cot⁻¹: R → (0, π)।" } },
        { t: { en: "Reciprocal identities", hi: "व्युत्क्रम सर्वसमिकाएँ" },
          b: { en: "sin⁻¹x + cos⁻¹x = π/2, tan⁻¹x + cot⁻¹x = π/2, sec⁻¹x + cosec⁻¹x = π/2. These hold for x in the principal domain.",
               hi: "sin⁻¹x + cos⁻¹x = π/2, tan⁻¹x + cot⁻¹x = π/2, sec⁻¹x + cosec⁻¹x = π/2। ये मुख्य प्रांत में x के लिए सत्य हैं।" } },
        { t: { en: "Addition formulas", hi: "योग सूत्र" },
          b: { en: "tan⁻¹x + tan⁻¹y = tan⁻¹[(x+y)/(1−xy)] when xy < 1; = π + tan⁻¹[(x+y)/(1−xy)] when x>0, y>0, xy>1. For 2tan⁻¹x: = tan⁻¹[2x/(1−x²)] for |x|<1.",
               hi: "tan⁻¹x + tan⁻¹y = tan⁻¹[(x+y)/(1−xy)] जब xy < 1; = π + tan⁻¹[(x+y)/(1−xy)] जब x>0, y>0, xy>1। 2tan⁻¹x के लिए: = tan⁻¹[2x/(1−x²)] जब |x|<1।" } },
        { t: { en: "Negative-argument identities", hi: "ऋणात्मक कोण सर्वसमिकाएँ" },
          b: { en: "sin⁻¹(−x) = −sin⁻¹x; tan⁻¹(−x) = −tan⁻¹x; cos⁻¹(−x) = π − cos⁻¹x; cot⁻¹(−x) = π − cot⁻¹x. Memorising these signs prevents the most common slip.",
               hi: "sin⁻¹(−x) = −sin⁻¹x; tan⁻¹(−x) = −tan⁻¹x; cos⁻¹(−x) = π − cos⁻¹x; cot⁻¹(−x) = π − cot⁻¹x। इन चिह्नों को याद रखने से सबसे सामान्य भूल बचती है।" } }
      ],
      formulas: [
        { n: { en: "Principal ranges (table)", hi: "मुख्य परिसर (तालिका)" }, e: "sin⁻¹: [−π/2, π/2], cos⁻¹: [0, π], tan⁻¹: (−π/2, π/2)" },
        { n: { en: "Co-function", hi: "सह-फलन" }, e: "sin⁻¹x + cos⁻¹x = π/2" },
        { n: { en: "Sum of arctans", hi: "arctan का योग" }, e: "tan⁻¹x + tan⁻¹y = tan⁻¹((x+y)/(1−xy))  when xy < 1" },
        { n: { en: "Double arctan", hi: "द्विगुण arctan" }, e: "2tan⁻¹x = tan⁻¹(2x/(1−x²)), |x|<1" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the principal value of tan⁻¹(−1) + cos⁻¹(−1/2).", hi: "tan⁻¹(−1) + cos⁻¹(−1/2) का मुख्य मान ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 2, en: "Prove that tan⁻¹(1/5) + tan⁻¹(1/7) + tan⁻¹(1/3) + tan⁻¹(1/8) = π/4.", hi: "सिद्ध कीजिए कि tan⁻¹(1/5) + tan⁻¹(1/7) + tan⁻¹(1/3) + tan⁻¹(1/8) = π/4।" },
        { board: "CBSE", year: "2020", marks: 2, en: "Prove that 2sin⁻¹(3/5) − tan⁻¹(17/31) = π/4.", hi: "सिद्ध कीजिए कि 2sin⁻¹(3/5) − tan⁻¹(17/31) = π/4।" },
        { board: "CBSE", year: "2024", marks: 1, en: "What is the principal value of sin⁻¹(−√3/2)?", hi: "sin⁻¹(−√3/2) का मुख्य मान क्या है?" }
      ],
      plan: [
        { en: "Day 1 — write the principal domain/range table for all six functions from memory.", hi: "दिन 1 — छह फलनों के लिए मुख्य प्रांत/परिसर तालिका स्मृति से लिखिए।" },
        { en: "Day 2 — practice 12 principal-value questions mixing positive and negative arguments.", hi: "दिन 2 — धनात्मक और ऋणात्मक कोणों को मिलाकर 12 मुख्य-मान प्रश्न कीजिए।" },
        { en: "Day 3 — identity proofs: 6 sum-type and 6 double-arctan-type.", hi: "दिन 3 — सर्वसमिका सिद्धि: 6 योग-प्रकार और 6 द्विगुण-arctan-प्रकार।" }
      ],
      keywords: { en: ["principal value", "arcsin", "arctan", "identity", "domain", "range"], hi: ["मुख्य मान", "प्रतिलोम ज्या", "व्युत्क्रम ज्या", "सर्वसमिका"] }
    },

    {
      id: 3,
      en: "Matrices",
      hi: "आव्यूह",
      enDesc: "Types of matrices, equality, addition, scalar and matrix multiplication, transpose, symmetric and skew-symmetric matrices, elementary operations and inverse.",
      hiDesc: "आव्यूहों के प्रकार, समानता, योग, अदिश व आव्यूह गुणन, परिवर्त, सममित और विषम-सममित आव्यूह, प्रारंभिक संक्रियाएँ और प्रतिलोम।",
      weight: 8, demand: "computational", pages: "35–76",
      chaptersTag: { en: "Linear algebra", hi: "रैखिक बीजगणित" },
      concepts: [
        { t: { en: "Order and equality", hi: "क्रम और समानता" },
          b: { en: "A matrix of order m×n has m rows and n columns. Two matrices are equal iff they have the same order and every corresponding entry is equal.",
               hi: "कोटि m×n के आव्यूह में m पंक्तियाँ और n स्तंभ होते हैं। दो आव्यूह समान हैं यदि उनकी कोटि समान हो और संगत प्रविष्टियाँ बराबर हों।" } },
        { t: { en: "Matrix multiplication is NOT commutative", hi: "आव्यूह गुणन क्रमविनिमेय नहीं" },
          b: { en: "AB ≠ BA in general. AB is defined only when cols(A) = rows(B); entry (AB)ᵢⱼ = Σₖ aᵢₖbₖⱼ. Multiplication is associative: (AB)C = A(BC) and distributes over addition.",
               hi: "सामान्यतः AB ≠ BA। AB परिभाषित है जब स्तंभ(A) = पंक्तियाँ(B); प्रविष्टि (AB)ᵢⱼ = Σₖ aᵢₖbₖⱼ। गुणन साहचर्य है: (AB)C = A(BC) तथा योग पर बंटन करता है।" } },
        { t: { en: "Transpose properties", hi: "परिवर्त के गुणधर्म" },
          b: { en: "(Aᵀ)ᵀ = A; (A+B)ᵀ = Aᵀ+Bᵀ; (kA)ᵀ = kAᵀ; (AB)ᵀ = BᵀAᵀ. Reversal of order on transpose of a product is a favourite exam trap.",
               hi: "(Aᵀ)ᵀ = A; (A+B)ᵀ = Aᵀ+Bᵀ; (kA)ᵀ = kAᵀ; (AB)ᵀ = BᵀAᵀ। गुणनफल का परिवर्त लेते समय क्रम उलट जाता है — परीक्षा का प्रिय ट्रैप।" } },
        { t: { en: "Symmetric and skew-symmetric", hi: "सममित और विषम-सममित" },
          b: { en: "A is symmetric iff Aᵀ = A; skew-symmetric iff Aᵀ = −A. Every square matrix can be written uniquely as A = ½(A+Aᵀ) + ½(A−Aᵀ), the sum of a symmetric and a skew-symmetric matrix.",
               hi: "A सममित है यदि Aᵀ = A; विषम-सममित है यदि Aᵀ = −A। प्रत्येक वर्ग आव्यूह को A = ½(A+Aᵀ) + ½(A−Aᵀ) के रूप में एक सममित और एक विषम-सममित आव्यूह के योग में अद्वितीय रूप से लिखा जा सकता है।" } },
        { t: { en: "Inverse using elementary operations", hi: "प्रारंभिक संक्रियाओं द्वारा प्रतिलोम" },
          b: { en: "Write [A | I] and apply elementary row ops to turn A into I; the right side becomes A⁻¹. If a zero appears on the diagonal, A is singular.",
               hi: "[A | I] लिखकर प्रारंभिक पंक्ति संक्रियाएँ लगाइए जिससे A, I में बदल जाए; दायाँ भाग A⁻¹ बन जाता है। यदि विकर्ण पर शून्य आ जाए, तो A अव्युत्क्रमणीय है।" } }
      ],
      formulas: [
        { n: { en: "Transpose of product", hi: "गुणनफल का परिवर्त" }, e: "(AB)ᵀ = BᵀAᵀ" },
        { n: { en: "Symmetric decomposition", hi: "सममित विघटन" }, e: "A = ½(A+Aᵀ) + ½(A−Aᵀ)" },
        { n: { en: "Inverse condition", hi: "प्रतिलोम स्थिति" }, e: "AA⁻¹ = A⁻¹A = I" },
        { n: { en: "Possible orders from n elements", hi: "n अवयवों से संभव कोटियाँ" }, e: "An m×n matrix with mn elements ⇒ all pairs (m,n) factorising mn" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 1, en: "If a matrix has 24 elements, what are the possible orders it can have?", hi: "यदि एक आव्यूह में 24 अवयव हों, तो इसकी संभावित कोटियाँ क्या हैं?" },
        { board: "CBSE", year: "2022", marks: 2, en: "If A is a square matrix such that A² = A, show that (I + A)³ = 7A + I.", hi: "यदि A एक वर्ग आव्यूह है जिससे A² = A, तो दर्शाइए कि (I + A)³ = 7A + I।" },
        { board: "CBSE", year: "2020", marks: 3, en: "Express the matrix [[2,4,−6],[7,3,5],[1,−2,4]] as the sum of a symmetric and a skew-symmetric matrix.", hi: "आव्यूह [[2,4,−6],[7,3,5],[1,−2,4]] को एक सममित और एक विषम-सममित आव्यूह के योग के रूप में व्यक्त कीजिए।" },
        { board: "CBSE", year: "2024", marks: 2, en: "Find A⁻¹ using elementary row operations for A = [[1,2],[2,−1]].", hi: "A = [[1,2],[2,−1]] के लिए प्रारंभिक पंक्ति संक्रियाओं का प्रयोग करके A⁻¹ ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — multiply 6 pairs of matrices by hand, always writing Σ_k a_ik b_kj explicitly.", hi: "दिन 1 — 6 आव्यूह-युग्मों को हाथ से गुणा कीजिए, Σ_k a_ik b_kj सदैव स्पष्ट लिखकर।" },
        { en: "Day 2 — transpose rules drill; symmetric/skew-symmetric decomposition for 3 matrices.", hi: "दिन 2 — परिवर्त नियमों का ड्रिल; 3 आव्यूहों के लिए सममित/विषम-सममित विघटन।" },
        { en: "Day 3 — find A⁻¹ by elementary operations for four 2×2 and two 3×3 matrices.", hi: "दिन 3 — चार 2×2 और दो 3×3 आव्यूहों के लिए प्रारंभिक संक्रियाओं से A⁻¹ ज्ञात कीजिए।" }
      ],
      keywords: { en: ["matrix", "transpose", "symmetric", "skew-symmetric", "inverse", "elementary operations"], hi: ["आव्यूह", "परिवर्त", "सममित", "विषम-सममित", "प्रतिलोम"] }
    },

    {
      id: 4,
      en: "Determinants",
      hi: "सारणिक",
      enDesc: "Determinants up to order 3, properties, area of triangle, minors and cofactors, adjoint and inverse, consistency of linear systems and Cramer's rule.",
      hiDesc: "कोटि 3 तक के सारणिक, गुणधर्म, त्रिभुज का क्षेत्रफल, उपसारणिक और सहखंड, सहखंडज और प्रतिलोम, रैखिक निकाय की संगतता और क्रैमर नियम।",
      weight: 9, demand: "exam-favourite", pages: "77–119",
      chaptersTag: { en: "Linear algebra", hi: "रैखिक बीजगणित" },
      concepts: [
        { t: { en: "Expanding a 3×3 determinant", hi: "3×3 सारणिक का प्रसार" },
          b: { en: "Expand along the row/column with the most zeros: |A| = Σⱼ aᵢⱼCᵢⱼ where Cᵢⱼ = (−1)ⁱ⁺ʲMᵢⱼ (cofactor).",
               hi: "सबसे अधिक शून्य वाली पंक्ति/स्तंभ से प्रसार कीजिए: |A| = Σⱼ aᵢⱼCᵢⱼ जहाँ Cᵢⱼ = (−1)ⁱ⁺ʲMᵢⱼ (सहखंड)।" } },
        { t: { en: "Properties worth memorising", hi: "याद रखने योग्य गुणधर्म" },
          b: { en: "|Aᵀ| = |A|; swapping two rows flips sign; a common factor k in one row multiplies |A| by k; two identical rows ⇒ |A|=0; Rᵢ→Rᵢ+kRⱼ does not change |A|; |AB| = |A||B|.",
               hi: "|Aᵀ| = |A|; दो पंक्तियाँ बदलने से चिह्न बदलता है; एक पंक्ति में उभयनिष्ठ k गुणनखंड |A| को k गुना करता है; दो समान पंक्तियाँ ⇒ |A|=0; Rᵢ→Rᵢ+kRⱼ से |A| नहीं बदलता; |AB| = |A||B|।" } },
        { t: { en: "Area of triangle from coordinates", hi: "निर्देशांकों से त्रिभुज का क्षेत्रफल" },
          b: { en: "Δ = ½|det[[x₁,y₁,1],[x₂,y₂,1],[x₃,y₃,1]]|. Collinearity ⇔ area = 0 ⇔ determinant = 0.",
               hi: "Δ = ½|det[[x₁,y₁,1],[x₂,y₂,1],[x₃,y₃,1]]|। संरेखता ⇔ क्षेत्रफल = 0 ⇔ सारणिक = 0।" } },
        { t: { en: "Adjoint and inverse", hi: "सहखंडज और प्रतिलोम" },
          b: { en: "adj(A) is the transpose of the cofactor matrix. Then A·adj(A) = adj(A)·A = |A|·I, so A⁻¹ = adj(A)/|A| when |A|≠0. A singular matrix (|A|=0) has no inverse.",
               hi: "adj(A) सहखंड आव्यूह का परिवर्त है। तब A·adj(A) = adj(A)·A = |A|·I, अतः |A|≠0 होने पर A⁻¹ = adj(A)/|A|। अव्युत्क्रमणीय आव्यूह (|A|=0) का प्रतिलोम नहीं होता।" } },
        { t: { en: "Consistency of AX = B", hi: "AX = B की संगतता" },
          b: { en: "System is consistent iff ρ(A) = ρ(A|B). Unique solution when ρ(A)=ρ(A|B)=n; infinitely many when ρ(A)=ρ(A|B)<n; inconsistent when ρ(A) ≠ ρ(A|B).",
               hi: "निकाय संगत है यदि ρ(A) = ρ(A|B)। अद्वितीय हल जब ρ(A)=ρ(A|B)=n; अनंत हल जब ρ(A)=ρ(A|B)<n; असंगत जब ρ(A) ≠ ρ(A|B)।" } }
      ],
      formulas: [
        { n: { en: "2×2 determinant", hi: "2×2 सारणिक" }, e: "|[[a,b],[c,d]]| = ad − bc" },
        { n: { en: "Inverse via adjugate", hi: "सहखंडज द्वारा प्रतिलोम" }, e: "A⁻¹ = adj(A) / |A|" },
        { n: { en: "Area of triangle", hi: "त्रिभुज का क्षेत्रफल" }, e: "Δ = ½|x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|" },
        { n: { en: "Cramer's rule", hi: "क्रैमर नियम" }, e: "x = D₁/D, y = D₂/D, z = D₃/D" },
        { n: { en: "Product rule", hi: "गुणनफल नियम" }, e: "|AB| = |A|·|B|" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the area of the triangle with vertices (1,0), (6,0), (4,3).", hi: "शीर्षों (1,0), (6,0), (4,3) वाले त्रिभुज का क्षेत्रफल ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Solve the system x+y+z=6, y+3z=11, x−2y+z=0 by matrix method.", hi: "आव्यूह विधि से निकाय x+y+z=6, y+3z=11, x−2y+z=0 को हल कीजिए।" },
        { board: "CBSE", year: "2020", marks: 4, en: "If A = [[2,3,1],[−4,1,5],[1,−2,0]], find A⁻¹. Hence solve 2x+3y+z=9, −4x+y+5z=13, x−2y=0.", hi: "यदि A = [[2,3,1],[−4,1,5],[1,−2,0]] हो तो A⁻¹ ज्ञात कीजिए। अतः 2x+3y+z=9, −4x+y+5z=13, x−2y=0 हल कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "If |A| = 3 where A is a 3×3 matrix, find |3A|.", hi: "यदि |A| = 3 जहाँ A एक 3×3 आव्यूह है, तो |3A| ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — expand 12 determinants of order 3, choosing the row/column with the most zeros each time.", hi: "दिन 1 — कोटि 3 के 12 सारणिक प्रसारित कीजिए, प्रत्येक बार सबसे अधिक शून्य वाली पंक्ति/स्तंभ चुनकर।" },
        { en: "Day 2 — compute adj and inverse for two 2×2 and two 3×3 matrices; verify AA⁻¹ = I.", hi: "दिन 2 — दो 2×2 और दो 3×3 आव्यूहों के लिए adj और प्रतिलोम ज्ञात कीजिए; AA⁻¹ = I का सत्यापन कीजिए।" },
        { en: "Day 3 — solve three 3-variable systems with the matrix method, checking consistency each time.", hi: "दिन 3 — आव्यूह विधि से तीन 3-चर निकाय हल कीजिए, प्रत्येक बार संगतता की जाँच कीजिए।" }
      ],
      keywords: { en: ["determinant", "minor", "cofactor", "adjoint", "inverse", "Cramer", "consistency"], hi: ["सारणिक", "सहखंड", "सहखंडज", "प्रतिलोम", "क्रैमर"] }
    },

    {
      id: 5,
      en: "Continuity and Differentiability",
      hi: "सांतत्य तथा अवकलनीयता",
      enDesc: "Continuity of functions, algebra of continuous functions, differentiability, chain rule, derivatives of implicit, inverse-trig, exponential, logarithmic and parametric functions, second-order derivatives.",
      hiDesc: "फलनों की सांतत्य, सतत फलनों का बीजगणित, अवकलनीयता, श्रृंखला नियम, अस्पष्ट, प्रतिलोम-त्रिकोणमितीय, चरघातांकी, लघुगणकीय और प्राचलिक फलनों के अवकलज, द्वितीय कोटि के अवकलज।",
      weight: 9, demand: "technique-heavy", pages: "120–162",
      chaptersTag: { en: "Calculus", hi: "कलन" },
      concepts: [
        { t: { en: "Three tests of continuity at a point", hi: "किसी बिंदु पर सांतत्य की तीन जाँचें" },
          b: { en: "f is continuous at x=c iff: (i) f(c) is defined, (ii) limₓ→c f(x) exists, (iii) limₓ→c f(x) = f(c). For piecewise functions test left-hand and right-hand limits separately.",
               hi: "x=c पर f सतत है यदि: (i) f(c) परिभाषित हो, (ii) limₓ→c f(x) का अस्तित्व हो, (iii) limₓ→c f(x) = f(c)। खंडशः फलनों के लिए बायाँ और दायाँ सीमा अलग-अलग जाँचिए।" } },
        { t: { en: "Chain rule", hi: "श्रृंखला नियम" },
          b: { en: "d/dx f(g(x)) = f′(g(x))·g′(x). For composites of several functions the chain grows: d/dx f(g(h(x))) = f′(g(h(x)))·g′(h(x))·h′(x).",
               hi: "d/dx f(g(x)) = f′(g(x))·g′(x)। अनेक फलनों के संयुक्त फलन के लिए श्रृंखला लंबी होती है: d/dx f(g(h(x))) = f′(g(h(x)))·g′(h(x))·h′(x)।" } },
        { t: { en: "Logarithmic differentiation", hi: "लघुगणकीय अवकलन" },
          b: { en: "Use when the function is a product/quotient/power of several factors, or of the form f(x)^g(x). Take ln: ln y = g(x)·ln f(x), then differentiate both sides and multiply by y.",
               hi: "जब फलन कई गुणनखंडों का गुणनफल/भागफल/घात हो, या f(x)^g(x) रूप का हो, तब इसका प्रयोग करें। ln लें: ln y = g(x)·ln f(x), फिर दोनों पक्षों का अवकलन करके y से गुणा करें।" } },
        { t: { en: "Derivatives of inverse trig functions", hi: "प्रतिलोम त्रिकोणमितीय फलनों के अवकलज" },
          b: { en: "d/dx sin⁻¹x = 1/√(1−x²); cos⁻¹x = −1/√(1−x²); tan⁻¹x = 1/(1+x²); cot⁻¹x = −1/(1+x²); sec⁻¹x = 1/(|x|√(x²−1)).",
               hi: "d/dx sin⁻¹x = 1/√(1−x²); cos⁻¹x = −1/√(1−x²); tan⁻¹x = 1/(1+x²); cot⁻¹x = −1/(1+x²); sec⁻¹x = 1/(|x|√(x²−1))।" } },
        { t: { en: "Parametric form & second derivative", hi: "प्राचलिक रूप और द्वितीय अवकलज" },
          b: { en: "If x = f(t), y = g(t) then dy/dx = (dy/dt)/(dx/dt). Second derivative: d²y/dx² = d/dt(dy/dx) ÷ dx/dt — divide by dx/dt again, NOT by d²x/dt².",
               hi: "यदि x = f(t), y = g(t) तो dy/dx = (dy/dt)/(dx/dt)। द्वितीय अवकलज: d²y/dx² = d/dt(dy/dx) ÷ dx/dt — पुनः dx/dt से भाग दें, d²x/dt² से नहीं।" } }
      ],
      formulas: [
        { n: { en: "Continuity condition", hi: "सांतत्य प्रतिबंध" }, e: "limₓ→c⁺ f(x) = limₓ→c⁻ f(x) = f(c)" },
        { n: { en: "Chain rule", hi: "श्रृंखला नियम" }, e: "(f∘g)′(x) = f′(g(x))·g′(x)" },
        { n: { en: "Derivative of xⁿ", hi: "xⁿ का अवकलज" }, e: "d/dx xⁿ = nxⁿ⁻¹" },
        { n: { en: "Derivative of eˣ and log x", hi: "eˣ और log x के अवकलज" }, e: "d/dx eˣ = eˣ , d/dx ln x = 1/x" },
        { n: { en: "Parametric second derivative", hi: "प्राचलिक द्वितीय अवकलज" }, e: "d²y/dx² = (d/dt(dy/dx)) / (dx/dt)" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Prove that f(x) = 5x − 3 is continuous at x = 0, x = −3 and x = 5.", hi: "सिद्ध कीजिए कि f(x) = 5x − 3, x = 0, x = −3 और x = 5 पर सतत है।" },
        { board: "CBSE", year: "2022", marks: 2, en: "Differentiate sin²x w.r.t. e^cosx.", hi: "sin²x का e^cosx के सापेक्ष अवकलन कीजिए।" },
        { board: "CBSE", year: "2020", marks: 3, en: "If x = a(cos t + t sin t), y = a(sin t − t cos t), find d²y/dx².", hi: "यदि x = a(cos t + t sin t), y = a(sin t − t cos t) हो तो d²y/dx² ज्ञात कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "If y = log(tan x), find dy/dx.", hi: "यदि y = log(tan x) हो तो dy/dx ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — 20 continuity tests: polynomials, rational, trig, piecewise with LHL/RHL.", hi: "दिन 1 — 20 सांतत्य जाँचें: बहुपद, परिमेय, त्रिकोणमितीय, खंडशः (LHL/RHL सहित)।" },
        { en: "Day 2 — chain rule on 30 mixed functions (inverse trig, exponential, log).", hi: "दिन 2 — 30 मिश्रित फलनों पर श्रृंखला नियम (प्रतिलोम त्रिकोण, चरघातांकी, लघुगणक)।" },
        { en: "Day 3 — logarithmic diff (8 problems) + parametric second derivatives (6 problems).", hi: "दिन 3 — लघुगणकीय अवकलन (8 प्रश्न) + प्राचलिक द्वितीय अवकलज (6 प्रश्न)।" }
      ],
      keywords: { en: ["continuity", "differentiability", "chain rule", "logarithmic differentiation", "parametric"], hi: ["सांतत्य", "अवकलनीयता", "श्रृंखला नियम", "लघुगणकीय अवकलन"] }
    },

    {
      id: 6,
      en: "Applications of Derivatives",
      hi: "अवकलज के अनुप्रयोग",
      enDesc: "Rate of change, increasing/decreasing functions, tangents and normals, approximation, maxima and minima (first and second derivative tests) and word problems.",
      hiDesc: "परिवर्तन दर, वर्धमान/ह्रासमान फलन, स्पर्श रेखाएँ और अभिलंब, सन्निकटन, उच्चिष्ठ और निम्निष्ठ (प्रथम/द्वितीय अवकलज परीक्षण) तथा शाब्दिक प्रश्न।",
      weight: 8, demand: "word-problem", pages: "163–202",
      chaptersTag: { en: "Calculus", hi: "कलन" },
      concepts: [
        { t: { en: "Rate of change", hi: "परिवर्तन दर" },
          b: { en: "If y = f(x), dy/dx at x₀ is the instantaneous rate of change of y w.r.t. x at x₀. For related rates, differentiate the relation connecting two variables w.r.t. time.",
               hi: "यदि y = f(x), तो x₀ पर dy/dx, y की x के सापेक्ष तात्क्षणिक परिवर्तन दर है। संबंधित दरों के लिए दो चरों के बीच संबंध का समय के सापेक्ष अवकलन कीजिए।" } },
        { t: { en: "Increasing / decreasing", hi: "वर्धमान / ह्रासमान" },
          b: { en: "f is increasing on (a,b) iff f′(x) ≥ 0 throughout; strictly increasing iff f′(x) > 0. Decreasing iff f′(x) ≤ 0 (< 0 for strictly). Find the sign of f′(x) via a wavy-curve on f′(x)=0 roots.",
               hi: "(a,b) पर f वर्धमान है यदि f′(x) ≥ 0; निरंतर वर्धमान है यदि f′(x) > 0। ह्रासमान है यदि f′(x) ≤ 0 (< 0 निरंतर ह्रासमान के लिए)। f′(x)=0 के मूलों पर तरंग-वक्र विधि से चिह्न ज्ञात कीजिए।" } },
        { t: { en: "Tangent and normal", hi: "स्पर्श रेखा और अभिलंब" },
          b: { en: "Slope of tangent at (x₀,y₀) is m = f′(x₀); slope of normal is −1/m. Equation: y − y₀ = m(x − x₀) for tangent; y − y₀ = (−1/m)(x − x₀) for normal.",
               hi: "(x₀,y₀) पर स्पर्श रेखा की प्रवणता m = f′(x₀); अभिलंब की प्रवणता −1/m। समीकरण: स्पर्श रेखा के लिए y − y₀ = m(x − x₀); अभिलंब के लिए y − y₀ = (−1/m)(x − x₀)।" } },
        { t: { en: "Maxima/minima — first and second derivative tests", hi: "उच्चिष्ठ/निम्निष्ठ — प्रथम/द्वितीय अवकलज परीक्षण" },
          b: { en: "Critical points: f′(c)=0 or f′(c) DNE. First test: f′ changes +→− ⇒ local max; −→+ ⇒ local min. Second test: f″(c)<0 ⇒ max; f″(c)>0 ⇒ min; f″(c)=0 ⇒ inconclusive.",
               hi: "क्रांतिक बिंदु: f′(c)=0 या f′(c) विद्यमान नहीं। प्रथम परीक्षण: f′ का चिह्न +→− ⇒ स्थानीय उच्चिष्ठ; −→+ ⇒ स्थानीय निम्निष्ठ। द्वितीय परीक्षण: f″(c)<0 ⇒ उच्चिष्ठ; f″(c)>0 ⇒ निम्निष्ठ; f″(c)=0 ⇒ अनिर्णीत।" } },
        { t: { en: "Absolute extrema on a closed interval", hi: "संवृत अंतराल पर निरपेक्ष उच्चिष्ठ/निम्निष्ठ" },
          b: { en: "Evaluate f at every critical point AND at both endpoints; the largest value is the absolute maximum, the smallest is absolute minimum.",
               hi: "प्रत्येक क्रांतिक बिंदु और दोनों अंतबिंदुओं पर f के मान ज्ञात कीजिए; सबसे बड़ा मान निरपेक्ष उच्चिष्ठ, सबसे छोटा निरपेक्ष निम्निष्ठ होता है।" } }
      ],
      formulas: [
        { n: { en: "Tangent line", hi: "स्पर्श रेखा" }, e: "y − y₀ = f′(x₀)(x − x₀)" },
        { n: { en: "Normal line", hi: "अभिलंब" }, e: "y − y₀ = (−1/f′(x₀))(x − x₀)" },
        { n: { en: "Increasing test", hi: "वर्धमान जाँच" }, e: "f′(x) > 0 ⇒ strictly increasing" },
        { n: { en: "Second-derivative test", hi: "द्वितीय-अवकलज परीक्षण" }, e: "f′(c)=0, f″(c) < 0 ⇒ max; f″(c) > 0 ⇒ min" },
        { n: { en: "Approximation", hi: "सन्निकटन" }, e: "f(x+Δx) ≈ f(x) + f′(x)·Δx" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the rate of change of the area of a circle w.r.t. its radius r when r = 3 cm.", hi: "जब r = 3 cm हो तो वृत्त के क्षेत्रफल की त्रिज्या r के सापेक्ष परिवर्तन दर ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Find the intervals in which f(x) = 2x³ − 9x² + 12x + 15 is increasing or decreasing.", hi: "वे अंतराल ज्ञात कीजिए जिनमें f(x) = 2x³ − 9x² + 12x + 15 वर्धमान या ह्रासमान है।" },
        { board: "CBSE", year: "2020", marks: 4, en: "Prove that the volume of the largest cone that can be inscribed in a sphere of radius R is 8/27 of the volume of the sphere.", hi: "सिद्ध कीजिए कि त्रिज्या R वाले गोले में अंतःनिर्मित सबसे बड़े शंकु का आयतन गोले के आयतन का 8/27 होता है।" },
        { board: "CBSE", year: "2024", marks: 1, en: "Find the slope of the tangent to the curve y = x³ − x at x = 2.", hi: "वक्र y = x³ − x के x = 2 पर स्पर्श रेखा की प्रवणता ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — 10 rate-of-change problems; always write the relation in symbols before differentiating.", hi: "दिन 1 — 10 परिवर्तन-दर प्रश्न; अवकलन से पहले सदैव संबंध प्रतीकों में लिखिए।" },
        { en: "Day 2 — increasing/decreasing: solve f′(x)=0 and sign-test for 6 functions.", hi: "दिन 2 — वर्धमान/ह्रासमान: 6 फलनों के लिए f′(x)=0 हल करके चिह्न-परीक्षण कीजिए।" },
        { en: "Day 3 — maxima/minima word problems (5 problems): fencing, box volume, inscribed figures.", hi: "दिन 3 — उच्चिष्ठ/निम्निष्ठ शाब्दिक प्रश्न (5): बाड़, डिब्बे का आयतन, अंतःस्थ आकृतियाँ।" }
      ],
      keywords: { en: ["rate of change", "tangent", "normal", "increasing", "decreasing", "maxima", "minima"], hi: ["परिवर्तन दर", "स्पर्श रेखा", "वर्धमान", "उच्चिष्ठ", "निम्निष्ठ"] }
    },

    {
      id: 7,
      en: "Integrals",
      hi: "समाकलन",
      enDesc: "Integration as inverse of differentiation, methods of integration (substitution, partial fractions, by parts), definite integrals, the Fundamental Theorem of Calculus and evaluation by substitution.",
      hiDesc: "अवकलन के प्रतिलोम के रूप में समाकलन, समाकलन की विधियाँ (प्रतिस्थापन, आंशिक भिन्न, खंडशः), निश्चित समाकलन, कलन की मूलभूत प्रमेय और प्रतिस्थापन द्वारा मान ज्ञात करना।",
      weight: 10, demand: "core", pages: "225–292",
      chaptersTag: { en: "Calculus", hi: "कलन" },
      concepts: [
        { t: { en: "Antiderivative (indefinite integral)", hi: "प्रतिअवकलज (अनिश्चित समाकलन)" },
          b: { en: "∫f(x)dx = F(x)+C where F′(x) = f(x); C is the constant of integration. Differentiate the answer to check it.",
               hi: "∫f(x)dx = F(x)+C जहाँ F′(x) = f(x); C समाकलन अचर है। जाँच के लिए उत्तर का अवकलन करें।" } },
        { t: { en: "Standard forms", hi: "मानक रूप" },
          b: { en: "∫xⁿ dx = xⁿ⁺¹/(n+1)+C (n≠−1); ∫1/x dx = ln|x|+C; ∫eˣdx = eˣ+C; ∫sinx dx = −cosx+C; ∫cosx dx = sinx+C; ∫tanx dx = −ln|cosx|+C.",
               hi: "∫xⁿ dx = xⁿ⁺¹/(n+1)+C (n≠−1); ∫1/x dx = ln|x|+C; ∫eˣdx = eˣ+C; ∫sinx dx = −cosx+C; ∫cosx dx = sinx+C; ∫tanx dx = −ln|cosx|+C।" } },
        { t: { en: "Integration by substitution", hi: "प्रतिस्थापन द्वारा समाकलन" },
          b: { en: "If ∫f(g(x))g′(x)dx, set u = g(x), then du = g′(x)dx and integral becomes ∫f(u)du. Choose u to collapse the messiest part.",
               hi: "∫f(g(x))g′(x)dx में u = g(x) रखें, तब du = g′(x)dx तथा समाकलन ∫f(u)du हो जाता है। u को सबसे जटिल भाग को सिकोड़ने के लिए चुनें।" } },
        { t: { en: "Integration by parts", hi: "खंडशः समाकलन" },
          b: { en: "∫u dv = uv − ∫v du. Pick u using ILATE: Inverse-trig, Log, Algebraic, Trig, Exponential (first in list is u). For ∫eˣ(f + f′) dx the answer is eˣf(x) + C.",
               hi: "∫u dv = uv − ∫v du। u का चुनाव ILATE क्रम से करें: प्रतिलोम-त्रिकोण, Log, बीजीय, त्रिकोण, चरघातांकी (सूची में पहला u)। ∫eˣ(f + f′)dx का उत्तर eˣf(x) + C है।" } },
        { t: { en: "Definite integral & Fundamental Theorem", hi: "निश्चित समाकलन और मूलभूत प्रमेय" },
          b: { en: "∫ₐᵇ f(x)dx = F(b)−F(a) where F′ = f. Property: ∫ₐᵇf(x)dx = ∫ₐᵇf(a+b−x)dx (reflection). For even f, ∫₋ₐᵃf = 2∫₀ᵃf; for odd f it is 0.",
               hi: "∫ₐᵇ f(x)dx = F(b)−F(a) जहाँ F′ = f। गुणधर्म: ∫ₐᵇf(x)dx = ∫ₐᵇf(a+b−x)dx (परावर्तन)। सम f के लिए ∫₋ₐᵃf = 2∫₀ᵃf; विषम f के लिए 0।" } }
      ],
      formulas: [
        { n: { en: "Power rule", hi: "घात नियम" }, e: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C, n ≠ −1" },
        { n: { en: "By parts", hi: "खंडशः" }, e: "∫u dv = uv − ∫v du" },
        { n: { en: "Fundamental Theorem", hi: "मूलभूत प्रमेय" }, e: "d/dx ∫ₐˣ f(t) dt = f(x)" },
        { n: { en: "Reflection property", hi: "परावर्तन गुणधर्म" }, e: "∫ₐᵇ f(x) dx = ∫ₐᵇ f(a+b−x) dx" },
        { n: { en: "Even/odd symmetry", hi: "सम/विषम सममिति" }, e: "∫₋ₐᵃ f = 2∫₀ᵃ f (even), = 0 (odd)" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find ∫ tan²(x/2) dx.", hi: "∫ tan²(x/2) dx ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Evaluate ∫ dx / (x(x⁵+3)).", hi: "∫ dx / (x(x⁵+3)) का मान ज्ञात कीजिए।" },
        { board: "CBSE", year: "2020", marks: 4, en: "Evaluate ∫₀^(π/2) x sinx / (1 + cos²x) dx.", hi: "∫₀^(π/2) x sinx / (1 + cos²x) dx का मान ज्ञात कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "Evaluate ∫ dx / (1 + x²).", hi: "∫ dx / (1 + x²) का मान ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — commit the 12 standard forms to memory; verify each by differentiating back.", hi: "दिन 1 — 12 मानक रूप कंठस्थ करें; प्रत्येक को अवकलित करके सत्यापन करें।" },
        { en: "Day 2 — 15 substitution integrals (trig, algebraic, e^x forms).", hi: "दिन 2 — 15 प्रतिस्थापन समाकलन (त्रिकोण, बीजीय, e^x रूप)।" },
        { en: "Day 3 — 6 partial fractions + 6 by-parts + 6 definite integrals with reflection property.", hi: "दिन 3 — 6 आंशिक भिन्न + 6 खंडशः + 6 परावर्तन गुणधर्म वाले निश्चित समाकलन।" }
      ],
      keywords: { en: ["integration", "substitution", "partial fractions", "by parts", "definite integral", "Fundamental Theorem"], hi: ["समाकलन", "प्रतिस्थापन", "आंशिक भिन्न", "खंडशः", "निश्चित समाकलन"] }
    },

    {
      id: 8,
      en: "Applications of Integrals",
      hi: "समाकलनों के अनुप्रयोग",
      enDesc: "Area under simple curves and area between two curves using integration.",
      hiDesc: "सरल वक्रों के नीचे क्षेत्रफल तथा दो वक्रों के बीच का क्षेत्रफल समाकलन द्वारा।",
      weight: 5, demand: "sketch-first", pages: "293–300",
      chaptersTag: { en: "Calculus", hi: "कलन" },
      concepts: [
        { t: { en: "Area under a curve", hi: "वक्र के नीचे क्षेत्रफल" },
          b: { en: "A = ∫ₐᵇ f(x) dx when f(x) ≥ 0 on [a,b]. Always sketch first; where f(x) dips below the axis, split the interval and integrate |f(x)|.",
               hi: "जब [a,b] पर f(x) ≥ 0 तो A = ∫ₐᵇ f(x) dx। सदैव पहले चित्र बनाइए; जहाँ f(x) अक्ष के नीचे जाए, अंतराल को विभाजित कर |f(x)| का समाकलन करें।" } },
        { t: { en: "Area between two curves", hi: "दो वक्रों के बीच क्षेत्रफल" },
          b: { en: "A = ∫ₐᵇ [upper − lower] dx where a,b are intersection points found by solving f(x)=g(x).",
               hi: "A = ∫ₐᵇ [ऊपरी − निचला] dx जहाँ a,b, f(x)=g(x) हल करके पाए गए प्रतिच्छेद बिंदु हैं।" } },
        { t: { en: "Symmetry shortcuts", hi: "सममिति शॉर्टकट" },
          b: { en: "Circle x²+y²=r²: area in first quadrant = πr²/4; ellipse x²/a²+y²/b²=1: total area πab; parabola-line area: exploit x-axis or y-axis symmetry to halve the integral.",
               hi: "वृत्त x²+y²=r²: प्रथम चतुर्थांश क्षेत्रफल = πr²/4; दीर्घवृत्त x²/a²+y²/b²=1: कुल क्षेत्रफल πab; परवलय-रेखा क्षेत्रफल: x-अक्ष या y-अक्ष सममिति से समाकलन आधा हो जाता है।" } }
      ],
      formulas: [
        { n: { en: "Area under y=f(x)", hi: "y=f(x) के नीचे क्षेत्रफल" }, e: "A = ∫ₐᵇ f(x) dx" },
        { n: { en: "Area between curves", hi: "वक्रों के बीच क्षेत्रफल" }, e: "A = ∫ₐᵇ [f(x) − g(x)] dx, f ≥ g" },
        { n: { en: "Area of ellipse", hi: "दीर्घवृत्त का क्षेत्रफल" }, e: "πab" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 3, en: "Find the area of the region bounded by the parabola y² = 4x and the line y = 2x.", hi: "परवलय y² = 4x और रेखा y = 2x से घिरे क्षेत्र का क्षेत्रफल ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Find the area of the region bounded by the ellipse x²/16 + y²/9 = 1.", hi: "दीर्घवृत्त x²/16 + y²/9 = 1 से घिरे क्षेत्र का क्षेत्रफल ज्ञात कीजिए।" },
        { board: "CBSE", year: "2020", marks: 4, en: "Using integration, find the area of the triangle PQR with vertices P(2,5), Q(4,7) and R(6,2).", hi: "समाकलन का प्रयोग करके शीर्षों P(2,5), Q(4,7), R(6,2) वाले त्रिभुज PQR का क्षेत्रफल ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — 4 problems on area under a single curve (parabola, circle quadrant, sin/cos).", hi: "दिन 1 — एकल वक्र के नीचे क्षेत्रफल के 4 प्रश्न (परवलय, वृत्त चतुर्थांश, sin/cos)।" },
        { en: "Day 2 — 4 problems between two curves (always solve f(x)=g(x) first).", hi: "दिन 2 — दो वक्रों के बीच क्षेत्रफल के 4 प्रश्न (सदैव पहले f(x)=g(x) हल करें)।" }
      ],
      keywords: { en: ["area under curve", "area between curves", "integration", "sketch"], hi: ["वक्र के नीचे क्षेत्रफल", "वक्रों के बीच", "समाकलन"] }
    },

    {
      id: 9,
      en: "Differential Equations",
      hi: "अवकल समीकरण",
      enDesc: "Order and degree, general and particular solutions, variable separable method, homogeneous equations and linear differential equations of first order.",
      hiDesc: "कोटि और घात, व्यापक और विशिष्ट हल, चर-पृथक्करणीय विधि, समघात समीकरणें और प्रथम कोटि के रैखिक अवकल समीकरण।",
      weight: 7, demand: "formula-recognition", pages: "301–338",
      chaptersTag: { en: "Calculus / DE", hi: "कलन / अवकल समीकरण" },
      concepts: [
        { t: { en: "Order and degree", hi: "कोटि और घात" },
          b: { en: "Order is the order of the highest derivative present. Degree is the power to which the highest derivative is raised, AFTER the equation has been cleared of radicals/ fractions w.r.t. derivatives.",
               hi: "कोटि समीकरण में उपस्थित उच्चतम अवकलज की कोटि है। घात, उच्चतम अवकलज की वह घात है जो समीकरण को अवकलजों के सापेक्ष करणी/हर से मुक्त करने के बाद आती है।" } },
        { t: { en: "Variable separable form", hi: "चर पृथक्करणीय रूप" },
          b: { en: "If dy/dx = f(x)g(y), write dy/g(y) = f(x)dx and integrate both sides. Add the constant and apply initial conditions if given.",
               hi: "यदि dy/dx = f(x)g(y) हो तो dy/g(y) = f(x)dx लिखकर दोनों पक्षों का समाकलन करें। अचर जोड़ें और प्रारंभिक प्रतिबंध दिए हों तो लगाएँ।" } },
        { t: { en: "Homogeneous equations", hi: "समघात समीकरणें" },
          b: { en: "dy/dx = F(y/x): substitute v = y/x so y = vx and dy/dx = v + x(dv/dx), leading to a separable equation in v and x.",
               hi: "dy/dx = F(y/x): v = y/x प्रतिस्थापित करें, तब y = vx और dy/dx = v + x(dv/dx), जिससे v व x में पृथक्करणीय समीकरण बन जाती है।" } },
        { t: { en: "Linear DE dy/dx + Py = Q", hi: "रैखिक अवकल समीकरण dy/dx + Py = Q" },
          b: { en: "Compute integrating factor IF = e^∫P dx. Multiply both sides by IF; the left side becomes d/dx(y·IF) = Q·IF. Integrate. If equation is dx/dy + Px = Q (x as dependent var), treat y as the independent variable.",
               hi: "समाकलन गुणक IF = e^∫P dx ज्ञात करें। दोनों पक्षों को IF से गुणा करें; बायाँ पक्ष d/dx(y·IF) = Q·IF बन जाता है। समाकलन करें। यदि समीकरण dx/dy + Px = Q है तो y को स्वतंत्र चर मानें।" } }
      ],
      formulas: [
        { n: { en: "Separable", hi: "पृथक्करणीय" }, e: "dy/g(y) = f(x) dx" },
        { n: { en: "Homogeneous substitution", hi: "समघात प्रतिस्थापन" }, e: "v = y/x ⇒ dy/dx = v + x dv/dx" },
        { n: { en: "Integrating factor", hi: "समाकलन गुणक" }, e: "IF = exp(∫P dx)" },
        { n: { en: "Solution of linear DE", hi: "रैखिक अवकल समीकरण का हल" }, e: "y·IF = ∫Q·IF dx + C" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the general solution of dy/dx = e^{x+y}.", hi: "dy/dx = e^{x+y} का व्यापक हल ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Solve the differential equation x dy/dx + 2y = x² (x ≠ 0) given that y = 1 when x = 2.", hi: "अवकल समीकरण x dy/dx + 2y = x² (x ≠ 0) को हल कीजिए, दिया है कि x = 2 पर y = 1।" },
        { board: "CBSE", year: "2020", marks: 4, en: "Find the particular solution of dy/dx + y cot x = 2x + x² cot x (x ≠ 0), given y = 0 when x = π/2.", hi: "dy/dx + y cot x = 2x + x² cot x (x ≠ 0) का विशिष्ट हल ज्ञात कीजिए, दिया है x = π/2 पर y = 0।" },
        { board: "CBSE", year: "2024", marks: 1, en: "Write the integrating factor of dy/dx + (sec x) y = tan x.", hi: "dy/dx + (sec x) y = tan x का समाकलन गुणक लिखिए।" }
      ],
      plan: [
        { en: "Day 1 — identify order/degree for 10 equations; solve 8 variable-separable problems.", hi: "दिन 1 — 10 समीकरणों की कोटि/घात पहचानिए; 8 चर-पृथक्करण प्रश्न हल कीजिए।" },
        { en: "Day 2 — 6 homogeneous equations (always substitute v=y/x).", hi: "दिन 2 — 6 समघात समीकरणें (सदैव v=y/x प्रतिस्थापित करें)।" },
        { en: "Day 3 — 8 linear DEs using the IF formula, including two with initial conditions.", hi: "दिन 3 — IF सूत्र से 8 रैखिक अवकल समीकरणें, जिनमें दो प्रारंभिक प्रतिबंध सहित हों।" }
      ],
      keywords: { en: ["differential equation", "order", "degree", "separable", "homogeneous", "integrating factor", "linear"], hi: ["अवकल समीकरण", "कोटि", "घात", "पृथक्करणीय", "समघात", "समाकलन गुणक"] }
    },

    {
      id: 10,
      en: "Vector Algebra",
      hi: "सदिश बीजगणित",
      enDesc: "Types of vectors, addition, scalar multiplication, components, section formula, scalar (dot) product, vector (cross) product and projection.",
      hiDesc: "सदिशों के प्रकार, योग, अदिश गुणन, घटक, विभाजन सूत्र, अदिश (डॉट) गुणनफल, सदिश (क्रॉस) गुणनफल और प्रक्षेप।",
      weight: 6, demand: "geometric", pages: "339–377",
      chaptersTag: { en: "Vectors & 3D", hi: "सदिश एवं त्रिविमीय ज्यामिति" },
      concepts: [
        { t: { en: "Components and magnitude", hi: "घटक और परिमाण" },
          b: { en: "For a = a₁i+a₂j+a₃k: |a| = √(a₁²+a₂²+a₃²). Unit vector â = a/|a|. Direction cosines l, m, n satisfy l²+m²+n² = 1 and a = |a|(li+mj+nk).",
               hi: "a = a₁i+a₂j+a₃k के लिए: |a| = √(a₁²+a₂²+a₃²)। इकाई सदिश â = a/|a|। दिक् कोसाइन l,m,n के लिए l²+m²+n² = 1 और a = |a|(li+mj+nk)।" } },
        { t: { en: "Section formula", hi: "विभाजन सूत्र" },
          b: { en: "Position vector of the point dividing AB internally in ratio m:n is (n a + m b)/(m+n); midpoint = (a+b)/2.",
               hi: "AB को आंतरिक रूप से m:n अनुपात में बाँटने वाले बिंदु का स्थिति सदिश (n a + m b)/(m+n) है; मध्यबिंदु = (a+b)/2।" } },
        { t: { en: "Dot product", hi: "डॉट गुणनफल (अदिश गुणनफल)" },
          b: { en: "a·b = |a||b|cosθ = a₁b₁+a₂b₂+a₃b₃. Perpendicularity ⇔ a·b = 0. Projection of a on b = (a·b)/|b|.",
               hi: "a·b = |a||b|cosθ = a₁b₁+a₂b₂+a₃b₃। लंबवत्ता ⇔ a·b = 0। a का b पर प्रक्षेप = (a·b)/|b|।" } },
        { t: { en: "Cross product", hi: "क्रॉस गुणनफल (सदिश गुणनफल)" },
          b: { en: "a×b = |a||b|sinθ n̂ (direction by right-hand rule). In components it is the determinant of the i,j,k matrix. a×a = 0; a×b = −b×a; |a×b| = area of parallelogram spanned by a and b.",
               hi: "a×b = |a||b|sinθ n̂ (दाहिने हाथ के नियम से दिशा)। घटकों में यह i,j,k सारणिक है। a×a = 0; a×b = −b×a; |a×b|, a और b द्वारा बनाए गए समांतर चतुर्भुज का क्षेत्रफल है।" } }
      ],
      formulas: [
        { n: { en: "Magnitude", hi: "परिमाण" }, e: "|a₁i+a₂j+a₃k| = √(a₁²+a₂²+a₃²)" },
        { n: { en: "Dot product", hi: "अदिश गुणनफल" }, e: "a·b = Σaᵢbᵢ = |a||b|cosθ" },
        { n: { en: "Cross product", hi: "सदिश गुणनफल" }, e: "a×b = |a||b|sinθ n̂; perpendicular to both" },
        { n: { en: "Area of parallelogram", hi: "समांतर चतुर्भुज क्षेत्रफल" }, e: "|a×b|" },
        { n: { en: "Section formula (internal)", hi: "विभाजन सूत्र (आंतरिक)" }, e: "r = (n a + m b)/(m+n)" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the magnitude of the vector a = 3i − 4j. Find a unit vector in its direction.", hi: "सदिश a = 3i − 4j का परिमाण ज्ञात कीजिए। इसकी दिशा में एक इकाई सदिश ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 2, en: "Find the projection of a = i+3j+7k on b = 7i−j+8k.", hi: "सदिश a = i+3j+7k का b = 7i−j+8k पर प्रक्षेप ज्ञात कीजिए।" },
        { board: "CBSE", year: "2020", marks: 3, en: "If a = i+2j+3k and b = 2i+4j−5k represent two adjacent sides of a parallelogram, find unit vectors parallel to its diagonals.", hi: "यदि a = i+2j+3k और b = 2i+4j−5k एक समांतर चतुर्भुज की दो आसन्न भुजाएँ हैं, तो इसके विकर्णों के समांतर इकाई सदिश ज्ञात कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "If |a|=2, |b|=3 and a·b = 3, find the angle between a and b.", hi: "यदि |a|=2, |b|=3 और a·b = 3, तो a और b के बीच का कोण ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — 10 problems on magnitude, unit vector, direction cosines, section formula.", hi: "दिन 1 — परिमाण, इकाई सदिश, दिक् कोसाइन, विभाजन सूत्र पर 10 प्रश्न।" },
        { en: "Day 2 — 8 dot-product problems (angle, perpendicular, projection).", hi: "दिन 2 — डॉट गुणनफल के 8 प्रश्न (कोण, लंबवत्ता, प्रक्षेप)।" },
        { en: "Day 3 — 6 cross-product problems (area of triangle/parallelogram, perpendicular vector).", hi: "दिन 3 — क्रॉस गुणनफल के 6 प्रश्न (त्रिभुज/समांतर चतुर्भुज क्षेत्रफल, लंब सदिश)।" }
      ],
      keywords: { en: ["vector", "dot product", "cross product", "projection", "magnitude", "unit vector"], hi: ["सदिश", "अदिश गुणनफल", "सदिश गुणनफल", "प्रक्षेप"] }
    },

    {
      id: 11,
      en: "Three Dimensional Geometry",
      hi: "त्रिविमीय ज्यामिति",
      enDesc: "Direction cosines/ratios, equations of a line (Cartesian & vector), angle between two lines, shortest distance between skew lines, equations of a plane, angle between planes, distance from a point to a plane.",
      hiDesc: "दिक् कोसाइन/अनुपात, रेखा के समीकरण (कार्तीय और सदिश), दो रेखाओं के बीच कोण, विषमतलीय रेखाओं के बीच न्यूनतम दूरी, समतल के समीकरण, समतलों के बीच कोण, बिंदु से समतल दूरी।",
      weight: 8, demand: "formula-heavy", pages: "378–394",
      chaptersTag: { en: "Vectors & 3D", hi: "सदिश एवं त्रिविमीय ज्यामिति" },
      concepts: [
        { t: { en: "Direction cosines from direction ratios", hi: "दिक् अनुपात से दिक् कोसाइन" },
          b: { en: "If DRs are a,b,c then DCs are ±(a,b,c)/√(a²+b²+c²). Choose signs to match orientation.",
               hi: "यदि दिक् अनुपात a,b,c हों तो दिक् कोसाइन ±(a,b,c)/√(a²+b²+c²) हैं। दिशा के अनुसार चिह्न चुनें।" } },
        { t: { en: "Equation of a line", hi: "रेखा का समीकरण" },
          b: { en: "Vector: r = a + tb; Cartesian: (x−x₁)/a₁ = (y−y₁)/b₁ = (z−z₁)/c₁. For a line through two points a and c: b = c−a.",
               hi: "सदिश: r = a + tb; कार्तीय: (x−x₁)/a₁ = (y−y₁)/b₁ = (z−z₁)/c₁। दो बिंदुओं a और c से होकर जाने वाली रेखा के लिए b = c−a।" } },
        { t: { en: "Angle between lines & shortest distance", hi: "रेखाओं के बीच कोण और न्यूनतम दूरी" },
          b: { en: "cosθ = |b₁·b₂|/(|b₁||b₂|). Skew distance: |(a₂−a₁)·(b₁×b₂)| / |b₁×b₂|. Parallel distance: |(a₂−a₁)×b|/|b|.",
               hi: "cosθ = |b₁·b₂|/(|b₁||b₂|)। विषमतलीय दूरी: |(a₂−a₁)·(b₁×b₂)| / |b₁×b₂|। समांतर दूरी: |(a₂−a₁)×b|/|b|।" } },
        { t: { en: "Plane equations", hi: "समतल के समीकरण" },
          b: { en: "Normal form: r·n = d ⇔ lx+my+nz = p (n̂=(l,m,n)). Through a point and normal n: (r−a)·n=0. Intercept form: x/a + y/b + z/c = 1.",
               hi: "अभिलंब रूप: r·n = d ⇔ lx+my+nz = p (n̂=(l,m,n))। एक बिंदु और अभिलंब n से: (r−a)·n=0। अंत:खंड रूप: x/a + y/b + z/c = 1।" } },
        { t: { en: "Distance point-to-plane", hi: "बिंदु से समतल दूरी" },
          b: { en: "Distance from (x₁,y₁,z₁) to ax+by+cz+d=0 is |ax₁+by₁+cz₁+d|/√(a²+b²+c²). Angle between two planes: cosφ = |n₁·n₂|/(|n₁||n₂|).",
               hi: "(x₁,y₁,z₁) से ax+by+cz+d=0 की दूरी |ax₁+by₁+cz₁+d|/√(a²+b²+c²) है। दो समतलों के बीच कोण: cosφ = |n₁·n₂|/(|n₁||n₂|)।" } }
      ],
      formulas: [
        { n: { en: "Line through a with dir b", hi: "a से दिशा b वाली रेखा" }, e: "r = a + tb" },
        { n: { en: "Angle between lines", hi: "रेखाओं के बीच कोण" }, e: "cosθ = |b₁·b₂|/(|b₁||b₂|)" },
        { n: { en: "Skew distance", hi: "विषमतलीय दूरी" }, e: "|(a₂−a₁)·(b₁×b₂)| / |b₁×b₂|" },
        { n: { en: "Point to plane", hi: "बिंदु से समतल" }, e: "|ax₁+by₁+cz₁+d|/√(a²+b²+c²)" },
        { n: { en: "Plane through a and normal n", hi: "a से n अभिलंब वाला समतल" }, e: "(r − a)·n = 0" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Find the direction cosines of the line making angles 90°, 135°, 45° with the x, y, z axes.", hi: "x, y, z अक्षों से 90°, 135°, 45° के कोण बनाने वाली रेखा के दिक् कोसाइन ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "Find the shortest distance between the lines r = (i+2j+3k) + λ(i−3j+2k) and r = (4i+5j+6k) + μ(2i+3j+k).", hi: "रेखाओं r = (i+2j+3k) + λ(i−3j+2k) और r = (4i+5j+6k) + μ(2i+3j+k) के बीच न्यूनतम दूरी ज्ञात कीजिए।" },
        { board: "CBSE", year: "2020", marks: 3, en: "Find the distance of the point (2,1,−1) from the plane x−2y+4z=9.", hi: "बिंदु (2,1,−1) की समतल x−2y+4z=9 से दूरी ज्ञात कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "Write the direction cosines of the line (x−2)/2 = (y+1)/−2 = (z−1)/1.", hi: "रेखा (x−2)/2 = (y+1)/−2 = (z−1)/1 के दिक् कोसाइन लिखिए।" }
      ],
      plan: [
        { en: "Day 1 — DC/DR conversions; write equations of lines from points and directions.", hi: "दिन 1 — DC/DR रूपांतरण; बिंदु और दिशा से रेखा-समीकरण लिखिए।" },
        { en: "Day 2 — angle between lines and skew distance (4 problems each).", hi: "दिन 2 — रेखाओं के बीच कोण और विषमतलीय दूरी (प्रत्येक के 4 प्रश्न)।" },
        { en: "Day 3 — plane equations and point-plane distance (6 problems).", hi: "दिन 3 — समतल समीकरण और बिंदु-समतल दूरी (6 प्रश्न)।" }
      ],
      keywords: { en: ["direction cosines", "direction ratios", "line in space", "skew lines", "plane", "distance"], hi: ["दिक् कोसाइन", "दिक् अनुपात", "अंतरिक्ष में रेखा", "विषमतलीय", "समतल", "दूरी"] }
    },

    {
      id: 12,
      en: "Linear Programming",
      hi: "रैखिक प्रोग्रामन",
      enDesc: "Formulation of LPP, graphical solution, feasible region and corner-point method, unbounded/cases with no solution.",
      hiDesc: "LPP का सूत्रीकरण, ग्राफीय हल, सुसंगत क्षेत्र और कोना-बिंदु विधि, अपरिबद्ध/अव्यवहार्य स्थितियाँ।",
      weight: 5, demand: "graphical", pages: "395–412",
      chaptersTag: { en: "Optimisation", hi: "इष्टतमीकरण" },
      concepts: [
        { t: { en: "Formulating an LPP", hi: "LPP सूत्रीकरण" },
          b: { en: "Identify decision variables, write the linear objective function Z = ax+by, then write all constraints as linear inequalities plus x,y ≥ 0.",
               hi: "निर्णय चर पहचानिए, रैखिक उद्देश्य फलन Z = ax+by लिखिए, फिर सभी बाधाओं को रैखिक असमिकाओं और x,y ≥ 0 के रूप में लिखिए।" } },
        { t: { en: "Graphical method", hi: "ग्राफीय विधि" },
          b: { en: "Plot each constraint as a line, shade the feasible side, intersect to find the convex polygonal feasible region.",
               hi: "प्रत्येक बाधा को रेखा के रूप में खींचिए, सुसंगत पक्ष छायांकित कीजिए, सर्वनिष्ठ से उत्तल बहुभुजाकार सुसंगत क्षेत्र प्राप्त कीजिए।" } },
        { t: { en: "Corner Point Theorem", hi: "कोना-बिंदु प्रमेय" },
          b: { en: "If a finite optimum exists for a bounded feasible region, it occurs at a corner (vertex). For unbounded regions, also check whether the open half-plane defined by the objective inequality intersects the feasible region.",
               hi: "यदि परिबद्ध सुसंगत क्षेत्र में परिमित इष्टतम है तो वह किसी शीर्ष (vertex) पर होता है। अपरिबद्ध क्षेत्र के लिए जाँचें कि उद्देश्य असमिका का खुला अर्ध-तल सुसंगत क्षेत्र को काटता है या नहीं।" } }
      ],
      formulas: [
        { n: { en: "Objective", hi: "उद्देश्य फलन" }, e: "Max/min Z = ax + by" },
        { n: { en: "Corner point method", hi: "कोना-बिंदु विधि" }, e: "Evaluate Z at every vertex; pick the max/min" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 4, en: "Maximise Z = 3x + 4y subject to x + y ≤ 4, x ≥ 0, y ≥ 0.", hi: "Z = 3x + 4y का x + y ≤ 4, x ≥ 0, y ≥ 0 के अंतर्गत अधिकतम मान ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 4, en: "Minimise Z = −3x + 4y subject to x+2y ≤ 8, 3x+2y ≤ 12, x ≥ 0, y ≥ 0.", hi: "Z = −3x + 4y का x+2y ≤ 8, 3x+2y ≤ 12, x ≥ 0, y ≥ 0 के अंतर्गत न्यूनतम मान ज्ञात कीजिए।" },
        { board: "CBSE", year: "2020", marks: 5, en: "A factory produces two items A and B; each A needs 1 hour of grinding and 2 hours of polishing; each B needs 2 hours of grinding and 1 hour of polishing. With grinding ≤ 20 hrs/week and polishing ≤ 16 hrs/week, and profit ₹5 and ₹3 per unit respectively, maximise the profit.", hi: "एक कारखाना दो वस्तुएँ A और B बनाता है; A को 1 घंटा पिसाई और 2 घंटे पॉलिशिंग चाहिए; B को 2 घंटे पिसाई और 1 घंटा पॉलिशिंग। पिसाई ≤ 20 घंटे/सप्ताह, पॉलिशिंग ≤ 16 घंटे/सप्ताह, और लाभ क्रमशः ₹5 तथा ₹3 प्रति इकाई है। लाभ अधिकतम कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — formulate 6 LPPs from word problems (diet, production, transport).", hi: "दिन 1 — शाब्दिक प्रश्नों से 6 LPP सूत्रबद्ध कीजिए (आहार, उत्पादन, परिवहन)।" },
        { en: "Day 2 — solve 5 LPPs graphically, listing all corner points and evaluating Z.", hi: "दिन 2 — 5 LPP ग्राफीय विधि से हल कीजिए, सभी शीर्षों की सूची बनाकर Z के मान लिखिए।" }
      ],
      keywords: { en: ["linear programming", "objective", "constraints", "feasible region", "corner point"], hi: ["रैखिक प्रोग्रामन", "उद्देश्य फलन", "बाधाएँ", "सुसंगत क्षेत्र", "कोना-बिंदु"] }
    },

    {
      id: 13,
      en: "Probability",
      hi: "प्रायिकता",
      enDesc: "Conditional probability, multiplication theorem, independent events, Bayes' theorem, total probability, random variables and the binomial distribution.",
      hiDesc: "सप्रतिबंध प्रायिकता, गुणन प्रमेय, स्वतंत्र घटनाएँ, बेज़ प्रमेय, कुल प्रायिकता, यादृच्छिक चर और द्विपद बंटन।",
      weight: 8, demand: "scoring", pages: "407–462",
      chaptersTag: { en: "Probability", hi: "प्रायिकता" },
      concepts: [
        { t: { en: "Conditional probability", hi: "सप्रतिबंध प्रायिकता" },
          b: { en: "P(A|B) = P(A∩B)/P(B), defined when P(B) > 0. Properties: 0 ≤ P(A|B) ≤ 1; P(A′|B) = 1 − P(A|B); P(A∪C|B) = P(A|B)+P(C|B)−P(A∩C|B).",
               hi: "P(A|B) = P(A∩B)/P(B), जब P(B) > 0। गुणधर्म: 0 ≤ P(A|B) ≤ 1; P(A′|B) = 1 − P(A|B); P(A∪C|B) = P(A|B)+P(C|B)−P(A∩C|B)।" } },
        { t: { en: "Multiplication rule & independence", hi: "गुणन नियम और स्वतंत्रता" },
          b: { en: "P(A∩B) = P(A)·P(B|A). A and B are independent iff P(A∩B) = P(A)·P(B). Note: mutually exclusive ≠ independent (unless one has probability 0).",
               hi: "P(A∩B) = P(A)·P(B|A)। A और B स्वतंत्र हैं यदि P(A∩B) = P(A)·P(B)। ध्यान दें: परस्पर अपवर्जी ≠ स्वतंत्र (जब तक किसी की प्रायिकता 0 न हो)।" } },
        { t: { en: "Total probability", hi: "कुल प्रायिकता" },
          b: { en: "If E₁,…,Eₙ partition the sample space, P(A) = ΣP(Eᵢ)P(A|Eᵢ).",
               hi: "यदि E₁,…,Eₙ प्रतिदर्श समष्टि का विभाजन करें, तो P(A) = ΣP(Eᵢ)P(A|Eᵢ)।" } },
        { t: { en: "Bayes' theorem", hi: "बेज़ प्रमेय" },
          b: { en: "P(Eᵢ|A) = P(Eᵢ)·P(A|Eᵢ) / ΣⱼP(Eⱼ)·P(A|Eⱼ). Label events clearly before writing: prior P(Eᵢ) and likelihood P(A|Eᵢ).",
               hi: "P(Eᵢ|A) = P(Eᵢ)·P(A|Eᵢ) / ΣⱼP(Eⱼ)·P(A|Eⱼ)। लिखने से पहले घटनाओं को स्पष्ट नाम दें: पूर्व P(Eᵢ) और संभाव्यता P(A|Eᵢ)।" } },
        { t: { en: "Binomial distribution", hi: "द्विपद बंटन" },
          b: { en: "If an experiment has two outcomes (success with prob p, failure q=1−p) repeated n independent times, then P(X=r) = ⁿCᵣ pʳ qⁿ⁻ʳ. Mean = np, variance = npq.",
               hi: "यदि एक प्रयोग के दो परिणाम (p प्रायिकता से सफलता, q=1−p से असफलता) हों और उसे n स्वतंत्र बार दोहराया जाए, तो P(X=r) = ⁿCᵣ pʳ qⁿ⁻ʳ। माध्य = np, प्रसरण = npq।" } }
      ],
      formulas: [
        { n: { en: "Conditional", hi: "सप्रतिबंध" }, e: "P(A|B) = P(A∩B)/P(B)" },
        { n: { en: "Multiplication", hi: "गुणन नियम" }, e: "P(A∩B) = P(A) P(B|A)" },
        { n: { en: "Total probability", hi: "कुल प्रायिकता" }, e: "P(A) = ΣP(Eᵢ) P(A|Eᵢ)" },
        { n: { en: "Bayes", hi: "बेज़" }, e: "P(Eᵢ|A) = P(Eᵢ)P(A|Eᵢ) / ΣP(Eⱼ)P(A|Eⱼ)" },
        { n: { en: "Binomial", hi: "द्विपद" }, e: "P(X=r) = ⁿCᵣ pʳ qⁿ⁻ʳ; mean=np, var=npq" }
      ],
      pyqs: [
        { board: "CBSE", year: "2023", marks: 2, en: "Given P(A)=0.8, P(B)=0.5 and P(B|A)=0.4, find P(A|B).", hi: "दिया है P(A)=0.8, P(B)=0.5 और P(B|A)=0.4, तो P(A|B) ज्ञात कीजिए।" },
        { board: "CBSE", year: "2022", marks: 3, en: "A bag contains 4 red and 4 black balls; another bag contains 2 red and 6 black balls. One ball is drawn from a randomly chosen bag and it is red. Find the probability it came from the first bag.", hi: "एक थैले में 4 लाल और 4 काली गेंदें हैं; दूसरे थैले में 2 लाल और 6 काली गेंदें हैं। यादृच्छया चुने गए एक थैले से एक गेंद निकाली जाती है जो लाल है। प्रायिकता ज्ञात कीजिए कि वह पहले थैले से निकली थी।" },
        { board: "CBSE", year: "2020", marks: 4, en: "A die is thrown 6 times. If 'getting an odd number' is a success, find P of (i) 5 successes (ii) at least 5 successes (iii) at most 5 successes.", hi: "एक पासे को 6 बार फेंका जाता है। यदि 'विषम संख्या' सफलता हो, तो (i) 5 सफलताएँ (ii) कम से कम 5 सफलताएँ (iii) अधिक से अधिक 5 सफलताएँ की प्रायिकता ज्ञात कीजिए।" },
        { board: "CBSE", year: "2024", marks: 1, en: "If A and B are independent events with P(A)=0.3, P(B)=0.6, find P(A∪B).", hi: "यदि A और B स्वतंत्र घटनाएँ हैं, P(A)=0.3, P(B)=0.6, तो P(A∪B) ज्ञात कीजिए।" }
      ],
      plan: [
        { en: "Day 1 — conditional probability and multiplication rule (10 problems using tree diagrams).", hi: "दिन 1 — सप्रतिबंध प्रायिकता और गुणन नियम (वृक्ष आरेखों के साथ 10 प्रश्न)।" },
        { en: "Day 2 — 4 total-probability and 4 Bayes' theorem problems (label events first).", hi: "दिन 2 — 4 कुल-प्रायिकता और 4 बेज़ प्रमेय के प्रश्न (पहले घटनाओं को नाम दें)।" },
        { en: "Day 3 — 6 binomial-distribution problems (compute P(X=r), mean, variance).", hi: "दिन 3 — 6 द्विपद-बंटन प्रश्न (P(X=r), माध्य, प्रसरण)।" }
      ],
      keywords: { en: ["conditional probability", "independent events", "Bayes", "total probability", "binomial distribution"], hi: ["सप्रतिबंध प्रायिकता", "स्वतंत्र घटनाएँ", "बेज़", "कुल प्रायिकता", "द्विपद बंटन"] }
    }
  ];

  // Seeded CBSE-style question bank for Class 12 Maths.
  // ch IDs here match the chapter IDs in CHAPTERS (1..13).
  // All entries have cls:12, subject:"maths" so they are isolated from Class 10 PYQs.
  const EXTRA_PYQ = [
    {"id": "m12c-1-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 1, "m": 2, "kind": 2, "d": 2, "en": "Show that the relation R in the set A of all triangles defined by R = {(T1,T2) : T1 is similar to T2} is an equivalence relation. Consider three right-angled triangles T1(3,4,5), T2(5,12,13), T3(6,8,10). Which triangles among T1, T2, T3 are related?", "hi": "दर्शाइए कि सभी त्रिभुजों के समुच्चय A में R = {(T1,T2) : T1, T2 के समरूप है} एक तुल्यता संबंध है। तीन समकोण त्रिभुजों T1(3,4,5), T2(5,12,13), T3(6,8,10) में कौन परस्पर संबंधित हैं?", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-1-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 1, "m": 2, "kind": 2, "d": 2, "en": "Show that the relation R in the set A of points in a plane, given by R = {(P,Q): distance of P from origin equals distance of Q from origin}, is an equivalence relation.", "hi": "दर्शाइए कि समतल के बिंदुओं के समुच्चय A में R = {(P,Q) : मूलबिंदु से P की दूरी = मूलबिंदु से Q की दूरी} एक तुल्यता संबंध है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-1-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 1, "m": 2, "kind": 2, "d": 1, "en": "Let the binary operation * on N be defined by a*b = LCM(a,b). Find 5*7 and 20*16.", "hi": "N पर द्विआधारी संक्रिया a*b = LCM(a,b) से परिभाषित है। 5*7 और 20*16 ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-1-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 1, "m": 3, "kind": 4, "d": 3, "en": "Show that f: N→N given by f(n) = n+1 if n is odd and f(n) = n−1 if n is even is bijective.", "hi": "दर्शाइए कि f(n) = n+1 (n विषम) और f(n) = n−1 (n सम) द्वारा प्रदत्त f:N→N एकैकी-आच्छादक है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-2-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 2, "m": 2, "kind": 2, "d": 1, "en": "Find the principal value of sin⁻¹(−1/2).", "hi": "sin⁻¹(−1/2) का मुख्य मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-2-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 2, "m": 2, "kind": 2, "d": 1, "en": "Find the principal value of cos⁻¹(√3/2).", "hi": "cos⁻¹(√3/2) का मुख्य मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-2-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 2, "m": 2, "kind": 2, "d": 2, "en": "Prove that 3 sin⁻¹x = sin⁻¹(3x − 4x³) for x ∈ [−1/2, 1/2].", "hi": "सिद्ध कीजिए कि x ∈ [−1/2, 1/2] के लिए 3 sin⁻¹x = sin⁻¹(3x − 4x³)।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-2-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 2, "m": 3, "kind": 4, "d": 3, "en": "Solve tan⁻¹(2x) + tan⁻¹(3x) = π/4.", "hi": "हल कीजिए tan⁻¹(2x) + tan⁻¹(3x) = π/4।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-3-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 3, "m": 1, "kind": 2, "d": 1, "en": "If a matrix has 18 elements, what are the possible orders it can have?", "hi": "यदि किसी आव्यूह में 18 अवयव हों, तो इसकी संभावित कोटियाँ क्या हैं?", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-3-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 3, "m": 2, "kind": 2, "d": 2, "en": "Construct a 2×2 matrix A = [aij] whose elements are given by aij = (i+j)²/2.", "hi": "एक 2×2 आव्यूह A = [aij] की रचना कीजिए जिसके अवयव aij = (i+j)²/2 हैं।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-3-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 3, "m": 2, "kind": 2, "d": 2, "en": "A bookshop has 10 dozen chemistry, 8 dozen physics and 10 dozen economics books priced at ₹80, ₹60 and ₹40 each respectively. Using matrix algebra find the total amount the shop receives from selling all books.", "hi": "एक दुकान में 10 दर्जन रसायन, 8 दर्जन भौतिकी और 10 दर्जन अर्थशास्त्र की पुस्तकें हैं जिनके मूल्य क्रमशः ₹80, ₹60, ₹40 हैं। आव्यूह बीजगणित से कुल प्राप्त धनराशि ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-3-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 3, "m": 3, "kind": 4, "d": 2, "en": "If A = [[1,0,2],[0,2,1],[2,0,3]], prove that A³ − 6A² + 7A + 2I = O.", "hi": "यदि A = [[1,0,2],[0,2,1],[2,0,3]] हो तो सिद्ध कीजिए A³ − 6A² + 7A + 2I = O।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-4-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 4, "m": 2, "kind": 2, "d": 2, "en": "Find the equation of the line joining A(1,3) and B(0,0) using determinants, and find k if D(k,0) is such that the area of triangle ABD is 3 square units.", "hi": "सारणिक का प्रयोग करके A(1,3), B(0,0) को मिलाने वाली रेखा का समीकरण ज्ञात कीजिए और k ज्ञात कीजिए यदि D(k,0) से त्रिभुज ABD का क्षेत्रफल 3 वर्ग इकाई हो।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-4-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 4, "m": 3, "kind": 4, "d": 2, "en": "Solve by matrix method: 2x + 3y + 3z = 5, x − 2y + z = −4, 3x − y − 2z = 3.", "hi": "आव्यूह विधि से हल कीजिए: 2x+3y+3z=5, x−2y+z=−4, 3x−y−2z=3।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-4-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 4, "m": 4, "kind": 5, "d": 3, "en": "The cost of 4 kg onion, 3 kg wheat and 2 kg rice is ₹60; 2 kg onion, 4 kg wheat and 6 kg rice is ₹90; 6 kg onion, 2 kg wheat and 3 kg rice is ₹70. Find the cost of each item per kg by matrix method.", "hi": "4 किग्रा प्याज + 3 किग्रा गेहूँ + 2 किग्रा चावल = ₹60; 2 किग्रा प्याज + 4 किग्रा गेहूँ + 6 किग्रा चावल = ₹90; 6 किग्रा प्याज + 2 किग्रा गेहूँ + 3 किग्रा चावल = ₹70। आव्यूह विधि से प्रत्येक का प्रति किग्रा मूल्य ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-4-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 4, "m": 2, "kind": 2, "d": 1, "en": "Using determinants find the area of triangle with vertices (2,7), (1,1), (10,8).", "hi": "सारणिक का प्रयोग कर शीर्षों (2,7), (1,1), (10,8) वाले त्रिभुज का क्षेत्रफल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-5-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 5, "m": 2, "kind": 2, "d": 2, "en": "Find a and b so that f(x) = ax+1 for x≤3 and f(x) = bx+3 for x>3 is continuous at x = 3.", "hi": "a और b ज्ञात कीजिए जिससे f(x) = ax+1 (x≤3), f(x) = bx+3 (x>3), x=3 पर सतत हो।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-5-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 5, "m": 2, "kind": 2, "d": 1, "en": "Differentiate sin(cos(x²)) with respect to x.", "hi": "sin(cos(x²)) का x के सापेक्ष अवकलन कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-5-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 5, "m": 3, "kind": 4, "d": 2, "en": "If x = a(cos t + t sin t), y = a(sin t − t cos t), find d²y/dx².", "hi": "यदि x = a(cos t + t sin t), y = a(sin t − t cos t) हो तो d²y/dx² ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-5-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 5, "m": 2, "kind": 2, "d": 2, "en": "If eʸ(x+1) = 1, show that d²y/dx² = (dy/dx)².", "hi": "यदि eʸ(x+1) = 1 हो तो दर्शाइए d²y/dx² = (dy/dx)²।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-5-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 5, "m": 2, "kind": 2, "d": 2, "en": "Differentiate x^sinx + (sinx)^cosx with respect to x.", "hi": "x^sinx + (sinx)^cosx का x के सापेक्ष अवकलन कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 2, "kind": 2, "d": 1, "en": "A particle moves along 6y = x³ + 2. Find points where the y-coordinate changes 8 times as fast as x.", "hi": "एक कण वक्र 6y = x³ + 2 पर गति करता है। वे बिंदु ज्ञात कीजिए जहाँ y-निर्देशांक, x की अपेक्षा 8 गुना तेजी से बदल रहा है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 2, "kind": 2, "d": 2, "en": "Total revenue from sale of x units is R(x) = 13x² + 26x + 15 rupees. Find marginal revenue when x = 7.", "hi": "x इकाइयों की बिक्री से कुल आय R(x) = 13x²+26x+15 रुपये है। x = 7 पर सीमांत आय ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 2, "kind": 2, "d": 2, "en": "A spherical balloon has a variable radius. Find the rate at which its volume increases with radius when r = 10 cm.", "hi": "गोलाकार गुब्बारे की त्रिज्या परिवर्तनशील है। r = 10 सेमी पर आयतन की त्रिज्या के सापेक्ष वृद्धि दर ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 3, "kind": 4, "d": 2, "en": "Find the intervals in which f(x) = 2x³ − 9x² + 12x + 15 is (i) increasing (ii) decreasing.", "hi": "f(x) = 2x³ − 9x² + 12x + 15 के लिए (i) वर्धमान (ii) ह्रासमान अंतराल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 4, "kind": 5, "d": 3, "en": "Prove that the largest cone inscribed in a sphere of radius R has volume 8/27 that of the sphere.", "hi": "सिद्ध कीजिए कि त्रिज्या R के गोले में अंतःनिर्मित सबसे बड़े शंकु का आयतन, गोले के आयतन का 8/27 होता है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-006", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 4, "kind": 5, "d": 3, "en": "Show that the semi-vertical angle of a right circular cone of given total surface area and maximum volume is sin⁻¹(1/3).", "hi": "दर्शाइए कि दिए गए कुल पृष्ठीय क्षेत्रफल और अधिकतम आयतन वाले लंबवृत्तीय शंकु का अर्ध-शीर्ष कोण sin⁻¹(1/3) होता है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-6-007", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 6, "m": 3, "kind": 4, "d": 2, "en": "Find the maximum profit if profit p(x) = 41 − 72x − 18x².", "hi": "अधिकतम लाभ ज्ञात कीजिए यदि लाभ p(x) = 41 − 72x − 18x² है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 2, "kind": 2, "d": 2, "en": "Evaluate ∫ dx / (x² + 4x + 8).", "hi": "∫ dx/(x²+4x+8) का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 2, "kind": 2, "d": 2, "en": "Evaluate ∫ x log x dx.", "hi": "∫ x log x dx का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 4, "kind": 5, "d": 3, "en": "Evaluate ∫₀^π x sin x / (1 + cos²x) dx.", "hi": "∫₀^π x sin x/(1+cos²x) dx का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 2, "kind": 2, "d": 2, "en": "Evaluate ∫ dx / (x² − 6x + 13).", "hi": "∫ dx/(x²−6x+13) का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 2, "kind": 2, "d": 2, "en": "Evaluate ∫ (sin⁻¹x)² dx.", "hi": "∫ (sin⁻¹x)² dx का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-7-006", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 7, "m": 3, "kind": 4, "d": 2, "en": "Evaluate ∫ dx / √(5x² − 2x).", "hi": "∫ dx/√(5x²−2x) का मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-8-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 8, "m": 3, "kind": 4, "d": 2, "en": "Find the area bounded by y = x² and the line y = 4.", "hi": "वक्र y = x² और रेखा y = 4 से घिरे क्षेत्र का क्षेत्रफल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-8-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 8, "m": 3, "kind": 4, "d": 2, "en": "Find the area of the region bounded by the ellipse x²/16 + y²/9 = 1.", "hi": "दीर्घवृत्त x²/16 + y²/9 = 1 से घिरे क्षेत्र का क्षेत्रफल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-8-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 8, "m": 4, "kind": 5, "d": 3, "en": "Find the area bounded by the parabola y² = 4ax and its latus rectum x = a.", "hi": "परवलय y² = 4ax और उसकी नाभिलंब x = a से घिरे क्षेत्र का क्षेत्रफल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-9-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 9, "m": 1, "kind": 2, "d": 1, "en": "Write the order and degree of the differential equation d²y/dx² + (dy/dx)³ + x⁴ = 0.", "hi": "अवकल समीकरण d²y/dx²+(dy/dx)³+x⁴=0 की कोटि और घात लिखिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-9-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 9, "m": 2, "kind": 2, "d": 2, "en": "Find the general solution of dy/dx = e^{x+y}.", "hi": "dy/dx = e^{x+y} का व्यापक हल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-9-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 9, "m": 3, "kind": 4, "d": 3, "en": "Find the particular solution of (1 + e^{2x}) dy + (1 + y²)eˣ dx = 0, given y = 1 when x = 0.", "hi": "(1+e^{2x})dy + (1+y²)eˣ dx = 0 का विशिष्ट हल ज्ञात कीजिए; x=0 पर y=1 दिया है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-9-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 9, "m": 3, "kind": 4, "d": 3, "en": "Solve x dy/dx + 2y = x² (x ≠ 0), given y = 1 when x = 2.", "hi": "x dy/dx + 2y = x² (x≠0) को हल कीजिए; x=2 पर y=1 दिया है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 1, "kind": 2, "d": 1, "en": "Find the position vector of the mid-point of P(2,3,4) and Q(4,1,−2).", "hi": "P(2,3,4) और Q(4,1,−2) को मिलाने वाले सदिश के मध्य-बिंदु का स्थिति सदिश ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "Show that A(1,2,7), B(2,6,3), C(3,10,−1) are collinear.", "hi": "दर्शाइए A(1,2,7), B(2,6,3), C(3,10,−1) संरेख हैं।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "Find a unit vector perpendicular to both a+b and a−b where a = 3i+2j+2k and b = i+2j−2k.", "hi": "a = 3i+2j+2k, b = i+2j−2k के लिए a+b और a−b दोनों पर लंब एक इकाई सदिश ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "If a = 5i−j−3k, b = i+3j−5k, show that a+b and a−b are perpendicular.", "hi": "यदि a = 5i−j−3k, b = i+3j−5k हों, तो दर्शाइए a+b और a−b परस्पर लंब हैं।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "Show that the DCs of a vector equally inclined to OX, OY, OZ are ±(1/√3,1/√3,1/√3).", "hi": "दर्शाइए कि तीनों अक्षों से समान कोण बनाने वाले सदिश की दिक् कोसाइन ±(1/√3,1/√3,1/√3) होती हैं।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-006", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "Find the area of the parallelogram with adjacent sides a = i−j+3k and b = 2i−7j+k.", "hi": "a = i−j+3k, b = 2i−7j+k आसन्न भुजाओं वाले समांतर चतुर्भुज का क्षेत्रफल ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-007", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 2, "kind": 2, "d": 2, "en": "If |a|=2, |b|=3, a·b = 4, find |a−b|.", "hi": "यदि |a|=2, |b|=3, a·b=4 हो तो |a−b| ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-10-008", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 10, "m": 3, "kind": 4, "d": 3, "en": "Given a=i+4j+2k, b=3i−2j+7k, c=2i−j+4k, find d perpendicular to both a and b with c·d = 15.", "hi": "a=i+4j+2k, b=3i−2j+7k, c=2i−j+4k दिए हों तो a और b दोनों पर लंब सदिश d ज्ञात कीजिए जिससे c·d=15 हो।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 2, "kind": 2, "d": 1, "en": "Find direction cosines of the line joining (2,−3,1) and (3,1,−2).", "hi": "(2,−3,1) और (3,1,−2) को मिलाने वाली रेखा के दिक् कोसाइन ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 2, "kind": 2, "d": 2, "en": "Show that the line through (1,−1,2), (3,4,−2) is perpendicular to the line through (0,3,2), (3,5,6).", "hi": "दर्शाइए (1,−1,2), (3,4,−2) से जाने वाली रेखा (0,3,2), (3,5,6) से जाने वाली रेखा पर लंब है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 3, "kind": 4, "d": 2, "en": "Find the shortest distance between r = (i+2j+3k)+λ(i−3j+2k) and r = (4i+5j+6k)+μ(2i+3j+k).", "hi": "रेखाओं r = (i+2j+3k)+λ(i−3j+2k) और r = (4i+5j+6k)+μ(2i+3j+k) के बीच न्यूनतम दूरी ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 2, "kind": 2, "d": 2, "en": "Find the distance of (2,1,−1) from the plane x − 2y + 4z = 9.", "hi": "बिंदु (2,1,−1) की समतल x−2y+4z=9 से दूरी ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 3, "kind": 4, "d": 3, "en": "Find the foot of the perpendicular from (−1,3,4) to the plane 2x + y − 2z + 3 = 0.", "hi": "बिंदु (−1,3,4) से समतल 2x+y−2z+3=0 पर डाले गए लंब के पाद के निर्देशांक ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-11-006", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 11, "m": 2, "kind": 2, "d": 2, "en": "Find the vector equation of the plane at distance 7 from the origin with normal vector 3i + 5j − 6k.", "hi": "मूलबिंदु से 7 मात्रक दूर, अभिलंब सदिश 3i+5j−6k वाले समतल का सदिश समीकरण ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-12-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 12, "m": 4, "kind": 5, "d": 3, "en": "Maximise Z = 3x + 4y subject to x+y ≤ 4, x ≥ 0, y ≥ 0.", "hi": "व्यवरोध x+y ≤ 4, x≥0, y≥0 के अंतर्गत Z = 3x+4y का अधिकतम मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-12-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 12, "m": 4, "kind": 5, "d": 3, "en": "Minimise Z = −3x + 4y subject to x+2y ≤ 8, 3x+2y ≤ 12, x≥0, y≥0.", "hi": "व्यवरोध x+2y≤8, 3x+2y≤12, x≥0, y≥0 के अंतर्गत Z = −3x+4y का न्यूनतम मान ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-12-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 12, "m": 5, "kind": 5, "d": 3, "en": "A factory makes tennis rackets and cricket bats. A racket needs 1.5 machine-hours and 3 craftsman-hours; a bat needs 3 machine-hours and 1 craftsman-hour. At most 42 machine-hours and 24 craftsman-hours are available per day. Profit is ₹20 per racket and ₹10 per bat. Formulate and solve graphically to maximise profit.", "hi": "एक कारखाना टेनिस रैकेट और क्रिकेट बल्ले बनाता है। रैकेट पर 1.5 घंटा मशीन + 3 घंटा शिल्पकार; बल्ले पर 3 घंटा मशीन + 1 घंटा शिल्पकार लगता है। प्रतिदिन 42 घंटे मशीन व 24 घंटे शिल्पकार समय उपलब्ध है। लाभ ₹20/रैकेट व ₹10/बल्ला है। LPP बनाकर ग्राफीय विधि से अधिकतम लाभ ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-001", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 2, "kind": 2, "d": 2, "en": "Given P(A)=0.8, P(B)=0.5, P(B|A)=0.4, find P(A|B) and P(A∪B).", "hi": "P(A)=0.8, P(B)=0.5, P(B|A)=0.4 दिया है, P(A|B) और P(A∪B) ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-002", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 3, "kind": 4, "d": 2, "en": "If A and B are independent events with P(A)=0.3, P(B)=0.6, find P(A∪B) and P(B|A).", "hi": "यदि A,B स्वतंत्र, P(A)=0.3, P(B)=0.6, तो P(A∪B) और P(B|A) ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-003", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 3, "kind": 4, "d": 3, "en": "Bag I contains 4 red, 4 black; Bag II contains 2 red, 6 black. One bag is chosen at random and a red ball is drawn. Find the probability it came from Bag I.", "hi": "थैला I में 4 लाल, 4 काली; थैला II में 2 लाल, 6 काली गेंदें। एक थैला यादृच्छया चुनकर एक लाल गेंद निकलती है। प्रायिकता ज्ञात कीजिए कि वह थैला I से है।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-004", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 4, "kind": 5, "d": 3, "en": "A man speaks truth 3 out of 4 times. He throws a die and reports a six. Find the probability it is actually a six.", "hi": "एक व्यक्ति 4 में 3 बार सच बोलता है। वह पासा फेंककर छह बताता है। वास्तव में छह होने की प्रायिकता ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-005", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 3, "kind": 4, "d": 3, "en": "Given two dice show different numbers, find the probability their sum is 4.", "hi": "दो पासों पर भिन्न संख्याएँ हैं, इस प्रतिबंध के अंतर्गत योग 4 होने की प्रायिकता ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-006", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 4, "kind": 5, "d": 3, "en": "One card is lost from a 52-card pack. Two cards drawn from the remaining are both diamonds. Find the probability the lost card was a diamond.", "hi": "52 पत्तों में से एक पत्ता खो गया। शेष में से दो पत्ते निकालने पर दोनों ईंट निकले। खोया पत्ता ईंट होने की प्रायिकता ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-007", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 3, "kind": 4, "d": 2, "en": "A die is thrown 6 times; odd number is success. Find P(exactly 5 successes) and P(at least 5 successes).", "hi": "एक पासा 6 बार फेंका जाता है; विषम संख्या सफलता है। P(ठीक 5 सफलताएँ) और P(कम-से-कम 5 सफलताएँ) ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""},
    {"id": "m12c-13-008", "cls": 12, "subject": "maths", "board": "cbse", "y": 2024, "ch": 13, "m": 3, "kind": 4, "d": 2, "en": "A pair of dice is thrown 4 times; a doublet is a success. Find the probability distribution of number of successes.", "hi": "दो पासों को 4 बार फेंका जाता है; डबलेट (दोनों पर समान संख्या) सफलता है। सफलताओं की संख्या का प्रायिकता बंटन ज्ञात कीजिए।", "ans": "", "fig": null, "opts": null, "lv": "Standard", "set": "", "twist": ""}
  ];

  // Install into UP, with subject/cls tags
  UP.course12maths = CHAPTERS.map(function (c) {
    return Object.assign({ subject: "maths", className: 12 }, c);
  });

  // Push PYQs only if not already present (defensive against reloads)
  const existing = new Set((UP.pyq || []).map(function (q) { return q.id; }));
  EXTRA_PYQ.forEach(function (q) {
    if (q && q.id && !existing.has(q.id)) {
      if (q.en && !q.ans) q.ans = "";
      if (!q.fig) q.fig = null;
      if (!q.opts) q.opts = null;
      if (!q.twist) q.twist = "";
      if (!q.lv) q.lv = "Standard";
      if (!q.set) q.set = "";
      UP.pyq.push(q);
      existing.add(q.id);
    }
  });
})();
