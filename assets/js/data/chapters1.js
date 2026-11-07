/* =====================================================================
   Upay · Class 10 Mathematics · NCERT (2024–25 rationalised syllabus)
   Chapter knowledge base — part 1 (Ch 1–7)
   Bilingual: every learner-facing string has {en, hi}
   ===================================================================== */
window.UP = window.UP || {};
UP.chapters = [];

UP.chapters.push(
{
  id: 1,
  en: "Real Numbers", hi: "वास्तविक संख्याएँ",
  enDesc: "Euclid's division lemma, the Fundamental Theorem of Arithmetic, irrationality proofs, HCF & LCM.",
  hiDesc: "यूक्लिड विभाजन प्रमेयिका, अंकगणित की आधारभूत प्रमेय, अपरिमेयता की उपपत्ति, म.स. व ल.स.",
  weight: 6, demand: "easy", pages: "1–12",
  chaptersTag: { en: "Number theory", hi: "संख्या सिद्धांत" },
  concepts: [
    { t:{en:"Fundamental Theorem of Arithmetic", hi:"अंकगणित की आधारभूत प्रमेय"},
      b:{en:"Every composite number can be expressed as a product of primes, and this factorisation is unique apart from the order of the factors. Example: 32760 = 2³ × 3² × 5 × 7 × 13.",
         hi:"प्रत्येक भाज्य संख्या को अभाज्य संख्याओं के गुणनफल के रूप में व्यक्त किया जा सकता है, और गुणनखंडों के क्रम को छोड़कर यह गुणनखंडन अद्वितीय होता है। उदाहरण: 32760 = 2³ × 3² × 5 × 7 × 13।"} },
    { t:{en:"HCF and LCM from prime factorisation", hi:"अभाज्य गुणनखंडन से म.स. और ल.स."},
      b:{en:"HCF = product of the smallest power of each common prime factor. LCM = product of the greatest power of each prime factor involved. For two numbers a and b: HCF(a,b) × LCM(a,b) = a × b. This identity does NOT extend to three numbers.",
         hi:"म.स. = प्रत्येक सामान्य अभाज्य गुणनखंड की न्यूनतम घात का गुणनफल। ल.स. = प्रत्येक सम्मिलित अभाज्य गुणनखंड की अधिकतम घात का गुणनफल। दो संख्याओं a और b के लिए: म.स.(a,b) × ल.स.(a,b) = a × b। यह सर्वसमिका तीन संख्याओं के लिए लागू नहीं होती।"} },
    { t:{en:"Irrationality by contradiction", hi:"विरोधाभास द्वारा अपरिमेयता"},
      b:{en:"To prove √p is irrational (p prime): assume √p = a/b in lowest terms, square, and show p divides both a and b — contradicting that a/b was in lowest terms. The same template proves 3 + 2√5, 1/√2, √2 + √3 etc. are irrational.",
         hi:"सिद्ध करने के लिए कि √p अपरिमेय है (p अभाज्य): मान लें √p = a/b न्यूनतम रूप में है, वर्ग कीजिए और दिखाइए कि p, a और b दोनों को विभाजित करता है — जो इस तथ्य का विरोध करता है कि a/b न्यूनतम रूप में था। इसी विधि से 3 + 2√5, 1/√2, √2 + √3 आदि की अपरिमेयता सिद्ध होती है।"} },
    { t:{en:"Rational numbers have terminating or repeating decimals", hi:"परिमेय संख्याओं के दशमलव सांत या आवर्ती होते हैं"},
      b:{en:"A rational number p/q (in lowest terms) has a terminating decimal exactly when q = 2ⁿ5ᵐ. If q has any other prime factor, the decimal is non-terminating but repeating.",
         hi:"परिमेय संख्या p/q (न्यूनतम रूप में) का दशमलव सांत तभी होता है जब q = 2ⁿ5ᵐ हो। यदि q में इसके अतिरिक्त कोई अभाज्य गुणनखंड हो, तो दशमलव असांत आवर्ती होता है।"} },
    { t:{en:"Euclid's division algorithm", hi:"यूक्लिड विभाजन कलनविधि"},
      b:{en:"For positive integers a and b, there exist unique integers q and r with a = bq + r, 0 ≤ r < b. Repeatedly applying this gives HCF(a, b) = HCF(b, r). It is not part of the 2024-25 assessed syllabus but the Euclid's lemma (a = bq + r) is still used in questions.",
         hi:"धनात्मक पूर्णांकों a और b के लिए अद्वितीय पूर्णांक q और r होते हैं जहाँ a = bq + r, 0 ≤ r < b। इसे बार-बार लागू करने पर म.स.(a, b) = म.स.(b, r) मिलता है। 2024-25 के पाठ्यक्रम में यह मूल्यांकन का भाग नहीं है, परन्तु प्रश्नों में a = bq + r का उपयोग होता है।"} }
  ],
  formulas: [
    { n:{en:"For two numbers", hi:"दो संख्याओं के लिए"}, e:"HCF(a, b) × LCM(a, b) = a × b", note:{en:"Only for two numbers", hi:"केवल दो संख्याओं के लिए"} },
    { n:{en:"LCM of fractions", hi:"भिन्नों का ल.स."}, e:"LCM(a/b, c/d) = LCM(a,c) ÷ HCF(b,d)", note:{en:"Handy for quick checks", hi:"शीघ्र जाँच के लिए उपयोगी"} },
    { n:{en:"Terminating decimal test", hi:"सांत दशमलव की जाँच"}, e:"p/q terminates ⟺ q = 2ⁿ5ᵐ", note:{en:"q in lowest terms", hi:"q न्यूनतम रूप में"} },
    { n:{en:"Trailing zero test", hi:"अंत में शून्य की जाँच"}, e:"6ⁿ = 2ⁿ·3ⁿ never has factor 5 ⟹ never ends in 0", note:{en:"Typical 1-mark reasoning", hi:"सामान्य 1 अंक का तर्क प्रश्न"} }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Prove that 3 + 2√5 is irrational, given that √5 is irrational.", hi:"सिद्ध कीजिए कि 3 + 2√5 अपरिमेय है, दिया है कि √5 अपरिमेय है।", hiA:true },
    { board:"CBSE", year:"2022", marks:2,
      en:"Find the HCF and LCM of 510 and 92 and verify that HCF × LCM = product of the two numbers.", hi:"510 और 92 का म.स. तथा ल.स. ज्ञात कीजिए और सत्यापित कीजिए कि म.स. × ल.स. = दोनों संख्याओं का गुणनफल।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"Prove that 2 − √3 is an irrational number.", hi:"सिद्ध कीजिए कि 2 − √3 एक अपरिमेय संख्या है।" },
    { board:"CBSE", year:"2019", marks:3,
      en:"Show that any positive odd integer is of the form 6q + 1, 6q + 3 or 6q + 5, where q is some integer.", hi:"दर्शाइए कि कोई भी धनात्मक विषम पूर्णांक 6q + 1, 6q + 3 या 6q + 5 के रूप का होता है, जहाँ q कोई पूर्णांक है।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"Check whether 6ⁿ can end with the digit 0 for any natural number n. Justify.", hi:"जाँच कीजिए कि क्या किसी प्राकृत संख्या n के लिए 6ⁿ अंक 0 पर समाप्त हो सकती है। कारण दीजिए।" }
  ],
  plan: [
    { en:"Day 1 — read the Fundamental Theorem and write 5 factorisation examples from the exercise.", hi:"दिन 1 — आधारभूत प्रमेय पढ़ें और प्रश्नावली से 5 गुणनखंडन उदाहरण लिखें।" },
    { en:"Day 2 — do 10 HCF/LCM questions mixing two-number and three-number cases.", hi:"दिन 2 — 10 म.स./ल.स. प्रश्न करें (दो व तीन संख्याओं वाले)।" },
    { en:"Day 3 — practise the contradiction template until the 4 lines are automatic.", hi:"दिन 3 — विरोधाभास विधि का अभ्यास करें जब तक 4 पंक्तियाँ स्वाभाविक न हो जाएँ।" },
    { en:"Day 4 — 20 one-mark MCQs on terminating decimals and divisibility.", hi:"दिन 4 — सांत दशमलव व विभाज्यता पर 20 एक-अंकीय बहुविकल्पीय प्रश्न।" }
  ],
  keywords:{ en:["HCF","LCM","irrational","prime factorisation","terminating decimal","contradiction"], hi:["म.स.","ल.स.","अपरिमेय","अभाज्य गुणनखंडन","सांत दशमलव","विरोधाभास"] }
},

{
  id: 2,
  en: "Polynomials", hi: "बहुपद",
  enDesc: "Zeroes of a polynomial, geometrical meaning, and the relationship between zeroes and coefficients.",
  hiDesc: "बहुपद के शून्यक, उनका ज्यामितीय अर्थ, तथा शून्यकों और गुणांकों का संबंध।",
  weight: 4, demand: "moderate", pages: "13–27",
  chaptersTag:{ en:"Algebra", hi:"बीजगणित" },
  concepts: [
    { t:{en:"Geometrical meaning of zeroes", hi:"शून्यकों का ज्यामितीय अर्थ"},
      b:{en:"A zero of p(x) is the x-coordinate where y = p(x) cuts the x-axis. A linear polynomial has exactly 1 zero, a quadratic has at most 2, a cubic at most 3 (counting multiplicity).",
         hi:"p(x) का शून्यक वह x-निर्देशांक है जहाँ y = p(x) x-अक्ष को मिलता है। रैखिक बहुपद का ठीक 1 शून्यक, द्विघात का अधिकतम 2 तथा त्रिघात का अधिकतम 3 शून्यक होते हैं।"} },
    { t:{en:"Quadratic zeroes vs coefficients", hi:"द्विघात के शून्यक और गुणांक"},
      b:{en:"If α, β are zeroes of ax² + bx + c then α + β = −b/a and αβ = c/a. Most board questions are just these two identities rearranged (e.g. α² + β² = (α+β)² − 2αβ).",
         hi:"यदि ax² + bx + c के शून्यक α, β हों तो α + β = −b/a तथा αβ = c/a। बोर्ड के अधिकांश प्रश्न इन्हीं दो सर्वसमिकाओं के रूपांतरण हैं (जैसे α² + β² = (α+β)² − 2αβ)।"} },
    { t:{en:"Cubic zeroes vs coefficients", hi:"त्रिघात के शून्यक और गुणांक"},
      b:{en:"For ax³ + bx² + cx + d with zeroes α, β, γ: α+β+γ = −b/a, αβ+βγ+γα = c/a, αβγ = −d/a. Note the alternating signs.",
         hi:"ax³ + bx² + cx + d के शून्यक α, β, γ के लिए: α+β+γ = −b/a, αβ+βγ+γα = c/a, αβγ = −d/a। चिह्न एकांतरित होते हैं।"} },
    { t:{en:"Building a polynomial from its zeroes", hi:"शून्यकों से बहुपद बनाना"},
      b:{en:"p(x) = k[x² − (sum)x + (product)], k ≠ 0. If roots are given as fractions or surds, clear the denominators first to get the neat answer the board expects.",
         hi:"p(x) = k[x² − (योग)x + (गुणनफल)], k ≠ 0। यदि मूल भिन्न या करणी के रूप में हों तो पहले हर हटाइए ताकि वह सुगम उत्तर मिले जिसकी अपेक्षा बोर्ड करता है।"} },
    { t:{en:"Division algorithm", hi:"विभाजन एल्गोरिथ्म"},
      b:{en:"p(x) = g(x)·q(x) + r(x), where deg r < deg g. Used to find an unknown zero when the other zeroes are known: divide by their product and solve.",
         hi:"p(x) = g(x)·q(x) + r(x), जहाँ deg r < deg g। जब अन्य शून्यक ज्ञात हों तो अज्ञात शून्यक निकालने के लिए उपयोग होता है: उनके गुणनफल से भाग दीजिए और हल कीजिए।"} }
  ],
  formulas: [
    { n:{en:"Quadratic zeroes", hi:"द्विघात के शून्यक"}, e:"α + β = −b/a ,  αβ = c/a" },
    { n:{en:"Symmetry identities", hi:"सममित सर्वसमिकाएँ"}, e:"α² + β² = (α+β)² − 2αβ ; 1/α + 1/β = (α+β)/αβ" },
    { n:{en:"Build the polynomial", hi:"बहुपद बनाइए"}, e:"p(x) = x² − (α+β)x + αβ", note:{en:"Put k = 1", hi:"k = 1 रखें"} },
    { n:{en:"Cubic relations", hi:"त्रिघात संबंध"}, e:"α+β+γ = −b/a ; αβ+βγ+γα = c/a ; αβγ = −d/a" },
    { n:{en:"Difference of zeroes", hi:"शून्यकों का अंतर"}, e:"|α − β| = √(b² − 4ac) / |a|" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"If α and β are zeroes of the quadratic polynomial x² − 6x + 8, find the value of α² + β².", hi:"यदि द्विघात बहुपद x² − 6x + 8 के शून्यक α और β हैं, तो α² + β² का मान ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Find the zeroes of the polynomial 4x² − 4x + 1 and verify the relationship between the zeroes and its coefficients.", hi:"बहुपद 4x² − 4x + 1 के शून्यक ज्ञात कीजिए तथा शून्यकों और गुणांकों के संबंध का सत्यापन कीजिए।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"If one zero of 2x² + 3x + k is the reciprocal of the other, find k.", hi:"यदि 2x² + 3x + k का एक शून्यक दूसरे का व्युत्क्रम है, तो k ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:1,
      en:"If one of the zeroes of the quadratic polynomial (k − 1)x² + kx + 1 is −3, then find k.", hi:"यदि द्विघात बहुपद (k − 1)x² + kx + 1 का एक शून्यक −3 है, तो k ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:2,
      en:"Find a quadratic polynomial whose sum and product of zeroes are √2 and 1/3 respectively.", hi:"ऐसा द्विघात बहुपद ज्ञात कीजिए जिसके शून्यकों का योग √2 और गुणनफल 1/3 है।" }
  ],
  plan: [
    { en:"Sketch 6 graphs and read off the number of zeroes — this is a repeated 1-mark question.", hi:"6 ग्राफ बनाइए और शून्यकों की संख्या पढ़िए — यह बार-बार पूछा जाने वाला 1-अंक प्रश्न है।" },
    { en:"Memorise the 3 quadratic and 3 cubic relations, then derive α² + β² yourself.", hi:"3 द्विघात और 3 त्रिघात संबंध याद कीजिए, फिर α² + β² स्वयं व्युत्पन्न कीजिए।" },
    { en:"Practise 'find the missing zero' using division, twice.", hi:"'अज्ञात शून्यक ज्ञात कीजिए' प्रश्न विभाजन से दो बार कीजिए।" },
    { en:"Do the 'reciprocal / equal zeroes' condition questions — they are nearly guaranteed.", hi:"'व्युत्क्रम / समान शून्यक' शर्त वाले प्रश्न कीजिए — ये लगभग निश्चित होते हैं।" }
  ],
  keywords:{ en:["zeroes","coefficients","sum","product","graph","cubic"], hi:["शून्यक","गुणांक","योग","गुणनफल","ग्राफ","त्रिघात"] }
},

{
  id: 3,
  en: "Pair of Linear Equations in Two Variables", hi: "दो चरों वाले रैखिक समीकरण युग्म",
  enDesc: "Graphical and algebraic solutions; consistency of a pair of equations.",
  hiDesc: "ग्राफीय तथा बीजगणितीय हल; समीकरण युग्म की संगतता।",
  weight: 6, demand: "moderate", pages: "28–43",
  chaptersTag:{ en:"Algebra", hi:"बीजगणित" },
  concepts: [
    { t:{en:"The three-case test", hi:"तीन स्थितियों की जाँच"},
      b:{en:"For a₁x + b₁y + c₁ = 0 and a₂x + b₂y + c₂ = 0: if a₁/a₂ ≠ b₁/b₂ → unique solution (intersecting lines). If a₁/a₂ = b₁/b₂ ≠ c₁/c₂ → no solution (parallel). If a₁/a₂ = b₁/b₂ = c₁/c₂ → infinite solutions (coincident).",
         hi:"a₁x + b₁y + c₁ = 0 और a₂x + b₂y + c₂ = 0 के लिए: यदि a₁/a₂ ≠ b₁/b₂ → अद्वितीय हल (प्रतिच्छेदी रेखाएँ)। यदि a₁/a₂ = b₁/b₂ ≠ c₁/c₂ → कोई हल नहीं (समांतर)। यदि a₁/a₂ = b₁/b₂ = c₁/c₂ → अपरिमित हल (संपाती)।"} },
    { t:{en:"Substitution", hi:"प्रतिस्थापन"},
      b:{en:"Make one variable the subject of the simpler equation, substitute into the other, solve, then back-substitute. Best when a coefficient is 1 or −1.",
         hi:"सरल समीकरण से एक चर को व्यक्त कीजिए, दूसरे में प्रतिस्थापित कीजिए, हल कीजिए, फिर वापस रखिए। जब कोई गुणांक 1 या −1 हो तब सर्वोत्तम।"} },
    { t:{en:"Elimination", hi:"विलोपन"},
      b:{en:"Multiply each equation so one variable cancels on addition. Best when coefficients are large or when fractions appear — it avoids fraction arithmetic.",
         hi:"समीकरणों को ऐसे गुणा कीजिए कि जोड़ने पर एक चर कट जाए। जब गुणांक बड़े हों या भिन्न आएँ तब सर्वोत्तम — भिन्नों की गणना से बचाव होता है।"} },
    { t:{en:"Cross-multiplication", hi:"वज्र-गुणन"},
      b:{en:"x/(b₁c₂ − b₂c₁) = y/(c₁a₂ − c₂a₁) = 1/(a₁b₂ − a₂b₁). A one-line formula that also reveals consistency from the denominators. (Not separately examined but allowed in solutions.)",
         hi:"x/(b₁c₂ − b₂c₁) = y/(c₁a₂ − c₂a₁) = 1/(a₁b₂ − a₂b₁)। एक पंक्ति का सूत्र जो हरों से संगतता भी बताता है।"} },
    { t:{en:"Word problems: set up, don't solve first", hi:"शब्द समस्याएँ: पहले समीकरण बनाइए"},
      b:{en:"Name the two unknowns, translate every sentence into an equation, and only then choose a method. Age problems use 't years ago / later'; boat problems use upstream speed = (b − s), downstream = (b + s).",
         hi:"दो अज्ञात राशियों के नाम रखिए, हर वाक्य को समीकरण में बदलिए, तभी विधि चुनिए। आयु के प्रश्नों में 't वर्ष पूर्व / बाद' लीजिए; नाव के प्रश्नों में धारा के विपरीत चाल = (b − s), धारा के अनुकूल = (b + s)।"} }
  ],
  formulas: [
    { n:{en:"Consistency conditions", hi:"संगतता की शर्तें"}, e:"a₁/a₂ ≠ b₁/b₂ ⇒ unique\n= b₁/b₂ ≠ c₁/c₂ ⇒ none\n= b₁/b₂ = c₁/c₂ ⇒ infinite" },
    { n:{en:"Cross-multiplication", hi:"वज्र-गुणन"}, e:"x = (b₁c₂ − b₂c₁)/(a₁b₂ − a₂b₁)\ny = (c₁a₂ − c₂a₁)/(a₁b₂ − a₂b₁)" },
    { n:{en:"Boat / stream", hi:"नाव / धारा"}, e:"up = b − s ,  down = b + s\ntime = distance ÷ speed" },
    { n:{en:"Graph check", hi:"ग्राफ जाँच"}, e:"solution = point of intersection of the two lines" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:3,
      en:"For which value of k will the pair 2x + 3y = 7 and (k−1)x + (k+2)y = 3k have infinitely many solutions?", hi:"k के किस मान के लिए युग्म 2x + 3y = 7 तथा (k−1)x + (k+2)y = 3k के अपरिमित अनेक हल होंगे?" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Solve graphically: x + 2y = 5 and 2x − 3y = −4. Also find the area of the triangle formed by these lines with the x-axis.", hi:"ग्राफीय विधि से हल कीजिए: x + 2y = 5 तथा 2x − 3y = −4। इन रेखाओं और x-अक्ष से बने त्रिभुज का क्षेत्रफल भी ज्ञात कीजिए।" },
    { board:"CBSE", year:"2020", marks:4,
      en:"The sum of the digits of a two-digit number is 9. Also, nine times this number is twice the number obtained by reversing the order of the digits. Find the number.", hi:"दो अंकों की एक संख्या के अंकों का योग 9 है। इस संख्या का नौ गुना, अंकों के क्रम को उलटने से प्राप्त संख्या का दो गुना है। संख्या ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:3,
      en:"A boat goes 30 km upstream and 44 km downstream in 10 hours. In 13 hours it can go 40 km upstream and 55 km downstream. Find the speed of the boat in still water and of the stream.", hi:"एक नाव धारा के प्रतिकूल 30 किमी और धारा के अनुकूल 44 किमी 10 घंटे में जाती है। 13 घंटे में वह 40 किमी प्रतिकूल और 55 किमी अनुकूल जा सकती है। शांत जल में नाव की चाल तथा धारा की चाल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:2,
      en:"Two lines are given to be parallel. The equation of one line is 3x + 4y = 5. Write a possible equation of the second line.", hi:"दो रेखाएँ समांतर दी गई हैं। एक रेखा का समीकरण 3x + 4y = 5 है। दूसरी रेखा का संभावित समीकरण लिखिए।" }
  ],
  plan: [
    { en:"Write the consistency table from memory three times — it is worth 1–3 marks almost every year.", hi:"संगतता की तालिका तीन बार स्मरण से लिखिए — यह लगभग हर वर्ष 1–3 अंक का है।" },
    { en:"Solve the same pair by all three algebraic methods once; notice which was fastest.", hi:"एक ही युग्म को तीनों बीजगणितीय विधियों से हल कीजिए; देखिए कौन सबसे तेज़ थी।" },
    { en:"Do 4 word problems: ages, digits, boat, fraction.", hi:"4 शब्द समस्याएँ कीजिए: आयु, अंक, नाव, भिन्न।" },
    { en:"Practise one graphical question on graph paper with the triangle-area follow-up.", hi:"ग्राफ पेपर पर त्रिभुज-क्षेत्रफल वाला एक ग्राफीय प्रश्न कीजिए।" }
  ],
  keywords:{ en:["unique solution","parallel","coincident","substitution","elimination","word problem"], hi:["अद्वितीय हल","समांतर","संपाती","प्रतिस्थापन","विलोपन","शब्द समस्या"] }
},

{
  id: 4,
  en: "Quadratic Equations", hi: "द्विघात समीकरण",
  enDesc: "Standard form, factorisation, quadratic formula, discriminant and nature of roots.",
  hiDesc: "मानक रूप, गुणनखंडन, द्विघात सूत्र, विविक्तकर तथा मूलों की प्रकृति।",
  weight: 7, demand: "exam-favourite", pages: "44–55",
  chaptersTag:{ en:"Algebra", hi:"बीजगणित" },
  concepts: [
    { t:{en:"Standard form", hi:"मानक रूप"},
      b:{en:"ax² + bx + c = 0 with a ≠ 0. Always rewrite a word problem into this form before solving — a very common source of lost marks.",
         hi:"ax² + bx + c = 0 जहाँ a ≠ 0। शब्द समस्या को हल करने से पहले सदैव इस रूप में लिखिए — अंक कटने का यह बहुत सामान्य कारण है।"} },
    { t:{en:"Factorisation by splitting the middle term", hi:"मध्य पद को विभाजित करके गुणनखंडन"},
      b:{en:"Find two numbers whose product is ac and sum is b; split bx into those two terms and group. Example: 2x² + x − 6 → 2x² + 4x − 3x − 6 = (x + 2)(2x − 3).",
         hi:"ऐसी दो संख्याएँ खोजिए जिनका गुणनफल ac और योग b हो; bx को उन दो पदों में तोड़िए और समूह बनाइए। उदाहरण: 2x² + x − 6 → 2x² + 4x − 3x − 6 = (x + 2)(2x − 3)।"} },
    { t:{en:"Quadratic formula", hi:"द्विघात सूत्र"},
      b:{en:"x = [−b ± √(b² − 4ac)] / 2a, provided b² − 4ac ≥ 0. Works always, so it is the safe fallback when factorisation is not obvious.",
         hi:"x = [−b ± √(b² − 4ac)] / 2a, बशर्ते b² − 4ac ≥ 0। यह सदैव काम करता है, अतः जब गुणनखंडन स्पष्ट न हो तो यह सुरक्षित विकल्प है।"} },
    { t:{en:"Discriminant and nature of roots", hi:"विविक्तकर और मूलों की प्रकृति"},
      b:{en:"D = b² − 4ac. D > 0 → two distinct real roots; D = 0 → two equal real roots; D < 0 → no real roots. For 'equal roots' questions, simply set D = 0 and solve for the unknown.",
         hi:"D = b² − 4ac। D > 0 → दो भिन्न वास्तविक मूल; D = 0 → दो बराबर वास्तविक मूल; D < 0 → कोई वास्तविक मूल नहीं। 'समान मूल' वाले प्रश्नों में D = 0 रखकर अज्ञात के लिए हल कीजिए।"} },
    { t:{en:"Reject impossible roots", hi:"असंभव मूल अस्वीकार कीजिए"},
      b:{en:"Speed, age, length and number-of-items cannot be negative; a finished job takes positive time. State the rejection in one line — examiners award that line.",
         hi:"चाल, आयु, लंबाई और वस्तुओं की संख्या ऋणात्मक नहीं हो सकती; पूरा किया गया कार्य धनात्मक समय लेता है। अस्वीकृति एक पंक्ति में लिखिए — परीक्षक उस पंक्ति के अंक देते हैं।"} }
  ],
  formulas: [
    { n:{en:"Quadratic formula", hi:"द्विघात सूत्र"}, e:"x = (−b ± √(b² − 4ac)) / 2a" },
    { n:{en:"Discriminant", hi:"विविक्तकर"}, e:"D = b² − 4ac" },
    { n:{en:"Sum & product of roots", hi:"मूलों का योग व गुणनफल"}, e:"α + β = −b/a ,  αβ = c/a" },
    { n:{en:"Equal roots condition", hi:"समान मूलों की शर्त"}, e:"b² − 4ac = 0", note:{en:"Set and solve for k", hi:"k के लिए हल कीजिए"} },
    { n:{en:"Roots are reciprocal", hi:"मूल व्युत्क्रम हैं"}, e:"c = a", note:{en:"αβ = 1", hi:"αβ = 1"} }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Find the value of k for which the quadratic equation kx² − 2kx + 6 = 0 has equal roots.", hi:"k का वह मान ज्ञात कीजिए जिसके लिए द्विघात समीकरण kx² − 2kx + 6 = 0 के मूल समान हों।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Find the roots of the quadratic equation 3x² − 2√6x + 2 = 0.", hi:"द्विघात समीकरण 3x² − 2√6x + 2 = 0 के मूल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2021", marks:4,
      en:"A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less for the same journey. Find the speed of the train.", hi:"एक रेलगाड़ी 360 किमी एकसमान चाल से चलती है। यदि चाल 5 किमी/घंटा अधिक होती, तो उसी यात्रा में 1 घंटा कम लगता। रेलगाड़ी की चाल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:3,
      en:"Find two consecutive odd positive integers, the sum of whose squares is 290.", hi:"दो क्रमागत विषम धनात्मक पूर्णांक ज्ञात कीजिए जिनके वर्गों का योग 290 हो।" },
    { board:"CBSE", year:"2024", marks:2,
      en:"If the equation x² + 4x + k = 0 has real and distinct roots, write the range of k.", hi:"यदि समीकरण x² + 4x + k = 0 के मूल वास्तविक और भिन्न हैं, तो k का परिसर लिखिए।" }
  ],
  plan: [
    { en:"Learn the formula and the discriminant box by heart — write them from memory daily for a week.", hi:"सूत्र और विविक्तकर को कंठस्थ कीजिए — एक सप्ताह तक प्रतिदिन स्मरण से लिखिए।" },
    { en:"Solve 8 equations by factorisation, then the same 8 by formula; compare.", hi:"8 समीकरण गुणनखंडन से और फिर वही 8 सूत्र से हल कीजिए; तुलना कीजिए।" },
    { en:"Do 5 word problems and always write the rejection line.", hi:"5 शब्द समस्याएँ कीजिए और सदैव अस्वीकृति की पंक्ति लिखिए।" },
    { en:"Attempt the 'find k for equal roots' family — it repeats in almost every set.", hi:"'समान मूलों के लिए k' वाले प्रश्न कीजिए — यह लगभग हर सेट में आता है।" }
  ],
  keywords:{ en:["discriminant","equal roots","factorisation","quadratic formula","word problem"], hi:["विविक्तकर","समान मूल","गुणनखंडन","द्विघात सूत्र","शब्द समस्या"] }
},

{
  id: 5,
  en: "Arithmetic Progressions", hi: "समांतर श्रेढ़ियाँ",
  enDesc: "nth term, sum of n terms, and applications of APs.",
  hiDesc: "nवाँ पद, n पदों का योग तथा समांतर श्रेढ़ी के अनुप्रयोग।",
  weight: 6, demand: "scoring", pages: "56–83",
  chaptersTag:{ en:"Algebra", hi:"बीजगणित" },
  concepts: [
    { t:{en:"What makes a sequence an AP", hi:"कोई अनुक्रम समांतर श्रेढ़ी कब होता है"},
      b:{en:"Consecutive terms differ by a constant d, the common difference. Check by subtracting, not dividing. d can be negative (decreasing AP) or zero.",
         hi:"क्रमागत पदों का अंतर एक स्थिरांक d होता है, जिसे सार्व अंतर कहते हैं। भाग नहीं, घटाकर जाँचिए। d ऋणात्मक (घटती श्रेढ़ी) या शून्य भी हो सकता है।"} },
    { t:{en:"nth term", hi:"nवाँ पद"},
      b:{en:"aₙ = a + (n − 1)d. Almost every 'which term is …' question is aₙ set equal to a value, solved for n. n must come out a positive integer.",
         hi:"aₙ = a + (n − 1)d। 'कौन-सा पद …' वाला लगभग हर प्रश्न aₙ को किसी मान के बराबर रखकर n के लिए हल करने पर आधारित है। n धनात्मक पूर्णांक आना चाहिए।"} },
    { t:{en:"Sum of n terms", hi:"n पदों का योग"},
      b:{en:"Sₙ = n/2[2a + (n − 1)d] = n/2(a + l) when the last term l is known. Use the second form whenever the last term is given — it is much faster.",
         hi:"Sₙ = n/2[2a + (n − 1)d] = n/2(a + l), जब अंतिम पद l ज्ञात हो। जब अंतिम पद दिया हो तो दूसरा रूप प्रयोग कीजिए — यह बहुत तेज़ है।"} },
    { t:{en:"Useful symmetry tricks", hi:"उपयोगी सममिति युक्तियाँ"},
      b:{en:"For 3 terms in AP write a − d, a, a + d; for 4 terms write a − 3d, a − d, a + d, a + 3d. The sum then collapses and the equations become one-variable.",
         hi:"3 पदों के लिए a − d, a, a + d लिखिए; 4 पदों के लिए a − 3d, a − d, a + d, a + 3d। तब योग सरल हो जाता है और समीकरण एक-चर वाले बन जाते हैं।"} },
    { t:{en:"AP inside word problems", hi:"शब्द समस्याओं में श्रेढ़ी"},
      b:{en:"Salary increment, saving schemes, ladder rungs, logs stacked in rows, and 'penalty increasing by ₹x per day' are all APs. Identify a, d, and what is asked (term or sum) before touching the formula.",
         hi:"वेतन वृद्धि, बचत योजनाएँ, सीढ़ी के डंडे, पंक्तियों में रखे लट्ठे तथा 'प्रतिदिन ₹x बढ़ता जुर्माना' सभी श्रेढ़ी हैं। सूत्र लगाने से पहले a, d और पूछा गया (पद या योग) पहचानिए।"} }
  ],
  formulas: [
    { n:{en:"Common difference", hi:"सार्व अंतर"}, e:"d = a₂ − a₁ = a₃ − a₂" },
    { n:{en:"nth term", hi:"nवाँ पद"}, e:"aₙ = a + (n − 1)d" },
    { n:{en:"Sum", hi:"योग"}, e:"Sₙ = n/2 [2a + (n − 1)d]" },
    { n:{en:"Sum with last term", hi:"अंतिम पद सहित योग"}, e:"Sₙ = n/2 (a + l)" },
    { n:{en:"nth term from the sum", hi:"योग से nवाँ पद"}, e:"aₙ = Sₙ − Sₙ₋₁" },
    { n:{en:"Number of terms", hi:"पदों की संख्या"}, e:"n = (l − a)/d + 1", note:{en:"l = last term", hi:"l = अंतिम पद"} }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Find the 20th term from the last term of the AP 3, 8, 13, …, 253.", hi:"श्रेढ़ी 3, 8, 13, …, 253 के अंतिम पद से 20वाँ पद ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"How many terms of the AP 9, 17, 25, … must be taken to give a sum of 636?", hi:"श्रेढ़ी 9, 17, 25, … के कितने पद लिए जाएँ कि योग 636 हो जाए?" },
    { board:"CBSE", year:"2021", marks:4,
      en:"A sum of ₹700 is to be used to give seven cash prizes. If each prize is ₹20 less than its preceding prize, find the value of each prize.", hi:"₹700 की राशि से सात नकद पुरस्कार देने हैं। यदि प्रत्येक पुरस्कार अपने पूर्व पुरस्कार से ₹20 कम है, तो प्रत्येक पुरस्कार का मान ज्ञात कीजिए।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"Find the sum of the first 40 positive integers divisible by 6.", hi:"6 से विभाज्य प्रथम 40 धनात्मक पूर्णांकों का योग ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"If the nth term of an AP is 7 − 4n, find its common difference.", hi:"यदि किसी श्रेढ़ी का nवाँ पद 7 − 4n है, तो उसका सार्व अंतर ज्ञात कीजिए।" }
  ],
  plan: [
    { en:"Write both sum formulas 5 times and note when each is faster.", hi:"दोनों योग सूत्र 5 बार लिखिए और यह नोट कीजिए कब कौन तेज़ है।" },
    { en:"Solve 6 'which term' questions with n as the unknown.", hi:"n अज्ञात वाले 6 'कौन-सा पद' प्रश्न हल कीजिए।" },
    { en:"Do 3 sum questions where you must first find n (and reject the negative root).", hi:"3 योग-प्रश्न कीजिए जिनमें पहले n निकालना हो (और ऋणात्मक मूल अस्वीकार करना हो)।" },
    { en:"Practise 2 real-life APs: savings and prize distribution.", hi:"2 वास्तविक जीवन की श्रेढ़ियाँ कीजिए: बचत और पुरस्कार वितरण।" }
  ],
  keywords:{ en:["common difference","nth term","sum","AP","word problem"], hi:["सार्व अंतर","nवाँ पद","योग","श्रेढ़ी","शब्द समस्या"] }
},

{
  id: 6,
  en: "Triangles", hi: "त्रिभुज",
  enDesc: "Similarity criteria (AA, SSS, SAS), BPT, and areas of similar triangles.",
  hiDesc: "समरूपता की कसौटियाँ (AA, SSS, SAS), आधारभूत समानुपातिकता प्रमेय तथा समरूप त्रिभुजों के क्षेत्रफल।",
  weight: 7, demand: "proof-heavy", pages: "84–110",
  chaptersTag:{ en:"Geometry", hi:"ज्यामिति" },
  concepts: [
    { t:{en:"What similarity means", hi:"समरूपता का अर्थ"},
      b:{en:"Two triangles are similar if corresponding angles are equal and corresponding sides are proportional. Order of letters matters: △ABC ~ △DEF means ∠A = ∠D, ∠B = ∠E, ∠C = ∠F and AB/DE = BC/EF = CA/FD.",
         hi:"दो त्रिभुज समरूप होते हैं यदि संगत कोण बराबर हों और संगत भुजाएँ समानुपाती हों। अक्षरों का क्रम महत्वपूर्ण है: △ABC ~ △DEF का अर्थ है ∠A = ∠D, ∠B = ∠E, ∠C = ∠F तथा AB/DE = BC/EF = CA/FD।"} },
    { t:{en:"Basic Proportionality Theorem (Thales)", hi:"आधारभूत समानुपातिकता प्रमेय (थेल्स)"},
      b:{en:"If a line is drawn parallel to one side of a triangle intersecting the other two sides, it divides them in the same ratio. Its converse is equally examinable: if DE/DB = CE/AE then DE ∥ BC.",
         hi:"यदि किसी त्रिभुज की एक भुजा के समांतर खींची गई रेखा अन्य दो भुजाओं को प्रतिच्छेद करे, तो वह उन्हें समान अनुपात में विभाजित करती है। इसका विलोम भी परीक्षा में आता है: यदि DE/DB = CE/AE तो DE ∥ BC।"} },
    { t:{en:"Similarity criteria", hi:"समरूपता की कसौटियाँ"},
      b:{en:"AA (two angles equal) is the most used. SSS compares all three ratios; SAS compares two sides and the included angle. In exams, first label which angles/sides correspond.",
         hi:"AA (दो कोण बराबर) सर्वाधिक प्रयुक्त होती है। SSS तीनों अनुपातों की तुलना करती है; SAS दो भुजाओं और अंतर्निहित कोण की। परीक्षा में पहले संगत कोण/भुजाएँ पहचानिए।"} },
    { t:{en:"Areas and perimeters", hi:"क्षेत्रफल और परिमाप"},
      b:{en:"The ratio of areas of two similar triangles equals the square of the ratio of corresponding sides; the ratio of perimeters equals the ratio of corresponding sides. 'Area ratio 4 : 9 ⇒ side ratio 2 : 3'.",
         hi:"दो समरूप त्रिभुजों के क्षेत्रफलों का अनुपात संगत भुजाओं के अनुपात का वर्ग होता है; परिमापों का अनुपात संगत भुजाओं के अनुपात के बराबर होता है। 'क्षेत्रफल अनुपात 4 : 9 ⇒ भुजा अनुपात 2 : 3'।"} },
    { t:{en:"Writing a geometry proof", hi:"ज्यामिति में उपपत्ति लिखना"},
      b:{en:"Four habits get full marks: (1) a diagram, (2) Given / To prove, (3) numbered statements with a reason in brackets in every line, (4) a closing statement naming the criterion used.",
         hi:"चार आदतें पूरे अंक दिलाती हैं: (1) आकृति, (2) दिया है / सिद्ध करना है, (3) प्रत्येक पंक्ति में क्रमांकित कथन और कोष्ठक में कारण, (4) अंत में प्रयुक्त कसौटी का नाम लेकर निष्कर्ष।"} }
  ],
  formulas: [
    { n:{en:"BPT", hi:"आधारभूत समानुपातिकता प्रमेय"}, e:"DE ∥ BC ⇒ AD/DB = AE/EC" },
    { n:{en:"Ratio of areas", hi:"क्षेत्रफलों का अनुपात"}, e:"ar(△ABC)/ar(△DEF) = (AB/DE)²" },
    { n:{en:"Ratio of perimeters", hi:"परिमापों का अनुपात"}, e:"P₁/P₂ = AB/DE" },
    { n:{en:"Similar triangles", hi:"समरूप त्रिभुज"}, e:"AB/DE = BC/EF = CA/FD" },
    { n:{en:"Area of a triangle", hi:"त्रिभुज का क्षेत्रफल"}, e:"A = ½ × base × height" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:3,
      en:"In △ABC, DE ∥ BC. If AD = 4 cm, DB = 6 cm and AE = 5 cm, find EC.", hi:"△ABC में DE ∥ BC है। यदि AD = 4 सेमी, DB = 6 सेमी तथा AE = 5 सेमी हो, तो EC ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:5,
      en:"State and prove the Basic Proportionality Theorem.", hi:"आधारभूत समानुपातिकता प्रमेय को कथन एवं सिद्ध कीजिए।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"The areas of two similar triangles are 81 cm² and 49 cm². If the altitude of the first is 6.3 cm, find the corresponding altitude of the second.", hi:"दो समरूप त्रिभुजों के क्षेत्रफल 81 सेमी² और 49 सेमी² हैं। यदि पहले की ऊँचाई 6.3 सेमी हो, तो दूसरे की संगत ऊँचाई ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:4,
      en:"In △ABC, D and E are points on AB and AC such that DE ∥ BC. If AD = 2 cm, BD = 3 cm and AC = 7.5 cm, find AE.", hi:"△ABC में D और E, AB तथा AC पर ऐसे बिंदु हैं कि DE ∥ BC। यदि AD = 2 सेमी, BD = 3 सेमी और AC = 7.5 सेमी हो, तो AE ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:2,
      en:"Two triangles are similar. Their corresponding sides are in the ratio 3 : 5. Find the ratio of their areas.", hi:"दो त्रिभुज समरूप हैं। उनकी संगत भुजाएँ 3 : 5 के अनुपात में हैं। उनके क्षेत्रफलों का अनुपात ज्ञात कीजिए।" }
  ],
  plan: [
    { en:"Learn the BPT proof with its construction and reasons — it is asked verbatim.", hi:"रचना और कारणों सहित आधारभूत समानुपातिकता प्रमेय की उपपत्ति याद कीजिए — यह शब्दशः पूछी जाती है।" },
    { en:"Draw 5 figure-based problems and mark corresponding angles in colour.", hi:"5 आकृति-आधारित प्रश्न बनाइए और संगत कोण रंग से चिह्नित कीजिए।" },
    { en:"Master the area-ratio ↔ side-ratio conversions in both directions.", hi:"क्षेत्रफल-अनुपात ↔ भुजा-अनुपात दोनों दिशाओं में सिद्ध कीजिए।" },
    { en:"Write one full proof daily with Given / To prove / Proof headings.", hi:"प्रतिदिन एक पूरी उपपत्ति 'दिया है / सिद्ध करना है / उपपत्ति' शीर्षकों के साथ लिखिए।" }
  ],
  keywords:{ en:["similar","BPT","AA criterion","area ratio","proportional"], hi:["समरूप","आधारभूत समानुपातिकता प्रमेय","AA कसौटी","क्षेत्रफल अनुपात","समानुपाती"] }
},

{
  id: 7,
  en: "Coordinate Geometry", hi: "निर्देशांक ज्यामिति",
  enDesc: "Distance formula, and collinearity / type-of-triangle questions.",
  hiDesc: "दूरी सूत्र तथा संरेखता / त्रिभुज के प्रकार के प्रश्न।",
  weight: 4, demand: "scoring", pages: "111–126",
  chaptersTag:{ en:"Geometry", hi:"ज्यामिति" },
  concepts: [
    { t:{en:"Distance formula", hi:"दूरी सूत्र"},
      b:{en:"PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]. Square the differences first, so you never carry a negative under the root sign.",
         hi:"PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]। पहले अंतरों का वर्ग कीजिए, जिससे मूल चिह्न के नीचे ऋणात्मक मान कभी न आए।"} },
    { t:{en:"Distance from the origin", hi:"मूल बिंदु से दूरी"},
      b:{en:"OP = √(x² + y²). A point on the x-axis is (x, 0); on the y-axis it is (0, y). This substitution is the key step in half the questions.",
         hi:"OP = √(x² + y²)। x-अक्ष पर बिंदु (x, 0) तथा y-अक्ष पर (0, y) होता है। आधे प्रश्नों में यही प्रतिस्थापन कुंजी है।"} },
    { t:{en:"Types of triangle from side lengths", hi:"भुजाओं से त्रिभुज का प्रकार"},
      b:{en:"Compute all three squared lengths. Equal sides → isosceles; all equal → equilateral; the largest square equals the sum of the other two → right-angled. Using squares, not roots, avoids surds.",
         hi:"तीनों भुजाओं की लंबाई का वर्ग निकालिए। बराबर भुजाएँ → समद्विबाहु; सभी बराबर → समबाहु; सबसे बड़ा वर्ग अन्य दो के वर्गों के योग के बराबर → समकोण। मूल के बजाय वर्ग प्रयोग करने से करणी से बचाव होता है।"} },
    { t:{en:"Collinearity", hi:"संरेखता"},
      b:{en:"Points A, B, C are collinear if AB + BC = AC (from the distance formula). Alternatively compute all distances and check the triangle inequality collapses to equality.",
         hi:"बिंदु A, B, C संरेख हैं यदि AB + BC = AC (दूरी सूत्र से)। वैकल्पिक रूप से सभी दूरियाँ निकालिए और देखिए कि त्रिभुज की असमिका समता में बदल जाती है।"} },
    { t:{en:"Section formula (not in the 2024-25 assessed syllabus)", hi:"अनुभाग सूत्र (2024-25 मूल्यांकन पाठ्यक्रम में नहीं)"},
      b:{en:"Point dividing PQ in m : n is ((mx₂ + nx₁)/(m+n), (my₂ + ny₂)/(m+n)). Useful background for higher classes and for understanding midpoints.",
         hi:"PQ को m : n में विभाजित करने वाला बिंदु ((mx₂ + nx₁)/(m+n), (my₂ + ny₂)/(m+n))। उच्च कक्षाओं और मध्य-बिंदु समझने के लिए उपयोगी पृष्ठभूमि।"} }
  ],
  formulas: [
    { n:{en:"Distance formula", hi:"दूरी सूत्र"}, e:"d = √[(x₂ − x₁)² + (y₂ − y₁)²]" },
    { n:{en:"From origin", hi:"मूल बिंदु से"}, e:"d = √(x² + y²)" },
    { n:{en:"Collinear points", hi:"संरेख बिंदु"}, e:"AB + BC = AC" },
    { n:{en:"Right triangle test", hi:"समकोण परीक्षण"}, e:"AC² = AB² + BC²" },
    { n:{en:"Midpoint", hi:"मध्य-बिंदु"}, e:"M((x₁+x₂)/2, (y₁+y₂)/2)" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Find the distance between the points (a, 0) and (0, b).", hi:"बिंदुओं (a, 0) और (0, b) के बीच की दूरी ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Show that the points (1, 7), (4, 2), (−1, −1) and (−4, 4) are the vertices of a square.", hi:"दर्शाइए कि बिंदु (1, 7), (4, 2), (−1, −1) तथा (−4, 4) एक वर्ग के शीर्ष हैं।" },
    { board:"CBSE", year:"2021", marks:2,
      en:"If the point (x, y) is equidistant from (3, 6) and (−3, 4), prove that 3x + y = 5.", hi:"यदि बिंदु (x, y) बिंदुओं (3, 6) और (−3, 4) से समान दूरी पर है, तो सिद्ध कीजिए कि 3x + y = 5।" },
    { board:"CBSE", year:"2019", marks:3,
      en:"Find the point on the x-axis which is equidistant from (2, −5) and (−2, 9).", hi:"x-अक्ष पर वह बिंदु ज्ञात कीजिए जो (2, −5) और (−2, 9) से समान दूरी पर है।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"The distance of the point P(−6, 8) from the origin is ____.", hi:"बिंदु P(−6, 8) की मूल बिंदु से दूरी ____ है।" }
  ],
  plan: [
    { en:"Memorise the distance formula and use squared distances in every question.", hi:"दूरी सूत्र याद कीजिए और हर प्रश्न में दूरी के वर्ग का प्रयोग कीजिए।" },
    { en:"Solve 5 'find the point on the axis' problems by substituting (x, 0) or (0, y).", hi:"(x, 0) या (0, y) रखकर 5 'अक्ष पर बिंदु ज्ञात कीजिए' प्रश्न हल कीजिए।" },
    { en:"Classify 4 triangles (scalene / isosceles / right) from coordinates.", hi:"निर्देशांकों से 4 त्रिभुजों का वर्गीकरण कीजिए (विषमबाहु / समद्विबाहु / समकोण)।" },
    { en:"Do one collinearity proof with the AB + BC = AC check.", hi:"AB + BC = AC जाँच के साथ एक संरेखता की उपपत्ति कीजिए।" }
  ],
  keywords:{ en:["distance formula","collinear","equidistant","isosceles","right triangle"], hi:["दूरी सूत्र","संरेख","समान दूरी","समद्विबाहु","समकोण त्रिभुज"] }
}
);
