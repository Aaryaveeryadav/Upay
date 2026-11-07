/* =====================================================================
   Upay · Class 10 Mathematics · NCERT (2024–25 rationalised syllabus)
   Chapter knowledge base — part 2 (Ch 8–14)
   ===================================================================== */
window.UP = window.UP || {};
UP.chapters = UP.chapters || [];

UP.chapters.push(
{
  id: 8,
  en: "Introduction to Trigonometry", hi: "त्रिकोणमिति का परिचय",
  enDesc: "Trigonometric ratios, ratios of 30°/45°/60°, and trigonometric identities.",
  hiDesc: "त्रिकोणमितीय अनुपात, 30°/45°/60° के अनुपात तथा त्रिकोणमितीय सर्वसमिकाएँ।",
  weight: 7, demand: "exam-favourite", pages: "127–149",
  chaptersTag:{ en:"Trigonometry", hi:"त्रिकोणमिति" },
  concepts: [
    { t:{en:"The six ratios", hi:"छह अनुपात"},
      b:{en:"In a right triangle with acute angle θ: sinθ = opposite/hypotenuse, cosθ = adjacent/hypotenuse, tanθ = opposite/adjacent, and cosec, sec, cot are their reciprocals. 'SOH-CAH-TOA' and 'pandit badri prasad har har bole' are the classic memory hooks.",
         hi:"न्यून कोण θ वाले समकोण त्रिभुज में: sinθ = सामने की भुजा/कर्ण, cosθ = आधार/कर्ण, tanθ = सामने की भुजा/आधार, तथा cosec, sec, cot इनके व्युत्क्रम हैं। 'लंब/कर्ण, आधार/कर्ण, लंब/आधार' याद रखने का सरल तरीका है।"} },
    { t:{en:"Standard angle table", hi:"मानक कोणों की तालिका"},
      b:{en:"sin: 0, ½, 1/√2, √3/2, 1 for 0°, 30°, 45°, 60°, 90°. cos runs the same values in reverse. tan = sin/cos. Write the table in every exam at the top of the answer sheet — it prevents slips.",
         hi:"0°, 30°, 45°, 60°, 90° के लिए sin: 0, ½, 1/√2, √3/2, 1। cos में यही मान उल्टे क्रम में होते हैं। tan = sin/cos। परीक्षा में उत्तर-पुस्तिका के ऊपर तालिका लिख लीजिए — गलतियाँ टलती हैं।"} },
    { t:{en:"The three Pythagorean identities", hi:"तीन पाइथागोरस सर्वसमिकाएँ"},
      b:{en:"sin²θ + cos²θ = 1 is the parent; dividing it by cos²θ gives tan²θ + 1 = sec²θ, and by sin²θ gives 1 + cot²θ = cosec²θ. Almost every identity question reduces to one of these.",
         hi:"sin²θ + cos²θ = 1 मूल सर्वसमिका है; इसे cos²θ से भाग देने पर tan²θ + 1 = sec²θ तथा sin²θ से भाग देने पर 1 + cot²θ = cosec²θ मिलती है। लगभग हर सर्वसमिका प्रश्न इन्हीं में बदल जाता है।"} },
    { t:{en:"Converting between ratios", hi:"अनुपातों में रूपांतरण"},
      b:{en:"tanθ = sinθ/cosθ and cotθ = cosθ/sinθ let you convert everything to sin and cos. When an expression mixes sec, cosec and tan, convert to sin and cos first — it almost always simplifies.",
         hi:"tanθ = sinθ/cosθ और cotθ = cosθ/sinθ से सब कुछ sin और cos में बदल सकते हैं। जब व्यंजक में sec, cosec और tan मिले हों तो पहले sin और cos में बदलिए — प्रायः सरल हो जाता है।"} },
    { t:{en:"Complementary angles", hi:"पूरक कोण"},
      b:{en:"sin(90° − θ) = cosθ, tan(90° − θ) = cotθ, sec(90° − θ) = cosecθ. A whole family of 'evaluate' questions exists just to test this.",
         hi:"sin(90° − θ) = cosθ, tan(90° − θ) = cotθ, sec(90° − θ) = cosecθ। 'मान ज्ञात कीजिए' प्रश्नों का एक पूरा वर्ग केवल इसी की जाँच करता है।"} }
  ],
  formulas: [
    { n:{en:"Trigonometric ratio", hi:"त्रिकोणमितीय अनुपात"}, e:"sinθ = P/H , cosθ = B/H , tanθ = P/B" },
    { n:{en:"Reciprocals", hi:"व्युत्क्रम"}, e:"cosecθ = 1/sinθ , secθ = 1/cosθ , cotθ = 1/tanθ" },
    { n:{en:"Standard values", hi:"मानक मान"}, e:"sin 30 = ½, cos 30 = √3/2, tan 45 = 1\nsin 60 = √3/2, cos 60 = ½, tan 90 undefined" },
    { n:{en:"Pythagorean identities", hi:"पाइथागोरस सर्वसमिकाएँ"}, e:"sin²θ + cos²θ = 1\n1 + tan²θ = sec²θ\n1 + cot²θ = cosec²θ" },
    { n:{en:"Complementary", hi:"पूरक"}, e:"sin(90°−θ) = cosθ , tan(90°−θ) = cotθ" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"If sin A = 3/4, calculate cos A and tan A.", hi:"यदि sin A = 3/4 हो, तो cos A और tan A की गणना कीजिए।" },
    { board:"CBSE", year:"2022", marks:2,
      en:"Evaluate: 2 tan²45° + cos²30° − sin²60°.", hi:"मान ज्ञात कीजिए: 2 tan²45° + cos²30° − sin²60°।" },
    { board:"CBSE", year:"2021", marks:3,
      en:"Prove that (1 + cotθ − cosecθ)(1 + tanθ + secθ) = 2.", hi:"सिद्ध कीजिए कि (1 + cotθ − cosecθ)(1 + tanθ + secθ) = 2।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"If tan 2A = cot(A − 18°), where 2A is an acute angle, find the value of A.", hi:"यदि tan 2A = cot(A − 18°), जहाँ 2A न्यून कोण है, तो A का मान ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"If cos A = 4/5, then the value of tan A is ____.", hi:"यदि cos A = 4/5 हो, तो tan A का मान ____ है।" }
  ],
  plan: [
    { en:"Write the standard-angle table daily for 5 days until it is instant.", hi:"5 दिन तक प्रतिदिन मानक कोण तालिका लिखिए जब तक यह तत्काल याद न आए।" },
    { en:"Derive all three identities from sin²θ + cos²θ = 1.", hi:"sin²θ + cos²θ = 1 से तीनों सर्वसमिकाएँ व्युत्पन्न कीजिए।" },
    { en:"Solve 6 identity proofs by converting everything to sin and cos.", hi:"सब कुछ sin और cos में बदलकर 6 सर्वसमिका-सिद्धि कीजिए।" },
    { en:"Practise complementary-angle equations (tan 2A = cot(A − 18°) type) — 8 questions.", hi:"पूरक कोण वाले समीकरण (tan 2A = cot(A − 18°) प्रकार) — 8 प्रश्न कीजिए।" }
  ],
  keywords:{ en:["sin","cos","tan","identity","complementary","standard angles"], hi:["sin","cos","tan","सर्वसमिका","पूरक","मानक कोण"] }
},

{
  id: 9,
  en: "Some Applications of Trigonometry", hi: "त्रिकोणमिति के कुछ अनुप्रयोग",
  enDesc: "Heights and distances using angles of elevation and depression.",
  hiDesc: "उन्नयन कोण तथा अवनमन कोण का उपयोग करके ऊँचाई और दूरी के प्रश्न।",
  weight: 5, demand: "scoring", pages: "150–160",
  chaptersTag:{ en:"Trigonometry", hi:"त्रिकोणमिति" },
  concepts: [
    { t:{en:"Angle of elevation vs depression", hi:"उन्नयन कोण और अवनमन कोण"},
      b:{en:"Elevation is measured upward from the horizontal at the observer's eye; depression is measured downward from the horizontal at the observer's eye. Both are always measured from the horizontal — a classic trap.",
         hi:"उन्नयन कोण पर्यवेक्षक की आँख से क्षैतिज के ऊपर मापा जाता है; अवनमन कोण आँख से क्षैतिज के नीचे। दोनों सदैव क्षैतिज से मापे जाते हैं — यह सामान्य भूल है।"} },
    { t:{en:"Elevation = depression (alternate angles)", hi:"उन्नयन = अवनमन (एकांतर कोण)"},
      b:{en:"The angle of elevation of the top seen from the bottom equals the angle of depression of the bottom seen from the top, because the two horizontals are parallel.",
         hi:"नीचे से शीर्ष का उन्नयन कोण, ऊपर से तल का अवनमन कोण के बराबर होता है, क्योंकि दोनों क्षैतिज रेखाएँ समांतर होती हैं।"} },
    { t:{en:"Draw first, label second", hi:"पहले आकृति, फिर नामांकन"},
      b:{en:"Always sketch a vertical tower/flagpole, a horizontal ground line, the line of sight, and mark the known angle and known length. Then decide which ratio links the knowns to the unknown: tan for opposite/adjacent, sin for opposite/hypotenuse.",
         hi:"सदैव ऊर्ध्वाधर मीनार/ध्वजदंड, क्षैतिज भूमि रेखा, दृष्टि रेखा का चित्र बनाइए और ज्ञात कोण व ज्ञात लंबाई अंकित कीजिए। फिर तय कीजिए कौन-सा अनुपात ज्ञात को अज्ञात से जोड़ता है: लंब/आधार के लिए tan, लंब/कर्ण के लिए sin।"} },
    { t:{en:"Two-observer problems", hi:"दो पर्यवेक्षक वाले प्रश्न"},
      b:{en:"When two angles are given from two points on the same line, the tower height h is common. Write h in terms of each angle, then equate — that single equation usually kills the problem in two lines.",
         hi:"जब एक ही रेखा पर दो बिंदुओं से दो कोण दिए हों, तो मीनार की ऊँचाई h उभयनिष्ठ होती है। प्रत्येक कोण के लिए h लिखिए, फिर बराबर कीजिए — यही एक समीकरण प्रायः प्रश्न को दो पंक्तियों में हल कर देता है।"} },
    { t:{en:"Set the diagram's root 3 / √3 values early", hi:"आकृति में √3 / (1/√3) का मान शीघ्र रखिए"},
      b:{en:"Angles of 30° and 60° produce √3 everywhere. Keep exact surds until the final line; converting to 1.732 early multiplies rounding errors.",
         hi:"30° और 60° के कोण हर जगह √3 उत्पन्न करते हैं। अंतिम पंक्ति तक सटीक करणी रखिए; शुरू में 1.732 में बदलने से त्रुटि बढ़ती है।"} }
  ],
  formulas: [
    { n:{en:"Height from angle", hi:"कोण से ऊँचाई"}, e:"tanθ = height / distance" },
    { n:{en:"Line of sight", hi:"दृष्टि रेखा"}, e:"sinθ = vertical / line of sight" },
    { n:{en:"Two observers", hi:"दो पर्यवेक्षक"}, e:"h = d·tan α = (d + x)·tan β" },
    { n:{en:"Useful exact values", hi:"उपयोगी सटीक मान"}, e:"tan 30 = 1/√3 , tan 45 = 1 , tan 60 = √3" },
    { n:{en:"Shadow grows", hi:"छाया बढ़ती है"}, e:"same object, larger shadow ⇒ smaller elevation angle" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:3,
      en:"A tower stands vertically on the ground. From a point on the ground 20 m away from the foot of the tower, the angle of elevation of the top is 60°. Find the height of the tower.", hi:"एक मीनार भूमि पर ऊर्ध्वाधर खड़ी है। भूमि पर मीनार के पाद से 20 मीटर दूर एक बिंदु से शीर्ष का उन्नयन कोण 60° है। मीनार की ऊँचाई ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:4,
      en:"The angle of elevation of the top of a building from the foot of a tower is 30° and the angle of elevation of the top of the tower from the foot of the building is 60°. If the tower is 50 m high, find the height of the building.", hi:"एक मीनार के पाद से भवन के शीर्ष का उन्नयन कोण 30° है तथा भवन के पाद से मीनार के शीर्ष का उन्नयन कोण 60° है। यदि मीनार 50 मीटर ऊँची है, तो भवन की ऊँचाई ज्ञात कीजिए।" },
    { board:"CBSE", year:"2020", marks:4,
      en:"From the top of a 7 m high building, the angle of elevation of the top of a cable tower is 60° and the angle of depression of its foot is 45°. Find the height of the tower.", hi:"7 मीटर ऊँचे भवन के शीर्ष से एक केबल मीनार के शीर्ष का उन्नयन कोण 60° तथा उसके पाद का अवनमन कोण 45° है। मीनार की ऊँचाई ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:3,
      en:"A ladder 15 m long just reaches the top of a vertical wall. If the ladder makes an angle of 60° with the wall, find the height of the wall.", hi:"15 मीटर लंबी एक सीढ़ी ऊर्ध्वाधर दीवार के शीर्ष तक पहुँचती है। यदि सीढ़ी दीवार से 60° का कोण बनाती है, तो दीवार की ऊँचाई ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"If the shadow of a tower is √3 times its height, the angle of elevation of the sun is ____.", hi:"यदि किसी मीनार की छाया उसकी ऊँचाई की √3 गुनी है, तो सूर्य का उन्नयन कोण ____ है।" }
  ],
  plan: [
    { en:"Draw 10 diagrams and label them before calculating a single number.", hi:"कोई भी गणना करने से पहले 10 आकृतियाँ बनाकर नामांकित कीजिए।" },
    { en:"Practise the 'two observers on one line' pattern 4 times — it repeats every year.", hi:"'एक रेखा पर दो पर्यवेक्षक' वाला प्रारूप 4 बार कीजिए — यह हर वर्ष आता है।" },
    { en:"Learn the elevation = depression alternate-angle argument in one sentence.", hi:"उन्नयन = अवनमन (एकांतर कोण) का तर्क एक वाक्य में याद कीजिए।" },
    { en:"Keep √3 exact till the last line in every solution.", hi:"हर हल में अंतिम पंक्ति तक √3 सटीक रखिए।" }
  ],
  keywords:{ en:["angle of elevation","angle of depression","height","line of sight","tower"], hi:["उन्नयन कोण","अवनमन कोण","ऊँचाई","दृष्टि रेखा","मीनार"] }
},

{
  id: 10,
  en: "Circles", hi: "वृत्त",
  enDesc: "Tangent to a circle, number of tangents from a point, and equal tangents theorem.",
  hiDesc: "वृत्त की स्पर्श रेखा, किसी बिंदु से स्पर्श रेखाओं की संख्या तथा समान स्पर्श रेखा प्रमेय।",
  weight: 5, demand: "theorem-based", pages: "161–170",
  chaptersTag:{ en:"Geometry", hi:"ज्यामिति" },
  concepts: [
    { t:{en:"Tangent vs secant", hi:"स्पर्श रेखा और छेदक रेखा"},
      b:{en:"A tangent meets the circle at exactly one point; a secant cuts it at two. A tangent can be drawn at any point on the circle, and it is perpendicular to the radius at that point — this one fact drives most numericals.",
         hi:"स्पर्श रेखा वृत्त को ठीक एक बिंदु पर मिलती है; छेदक रेखा दो बिंदुओं पर। वृत्त के किसी भी बिंदु पर स्पर्श रेखा खींची जा सकती है और वह उस बिंदु पर त्रिज्या के लंबवत होती है — यही तथ्य अधिकांश संख्यात्मक प्रश्नों का आधार है।"} },
    { t:{en:"Number of tangents", hi:"स्पर्श रेखाओं की संख्या"},
      b:{en:"From an interior point: none. From a point on the circle: exactly one. From an exterior point: exactly two. 'Prove that a parallelogram circumscribing a circle is a rhombus' builds directly on this.",
         hi:"अंतःस्थ बिंदु से: कोई नहीं। वृत्त पर स्थित बिंदु से: ठीक एक। बाह्य बिंदु से: ठीक दो। 'सिद्ध कीजिए कि वृत्त को परिगत समांतर चतुर्भुज एक समचतुर्भुज होता है' इसी पर आधारित है।"} },
    { t:{en:"Equal tangents theorem (10.2)", hi:"समान स्पर्श रेखा प्रमेय (10.2)"},
      b:{en:"The lengths of the two tangents drawn from an external point to a circle are equal. Proof: join the centre, use congruent right triangles (RHS) — two radii, common hypotenuse, right angles.",
         hi:"बाह्य बिंदु से वृत्त पर खींची गई दोनों स्पर्श रेखाओं की लंबाइयाँ बराबर होती हैं। उपपत्ति: केंद्र को मिलाइए और सर्वांगसम समकोण त्रिभुज (RHS) का प्रयोग कीजिए — दो त्रिज्याएँ, सामान्य कर्ण, समकोण।"} },
    { t:{en:"Right-angle construction", hi:"समकोण रचना"},
      b:{en:"When a tangent length and a radius are given, the radius and tangent form a right angle at the point of contact, so Pythagoras gives the distance from an external point: OT² = r² + tangent².",
         hi:"जब स्पर्श रेखा की लंबाई और त्रिज्या दी हों, तो स्पर्श बिंदु पर त्रिज्या और स्पर्श रेखा समकोण बनाती हैं, अतः पाइथागोरस से बाह्य बिंदु की दूरी मिलती है: OT² = r² + स्पर्श रेखा²।"} },
    { t:{en:"Quadrilateral circumscribing a circle", hi:"वृत्त को परिगत चतुर्भुज"},
      b:{en:"AB + CD = BC + DA for a quadrilateral whose sides touch a circle — the 'equal tangents' result applied at all four vertices. It converts many 'find the side' questions into one linear equation.",
         hi:"जिस चतुर्भुज की भुजाएँ वृत्त को स्पर्श करती हैं, उसके लिए AB + CD = BC + DA — चारों शीर्षों पर 'समान स्पर्श रेखाएँ' का परिणाम। यह अनेक 'भुजा ज्ञात कीजिए' प्रश्नों को एक रैखिक समीकरण में बदल देता है।"} }
  ],
  formulas: [
    { n:{en:"Tangent ⟂ radius", hi:"स्पर्श रेखा ⟂ त्रिज्या"}, e:"∠OAT = 90°" },
    { n:{en:"Equal tangents", hi:"समान स्पर्श रेखाएँ"}, e:"PA = PB" },
    { n:{en:"Pythagoras form", hi:"पाइथागोरस रूप"}, e:"OT² = r² + PT²" },
    { n:{en:"Circumscribed quadrilateral", hi:"परिगत चतुर्भुज"}, e:"AB + CD = BC + DA" },
    { n:{en:"Tangent count", hi:"स्पर्श रेखाओं की संख्या"}, e:"inside 0 · on 1 · outside 2" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"A tangent PQ at a point P of a circle of radius 5 cm meets a line through the centre O at Q such that OQ = 12 cm. Find PQ.", hi:"5 सेमी त्रिज्या वाले वृत्त के बिंदु P पर स्पर्श रेखा PQ, केंद्र O से जाने वाली रेखा से Q पर मिलती है, जहाँ OQ = 12 सेमी है। PQ ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Prove that the lengths of tangents drawn from an external point to a circle are equal.", hi:"सिद्ध कीजिए कि बाह्य बिंदु से वृत्त पर खींची गई स्पर्श रेखाओं की लंबाइयाँ बराबर होती हैं।" },
    { board:"CBSE", year:"2020", marks:4,
      en:"Prove that the parallelogram circumscribing a circle is a rhombus.", hi:"सिद्ध कीजिए कि वृत्त को परिगत समांतर चतुर्भुज एक समचतुर्भुज होता है।" },
    { board:"CBSE", year:"2021", marks:2,
      en:"In the figure, if TP and TQ are the two tangents to a circle with centre O so that ∠POQ = 110°, then find ∠PTQ.", hi:"आकृति में, यदि TP और TQ केंद्र O वाले वृत्त की दो स्पर्श रेखाएँ हैं और ∠POQ = 110° है, तो ∠PTQ ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"How many tangents can a circle have at a point on it?", hi:"वृत्त पर स्थित किसी बिंदु पर कितनी स्पर्श रेखाएँ हो सकती हैं?" }
  ],
  plan: [
    { en:"Learn the equal-tangents proof with the RHS congruence reason spelled out.", hi:"RHS सर्वांगसमता का कारण स्पष्ट लिखते हुए समान स्पर्श रेखाओं की उपपत्ति याद कीजिए।" },
    { en:"Do 5 Pythagoras-style numericals with OT, r and tangent length.", hi:"OT, r और स्पर्श रेखा की लंबाई वाले 5 पाइथागोरस प्रकार के प्रश्न कीजिए।" },
    { en:"Draw the circumscribed-quadrilateral figure once and derive AB + CD = BC + DA.", hi:"परिगत चतुर्भुज की आकृति बनाकर AB + CD = BC + DA व्युत्पन्न कीजिए।" },
    { en:"Remember the angle fact: ∠PTQ = 180° − ∠POQ.", hi:"कोण का तथ्य याद रखिए: ∠PTQ = 180° − ∠POQ।" }
  ],
  keywords:{ en:["tangent","radius","external point","equal tangents","circumscribed"], hi:["स्पर्श रेखा","त्रिज्या","बाह्य बिंदु","समान स्पर्श रेखाएँ","परिगत"] }
},

{
  id: 11,
  en: "Areas Related to Circles", hi: "वृत्तों से संबंधित क्षेत्रफल",
  enDesc: "Area of a sector, area of a segment, and combinations of plane figures.",
  hiDesc: "त्रिज्यखंड का क्षेत्रफल, वृत्तखंड का क्षेत्रफल तथा समतल आकृतियों के संयोजन।",
  weight: 5, demand: "scoring", pages: "171–177",
  chaptersTag:{ en:"Mensuration", hi:"क्षेत्रमिति" },
  concepts: [
    { t:{en:"Sector", hi:"त्रिज्यखंड"},
      b:{en:"A sector is the region between two radii and the arc. Its area is (θ/360)·πr² and arc length is (θ/360)·2πr. The ratio θ/360 does all the work.",
         hi:"त्रिज्यखंड दो त्रिज्याओं और चाप से घिरा क्षेत्र है। इसका क्षेत्रफल (θ/360)·πr² तथा चाप की लंबाई (θ/360)·2πr है। θ/360 का अनुपात ही पूरा काम करता है।"} },
    { t:{en:"Segment", hi:"वृत्तखंड"},
      b:{en:"Area of a minor segment = area of sector − area of the triangle formed by the two radii and the chord. For a right angle at the centre, that triangle area is ½r².",
         hi:"लघु वृत्तखंड का क्षेत्रफल = त्रिज्यखंड का क्षेत्रफल − दो त्रिज्याओं व जीवा से बने त्रिभुज का क्षेत्रफल। जब केंद्र पर समकोण हो, तो वह त्रिभुज का क्षेत्रफल ½r² होता है।"} },
    { t:{en:"Combination figures", hi:"संयोजित आकृतियाँ"},
      b:{en:"Shaded-region questions = (sum of some standard areas) − (sum of others). Identify the shapes, write them symbolically, then substitute — never compute radii squares in the middle of the reasoning.",
         hi:"छायांकित क्षेत्र के प्रश्न = (कुछ मानक क्षेत्रफलों का योग) − (अन्य क्षेत्रफलों का योग)। आकृतियाँ पहचानिए, प्रतीकात्मक रूप में लिखिए, फिर मान रखिए — तर्क के बीच में त्रिज्या के वर्ग की गणना न कीजिए।"} },
    { t:{en:"Perimeter of a shaded region", hi:"छायांकित क्षेत्र का परिमाप"},
      b:{en:"Perimeter ≠ area. For a sector you add two radii and the arc; for a segment you add the chord and the arc. Students routinely lose this mark.",
         hi:"परिमाप ≠ क्षेत्रफल। त्रिज्यखंड में दो त्रिज्याएँ और चाप जोड़िए; वृत्तखंड में जीवा और चाप। छात्र यह अंक अक्सर खो देते हैं।"} },
    { t:{en:"π and precision", hi:"π और परिशुद्धता"},
      b:{en:"Use π = 22/7 when the radius is a multiple of 7, else 3.14 (or keep π in the answer). Board answer keys accept either if the question does not specify — check the instruction line.",
         hi:"जब त्रिज्या 7 का गुणज हो तो π = 22/7 लीजिए, अन्यथा 3.14 (या उत्तर में π रखिए)। यदि प्रश्न में निर्देश न हो तो बोर्ड की उत्तर-कुंजी दोनों स्वीकार करती है — निर्देश पंक्ति देखिए।"} }
  ],
  formulas: [
    { n:{en:"Area of sector", hi:"त्रिज्यखंड का क्षेत्रफल"}, e:"A = (θ/360) × πr²" },
    { n:{en:"Arc length", hi:"चाप की लंबाई"}, e:"l = (θ/360) × 2πr" },
    { n:{en:"Major + minor sector", hi:"दीर्घ + लघु त्रिज्यखंड"}, e:"areas add to πr²" },
    { n:{en:"Area of segment", hi:"वृत्तखंड का क्षेत्रफल"}, e:"A = sector − triangle" },
    { n:{en:"Right-angle triangle at centre", hi:"केंद्र पर समकोण वाला त्रिभुज"}, e:"area = ½ r²" },
    { n:{en:"Perimeter of sector", hi:"त्रिज्यखंड का परिमाप"}, e:"P = 2r + arc" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Find the area of a sector of a circle of radius 7 cm with a central angle of 90°.", hi:"7 सेमी त्रिज्या वाले वृत्त के उस त्रिज्यखंड का क्षेत्रफल ज्ञात कीजिए जिसका केंद्रीय कोण 90° है।" },
    { board:"CBSE", year:"2022", marks:3,
      en:"Find the area of the minor segment of a circle of radius 14 cm, when the central angle is 90°.", hi:"14 सेमी त्रिज्या वाले वृत्त के लघु वृत्तखंड का क्षेत्रफल ज्ञात कीजिए, जब केंद्रीय कोण 90° है।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"The length of the minute hand of a clock is 14 cm. Find the area swept by the minute hand in 5 minutes.", hi:"घड़ी की मिनट की सुई की लंबाई 14 सेमी है। 5 मिनट में मिनट की सुई द्वारा रचित क्षेत्रफल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2019", marks:4,
      en:"A chord of a circle of radius 10 cm subtends a right angle at the centre. Find the area of the corresponding minor segment. (π = 3.14)", hi:"10 सेमी त्रिज्या वाले वृत्त की एक जीवा केंद्र पर समकोण अंतरित करती है। संगत लघु वृत्तखंड का क्षेत्रफल ज्ञात कीजिए। (π = 3.14)" },
    { board:"CBSE", year:"2024", marks:1,
      en:"If the sum of the circumferences of two circles with radii R₁ and R₂ is equal to the circumference of a circle of radius R, then ____.", hi:"यदि त्रिज्याओं R₁ और R₂ वाले दो वृत्तों की परिधियों का योग, त्रिज्या R वाले वृत्त की परिधि के बराबर हो, तो ____।" }
  ],
  plan: [
    { en:"Write the sector and arc formulas and keep π symbolic until the last line.", hi:"त्रिज्यखंड और चाप के सूत्र लिखिए तथा अंतिम पंक्ति तक π प्रतीकात्मक रखिए।" },
    { en:"Do 4 segment questions: 90°, 60°, 120° and a semicircle case.", hi:"4 वृत्तखंड प्रश्न कीजिए: 90°, 60°, 120° तथा अर्धवृत्त की स्थिति।" },
    { en:"Practise one shaded-region combination figure with two circles.", hi:"दो वृत्तों वाली एक छायांकित-क्षेत्र संयोजित आकृति कीजिए।" },
    { en:"Always compute perimeter separately from area and label the unit (cm vs cm²).", hi:"परिमाप और क्षेत्रफल अलग-अलग निकालिए तथा इकाई अवश्य लिखिए (सेमी या सेमी²)।" }
  ],
  keywords:{ en:["sector","segment","arc","shaded region","central angle"], hi:["त्रिज्यखंड","वृत्तखंड","चाप","छायांकित क्षेत्र","केंद्रीय कोण"] }
},

{
  id: 12,
  en: "Surface Areas and Volumes", hi: "पृष्ठीय क्षेत्रफल और आयतन",
  enDesc: "Combinations of solids: cylinder, cone, sphere, hemisphere and frustum.",
  hiDesc: "ठोसों का संयोजन: बेलन, शंकु, गोला, अर्धगोला तथा शंकु का छिन्नक।",
  weight: 8, demand: "exam-favourite", pages: "178–189",
  chaptersTag:{ en:"Mensuration", hi:"क्षेत्रमिति" },
  concepts: [
    { t:{en:"Combination rule", hi:"संयोजन का नियम"},
      b:{en:"For joined solids, add the surface areas but subtract the hidden (joined) faces. Volume always adds — nothing is lost when you glue two solids together.",
         hi:"जुड़े ठोसों में पृष्ठीय क्षेत्रफल जोड़िए परन्तु छिपे (जुड़े) फलक घटाइए। आयतन सदैव जुड़ता है — दो ठोस जोड़ने पर कुछ भी नष्ट नहीं होता।"} },
    { t:{en:"Cone: slant height", hi:"शंकु: तिर्यक ऊँचाई"},
      b:{en:"l² = r² + h². Questions give two of the three; always find the third first. Curved surface = πrl, total = πr(l + r), volume = ⅓πr²h.",
         hi:"l² = r² + h²। प्रश्न तीनों में से दो देते हैं; पहले तीसरा ज्ञात कीजिए। वक्र पृष्ठ = πrl, संपूर्ण पृष्ठ = πr(l + r), आयतन = ⅓πr²h।"} },
    { t:{en:"Frustum", hi:"छिन्नक"},
      b:{en:"A bucket is a frustum. Capacity = ⅓πh(r₁² + r₂² + r₁r₂); slant height l = √[h² + (r₁ − r₂)²]. This is the most repeated 'real-life' question in the chapter.",
         hi:"बाल्टी एक छिन्नक है। धारिता = ⅓πh(r₁² + r₂² + r₁r₂); तिर्यक ऊँचाई l = √[h² + (r₁ − r₂)²]। यह अध्याय का सर्वाधिक बार पूछा जाने वाला 'वास्तविक जीवन' प्रश्न है।"} },
    { t:{en:"Melting / recasting problems", hi:"पिघलाने / ढालने के प्रश्न"},
      b:{en:"When one solid is melted and recast into another, volume is conserved. Equate the two volume formulas and solve for the unknown — usually the number of small solids or the new radius.",
         hi:"जब एक ठोस पिघलाकर दूसरा बनाया जाता है, तो आयतन संरक्षित रहता है। दोनों आयतन सूत्रों को बराबर रखकर अज्ञात (सामान्यतः छोटे ठोसों की संख्या या नई त्रिज्या) ज्ञात कीजिए।"} },
    { t:{en:"Units discipline", hi:"इकाइयों का अनुशासन"},
      b:{en:"Convert every dimension to the same unit at the start (1 m = 100 cm, 1 L = 1000 cm³). Write area in cm²/m² and volume in cm³/m³ or litres. Boards deduct marks for missing units.",
         hi:"शुरू में ही सभी विमाएँ एक ही इकाई में बदलिए (1 मी = 100 सेमी, 1 लीटर = 1000 सेमी³)। क्षेत्रफल सेमी²/मी² में तथा आयतन सेमी³/मी³ या लीटर में लिखिए। इकाई न लिखने पर अंक कटते हैं।"} }
  ],
  formulas: [
    { n:{en:"Cylinder", hi:"बेलन"}, e:"CSA = 2πrh , TSA = 2πr(h+r) , V = πr²h" },
    { n:{en:"Cone", hi:"शंकु"}, e:"l = √(r²+h²) , CSA = πrl , V = ⅓πr²h" },
    { n:{en:"Sphere", hi:"गोला"}, e:"SA = 4πr² , V = (4/3)πr³" },
    { n:{en:"Hemisphere", hi:"अर्धगोला"}, e:"CSA = 2πr² , TSA = 3πr² , V = (2/3)πr³" },
    { n:{en:"Frustum", hi:"छिन्नक"}, e:"V = ⅓πh(r₁²+r₂²+r₁r₂)\nl = √[h²+(r₁−r₂)²]" },
    { n:{en:"Recasting", hi:"पुनर्निर्माण"}, e:"V₁ = V₂  (volume conserved)" },
    { n:{en:"Unit conversion", hi:"इकाई परिवर्तन"}, e:"1 m³ = 10⁶ cm³ , 1 L = 1000 cm³" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:3,
      en:"A wooden article was made by scooping out a hemisphere from each end of a solid cylinder. If the cylinder is 10 cm high and its base radius is 3.5 cm, find the total surface area of the article.", hi:"एक ठोस बेलन के दोनों सिरों से अर्धगोला निकालकर एक लकड़ी की वस्तु बनाई गई। यदि बेलन की ऊँचाई 10 सेमी और आधार त्रिज्या 3.5 सेमी है, तो वस्तु का संपूर्ण पृष्ठीय क्षेत्रफल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:4,
      en:"A metallic cylinder of diameter 14 cm and height 42 cm is melted and recast into spheres of diameter 7 cm. Find the number of spheres formed.", hi:"14 सेमी व्यास और 42 सेमी ऊँचाई का धातु का बेलन पिघलाकर 7 सेमी व्यास के गोले बनाए गए। बने गोलों की संख्या ज्ञात कीजिए।" },
    { board:"CBSE", year:"2021", marks:4,
      en:"A bucket is in the shape of a frustum with radii 15 cm and 10 cm and height 24 cm. Find its capacity in litres.", hi:"एक बाल्टी छिन्नक के आकार की है जिसकी त्रिज्याएँ 15 सेमी और 10 सेमी तथा ऊँचाई 24 सेमी है। उसकी धारिता लीटर में ज्ञात कीजिए।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"A tent is in the shape of a cylinder surmounted by a conical top. If the height and diameter of the cylindrical part are 2.1 m and 4 m, and the slant height of the top is 2.8 m, find the area of the canvas used.", hi:"एक तंबू बेलन के आकार का है जिसके ऊपर शंकु है। यदि बेलनाकार भाग की ऊँचाई व व्यास 2.1 मी और 4 मी तथा शंकु की तिर्यक ऊँचाई 2.8 मी है, तो प्रयुक्त कैनवास का क्षेत्रफल ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"The volume of a sphere is equal to the volume of a cylinder with radius 4 cm and height 12 cm. Find the radius of the sphere.", hi:"एक गोले का आयतन 4 सेमी त्रिज्या और 12 सेमी ऊँचाई वाले बेलन के आयतन के बराबर है। गोले की त्रिज्या ज्ञात कीजिए।" }
  ],
  plan: [
    { en:"Make a one-page formula sheet for all five solids and revise it daily.", hi:"पाँचों ठोसों की एक पृष्ठीय सूत्र-सूची बनाइए और प्रतिदिन दोहराइए।" },
    { en:"Solve 3 combination questions, marking which faces are hidden.", hi:"3 संयोजन प्रश्न हल कीजिए, छिपे फलक चिह्नित करते हुए।" },
    { en:"Do 2 recasting problems (sphere ↔ cylinder, cone → small spheres).", hi:"2 पुनर्निर्माण प्रश्न कीजिए (गोला ↔ बेलन, शंकु → छोटे गोले)।" },
    { en:"Practise the frustum bucket twice — it appears nearly every year.", hi:"छिन्नक बाल्टी का प्रश्न दो बार कीजिए — यह लगभग हर वर्ष आता है।" }
  ],
  keywords:{ en:["sphere","cylinder","cone","frustum","surface area","volume","recast"], hi:["गोला","बेलन","शंकु","छिन्नक","पृष्ठीय क्षेत्रफल","आयतन","पिघलाना"] }
},

{
  id: 13,
  en: "Statistics", hi: "सांख्यिकी",
  enDesc: "Mean, median and mode of grouped data, plus the modal class and median class reading.",
  hiDesc: "वर्गीकृत आँकड़ों का माध्य, माध्यक और बहुलक, तथा बहुलक वर्ग व माध्यक वर्ग।",
  weight: 8, demand: "practice-heavy", pages: "190–222",
  chaptersTag:{ en:"Statistics", hi:"सांख्यिकी" },
  concepts: [
    { t:{en:"Three measures of central tendency", hi:"केंद्रीय प्रवृत्ति के तीन माप"},
      b:{en:"Mean uses every observation, median splits the data, and mode is the most frequent value. For grouped data each needs its own formula and its own class identification step.",
         hi:"माध्य सभी प्रेक्षणों का उपयोग करता है, माध्यक आँकड़ों को बाँटता है, और बहुलक सर्वाधिक बार आने वाला मान है। वर्गीकृत आँकड़ों में प्रत्येक का अपना सूत्र और वर्ग पहचानने का चरण होता है।"} },
    { t:{en:"Direct mean (Σfx / Σf)", hi:"प्रत्यक्ष माध्य (Σfx / Σf)"},
      b:{en:"Write class marks x = (lower + upper)/2, multiply by frequency, add, and divide by Σf. Reliable and always acceptable.",
         hi:"वर्ग-चिह्न x = (निम्न + उच्च)/2 लिखिए, बारंबारता से गुणा कीजिए, जोड़िए और Σf से भाग दीजिए। विश्वसनीय और सदैव स्वीकार्य।"} },
    { t:{en:"Assumed mean / step deviation", hi:"कल्पित माध्य / पग विचलन"},
      b:{en:"Pick a = one class mark, d = x − a, u = d/h. Mean = a + h(Σfu/Σf). Faster when class marks are large — and it is the method examiners set for 'by step-deviation' questions.",
         hi:"एक वर्ग-चिह्न को a लीजिए, d = x − a, u = d/h। माध्य = a + h(Σfu/Σf)। जब वर्ग-चिह्न बड़े हों तो यह तेज़ है — और 'पग विचलन से' वाले प्रश्नों में यही अपेक्षित है।"} },
    { t:{en:"Median of grouped data", hi:"वर्गीकृत आँकड़ों का माध्यक"},
      b:{en:"Median = l + [(n/2 − cf)/f]·h, where l is the lower limit of the median class, cf the cumulative frequency before it, f its frequency, h the class size. n/2 decides the class.",
         hi:"माध्यक = l + [(n/2 − cf)/f]·h, जहाँ l माध्यक वर्ग की निम्न सीमा, cf उससे पहले की संचयी बारंबारता, f उसकी बारंबारता और h वर्ग-माप है। n/2 वर्ग निर्धारित करता है।"} },
    { t:{en:"Mode of grouped data", hi:"वर्गीकृत आँकड़ों का बहुलक"},
      b:{en:"Mode = l + [(f₁ − f₀)/(2f₁ − f₀ − f₂)]·h. Identify the class with the highest frequency first — a wrong modal class makes the entire answer wrong.",
         hi:"बहुलक = l + [(f₁ − f₀)/(2f₁ − f₀ − f₂)]·h। पहले सर्वाधिक बारंबारता वाला वर्ग पहचानिए — बहुलक वर्ग गलत होने पर पूरा उत्तर गलत हो जाता है।"} },
    { t:{en:"Empirical relation", hi:"आनुभविक संबंध"},
      b:{en:"3 Median = Mode + 2 Mean. Asked as 'find the missing frequency' or 'find one measure given the other two'.",
         hi:"3 माध्यक = बहुलक + 2 माध्य। यह 'अज्ञात बारंबारता ज्ञात कीजिए' या 'दो मापों से तीसरा ज्ञात कीजिए' के रूप में पूछा जाता है।"} }
  ],
  formulas: [
    { n:{en:"Mean (direct)", hi:"माध्य (प्रत्यक्ष)"}, e:"x̄ = Σfx / Σf ,  x = (l + u)/2" },
    { n:{en:"Mean (step deviation)", hi:"माध्य (पग विचलन)"}, e:"x̄ = a + h(Σfu / Σf) ,  u = (x − a)/h" },
    { n:{en:"Median", hi:"माध्यक"}, e:"Med = l + [(n/2 − cf)/f] × h" },
    { n:{en:"Mode", hi:"बहुलक"}, e:"Mo = l + [(f₁ − f₀)/(2f₁ − f₀ − f₂)] × h" },
    { n:{en:"Empirical relation", hi:"आनुभविक संबंध"}, e:"Mode = 3 Median − 2 Mean" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:3,
      en:"Find the mean of the following distribution using the direct method: classes 10–25, 25–40, 40–55, 55–70, 70–85 with frequencies 2, 3, 7, 6, 6.", hi:"निम्न बंटन का प्रत्यक्ष विधि से माध्य ज्ञात कीजिए: वर्ग 10–25, 25–40, 40–55, 55–70, 70–85 तथा बारंबारताएँ 2, 3, 7, 6, 6।" },
    { board:"CBSE", year:"2022", marks:4,
      en:"The median of the distribution given below is 28.5. Find the missing frequencies x and y, if the total frequency is 60.", hi:"नीचे दिए बंटन का माध्यक 28.5 है। यदि कुल बारंबारता 60 है, तो लुप्त बारंबारताएँ x और y ज्ञात कीजिए।" },
    { board:"CBSE", year:"2021", marks:3,
      en:"Find the mode of the data: classes 0–10, 10–20, 20–30, 30–40, 40–50 with frequencies 7, 14, 13, 12, 20.", hi:"आँकड़ों का बहुलक ज्ञात कीजिए: वर्ग 0–10, 10–20, 20–30, 30–40, 40–50 तथा बारंबारताएँ 7, 14, 13, 12, 20।" },
    { board:"CBSE", year:"2020", marks:3,
      en:"If the mean of the following distribution is 18, find the missing frequency f.", hi:"यदि निम्न बंटन का माध्य 18 है, तो लुप्त बारंबारता f ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"For a given data, if the mean is 20 and the median is 22, find the mode using the empirical relation.", hi:"दिए आँकड़ों का माध्य 20 और माध्यक 22 है; आनुभविक संबंध का उपयोग करके बहुलक ज्ञात कीजिए।" }
  ],
  plan: [
    { en:"Build a table template with columns x, f, fx, cf — use the same template in the exam.", hi:"x, f, fx, cf वाले स्तंभों का तालिका प्रारूप बनाइए — परीक्षा में भी यही प्रारूप प्रयोग कीजिए।" },
    { en:"Do one full mean by all three methods on the same data and compare speed.", hi:"एक ही आँकड़ों पर तीनों विधियों से माध्य निकालिए और गति की तुलना कीजिए।" },
    { en:"Practise 3 median questions, each time writing why the median class was chosen.", hi:"3 माध्यक प्रश्न कीजिए, हर बार लिखिए कि माध्यक वर्ग क्यों चुना गया।" },
    { en:"Solve 1 missing-frequency question with the total-frequency condition.", hi:"कुल बारंबारता की शर्त वाला 1 लुप्त-बारंबारता प्रश्न हल कीजिए।" }
  ],
  keywords:{ en:["mean","median","mode","class mark","cumulative frequency","missing frequency"], hi:["माध्य","माध्यक","बहुलक","वर्ग-चिह्न","संचयी बारंबारता","लुप्त बारंबारता"] }
},

{
  id: 14,
  en: "Probability", hi: "प्रायिकता",
  enDesc: "Classical probability, complementary events, and cards, dice and coin problems.",
  hiDesc: "चिरसम्मत प्रायिकता, पूरक घटनाएँ तथा ताश, पासे और सिक्के के प्रश्न।",
  weight: 6, demand: "scoring", pages: "223–240",
  chaptersTag:{ en:"Probability", hi:"प्रायिकता" },
  concepts: [
    { t:{en:"The basic definition", hi:"मूल परिभाषा"},
      b:{en:"P(E) = (number of favourable outcomes) / (total number of equally likely outcomes). Count the sample space carefully first: one die = 6, two dice = 36, one coin = 2, two coins = 4, three coins = 8.",
         hi:"P(E) = (अनुकूल परिणामों की संख्या) / (कुल समप्रायिक परिणामों की संख्या)। पहले प्रतिदर्श समष्टि ध्यान से गिनिए: एक पासा = 6, दो पासे = 36, एक सिक्का = 2, दो सिक्के = 4, तीन सिक्के = 8।"} },
    { t:{en:"Range and certainty", hi:"परिसर और निश्चितता"},
      b:{en:"0 ≤ P(E) ≤ 1. An impossible event has probability 0; a sure event has probability 1. A negative value or a value like 15% written as 15 is automatically wrong — a favourite one-mark check.",
         hi:"0 ≤ P(E) ≤ 1। असंभव घटना की प्रायिकता 0 और निश्चित घटना की 1 होती है। ऋणात्मक मान या 15% को 15 लिखना स्वतः गलत है — यह प्रिय एक-अंक जाँच है।"} },
    { t:{en:"Complementary events", hi:"पूरक घटनाएँ"},
      b:{en:"P(E) + P(not E) = 1. Whenever a question says 'at least' or 'not', compute the complement and subtract from 1 — it is almost always shorter.",
         hi:"P(E) + P(E नहीं) = 1। जब प्रश्न में 'कम से कम' या 'नहीं' हो, तो पूरक निकालकर 1 से घटाइए — यह लगभग सदैव छोटा रास्ता है।"} },
    { t:{en:"Cards: know the deck", hi:"ताश: गड्डी जानिए"},
      b:{en:"52 cards = 4 suits × 13. Each suit has ace, 2–10, jack, queen, king. Face cards = 12 (J, Q, K). Red = hearts + diamonds = 26; black = spades + clubs = 26. Aces = 4.",
         hi:"52 पत्ते = 4 रंग × 13। प्रत्येक रंग में इक्का, 2–10, गुलाम, बेगम, बादशाह। तस्वीर वाले पत्ते = 12 (J, Q, K)। लाल = पान + ईंट = 26; काले = हुकुम + चिड़ी = 26। इक्के = 4।"} },
    { t:{en:"Two dice: sum problems", hi:"दो पासे: योग के प्रश्न"},
      b:{en:"Write the 6×6 table once. Sums 2 and 12 occur once each, 7 occurs six times (the most), and the numbers of ways are symmetric about 7. This single table answers most two-dice questions.",
         hi:"6×6 की तालिका एक बार लिखिए। योग 2 और 12 एक-एक बार, 7 छह बार (सर्वाधिक) आते हैं, और तरीकों की संख्या 7 के दोनों ओर सममित है। यही तालिका अधिकांश दो-पासे प्रश्नों का उत्तर देती है।"} }
  ],
  formulas: [
    { n:{en:"Classical probability", hi:"चिरसम्मत प्रायिकता"}, e:"P(E) = favourable ÷ total" },
    { n:{en:"Complement", hi:"पूरक"}, e:"P(E) + P(not E) = 1" },
    { n:{en:"Sample spaces", hi:"प्रतिदर्श समष्टियाँ"}, e:"1 die 6 · 2 dice 36 · 2 coins 4 · 3 coins 8" },
    { n:{en:"Deck of cards", hi:"ताश की गड्डी"}, e:"52 cards · 4 suits · 12 face · 26 red" },
    { n:{en:"Two dice sums", hi:"दो पासों के योग"}, e:"7 → 6 ways · 2 or 12 → 1 way each" },
    { n:{en:"Impossible / sure", hi:"असंभव / निश्चित"}, e:"P = 0 / P = 1" }
  ],
  pyqs: [
    { board:"CBSE", year:"2023", marks:2,
      en:"Two dice are thrown together. Find the probability that the sum of the numbers appearing is 8.", hi:"दो पासे एक साथ फेंके जाते हैं। आने वाली संख्याओं का योग 8 होने की प्रायिकता ज्ञात कीजिए।" },
    { board:"CBSE", year:"2022", marks:2,
      en:"One card is drawn from a well-shuffled deck of 52 cards. Find the probability of getting a king of red colour.", hi:"52 पत्तों की अच्छी तरह फेंटी गई गड्डी से एक पत्ता निकाला जाता है। लाल रंग का बादशाह आने की प्रायिकता ज्ञात कीजिए।" },
    { board:"CBSE", year:"2021", marks:3,
      en:"A bag contains 5 red, 8 white and 7 black balls. One ball is drawn at random. Find the probability that it is (i) red (ii) not black.", hi:"एक थैले में 5 लाल, 8 सफेद और 7 काली गेंदें हैं। एक गेंद यादृच्छया निकाली जाती है। प्रायिकता ज्ञात कीजिए कि वह (i) लाल है (ii) काली नहीं है।" },
    { board:"CBSE", year:"2020", marks:2,
      en:"A die is thrown once. Find the probability of getting a prime number.", hi:"एक पासा एक बार फेंका जाता है। अभाज्य संख्या आने की प्रायिकता ज्ञात कीजिए।" },
    { board:"CBSE", year:"2024", marks:1,
      en:"Which of the following cannot be the probability of an event: 2/3, −1.5, 15%, 0.7?", hi:"निम्नलिखित में से कौन किसी घटना की प्रायिकता नहीं हो सकती: 2/3, −1.5, 15%, 0.7?" }
  ],
  plan: [
    { en:"Write out the sample spaces for 1 die, 2 dice, 2 coins and a deck on one card.", hi:"1 पासा, 2 पासे, 2 सिक्के और ताश की गड्डी की प्रतिदर्श समष्टियाँ एक कार्ड पर लिखिए।" },
    { en:"Do 5 card questions covering red/black, face, king, spade and 'not an ace'.", hi:"लाल/काला, तस्वीर, बादशाह, हुकुम और 'इक्का नहीं' सहित 5 ताश प्रश्न कीजिए।" },
    { en:"Solve 4 'at least one' questions by the complement method.", hi:"4 'कम से कम एक' प्रश्न पूरक विधि से हल कीजिए।" },
    { en:"Build the 6×6 dice table and list the number of ways for each sum.", hi:"6×6 पासा तालिका बनाइए और प्रत्येक योग के तरीकों की संख्या लिखिए।" }
  ],
  keywords:{ en:["probability","sample space","complement","cards","dice","favourable outcomes"], hi:["प्रायिकता","प्रतिदर्श समष्टि","पूरक","ताश","पासा","अनुकूल परिणाम"] }
}
);
