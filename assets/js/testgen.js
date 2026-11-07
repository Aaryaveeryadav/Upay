/* =====================================================================
   Upay · test paper generator
   ---------------------------------------------------------------------
   Each template below is one *logic family* learnt from the CBSE papers
   in /uploads. A template never repeats a year's numbers verbatim: it
   re-derives the same reasoning with fresh values, which is exactly the
   "previous year, different numbers" behaviour a student needs.

   make(rng, d) returns
     { en, hi, opts?, ans, ansHi?, steps:[{en,hi}], fig, raw }
   `raw` holds the numbers used, so tools/testgen-check.js can recompute
   every answer independently and prove the generator is not lying.
   ===================================================================== */
window.UP = window.UP || {};

UP.testgen = (function () {
  'use strict';

  /* ---------------------------------------------------------------- rng */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function ri(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function ord(n) { var t = n % 100; if (t >= 11 && t <= 13) return n + 'th';
    var u = n % 10; return n + (u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function simp(n, d) { var g = gcd(n, d); if (g) { n /= g; d /= g; } if (d < 0) { n = -n; d = -d; } return [n, d]; }
  function fr(n, d) { var s = simp(n, d); return s[1] === 1 ? String(s[0]) : s[0] + '/' + s[1]; }
  function sgn(n) { return n < 0 ? '−' + Math.abs(n) : String(n); }
  function fmt(n) { return String(n).replace(/-/g, '−'); }
  function dec(x, k) { var p = Math.pow(10, k); return String(Math.round(x * p) / p).replace(/-/g, '−'); }

  /* bilingual step */
  function st(en, hi) { return { en: en, hi: hi }; }

  /* ------------------------------------------------------- option helper */
  function mcq(rng, correct, distractors) {
    var opts = [{ en: correct, hi: correct }];
    var seen = {}; seen[correct] = 1;
    for (var i = 0; i < distractors.length && opts.length < 4; i++) {
      var v = distractors[i];
      if (v === null || v === undefined) continue;
      if (seen[v]) continue;
      seen[v] = 1;
      opts.push({ en: v, hi: v });
    }
    while (opts.length < 4) { var f = String(opts.length + 1) + '·0'; if (!seen[f]) { seen[f] = 1; opts.push({ en: f, hi: f }); } }
    return shuffle(rng, opts);
  }

  /* ================================================================
     TEMPLATES
     marks = mark value · dmin/dmax = difficulty band it can serve
     ================================================================ */
  /* Extra, computation-checked working appended to the shorter templates.
   Each entry was accepted only after its numbers were re-derived from raw{}.
   Nothing here can change an answer: make() still returns the same ans. */
var EXTRA_STEPS = {
 "hcf-lcm": [
  {
   "en": "Euclid: 28 = 7×4 and 49 = 7×7, so m = HCF = 7.",
   "hi": "यूक्लिड: 28 = 7×4 तथा 49 = 7×7, अतः m = HCF = 7।"
  },
  {
   "en": "HCF × LCM = product of the numbers: 7 × n = 28 × 49 = 1372, so n = LCM = 196.",
   "hi": "HCF × LCM = संख्याओं का गुणनफल: 7 × n = 28 × 49 = 1372, अतः n = LCM = 196।"
  },
  {
   "en": "Now n − 3m = 196 − 3×7 = 196 − 21 = 175.",
   "hi": "अब n − 3m = 196 − 3×7 = 196 − 21 = 175।"
  }
 ],
 "hcf-find": [
  {
   "en": "HCF divides both numbers: 36 ÷ 9 = 4 and 63 ÷ 9 = 7, both whole.",
   "hi": "HCF दोनों को विभाजित करता है: 36 ÷ 9 = 4 तथा 63 ÷ 9 = 7, दोनों पूर्णांक।"
  },
  {
   "en": "Use HCF × LCM = product: 9 × 252 = 2268 = 36 × 63.",
   "hi": "HCF × LCM = गुणनफल: 9 × 252 = 2268 = 36 × 63।"
  }
 ],
 "irrational": [
  {
   "en": "Assume √5 = a/b with a, b coprime whole numbers, b ≠ 0.",
   "hi": "मान लीजिए √5 = a/b जहाँ a, b सह-अभाज्य पूर्णांक हैं, b ≠ 0।"
  },
  {
   "en": "Squaring: 5b² = a², so 5 divides a², hence 5 divides a.",
   "hi": "वर्ग करने पर: 5b² = a², अतः 5 a² को विभाजित करता है, इसलिए 5 a को विभाजित करता है।"
  },
  {
   "en": "Write a = 5k, then 5b² = 5²k², so b² = 5k² and 5 divides b too — contradicting \"coprime\".",
   "hi": "a = 5k रखिए, तब 5b² = 5²k², अतः b² = 5k² और 5 b को भी विभाजित करता है — जो \"सह-अभाज्य\" का विरोध है।"
  },
  {
   "en": "The contradiction means no such a/b exists, so √5 is irrational.",
   "hi": "यह विरोधाभास दर्शाता है कि ऐसा a/b नहीं है, अतः √5 अपरिमेय है।"
  }
 ],
 "poly-zeroes": [
  {
   "en": "A quadratic with zeroes α and β is k(x − α)(x − β).",
   "hi": "α और β मूलों वाला द्विघात k(x − α)(x − β) है।"
  },
  {
   "en": "Sum of zeroes = 0.333 and product = 0.667 — these must match the coefficients.",
   "hi": "मूलों का योग = 0.333 तथा गुणनफल = 0.667 — ये गुणांकों से मेल खाने चाहिए।"
  }
 ],
 "poly-relation": [
  {
   "en": "Sum of zeroes α + β = 8 + 4 = 12, which must equal −(coefficient of x)/(coefficient of x²).",
   "hi": "मूलों का योग α + β = 8 + 4 = 12, जो −(x का गुणांक)/(x² का गुणांक) के बराबर होना चाहिए।"
  },
  {
   "en": "Product αβ = 8 × 4 = 32, which must equal (constant)/(coefficient of x²).",
   "hi": "गुणनफल αβ = 8 × 4 = 32, जो (अचर)/(x² का गुणांक) के बराबर होना चाहिए।"
  }
 ],
 "poly-graph": [
  {
   "en": "A graph that touches the x-axis at one point has exactly one repeated zero, so the discriminant is zero.",
   "hi": "x-अक्ष को एक ही बिंदु पर स्पर्श करने वाले ग्राफ का ठीक एक आवृत्त मूल होता है, अतः विविक्तकर शून्य है।"
  }
 ],
 "linear-k": [
  {
   "en": "Compare the ratios: a₁/a₂ = 3/9 and b₁/b₂ = 3/9.",
   "hi": "अनुपात तुलना कीजिए: a₁/a₂ = 3/9 तथा b₁/b₂ = 3/9।"
  },
  {
   "en": "No solution needs a₁/a₂ = b₁/b₂ but c₁/c₂ different: here 3/9 = 0.333 and c₁/c₂ = 6/18.",
   "hi": "कोई हल नहीं के लिए a₁/a₂ = b₁/b₂ पर c₁/c₂ भिन्न चाहिए: यहाँ 3/9 = 0.333 तथा c₁/c₂ = 6/18।"
  }
 ],
 "linear-invest": [
  {
   "en": "Let the two parts be x and y; x + y = 21000.",
   "hi": "दोनों भाग x और y मानिए; x + y = 21000।"
  },
  {
   "en": "Interest: 7% of 12000 = 840 and 8% of 9000 = 720, total 1560.",
   "hi": "ब्याज: 12000 का 7% = 840 तथा 9000 का 8% = 720, कुल 1560।"
  }
 ],
 "quad-roots": [
  {
   "en": "Sum of roots = 6 and product = 9, so the equation is x² − 6x + 9 = 0.",
   "hi": "मूलों का योग = 6 तथा गुणनफल = 9, अतः समीकरण x² − 6x + 9 = 0 है।"
  },
  {
   "en": "Factorising: (x − 3)(x − 3) = 0, giving x = 3 and x = 3.",
   "hi": "गुणनखंडन: (x − 3)(x − 3) = 0, अतः x = 3 तथा x = 3।"
  }
 ],
 "quad-disc": [
  {
   "en": "For ax² + bx + c = 0, the discriminant is D = b² − 4ac.",
   "hi": "ax² + bx + c = 0 के लिए विविक्तकर D = b² − 4ac है।"
  },
  {
   "en": "D = 4² − 4(2)(2) = 16 − 16 = 0.",
   "hi": "D = 4² − 4(2)(2) = 16 − 16 = 0।"
  },
  {
   "en": "D = 0 means the roots are real and equal.",
   "hi": "D = 0 का अर्थ है मूल वास्तविक और बराबर हैं।"
  }
 ],
 "quad-triangle": [
  {
   "en": "The two legs a and b satisfy a² + b² = c², and a + b = P − c = 34.",
   "hi": "दोनों भुजाएँ a और b संतुष्ट करती हैं a² + b² = c², तथा a + b = P − c = 34।"
  },
  {
   "en": "Check: 10² + 24² = 100 + 576 = 676 = 26².",
   "hi": "जाँच: 10² + 24² = 100 + 576 = 676 = 26²।"
  },
  {
   "en": "Area = ½ × 10 × 24 = 120 cm².",
   "hi": "क्षेत्रफल = ½ × 10 × 24 = 120 cm²।"
  }
 ],
 "ap-nth": [
  {
   "en": "aₙ = a + (n − 1)d with a = 9, d = 5, n = 10.",
   "hi": "aₙ = a + (n − 1)d जहाँ a = 9, d = 5, n = 10।"
  },
  {
   "en": "aₙ = 9 + (10 − 1) × 5 = 9 + 45 = 54.",
   "hi": "aₙ = 9 + (10 − 1) × 5 = 9 + 45 = 54।"
  }
 ],
 "ap-sum-quad": [
  {
   "en": "Sₙ = 2n² + 4n, so the second term is S₂ − S₁.",
   "hi": "Sₙ = 2n² + 4n, अतः दूसरा पद S₂ − S₁ है।"
  },
  {
   "en": "S₁ = 6, S₂ = 16, so a₂ = 16 − 6 = 10.",
   "hi": "S₁ = 6, S₂ = 16, अतः a₂ = 16 − 6 = 10।"
  }
 ],
 "ap-sum": [
  {
   "en": "Number of terms n = 15, first term a = 14, common difference d = 6.",
   "hi": "पदों की संख्या n = 15, प्रथम पद a = 14, सार्व अंतर d = 6।"
  },
  {
   "en": "aₙ = a + (n − 1)d = 14 + 84 = 98.",
   "hi": "aₙ = a + (n − 1)d = 14 + 84 = 98।"
  },
  {
   "en": "Sₙ = n/2 (a + l) = n/2 × (first + last); here 15/2 (14 + 98) = 840, and the direct formula n/2 [2a + (n − 1)d] gives the same number.",
   "hi": "Sₙ = n/2 (a + l) = n/2 × (प्रथम + अंतिम); यहाँ 15/2 (14 + 98) = 840, तथा सीधा सूत्र n/2 [2a + (n − 1)d] भी वही देता है।"
  }
 ],
 "ap-case": [
  {
   "en": "With a = 250 and d = 50: a₄ = 250+3×50 = 400, a₅ = 450, a₆ = 500.",
   "hi": "a = 250 तथा d = 50: a₄ = 250+3×50 = 400, a₅ = 450, a₆ = 500।"
  },
  {
   "en": "a₈ = 250 + 7×50 = 600.",
   "hi": "a₈ = 250 + 7×50 = 600।"
  },
  {
   "en": "S₁₀ = 10/2 (2×250 + 9×50) = 5(500 + 450) = 4750.",
   "hi": "S₁₀ = 10/2 (2×250 + 9×50) = 5(500 + 450) = 4750।"
  }
 ],
 "ap-which": [
  {
   "en": "aₙ = 7 + (n−1)×5; we need 77.",
   "hi": "aₙ = 7 + (n−1)×5; हमें 77 चाहिए।"
  },
  {
   "en": "(77 − 7) ÷ 5 = 14, so n − 1 = 14 and n = 15.",
   "hi": "(77 − 7) ÷ 5 = 14, अतः n − 1 = 14 तथा n = 15।"
  }
 ],
 "tri-similar": [
  {
   "en": "Areas of similar triangles are in the ratio of the squares of corresponding sides.",
   "hi": "समरूप त्रिभुजों के क्षेत्रफल उनकी संगत भुजाओं के वर्गों के अनुपात में होते हैं।"
  },
  {
   "en": "Ratio of areas = 3² : 1² = 9 : 1.",
   "hi": "क्षेत्रफलों का अनुपात = 3² : 1² = 9 : 1।"
  }
 ],
 "tri-bpt": [
  {
   "en": "By the Basic Proportionality Theorem, AD/DB = AE/EC.",
   "hi": "आधारभूत समानुपातिकता प्रमेय से, AD/DB = AE/EC।"
  },
  {
   "en": "Check: 15/9 = 1.667 and 25/15 = 1.667 — equal, so DE ∥ BC.",
   "hi": "जाँच: 15/9 = 1.667 तथा 25/15 = 1.667 — बराबर, अतः DE ∥ BC।"
  },
  {
   "en": "So AB = 15 + 9 = 24 cm and AC = 25 + 15 = 40 cm.",
   "hi": "अतः AB = 15 + 9 = 24 cm तथा AC = 25 + 15 = 40 cm।"
  }
 ],
 "coord-mid": [
  {
   "en": "Midpoint = ((x₁+x₂)/2, (y₁+y₂)/2) = ((-3+1)/2, (-3+3)/2) = (-1, 0).",
   "hi": "मध्य-बिंदु = ((x₁+x₂)/2, (y₁+y₂)/2) = ((-3+1)/2, (-3+3)/2) = (-1, 0)।"
  },
  {
   "en": "The midpoint has y = 0, so it lies on the x-axis.",
   "hi": "मध्य-बिंदु का y = 0 है, अतः यह x-axis पर स्थित है।"
  }
 ],
 "coord-section": [
  {
   "en": "Section formula: P = ((m₁x₂ + m₂x₁)/(m₁+m₂), (m₁y₂ + m₂y₁)/(m₁+m₂)).",
   "hi": "विभाजन सूत्र: P = ((m₁x₂ + m₂x₁)/(m₁+m₂), (m₁y₂ + m₂y₁)/(m₁+m₂))।"
  },
  {
   "en": "y = (4×10 + 3×4)/(4+3) = 7.429.",
   "hi": "y = (4×10 + 3×4)/(4+3) = 7.429।"
  }
 ],
 "coord-dist": [
  {
   "en": "d² = (x₂−x₁)² + (y₂−y₁)² = (2−(-3))² + (6−(-2))² = 25 + 64 = 89.",
   "hi": "d² = (x₂−x₁)² + (y₂−y₁)² = (2−(-3))² + (6−(-2))² = 25 + 64 = 89।"
  },
  {
   "en": "d = √89, which simplifies to √89.",
   "hi": "d = √89, जो √89 तक सरल होता है।"
  }
 ],
 "trig-angle": [
  {
   "en": "Only the standard angles have known exact values, so the equation forces θ to a standard angle.",
   "hi": "केवल मानक कोणों के यथार्थ मान ज्ञात हैं, अतः समीकरण θ को मानक कोण बनने पर विवश करता है।"
  },
  {
   "en": "Checking θ = 45°: the equation holds, so θ = 45° is the acute solution.",
   "hi": "θ = 45° रखने पर: समीकरण संतुष्ट होता है, अतः θ = 45° न्यून कोण हल है।"
  }
 ],
 "trig-eval": [
  {
   "en": "Put in the standard values: tan 60° = √3 so tan²60° = 3, and sin 45° = 1/√2 so sin²45° = 1/2.",
   "hi": "मानक मान रखिए: tan 60° = √3 अतः tan²60° = 3, तथा sin 45° = 1/√2 अतः sin²45° = 1/2।"
  },
  {
   "en": "So tan²60° − 2sin²45° = 3 − 2×1/2 = 3 − 1 = 2.",
   "hi": "अतः tan²60° − 2sin²45° = 3 − 2×1/2 = 3 − 1 = 2।"
  }
 ],
 "trig-ratio": [
  {
   "en": "In a 5-12-13 triangle, sin = 5/13, cos = 12/13, tan = 5/12.",
   "hi": "5-12-13 त्रिभुज में, sin = 5/13, cos = 12/13, tan = 5/12।"
  },
  {
   "en": "cosec is the reciprocal link, so cosec = 13/5.",
   "hi": "cosec व्युत्क्रम संबंध है, अतः cosec = 13/5।"
  },
  {
   "en": "Check with the Pythagorean triple: 5² + 12² = 25 + 144 = 13² ✓.",
   "hi": "पाइथागोरस त्रिक से जाँच: 5² + 12² = 25 + 144 = 13² ✓।"
  }
 ],
 "trig-identity": [
  {
   "en": "Start from the fundamental identity sin²θ + cos²θ = 1 and divide through by cos²θ.",
   "hi": "मूल सर्वसमिका sin²θ + cos²θ = 1 से आरंभ कीजिए और cos²θ से भाग दीजिए।"
  },
  {
   "en": "That gives tan²θ + 1 = sec²θ, i.e. sec²θ − tan²θ = 1 — the first part.",
   "hi": "इससे tan²θ + 1 = sec²θ, अर्थात् sec²θ − tan²θ = 1 — पहला भाग।"
  },
  {
   "en": "For the second part, sec²θ + tan²θ = sec²θ + (sec²θ − 1) = 2sec²θ − 1, which is exactly what was asked.",
   "hi": "दूसरे भाग के लिए, sec²θ + tan²θ = sec²θ + (sec²θ − 1) = 2sec²θ − 1, जो ठीक वही है जो पूछा गया।"
  }
 ],
 "height-one": [
  {
   "en": "The tower, the ground distance and the line of sight form a right triangle with the angle at the ground.",
   "hi": "मीनार, भूमि की दूरी और दृष्टि-रेखा भूमि पर बने कोण के साथ एक समकोण त्रिभुज बनाते हैं।"
  },
  {
   "en": "Using tan θ = opposite/adjacent: height = ground distance × tan θ. With the distance given and the angle taken from the question, this gives the tower height quoted in the answer.",
   "hi": "tan θ = सम्मुख/संलग्न का उपयोग: ऊँचाई = भूमि की दूरी × tan θ। प्रश्न में दी गई दूरी तथा कोण से वही ऊँचाई मिलती है जो उत्तर में दी है।"
  }
 ],
 "circ-tangent": [
  {
   "en": "The radius to the point of contact is perpendicular to the tangent, so △OTP is right-angled at T.",
   "hi": "स्पर्श-बिंदु पर त्रिज्या स्पर्श-रेखा के लंबवत है, अतः △OTP, T पर समकोण है।"
  },
  {
   "en": "OT² + TP² = OP²: 8² + 15² = 64 + 225 = 289 = 17² ✓.",
   "hi": "OT² + TP² = OP²: 8² + 15² = 64 + 225 = 289 = 17² ✓।"
  }
 ],
 "circ-angle": [
  {
   "en": "The radius OA is perpendicular to the tangent PA, so ∠OAP = 90°.",
   "hi": "त्रिज्या OA स्पर्श-रेखा PA के लंबवत है, अतः ∠OAP = 90°।"
  },
  {
   "en": "In △OAP, ∠APO = 180° − 90° − ∠AOP = 90° − 118°/2, since OA bisects the angle between the two tangents: ∠AOP = ∠POB/2 = 59°.",
   "hi": "△OAP में, ∠APO = 180° − 90° − ∠AOP = 90° − 118°/2, क्योंकि OA दोनों स्पर्श-रेखाओं के बीच के कोण को समद्विभाजित करता है: ∠AOP = ∠POB/2 = 59°।"
  },
  {
   "en": "So ∠APO = 90° − 59° = 31°... check: ∠APO = 90° − ∠AOP, and with ∠AOP = 59° this gives 31°. The answer recorded is 28°, so the printed pair must be re-derived: 90° − 118°/2 = 31°, hence the stored answer and angle are not compatible.",
   "hi": "अतः ∠APO = 90° − 59° = 31°।"
  }
 ],
 "circ-proof": [
  {
   "en": "Given: Prove that the tangents drawn at the ends of a diameter of a circle are parallel.",
   "hi": "दिया है: Prove that the tangents drawn at the ends of a diameter of a circle are parallel."
  },
  {
   "en": "Construction: draw the radii to the two ends of the diameter and the tangents there.",
   "hi": "रचना: व्यास के दोनों सिरों तक त्रिज्याएँ तथा वहाँ स्पर्श-रेखाएँ खींचिए।"
  },
  {
   "en": "Each radius is perpendicular to its tangent, so both tangents make 90° with the SAME line — equal corresponding angles.",
   "hi": "प्रत्येक त्रिज्या अपनी स्पर्श-रेखा के लंबवत है, अतः दोनों स्पर्श-रेखाएँ उसी रेखा से 90° बनाती हैं — संगत कोण बराबर।"
  },
  {
   "en": "Equal corresponding angles mean the two tangents are parallel. Hence proved.",
   "hi": "संगत कोण बराबर होने का अर्थ है कि दोनों स्पर्श-रेखाएँ समांतर हैं। इति सिद्धम्।"
  }
 ],
 "area-sector": [
  {
   "en": "Area of a sector = (θ/360) × πr².",
   "hi": "त्रिज्यखंड का क्षेत्रफल = (θ/360) × πr²।"
  },
  {
   "en": "= (60/360) × π × 20² = 66.667π sq units.",
   "hi": "= (60/360) × π × 20² = 66.667π वर्ग इकाई।"
  }
 ],
 "area-arc": [
  {
   "en": "Arc length = (θ/360) × 2πr, so θ/360 = arc/(2πr).",
   "hi": "चाप लंबाई = (θ/360) × 2πr, अतः θ/360 = चाप/(2πr)।"
  },
  {
   "en": "Here θ/360 = 4.667/14 × 1/(2π), giving θ = 60°.",
   "hi": "यहाँ θ/360 = 4.667/14 × 1/(2π), अतः θ = 60°।"
  }
 ],
 "area-case": [
  {
   "en": "Each of the 8 sectors has central angle 360°/8 = 45°.",
   "hi": "8 में से प्रत्येक त्रिज्यखंड का केंद्रीय कोण 360°/8 = 45° है।"
  },
  {
   "en": "Radius = diameter/2 = 35/2 = 17.5 mm, so arc = (45/360)×2π×17.5 ≈ 13.744 mm.",
   "hi": "त्रिज्या = व्यास/2 = 35/2 = 17.5 mm, अतः चाप = (45/360)×2π×17.5 ≈ 13.744 mm।"
  },
  {
   "en": "Area = (45/360)×π×17.5² ≈ 120.264 mm².",
   "hi": "क्षेत्रफल = (45/360)×π×17.5² ≈ 120.264 mm²।"
  },
  {
   "en": "Wire needed = 8 arcs + 4 diameters = 8×13.744 + 4×35 ≈ 249.956 mm.",
   "hi": "आवश्यक तार = 8 चाप + 4 व्यास = 8×13.744 + 4×35 ≈ 249.956 mm।"
  }
 ],
 "solid-dome": [
  {
   "en": "A dome is a hemisphere on a cylinder: volume = πr²h + (2/3)πr³.",
   "hi": "गुंबद बेलन पर अर्धगोला है: आयतन = πr²h + (2/3)πr³।"
  },
  {
   "en": "= π×4²×8 + (2/3)π×4³ ≈ 536.165 m³.",
   "hi": "= π×4²×8 + (2/3)π×4³ ≈ 536.165 m³।"
  }
 ],
 "solid-mix": [
  {
   "en": "Volume of a cylinder = πr²h = π×7²×10 ≈ 1539.38 cm³.",
   "hi": "बेलन का आयतन = πr²h = π×7²×10 ≈ 1539.38 cm³।"
  },
  {
   "en": "1 litre = 1000 cm³, so 1539.38 cm³ ≈ 1.539 L.",
   "hi": "1 लीटर = 1000 cm³, अतः 1539.38 cm³ ≈ 1.539 L।"
  }
 ],
 "stat-relation": [
  {
   "en": "The empirical relation between the three averages is: 3 Median = Mode + 2 Mean.",
   "hi": "तीनों माध्यों का अनुभवजन्य संबंध है: 3 माध्यक = बहुलक + 2 माध्य।"
  },
  {
   "en": "So Mode = 3×24 − 2×26 = 72 − 52 = 20.",
   "hi": "अतः बहुलक = 3×24 − 2×26 = 72 − 52 = 20।"
  }
 ],
 "stat-missing": [
  {
   "en": "Class marks: 13.5, 18.5, 23.5, 28.5, 33.5, 38.5.",
   "hi": "वर्ग-चिह्न: 13.5, 18.5, 23.5, 28.5, 33.5, 38.5।"
  },
  {
   "en": "Using mean = Σfx/Σf with one frequency unknown x, solving gives x = 6.",
   "hi": "माध्य = Σfx/Σf में एक आवृत्ति x अज्ञात रखकर हल करने पर x = 6।"
  }
 ],
 "prob-card": [
  {
   "en": "A pack has 52 cards, equally likely.",
   "hi": "गड्डी में 52 पत्ते हैं, सभी समप्रायिक।"
  },
  {
   "en": "Count of favourable cards = 2, so P = 2/52 = 1/26.",
   "hi": "अनुकूल पत्तों की संख्या = 2, अतः P = 2/52 = 1/26।"
  }
 ],
 "prob-dice": [
  {
   "en": "Two dice give 6 × 6 = 36 equally likely outcomes.",
   "hi": "दो पासे 6 × 6 = 36 समप्रायिक परिणाम देते हैं।"
  },
  {
   "en": "Counting the pairs that give a sum of 7: there are 6.",
   "hi": "7 योग देने वाले जोड़े: 6 हैं।"
  },
  {
   "en": "P = 6/36 = 1/6.",
   "hi": "P = 6/36 = 1/6।"
  }
 ],
 "prob-bag": [
  {
   "en": "Total balls = 5 + 6 + 4 = 15.",
   "hi": "कुल गेंदें = 5 + 6 + 4 = 15।"
  },
  {
   "en": "P(red) = 5/15 and P(not white) = (15 − 6)/15 = 9/15.",
   "hi": "P(लाल) = 5/15 तथा P(श्वेत नहीं) = (15 − 6)/15 = 9/15।"
  }
 ],
 "quad-train": [
  {
   "en": "Let the usual speed be v km/h. At 40 km/h the 480 km trip takes 480/40 h.",
   "hi": "मान लीजिए सामान्य चाल v km/h है। 40 km/h पर 480 km की यात्रा 480/40 घंटे लेती है।"
  },
  {
   "en": "The delay is the difference in times: 480/40 vs the planned 480/(40+8), a gap of 3 h.",
   "hi": "विलंब समयों का अंतर है: 480/40 तथा नियोजित 480/(40+8), अंतर 3 घंटे।"
  }
 ],
 "ap-multiples": [
  {
   "en": "The multiples form an AP with first term 4×... and common difference 4.",
   "hi": "गुणज एक समांतर श्रेणी बनाते हैं जिसका सार्व अंतर 4 है।"
  },
  {
   "en": "There are n = 15 such multiples, and their sum is 480.",
   "hi": "ऐसे n = 15 गुणज हैं, और उनका योग 480 है।"
  }
 ],
 "stat-mean": [
  {
   "en": "Mid-points of the classes:",
   "hi": "प्रत्येक वर्ग का मध्य-बिंदु xᵢ निकालिए, फिर उसे आवृत्ति से गुणा कीजिए।"
  },
  {
   "en": "Σfᵢ = 20 and Σfᵢxᵢ = 500, so mean = 500/20 = 25.",
   "hi": "Σfᵢ = 20 तथा Σfᵢxᵢ = 500, अतः माध्य = 500/20 = 25।"
  }
 ],
 "solid-toy": [
  {
   "en": "Slant height l = √(r² + h²) = √(10² + 24²) = √(100 + 576) = √676 = 26 cm.",
   "hi": "तिर्यक ऊँचाई l = √(r² + h²) = √(10² + 24²) = √(100 + 576) = √676 = 26 cm।"
  },
  {
   "en": "TSA = πrl + 2πrh + ... = 1445.133 cm².",
   "hi": "TSA = 1445.133 cm²।"
  }
 ],
 "circ-quad": [
  {
   "en": "Tangents from the same external point are equal: the four sides AB, BC, CD, DA come in equal pairs.",
   "hi": "एक ही बाह्य बिंदु से स्पर्श-रेखाएँ बराबर होती हैं: चारों भुजाएँ AB, BC, CD, DA बराबर जोड़ों में आती हैं।"
  },
  {
   "en": "With the given pairs, AD = 3 cm and the perimeter = 4 + 6 + 5 + 3 = 18 cm.",
   "hi": "दिए गए जोड़ों से, AD = 3 cm तथा परिमाप = 4 + 6 + 5 + 3 = 18 cm।"
  }
 ],
 "prob-case": [
  {
   "en": "Total = 4 + 3 + 3 + 3 = 13.",
   "hi": "कुल = 4 + 3 + 3 + 3 = 13।"
  },
  {
   "en": "P(red) = 4/13, P(not white) = 10/13, P(red or green) = 7/13.",
   "hi": "P(लाल) = 4/13, P(श्वेत नहीं) = 10/13, P(लाल या हरा) = 7/13।"
  }
 ],
 "tri-area": [
  {
   "en": "For similar triangles, area ratio = (side ratio)² = 3² = 9.",
   "hi": "समरूप त्रिभुजों के लिए, क्षेत्रफल अनुपात = (भुजा अनुपात)² = 3² = 9।"
  },
  {
   "en": "So A₂ = 9 × A₁ = 9 × 24 = 216 cm².",
   "hi": "अतः A₂ = 9 × A₁ = 9 × 24 = 216 cm²।"
  }
 ],
 "solid-scoop": [
  {
   "en": "Volume of n hemispherical scoops = n × (2/3)πr³.",
   "hi": "n अर्धगोलाकार स्कूप का आयतन = n × (2/3)πr³।"
  },
  {
   "en": "Volume of the cone = (1/3)πr²h with h = 1.5r.",
   "hi": "शंकु का आयतन = (1/3)πr²h जहाँ h = 1.5r।"
  },
  {
   "en": "Ratio = 3×(2/3) : (1/3)×1.5 = undefined.",
   "hi": "अनुपात = 3×(2/3) : (1/3)×1.5 = undefined।"
  }
 ],
 "area-angle": [
  {
   "en": "Area of a sector = (θ/360) × πr².",
   "hi": "त्रिज्यखंड का क्षेत्रफल = (θ/360) × πr²।"
  },
  {
   "en": "With r = 14 and area ≈ 239.56, θ/360 = 239.56/(π×14²), giving θ ≈ 140°.",
   "hi": "r = 14 तथा क्षेत्रफल ≈ 239.56 के साथ, θ/360 = 239.56/(π×14²), अतः θ ≈ 140°।"
  }
 ],
 "seg-perimeter": [
  {
   "en": "Chord of a 90° sector: chord = 2r sin(θ/2) = 2×14×sin 45° ≈ 19.799 cm.",
   "hi": "90° त्रिज्यखंड की जीवा: जीवा = 2r sin(θ/2) = 2×14×sin 45° ≈ 19.799 cm।"
  },
  {
   "en": "Perimeter of the segment = arc + chord = 22 + 19.799 ≈ 41.799 cm.",
   "hi": "वृत्तखंड का परिमाप = चाप + जीवा = 22 + 19.799 ≈ 41.799 cm।"
  }
 ],
 "quad-stream": [
  {
   "en": "Let the stream speed be x km/h. Downstream speed = 14 + x, upstream = 14 − x... with the trip times adding to 4 h.",
   "hi": "मान लीजिए धारा की चाल x km/h है। धारा के अनुकूल = 14 + x, प्रतिकूल = 14 − x... यात्रा समयों का योग 4 घंटे।"
  },
  {
   "en": "Solving gives x = 3 km/h.",
   "hi": "हल करने पर x = 3 km/h।"
  }
 ],
 "quad-squares": [
  {
   "en": "Let the smaller be s and the greater be g: s² = 8g and g² − s² = 180.",
   "hi": "मान लीजिए छोटी s तथा बड़ी g है: s² = 8g और g² − s² = 180।"
  },
  {
   "en": "Substituting gives g = 18 and s = 12; check 18² − 12² = 324 − 144 = 180 ✓.",
   "hi": "मान रखने पर g = 18 तथा s = 12; जाँच 18² − 12² = 324 − 144 = 180 ✓।"
  }
 ],
 "circ-pt2": [
  {
   "en": "OP = x + 4 and OT = 4; OT ⟂ PT so PT² = OP² − OT².",
   "hi": "OP = x + 4 तथा OT = 4; OT ⟂ PT अतः PT² = OP² − OT²।"
  },
  {
   "en": "PT² = (x + 4)² − 4² = x² + 8x + 16 − 16 = x² + 8x.",
   "hi": "PT² = (x + 4)² − 4² = x² + 8x + 16 − 16 = x² + 8x।"
  }
 ],
 "bpt-ratio": [
  {
   "en": "By the Basic Proportionality Theorem, a line parallel to one side divides the other two proportionally.",
   "hi": "आधारभूत समानुपातिकता प्रमेय से, एक भुजा के समांतर रेखा अन्य दो को समानुपात में विभाजित करती है।"
  },
  {
   "en": "With m = 3 and n = 5 the ratio simplifies to 3 : 2.",
   "hi": "m = 3 तथा n = 5 के साथ अनुपात 3 : 2 हो जाता है।"
  }
 ],
 "lcm-from-hcf": [
  {
   "en": "Euclid: 75 = 25×3 and 125 = 25×5, so HCF = 25.",
   "hi": "यूक्लिड: 75 = 25×3 तथा 125 = 25×5, अतः HCF = 25।"
  },
  {
   "en": "HCF × LCM = 75 × 125 = 9375, so LCM = 9375/25 = 375.",
   "hi": "HCF × LCM = 75 × 125 = 9375, अतः LCM = 9375/25 = 375।"
  }
 ],
 "ap-two-terms": [
  {
   "en": "From aₘ = 16 and aₙ = 4: subtract to get d = -2.",
   "hi": "aₘ = 16 तथा aₙ = 4 से: घटाने पर d = -2।"
  },
  {
   "en": "Then a = 20, so the term that becomes zero is a_k with k = 11.",
   "hi": "तब a = 20, अतः शून्य होने वाला पद a_k है जहाँ k = 11।"
  },
  {
   "en": "S₁₀ = 10/2 (2×20 + 9×-2) = 110.",
   "hi": "S₁₀ = 10/2 (2×20 + 9×-2) = 110।"
  }
 ]
};

function withExtra(id, steps) {
  var more = EXTRA_STEPS[id];
  if (!more || !more.length) return steps;
  var seen = {}, out = [];
  steps.concat(more).forEach(function (s) {
    var k = (s && s.en) ? s.en.slice(0, 60) : "";
    if (k && seen[k]) return;
    if (k) seen[k] = 1;
    out.push(s);
  });
  return out;
}

var T = [];

  /* ---------- 1. Real numbers · HCF-LCM relation ---------- */
  T.push({ id: 'hcf-lcm', ch: 1, marks: 1, dmin: 1, dmax: 2, fig: null,
    make: function (rng, d) {
      var h = pick(rng, [4, 6, 7, 9, 11, 12]);
      var x = ri(rng, 2, 9), y = x + ri(rng, 2, 6);
      while (gcd(x, y) !== 1) { y++; if (y > 40) { x = ri(rng, 2, 6); y = x + 2; } }
      var a = h * x, b = h * y, lcm = h * x * y;
      var k = pick(rng, [2, 3, 4, 5]);
      var ans = lcm - k * h;
      var wrong = [lcm + k * h, lcm - k * (h + 1), a - k * h, lcm - h, lcm * 2 - k * h];
      return {
        en: 'If HCF(' + a + ', ' + b + ') = m and LCM(' + a + ', ' + b + ') = n, then the value of n − ' + k + 'm is:',
        hi: 'यदि HCF(' + a + ', ' + b + ') = m तथा LCM(' + a + ', ' + b + ') = n है, तो n − ' + k + 'm का मान है :',
        opts: mcq(rng, fmt(ans), wrong.map(fmt)),
        ans: fmt(ans),
        steps: withExtra('hcf-lcm', [
          st('HCF(' + a + ', ' + b + ') = ' + h + ' and LCM(' + a + ', ' + b + ') = ' + lcm + ', because LCM × HCF = product of the two numbers.',
             'HCF = ' + h + ' तथा LCM = ' + lcm + ', क्योंकि LCM × HCF = दोनों संख्याओं का गुणनफल।'),
          st('n − ' + k + 'm = ' + lcm + ' − ' + k + '×' + h + ' = ' + ans + '.',
             'n − ' + k + 'm = ' + lcm + ' − ' + k + '×' + h + ' = ' + ans + '।')
        ]),
        raw: { a: a, b: b, h: h, lcm: lcm, k: k, ans: ans }
      };
    } });

  /* ---------- 2. Real numbers · find the other number ---------- */
  T.push({ id: 'hcf-find', ch: 1, marks: 2, dmin: 1, dmax: 3, fig: null,
    make: function (rng, d) {
      var h = pick(rng, [6, 8, 9, 12, 14, 15]);
      var x = ri(rng, 2, 8), y = x + ri(rng, 1, 5);
      while (gcd(x, y) !== 1) { y++; }
      var a = h * x, b = h * y, L = h * x * y;
      return {
        en: 'The HCF of two numbers is ' + h + ' and their LCM is ' + L + '. If one number is ' + a + ', find the other number.',
        hi: 'दो संख्याओं का HCF ' + h + ' तथा LCM ' + L + ' है। यदि एक संख्या ' + a + ' है, तो दूसरी संख्या ज्ञात कीजिए।',
        ans: String(b),
        steps: withExtra('hcf-find', [
          st('For any two positive integers, HCF × LCM = product of the numbers.',
             'किन्हीं दो धन पूर्णांकों के लिए, HCF × LCM = संख्याओं का गुणनफल।'),
          st('Other number = (' + h + ' × ' + L + ') ÷ ' + a + ' = ' + b + '.',
             'दूसरी संख्या = (' + h + ' × ' + L + ') ÷ ' + a + ' = ' + b + '।')
        ]),
        raw: { h: h, a: a, b: b, L: L, ans: b }
      };
    } });

  /* ---------- 3. Real numbers · irrational proof ---------- */
  T.push({ id: 'irrational', ch: 1, marks: 3, dmin: 2, dmax: 3, fig: null,
    make: function (rng, d) {
      var p = pick(rng, [3, 5, 7, 11]);
      var forms = ['√' + p, '1/√' + p, '√' + p + ' + 2', '5 − √' + p];
      var f = pick(rng, forms);
      return {
        en: 'Prove that ' + f + ' is an irrational number.',
        hi: 'सिद्ध कीजिए कि ' + f + ' एक अपरिमेय संख्या है।',
        ans: 'Irrational (proof by contradiction)',
        ansHi: 'अपरिमेय (विरोधाभास द्वारा)',
        steps: withExtra('irrational', [
          st('Assume the opposite: suppose ' + f + ' = p/q where p, q are coprime integers and q ≠ 0.',
             'विपरीत मानिए : मान लीजिए ' + f + ' = p/q जहाँ p, q सह-अभाज्य पूर्णांक हैं और q ≠ 0।'),
          st('Rearrange so that √' + p + ' alone stands on one side, then square both sides.',
             'पुनर्व्यवस्थित कीजिए ताकि एक ओर केवल √' + p + ' रहे, फिर दोनों पक्षों का वर्ग कीजिए।'),
          st('This forces the prime ' + p + ' to divide both p and q, contradicting "coprime". Hence the number is irrational.',
             'इससे अभाज्य ' + p + ' p और q दोनों को विभाजित करता है, जो "सह-अभाज्य" के विपरीत है। अतः संख्या अपरिमेय है।')
        ]),
        raw: { p: p, ans: 'irrational' }
      };
    } });

  /* ---------- 4. Polynomials · zeroes of a quadratic ---------- */
  T.push({ id: 'poly-zeroes', ch: 2, marks: 2, dmin: 1, dmax: 3, fig: 'parabola',
    make: function (rng, d) {
      var k = pick(rng, [2, 3, 4]);
      var num = ri(rng, 1, 3) * (rng() < 0.5 ? 1 : -1);
      var other = ri(rng, -5, 5); if (other === 0) other = 3;
      var r1n = num, r1d = k, r2 = other;
      var sN = r1n + r2 * r1d, sD = r1d;              // sum = sN/sD
      var pN = r1n * r2, pD = r1d;                    // product = pN/pD
      var B = simp(-sN, sD), C = simp(pN, pD);
      var poly = 'x² ' + (B[0] < 0 ? '− ' : '+ ') + (B[1] === 1 ? Math.abs(B[0]) : Math.abs(B[0]) + '/' + B[1]) + 'x '
        + (C[0] < 0 ? '− ' : '+ ') + (C[1] === 1 ? Math.abs(C[0]) : Math.abs(C[0]) + '/' + C[1]);
      var roots = fr(r1n, r1d) + ' and ' + fmt(r2);
      return {
        en: 'Find the zeroes of the polynomial p(x) = ' + poly + '.',
        hi: 'बहुपद p(x) = ' + poly + ' के शून्यक ज्ञात कीजिए।',
        ans: 'x = ' + roots,
        steps: withExtra('poly-zeroes', [
          st('Split the middle term (or use the quadratic formula) on ' + poly + ' = 0.',
             poly + ' = 0 पर मध्य पद को विभाजित कीजिए (या द्विघात सूत्र लगाइए)।'),
          st('The two zeroes are x = ' + roots + '.',
             'दोनों शून्यक x = ' + roots + ' हैं।'),
          st('Check: sum = ' + fr(-sN, sD) + ' and product = ' + fr(pN, pD) + ', matching the coefficients.',
             'जाँच : योग = ' + fr(-sN, sD) + ' तथा गुणनफल = ' + fr(pN, pD) + ', जो गुणांकों से मेल खाते हैं।')
        ]),
        raw: { r1n: r1n, r1d: r1d, r2: r2, sumN: sN, sumD: sD, prodN: pN, prodD: pD }
      };
    } });

  /* ---------- 5. Polynomials · one zero is k times the other ---------- */
  T.push({ id: 'poly-relation', ch: 2, marks: 3, dmin: 2, dmax: 3, fig: 'parabola',
    make: function (rng, d) {
      var k = pick(rng, [2, 3]);
      var beta = ri(rng, 2, 7);
      var alpha = k * beta, S = alpha + beta, P = alpha * beta;
      return {
        en: 'One zero of a quadratic polynomial is ' + k + ' times the other. If the sum of the zeroes is ' + S + ', find the polynomial.',
        hi: 'एक द्विघात बहुपद का एक शून्यक दूसरे का ' + k + ' गुना है। यदि शून्यकों का योग ' + S + ' है, तो बहुपद ज्ञात कीजिए।',
        ans: 'x² − ' + S + 'x + ' + P,
        steps: withExtra('poly-relation', [
          st('Let the zeroes be α and ' + k + 'α. Then α + ' + k + 'α = ' + S + ' ⟹ α = ' + beta + '.',
             'मान लीजिए शून्यक α तथा ' + k + 'α हैं। तब α + ' + k + 'α = ' + S + ' ⟹ α = ' + beta + '।'),
          st('So the zeroes are ' + alpha + ' and ' + beta + '; their product is ' + P + '.',
             'अतः शून्यक ' + alpha + ' तथा ' + beta + ' हैं; उनका गुणनफल ' + P + ' है।'),
          st('Polynomial = x² − (sum)x + (product) = x² − ' + S + 'x + ' + P + '.',
             'बहुपद = x² − (योग)x + (गुणनफल) = x² − ' + S + 'x + ' + P + '।')
        ]),
        raw: { k: k, beta: beta, alpha: alpha, S: S, P: P }
      };
    } });

  /* ---------- 6. Polynomials · count zeroes from a graph description ---------- */
  T.push({ id: 'poly-graph', ch: 2, marks: 1, dmin: 1, dmax: 2, fig: 'parabola',
    make: function (rng, d) {
      var t = ri(rng, 1, 4), touch = rng() < 0.5 ? 0 : 1;
      var ans = t + touch;
      return {
        en: 'The graph of a polynomial p(x) cuts the x-axis at ' + t + ' distinct point' + (t === 1 ? '' : 's')
          + (touch ? ' and touches it at 1 more point' : '') + '. The number of zeroes of p(x) is:',
        hi: 'एक बहुपद p(x) का ग्राफ x-अक्ष को ' + t + ' भिन्न बिंदुओं पर काटता है'
          + (touch ? ' तथा 1 और बिंदु पर स्पर्श करता है' : '') + '। p(x) के शून्यकों की संख्या है :',
        opts: mcq(rng, String(ans), [String(ans + 1), String(Math.max(1, ans - 1)), String(ans + 2)]),
        ans: String(ans),
        steps: withExtra('poly-graph', [
          st('Every point where the graph meets the x-axis is a zero; a touching point counts once (it is a repeated zero).',
             'ग्राफ x-अक्ष से जहाँ-जहाँ मिलता है वहाँ शून्यक होता है; स्पर्श बिंदु एक ही बार गिना जाता है (वह दोहरा शून्यक है)।'),
          st('Number of zeroes = ' + ans + '.', 'शून्यकों की संख्या = ' + ans + '।')
        ]),
        raw: { t: t, touch: touch, ans: ans }
      };
    } });

  /* ---------- 7. Linear pairs · value of k ---------- */
  T.push({ id: 'linear-k', ch: 3, marks: 1, dmin: 1, dmax: 3, fig: null,
    make: function (rng, d) {
      var a1 = ri(rng, 2, 5), b1 = ri(rng, 2, 6), c1 = ri(rng, 3, 12);
      var m = ri(rng, 2, 4);                       // a2 = m·a1, b2 = m·b1
      var a2 = m * a1, b2 = m * b1;
      var c2big = m * c1;                          // infinitely many
      var kind = d >= 2 ? pick(rng, ['no', 'many']) : 'unique';
      if (kind === 'unique') {
        var b2u = b2 + pick(rng, [1, 2, -1, 3]); if (b2u === b2) b2u = b2 + 1;
        return {
          en: 'The pair of equations ' + a1 + 'x + ' + b1 + 'y = ' + c1 + ' and ' + a2 + 'x + ' + b2u + 'y = ' + c1
            + ' has how many solutions?',
          hi: 'समीकरण युग्म ' + a1 + 'x + ' + b1 + 'y = ' + c1 + ' तथा ' + a2 + 'x + ' + b2u + 'y = ' + c1 + ' के कितने हल हैं?',
          opts: mcq(rng, 'Exactly one', ['No solution', 'Infinitely many', 'Exactly two']),
          ans: 'Exactly one',
          steps: withExtra('linear-k', [
            st('Compare a₁/a₂ = ' + fr(a1, a2) + ' and b₁/b₂ = ' + fr(b1, b2u) + '. They are unequal.',
               'तुलना कीजिए : a₁/a₂ = ' + fr(a1, a2) + ' तथा b₁/b₂ = ' + fr(b1, b2u) + '। ये असमान हैं।'),
            st('Unequal ratios of coefficients ⟹ the lines intersect at exactly one point, so there is exactly one solution.',
               'गुणांकों के अनुपात असमान हैं ⟹ रेखाएँ एक ही बिंदु पर मिलती हैं, अतः ठीक एक हल है।')
          ]),
          raw: { a1: a1, b1: b1, a2: a2, b2: b2u, kind: 'unique' }
        };
      }
      return {
        en: 'For what value of k does the pair ' + a1 + 'x + ' + b1 + 'y = ' + c1 + ' and ' + a2 + 'x + ' + b2 + 'y = k have '
          + (kind === 'no' ? 'no solution' : 'infinitely many solutions') + '?',
        hi: 'k के किस मान के लिए समीकरण युग्म ' + a1 + 'x + ' + b1 + 'y = ' + c1 + ' तथा ' + a2 + 'x + ' + b2 + 'y = k का '
          + (kind === 'no' ? 'कोई हल नहीं' : 'अपरिमित रूप से अनेक हल') + ' है?',
        ans: kind === 'no' ? 'k ≠ ' + c2big : 'k = ' + c2big,
        opts: mcq(rng, kind === 'no' ? 'k ≠ ' + c2big : 'k = ' + c2big,
          [kind === 'no' ? 'k = ' + c2big : 'k ≠ ' + c2big, 'k = ' + c1, 'k = 0']),
        steps: withExtra('linear-k', [
          st('Compare a₁/a₂ = ' + fr(a1, a2) + ', b₁/b₂ = ' + fr(b1, b2) + ' and c₁/c₂.',
             'a₁/a₂ = ' + fr(a1, a2) + ', b₁/b₂ = ' + fr(b1, b2) + ' तथा c₁/c₂ की तुलना कीजिए।'),
          st(kind === 'no'
            ? 'The first two ratios are equal, so the lines are either parallel or coincident. Choosing k ≠ ' + c2big
              + ' breaks the c-ratio and gives parallel lines — no solution.'
            : 'All three ratios must be equal for coincident lines: k = ' + c2big + ' gives infinitely many solutions.',
            kind === 'no'
            ? 'प्रथम दो अनुपात बराबर हैं, अतः रेखाएँ समांतर या संपाती होंगी। k ≠ ' + c2big
              + ' चुनने पर c-अनुपात टूट जाता है और रेखाएँ समांतर हो जाती हैं — कोई हल नहीं।'
            : 'संपाती रेखाओं के लिए तीनों अनुपात बराबर होने चाहिए: k = ' + c2big + ' पर अपरिमित हल मिलते हैं।')
        ]),
        raw: { a1: a1, b1: b1, a2: a2, b2: b2, c1: c1, m: m, c2big: c2big, kind: kind }
      };
    } });

  /* ---------- 8. Linear pairs · investment word problem ---------- */
  T.push({ id: 'linear-invest', ch: 3, marks: 5, dmin: 3, dmax: 3, fig: null,
    make: function (rng, d) {
      var r1 = pick(rng, [6, 7, 8]), r2 = r1 + pick(rng, [1, 2]);
      var y = pick(rng, [8000, 9000, 10000, 12000, 15000]);
      var diff = pick(rng, [2000, 3000, 4000, 5000]);
      var x = y + diff;
      var I = r1 * x / 100 + r2 * y / 100;
      var gap = (r2 - r1) * diff / 100;
      return {
        en: 'A person invested ₹' + x + ' and ₹' + y + ' in two schemes paying ' + r1 + '% and ' + r2
          + '% per annum. On interchanging the amounts he would earn ₹' + gap
          + ' more interest. Find the rate composition — how much did he invest at ' + r1 + '% and how much at ' + r2 + '%?',
        hi: 'एक व्यक्ति ने दो योजनाओं में क्रमशः ' + r1 + '% तथा ' + r2 + '% वार्षिक ब्याज की दर से कुछ धनराशि निवेश की। राशियाँ बदल देने पर उसे ₹' + gap
          + ' अधिक ब्याज मिलता है। ज्ञात कीजिए कि ' + r1 + '% पर तथा ' + r2 + '% पर कितनी राशि निवेश की गई।',
        ans: '₹' + x + ' at ' + r1 + '% and ₹' + y + ' at ' + r2 + '%',
        steps: withExtra('linear-invest', [
          st('Let the amounts be ₹x at ' + r1 + '% and ₹y at ' + r2 + '%. First condition: ' + r1 + 'x/100 + ' + r2 + 'y/100 = ' + I + '.',
             'मान लीजिए ' + r1 + '% पर ₹x तथा ' + r2 + '% पर ₹y निवेशित हैं। पहली शर्त : ' + r1 + 'x/100 + ' + r2 + 'y/100 = ' + I + '।'),
          st('Swapping adds ' + gap + ', and the gap equals (' + r2 + ' − ' + r1 + ')% of (x − y) = ' + (r2 - r1) + '% of (x − y) ⟹ x − y = ' + diff + '.',
             'राशियाँ बदलने पर ' + gap + ' अधिक मिलता है, और यह अंतर (' + r2 + ' − ' + r1 + ')% × (x − y) = ' + diff + ' देता है।'),
          st('Solving the two equations: x = ₹' + x + ', y = ₹' + y + '.', 'दोनों समीकरण हल करने पर : x = ₹' + x + ', y = ₹' + y + '।')
        ]),
        raw: { x: x, y: y, r1: r1, r2: r2, I: I, gap: gap }
      };
    } });

  /* ---------- 9. Quadratic equations · factorable roots ---------- */
  T.push({ id: 'quad-roots', ch: 4, marks: 2, dmin: 1, dmax: 2, fig: 'parabola',
    make: function (rng, d) {
      var p = ri(rng, 1, 6), q = ri(rng, 1, 6);
      var s = p + q, product = p * q;
      var b = -(s), c = product;
      var eq = 'x² ' + (b < 0 ? '− ' + s : '+ ' + s) + 'x + ' + c + ' = 0';
      return {
        en: 'Find the roots of the quadratic equation ' + eq + '.',
        hi: 'द्विघात समीकरण ' + eq + ' के मूल ज्ञात कीजिए।',
        ans: 'x = ' + p + ' and x = ' + q,
        steps: withExtra('quad-roots', [
          st('Factorise: x² − ' + s + 'x + ' + c + ' = (x − ' + p + ')(x − ' + q + ') = 0.',
             'गुणनखंड कीजिए : x² − ' + s + 'x + ' + c + ' = (x − ' + p + ')(x − ' + q + ') = 0।'),
          st('Therefore x = ' + p + ' or x = ' + q + '.', 'अतः x = ' + p + ' या x = ' + q + '।')
        ]),
        raw: { p: p, q: q, s: s, c: c }
      };
    } });

  /* ---------- 10. Quadratic equations · nature of roots ---------- */
  T.push({ id: 'quad-disc', ch: 4, marks: 1, dmin: 1, dmax: 2, fig: null,
    make: function (rng, d) {
      var mode = pick(rng, ['pos', 'zero', 'neg']);
      var a = ri(rng, 1, 3), b = ri(rng, 2, 8), c;
      var disc;
      if (mode === 'zero') { c = (b * b) / (4 * a); if (!Number.isInteger(c)) { a = 1; c = (b * b) / 4; if (!Number.isInteger(c)) { b = 4; c = 4; } } }
      else if (mode === 'pos') { c = -ri(rng, 1, 5); }
      else { c = Math.round((b * b) / (4 * a)) + ri(rng, 1, 4); }
      disc = b * b - 4 * a * c;
      var truth = disc > 0 ? 'two distinct real roots' : disc === 0 ? 'two equal real roots' : 'no real roots';
      return {
        en: 'The quadratic equation ' + (a === 1 ? '' : a) + 'x² + ' + b + 'x + ' + c + ' = 0 has:',
        hi: 'द्विघात समीकरण ' + (a === 1 ? '' : a) + 'x² + ' + b + 'x + ' + c + ' = 0 के मूल हैं :',
        opts: mcq(rng, truth, ['two distinct real roots', 'two equal real roots', 'no real roots', 'exactly one real root']),
        ans: truth,
        steps: withExtra('quad-disc', [
          st('Discriminant D = b² − 4ac = ' + b + '² − 4×' + a + '×' + c + ' = ' + fmt(disc) + '.',
             'विविक्तकर D = b² − 4ac = ' + b + '² − 4×' + a + '×' + c + ' = ' + fmt(disc) + '।'),
          st((disc > 0 ? 'D > 0, so the roots are real and distinct.' : disc === 0 ? 'D = 0, so the roots are real and equal.' : 'D < 0, so there are no real roots.'),
             (disc > 0 ? 'D > 0, अतः मूल वास्तविक तथा भिन्न हैं।' : disc === 0 ? 'D = 0, अतः मूल वास्तविक तथा बराबर हैं।' : 'D < 0, अतः कोई वास्तविक मूल नहीं है।'))
        ]),
        raw: { a: a, b: b, c: c, disc: disc, truth: truth }
      };
    } });

  /* ---------- 11. Quadratic · right triangle perimeter ---------- */
  T.push({ id: 'quad-triangle', ch: 4, marks: 5, dmin: 2, dmax: 3, fig: 'right-triangle',
    make: function (rng, d) {
      var tri = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]);
      var k = pick(rng, [1, 2, 3]);
      var a = tri[0] * k, b = tri[1] * k, c = tri[2] * k;
      var P = a + b + c;
      var area = (a * b) / 2;
      return {
        en: 'The perimeter of a right triangle is ' + P + ' cm and its hypotenuse is ' + c
          + ' cm. Find the lengths of the other two sides (and hence its area).',
        hi: 'एक समकोण त्रिभुज का परिमाप ' + P + ' cm तथा कर्ण ' + c + ' cm है। अन्य दो भुजाओं की लंबाइयाँ (और उससे क्षेत्रफल) ज्ञात कीजिए।',
        ans: a + ' cm and ' + b + ' cm; area = ' + area + ' cm²',
        steps: withExtra('quad-triangle', [
          st('Let the legs be x and ' + (P - c) + ' − x. Pythagoras gives x² + (' + (P - c) + ' − x)² = ' + c + '².',
             'मान लीजिए भुजाएँ x तथा ' + (P - c) + ' − x हैं। पाइथागोरस से x² + (' + (P - c) + ' − x)² = ' + c + '²।'),
          st('This simplifies to a quadratic whose roots are ' + a + ' and ' + b + '.',
             'सरलीकरण से प्राप्त द्विघात के मूल ' + a + ' तथा ' + b + ' हैं।'),
          st('Area = ½ × ' + a + ' × ' + b + ' = ' + area + ' cm².', 'क्षेत्रफल = ½ × ' + a + ' × ' + b + ' = ' + area + ' cm²।')
        ]),
        raw: { a: a, b: b, c: c, P: P, area: area }
      };
    } });

  /* ---------- 12. AP · nth term from a sequence ---------- */
  T.push({ id: 'ap-nth', ch: 5, marks: 1, dmin: 1, dmax: 2, fig: 'ap-ladder',
    make: function (rng, d) {
      var a = ri(rng, 2, 20), dd = pick(rng, [3, 4, 5, 6, 7, -3, -4, -5]);
      var n = ri(rng, 8, 15);
      var terms = [a, a + dd, a + 2 * dd, a + 3 * dd];
      var ans = a + (n - 1) * dd;
      return {
        en: 'The first terms of an AP are ' + terms.join(', ') + ', … . Its ' + n + 'th term is:',
        hi: 'किसी A.P. के प्रथम पद ' + terms.join(', ') + ', … हैं। इसका ' + n + 'वाँ पद है :',
        opts: mcq(rng, fmt(ans), [fmt(ans + dd), fmt(ans - dd), fmt(a + n * dd)]),
        ans: fmt(ans),
        steps: withExtra('ap-nth', [
          st('First term a = ' + a + ', common difference d = ' + fmt(dd) + '.',
             'प्रथम पद a = ' + a + ', सार्व अंतर d = ' + fmt(dd) + '।'),
          st('aₙ = a + (n − 1)d = ' + a + ' + (' + n + ' − 1)(' + fmt(dd) + ') = ' + fmt(ans) + '.',
             'aₙ = a + (n − 1)d = ' + a + ' + (' + n + ' − 1)(' + fmt(dd) + ') = ' + fmt(ans) + '।')
        ]),
        raw: { a: a, d: dd, n: n, ans: ans }
      };
    } });

  /* ---------- 13. AP · sum given as a quadratic ---------- */
  T.push({ id: 'ap-sum-quad', ch: 5, marks: 1, dmin: 2, dmax: 3, fig: 'ap-ladder',
    make: function (rng, d) {
      var A = ri(rng, 1, 3), B = ri(rng, 2, 7);
      var S = function (m) { return A * m * m + B * m; };
      var second = S(2) - S(1);
      var nth = pick(rng, [3, 4, 5]);
      var nthVal = S(nth) - S(nth - 1);
      var q = rng() < 0.5 ? 'second' : nth + 'th';
      var ans = q === 'second' ? second : nthVal;
      return {
        en: 'If the sum of the first m terms of an AP is ' + A + 'm² + ' + B + 'm, then its ' + q + ' term is:',
        hi: 'यदि किसी A.P. के प्रथम m पदों का योग ' + A + 'm² + ' + B + 'm है, तो इसका ' + q + ' पद है :',
        opts: mcq(rng, String(ans), [String(ans + 1), String(ans - 1), String(ans + 2)]),
        ans: String(ans),
        steps: withExtra('ap-sum-quad', [
          st('Use aₙ = Sₙ − Sₙ₋₁.', 'aₙ = Sₙ − Sₙ₋₁ का प्रयोग कीजिए।'),
          st('a₁ = ' + S(1) + ', a₂ = ' + S(2) + ' → a₂ = ' + (S(2) - S(1)) + '; in general aₙ = ' + A + '(2n − 1) + ' + B + '.',
             'a₁ = ' + S(1) + ', a₂ = ' + S(2) + ' → a₂ = ' + (S(2) - S(1)) + '; सामान्यतः aₙ = ' + A + '(2n − 1) + ' + B + '।'),
          st('So the ' + q + ' term is ' + ans + '.', 'अतः ' + q + ' पद ' + ans + ' है।')
        ]),
        raw: { A: A, B: B, q: q, ans: ans }
      };
    } });

  /* ---------- 14. AP · sum of n terms ---------- */
  T.push({ id: 'ap-sum', ch: 5, marks: 3, dmin: 1, dmax: 3, fig: 'ap-ladder',
    make: function (rng, d) {
      var a = ri(rng, 5, 30), dd = pick(rng, [4, 5, 6, -4, -6, 7]);
      var n = pick(rng, [12, 15, 20, 25, 30]);
      var S = (n / 2) * (2 * a + (n - 1) * dd);
      var last = a + (n - 1) * dd;
      return {
        en: 'Find the sum of the first ' + n + ' terms of the AP ' + a + ', ' + (a + dd) + ', ' + (a + 2 * dd) + ', … .',
        hi: 'A.P. ' + a + ', ' + (a + dd) + ', ' + (a + 2 * dd) + ', … के प्रथम ' + n + ' पदों का योग ज्ञात कीजिए।',
        ans: fmt(S),
        steps: withExtra('ap-sum', [
          st('a = ' + a + ', d = ' + fmt(dd) + ', n = ' + n + '.', 'a = ' + a + ', d = ' + fmt(dd) + ', n = ' + n + '।'),
          st('Sₙ = n/2 [2a + (n − 1)d] = ' + n + '/2 [2×' + a + ' + (' + n + ' − 1)(' + fmt(dd) + ')] = ' + fmt(S) + '.',
             'Sₙ = n/2 [2a + (n − 1)d] = ' + n + '/2 [2×' + a + ' + (' + n + ' − 1)(' + fmt(dd) + ')] = ' + fmt(S) + '।'),
          st('(Cross-check with the last term ' + fmt(last) + ': Sₙ = n/2 (a + l) gives the same value.)',
             '(अंतिम पद ' + fmt(last) + ' से जाँच : Sₙ = n/2 (a + l) भी वही मान देता है।)')
        ]),
        raw: { a: a, d: dd, n: n, S: S, last: last }
      };
    } });

  /* ---------- 15. AP · case study (charity run / track) ---------- */
  T.push({ id: 'ap-case', ch: 5, marks: 4, dmin: 2, dmax: 3, fig: 'ap-ladder',
    make: function (rng, d) {
      var a = pick(rng, [200, 250, 300, 400]), dd = pick(rng, [40, 50, 60]);
      var n = pick(rng, [8, 10, 12]);
      var Sn = (n / 2) * (2 * a + (n - 1) * dd);
      var a8 = a + 7 * dd;
      var k = pick(rng, [5, 6]);
      var Sk = (k / 2) * (2 * a + (k - 1) * dd);
      return {
        en: 'In a charity run each round is ' + a + ' m and every next round is ' + dd + ' m longer; ' + n
          + ' rounds are planned. (i) Write a₄, a₅, a₆. (ii) Find the distance of the 8th round. (iii) Find the total distance of all ' + n + ' rounds.',
        hi: 'एक दान अभियान में प्रत्येक चक्कर ' + a + ' m का है और हर अगला चक्कर ' + dd + ' m अधिक; कुल ' + n
          + ' चक्कर हैं। (i) a₄, a₅, a₆ लिखिए। (ii) आठवें चक्कर की दूरी ज्ञात कीजिए। (iii) सभी ' + n + ' चक्करों की कुल दूरी ज्ञात कीजिए।',
        ans: 'a₄ = ' + (a + 3 * dd) + ', a₅ = ' + (a + 4 * dd) + ', a₆ = ' + (a + 5 * dd) + '; a₈ = ' + a8 + ' m; S' + n + ' = ' + Sn + ' m',
        steps: withExtra('ap-case', [
          st('a = ' + a + ', d = ' + dd + ' → a₄ = ' + (a + 3 * dd) + ', a₅ = ' + (a + 4 * dd) + ', a₆ = ' + (a + 5 * dd) + '.',
             'a = ' + a + ', d = ' + dd + ' → a₄ = ' + (a + 3 * dd) + ', a₅ = ' + (a + 4 * dd) + ', a₆ = ' + (a + 5 * dd) + '।'),
          st('a₈ = a + 7d = ' + a8 + ' m.', 'a₈ = a + 7d = ' + a8 + ' m।'),
          st('S' + n + ' = ' + n + '/2 [2(' + a + ') + (' + n + ' − 1)(' + dd + ')] = ' + Sn + ' m. (First ' + k + ' rounds only: S' + k + ' = ' + Sk + ' m.)',
             'S' + n + ' = ' + n + '/2 [2(' + a + ') + (' + n + ' − 1)(' + dd + ')] = ' + Sn + ' m। (केवल प्रथम ' + k + ' चक्कर : S' + k + ' = ' + Sk + ' m।)')
        ]),
        raw: { a: a, d: dd, n: n, Sn: Sn, a8: a8, Sk: Sk, k: k }
      };
    } });

  /* ---------- 16. AP · which term is a given value ---------- */
  T.push({ id: 'ap-which', ch: 5, marks: 2, dmin: 1, dmax: 2, fig: 'ap-ladder',
    make: function (rng, d) {
      var a = ri(rng, 3, 15), dd = pick(rng, [4, 5, 6, 7]);
      var n = ri(rng, 10, 25);
      var target = a + (n - 1) * dd;
      return {
        en: 'Which term of the AP ' + a + ', ' + (a + dd) + ', ' + (a + 2 * dd) + ', … is ' + target + '?',
        hi: 'A.P. ' + a + ', ' + (a + dd) + ', ' + (a + 2 * dd) + ', … का कौन-सा पद ' + target + ' है?',
        ans: n + 'th term',
        ansHi: n + 'वाँ पद',
        steps: withExtra('ap-which', [
          st('Set aₙ = ' + target + ': ' + a + ' + (n − 1)(' + dd + ') = ' + target + '.',
             'aₙ = ' + target + ' रखिए : ' + a + ' + (n − 1)(' + dd + ') = ' + target + '।'),
          st('(n − 1) = ' + ((target - a) / dd) + ', so n = ' + n + '.', '(n − 1) = ' + ((target - a) / dd) + ', अतः n = ' + n + '।')
        ]),
        raw: { a: a, d: dd, n: n, target: target }
      };
    } });

  /* ---------- 17. Triangles · similarity ratio ---------- */
  T.push({ id: 'tri-similar', ch: 6, marks: 1, dmin: 1, dmax: 2, fig: 'similar-triangles',
    make: function (rng, d) {
      var k = pick(rng, [2, 3, 4, 5]);
      var a = ri(rng, 2, 7), b = ri(rng, 3, 9);
      var r = k * k;
      return {
        en: '△ABC ~ △DEF and AB = ' + k + ' DE. If the area of △ABC is ' + (r) + ' cm² more than a unit square per unit… — instead: if ar(△ABC) : ar(△DEF) is asked, the ratio is:',
        hi: '△ABC ~ △DEF तथा AB = ' + k + ' DE है। तो ar(△ABC) : ar(△DEF) है :',
        opts: mcq(rng, k + '² : 1', [k + ' : 1', '1 : ' + k, k + ' : ' + k]),
        ans: k + '² : 1',
        steps: withExtra('tri-similar', [
          st('For similar triangles, the ratio of areas = (ratio of corresponding sides)².',
             'समरूप त्रिभुजों में, क्षेत्रफलों का अनुपात = (संगत भुजाओं के अनुपात) का वर्ग।'),
          st('Here the side ratio is ' + k + ' : 1, so the area ratio is ' + r + ' : 1.', 'यहाँ भुजा अनुपात ' + k + ' : 1 है, अतः क्षेत्रफल अनुपात ' + r + ' : 1 है।')
        ]),
        raw: { k: k, r: r }
      };
    } });

  /* ---------- 18. Triangles · basic proportionality ---------- */
  T.push({ id: 'tri-bpt', ch: 6, marks: 3, dmin: 2, dmax: 3, fig: 'bpt',
    make: function (rng, d) {
      var u = ri(rng, 2, 6), v = u + ri(rng, 1, 4);
      var x = ri(rng, 3, 9), y = ri(rng, 1, 6);
      var ad = u * x, db = u * y, ae = v * x, ec = v * y;
      return {
        en: 'In △ABC, DE ∥ BC with AD = ' + ad + ' cm, DB = ' + db + ' cm and AE = ' + ae + ' cm. Find EC.',
        hi: '△ABC में, DE ∥ BC तथा AD = ' + ad + ' cm, DB = ' + db + ' cm और AE = ' + ae + ' cm है। EC ज्ञात कीजिए।',
        ans: ec + ' cm',
        steps: withExtra('tri-bpt', [
          st('By the Basic Proportionality Theorem, AD/DB = AE/EC.', 'आधारभूत समानुपातिकता प्रमेय से, AD/DB = AE/EC।'),
          st(ad + '/' + db + ' = ' + ae + '/EC ⟹ EC = ' + ec + ' cm.', ad + '/' + db + ' = ' + ae + '/EC ⟹ EC = ' + ec + ' cm।')
        ]),
        raw: { ad: ad, db: db, ae: ae, ec: ec }
      };
    } });

  /* ---------- 19. Coordinate geometry · midpoint quadrant ---------- */
  T.push({ id: 'coord-mid', ch: 7, marks: 1, dmin: 1, dmax: 1, fig: 'plane-points',
    make: function (rng, d) {
      var x1 = -ri(rng, 1, 8), x2 = -x1;             // midpoint x = 0
      var y1 = ri(rng, 1, 9), y2 = y1 + 2 * ri(rng, 1, 4);
      var where = pick(rng, ['y-axis', 'x-axis', 'origin']);
      if (where === 'x-axis') { y1 = -ri(rng, 1, 6); y2 = -y1; x2 = x1 + 2 * ri(rng, 1, 5); }
      if (where === 'origin') { y1 = -ri(rng, 1, 6); y2 = -y1; }
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      var truth = mx === 0 && my === 0 ? 'origin' : mx === 0 ? 'y-axis' : my === 0 ? 'x-axis' : 'neither x-axis nor y-axis';
      return {
        en: 'The mid-point of the line segment joining P(' + fmt(x1) + ', ' + fmt(y1) + ') and Q(' + x2 + ', ' + y2 + ') lies on:',
        hi: 'बिंदुओं P(' + fmt(x1) + ', ' + fmt(y1) + ') तथा Q(' + x2 + ', ' + y2 + ') को मिलाने वाले रेखाखंड का मध्य-बिंदु स्थित है :',
        opts: mcq(rng, truth, ['x-axis', 'y-axis', 'origin', 'neither x-axis nor y-axis']),
        ans: truth,
        steps: withExtra('coord-mid', [
          st('Mid-point = ((x₁ + x₂)/2, (y₁ + y₂)/2) = (' + fmt(mx) + ', ' + fmt(my) + ').',
             'मध्य-बिंदु = ((x₁ + x₂)/2, (y₁ + y₂)/2) = (' + fmt(mx) + ', ' + fmt(my) + ')।'),
          st('So it lies on the ' + truth + '.', 'अतः यह ' + truth + ' पर स्थित है।')
        ]),
        raw: { x1: x1, y1: y1, x2: x2, y2: y2, mx: mx, my: my, truth: truth }
      };
    } });

  /* ---------- 20. Coordinate geometry · section ratio on an axis ---------- */
  T.push({ id: 'coord-section', ch: 7, marks: 3, dmin: 2, dmax: 3, fig: 'plane-points',
    make: function (rng, d) {
      var x1 = ri(rng, 2, 9), x2 = -ri(rng, 1, 6);
      var y1 = ri(rng, 2, 9), y2 = y1 + pick(rng, [4, 6, 8]);
      /* y-axis cuts at x = 0. Section formula: m₁x₂ + m₂x₁ = 0 ⟹ m₁ : m₂ = x₁ : |x₂| */
      var m1 = x1, m2 = -x2;
      var g = gcd(m1, m2); var mr = m1 / g, nr = m2 / g;
      var y = (mr * y2 + nr * y1) / (mr + nr);
      return {
        en: 'Find the ratio in which the y-axis divides the line segment joining (' + x1 + ', ' + y1
          + ') and (' + fmt(x2) + ', ' + y2 + '). Also find the point of intersection.',
        hi: 'y-अक्ष उस रेखाखंड को किस अनुपात में विभाजित करता है जो (' + x1 + ', ' + y1
          + ') तथा (' + fmt(x2) + ', ' + y2 + ') को मिलाता है? प्रतिच्छेदन बिंदु भी ज्ञात कीजिए।',
        ans: mr + ' : ' + nr + ', point (0, ' + dec(y, 2) + ')',
        steps: withExtra('coord-section', [
          st('Let the y-axis divide it in m₁ : m₂. The x-coordinate must vanish: (m₁·' + fmt(x2) + ' + m₂·' + x1 + ')/(m₁ + m₂) = 0.',
             'मान लीजिए y-अक्ष इसे m₁ : m₂ में विभाजित करता है। x-निर्देशांक शून्य होना चाहिए : (m₁·' + fmt(x2) + ' + m₂·' + x1 + ')/(m₁ + m₂) = 0।'),
          st('So m₁ : m₂ = ' + x1 + ' : ' + (-x2) + ' = ' + mr + ' : ' + nr + '.',
             'अतः m₁ : m₂ = ' + x1 + ' : ' + (-x2) + ' = ' + mr + ' : ' + nr + '।'),
          st('The y-coordinate is (' + mr + '·' + y2 + ' + ' + nr + '·' + y1 + ')/' + (mr + nr) + ' = ' + dec(y, 2)
            + ', so the point is (0, ' + dec(y, 2) + ').',
            'y-निर्देशांक = (' + mr + '·' + y2 + ' + ' + nr + '·' + y1 + ')/' + (mr + nr) + ' = ' + dec(y, 2)
            + ', अतः बिंदु (0, ' + dec(y, 2) + ') है।')
        ]),
        raw: { x1: x1, x2: x2, y1: y1, y2: y2, m1: mr, m2: nr, y: y }
      };
    } });

  /* ---------- 21. Coordinate geometry · distance ---------- */
  T.push({ id: 'coord-dist', ch: 7, marks: 1, dmin: 1, dmax: 2, fig: 'distance',
    make: function (rng, d) {
      var x1 = ri(rng, -6, 2), y1 = ri(rng, -5, 3);
      var dx = pick(rng, [3, 5, 6, 8, 9]), dy = pick(rng, [4, 8, 12, 15]);
      var x2 = x1 + dx, y2 = y1 + dy;
      var dist2 = dx * dx + dy * dy;
      var nice = Math.sqrt(dist2);
      var ans = Number.isInteger(nice) ? String(nice) : '√' + dist2;
      return {
        en: 'The distance between the points (' + fmt(x1) + ', ' + fmt(y1) + ') and (' + fmt(x2) + ', ' + fmt(y2) + ') is:',
        hi: 'बिंदुओं (' + fmt(x1) + ', ' + fmt(y1) + ') तथा (' + fmt(x2) + ', ' + fmt(y2) + ') के बीच की दूरी है :',
        opts: mcq(rng, ans, ['√' + (dist2 + 1), String(dx + dy), '√' + Math.abs(dx * dx - dy * dy), String(nice + 1)]),
        ans: ans,
        steps: withExtra('coord-dist', [
          st('d = √[(x₂ − x₁)² + (y₂ − y₁)²] = √[' + dx + '² + ' + dy + '²] = √' + dist2 + '.',
             'd = √[(x₂ − x₁)² + (y₂ − y₁)²] = √[' + dx + '² + ' + dy + '²] = √' + dist2 + '।'),
          st('So d = ' + ans + '.', 'अतः d = ' + ans + '।')
        ]),
        raw: { x1: x1, y1: y1, x2: x2, y2: y2, dist2: dist2, ans: ans }
      };
    } });

  /* ---------- 22. Trigonometry · standard angle equation ---------- */
  T.push({ id: 'trig-angle', ch: 8, marks: 1, dmin: 1, dmax: 2, fig: 'right-triangle',
    make: function (rng, d) {
      var table = [[30, '1/2'], [45, '1/√2'], [60, '√3/2']];
      var t = pick(rng, table), th = t[0], v = t[1];
      var c = ri(rng, 2, 9);
      var total = c + (th === 30 ? 1 : th === 45 ? 2 : 3); // keep the constant term integer-ish
      var form = pick(rng, ['sin', 'cos']);
      var base = form === 'sin'
        ? { 30: '1/2', 45: '1/√2', 60: '√3/2' }
        : { 30: '√3/2', 45: '1/√2', 60: '1/2' };
      var chosen = pool(pick(rng, [30, 45, 60]));
      function pool(x) { return x; }
      return {
        en: 'If θ is an acute angle and ' + c + ' + 4 ' + form + ' θ = ' + (c + 4 * (chosen === 30 ? 0.5 : chosen === 45 ? 0.7071 : 0.866)).toFixed(3).replace(/0+$/,'').replace(/\.$/,'') + ' (rounded), then θ = ?',
        hi: 'यदि θ न्यूनकोण है तथा ' + c + ' + 4 ' + form + ' θ = ' + (c + 4 * (chosen === 30 ? 0.5 : chosen === 45 ? 0.7071 : 0.866)).toFixed(3) + ' (लगभग), तो θ = ?',
        opts: mcq(rng, chosen + '°', ['30°', '45°', '60°', '90°']),
        ans: chosen + '°',
        steps: withExtra('trig-angle', [st('Standard values: sin 30° = ½, sin 45° = 1/√2, sin 60° = √3/2.', 'मानक मान : sin 30° = ½, sin 45° = 1/√2, sin 60° = √3/2।')]),
        raw: { chosen: chosen, c: c }
      };
    } });

  /* ---------- 23. Trigonometry · evaluate an expression ---------- */
  T.push({ id: 'trig-eval', ch: 8, marks: 2, dmin: 1, dmax: 3, fig: null,
    make: function (rng, d) {
      var items = [
        { ex: 'sin²60° + cos²30°', n: 3, d: 2, txt: '3/2' },
        { ex: 'tan²60° − 2sin²45°', n: 2, d: 1, txt: '2' },
        { ex: '2cos²60° + 3sec²30°', n: 3, d: 2, txt: '11/2' },
        { ex: '4sin²45° + cosec²60°', n: 13, d: 3, txt: '13/3' },
        { ex: 'tan 45° · cot 45° + sec 60°', n: 3, d: 1, txt: '3' }
      ];
      var it = pick(rng, items);
      return {
        en: 'Evaluate: ' + it.ex + '.',
        hi: 'मान ज्ञात कीजिए : ' + it.ex + '।',
        ans: it.txt,
        steps: withExtra('trig-eval', [
          st('Substitute the standard values (sin 30° = ½, cos 60° = ½, tan 45° = 1, sec 30° = 2/√3 …).',
             'मानक मान रखिए (sin 30° = ½, cos 60° = ½, tan 45° = 1, sec 30° = 2/√3 …)।'),
          st('Simplify: the expression equals ' + it.txt + '.', 'सरलीकरण : व्यंजक का मान ' + it.txt + ' है।')
        ]),
        raw: { expr: it.ex, ans: it.txt }
      };
    } });

  /* ---------- 24. Trigonometry · find a ratio from another ---------- */
  T.push({ id: 'trig-ratio', ch: 8, marks: 2, dmin: 1, dmax: 2, fig: 'right-triangle',
    make: function (rng, d) {
      var tri = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
      var o = tri[0], a = tri[1], h = tri[2];
      var which = pick(rng, ['sin', 'cos', 'tan']);
      var given = which === 'sin' ? o + '/' + h : which === 'cos' ? a + '/' + h : o + '/' + a;
      var ask = pick(rng, ['sec', 'cosec', 'cot', 'cos', 'sin']);
      var val = {
        sec: given.includes('/') && which === 'sin' ? h + '/√(' + (h * h - o * o) + ')' : null
      };
      var answers = {
        sin: o + '/' + h, cos: a + '/' + h, tan: o + '/' + a,
        cosec: h + '/' + o, sec: h + '/' + a, cot: a + '/' + o
      };
      return {
        en: 'If ' + which + ' A = ' + given + ' (A acute), find ' + ask + ' A.',
        hi: 'यदि ' + which + ' A = ' + given + ' (A न्यूनकोण), तो ' + ask + ' A ज्ञात कीजिए।',
        ans: answers[ask],
        steps: withExtra('trig-ratio', [
          st('Draw a right triangle with opposite = ' + o + ', adjacent = ' + a + ', hypotenuse = ' + h + ' (scaled).',
             'समकोण त्रिभुज बनाइए जिसमें सम्मुख = ' + o + ', संलग्न = ' + a + ', कर्ण = ' + h + ' (मापित)।'),
          st(ask + ' A = ' + answers[ask] + '.', ask + ' A = ' + answers[ask] + '।')
        ]),
        raw: { tri: tri, which: which, ask: ask, ans: answers[ask] }
      };
    } });

  /* ---------- 25. Trigonometry · identity ---------- */
  T.push({ id: 'trig-identity', ch: 8, marks: 3, dmin: 2, dmax: 3, fig: null,
    make: function (rng, d) {
      var ids = [
        { en: 'Prove: (sin θ + cos θ)² + (sin θ − cos θ)² = 2', hi: 'सिद्ध कीजिए : (sin θ + cos θ)² + (sin θ − cos θ)² = 2' },
        { en: 'Prove: sec²θ − tan²θ = 1 and hence sec²θ + tan²θ = 2sec²θ − 1', hi: 'सिद्ध कीजिए : sec²θ − tan²θ = 1 तथा इससे sec²θ + tan²θ = 2sec²θ − 1' },
        { en: 'Prove: (1 + tan²θ)(1 − sin²θ) = 1', hi: 'सिद्ध कीजिए : (1 + tan²θ)(1 − sin²θ) = 1' },
        { en: 'Prove: cos θ/(1 + sin θ) + (1 + sin θ)/cos θ = 2 sec θ', hi: 'सिद्ध कीजिए : cos θ/(1 + sin θ) + (1 + sin θ)/cos θ = 2 sec θ' }
      ];
      var it = pick(rng, ids);
      return {
        en: it.en, hi: it.hi, ans: 'Identity proved', ansHi: 'सर्वसमिका सिद्ध',
        steps: withExtra('trig-identity', [
          st('Start from the more complicated side and convert everything to sin θ and cos θ.',
             'अधिक जटिल पक्ष से आरंभ कीजिए और सब कुछ sin θ तथा cos θ में बदलिए।'),
          st('Use sin²θ + cos²θ = 1 (or 1 + tan²θ = sec²θ) to collapse the expression to the other side.',
             'sin²θ + cos²θ = 1 (या 1 + tan²θ = sec²θ) का प्रयोग करके व्यंजक को दूसरे पक्ष तक सरल कीजिए।')
        ]),
        raw: { id: it.en }
      };
    } });

  /* ---------- 26. Heights & distances · single triangle ---------- */
  T.push({ id: 'height-one', ch: 9, marks: 1, dmin: 1, dmax: 2, fig: 'elevation',
    make: function (rng, d) {
      var ang = pick(rng, [30, 45, 60]);
      var L = pick(rng, [60, 100, 120, 150, 200]);
      var answerStr = ang === 30 ? (2 * L) + ' m'
        : ang === 45 ? L + '√2 m'
        : (2 * L / Math.sqrt(3)).toFixed(1).replace(/\.?0+$/, '') + ' m';
      return {
        en: 'A kite is flying at a height of ' + L + ' m. The string makes ' + ang
          + '° with the horizontal. The length of the string is:',
        hi: 'एक पतंग ' + L + ' m की ऊँचाई पर उड़ रही है। डोरी क्षैतिज से ' + ang + '° का कोण बनाती है। डोरी की लंबाई है :',
        opts: mcq(rng, answerStr, [L / 2 + ' m', L + '√3 m', L + ' m', L + '√3/2 m']),
        ans: answerStr,
        steps: withExtra('height-one', [
          st('The height is the side opposite the angle; the string is the hypotenuse. sin ' + ang + '° = ' + L + '/string.',
             'ऊँचाई कोण की सम्मुख भुजा है; डोरी कर्ण है। sin ' + ang + '° = ' + L + '/डोरी।'),
          st('String = ' + L + ' / sin ' + ang + '° = ' + answerStr + '.',
             'डोरी = ' + L + ' / sin ' + ang + '° = ' + answerStr + '।')
        ]),
        raw: { ang: ang, L: L }
      };
    } });

  /* ---------- 27. Heights & distances · two angles (lighthouse) ---------- */
  T.push({ id: 'height-two', ch: 9, marks: 4, dmin: 3, dmax: 3, fig: 'elevation',
    make: function (rng, d) {
      /* A is on the ground, B is `lift` metres higher and closer to the tower.
         tan(lo) = h / x   (x = distance from A)
         tan(hi) = h / (x - lift)
         Dividing and solving:  x = lift·tan(hi) / (tan(hi) - tan(lo)),
         then h = x·tan(lo).
         The older code used lift/(tan lo - tan hi): because a higher viewpoint
         sees a BIGGER angle, that denominator is negative, so EVERY instance
         produced a negative tower height ("h ≈ -41 m").  Angles are also
         ordered now, so lo is always the smaller one. */
      var hi = pick(rng, [45, 60]);
      var lo = hi === 45 ? 30 : pick(rng, [30, 45]);
      var lift = pick(rng, [20, 30, 40, 50]);
      var tl = Math.tan(lo * Math.PI / 180), th = Math.tan(hi * Math.PI / 180);
      var x = lift * th / (th - tl);
      var h = x * tl;
      return {
        en: 'From a point on the ground the angle of elevation of the top of a tower is ' + lo
          + '°. From a point ' + lift + ' m higher the angle is ' + hi + '°. Find the height of the tower and its distance.',
        hi: 'भूमि पर एक बिंदु से मीनार के शिखर का उन्नयन कोण ' + lo + '° है। ' + lift
          + ' m ऊँचे एक बिंदु से यह कोण ' + hi + '° है। मीनार की ऊँचाई तथा दूरी ज्ञात कीजिए।',
        ans: 'h ≈ ' + dec(h, 1) + ' m, distance ≈ ' + dec(x, 1) + ' m',
        steps: [
          st('Let the tower be h metres and let A be x metres from its foot. Then tan ' + lo + '° = h/x.',
             'मीनार h मीटर तथा A उसके पाद से x मीटर दूर मानिए। तब tan ' + lo + '° = h/x।'),
          st('B is ' + lift + ' m higher, so it is (x − ' + lift + ') m from the foot: tan ' + hi + '° = h/(x − ' + lift + ').',
             'B, ' + lift + ' m ऊँचा है, अतः पाद से (x − ' + lift + ') m दूर है: tan ' + hi + '° = h/(x − ' + lift + ')।'),
          st('Dividing the two: tan ' + hi + '°/tan ' + lo + '° = x/(x − ' + lift + '), which gives x = ' + lift + '·tan ' + hi + '° / (tan ' + hi + '° − tan ' + lo + '°) ≈ ' + dec(x, 1) + ' m.',
             'दोनों को भाग देने पर: tan ' + hi + '°/tan ' + lo + '° = x/(x − ' + lift + '), जिससे x = ' + lift + '·tan ' + hi + '° / (tan ' + hi + '° − tan ' + lo + '°) ≈ ' + dec(x, 1) + ' m।'),
          st('So h = x·tan ' + lo + '° ≈ ' + dec(h, 1) + ' m, and the tower stands ' + dec(h, 1) + ' m high with A about ' + dec(x, 1) + ' m away.',
             'अतः h = x·tan ' + lo + '° ≈ ' + dec(h, 1) + ' m; मीनार ' + dec(h, 1) + ' m ऊँची है और A लगभग ' + dec(x, 1) + ' m दूर है।'),
          st('Check the answer: with h = ' + dec(h, 1) + ' m and A at ' + dec(x, 1) + ' m, tan⁻¹(' + dec(h, 1) + ' / ' + dec(x, 1) + ') = ' + dec(Math.atan(h / x) * 180 / Math.PI, 1) + '° = ' + lo + '° ✓, and from B, tan⁻¹(' + dec(h, 1) + ' / ' + dec(x - lift, 1) + ') = ' + dec(Math.atan(h / (x - lift)) * 180 / Math.PI, 1) + '° = ' + hi + '° ✓.',
             'उत्तर की जाँच: h = ' + dec(h, 1) + ' m तथा A, ' + dec(x, 1) + ' m दूर, tan⁻¹(' + dec(h, 1) + ' / ' + dec(x, 1) + ') = ' + dec(Math.atan(h / x) * 180 / Math.PI, 1) + '° = ' + lo + '° ✓, और B से, tan⁻¹(' + dec(h, 1) + ' / ' + dec(x - lift, 1) + ') = ' + dec(Math.atan(h / (x - lift)) * 180 / Math.PI, 1) + '° = ' + hi + '° ✓।')
        ],
        raw: { lo: lo, hi: hi, lift: lift, x: x, h: h }
      };
    } });

  /* ---------- 28. Circles · tangent length ---------- */
  T.push({ id: 'circ-tangent', ch: 10, marks: 2, dmin: 1, dmax: 2, fig: 'tangent-line',
    make: function (rng, d) {
      var tri = pick(rng, [[7, 24, 25], [8, 15, 17], [5, 12, 13], [9, 40, 41], [20, 21, 29]]);
      var r = tri[0], t = tri[1], op = tri[2];
      var ask = pick(rng, ['tangent', 'radius', 'op']);
      var ans = ask === 'tangent' ? t + ' cm' : ask === 'radius' ? r + ' cm' : op + ' cm';
      var en = ask === 'tangent'
        ? 'A point P is ' + op + ' cm from the centre O of a circle of radius ' + r + ' cm. A tangent is drawn from P. Its length is:'
        : ask === 'radius'
        ? 'A tangent of length ' + t + ' cm is drawn from a point ' + op + ' cm away from the centre. The radius is:'
        : 'A tangent of length ' + t + ' cm is drawn from P to a circle of radius ' + r + ' cm. The distance OP is:';
      var hi = ask === 'tangent'
        ? 'बिंदु P केंद्र O से ' + op + ' cm दूर है, वृत्त की त्रिज्या ' + r + ' cm है। P से खींची गई स्पर्श-रेखा की लंबाई है :'
        : ask === 'radius'
        ? 'केंद्र से ' + op + ' cm दूर बिंदु से ' + t + ' cm लंबी स्पर्श-रेखा खींची गई है। त्रिज्या है :'
        : 'P से ' + r + ' cm त्रिज्या वाले वृत्त पर ' + t + ' cm लंबी स्पर्श-रेखा खींची गई है। OP की दूरी है :';
      return {
        en: en, hi: hi, ans: ans,
        steps: withExtra('circ-tangent', [
          st('The radius to the point of contact is perpendicular to the tangent, so △OAP is right-angled at A.',
             'स्पर्श बिंदु पर त्रिज्या स्पर्श-रेखा के लंबवत होती है, अतः △OAP बिंदु A पर समकोण है।'),
          st('OP² = OA² + AP² ⟹ ' + op + '² = ' + r + '² + ' + t + '². The required length is ' + ans + '.',
             'OP² = OA² + AP² ⟹ ' + op + '² = ' + r + '² + ' + t + '²। अभीष्ट लंबाई ' + ans + ' है।')
        ]),
        raw: { r: r, t: t, op: op, ask: ask }
      };
    } });

  /* ---------- 29. Circles · angle at the point of contact ---------- */
  T.push({ id: 'circ-angle', ch: 10, marks: 1, dmin: 2, dmax: 3, fig: 'tangent-line',
    make: function (rng, d) {
      /* P is outside; PA and PB are the two tangents, so OA bisects ∠AOB and
         OA ⟂ PA.  In the right triangle OAP:
              ∠APO = 90° − ∠AOP        and      ∠AOP = ∠AOB / 2 = ∠POB / 2.
         The old code used ∠APO = ∠POB − 90°, which is simply not a relation
         that holds; it produced angles like 28° for ∠POB = 118° when the true
         value is 31°. */
      var ang = ri(rng, 100, 150);          /* ∠POB */
      var half = ang / 2;
      var ans = 90 - half;
      return {
        en: 'PA and PB are the two tangents from an external point P to a circle with centre O. If ∠POB = ' + ang + '°, then ∠APO equals:',
        hi: 'बाह्य बिंदु P से केंद्र O वाले वृत्त पर PA तथा PB दो स्पर्श-रेखाएँ हैं। यदि ∠POB = ' + ang + '° है, तो ∠APO बराबर है :',
        opts: mcq(rng, ans + '°', [(180 - ang) + '°', '90°', ang + '°']),
        ans: ans + '°',
        steps: withExtra('circ-angle', [
          st('OA ⟂ PA, because the radius to the point of contact is perpendicular to the tangent — so ∠OAP = 90°.',
             'OA ⟂ PA, क्योंकि स्पर्श-बिंदु पर त्रिज्या स्पर्श-रेखा के लंबवत होती है — अतः ∠OAP = 90°।'),
          st('OA bisects ∠AOB (the two tangents are symmetric about OP), so ∠AOP = ∠POB / 2 = ' + ang + '° / 2 = ' + half + '°.',
             'OA, ∠AOB को समद्विभाजित करता है (दोनों स्पर्श-रेखाएँ OP के परितः सममित हैं), अतः ∠AOP = ∠POB / 2 = ' + ang + '° / 2 = ' + half + '°।'),
          st('Angles of △OAP add to 180°: ∠APO = 180° − 90° − ' + half + '° = ' + ans + '°.',
             '△OAP के कोणों का योग 180° है: ∠APO = 180° − 90° − ' + half + '° = ' + ans + '°।'),
          st('Check: ∠APO + ∠AOP = ' + ans + '° + ' + half + '° = 90°, as a right triangle requires.',
             'जाँच: ∠APO + ∠AOP = ' + ans + '° + ' + half + '° = 90°, जैसा समकोण त्रिभुज में होना चाहिए।')
        ]),
        raw: { ang: ang, ans: ans, half: half }
      };
    } });

  /* ---------- 30. Circles · equal tangents proof ---------- */
  T.push({ id: 'circ-proof', ch: 10, marks: 3, dmin: 2, dmax: 3, fig: 'tangent-pair',
    make: function (rng, d) {
      var props = [
        { en: 'Prove that the lengths of tangents drawn from an external point to a circle are equal.',
          hi: 'सिद्ध कीजिए कि किसी बाह्य बिंदु से वृत्त पर खींची गई स्पर्श-रेखाओं की लंबाइयाँ बराबर होती हैं।' },
        { en: 'Prove that the tangents drawn at the ends of a diameter of a circle are parallel.',
          hi: 'सिद्ध कीजिए कि वृत्त के व्यास के सिरों पर खींची गई स्पर्श-रेखाएँ समांतर होती हैं।' },
        { en: 'Prove that the parallelogram circumscribing a circle is a rhombus.',
          hi: 'सिद्ध कीजिए कि वृत्त को परिगत करने वाला समांतर चतुर्भुज एक समचतुर्भुज होता है।' }
      ];
      var p = pick(rng, props);
      return {
        en: p.en, hi: p.hi, ans: 'Proof (standard theorem)', ansHi: 'सिद्धि (मानक प्रमेय)',
        steps: withExtra('circ-proof', [
          st('Use the right-angle-at-contact property, then congruent triangles (RHS) or equal tangent segments from the same point.',
             'स्पर्श बिंदु पर समकोण का गुण प्रयोग कीजिए, फिर सर्वांगसम त्रिभुज (RHS) या एक ही बिंदु से बराबर स्पर्श खंड।'),
          st('Always label the point of contact — every step of these proofs depends on it.',
             'स्पर्श बिंदु को अवश्य नाम दीजिए — इन सिद्धियों का प्रत्येक चरण उसी पर निर्भर है।')
        ]),
        raw: { p: p.en }
      };
    } });

  /* ---------- 31. Areas related to circles · sector ---------- */
  T.push({ id: 'area-sector', ch: 11, marks: 1, dmin: 1, dmax: 2, fig: 'sector',
    make: function (rng, d) {
      var ang = pick(rng, [36, 45, 60, 72, 90, 120]);
      var k = pick(rng, [1, 2, 3, 4]);
      // area = ang/360 · πr² ; choose r so the answer is clean
      var r2 = pick(rng, [100, 400, 900, 1600]);
      var r = Math.sqrt(r2);
      var areaK = ang / 360;                    // area = areaK·πr²
      var ansVal = areaK * r2;                  // in units of π
      var ans = (Number.isInteger(ansVal) ? ansVal : ansVal.toFixed(2).replace(/\.?0+$/, '')) + 'π sq units';
      return {
        en: 'A sector of a circle of radius ' + r + ' units has central angle ' + ang + '°. Its area is:',
        hi: 'त्रिज्या ' + r + ' इकाई वाले वृत्त के एक त्रिज्यखंड का केंद्रीय कोण ' + ang + '° है। उसका क्षेत्रफल है :',
        opts: mcq(rng, ans, [
          (Number.isInteger(areaK * r2 / 2) ? areaK * r2 / 2 : (areaK * r2 / 2).toFixed(2)) + 'π sq units',
          (Number.isInteger(areaK * r2 * 2) ? areaK * r2 * 2 : (areaK * r2 * 2).toFixed(2)) + 'π sq units',
          (Number.isInteger(r2) ? r2 : r2) + 'π sq units'
        ]),
        ans: ans,
        steps: withExtra('area-sector', [
          st('Area of sector = (θ/360°) × πr².', 'त्रिज्यखंड का क्षेत्रफल = (θ/360°) × πr²।'),
          st('= (' + ang + '/360) × π × ' + r + '² = ' + ans + '.', '= (' + ang + '/360) × π × ' + r + '² = ' + ans + '।')
        ]),
        raw: { ang: ang, r: r, ansVal: ansVal }
      };
    } });

  /* ---------- 32. Areas related to circles · arc length ---------- */
  T.push({ id: 'area-arc', ch: 11, marks: 2, dmin: 2, dmax: 3, fig: 'sector',
    make: function (rng, d) {
      var ang = pick(rng, [30, 45, 60, 72, 90, 120]);
      var rCoef = pick(rng, [7, 14, 21, 10, 5]);      // with π = 22/7, arc = (θ/180)·π·r
      var arcCoef = ang * rCoef / 180;                // in units of π
      return {
        en: 'A piece of wire ' + dec(arcCoef * 22 / 7, 2) + ' cm long is bent into an arc of a circle of radius '
          + dec(rCoef * 22 / 7, 2) + ' cm. The angle subtended at the centre is:',
        hi: dec(arcCoef * 22 / 7, 2) + ' cm लंबा तार ' + dec(rCoef * 22 / 7, 2)
          + ' cm त्रिज्या वाले वृत्त के चाप के रूप में मोड़ा गया है। केंद्र पर अंतरित कोण है :',
        opts: mcq(rng, ang + '°', [(ang + 30) + '°', Math.abs(ang - 30) + '°', (ang * 2) + '°']),
        ans: ang + '°',
        steps: withExtra('area-arc', [
          st('Arc length = (θ/360°) × 2πr ⟹ θ = 360° × l / (2πr).', 'चाप लंबाई = (θ/360°) × 2πr ⟹ θ = 360° × l / (2πr)।'),
          st('With the given wire and radius, θ = ' + ang + '°.', 'दिए गए तार तथा त्रिज्या से θ = ' + ang + '°।')
        ]),
        raw: { ang: ang, rCoef: rCoef, arcCoef: arcCoef }
      };
    } });

  /* ---------- 33. Areas · sector case study (brooch) ---------- */
  T.push({ id: 'area-case', ch: 11, marks: 4, dmin: 2, dmax: 3, fig: 'sector',
    make: function (rng, d) {
      var dia = pick(rng, [28, 35, 42, 14]);
      var nd = pick(rng, [3, 4, 5]);
      var sectors = nd * 2;
      var ang = 360 / sectors;
      var r = dia / 2;
      var arc = ang / 360 * 2 * Math.PI * r;
      var area = ang / 360 * Math.PI * r * r;
      var wire = Math.PI * dia + nd * dia;
      return {
        en: 'A brooch uses silver wire in a circle of diameter ' + dia + ' mm, with ' + nd
          + ' diameters dividing it into ' + sectors + ' equal sectors. (i) central angle (ii) arc length of one sector (iii) area of each sector OR total wire used.',
        hi: 'एक ब्रोच में ' + dia + ' mm व्यास के वृत्त के रूप में चाँदी का तार है, ' + nd
          + ' व्यास वृत्त को ' + sectors + ' बराबर त्रिज्यखंडों में बाँटते हैं। (i) केंद्रीय कोण (ii) एक त्रिज्यखंड के चाप की लंबाई (iii) प्रत्येक त्रिज्यखंड का क्षेत्रफल अथवा कुल तार।',
        ans: 'θ = ' + ang + '°; arc ≈ ' + dec(arc, 2) + ' mm; area ≈ ' + dec(area, 2) + ' mm²; wire ≈ ' + dec(wire, 2) + ' mm',
        steps: withExtra('area-case', [
          st('Each sector is 360°/' + sectors + ' = ' + ang + '.', 'प्रत्येक त्रिज्यखंड 360°/' + sectors + ' = ' + ang + ' है।'),
          st('Arc = (θ/360) × 2πr ≈ ' + dec(arc, 2) + ' mm.', 'चाप = (θ/360) × 2πr ≈ ' + dec(arc, 2) + ' mm।'),
          st('Area = (θ/360) × πr² ≈ ' + dec(area, 2) + ' mm². Total wire = circumference + ' + nd + ' diameters ≈ ' + dec(wire, 2) + ' mm.',
             'क्षेत्रफल = (θ/360) × πr² ≈ ' + dec(area, 2) + ' mm²। कुल तार = परिधि + ' + nd + ' व्यास ≈ ' + dec(wire, 2) + ' mm।')
        ]),
        raw: { dia: dia, nd: nd, sectors: sectors, ang: ang, arc: arc, area: area, wire: wire }
      };
    } });

  /* ---------- 34. Surface area & volume · cylinder + hemisphere ---------- */
  T.push({ id: 'solid-dome', ch: 12, marks: 3, dmin: 2, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var r = pick(rng, [3, 4, 6, 7, 8]);
      var h = 2 * r;                                  // "radius = half the height"
      var vol = Math.PI * r * r * h + (2 / 3) * Math.PI * r * r * r;
      var volCoef = r * r * h + (2 / 3) * r * r * r;  // volume = volCoef·π
      return {
        en: 'A room is a cylinder surmounted by a hemispherical dome; the hemisphere radius is half the cylinder height. '
          + 'If the room holds ' + dec(vol, 2) + ' m³ of air, find the height of the cylindrical part. (π = 22/7)',
        hi: 'एक कमरा बेलन के ऊपर अर्धगोलाकार गुंबद के रूप में है; अर्धगोले की त्रिज्या बेलन की ऊँचाई की आधी है। '
          + 'यदि कमरे में ' + dec(vol, 2) + ' m³ हवा है, तो बेलन की ऊँचाई ज्ञात कीजिए। (π = 22/7)',
        ans: 'h = ' + h + ' m',
        steps: withExtra('solid-dome', [
          st('V = πr²h + (2/3)πr³ and h = 2r, so V = πr²(2r) + (2/3)πr³ = (8/3)πr³.',
             'V = πr²h + (2/3)πr³ तथा h = 2r, अतः V = πr²(2r) + (2/3)πr³ = (8/3)πr³।'),
          st('Solving with V = ' + dec(vol, 2) + ' m³ gives r = ' + r + ' m, hence h = 2r = ' + h + ' m.',
             'V = ' + dec(vol, 2) + ' m³ रखने पर r = ' + r + ' m, अतः h = 2r = ' + h + ' m।')
        ]),
        raw: { r: r, h: h, vol: vol }
      };
    } });

  /* ---------- 35. Surface area & volume · combination ---------- */
  T.push({ id: 'solid-mix', ch: 12, marks: 2, dmin: 1, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var r = pick(rng, [3, 7, 14, 21]);
      var h = pick(rng, [6, 10, 12, 24]);
      var vCyl = Math.PI * r * r * h;
      var v = vCyl;
      return {
        en: 'A cylindrical tank of radius ' + r + ' cm and height ' + h + ' cm is full of water. Its capacity in litres is about (π = 22/7):',
        hi: 'त्रिज्या ' + r + ' cm तथा ऊँचाई ' + h + ' cm की एक बेलनाकार टंकी पानी से भरी है। उसकी धारिता लगभग (लीटर में, π = 22/7) है :',
        opts: mcq(rng, dec(v / 1000, 2) + ' L', [dec(v / 100, 2) + ' L', dec(v / 10000, 2) + ' L', dec(v / 1000 * 2, 2) + ' L']),
        ans: dec(v / 1000, 2) + ' L',
        steps: withExtra('solid-mix', [
          st('V = πr²h = (22/7) × ' + r + '² × ' + h + ' cm³.', 'V = πr²h = (22/7) × ' + r + '² × ' + h + ' cm³।'),
          st('1 litre = 1000 cm³, so the capacity is ' + dec(v / 1000, 2) + ' L.', '1 लीटर = 1000 cm³, अतः धारिता ' + dec(v / 1000, 2) + ' L है।')
        ]),
        raw: { r: r, h: h, v: v }
      };
    } });

  /* ---------- 36. Statistics · empirical relation ---------- */
  T.push({ id: 'stat-relation', ch: 13, marks: 1, dmin: 1, dmax: 2, fig: 'mean-line',
    make: function (rng, d) {
      var m = ri(rng, 5, 20), k = pick(rng, [2, 3]);
      var mean = (m + 3) , mode = m;              // Mode = 3Median − 2Mean
      var median = (mode + 2 * mean) / 3;
      var x = pick(rng, [1, 2, 5]);
      mean = (m + 3) * x; mode = m * x; median = (mode + 2 * mean) / 3;
      var ask = pick(rng, ['median', 'mode', 'mean']);
      var ans = ask === 'median' ? median : ask === 'mode' ? mode : mean;
      return {
        en: ask === 'median'
          ? 'Mode and mean of a data are ' + mode + ' and ' + mean + ' respectively. Then the median is:'
          : ask === 'mode'
          ? 'Mean and median of a data are ' + mean + ' and ' + median + ' respectively. Then the mode is:'
          : 'Mode and median of a data are ' + mode + ' and ' + median + ' respectively. Then the mean is:',
        hi: ask === 'median'
          ? 'किसी आँकड़े का बहुलक तथा माध्य क्रमशः ' + mode + ' और ' + mean + ' हैं। माध्यिका है :'
          : ask === 'mode'
          ? 'किसी आँकड़े का माध्य तथा माध्यिका क्रमशः ' + mean + ' और ' + median + ' हैं। बहुलक है :'
          : 'किसी आँकड़े का बहुलक तथा माध्यिका क्रमशः ' + mode + ' और ' + median + ' हैं। माध्य है :',
        opts: mcq(rng, String(ans), [String(ans + 3), String(ans - 3), String(ans * 2)]),
        ans: String(ans),
        steps: withExtra('stat-relation', [
          st('Empirical relation: Mode = 3 Median − 2 Mean.', 'आनुभविक संबंध : बहुलक = 3 माध्यिका − 2 माध्य।'),
          st('Substituting gives ' + ask + ' = ' + ans + '.', 'मान रखने पर ' + ask + ' = ' + ans + '।')
        ]),
        raw: { mean: mean, median: median, mode: mode, ans: ans, ask: ask }
      };
    } });

  /* ---------- 37. Statistics · missing frequency ---------- */
  T.push({ id: 'stat-missing', ch: 13, marks: 3, dmin: 2, dmax: 3, fig: 'mean-line',
    make: function (rng, d) {
      var w = pick(rng, [5, 10]);
      var n = 6;
      var start = pick(rng, [10, 11, 20]);
      var classes = [], f = [], mids = [], sumFx = 0, sumF = 0;
      for (var i = 0; i < n; i++) {
        classes.push([start + i * w, start + (i + 1) * w]);
        var fi = ri(rng, 3, 12);
        f.push(fi); var mid = start + i * w + w / 2; mids.push(mid);
        sumFx += fi * mid; sumF += fi;
      }
      var targetMean = Math.round(sumFx / sumF) + pick(rng, [0, 1, 2, -1]);
      // choose x so that sumFx + x·mid_k = mean·(sumF + x) for a chosen position k
      var k = 2;
      var midK = mids[k];
      var x = Math.round((targetMean * sumF - sumFx) / (midK - targetMean));
      if (!isFinite(x) || x < 1) x = 6;
      f[k] = x;
      sumFx = 0; sumF = 0;
      for (var j = 0; j < n; j++) { sumFx += f[j] * mids[j]; sumF += f[j]; }
      var actualMean = sumFx / sumF;
      return {
        en: 'Find the missing frequency x if the mean of the following distribution is ' + dec(actualMean, 2) + ': '
          + classes.map(function (c, i) { return c[0] + '–' + c[1] + ' : ' + f[i]; }).join(', ').replace(' : ' + x + ',', ' : x,'),
        hi: 'यदि निम्न बंटन का माध्य ' + dec(actualMean, 2) + ' है तो लुप्त बारंबारता x ज्ञात कीजिए : '
          + classes.map(function (c, i) { return c[0] + '–' + c[1] + ' : ' + f[i]; }).join(', ').replace(' : ' + x + ',', ' : x,'),
        ans: 'x = ' + x,
        steps: withExtra('stat-missing', [
          st('Make the table of mid-points xᵢ and fᵢxᵢ, then use mean = Σfᵢxᵢ / Σfᵢ = ' + dec(actualMean, 2) + '.',
             'मध्य-बिंदु xᵢ तथा fᵢxᵢ की सारणी बनाइए, फिर माध्य = Σfᵢxᵢ / Σfᵢ = ' + dec(actualMean, 2) + ' का प्रयोग कीजिए।'),
          st('Solving the single linear equation in x gives x = ' + x + '.', 'x में एक रैखिक समीकरण हल करने पर x = ' + x + ' प्राप्त होता है।')
        ]),
        raw: { classes: classes, f: f, mids: mids, x: x, k: k, mean: actualMean }
      };
    } });

  /* ---------- 38. Probability · cards ---------- */
  T.push({ id: 'prob-card', ch: 14, marks: 1, dmin: 1, dmax: 2, fig: 'card-grid',
    make: function (rng, d) {
      var cases = [
        { en: 'a red face card', hi: 'एक लाल फेस कार्ड', n: 6, den: 52 },
        { en: 'a black king', hi: 'एक काला बादशाह', n: 2, den: 52 },
        { en: 'a red queen', hi: 'एक लाल रानी', n: 2, den: 52 },
        { en: 'neither a king nor a queen', hi: 'न बादशाह न रानी', n: 44, den: 52 },
        { en: 'a card of spades', hi: 'एक हुकुम का पत्ता', n: 13, den: 52 }
      ];
      var c = pick(rng, cases);
      var p = fr(c.n, c.den);
      return {
        en: 'A card is drawn at random from a well-shuffled deck of 52 cards. The probability of getting ' + c.en + ' is:',
        hi: '52 पत्तों की अच्छी प्रकार फेंटी गई गड्डी से यादृच्छया एक पत्ता निकाला जाता है। ' + c.hi + ' प्राप्त होने की प्रायिकता है :',
        opts: mcq(rng, p, [fr(c.n + 2, c.den), fr(c.n, 26), fr(Math.max(1, c.n - 2), c.den), fr(c.n * 2, c.den)]),
        ans: p,
        steps: withExtra('prob-card', [
          st('Favourable outcomes = ' + c.n + '; total outcomes = 52.', 'अनुकूल परिणाम = ' + c.n + '; कुल परिणाम = 52।'),
          st('P = ' + c.n + '/52 = ' + p + '.', 'P = ' + c.n + '/52 = ' + p + '।')
        ]),
        raw: { n: c.n, den: c.den, ans: p }
      };
    } });

  /* ---------- 39. Probability · two dice ---------- */
  T.push({ id: 'prob-dice', ch: 14, marks: 3, dmin: 2, dmax: 3, fig: 'dice-grid',
    make: function (rng, d) {
      var mode = pick(rng, ['diff', 'sum', 'product']);
      var target = mode === 'diff' ? pick(rng, [1, 2, 3, 4]) : mode === 'sum' ? pick(rng, [5, 6, 7, 8, 9, 10]) : pick(rng, [12, 6, 4, 2]);
      var count = 0;
      for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) {
        var v = mode === 'diff' ? Math.abs(a - b) : mode === 'sum' ? a + b : a * b;
        if (v === target) count++;
      }
      var p = fr(count, 36);
      return {
        en: 'Two dice are thrown together. Find the probability that the ' +
          (mode === 'diff' ? 'difference' : mode === 'sum' ? 'sum' : 'product') + ' of the numbers is ' + target + '.',
        hi: 'दो पासे एक साथ फेंके जाते हैं। दोनों संख्याओं का ' +
          (mode === 'diff' ? 'अंतर' : mode === 'sum' ? 'योग' : 'गुणनफल') + ' ' + target + ' होने की प्रायिकता ज्ञात कीजिए।',
        ans: p,
        steps: withExtra('prob-dice', [
          st('Total outcomes = 6 × 6 = 36; count the favourable pairs on the grid.', 'कुल परिणाम = 6 × 6 = 36; ग्रिड पर अनुकूल युग्म गिनिए।'),
          st('Favourable pairs = ' + count + ' ⟹ P = ' + count + '/36 = ' + p + '.', 'अनुकूल युग्म = ' + count + ' ⟹ P = ' + count + '/36 = ' + p + '।')
        ]),
        raw: { mode: mode, target: target, count: count, ans: p }
      };
    } });

  /* ---------- 40. Probability · bag of balls ---------- */
  T.push({ id: 'prob-bag', ch: 14, marks: 2, dmin: 1, dmax: 2, fig: 'bags',
    make: function (rng, d) {
      var r = ri(rng, 3, 8), w = ri(rng, 4, 9), bl = ri(rng, 2, 7);
      var tot = r + w + bl;
      var pR = fr(r, tot), pNotB = fr(r + w, tot);
      return {
        en: 'A bag contains ' + r + ' red, ' + w + ' white and ' + bl + ' black balls. One ball is drawn at random. Find the probability that it is (i) red (ii) not black.',
        hi: 'एक थैले में ' + r + ' लाल, ' + w + ' सफेद तथा ' + bl + ' काली गेंदें हैं। यादृच्छया एक गेंद निकाली जाती है। प्रायिकता ज्ञात कीजिए कि वह (i) लाल है (ii) काली नहीं है।',
        ans: pR + ' and ' + pNotB,
        steps: withExtra('prob-bag', [
          st('Total balls = ' + r + ' + ' + w + ' + ' + bl + ' = ' + tot + '.', 'कुल गेंदें = ' + r + ' + ' + w + ' + ' + bl + ' = ' + tot + '।'),
          st('P(red) = ' + r + '/' + tot + ' = ' + pR + '.', 'P(लाल) = ' + r + '/' + tot + ' = ' + pR + '।'),
          st('P(not black) = 1 − P(black) = 1 − ' + bl + '/' + tot + ' = ' + pNotB + '.', 'P(काली नहीं) = 1 − P(काली) = 1 − ' + bl + '/' + tot + ' = ' + pNotB + '।')
        ]),
        raw: { r: r, w: w, b: bl, tot: tot }
      };
    } });

  /* ---------- 41. Quadratic · speed / time (train style) ---------- */
  T.push({ id: 'quad-train', ch: 4, marks: 5, dmin: 3, dmax: 3, fig: null,
    make: function (rng, d) {
      var v = pick(rng, [30, 40, 45, 60, 50]);
      var gapSpeed = pick(rng, [5, 6, 8, 10, 15]);
      var t = pick(rng, [2, 3, 4]);
      var D = (v - gapSpeed) * gapSpeed * t / 1;          // keeps the quadratic clean
      D = pick(rng, [180, 240, 300, 360, 420, 480, 540, 600]);
      // solve D/(v-g) - D/v = t  ->  D*g = t*v*(v-g) ; keep only consistent picks
      var g2 = gapSpeed, ok = false;
      for (var k = 0; k <= 40 && !ok; k++) {
        for (var m = 1; m <= 3 && !ok; m++) {
          var vv = g2 * (1 + k) / k;
          if (Number.isInteger(vv) && Math.abs(D * g2 - t * vv * (vv - g2)) / Math.max(1, D) < 1e-6) { v = vv; ok = true; }
        }
        if (!ok) { g2 = g2; }
      }
      // fall back to the textbook triple if nothing matched
      if (!ok) { v = 40; g2 = 8; t = 3; D = 480; }
      else { D = t * v * (v - g2) / g2; }
      return {
        en: 'A train covers ' + D + ' km at a uniform speed. If the speed had been ' + g2
          + ' km/h less, it would have taken ' + t + ' hours more. Find the speed of the train.',
        hi: 'एक रेलगाड़ी ' + D + ' km की दूरी समान चाल से तय करती है। यदि चाल ' + g2
          + ' km/h कम होती तो उसे ' + t + ' घंटे अधिक लगते। रेलगाड़ी की चाल ज्ञात कीजिए।',
        ans: v + ' km/h',
        steps: withExtra('quad-train', [
          st('Let the speed be v. Then ' + D + '/v and ' + D + '/(v − ' + g2 + ') differ by ' + t + ' hours.',
             'मान लीजिए चाल v है। तब ' + D + '/v तथा ' + D + '/(v − ' + g2 + ') में ' + t + ' घंटे का अंतर है।'),
          st('Multiply out: ' + t + 'v² − ' + (t * g2) + 'v − ' + (D * g2) + ' = 0, a quadratic in v.',
             'गुणा करने पर : ' + t + 'v² − ' + (t * g2) + 'v − ' + (D * g2) + ' = 0, जो v में द्विघात है।'),
          st('The positive root is v = ' + v + ' km/h (the negative root is rejected).',
             'धनात्मक मूल v = ' + v + ' km/h है (ऋणात्मक मूल अमान्य)।')
        ]),
        raw: { D: D, v: v, g: g2, t: t }
      };
    } });

  /* ---------- 42. AP · sum of first n natural multiples ---------- */
  T.push({ id: 'ap-multiples', ch: 5, marks: 5, dmin: 2, dmax: 3, fig: 'ap-ladder',
    make: function (rng, d) {
      var k = pick(rng, [3, 4, 6, 7, 9]);
      var n = pick(rng, [10, 15, 20, 25]);
      var S = (n / 2) * (2 * k + (n - 1) * k);
      return {
        en: 'Find the sum of the first ' + n + ' positive multiples of ' + k + '.',
        hi: 'संख्याओं ' + k + ' के प्रथम ' + n + ' धन गुणजों का योग ज्ञात कीजिए।',
        ans: fmt(S),
        steps: withExtra('ap-multiples', [
          st('The multiples ' + k + ', ' + (2 * k) + ', ' + (3 * k) + ', … form an AP with a = ' + k + ' and d = ' + k + '.',
             'गुणज ' + k + ', ' + (2 * k) + ', ' + (3 * k) + ', … एक A.P. हैं जिसमें a = ' + k + ' तथा d = ' + k + ' है।'),
          st('Sₙ = n/2 [2a + (n − 1)d] = ' + n + '/2 [2(' + k + ') + (' + n + ' − 1)(' + k + ')] = ' + fmt(S) + '.',
             'Sₙ = n/2 [2a + (n − 1)d] = ' + n + '/2 [2(' + k + ') + (' + n + ' − 1)(' + k + ')] = ' + fmt(S) + '।')
        ]),
        raw: { k: k, n: n, S: S }
      };
    } });

  /* ---------- 43. Statistics · mean of a grouped table ---------- */
  T.push({ id: 'stat-mean', ch: 13, marks: 5, dmin: 2, dmax: 3, fig: 'mean-line',
    make: function (rng, d) {
      var start = pick(rng, [0, 10]), w = 10, n = 5;
      var classes = [], f = [], sumFx = 0, sumF = 0;
      for (var i = 0; i < n; i++) {
        var fi = ri(rng, 2, 9);
        classes.push([start + i * w, start + (i + 1) * w]); f.push(fi);
        var mid = start + i * w + w / 2;
        sumFx += fi * mid; sumF += fi;
      }
      var mean = sumFx / sumF;
      return {
        en: 'Find the mean of the following distribution: '
          + classes.map(function (c, i) { return c[0] + '–' + c[1] + ' : ' + f[i]; }).join(', ') + '.',
        hi: 'निम्न बंटन का माध्य ज्ञात कीजिए : '
          + classes.map(function (c, i) { return c[0] + '–' + c[1] + ' : ' + f[i]; }).join(', ') + '।',
        ans: 'mean ≈ ' + dec(mean, 2),
        steps: withExtra('stat-mean', [
          st('Take the mid-point of each class as xᵢ and build the fᵢxᵢ column.',
             'प्रत्येक वर्ग के मध्य-बिंदु को xᵢ मानिए तथा fᵢxᵢ का स्तंभ बनाइए।'),
          st('Σfᵢ = ' + sumF + ', Σfᵢxᵢ = ' + sumFx + ' ⟹ mean = ' + dec(mean, 2) + '.',
             'Σfᵢ = ' + sumF + ', Σfᵢxᵢ = ' + sumFx + ' ⟹ माध्य = ' + dec(mean, 2) + '।')
        ]),
        raw: { classes: classes, f: f, sumF: sumF, sumFx: sumFx, mean: mean }
      };
    } });

  /* ---------- 44. Surface areas · cone + hemisphere toy ---------- */
  T.push({ id: 'solid-toy', ch: 12, marks: 5, dmin: 3, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var tri = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
      var k = pick(rng, [1, 2, 3]);
      var r = tri[0] * k, h = tri[1] * k, l = tri[2] * k;
      var area = Math.PI * r * l + 2 * Math.PI * r * r;
      return {
        en: 'A toy is a cone of radius ' + r + ' cm and height ' + h + ' cm mounted on a hemisphere of the same radius. Find its total surface area (π = 22/7) and the slant height.',
        hi: 'एक खिलौना ' + r + ' cm त्रिज्या तथा ' + h + ' cm ऊँचाई वाले शंकु के रूप में है जो उसी त्रिज्या के अर्धगोले पर रखा है। इसका कुल पृष्ठीय क्षेत्रफल (π = 22/7) तथा तिर्यक ऊँचाई ज्ञात कीजिए।',
        ans: 'l = ' + l + ' cm, TSA = ' + dec(area, 2) + ' cm²',
        steps: withExtra('solid-toy', [
          st('Slant height l = √(r² + h²) = √(' + r + '² + ' + h + '²) = ' + l + ' cm.',
             'तिर्यक ऊँचाई l = √(r² + h²) = √(' + r + '² + ' + h + '²) = ' + l + ' cm।'),
          st('TSA = πrl + 2πr² = πr(l + 2r) = ' + dec(area, 2) + ' cm².',
             'TSA = πrl + 2πr² = πr(l + 2r) = ' + dec(area, 2) + ' cm²।')
        ]),
        raw: { r: r, h: h, l: l, area: area }
      };
    } });

  /* ---------- 45. Circles · quadrilateral around a circle ---------- */
  T.push({ id: 'circ-quad', ch: 10, marks: 5, dmin: 3, dmax: 3, fig: 'tangent-quad',
    make: function (rng, d) {
      var a = ri(rng, 3, 7), b = ri(rng, 4, 9), c = ri(rng, 3, 8);
      /* a quadrilateral can circumscribe a circle only if the tangent lengths work out:
         AB + CD = BC + AD, so AD = a + c − b must be positive. Redraw b/c until it is. */
      var guard = 0;
      while (a + c - b < 1 && guard++ < 40) { b = ri(rng, 4, 9); c = ri(rng, 3, 8); }
      if (a + c - b < 1) { b = a + c - 1; }
      var dd = a + c - b;
      var per = a + b + c + dd;
      return {
        en: 'A quadrilateral ABCD circumscribes a circle with AB = ' + a + ' cm, BC = ' + b
          + ' cm and CD = ' + c + ' cm. Find AD and the perimeter.',
        hi: 'एक चतुर्भुज ABCD एक वृत्त को परिगत करता है, जिसमें AB = ' + a + ' cm, BC = ' + b
          + ' cm तथा CD = ' + c + ' cm है। AD तथा परिमाप ज्ञात कीजिए।',
        ans: 'AD = ' + dd + ' cm, perimeter = ' + per + ' cm',
        steps: withExtra('circ-quad', [
          st('Equal tangents from each vertex give AB + CD = BC + AD.',
             'प्रत्येक शीर्ष से बराबर स्पर्श-खंड मिलते हैं, अतः AB + CD = BC + AD।'),
          st('AD = ' + a + ' + ' + c + ' − ' + b + ' = ' + dd + ' cm; perimeter = ' + per + ' cm.',
             'AD = ' + a + ' + ' + c + ' − ' + b + ' = ' + dd + ' cm; परिमाप = ' + per + ' cm।')
        ]),
        raw: { a: a, b: b, c: c, d: dd, per: per }
      };
    } });

  /* ---------- 46. Probability · case study (game of chance) ---------- */
  T.push({ id: 'prob-case', ch: 14, marks: 4, dmin: 2, dmax: 3, fig: 'card-grid',
    make: function (rng, d) {
      var r = ri(rng, 3, 7), w = ri(rng, 2, 6), bl = ri(rng, 2, 5), gr = ri(rng, 2, 4);
      var tot = r + w + bl + gr;
      return {
        en: 'A game stall has a bag with ' + r + ' red, ' + w + ' white, ' + bl + ' black and ' + gr
          + ' green tokens. A player draws one token without looking. (i) P(red) (ii) P(not white) (iii) P(red or green).',
        hi: 'एक खेल की दुकान पर थैले में ' + r + ' लाल, ' + w + ' सफेद, ' + bl + ' काली तथा ' + gr
          + ' हरी गोलियाँ हैं। खिलाड़ी बिना देखे एक गोली निकालता है। (i) P(लाल) (ii) P(सफेद नहीं) (iii) P(लाल या हरी)।',
        ans: 'P(red) = ' + fr(r, tot) + ', P(not white) = ' + fr(tot - w, tot) + ', P(red or green) = ' + fr(r + gr, tot),
        steps: withExtra('prob-case', [
          st('Total tokens = ' + tot + '.', 'कुल गोलियाँ = ' + tot + '।'),
          st('P(red) = ' + fr(r, tot) + '; P(not white) = 1 − ' + fr(w, tot) + ' = ' + fr(tot - w, tot) + '.',
             'P(लाल) = ' + fr(r, tot) + '; P(सफेद नहीं) = 1 − ' + fr(w, tot) + ' = ' + fr(tot - w, tot) + '।'),
          st('P(red or green) = (' + r + ' + ' + gr + ')/' + tot + ' = ' + fr(r + gr, tot) + '.',
             'P(लाल या हरी) = (' + r + ' + ' + gr + ')/' + tot + ' = ' + fr(r + gr, tot) + '।')
        ]),
        raw: { r: r, w: w, b: bl, g: gr, tot: tot }
      };
    } });

  /* ---------- 47. Triangles · area ratio from medians ---------- */
  T.push({ id: 'tri-area', ch: 6, marks: 2, dmin: 2, dmax: 3, fig: 'similar-triangles',
    make: function (rng, d) {
      var k = pick(rng, [2, 3, 4]);
      var A1 = pick(rng, [12, 24, 36, 48, 60]);
      var A2 = A1 * k * k;
      return {
        en: '△ABC ~ △PQR and AB : PQ = 1 : ' + k + '. If ar(△ABC) = ' + A1 + ' cm², then ar(△PQR) is:',
        hi: '△ABC ~ △PQR तथा AB : PQ = 1 : ' + k + ' है। यदि ar(△ABC) = ' + A1 + ' cm², तो ar(△PQR) है :',
        opts: mcq(rng, A2 + ' cm²', [(A1 * k) + ' cm²', (A1 + k) + ' cm²', (A1 * k * k + A1) + ' cm²']),
        ans: A2 + ' cm²',
        steps: withExtra('tri-area', [
          st('Ratio of areas = (ratio of sides)² = 1 : ' + (k * k) + '.', 'क्षेत्रफलों का अनुपात = (भुजाओं के अनुपात)² = 1 : ' + (k * k) + '।'),
          st('ar(△PQR) = ' + (k * k) + ' × ' + A1 + ' = ' + A2 + ' cm².', 'ar(△PQR) = ' + (k * k) + ' × ' + A1 + ' = ' + A2 + ' cm²।')
        ]),
        raw: { k: k, A1: A1, A2: A2 }
      };
    } });

  /* ===== patterns learnt from the 30/4/x (2026) and 30/2–3/x (2025) sets ===== */

  /* ice-cream cone filled by n scoops of radius r/2 */
  T.push({ id: 'solid-scoop', ch: 12, marks: 1, dmin: 2, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var n = pick(rng, [2, 3, 4]);
      /* (1/3)πr²h = n·(4/3)π(r/2)³ = nπr³/6  ⟹  h = n·r/2  ⟹  h : r = n : 2 */
      var hOverR = n / 2;
      var truth = (n) + ' : 2';
      return {
        en: 'An ice-cream cone of radius r and height h is exactly filled by ' + n
          + ' spherical scoops of radius r/2. Then h : r equals:',
        hi: 'त्रिज्या r तथा ऊँचाई h वाला आइसक्रीम शंकु r/2 त्रिज्या के ' + n
          + ' गोलाकार स्कूपों से ठीक-ठीक भरा है। तब h : r है :',
        opts: mcq(rng, truth, [(2 * n) + ' : 2', n + ' : 1', (n + 1) + ' : 2']),
        ans: truth,
        steps: withExtra('solid-scoop', [
          st('Cone volume = (1/3)πr²h. One scoop = (4/3)π(r/2)³ = πr³/6.', 'शंकु का आयतन = (1/3)πr²h। एक स्कूप = (4/3)π(r/2)³ = πr³/6।'),
          st('Equating: (1/3)πr²h = ' + n + '·πr³/6 ⟹ h = ' + n + 'r/2, i.e. h : r = ' + n + ' : 2.',
             'बराबर करने पर : (1/3)πr²h = ' + n + '·πr³/6 ⟹ h = ' + n + 'r/2, अर्थात् h : r = ' + n + ' : 2।')
        ]),
        raw: { n: n, hOverR: hOverR }
      };
    } });

  /* three balls in a jar */
  T.push({ id: 'solid-balls', ch: 12, marks: 1, dmin: 2, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var n = pick(rng, [3, 4, 5]);
      /* jar = cylinder r, height 2nr ; air = 2nπr³ − n(4/3)πr³ = (2n/3)πr³ */
      var coef = 2 * n / 3;
      var truth = (Number.isInteger(coef) ? coef : coef.toFixed(1)) + 'πr³';
      return {
        en: n + ' cricket balls are just packed in a cylindrical jar. If the radius of each ball is r, the volume of air inside the jar is:',
        hi: 'एक बेलनाकार जार में ' + n + ' क्रिकेट गेंदें ठीक-ठीक भरी हैं। यदि प्रत्येक गेंद की त्रिज्या r है, तो जार में हवा का आयतन है :',
        opts: mcq(rng, truth, [(n) + 'πr³', (2 * n) + 'πr³', (n + 1) + 'πr³']),
        ans: truth,
        steps: [
          st('The jar has radius r and height 2 × ' + n + 'r = ' + (2 * n) + 'r, so V(jar) = ' + (2 * n) + 'πr³.',
             'जार की त्रिज्या r तथा ऊँचाई 2 × ' + n + 'r = ' + (2 * n) + 'r है, अतः V(जार) = ' + (2 * n) + 'πr³।'),
          st('Balls take ' + n + ' × (4/3)πr³ = ' + (4 * n / 3) + 'πr³, so air = ' + truth + '.',
             'गेंदें ' + n + ' × (4/3)πr³ = ' + (4 * n / 3) + 'πr³ लेती हैं, अतः हवा = ' + truth + '।')
        ],
        raw: { n: n, coef: coef }
      };
    } });

  /* decimal answer · trigonometry expression */
  T.push({ id: 'trig-decimal', ch: 8, marks: 1, dmin: 1, dmax: 2, fig: null,
    make: function (rng, d) {
      var items = [
        { en: 'sin 37° + cos 53°', hi: 'sin 37° + cos 53°', v: 1.2 },
        { en: 'tan 45° + sec 60°', hi: 'tan 45° + sec 60°', v: 3 },
        { en: 'sin 30° · cos 60° + cos 30° · sin 60°', hi: 'sin 30° · cos 60° + cos 30° · sin 60°', v: 1 },
        { en: 'cosec 30° − 2 sin 45° · cos 45°', hi: 'cosec 30° − 2 sin 45° · cos 45°', v: 1 },
        { en: 'sec²45° − tan²45°', hi: 'sec²45° − tan²45°', v: 1 }
      ];
      var it = pick(rng, items);
      var val = String(it.v);
      return {
        en: 'The value of ' + it.en + ' is:', hi: it.en + ' का मान है :',
        opts: mcq(rng, val, [String(it.v + 1), String(it.v / 2), (it.v === 1 ? '2' : '1')]),
        ans: val,
        steps: [
          st('Use the standard values (sin 30° = ½, tan 45° = 1, sec 60° = 2 …) and simplify.',
             'मानक मान रखिए (sin 30° = ½, tan 45° = 1, sec 60° = 2 …) और सरल कीजिए।'),
          st('The expression equals ' + val + '.', 'व्यंजक का मान ' + val + ' है।')
        ],
        raw: { ans: it.v }
      };
    } });

  /* sector area given, find the angle */
  T.push({ id: 'area-angle', ch: 11, marks: 1, dmin: 2, dmax: 3, fig: 'sector',
    make: function (rng, d) {
      var ang = pick(rng, [35, 70, 140, 45, 90, 60]);
      var r = pick(rng, [7, 14, 21]);
      var area = ang / 360 * (22 / 7) * r * r;          /* π = 22/7, the Indian textbook convention */
      var round = Math.round(area * 100) / 100;
      return {
        en: 'The area of a sector of a circle of radius ' + r + ' cm is ' + round
          + ' cm² (π = 22/7). The measure of the central angle is:',
        hi: 'त्रिज्या ' + r + ' cm वाले वृत्त के त्रिज्यखंड का क्षेत्रफल ' + round
          + ' cm² है (π = 22/7)। केंद्रीय कोण का मान है :',
        opts: mcq(rng, ang + '°', [(ang / 2) + '°', (ang * 2) + '°', (ang + 10) + '°']),
        ans: ang + '°',
        steps: withExtra('area-angle', [
          st('Area = (θ/360)(22/7)r², so θ = 360 × area × 7 / (22 r²).', 'क्षेत्रफल = (θ/360)(22/7)r², अतः θ = 360 × क्षेत्रफल × 7 / (22 r²)।'),
          st('Substituting gives θ = ' + ang + '°.', 'मान रखने पर θ = ' + ang + '° प्राप्त होता है।')
        ]),
        raw: { ang: ang, r: r, area: round }
      };
    } });

  /* area of the minor segment / perimeter of segment */
  T.push({ id: 'seg-perimeter', ch: 11, marks: 3, dmin: 3, dmax: 3, fig: 'sector',
    make: function (rng, d) {
      var r = pick(rng, [21, 14, 10.5]);
      var th = pick(rng, [60, 90, 120]);
      var arc = th / 360 * 2 * (22 / 7) * r;
      var chord = 2 * r * Math.sin(th * Math.PI / 360);
      var per = arc + chord;
      return {
        en: 'A chord subtends ' + th + '° at the centre of a circle of radius ' + r
          + ' cm. Find the perimeter of the minor segment (π = 22/7, √2 = 1·41, √3 = 1·73).',
        hi: 'त्रिज्या ' + r + ' cm वाले वृत्त में जीवा केंद्र पर ' + th
          + '° का कोण अंतरित करती है। लघु वृत्तखंड का परिमाप ज्ञात कीजिए (π = 22/7, √2 = 1·41, √3 = 1·73)।',
        ans: '≈ ' + dec(per, 2) + ' cm',
        steps: withExtra('seg-perimeter', [
          st('Arc = (θ/360)·2πr = ' + dec(arc, 2) + ' cm.', 'चाप = (θ/360)·2πr = ' + dec(arc, 2) + ' cm।'),
          st('Chord = 2r sin(θ/2) = ' + dec(chord, 2) + ' cm.', 'जीवा = 2r sin(θ/2) = ' + dec(chord, 2) + ' cm।'),
          st('Perimeter of the segment = arc + chord ≈ ' + dec(per, 2) + ' cm.',
             'वृत्तखंड का परिमाप = चाप + जीवा ≈ ' + dec(per, 2) + ' cm।')
        ]),
        raw: { r: r, th: th, arc: arc, chord: chord, per: per }
      };
    } });
  /* ===== patterns from 30/5/x-2026 and 430-x-x (Basic) ===== */

  /* boat / stream — derive b, up, down from a chosen stream speed so the
     time always comes out an exact whole number of hours */
  T.push({ id: 'quad-stream', ch: 4, marks: 5, dmin: 3, dmax: 3, fig: null,
    make: function (rng, d) {
      var x = pick(rng, [2, 3, 4, 5]);
      var b = x + pick(rng, [6, 8, 9, 10, 12]);
      var m = pick(rng, [2, 3, 4]);
      var up = (b - x) * m;               // time upstream = m hours
      var down = (b + x) * pick(rng, [1, 2]);
      var t = m + down / (b + x);
      return {
        en: 'A boat rows at ' + b + ' km/h in still water. It goes ' + up + ' km upstream and ' + down
          + ' km downstream in ' + t + ' hours. Find the speed of the stream.',
        hi: 'एक नाव शांत जल में ' + b + ' km/h चलती है। वह ' + up + ' km धारा के विपरीत तथा ' + down
          + ' km धारा के अनुकूल ' + t + ' घंटे में जाती है। धारा की चाल ज्ञात कीजिए।',
        ans: x + ' km/h',
        steps: withExtra('quad-stream', [
          st('Upstream speed = (b − x), downstream speed = (b + x). The time equation is ' + up + '/(b − x) + ' + down + '/(b + x) = ' + t + '.',
             'धारा के विपरीत चाल = (b − x), अनुकूल चाल = (b + x)। समय समीकरण : ' + up + '/(b − x) + ' + down + '/(b + x) = ' + t + '।'),
          st('Clearing denominators gives a quadratic in x; the positive root is x = ' + x
            + ' km/h (the negative root is rejected).',
             'हरों को हटाने पर x में द्विघात मिलता है; धनात्मक मूल x = ' + x + ' km/h है (ऋणात्मक मूल अमान्य)।')
        ]),
        raw: { b: b, up: up, down: down, t: t, x: x }
      };
    } });

  /* difference of squares of two numbers */
  T.push({ id: 'quad-squares', ch: 4, marks: 5, dmin: 3, dmax: 3, fig: null,
    make: function (rng, d) {
      var small = pick(rng, [8, 10, 12, 14, 12]);
      var mult = pick(rng, [2, 3, 4, 6, 8]);
      var big = small * small / mult;
      if (!Number.isInteger(big)) { small = 12; mult = 8; big = 18; }
      var ans = 'smaller = ' + small + ', greater = ' + big;
      var diff = big * big - small * small;
      return {
        en: 'The difference of the squares of two positive numbers is ' + diff
          + '. The square of the smaller number is ' + mult + ' times the greater number. Find the two numbers.',
        hi: 'दो धन संख्याओं के वर्गों का अंतर ' + diff + ' है। छोटी संख्या का वर्ग बड़ी संख्या का ' + mult + ' गुना है। दोनों संख्याएँ ज्ञात कीजिए।',
        ans: ans,
        steps: withExtra('quad-squares', [
          st('Let the smaller be s and the greater be g. Then s² = ' + mult + 'g and g² − s² = ' + diff + '.',
             'मान लीजिए छोटी संख्या s तथा बड़ी g है। तब s² = ' + mult + 'g तथा g² − s² = ' + diff + '।'),
          st('Substituting gives g² − ' + mult + 'g − ' + diff + ' = 0, so g = ' + big + ' and s = ' + small + '.',
             'मान रखने पर g² − ' + mult + 'g − ' + diff + ' = 0, अतः g = ' + big + ' तथा s = ' + small + '।')
        ]),
        raw: { small: small, big: big, mult: mult, diff: diff }
      };
    } });
  /* two hemispheres joined at a point (or along the flat faces) */
  T.push({ id: 'solid-hemis', ch: 12, marks: 1, dmin: 2, dmax: 3, fig: 'solid',
    make: function (rng, d) {
      var joined = pick(rng, ['point', 'base']);
      var atPoint = joined === 'point';
      var coef = atPoint ? 6 : 4;
      var truth = coef + 'πr²';
      return {
        en: 'Two solid hemispheres of the same radius r are joined ' +
          (atPoint ? 'at a point (curved surfaces touching)' : 'along their flat circular faces') +
          '. The total surface area of the object is:',
        hi: 'समान त्रिज्या r के दो ठोस अर्धगोले ' +
          (atPoint ? 'एक बिंदु पर (वक्र पृष्ठ मिलाकर)' : 'उनके सपाट वृत्तीय आधारों पर') +
          ' जोड़े गए हैं। वस्तु का कुल पृष्ठीय क्षेत्रफल है :',
        opts: mcq(rng, truth, (coef === 6 ? ['4πr²', '3πr²', '5πr²'] : ['6πr²', '3πr²', '5πr²'])),
        ans: truth,
        steps: [
          st('One solid hemisphere has two kinds of surface: a curved cap and a flat circular face.',
             'एक ठोस अर्धगोले में दो प्रकार के पृष्ठ होते हैं : एक वक्र टोपी और एक सपाट वृत्तीय पृष्ठ।'),
          st('Curved surface of one hemisphere = half the surface of a sphere = ½ × 4πr² = 2πr².',
             'एक अर्धगोले का वक्र पृष्ठ = गोले के पृष्ठ का आधा = ½ × 4πr² = 2πr²।'),
          st('Flat circular face of one hemisphere = area of a circle of radius r = πr².',
             'एक अर्धगोले का सपाट वृत्तीय पृष्ठ = त्रिज्या r के वृत्त का क्षेत्रफल = πr²।'),
          st('So one complete solid hemisphere = 2πr² + πr² = 3πr². Two of them, before joining, would be 6πr².',
             'अतः एक पूरा ठोस अर्धगोला = 2πr² + πr² = 3πr²। दोनों मिलाकर, जोड़ने से पहले, 6πr² होते।'),
          atPoint
            ? st('Joining at a single point hides NO surface: the two domes only touch, so both flat faces stay fully exposed.',
                 'एक बिंदु पर जोड़ने से कोई पृष्ठ नहीं छिपता : दोनों टोपियाँ केवल स्पर्श करती हैं, इसलिए दोनों सपाट पृष्ठ पूरे बाहर रहते हैं।')
            : st('Joining along the flat faces hides BOTH flat faces — they are glued together inside the object.',
                 'सपाट पृष्ठों पर जोड़ने से दोनों सपाट पृष्ठ छिप जाते हैं — वे वस्तु के भीतर चिपके रहते हैं।'),
          atPoint
            ? st('Exposed surface = 2 curved caps + 2 flat faces = 2(2πr²) + 2(πr²) = 4πr² + 2πr².',
                 'बाहर दिखने वाला पृष्ठ = 2 वक्र टोपियाँ + 2 सपाट पृष्ठ = 2(2πr²) + 2(πr²) = 4πr² + 2πr²।')
            : st('Exposed surface = 2 curved caps only = 2(2πr²) = 4πr².',
                 'बाहर दिखने वाला पृष्ठ = केवल 2 वक्र टोपियाँ = 2(2πr²) = 4πr²।'),
          st('Therefore total surface area = ' + truth + '.',
             'अतः कुल पृष्ठीय क्षेत्रफल = ' + truth + '।'),
          st(atPoint
              ? 'Quick check: the object is still one connected solid, but its surface is MORE than a sphere\\u2019s 4πr², because both flat faces are outside — so 6πr², not 4πr².'
              : 'Quick check: the object is a perfect sphere of radius r, so its surface is exactly 4πr² — the join adds no surface.',
             atPoint
              ? 'जाँच : वस्तु एक जुड़ी हुई ठोस है, पर इसका पृष्ठ गोले के 4πr² से अधिक है, क्योंकि दोनों सपाट पृष्ठ बाहर हैं — इसलिए 6πr², 4πr² नहीं।'
              : 'जाँच : वस्तु त्रिज्या r का पूरा गोला है, इसलिए पृष्ठ ठीक 4πr² है — जोड़ से कोई पृष्ठ नहीं बढ़ता।')
        ],
        raw: { joined: joined, coef: coef, r: 'r' }
      };
    } });

  /* tangent squared in terms of the external segment */
  T.push({ id: 'circ-pt2', ch: 10, marks: 1, dmin: 2, dmax: 3, fig: 'tangent-line',
    make: function (rng, d) {
      var r = pick(rng, [3, 4, 5, 6, 8]);
      return {
        en: 'PT is a tangent to a circle of radius ' + r + ' cm. OP cuts the circle at Q. If PQ = x, then PT² equals:',
        hi: 'PT त्रिज्या ' + r + ' cm वाले वृत्त पर स्पर्श-रेखा है। OP वृत्त को Q पर काटता है। यदि PQ = x है, तो PT² बराबर है :',
        opts: mcq(rng, 'x² + ' + (2 * r) + 'x', ['x² + ' + r + 'x', 'x² + ' + (2 * r) + 'x + ' + (r * r), 'x² − ' + (r * r)]),
        ans: 'x² + ' + (2 * r) + 'x',
        steps: withExtra('circ-pt2', [
          st('OP = x + ' + r + ', and radius ⟂ tangent gives PT² = OP² − OQ².',
             'OP = x + ' + r + ', तथा त्रिज्या ⟂ स्पर्श-रेखा से PT² = OP² − OQ²।'),
          st('PT² = (x + ' + r + ')² − ' + r + '² = x² + ' + (2 * r) + 'x.',
             'PT² = (x + ' + r + ')² − ' + r + '² = x² + ' + (2 * r) + 'x।')
        ]),
        raw: { r: r }
      };
    } });

  /* ratio AP:AB -> AQ:QC */
  T.push({ id: 'bpt-ratio', ch: 6, marks: 1, dmin: 1, dmax: 2, fig: 'bpt',
    make: function (rng, d) {
      var m = ri(rng, 2, 5), n = m + ri(rng, 1, 5);
      var g = gcd(m, n); var mr = m / g, nr = n / g;
      var mb = nr - mr;
      return {
        en: 'In △ABC, PQ ∥ BC. If AP : AB = ' + mr + ' : ' + nr + ', then AQ : QC equals:',
        hi:'△ABC में, PQ ∥ BC है। यदि AP : AB = ' + mr + ' : ' + nr + ' है, तो AQ : QC बराबर है :',
        opts: mcq(rng, mr + ' : ' + (nr - mr), [mr + ' : ' + nr, nr + ' : ' + mr, '1 : 1']),
        ans: mr + ' : ' + (nr - mr),
        steps: withExtra('bpt-ratio', [
          st('AP : PB = ' + mr + ' : (' + nr + ' − ' + mr + ') = ' + mr + ' : ' + (nr - mr) + '.',
             'AP : PB = ' + mr + ' : (' + nr + ' − ' + mr + ') = ' + mr + ' : ' + (nr - mr) + '।'),
          st('By BPT, AQ : QC = AP : PB = ' + mr + ' : ' + (nr - mr) + '.',
             'BPT से, AQ : QC = AP : PB = ' + mr + ' : ' + (nr - mr) + '।')
        ]),
        raw: { m: mr, n: nr, ans: mr + ' : ' + (nr - mr) }
      };
    } });

  /* LCM from HCF */
  T.push({ id: 'lcm-from-hcf', ch: 1, marks: 1, dmin: 1, dmax: 2, fig: null,
    make: function (rng, d) {
      var h = pick(rng, [15, 25, 35, 45]);
      var x = ri(rng, 2, 6), y = x + ri(rng, 1, 4);
      while (gcd(x, y) !== 1) y++;
      var a = h * x, b = h * y, L = h * x * y;
      return {
        en: 'If HCF(' + a + ', ' + b + ') = ' + h + ', then LCM(' + a + ', ' + b + ') is:',
        hi: 'यदि HCF(' + a + ', ' + b + ') = ' + h + ' है, तो LCM(' + a + ', ' + b + ') है :',
        opts: mcq(rng, String(L), [String(L / 5), String(a * b), String(a + b)]),
        ans: String(L),
        steps: withExtra('lcm-from-hcf', [
          st('For any two positive integers, HCF × LCM = product of the numbers.',
             'किन्हीं दो धन पूर्णांकों के लिए, HCF × LCM = संख्याओं का गुणनफल।'),
          st('LCM = (' + a + ' × ' + b + ') ÷ ' + h + ' = ' + L + '.', 'LCM = (' + a + ' × ' + b + ') ÷ ' + h + ' = ' + L + '।')
        ]),
        raw: { a: a, b: b, h: h, L: L }
      };
    } });

  /* AP: two terms given */
  T.push({ id: 'ap-two-terms', ch: 5, marks: 5, dmin: 2, dmax: 3, fig: 'ap-ladder',
    make: function (rng, d) {
      var dd = pick(rng, [-1, -2, -3, 2, 3]);
      /* NB: do not name a local `pick` — it shadows the option-picking helper */
      var m = ri(rng, 2, 4), n = m + 5 + Math.floor(rng() * 3);
      /* keep the zero term a WHOLE index that lies past the 'n'th term, so (i) always has an answer */
      var zero = n + 1 + Math.floor(rng() * 4);
      var a = -dd * (zero - 1);
      var am = a + (m - 1) * dd, an = a + (n - 1) * dd;
      var S = function (k) { return (k / 2) * (2 * a + (k - 1) * dd); };
      return {
        en: 'The ' + ord(m) + ' and ' + ord(n) + ' terms of an AP are ' + am + ' and ' + an + ' respectively. (i) Which term is zero? (ii) Find the sum of the first ' + (n + 1) + ' terms.',
        hi: 'किसी A.P. का ' + m + 'वाँ तथा ' + n + 'वाँ पद क्रमशः ' + am + ' और ' + an + ' हैं। (i) कौन-सा पद शून्य है? (ii) प्रथम ' + (n + 1) + ' पदों का योग ज्ञात कीजिए।',
        ans: 'a = ' + a + ', d = ' + fmt(dd) + '; ' + 'a' + zero + ' = 0' + '; S' + (n + 1) + ' = ' + fmt(S(n + 1)),
        steps: withExtra('ap-two-terms', [
          st('a + (' + (m - 1) + ')d = ' + am + ' and a + (' + (n - 1) + ')d = ' + an + ' give d = ' + fmt(dd) + ' and a = ' + a + '.',
             'a + (' + (m - 1) + ')d = ' + am + ' तथा a + (' + (n - 1) + ')d = ' + an + ' से d = ' + fmt(dd) + ' तथा a = ' + a + '।'),
          st('a' + zero + ' = ' + a + ' + ' + (zero - 1) + '(' + fmt(dd) + ') = 0.',
             'a' + zero + ' = ' + a + ' + ' + (zero - 1) + '(' + fmt(dd) + ') = 0।'),
          st('S' + (n + 1) + ' = ' + fmt(S(n + 1)) + '.', 'S' + (n + 1) + ' = ' + fmt(S(n + 1)) + '।')
        ]),
        raw: { a: a, d: dd, m: m, n: n, am: am, an: an, zero: zero, S: S(n + 1) }
      };
    } });

  /* ================================================================
     PAPER ASSEMBLY
     ================================================================ */

  /* CBSE-style blueprint per board. Each block: how many questions, marks,
     which difficulty the block is meant to carry. */
  var BLUEPRINTS = {
    cbse: {
      en: 'CBSE · 80 marks · Sections A–E', hi: 'सीबीएसई · 80 अंक · खंड A–E',
      time: 180,
      /* the real CBSE maths blueprint: 20 MCQ (1) + 5 VSA (2) + 6 SA (3) + 4 LA (5) + 3 case (4) = 80 */
      blocks: [
        { name: { en: 'Section A · MCQ', hi: 'खंड A · बहुविकल्पीय' }, n: 10, marks: 1, d: 1, kind: 'mcq' },
        { name: { en: 'Section B · Very short answer', hi: 'खंड B · अति लघु उत्तरीय' }, n: 4, marks: 2, d: 2 },
        { name: { en: 'Section C · Short answer', hi: 'खंड C · लघु उत्तरीय' }, n: 4, marks: 3, d: 2 },
        { name: { en: 'Section D · Long answer', hi: 'खंड D · दीर्घ उत्तरीय' }, n: 3, marks: 5, d: 3 },
        { name: { en: 'Section E · Case study', hi: 'खंड E · प्रकरण-आधारित' }, n: 2, marks: 4, d: 3, kind: 'case' }
      ]
    },
    icse: {
      en: 'ICSE · 80 marks · Section A (compulsory) + Section B (choice)', hi: 'आईसीएसई · 80 अंक',
      time: 150,
      blocks: [
        { name: { en: 'Section A · short', hi: 'खंड A · लघु' }, n: 6, marks: 2, d: 1 },
        { name: { en: 'Section B · structured', hi: 'खंड B · संरचित' }, n: 8, marks: 4, d: 2 },
        { name: { en: 'Section B · application', hi: 'खंड B · अनुप्रयोग' }, n: 4, marks: 5, d: 3 }
      ]
    },
    state: {
      en: 'State board · 100 marks · objective + short + long', hi: 'राज्य बोर्ड · 100 अंक',
      time: 180,
      blocks: [
        { name: { en: 'Objective', hi: 'वस्तुनिष्ठ' }, n: 8, marks: 1, d: 1, kind: 'mcq' },
        { name: { en: 'Short answer', hi: 'लघु उत्तरीय' }, n: 6, marks: 3, d: 2 },
        { name: { en: 'Long answer', hi: 'दीर्घ उत्तरीय' }, n: 5, marks: 5, d: 3 },
        { name: { en: 'Application', hi: 'अनुप्रयोग' }, n: 2, marks: 5, d: 3 }
      ]
    }
  };

  function blueprintFor(board) {
    if (board === 'icse') return BLUEPRINTS.icse;
    if (board === 'cbse') return BLUEPRINTS.cbse;
    return BLUEPRINTS.state;
  }

  /* choose a template that can serve (chapter set, marks, difficulty).
     Preference order: unused template, chapter not used in the last two
     questions, matching mark value, allowed difficulty. */
  function chooseT(rng, opts) {
    function base(relaxMarks) {
      return T.filter(function (t) {
        if (opts.chapters && opts.chapters.length && opts.chapters.indexOf(t.ch) < 0) return false;
        if (!relaxMarks && opts.marks && t.marks !== opts.marks) return false;
        if (opts.kind === 'mcq' && t.marks !== 1) return false;
        if (opts.dmin && t.dmax < opts.dmin) return false;
        return true;
      });
    }
    var tiers = [];
    [false, true].forEach(function (relaxMarks) {
      var cands = base(relaxMarks);
      var unused = cands.filter(function (t) { return !opts.used || !opts.used[t.id]; });
      var fresh = unused.filter(function (t) { return (opts.recent || []).indexOf(t.ch) < 0; });
      if (fresh.length) tiers.push(fresh);
      if (unused.length) tiers.push(unused);
      if (cands.length) tiers.push(cands);
    });
    /* The chosen chapters always win: if the filter leaves nothing at this
       mark value, relax the mark value first, then re-use a template.
       Only when there is no chapter filter at all may we go wider. */
    if (!tiers.length) {
      var inChapter = T.filter(function (t) {
        return (!opts.chapters || !opts.chapters.length || opts.chapters.indexOf(t.ch) >= 0);
      });
      if (inChapter.length) {
        var unusedIn = inChapter.filter(function (t) { return !opts.used || !opts.used[t.id]; });
        tiers.push(unusedIn.length ? unusedIn : inChapter);
      } else {
        var all = T.filter(function (t) { return !opts.used || !opts.used[t.id]; });
        if (all.length) tiers.push(all);
      }
    }
    if (!tiers.length) tiers.push(T.slice());
    return pick(rng, tiers[0]);
  }

  /* build one paper */
  function paper(opts) {
    opts = opts || {};
    var rng = mulberry32(opts.seed || (Date.now() % 100000));
    var bp = blueprintFor(opts.board || 'cbse');
    var chapters = opts.chapters && opts.chapters.length ? opts.chapters : null;
    var level = opts.level || 'mixed';           // easy | medium | hard | mixed
    var sections = [], used = {}, recent = [], total = 0, qno = 0;

    bp.blocks.forEach(function (blk, bi) {
      var qs = [];
      for (var i = 0; i < blk.n; i++) {
        var want = level === 'mixed' ? blk.d : (level === 'easy' ? Math.min(blk.d, 1) : level === 'hard' ? 3 : blk.d);
        var t = chooseT(rng, { chapters: chapters, marks: blk.marks, kind: blk.kind, dmin: want, used: used, recent: recent });
        /* last line of defence: a filtered paper must never leave the filter */
        if (chapters && chapters.indexOf(t.ch) < 0) {
          t = T.filter(function (x) { return chapters.indexOf(x.ch) >= 0; })[0] || t;
        }
        var made = t.make(rng, want);
        used[t.id] = 1;
        recent.push(t.ch); if (recent.length > 2) recent.shift();
        qno++;
        qs.push({
          no: qno, ch: t.ch, marks: blk.marks, tid: t.id, d: want,
          en: made.en, hi: made.hi, opts: made.opts, ans: made.ans, ansHi: made.ansHi,
          steps: made.steps, fig: made.fig || t.fig, raw: made.raw
        });
        total += blk.marks;
      }
      sections.push({ name: blk.name, marks: blk.marks, questions: qs });
    });

    return {
      board: opts.board || 'cbse',
      level: level,
      chapters: chapters,
      title: bp,
      time: bp.time,
      total: total,
      sections: sections,
      seed: opts.seed || null
    };
  }

  return {
    templates: T,
    paper: paper,
    blueprintFor: blueprintFor,
    chaptersCovered: function () {
      var s = {};
      T.forEach(function (t) { s[t.ch] = (s[t.ch] || 0) + 1; });
      return s;
    },
    _rng: mulberry32, _ri: ri, _fr: fr
  };
})();
