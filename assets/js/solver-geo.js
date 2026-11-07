/* =====================================================================
   Upay · Multi-method solver — mensuration, circles, trigonometry,
   heights & distances, probability, similarity, plain arithmetic
   ===================================================================== */
window.UP = window.UP || {};
(function () {
  const L = (en, hi) => ({ en, hi });
  const N = UP.num, F = N.fmt;
  const PI = Math.PI;
  const pack = o => Object.assign({ approaches: [], related: [] }, o);
  const grab = (q, words) => {
    const s = UP.norm(q).toLowerCase();
    for (const w of words) {
      const m = s.match(new RegExp(w + '\\s*(?:=|is|of|का|की)?\\s*(\\d+(?:\\.\\d+)?)'));
      if (m) return parseFloat(m[1]);
    }
    return null;
  };

  /* ===================== MENSURATION ===================== */
  UP.solveMensuration = function (q) {
    const s = UP.norm(q).toLowerCase();
    const r = grab(s, ['radius', 'r', 'त्रिज्या']);
    const h = grab(s, ['height', 'h', 'ऊँचाई', 'ऊंचाई']);
    const d = grab(s, ['diameter', 'व्यास']);
    const R = r || (d ? d / 2 : null);
    if (!R) return null;
    if (!/radius|त्रिज्या|diameter|व्यास|\br\s*=|\bd\s*=/.test(s)) return null;
    if (!/sphere|गोल|cylinder|बेलन|cone|शंकु|hemisphere|अर्धगोल|frustum|छिन्नक|bucket|बाल्टी|tent|तंबू|melt|recast|पिघल/i.test(s)) return null;
    const isVol = /volume|volume|आयतन|घनफल|capacity|धारिता|litre|लीटर|melt|recast|पिघल|ढाल/i.test(s);
    const isSphere = /sphere|गोल/i.test(s) && !/hemisphere|अर्धगोल/i.test(s);
    const isHemi = /hemisphere|अर्धगोल/i.test(s);
    const isCyl = /cylinder|बेलन/i.test(s);
    const isCone = /cone|शंकु/i.test(s);
    const isFrus = /frustum|छिन्नक|bucket|बाल्टी/i.test(s);
    const approaches = [];
    let result = '';

    if (isCyl) {
      const V = PI * R * R * (h || 1), CSA = 2 * PI * R * (h || 1), TSA = 2 * PI * R * ((h || 1) + R);
      result = isVol ? `V = πr²h = ${N.piStr(V)} ≈ ${N.dec(V, 2)} cubic units` : `CSA = 2πrh = ${N.piStr(CSA)} ≈ ${N.dec(CSA, 2)}, TSA = ${N.piStr(TSA)} ≈ ${N.dec(TSA, 2)} sq units`;
      approaches.push({
        name: L('Formula method (πr²h)', 'सूत्र विधि (πr²h)'),
        tag: L('Direct substitution — the standard answer', 'सीधा प्रतिस्थापन — मानक उत्तर'),
        steps: [
          { t: L('Write the formula and list the known quantities with units.', 'सूत्र लिखिए और ज्ञात राशियाँ इकाइयों सहित लिखिए।'), m: `r = ${F(R)}, h = ${F(h || 1)}` },
          { t: L('Substitute without converting π yet, and keep units consistent.', 'π को अभी न बदलिए, मान रखिए और इकाइयाँ एक-सी रखिए।'), m: `V = π(${F(R)})²(${F(h || 1)}) = ${F(R * R * (h || 1))}π` },
          { t: L('Evaluate with π = 22/7 if r is a multiple of 7, else 3.14.', 'यदि r, 7 का गुणज हो तो π = 22/7 लीजिए, अन्यथा 3.14।'), m: `${F(R * R * (h || 1))} × ${(R * 7) % 7 === 0 ? '22/7' : '3.14'} = ${N.dec(V, 2)}` }
        ],
        why: L('The volume of a cylinder is the area of its circular base swept along its height — which is exactly πr² × h. Reading it that way means you can rebuild the formula if you forget it.',
                'बेलन का आयतन उसके वृत्तीय आधार के क्षेत्रफल को ऊँचाई तक खींचने से मिलता है — अर्थात् πr² × h। ऐसे समझने पर सूत्र भूल जाने पर भी बनाया जा सकता है।'),
        watch: L('Radius, not diameter. If the question gives diameter, halve it in the first line and write that step down.',
                 'त्रिज्या लीजिए, व्यास नहीं। यदि व्यास दिया हो तो पहली पंक्ति में उसे आधा कीजिए और वह चरण लिखिए।')
      });
      approaches.push({
        name: L('Proportional reasoning (scale check)', 'समानुपातिक तर्क (पैमाना जाँच)'),
        tag: L('Verifies the answer without recalculating', 'पुनः गणना के बिना उत्तर की पुष्टि'),
        steps: [
          { t: L('Note that volume grows with r² and h. Doubling the radius multiplies volume by 4, doubling the height multiplies it by 2.', 'ध्यान दीजिए कि आयतन r² और h के साथ बढ़ता है। त्रिज्या दोगुनी होने पर आयतन 4 गुना, ऊँचाई दोगुनी होने पर 2 गुना होता है।'), m: `V ∝ r²h` },
          { t: L('Check your numeric answer against neighbouring values — a cylinder of radius 3 and height 10 must hold about 282 cm³, not 28 or 2820.', 'अपने उत्तर को निकट मानों से जाँचिए — त्रिज्या 3 और ऊँचाई 10 वाले बेलन में लगभग 282 सेमी³ होना चाहिए, 28 या 2820 नहीं।'), m: `r = 3, h = 10 ⇒ V ≈ 283` }
        ],
        why: L('Dimensional reasoning catches decimal-place errors instantly, which is where most mensuration marks are lost.',
                'विमीय तर्क दशमलव-स्थान की त्रुटियाँ तुरंत पकड़ लेता है, और अधिकांश अंक वहीं कटते हैं।'),
        watch: L('Do not replace the full formula with this — it is a check, not a solution.', 'इसे पूरे सूत्र का विकल्प न बनाइए — यह जाँच है, हल नहीं।')
      });
    } else if (isSphere || isHemi) {
      const V = isHemi ? (2 / 3) * PI * R ** 3 : (4 / 3) * PI * R ** 3;
      const S = isHemi ? 3 * PI * R * R : 4 * PI * R * R;
      result = isVol ? `V = ${isHemi ? '(2/3)πr³' : '(4/3)πr³'} = ${N.dec(V, 2)} cubic units` : `Surface area = ${N.dec(S, 2)} sq units`;
      approaches.push({
        name: L('Direct volume formula', 'सीधा आयतन सूत्र'),
        tag: L('Two lines in the exam', 'परीक्षा में दो पंक्तियाँ'),
        steps: [
          { t: L('Identify the solid and write its volume formula.', 'ठोस पहचानिए और उसका आयतन सूत्र लिखिए।'), m: isHemi ? 'V = (2/3)πr³' : 'V = (4/3)πr³' },
          { t: L('Substitute the radius (halve the diameter first if given).', 'त्रिज्या रखिए (यदि व्यास दिया हो तो पहले आधा कीजिए)।'), m: `V = ${isHemi ? '(2/3)' : '(4/3)'}π(${F(R)})³ = ${N.dec(V, 2)}` }
        ],
        why: L('A sphere is exactly 2/3 of the cylinder of the same radius and height 2r — Archimedes proved it. That single picture explains both (4/3)πr³ and (2/3)πr³.',
                'गोला उसी त्रिज्या और 2r ऊँचाई वाले बेलन का ठीक 2/3 भाग है — आर्किमिडीज़ ने सिद्ध किया। यही चित्र (4/3)πr³ और (2/3)πr³ दोनों समझाता है।'),
        watch: L('A hemisphere has TSA 3πr², not 2πr² — the flat circular face counts too.', 'अर्धगोले का संपूर्ण पृष्ठ 3πr² होता है, 2πr² नहीं — सपाट वृत्तीय फलक भी गिना जाता है।')
      });
      approaches.push({
        name: L('Recasting / volume conservation', 'पुनर्निर्माण / आयतन संरक्षण'),
        tag: L('For "melted and recast" questions', '"पिघलाकर बनाया" प्रश्नों के लिए'),
        steps: [
          { t: L('State the conservation law: melting changes shape, never volume.', 'संरक्षण नियम लिखिए: पिघलाने से आकार बदलता है, आयतन नहीं।'), m: 'V(before) = V(after)' },
          { t: L('Equate the two volume formulas and cancel the common π and the powers.', 'दोनों आयतन सूत्रों को बराबर रखिए और सामान्य π तथा घातें काटिए।'), m: `R³ = n·r³  ⇒  n = (R/r)³` },
          { t: L('Solve for the unknown — usually the number of small solids or the new radius.', 'अज्ञात के लिए हल कीजिए — सामान्यतः छोटे ठोसों की संख्या या नई त्रिज्या।'), m: `n = (${F(R)}/r)³` }
        ],
        why: L('Volume is a measure of how much metal or water you have. Shaping it differently cannot create or destroy any of it, so the two volumes must match exactly.',
                'आयतन बताता है कि आपके पास कितनी धातु या जल है। आकार बदलने से वह न बनता है न नष्ट होता है, अतः दोनों आयतन बराबर ही होने चाहिए।'),
        watch: L('Convert all dimensions to the same unit before equating — mixing cm and m is the top error here.',
                 'बराबर करने से पहले सभी विमाएँ एक ही इकाई में लाइए — सेमी और मी मिलाना यहाँ सबसे बड़ी भूल है।')
      });
    } else if (isCone) {
      const hh = h || 1;
      const l = Math.sqrt(R * R + hh * hh);
      const V = (1 / 3) * PI * R * R * hh;
      const CSA = PI * R * l;
      result = isVol ? `V = (1/3)πr²h = ${N.dec(V, 2)} cubic units` : `l = √(r²+h²) = ${N.dec(l, 2)}, CSA = πrl = ${N.dec(CSA, 2)}`;
      approaches.push({
        name: L('Find slant height first', 'पहले तिर्यक ऊँचाई ज्ञात कीजिए'),
        tag: L('90% of cone questions need l before anything else', 'अधिकांश शंकु प्रश्नों में पहले l चाहिए'),
        steps: [
          { t: L('Use Pythagoras on the axial cross-section: the radius, the height and the slant height form a right triangle.', 'अक्षीय अनुप्रस्थ काट पर पाइथागोरस लगाइए: त्रिज्या, ऊँचाई और तिर्यक ऊँचाई समकोण त्रिभुज बनाती हैं।'), m: `l = √(${F(R)}² + ${F(hh)}²) = √(${R * R + hh * hh}) = ${N.dec(l, 3)}` },
          { t: L('Now substitute into the surface or volume formula as required.', 'अब आवश्यकता अनुसार पृष्ठ या आयतन सूत्र में रखिए।'), m: isVol ? `V = (1/3)π(${F(R)})²(${F(hh)}) = ${N.dec(V, 2)}` : `CSA = πrh… actually πrl = π(${F(R)})(${N.dec(l, 2)}) = ${N.dec(CSA, 2)}` }
        ],
        why: L('A cone is a right triangle rotated about its height. The slant height is the hypotenuse of that triangle, which is why it is longer than both r and h.',
                'शंकु एक समकोण त्रिभुज को उसकी ऊँचाई के परितः घुमाने से बनता है। तिर्यक ऊँचाई उस त्रिभुज का कर्ण है, इसीलिए वह r और h दोनों से बड़ी होती है।'),
        watch: L('Curved surface uses l, volume uses h. Mixing these two is the classic cone mistake.',
                 'वक्र पृष्ठ में l आता है, आयतन में h। इन दोनों को मिलाना शंकु की प्रसिद्ध भूल है।')
      });
    } else if (isFrus) {
      const r1 = R, r2 = r ? (grams => grams)(R / 2) : R / 2;
      const hh = h || 1;
      const V = (1 / 3) * PI * hh * (r1 * r1 + r2 * r2 + r1 * r2);
      result = `V = (1/3)πh(r₁² + r₂² + r₁r₂) = ${N.dec(V, 2)} cubic units (with r₂ = ${F(r2)})`;
      approaches.push({
        name: L('Frustum formula', 'छिन्नक सूत्र'),
        tag: L('The bucket / glass / lampshade pattern', 'बाल्टी / गिलास / लैंपशेड प्रारूप'),
        steps: [
          { t: L('Write the two radii clearly — top and bottom — and the vertical height.', 'दोनों त्रिज्याएँ — ऊपर और नीचे — तथा ऊर्ध्वाधर ऊँचाई स्पष्ट लिखिए।'), m: `r₁ = ${F(r1)}, r₂ = ${F(r2)}, h = ${F(hh)}` },
          { t: L('Substitute into V = ⅓πh(r₁² + r₂² + r₁r₂).', 'V = ⅓πh(r₁² + r₂² + r₁r₂) में मान रखिए।'), m: `V = ⅓π(${F(hh)})(${r1 * r1} + ${r2 * r2} + ${N.dec(r1 * r2, 2)})` },
          { t: L('Convert to litres if asked (1000 cm³ = 1 L).', 'यदि पूछा हो तो लीटर में बदलिए (1000 सेमी³ = 1 लीटर)।'), m: `V ≈ ${N.dec(V / 1000, 3)} L (if dimensions were in cm)` }
        ],
        why: L('A frustum is a big cone with a smaller similar cone removed. The formula is exactly "big cone − small cone", which is why all three terms appear.',
                'छिन्नक बड़ा शंकु है जिसमें से छोटा समरूप शंकु निकाला गया है। सूत्र ठीक "बड़ा शंकु − छोटा शंकु" है, इसीलिए तीनों पद आते हैं।'),
        watch: L('The slant height needs l = √[h² + (r₁ − r₂)²] — using l = √(r²+h²) is wrong for a frustum.',
                 'तिर्यक ऊँचाई l = √[h² + (r₁ − r₂)²] चाहिए — छिन्नक के लिए l = √(r²+h²) गलत है।')
      });
    } else {
      return null;
    }

    return pack({
      kind: 'mensuration', chapter: 12,
      title: { en: 'Surface area / volume — two routes', hi: 'पृष्ठीय क्षेत्रफल / आयतन — दो मार्ग' },
      summary: { en: `radius ${F(R)}${h ? ', height ' + F(h) : ''}`, hi: `त्रिज्या ${F(R)}${h ? ', ऊँचाई ' + F(h) : ''}` },
      result: { en: result, hi: result },
      approaches,
      verify: L('Check the unit: volume is cubic (cm³ / m³ / litres), area is square (cm² / m²). Also compare with a rough estimate before finalising.',
                'इकाई जाँचिए: आयतन घन (सेमी³ / मी³ / लीटर) में, क्षेत्रफल वर्ग (सेमी² / मी²) में। अंतिम उत्तर से पहले मोटे अनुमान से तुलना कीजिए।'),
      related: [11, 12],
      /* Name the actual solid.  This was `isCyl ? 'cylinder' : 'sphere'`, so a
         cone and a hemisphere were both drawn as a sphere, and every one of
         them carried the cylinder's formulas underneath the drawing. */
      _geom: (function () {
        const shape = isFrus ? 'frustum' : isCone ? 'cone' : isCyl ? 'cylinder' : isHemi ? 'hemisphere' : 'sphere';
        const F_ = {
          cylinder:  ['V = πr²h', 'CSA = 2πrh', 'TSA = 2πr(r + h)'],
          cone:      ['V = (1/3)πr²h', 'CSA = πrl', 'TSA = πr(l + r)'],
          sphere:    ['V = (4/3)πr³', 'SA = 4πr²'],
          hemisphere:['V = (2/3)πr³', 'CSA = 2πr²', 'TSA = 3πr²'],
          frustum:   ['V = (1/3)πh(r₁² + r₂² + r₁r₂)', 'CSA = πl(r₁ + r₂)']
        }[shape];
        return { solid: shape, r: R, h: h || null, formulas: F_ };
      })()
    });
  };

  /* ===================== SECTOR / SEGMENT ===================== */
  UP.solveSector = function (q) {
    const s = UP.norm(q).toLowerCase();
    /* "segment" alone is far too loose — "the line segment joining A and B" is
       coordinate geometry, not a circle segment. Require a circle word. */
    const circleish = /circle|वृत्त|radius|त्रिज्या|sector|त्रिज्यखंड|arc|चाप|minute hand|सुई/i.test(s);
    if (!circleish) return null;
    if (/line segment|रेखाखंड|joining/.test(s) && !/circle|वृत्त/.test(s)) return null;
    if (!/sector|segment|arc|त्रिज्यखंड|वृत्तखंड|चाप|minute hand|सुई/i.test(s)) return null;
    const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number);
    if (!nums.length) return null;
    let R = grab(s, ['radius', 'r', 'त्रिज्या']) || nums[0];
    let theta = grab(s, ['angle', 'कोण']) || nums.find(n => n > 0 && n <= 360 && n !== R) || 90;
    if (/minute hand|सुई/.test(s) && /min|मिनट/.test(s)) {
      const mins = nums.find(n => n <= 60) || 5;
      theta = mins * 6;
    }
    const th = theta;
    const areaS = (th / 360) * PI * R * R;
    const arc = (th / 360) * 2 * PI * R;
    const tri = 0.5 * R * R * Math.sin(th * PI / 180);
    const seg = areaS - tri;
    const isSeg = /segment|वृत्तखंड/i.test(s);

    return pack({
      kind: 'sector', chapter: 11,
      title: { en: 'Sector and segment — angle-first method', hi: 'त्रिज्यखंड और वृत्तखंड — कोण-प्रथम विधि' },
      summary: { en: `r = ${F(R)}, θ = ${F(th)}°`, hi: `r = ${F(R)}, θ = ${F(th)}°` },
      result: {
        en: isSeg ? `Minor segment = ${N.dec(seg, 2)} sq units` : `Sector area = ${N.piStr(areaS)} ≈ ${N.dec(areaS, 2)} sq units, arc = ${N.dec(arc, 2)} units`,
        hi: isSeg ? `लघु वृत्तखंड = ${N.dec(seg, 2)} वर्ग इकाई` : `त्रिज्यखंड का क्षेत्रफल = ${N.piStr(areaS)} ≈ ${N.dec(areaS, 2)} वर्ग इकाई, चाप = ${N.dec(arc, 2)} इकाई`
      },
      approaches: [
        {
          name: L('Angle-fraction method (θ/360)', 'कोण-भिन्न विधि (θ/360)'),
          tag: L('The standard, and the easiest to explain', 'मानक और समझाने में सबसे आसान'),
          steps: [
            { t: L('A sector is a fraction θ/360 of the whole circle, so every sector quantity is that fraction of the whole-circle quantity.', 'त्रिज्यखंड पूरे वृत्त का θ/360 भाग है, अतः त्रिज्यखंड की प्रत्येक राशि पूरे वृत्त की राशि का वही भाग है।'), m: `fraction = ${F(th)}/360 = ${N.dec(th / 360, 4)}` },
            { t: L('Multiply the full area by the fraction.', 'पूरे क्षेत्रफल को भिन्न से गुणा कीजिए।'), m: `π(${F(R)})² × ${F(th)}/360 = ${N.dec(areaS, 2)}` },
            { t: L('Do the same for the arc length.', 'चाप की लंबाई के लिए भी वही कीजिए।'), m: `2π(${F(R)}) × ${F(th)}/360 = ${N.dec(arc, 2)}` }
          ],
          why: L('Area grows with the angle, so a straight proportion is all you need — no new formula is required, only a fraction of πr².',
                  'क्षेत्रफल कोण के साथ बढ़ता है, अतः केवल सीधा समानुपात चाहिए — नया सूत्र आवश्यक नहीं, केवल πr² का एक भाग।'),
          watch: L('θ must be in degrees. If radians are given, the formula changes to ½r²θ.',
                  'θ डिग्री में होना चाहिए। यदि रेडियन में दिया हो तो सूत्र ½r²θ हो जाता है।')
        },
        {
          name: L('Unitary method (1° at a time)', 'ऐकिक विधि (1° के लिए)'),
          tag: L('Great when you forget the formula', 'सूत्र भूल जाने पर उत्तम'),
          steps: [
            { t: L('Find the area per degree by dividing the full circle area by 360.', 'पूरे वृत्त का क्षेत्रफल 360 से भाग देकर प्रति डिग्री क्षेत्रफल निकालिए।'), m: `1° ⟶ π(${F(R)})²/360 = ${N.dec(PI * R * R / 360, 4)}` },
            { t: L('Multiply by the number of degrees in the sector.', 'त्रिज्यखंड के अंशों से गुणा कीजिए।'), m: `${F(th)}° ⟶ ${N.dec(areaS, 2)}` }
          ],
          why: L('This is the same proportion, but thinking per-degree makes it obvious why the denominator is 360 and not 100.',
                  'यह वही अनुपात है, पर प्रति-डिग्री सोचने से स्पष्ट होता है कि हर 360 क्यों है, 100 क्यों नहीं।'),
          watch: L('Slow for many parts — do not use it in a long multi-part question.', 'कई भागों में धीमा — लंबे बहु-भागीय प्रश्न में प्रयोग न कीजिए।')
        },
        {
          name: L('Segment = sector − triangle', 'वृत्तखंड = त्रिज्यखंड − त्रिभुज'),
          tag: L('Needed whenever the word "segment" appears', 'जब "वृत्तखंड" शब्द हो तब आवश्यक'),
          steps: [
            { t: L('Compute the sector area as above.', 'ऊपर की तरह त्रिज्यखंड का क्षेत्रफल निकालिए।'), m: `sector = ${N.dec(areaS, 2)}` },
            { t: L('Compute the triangle formed by the two radii and the chord. For 90° it is ½r²; in general ½r² sin θ.', 'दो त्रिज्याओं व जीवा से बना त्रिभुज निकालिए। 90° पर यह ½r² है; सामान्यतः ½r² sin θ।'), m: `triangle = ½(${F(R)})² sin ${F(th)}° = ${N.dec(tri, 2)}` },
            { t: L('Subtract.', 'घटाइए।'), m: `segment = ${N.dec(areaS, 2)} − ${N.dec(tri, 2)} = ${N.dec(seg, 2)}` }
          ],
          why: L('A segment is literally the sector with the triangular part cut away, so subtraction is not a trick — it is the definition.',
                  'वृत्तखंड वास्तव में त्रिज्यखंड है जिसमें से त्रिभुज काट दिया गया है, अतः घटाना युक्ति नहीं — परिभाषा है।'),
          watch: L('A major segment is circle − minor segment. Do not forget the perimeter: chord + arc.',
                  'दीर्घ वृत्तखंड = वृत्त − लघु वृत्तखंड। परिमाप न भूलिए: जीवा + चाप।')
        }
      ],
      verify: L(`The sector area must be less than the whole circle ${N.dec(PI * R * R, 2)}, and the segment must be less than the sector. Check both.`,
                `त्रिज्यखंड का क्षेत्रफल पूरे वृत्त ${N.dec(PI * R * R, 2)} से कम होना चाहिए, और वृत्तखंड त्रिज्यखंड से कम। दोनों जाँचिए।`),
      related: [11],
      _geom: { r: R, theta: th, area: UP.num.piStr(areaS), arc: N.dec(arc, 2) }
    });
  };

  /* ===================== TRIGONOMETRY ===================== */
  const STD = {
    0: { sin: 0, cos: 1 }, 30: { sin: 0.5, cos: Math.sqrt(3) / 2 }, 45: { sin: Math.sqrt(2) / 2, cos: Math.sqrt(2) / 2 },
    60: { sin: Math.sqrt(3) / 2, cos: 0.5 }, 90: { sin: 1, cos: 0 }
  };
  const pretty = v => {
    if (Math.abs(v - 0) < 1e-9) return '0';
    if (Math.abs(v - 0.5) < 1e-9) return '1/2';
    if (Math.abs(v - 1) < 1e-9) return '1';
    if (Math.abs(v - Math.sqrt(3) / 2) < 1e-9) return '√3/2';
    if (Math.abs(v - Math.sqrt(2) / 2) < 1e-9) return '1/√2';
    if (Math.abs(v - Math.sqrt(3)) < 1e-9) return '√3';
    if (Math.abs(v - 1 / Math.sqrt(3)) < 1e-9) return '1/√3';
    return N.dec(v, 3);
  };

  UP.solveTrig = function (q) {
    const s = UP.norm(q).toLowerCase()
      .replace(/(sin|cos|tan|cot|sec|cosec)\s*\^\s*2/g, '$1²')
      .split('^').join('').replace(/\s+/g, ' ');
    if (!/(sin|cos|tan|cot|sec|cosec|θ|theta|त्रिकोणमिति)/.test(s)) return null;

    /* 0. one ratio is given numerically → find the other two ratios exactly */
    const mGiven = s.match(/(sin|cos|tan|cot|sec|cosec)\s*([a-z])?\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/);
    if (mGiven && /find|calculate|ज्ञात|निकाल|evaluate/.test(s)) {
      const fn = mGiven[1], num = parseFloat(mGiven[3]), den = parseFloat(mGiven[4]);
      const ang = (mGiven[2] || 'a').toUpperCase();
      const ratio = num / den;
      const sq = (x) => UP.num.exactly(x);
      let sinv, cosv, tanv;
      if (fn === 'sin' || fn === 'cosec') {
        sinv = fn === 'sin' ? ratio : 1 / ratio;
        cosv = Math.sqrt(Math.max(0, 1 - sinv * sinv));
        tanv = sinv / cosv;
      } else if (fn === 'cos' || fn === 'sec') {
        cosv = fn === 'cos' ? ratio : 1 / ratio;
        sinv = Math.sqrt(Math.max(0, 1 - cosv * cosv));
        tanv = sinv / cosv;
      } else {
        tanv = fn === 'tan' ? ratio : 1 / ratio;
        const hyp = Math.sqrt(1 + tanv * tanv);
        sinv = tanv / hyp;
        cosv = 1 / hyp;
      }
      const f3 = (v) => UP.num.exactly(v);
      const third = Math.sqrt(Math.max(0, den * den - num * num));
      const tri = (fn === 'tan' || fn === 'cot')
        ? `opposite = ${num}, adjacent = ${den}, hypotenuse = √(${num}² + ${den}²)`
        : `opposite = ${num}, hypotenuse = ${den}, adjacent = √(${den}² − ${num}²) = ${Number.isInteger(third) ? third : `√${den * den - num * num}`}`;
      return pack({
        kind: 'trig-ratios', chapter: 8,
        title: { en: 'One ratio given — find the others', hi: 'एक अनुपात दिया है — शेष ज्ञात कीजिए' },
        summary: { en: `${fn} ${ang} = ${num}/${den}`, hi: `${fn} ${ang} = ${num}/${den}` },
        result: (() => {
          const all = { sin: sinv, cos: cosv, tan: tanv, cot: 1 / tanv, sec: 1 / cosv, cosec: 1 / sinv };
          const given = fn === 'cosec' ? 'cosec' : fn;
          const wanted = /sin|cos|tan|cot|sec|cosec/.test(s) ? ['sin', 'cos', 'tan'] : ['sin', 'cos', 'tan'];
          const parts = wanted.filter(k => k !== (given === 'sec' ? 'cos' : given === 'cot' ? 'tan' : given)).map(k => `${k} ${ang} = ${f3(all[k])}`);
          return { en: parts.join(',  '), hi: parts.join(',  ') };
        })(),
        approaches: [
          {
            name: L('Right-triangle picture', 'समकोण त्रिभुज चित्र'),
            tag: L('The expected NCERT method', 'एनसीईआरटी में अपेक्षित विधि'),
            steps: [
              { t: L('Draw the right triangle and label the two known sides from the given ratio.', 'समकोण त्रिभुज बनाइए और दिए अनुपात से ज्ञात दो भुजाएँ अंकित कीजिए।'), m: tri },
              { t: L('Use Pythagoras to get the third side.', 'तीसरी भुजा के लिए पाइथागोरस लगाइए।'), m: `AC² = AB² + BC²  ⟹  third side = ${Number.isInteger(third) ? third : `√${den * den - num * num}`}` },
              { t: L('Read the other two ratios straight off the triangle.', 'त्रिभुज से शेष दो अनुपात सीधे पढ़िए।'), m: `cos ${ang} = ${f3(cosv)},  tan ${ang} = ${f3(tanv)}` }
            ],
            why: L('A ratio only fixes the shape of the triangle, not its size — so you may choose any convenient scale. Choosing the sides as whole numbers keeps the arithmetic exact.',
                    'अनुपात केवल त्रिभुज का आकार तय करता है, माप नहीं — अतः कोई भी सुविधाजनक माप चुन सकते हैं। भुजाएँ पूर्ण संख्याओं में चुनने से गणना सटीक रहती है।'),
            watch: L('Do not draw the triangle with the wrong side opposite the angle — that single mistake flips sin and cos.', 'त्रिभुज में कोण के सम्मुख गलत भुजा न अंकित करें — इसी एक भूल से sin और cos बदल जाते हैं।')
          },
          {
            name: L('Identity route', 'सर्वसमिका मार्ग'),
            tag: L('No figure needed', 'चित्र की आवश्यकता नहीं'),
            steps: [
              { t: L('Start from sin²θ + cos²θ = 1.', 'sin²θ + cos²θ = 1 से आरंभ कीजिए।'), m: `cos²${ang} = 1 − sin²${ang} = 1 − (${num}/${den})²` },
              { t: L('Take the positive root, because the angle is acute.', 'धनात्मक मूल लीजिए, क्योंकि कोण न्यून है।'), m: `cos ${ang} = ${f3(cosv)}` },
              { t: L('Divide to get tan.', 'भाग देकर tan निकालिए।'), m: `tan ${ang} = sin ${ang} / cos ${ang} = ${f3(tanv)}` }
            ],
            why: L('The Pythagorean identity is the triangle picture written algebraically, so it gives the same answer without any drawing — useful when you are short of time.',
                    'पाइथागोरस सर्वसमिका वही त्रिभुज-चित्र बीजगणित के रूप में है, अतः बिना चित्र के वही उत्तर मिलता है — समय कम हो तब उपयोगी।'),
            watch: L('sin²θ means (sin θ)², not sin(θ²). Squaring the whole ratio, not the angle, is the point.', 'sin²θ का अर्थ (sin θ)² है, sin(θ²) नहीं। पूरे अनुपात का वर्ग कीजिए, कोण का नहीं।')
          }
        ],
        verify: L(`Check: sin²${ang} + cos²${ang} = ${UP.num.dec(sinv * sinv + cosv * cosv, 4)} (must be 1) and tan ${ang} = ${UP.num.dec(tanv, 4)}.`,
                  `जाँचिए: sin²${ang} + cos²${ang} = ${UP.num.dec(sinv * sinv + cosv * cosv, 4)} (1 होना चाहिए) तथा tan ${ang} = ${UP.num.dec(tanv, 4)}.`),
        related: [8]
      });
    }

    /* A. complementary-angle equation: tan 2A = cot(A − 18°) */
    const comp = s.match(/(?:tan|sin|sec)\s*(\d)?\s*([a-z])?\s*=\s*(?:cot|cos|cosec)\s*\(?\s*([a-z])?\s*-\s*(\d+)/);
    if (comp && /find|ज्ञात|value|solve/.test(s)) {
      const k1 = comp[1] ? +comp[1] : 1, known = +comp[4];
      const total = 90 + known;
      const A = total / (k1 + 1);
      return pack({
        kind: 'trig-identity', chapter: 8,
        title: { en: 'Complementary angles — three routes', hi: 'पूरक कोण — तीन मार्ग' },
        summary: { en: `tan ${k1 === 1 ? '' : k1}A = cot(A − ${known}°)`, hi: `tan ${k1 === 1 ? '' : k1}A = cot(A − ${known}°)` },
        result: { en: `A = ${N.dec(A, 3)}°`, hi: `A = ${N.dec(A, 3)}°` },
        approaches: [
          {
            name: L('Turn cot into tan of the complementary angle', 'cot को पूरक कोण के tan में बदलिए'),
            tag: L('The expected board method', 'बोर्ड में अपेक्षित विधि'),
            steps: [
              { t: L('Both sides must use the same function before angles can be compared. Use cot θ = tan(90° − θ).', 'कोणों की तुलना से पहले दोनों पक्षों में एक ही फलन चाहिए। cot θ = tan(90° − θ) लगाइए।'),
                m: `cot(A − ${known}°) = tan(90° − (A − ${known}°)) = tan(${90 + known}° − A)` },
              { t: L('Equate the angles — tan is one-to-one in the acute range.', 'कोणों को बराबर कीजिए — न्यून परिसर में tan एकैकी है।'),
                m: `${k1}A = ${90 + known}° − A` },
              { t: L('Solve the linear equation and check that both angles remain acute.', 'रैखिक समीकरण हल कीजिए और जाँचिए कि दोनों कोण न्यून रहें।'),
                m: `${k1 + 1}A = ${total}° ⟹ A = ${N.dec(A, 3)}°` }
            ],
            why: L('Two different functions cannot be compared directly. Making them the same turns trigonometry into simple arithmetic.',
                    'दो भिन्न फलनों की सीधी तुलना नहीं हो सकती। उन्हें एक करने से त्रिकोणमिति साधारण अंकगणित बन जाती है।'),
            watch: L('Check that A − ' + known + '° is still a positive acute angle; discard any value that breaks this.',
                    'जाँचिए कि A − ' + known + '° अभी भी धनात्मक न्यून कोण है; ऐसा न करने वाला मान छोड़ दीजिए।')
          },
          {
            name: L('Work with a trial value and verify', 'परीक्षण मान से सत्यापन'),
            tag: L('Fast sanity check in a one-mark question', 'एक-अंक प्रश्न में शीघ्र जाँच'),
            steps: [
              { t: L('Put your candidate value back into both sides and evaluate as decimals.', 'अपना प्राप्त मान दोनों पक्षों में रखकर दशमलव में मान निकालिए।'),
                m: `LHS = tan(${k1}×${N.dec(A, 2)}°) = ${N.dec(Math.tan(k1 * A * PI / 180), 4)}
RHS = cot(${N.dec(A - known, 2)}°) = ${N.dec(1 / Math.tan((A - known) * PI / 180), 4)}` },
              { t: L('If both decimals match, the value is correct. If not, solve again algebraically.', 'यदि दोनों दशमलव मेल खाएँ तो मान सही है; अन्यथा पुनः बीजगणित से हल कीजिए।'),
                m: `LHS = RHS ✓` }
            ],
            why: L('Numeric substitution catches sign errors that are invisible in symbol-pushing, and costs about ten seconds.',
                    'संख्यात्मक प्रतिस्थापन वे चिह्न-त्रुटियाँ पकड़ता है जो प्रतीकों में छिपी रहती हैं, और इसमें लगभग दस सेकंड लगते हैं।'),
            watch: L('This verifies only — the algebraic lines are what earn the marks.', 'यह केवल सत्यापन है — अंक बीजगणितीय पंक्तियों पर मिलते हैं।')
          }
        ],
        verify: L(`Put A = ${N.dec(A, 3)}° back: tan(${N.dec(k1 * A, 2)}°) and cot(${N.dec(A - known, 2)}°) must be equal, and all angles must be acute.`,
                  `A = ${N.dec(A, 3)}° वापस रखिए: tan(${N.dec(k1 * A, 2)}°) तथा cot(${N.dec(A - known, 2)}°) बराबर होने चाहिए, और सभी कोण न्यून होने चाहिए।`),
        related: [8]
      });
    }

    /* B. one ratio given, find the others */
    const given = s.match(/(sin|cos|tan|cot|sec|cosec)\s*[a-z]?\s*=\s*(√\s*\d+|\d+(?:\.\d+)?)\s*(?:\/\s*(√\s*\d+|\d+(?:\.\d+)?))?/);
    if (given && /find|calculate|ज्ञात|निकाल|value of/.test(s)) {
      const fn = given[1];
      const num = x => x ? (String(x).includes('√') ? Math.sqrt(parseFloat(String(x).replace(/[^0-9.]/g, ''))) : parseFloat(x)) : 1;
      let p = num(given[2]), qq = given[3] ? num(given[3]) : 1;
      const ratio = p / qq;
      let sin, cos, tan;
      if (fn === 'sin') { sin = ratio; cos = Math.sqrt(Math.max(0, 1 - sin * sin)); tan = sin / cos; }
      else if (fn === 'cos') { cos = ratio; sin = Math.sqrt(Math.max(0, 1 - cos * cos)); tan = sin / cos; }
      else if (fn === 'tan') { tan = ratio; cos = 1 / Math.sqrt(1 + tan * tan); sin = tan * cos; }
      else if (fn === 'cot') { tan = 1 / ratio; cos = 1 / Math.sqrt(1 + tan * tan); sin = tan * cos; }
      else if (fn === 'sec') { cos = 1 / ratio; sin = Math.sqrt(Math.max(0, 1 - cos * cos)); tan = sin / cos; }
      else { sin = 1 / ratio; cos = Math.sqrt(Math.max(0, 1 - sin * sin)); tan = sin / cos; }
      const third = Math.sqrt(Math.max(0, Math.abs(qq * qq - p * p)));
      return pack({
        kind: 'trig-ratio', chapter: 8,
        title: { en: 'Trigonometric ratios from one ratio — three ways', hi: 'एक अनुपात से त्रिकोणमितीय अनुपात — तीन विधियाँ' },
        summary: { en: `Given ${fn} A = ${given[2]}${given[3] ? ' / ' + given[3] : ''}`, hi: `दिया है ${fn} A = ${given[2]}${given[3] ? ' / ' + given[3] : ''}` },
        result: { en: `sin A = ${N.dec(sin, 4)}, cos A = ${N.dec(cos, 4)}, tan A = ${N.dec(tan, 4)}`, hi: `sin A = ${N.dec(sin, 4)}, cos A = ${N.dec(cos, 4)}, tan A = ${N.dec(tan, 4)}` },
        approaches: [
          {
            name: L('Right-triangle method (SOH-CAH-TOA)', 'समकोण त्रिभुज विधि'),
            tag: L('Fastest and safest', 'सबसे तेज़ और सुरक्षित'),
            steps: [
              { t: L(`Draw a right triangle and mark the given ratio. ${fn} A = opposite/hypotenuse fixes two sides immediately.`, `समकोण त्रिभुज बनाइए और दिया अनुपात अंकित कीजिए। ${fn} A = लंब/कर्ण से दो भुजाएँ तुरंत तय होती हैं।`),
                m: `${fn} A = ${given[2]}${given[3] ? ' / ' + given[3] : ''}` },
              { t: L('Find the third side with Pythagoras.', 'पाइथागोरस से तीसरी भुजा ज्ञात कीजिए।'),
                m: `third side = √(${N.dec(qq, 3)}² − ${N.dec(p, 3)}²) = ${N.dec(third, 4)}` },
              { t: L('Read the other ratios off the same triangle.', 'उसी त्रिभुज से अन्य अनुपात पढ़िए।'),
                m: `sin A = ${N.dec(sin, 4)}
cos A = ${N.dec(cos, 4)}
tan A = ${N.dec(tan, 4)}` }
            ],
            why: L('All six ratios come from one triangle, so you never need to recall a formula — only which side is opposite and which is adjacent.',
                    'सभी छह अनुपात एक ही त्रिभुज से मिलते हैं, अतः कोई सूत्र याद रखने की आवश्यकता नहीं — केवल यह कि कौन-सी भुजा लंब और कौन-सी आधार है।'),
            watch: L('The hypotenuse is always the longest side. If your adjacent side comes out longer, you squared wrongly.',
                    'कर्ण सदैव सबसे बड़ी भुजा है। यदि आधार कर्ण से बड़ा आए तो वर्ग गलत हुआ है।')
          },
          {
            name: L('Identity method (sin²A + cos²A = 1)', 'सर्वसमिका विधि'),
            tag: L('No diagram needed — pure algebra', 'चित्र की आवश्यकता नहीं — शुद्ध बीजगणित'),
            steps: [
              { t: L('Use the parent identity to obtain the second ratio directly.', 'मूल सर्वसमिका से दूसरा अनुपात सीधे निकालिए।'),
                m: `cos²A = 1 − sin²A = 1 − (${N.dec(sin, 5)})² = ${N.dec(cos * cos, 5)}` },
              { t: L('Take the positive root, because the angle is acute.', 'धनात्मक मूल लीजिए, क्योंकि कोण न्यून है।'),
                m: `cos A = ${N.dec(cos, 4)}` },
              { t: L('Divide to get tan A.', 'भाग देकर tan A निकालिए।'),
                m: `tan A = sin A / cos A = ${N.dec(tan, 4)}` }
            ],
            why: L('The identity is Pythagoras in disguise, so it must agree with the triangle method. Using it shows why the identities are true, not just how to state them.',
                    'सर्वसमिका छद्म रूप में पाइथागोरस ही है, अतः यह त्रिभुज विधि से मेल खानी ही चाहिए। इसका प्रयोग सर्वसमिकाएँ सत्य क्यों हैं, यह दिखाता है।'),
            watch: L('For obtuse angles cos can be negative — the identity alone will not tell you the sign.',
                    'अधिक कोणों के लिए cos ऋणात्मक हो सकता है — केवल सर्वसमिका चिह्न नहीं बताती।')
          },
          {
            name: L('Pythagorean-triple recognition', 'पाइथागोरस त्रिक पहचान'),
            tag: L('Two seconds if you know the triples', 'त्रिक ज्ञात हों तो दो सेकंड'),
            steps: [
              { t: L('Board questions reuse a small set of triples: 3-4-5, 5-12-13, 7-24-25, 8-15-17, 9-40-41.', 'बोर्ड के प्रश्न कुछ ही त्रिक दोहराते हैं: 3-4-5, 5-12-13, 7-24-25, 8-15-17, 9-40-41।'),
                m: `recognise: ${given[2]}${given[3] ? ' : ' + given[3] : ''}` },
              { t: L('Scale the triple to the given fraction and read all ratios.', 'त्रिक को दी भिन्न तक पैमाना दीजिए और सभी अनुपात पढ़िए।'),
                m: `sin = ${N.dec(sin, 4)}, cos = ${N.dec(cos, 4)}, tan = ${N.dec(tan, 4)}` }
            ],
            why: L('Recognising a triple removes the arithmetic entirely and leaves time for the reasoning marks.',
                    'त्रिक पहचानने से गणना ही नहीं रहती और तर्क के अंक के लिए समय बचता है।'),
            watch: L('Only trust this when the numbers really form a triple — verify by squaring first.',
                    'यह तभी मानिए जब संख्याएँ वास्तव में त्रिक बनाएँ — पहले वर्ग करके जाँचिए।')
          }
        ],
        verify: L('Check numerically that sin²A + cos²A is exactly 1 and tan A = sin A / cos A.', 'संख्यात्मक रूप से जाँचिए कि sin²A + cos²A ठीक 1 है और tan A = sin A / cos A।'),
        related: [8]
      });
    }

    /* C. evaluate a numeric expression of standard angles */
    const termRe = /([+-])? *([0-9]+(?:[.][0-9]+)?)? *(sin|cos|tan|cot|sec|cosec) *(²|\^2)? *([0-9]{1,3}) *°?/g;
    const terms = [...s.matchAll(termRe)];
    /* This evaluator can only ADD up terms. A quotient like
       tan²60 / (sin²60 + cos²30) would be summed and silently reported as a
       wrong number, so refuse anything with a division or a bracket first. */
    const quotient = /[)\]0-9²°]\s*\/\s*[(0-9a-z]/.test(s) || /\(.*\)/.test(s.replace(/°[^/]/g, ''));
    if (terms.length && !quotient) {
      let total = 0, lines = [], ok = true;
      terms.forEach(m => {
        const sign = m[1] === '-' ? -1 : 1, coef = m[2] ? parseFloat(m[2]) : 1, fn = m[3], squared = !!m[4], ang = +m[5];
        const st = STD[ang];
        let v = NaN;
        if (st) {
          if (fn === 'sin') v = st.sin; else if (fn === 'cos') v = st.cos;
          else if (fn === 'tan') v = st.cos === 0 ? NaN : st.sin / st.cos;
          else if (fn === 'cot') v = st.sin === 0 ? NaN : st.cos / st.sin;
          else if (fn === 'sec') v = st.cos === 0 ? NaN : 1 / st.cos;
          else v = st.sin === 0 ? NaN : 1 / st.sin;
        }
        if (isFinite(v)) { if (squared) v = v * v; const signed = sign * coef * v; total += signed;
          lines.push((sign < 0 ? '− ' : '') + (coef === 1 ? '' : coef + '·') + fn + (squared ? '²' : '') + ' ' + ang + '° = ' + (coef === 1 ? '' : coef + ' × ') + (squared ? '(' + pretty(Math.sqrt(v)) + ')²' : pretty(v)) + (squared ? ' = ' + pretty(v) : '')); }
        else ok = false;
      });
      if (lines.length && /evaluate|मान|value|simplify|सरल/.test(s)) {
        const signs = []; let exprTotal = 0;
        return pack({
          kind: 'trig-evaluate', chapter: 8,
          title: { en: 'Evaluate a trigonometric expression — three ways', hi: 'त्रिकोणमितीय व्यंजक का मान — तीन विधियाँ' },
          summary: { en: 'Expression built from standard angles', hi: 'मानक कोणों से बना व्यंजक' },
          result: { en: `Value = ${N.dec(total, 4)}`, hi: `मान = ${N.dec(total, 4)}` },
          approaches: [
            {
              name: L('Substitute the standard values', 'मानक मान रखिए'),
              tag: L('The expected board method', 'बोर्ड में अपेक्षित विधि'),
              steps: [
                { t: L('Write the standard-angle table in the margin first, then substitute each ratio.', 'पहले हाशिये में मानक कोण तालिका लिखिए, फिर प्रत्येक अनुपात का मान रखिए।'), m: 'sin: 0, ½, 1/√2, √3/2, 1\ncos: 1, √3/2, 1/√2, ½, 0' },
                { t: L('Substitute term by term, keeping exact surds.', 'पद-दर-पद मान रखिए, सटीक करणी रखिए।'), m: lines.join('\n') },
                { t: L('Add and simplify.', 'जोड़िए और सरल कीजिए।'), m: `Total = ${N.dec(total, 4)}` }
              ],
              why: L('These questions test whether the table is memorised and whether you can handle surds — nothing deeper. So write the table first, then substitute.',
                      'ये प्रश्न यह जाँचते हैं कि तालिका याद है या नहीं और करणी संभाल सकते हैं या नहीं — इससे गहरा कुछ नहीं। अतः पहले तालिका लिखिए, फिर मान रखिए।'),
              watch: L('tan 90° and cot 0° are undefined, not zero. Write "not defined" if they appear.',
                      'tan 90° और cot 0° अपरिभाषित हैं, शून्य नहीं। यदि आएँ तो "अपरिभाषित" लिखिए।')
            },
            {
              name: L('Convert everything to sin and cos', 'सब कुछ sin और cos में बदलिए'),
              tag: L('Needs fewer memorised values', 'कम मान याद रखने पड़ते हैं'),
              steps: [
                { t: L('Replace tan, cot, sec and cosec using tan = sin/cos, sec = 1/cos and so on.', 'tan, cot, sec, cosec को tan = sin/cos, sec = 1/cos आदि से बदलिए।'), m: 'tan θ = sinθ/cosθ , sec θ = 1/cosθ' },
                { t: L('Now only the sin and cos rows of the table are needed.', 'अब तालिका की केवल sin और cos पंक्तियाँ चाहिए।'), m: 'sin 45° = cos 45° = 1/√2' },
                { t: L('Simplify the resulting fraction.', 'प्राप्त भिन्न सरल कीजिए।'), m: `Total = ${N.dec(total, 4)}` }
              ],
              why: L('Every ratio is defined from sin and cos, so this route never fails even if you blank on the sec or cot row.',
                      'प्रत्येक अनुपात sin और cos से परिभाषित है, अतः sec या cot पंक्ति भूल जाने पर भी यह मार्ग विफल नहीं होता।'),
              watch: L('More writing — use it only when four or more different ratios appear.',
                      'अधिक लिखना पड़ता है — इसे तभी लीजिए जब चार या अधिक भिन्न अनुपात हों।')
            },
            {
              name: L('Complementary-angle pairing', 'पूरक कोण युग्मन'),
              tag: L('Collapses long expressions to 0 and 1', 'लंबे व्यंजक को 0 और 1 में बदलता है'),
              steps: [
                { t: L('Look for angles adding to 90°: sin θ = cos(90° − θ), so such pairs combine or cancel.', '90° तक जोड़ने वाले कोण खोजिए: sin θ = cos(90° − θ), अतः ऐसे युग्म जुड़ते या कटते हैं।'), m: 'sin 40° = cos 50° , tan 30° = cot 60°' },
                { t: L('Use tanθ·cotθ = 1 and sin²θ + cos²θ = 1 to collapse what is left.', 'शेष पदों को tanθ·cotθ = 1 तथा sin²θ + cos²θ = 1 से समेटिए।'), m: 'sin²35° + cos²35° = 1' }
              ],
              why: L('Examiners build these expressions so that pairs collapse. Spotting the pairing is what turns ten lines of computation into three.',
                      'परीक्षक ऐसे व्यंजक बनाते हैं जिनमें युग्म समेट जाएँ। युग्म पहचानना ही दस पंक्तियों की गणना को तीन में बदल देता है।'),
              watch: L('Pair only complementary angles — sin 30° and cos 30° do not cancel.',
                      'केवल पूरक कोणों का युग्म बनाइए — sin 30° और cos 30° नहीं कटते।')
            }
          ],
          verify: L('A decimal check with a calculator confirms the arithmetic; the exact surd form is what earns the marks.',
                    'कैलकुलेटर से दशमलव जाँच गणना की पुष्टि करती है; अंक सटीक करणी रूप पर मिलते हैं।'),
          related: [8]
        });
      }
    }

    /* D. identity proof -- but only when the expression actually contains trig.
       Without this guard "Prove that ΔAOD ~ ΔCOB" (a similar-triangles
       question) came back as "LHS = RHS" of a trigonometric identity. */
    const HAS_TRIG = /\b(sin|cos|tan|cot|sec|cosec)\b/.test(s);
    if (/prove|सिद्ध/.test(s) && HAS_TRIG) {
      return pack({
        kind: 'trig-identity', chapter: 8,
        title: { en: 'Trigonometric identity — three strategies', hi: 'त्रिकोणमितीय सर्वसमिका — तीन रणनीतियाँ' },
        summary: { en: 'Prove the given identity', hi: 'दी गई सर्वसमिका सिद्ध कीजिए' },
        result: { en: 'LHS = RHS', hi: 'बायाँ पक्ष = दायाँ पक्ष' },
        approaches: [
          {
            name: L('Convert everything to sin and cos', 'सब कुछ sin और cos में बदलिए'),
            tag: L('The universal first move', 'सार्वभौमिक पहला कदम'),
            steps: [
              { t: L('Rewrite every ratio on the more complicated side using only sin and cos.', 'अधिक जटिल पक्ष के प्रत्येक अनुपात को केवल sin और cos में लिखिए।'), m: 'tanθ = sinθ/cosθ , cotθ = cosθ/sinθ , secθ = 1/cosθ' },
              { t: L('Take a common denominator and add the fractions.', 'सामान्य हर लेकर भिन्न जोड़िए।'), m: '(sin·sin + cos·cos) / (sin·cos)' },
              { t: L('Use sin²θ + cos²θ = 1 to collapse the numerator.', 'अंश समेटने के लिए sin²θ + cos²θ = 1 लगाइए।'), m: '1 / (sinθ cosθ)' },
              { t: L('Simplify until the other side appears, then write "= RHS".', 'सरल करते जाइए जब तक दूसरा पक्ष आ जाए, फिर "= दायाँ पक्ष" लिखिए।'), m: 'LHS = … = RHS' }
            ],
            why: L('There are only two functions underneath everything. Converting removes the choice of which identity to try, so the problem becomes ordinary fraction algebra.',
                    'सब कुछ के नीचे केवल दो फलन हैं। बदलने से यह चुनने की समस्या हट जाती है कि कौन-सी सर्वसमिका आज़माएँ, और प्रश्न साधारण भिन्न-बीजगणित बन जाता है।'),
            watch: L('Work on ONE side only. Changing both sides at once is not a valid proof and loses marks.',
                    'केवल एक पक्ष पर काम कीजिए। दोनों पक्ष बदलना वैध उपपत्ति नहीं है और अंक कटते हैं।')
          },
          {
            name: L('Use the Pythagorean identities', 'पाइथागोरस सर्वसमिकाएँ लगाइए'),
            tag: L('Best when sec, cosec or cot appear', 'जब sec, cosec या cot हों तब सर्वोत्तम'),
            steps: [
              { t: L('Spot a 1 + tan²θ or 1 + cot²θ block and replace it whole.', '1 + tan²θ या 1 + cot²θ खंड पहचानिए और पूरा बदलिए।'), m: '1 + tan²θ = sec²θ\n1 + cot²θ = cosec²θ' },
              { t: L('Replace and simplify — usually one cancellation follows.', 'बदलिए और सरल कीजिए — सामान्यतः एक कटाव आता है।'), m: 'sec²θ − tan²θ = 1' }
            ],
            why: L('When a question deliberately includes sec, cosec or cot, it is a signal that the squared identities are the intended route.',
                    'जब प्रश्न जानबूझकर sec, cosec या cot लेकर आता है, तो यह संकेत है कि वर्गित सर्वसमिकाएँ ही अभीष्ट मार्ग हैं।'),
            watch: L('Do not substitute halfway — replace the entire block, e.g. 1 + tan²θ, not just tan²θ.',
                    'आधा प्रतिस्थापन न कीजिए — पूरा खंड बदलिए, जैसे केवल tan²θ नहीं, 1 + tan²θ।')
          },
          {
            name: L('Multiply by the conjugate', 'संयुग्मी से गुणा कीजिए'),
            tag: L('Classic trick for (1 ± sin θ) denominators', '(1 ± sin θ) हर के लिए उपयोगी'),
            steps: [
              { t: L('If a denominator looks like 1 − sinθ, multiply numerator and denominator by 1 + sinθ.', 'यदि हर 1 − sinθ जैसा दिखे, तो अंश-हर दोनों को 1 + sinθ से गुणा कीजिए।'), m: '(1 − sinθ)(1 + sinθ) = 1 − sin²θ = cos²θ' },
              { t: L('The denominator becomes a single squared term, and the fraction collapses.', 'हर एक ही वर्गित पद बन जाता है और भिन्न समेट जाती है।'), m: 'numerator / cos²θ' }
            ],
            why: L('Multiplying by a conjugate converts a difference of squares into a Pythagorean identity, which is exactly the form the question is hiding.',
                    'संयुग्मी से गुणा करने पर वर्गों का अंतर पाइथागोरस सर्वसमिका बन जाता है, और प्रश्न ठीक इसी रूप को छिपाता है।'),
            watch: L('Multiplying numerator and denominator by the same quantity is legal; multiplying only one is not.',
                    'अंश और हर को एक ही राशि से गुणा करना वैध है; केवल एक को गुणा करना नहीं।')
          }
        ],
        verify: L('Substitute a test angle (say 30°) numerically into the original identity and check that both sides give the same decimal.',
                  'मूल सर्वसमिका में कोई परीक्षण कोण (जैसे 30°) संख्यात्मक रूप से रखिए और जाँचिए कि दोनों पक्ष समान दशमलव दें।'),
        related: [8]
      });
    }
    return null;
  };

  UP.solveHeights = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/elevation|depression|उन्नयन|अवनमन/.test(s)) return null;
    /* the angle may be written 30°, 30 degrees, or 30 deg */
    const angs = [...s.matchAll(/(\d{1,3})(?:\s*°|\s*degrees?\b|\s*deg\b)/g)]
      .map(m => +m[1]).filter(a => a > 0 && a < 90);
    const dist = grab(s, ['distance', 'दूरी']) ||
      (() => { const m = s.match(/(\d+(?:\.\d+)?)\s*(?:m|metre|meter|मीटर|मी)\b/); return m ? parseFloat(m[1]) : null; })() ||
      (() => { const m = s.match(/(\d+(?:\.\d+)?)\s*(?:m|metre|meters)?\s*away/); return m ? parseFloat(m[1]) : null; })();
    if (!angs.length) return null;
    const th = angs[0];
    const t = Math.tan(th * PI / 180);
    const h = dist ? dist * t : null;

    return pack({
      kind: 'heights', chapter: 9,
      title: { en: 'Height and distance — three approaches', hi: 'ऊँचाई और दूरी — तीन उपाय' },
      summary: { en: `angle = ${th}°${dist ? ', distance = ' + dist : ''}`, hi: `कोण = ${th}°${dist ? ', दूरी = ' + dist : ''}` },
      result: { en: h ? `height = ${dist} × tan ${th}° = ${N.dec(h, 3)} units` : `h = d × tan ${th}°`, hi: h ? `ऊँचाई = ${dist} × tan ${th}° = ${N.dec(h, 3)} इकाई` : `h = d × tan ${th}°` },
      approaches: [
        {
          name: L('Draw and label the triangle', 'त्रिभुज बनाकर नामांकित कीजिए'),
          tag: L('Always do this first, even in the exam', 'परीक्षा में भी सदैव पहले यही कीजिए'),
          steps: [
            { t: L('Draw the vertical object, the horizontal ground, and the line of sight. Mark the angle where the observer is.', 'ऊर्ध्वाधर वस्तु, क्षैतिज भूमि और दृष्टि रेखा बनाइए। जहाँ पर्यवेक्षक है वहाँ कोण अंकित कीजिए।'), m: `angle at observer = ${th}°` },
            { t: L('Label the known length and the unknown height on the figure using the letters you will use in the working.', 'ज्ञात लंबाई और अज्ञात ऊँचाई को उन्हीं अक्षरों से अंकित कीजिए जो कार्य में प्रयोग करेंगे।'), m: 'AB = height (h), BC = distance (d)' },
            { t: L('Choose the ratio that connects the two labelled sides.', 'दोनों अंकित भुजाओं को जोड़ने वाला अनुपात चुनिए।'), m: `tan ${th}° = h/d` }
          ],
          why: L('The diagram is not decoration: it tells you whether to use tan, sin or cos without any guessing, because it shows which side is opposite and which is adjacent.',
                  'चित्र सजावट नहीं है: यह बिना अनुमान के बताता है कि tan, sin या cos लगाना है, क्योंकि यह दिखाता है कौन-सी भुजा सामने और कौन-सी आधार है।'),
          watch: L('The angle of depression must be drawn at the TOP, from a horizontal line through the observer\'s eye — not from the vertical.',
                  'अवनमन कोण ऊपर पर्यवेक्षक की आँख से जाने वाली क्षैतिज रेखा से बनाइए — ऊर्ध्वाधर से नहीं।')
        },
        {
          name: L('Direct tangent substitution', 'सीधा स्पर्शज्या प्रतिस्थापन'),
          tag: L('One line once the figure is correct', 'चित्र सही हो तो एक पंक्ति'),
          steps: [
            { t: L('Use tan because you have the horizontal side and want the vertical side.', 'tan लीजिए क्योंकि क्षैतिज भुजा ज्ञात है और ऊर्ध्वाधर चाहिए।'), m: `tan ${th}° = h / ${dist || 'd'}` },
            { t: L('Put the exact value of tan (1/√3, 1 or √3 for 30°, 45°, 60°).', 'tan का सटीक मान रखिए (30°, 45°, 60° के लिए 1/√3, 1 या √3)।'), m: `h = ${dist || 'd'} × ${th === 30 ? '1/√3' : th === 45 ? '1' : th === 60 ? '√3' : 'tan ' + th + '°'}` },
            { t: L('Rationalise the denominator if a root remains.', 'यदि मूल बचे तो हर का परिमेयकरण कीजिए।'), m: h ? `h = ${N.dec(h, 3)}` : '' }
          ],
          why: L('tan links the two legs you actually have in a height-and-distance problem, so it does most of the work in this chapter.',
                  'tan उन्हीं दो भुजाओं को जोड़ता है जो ऊँचाई-दूरी के प्रश्न में वास्तव में होती हैं, इसलिए यह इस अध्याय का अधिकांश कार्य करता है।'),
          watch: L('Round only at the very end. √3 = 1.732 early in the working changes the last digit of the answer.',
                  'पूर्णांकन केवल अंत में कीजिए। कार्य के बीच में √3 = 1.732 लेने से उत्तर का अंतिम अंक बदल जाता है।')
        },
        {
          name: L('Two positions: equate the common height', 'दो स्थितियाँ: उभयनिष्ठ ऊँचाई बराबर कीजिए'),
          tag: L('For two angles from two points', 'दो बिंदुओं से दो कोण होने पर'),
          steps: [
            { t: L('Let the height be h and the nearer distance be x; write h in terms of each angle.', 'ऊँचाई h और निकट दूरी x मानिए; प्रत्येक कोण के लिए h लिखिए।'), m: `h = x tan ${angles2(angs)}  and  h = (x + d) tan ${angs[0]}°` },
            { t: L('Equate them so h disappears and solve for x.', 'बराबर रखिए जिससे h हट जाए और x ज्ञात कीजिए।'), m: `x tan ${angles2(angs)} = (x + d) tan ${angs[0]}°` },
            { t: L('Put x back into either equation to get h.', 'x को किसी भी समीकरण में रखकर h ज्ञात कीजिए।'), m: `h = x tan ${angles2(angs)}` }
          ],
          why: L('The object does not change height when the observer moves, so both triangles must give the same h. That equality is the whole method.',
                  'पर्यवेक्षक के चलने से वस्तु की ऊँचाई नहीं बदलती, अतः दोनों त्रिभुजों से वही h मिलना चाहिए। यही समता पूरी विधि है।'),
          watch: L('Add the distances correctly — the farther point is x + d away, not x − d.',
                  'दूरियाँ सही जोड़िए — दूर वाला बिंदु x + d पर है, x − d पर नहीं।')
        }
      ],
      verify: L('The height must be sensible relative to the distance: at 45° it equals the distance, at 30° it is the distance ÷ √3, at 60° it is distance × √3.',
                'ऊँचाई दूरी के सापेक्ष तर्कसंगत होनी चाहिए: 45° पर ऊँचाई = दूरी, 30° पर दूरी ÷ √3, 60° पर दूरी × √3।'),
      related: [9, 8],
      _geom: { angle: th, dist: dist, height: null }
    });
    function angles2(a) { return a[1] || a[0]; }
  };

  /* ===================== PROBABILITY ===================== */
  UP.solveProbability = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/probab|प्रायिकता/.test(s)) return null;
    const L2 = (en, hi) => ({ en, hi });

    // two dice
    if ((/dice|die|पासा|पासे/.test(s)) && /sum|योग|total/.test(s)) {
      const tgt = +(s.match(/sum[^0-9]*(\d{1,2})/i) || s.match(/योग[^0-9]*(\d{1,2})/) || [, 7])[1];
      if (tgt >= 2 && tgt <= 12) {
        const ways = 6 - Math.abs(tgt - 7);
        return pack({
          kind: 'prob-dice', chapter: 14,
          title: L2('Two dice — sum of ' + tgt + ' · three methods', 'दो पासे — योग ' + tgt + ' · तीन विधियाँ'),
          summary: L2('Total outcomes 36', 'कुल परिणाम 36'),
          result: L2(`P(sum = ${tgt}) = ${ways}/36${(() => { const f = UP.num.toFrac(ways / 36); return f.d === 1 ? '' : (f.d === 36 ? '' : ` = ${f.n}/${f.d}`); })()}`.replace(/ = (\d+)\/(\d+)/, (m, a, b) => (a === String(ways) ? m : ` = ${a}/${b}`)), `P(योग = ${tgt}) = ${ways}/36`),
          approaches: [
            {
              name: L2('Count from the 6×6 table', '6×6 तालिका से गिनिए'),
              tag: L2('Most reliable — shows the working', 'सर्वाधिक विश्वसनीय — कार्य दिखता है'),
              steps: [
                { t: L2('Write the sample space as a 6 × 6 grid of ordered pairs; there are 36 equally likely outcomes.', 'प्रतिदर्श समष्टि को क्रमित युग्मों के 6 × 6 ग्रिड के रूप में लिखिए; 36 समप्रायिक परिणाम हैं।'), m: `n(S) = 36` },
                { t: L2('Mark every cell whose two numbers add to the required sum.', 'हर उस कोष्ठक को चिह्नित कीजिए जिसकी दोनों संख्याओं का योग अभीष्ट हो।'), m: `${Array.from({ length: ways }, (_, i) => { const a = Math.max(1, tgt - 6) + i; return `(${a}, ${tgt - a})`; }).join(' ')}` },
                { t: L2('Count the marked cells and divide by 36.', 'चिह्नित कोष्ठक गिनिए और 36 से भाग दीजिए।'), m: `P = ${ways}/36 = ${UP.num.fmt(ways / 36)}` }
              ],
              why: L2('Dice questions are only about counting, and the table makes the count impossible to lose. It also protects you if the question later asks "sum greater than 8" — the same table answers it.',
                      'पासों के प्रश्न केवल गिनती के हैं, और तालिका गिनती खोने ही नहीं देती। यदि आगे "8 से अधिक योग" पूछा जाए तो वही तालिका उत्तर दे देती है।'),
              watch: L2('Order matters: (2, 6) and (6, 2) are different outcomes. Missing this halves the numerator.',
                      'क्रम महत्वपूर्ण है: (2, 6) और (6, 2) भिन्न परिणाम हैं। इसे छोड़ने पर अंश आधा रह जाता है।')
            },
            {
              name: L2('Symmetry / formula shortcut', 'सममिति / सूत्र त्वरित विधि'),
              tag: L2('Instant, once you know it', 'एक बार जानने पर तुरंत'),
              steps: [
                { t: L2('The number of ways to get a sum s with two dice is 6 − |s − 7|, rising to a maximum of 6 at s = 7.', 'दो पासों से योग s पाने के तरीके 6 − |s − 7| होते हैं, जो s = 7 पर अधिकतम 6 होते हैं।'), m: `ways = 6 − |${tgt} − 7| = ${ways}` },
                { t: L2('Divide by 36 and simplify.', '36 से भाग दीजिए और सरल कीजिए।'), m: `P = ${ways}/36 = ${UP.num.fmt(ways / 36)}` }
              ],
              why: L2('The distribution is symmetric about 7 because swapping the two dice gives another valid outcome — the symmetry is structural, not a coincidence.',
                      'बंटन 7 के दोनों ओर सममित है क्योंकि दोनों पासे बदलने पर भी वैध परिणाम मिलता है — यह सममिति संरचनात्मक है, संयोग नहीं।'),
              watch: L2('The formula is for two standard dice only.', 'यह सूत्र केवल दो मानक पासों के लिए है।')
            },
            {
              name: L2('Complement method', 'पूरक विधि'),
              tag: L2('Best for "at least" wording', '"कम से कम" शब्दावली के लिए सर्वोत्तम'),
              steps: [
                { t: L2('If the question says "at least" or "not", compute the opposite event first.', 'यदि प्रश्न में "कम से कम" या "नहीं" हो, पहले विपरीत घटना निकालिए।'), m: `P(not A) = 1 − P(A)` },
                { t: L2('Count the fewer outcomes in the complementary event.', 'पूरक घटना के कम परिणाम गिनिए।'), m: `P(A) = 1 − ${ways > 18 ? (36 - ways) : ways}/36` }
              ],
              why: L2('Counting the complement is often much shorter: "at least one 6" has 11 outcomes, while its complement has only 25 — and you avoid double counting entirely.',
                      'पूरक गिनना प्रायः बहुत छोटा होता है: "कम से कम एक 6" के 11 परिणाम हैं, जबकि उसके पूरक के केवल 25 — और दोहरी गिनती से पूरी तरह बचाव होता है।'),
              watch: L2('"At least one" means 1 or more, so its complement is "none at all" — not "exactly one".',
                      '"कम से कम एक" का अर्थ 1 या अधिक है, अतः पूरक "बिल्कुल नहीं" है — "ठीक एक" नहीं।')
            }
          ],
          verify: L2(`Every probability must lie between 0 and 1. Check ${ways}/36 ≈ ${UP.num.dec(ways / 36, 3)}.`, `प्रत्येक प्रायिकता 0 और 1 के बीच होनी चाहिए। जाँचिए ${ways}/36 ≈ ${UP.num.dec(ways / 36, 3)}।`),
          related: [14],
      _geom: { target: tgt }
        });
      }
    }

    // cards
    if (/card|ताश|पत्त/.test(s)) {
      /* Colour and rank are independent attributes, so "a red face card" is
         6, not 12. Check both together before falling back to a rank count. */
      const red = /red|लाल/.test(s), black = /black|काला/.test(s);
      const face = /face|तस्वीर/.test(s);
      const king = /king|बादशाह/.test(s), queen = /queen|बेगम/.test(s), jack = /jack|गुलाम/.test(s), ace = /ace|इक्का/.test(s);
      const rankCount = king || queen || jack || ace ? 4 : null;
      let fav;
      if (face && (red || black)) fav = 6;
      else if (face) fav = 12;
      else if (rankCount !== null) fav = (red || black) ? 2 : 4;
      else if (/(red|लाल)[^.]*cards?|cards?[^.]*(red|लाल)/.test(s) && !face) fav = 26;
      else if (/(black|काला)[^.]*cards?|cards?[^.]*(black|काला)/.test(s) && !face) fav = 26;
      else if (/spade|हुकुम/.test(s) || /heart|पान/.test(s) || /diamond|ईंट/.test(s) || /club|चिड़ी/.test(s)) fav = 13;
      else return null;   /* an ask we cannot count with certainty — refuse it */
      /* "an ace or a ten" is 8, and "a king and a red card" needs care too.
         Only a single named rank/colour/face may be answered. */
      if (/removed|remaining|without replacement|one after another|\(i\)|\(ii\)/.test(s)) return null;
      const namedRanks = [king, queen, jack, ace].filter(Boolean).length;
      /* any "X or Y" / "X and Y" between two card names is a combined event:
         refuse unless it is just colour+face, which is handled above */
      const orRange = /\b(?:or|and)\b/.test(s);
      if (orRange && !(face && (red || black))) return null;
      if (namedRanks > 1) return null;
      /* a second named value (a ten, a nine, an eight…) also means a union */
      if (/\b(?:a|an|the)\s+(?:ten|nine|eight|seven|six|five|four|three|two|deuce)\b/i.test(s)) return null;
      return pack({
        kind: 'prob-card', chapter: 14,
        title: L2('Card probability — three methods', 'ताश की प्रायिकता — तीन विधियाँ'),
        summary: L2('One card from 52', '52 में से एक पत्ता'),
        result: L2(`P = ${fav}/52 = ${UP.num.fmt(fav / 52)}`, `P = ${fav}/52 = ${UP.num.fmt(fav / 52)}`),
        approaches: [
          {
            name: L2('Direct counting from the deck', 'गड्डी से सीधी गिनती'),
            tag: L2('The standard board answer', 'बोर्ड का मानक उत्तर'),
            steps: [
              { t: L2('State the sample space: 52 cards, 4 suits of 13.', 'प्रतिदर्श समष्टि लिखिए: 52 पत्ते, 13-13 के 4 रंग।'), m: 'n(S) = 52' },
              { t: L2('Count the favourable cards by naming them, not by guessing.', 'अनुकूल पत्तों को नाम लेकर गिनिए, अनुमान से नहीं।'), m: `favourable = ${fav}` },
              { t: L2('Divide and simplify the fraction.', 'भाग दीजिए और भिन्न सरल कीजिए।'), m: `P = ${fav}/52 = ${UP.num.fmt(fav / 52)}` }
            ],
            why: L2('A deck is fully known, so probability here is pure counting. Writing the count as a named list ("king of hearts, king of diamonds") makes it impossible to double count.',
                    'गड्डी पूरी तरह ज्ञात है, अतः यहाँ प्रायिकता शुद्ध गिनती है। गिनती नाम सहित लिखने ("पान का बादशाह, ईंट का बादशाह") से दोहरी गिनती असंभव हो जाती है।'),
            watch: L2('Face cards are 12 (J, Q, K) — aces are NOT face cards. Red cards are 26, not 13.',
                    'तस्वीर वाले पत्ते 12 हैं (J, Q, K) — इक्के तस्वीर वाले नहीं। लाल पत्ते 26 हैं, 13 नहीं।')
          },
          {
            name: L2('Complement where possible', 'जहाँ संभव हो पूरक विधि'),
            tag: L2('Shorter for "not" questions', '"नहीं" वाले प्रश्नों में छोटा'),
            steps: [
              { t: L2('For "not a king" style questions, count the kings and subtract.', '"बादशाह नहीं" जैसे प्रश्नों में बादशाहों की गिनती कर घटाइए।'), m: `P(not king) = 1 − 4/52 = 48/52` },
              { t: L2('Simplify.', 'सरल कीजिए।'), m: `${UP.num.fmt(48 / 52)}` }
            ],
            why: L2('The complement here is often a round number, so the arithmetic is cleaner and less error-prone than counting the large set directly.',
                    'यहाँ पूरक प्रायः पूर्ण संख्या होता है, अतः गणना बड़े समुच्चय को सीधे गिनने से अधिक स्वच्छ और त्रुटि-रहित रहती है।'),
            watch: L2('P(A) + P(not A) must equal exactly 1 — use that as your check.', 'P(A) + P(A नहीं) ठीक 1 होना चाहिए — इसे जाँच के रूप में लीजिए।')
          },
          {
            name: L2('Suit-wise reasoning', 'रंग-वार तर्क'),
            tag: L2('Handy when the suit is already fixed', 'जब रंग पहले से तय हो तब उपयोगी'),
            steps: [
              { t: L2('If the card is already known to be of one suit, the sample space shrinks to 13.', 'यदि पत्ता पहले से किसी एक रंग का ज्ञात हो, तो प्रतिदर्श समष्टि घटकर 13 रह जाती है।'), m: 'n(S) = 13' },
              { t: L2('Count within that suit only.', 'केवल उसी रंग में गिनिए।'), m: `P = (cards of that rank) / 13` }
            ],
            why: L2('Probability changes when you are given extra information, and reducing the sample space is exactly how that shows up in the numbers.',
                    'अतिरिक्त सूचना मिलने पर प्रायिकता बदल जाती है, और प्रतिदर्श समष्टि घटाना ही वह तरीका है जिससे यह संख्याओं में दिखता है।'),
            watch: L2('Only shrink the space when the question explicitly gives the suit condition.',
                    'प्रतिदर्श समष्टि तभी घटाइए जब प्रश्न में रंग की शर्त स्पष्ट दी हो।')
          }
        ],
        verify: L2('The fraction must be between 0 and 1 and, if possible, reducible to a familiar value like 1/13 or 1/4.', 'भिन्न 0 और 1 के बीच होनी चाहिए और यदि संभव हो तो 1/13 या 1/4 जैसी ज्ञात भिन्न बने।'),
        related: [14]
      });
    }

    // balls in a bag
    const bag = s.match(/(\d+)\s*(red|लाल)[^0-9]*(\d+)\s*(white|सफेद|blue|नील)[^0-9]*(\d+)\s*(black|काली|काला|green|हरि)/);
    if (bag) {
      const r1 = +bag[1], w1 = +bag[3], b1 = +bag[5], total = r1 + w1 + b1;
      return pack({
        kind: 'prob-bag', chapter: 14,
        title: L2('Bag of balls — three methods', 'थैले की गेंदें — तीन विधियाँ'),
        summary: L2(`Red ${r1}, white ${w1}, black ${b1} · total ${total}`, `लाल ${r1}, सफेद ${w1}, काली ${b1} · कुल ${total}`),
        result: L2(`P(red) = ${r1}/${total}, P(not black) = ${upak(total - b1)}/${total}`, `P(लाल) = ${r1}/${total}, P(काली नहीं) = ${upak(total - b1)}/${total}`),
        approaches: [
          {
            name: L2('Direct counting', 'सीधी गिनती'),
            tag: L2('One step per part', 'प्रत्येक भाग के लिए एक चरण'),
            steps: [
              { t: L2('Find the total number of balls — this is the sample space.', 'कुल गेंदों की संख्या ज्ञात कीजिए — यही प्रतिदर्श समष्टि है।'), m: `n(S) = ${r1} + ${w1} + ${b1} = ${total}` },
              { t: L2('Read the favourable count from the question for each part.', 'प्रत्येक भाग के लिए अनुकूल संख्या प्रश्न से पढ़िए।'), m: `red = ${r1}, black = ${b1}` },
              { t: L2('Write each probability and simplify.', 'प्रत्येक प्रायिकता लिखिए और सरल कीजिए।'), m: `P(red) = ${r1}/${total} = ${N.fmt(r1 / total)}` }
            ],
            why: L2('Every ball is equally likely, so the question is only about ratios of counts. Writing the total first prevents the most common error — forgetting to add the last colour.',
                    'प्रत्येक गेंद समप्रायिक है, अतः प्रश्न केवल गिनती के अनुपात का है। पहले कुल लिखने से सबसे सामान्य भूल — अंतिम रंग जोड़ना भूल जाना — टल जाती है।'),
            watch: L2('If a ball is "replaced" the total stays the same; if it is "not replaced" the total drops by one for the next draw.',
                    'यदि गेंद "वापस रखी" जाए तो कुल वही रहता है; यदि "वापस न रखी जाए" तो अगली बार कुल एक कम हो जाता है।')
          },
          {
            name: L2('Complement for the "not" part', 'जहाँ संभव हो पूरक विधि'),
            tag: L2('Faster than adding two colours', 'दो रंग जोड़ने से तेज़'),
            steps: [
              { t: L2('For "not black", count the non-black balls instead of adding red and white separately.', '"काली नहीं" के लिए लाल और सफेद अलग जोड़ने के बजाय गैर-काली गेंदें गिनिए।'), m: `not black = ${total} − ${b1} = ${total - b1}` },
              { t: L2('Divide by the total.', 'कुल से भाग दीजिए।'), m: `P(not black) = ${upak(total - b1)}/${total}` }
            ],
            why: L2('The complement converts a two-part count into a one-part subtraction, which is both faster and less likely to miss a colour.',
                    'पूरक दो-भागीय गिनती को एक-भागीय घटाव में बदल देता है, जो तेज़ भी है और रंग छूटने का जोखिम भी कम।'),
            watch: L2('"Not black" is not the same as "white" — every other colour counts.',
                    '"काली नहीं" और "सफेद" एक नहीं हैं — हर अन्य रंग गिना जाएगा।')
          }
        ],
        verify: L2('All probabilities of a single draw must sum to 1 across the colours. Check that now.', 'एक बार निकालने में सभी रंगों की प्रायिकताओं का योग 1 होना चाहिए। अभी जाँचिए।'),
        related: [14]
      });
      function upak(x) { return x; }
    }
    return null;
  };

  /* ===================== SIMILARITY / BPT ===================== */
  UP.solveSimilar = function (q) {
    const s = UP.norm(q).toLowerCase().replace(/[−–—]/g, '-');
    if (!/similar|समरूप|parallel|समांतर|converse|∥|area.*triangle|क्षेत्रफल.*त्रिभुज/.test(s)) return null;
    const isArea = /similar/.test(s) && /area|क्षेत्रफल/.test(s);
    const isBPT = /parallel|समांतर|∥|proportionality/.test(s);
    const byKey = (keys) => {
      for (const k of keys) {
        const re = new RegExp(k + '\\s*=\\s*(\\d+(?:\\.\\d+)?)');
        const m = s.match(re);
        if (m) return parseFloat(m[1]);
      }
      return null;
    };
    if (isBPT && !isArea) {
      const ad = byKey(['ad']), db = byKey(['db', 'bd']), ae = byKey(['ae']), ec0 = byKey(['ec', 'ce']);
      if (ad !== null && db !== null && ae !== null) {
        const ec = (db * ae) / ad;
        return pack({
          kind: 'bpt', chapter: 6,
          title: { en: 'Basic Proportionality Theorem — two routes', hi: 'आधारभूत समानुपातिकता प्रमेय — दो मार्ग' },
          summary: { en: `AD = ${ad}, DB = ${db}, AE = ${ae}`, hi: `AD = ${ad}, DB = ${db}, AE = ${ae}` },
          result: { en: `EC = ${N.dec(ec, 3)} cm`, hi: `EC = ${N.dec(ec, 3)} सेमी` },
          approaches: [
            {
              name: L('Direct proportion AD/DB = AE/EC', 'सीधा समानुपात AD/DB = AE/EC'),
              tag: L('One-step version', 'एक चरण वाला रूप'),
              steps: [
                { t: L('Since DE ∥ BC, the theorem says the two segments on AB are in the same ratio as the segments on AC.', 'चूँकि DE ∥ BC, प्रमेय कहती है कि AB के दो खंड AC के खंडों के समान अनुपात में हैं।'), m: 'AD/DB = AE/EC' },
                { t: L('Substitute the known values.', 'ज्ञात मान रखिए।'), m: `${ad}/${db} = ${ae}/EC` },
                { t: L('Cross-multiply and solve.', 'वज्र-गुणन कीजिए और हल कीजिए।'), m: `EC = (${db} × ${ae}) ÷ ${ad} = ${N.dec(ec, 3)}` }
              ],
              why: L('The theorem is about ratios, not lengths: moving along one side by a fraction forces the same fraction along the other. Because it is a proportion, cross-multiplication is immediate.',
                      'प्रमेय अनुपात के बारे में है, लंबाइयों के बारे में नहीं: एक भुजा पर किसी भिन्न तक जाने से दूसरी भुजा पर भी वही भिन्न बनती है। यह समानुपात है, अतः वज्र-गुणन तुरंत है।'),
              watch: L('Use the segments AD and DB, not the whole side AB. Writing AB/DB is the standard mistake.',
                      'AD और DB खंड लीजिए, पूरी भुजा AB नहीं। AB/DB लिखना मानक भूल है।')
            },
            {
              name: L('Similar-triangle route', 'समरूप त्रिभुज मार्ग'),
              tag: L('Shows the deeper reason', 'गहरा कारण दिखाता है'),
              steps: [
                { t: L('DE ∥ BC makes ∠ADE = ∠ABC and ∠AED = ∠ACB (corresponding angles).', 'DE ∥ BC से ∠ADE = ∠ABC तथा ∠AED = ∠ACB (संगत कोण)।'), m: '△ADE ~ △ABC by AA' },
                { t: L('Similar triangles give proportional sides, including the whole sides.', 'समरूप त्रिभुजों से पूरी भुजाओं सहित समानुपाती भुजाएँ मिलती हैं।'), m: 'AD/AB = AE/AC = DE/BC' },
                { t: L('Convert back to segments if the question asks for a segment.', 'यदि प्रश्न खंड माँगे तो वापस खंडों में बदलिए।'), m: `AD/(AD + DB) = AE/(AE + EC) → EC = ${N.dec(ec, 3)}` }
              ],
              why: L('This route explains why the theorem holds instead of assuming it — useful when the question says "prove that" rather than "find".',
                      'यह मार्ग बताता है कि प्रमेय क्यों सत्य है, यह मानकर नहीं चलता — जब प्रश्न "सिद्ध कीजिए" कहे तब उपयोगी।'),
              watch: L('Keep the correspondence order A↔A, D↔B, E↔C. The wrong order gives wrong ratios.',
                      'संगतता का क्रम A↔A, D↔B, E↔C रखिए। गलत क्रम से गलत अनुपात मिलते हैं।')
            }
          ],
          verify: L(`Check that AD/DB = ${N.dec(ad / db, 4)} equals AE/EC = ${N.dec(ae / ec, 4)}.`, `जाँचिए कि AD/DB = ${N.dec(ad / db, 4)} तथा AE/EC = ${N.dec(ae / ec, 4)} बराबर हैं।`),
          related: [6],
      _geom: { t: 0.4 }
        });
      }
    }
    const noPow = s.replace(/\^\d+/g, ' ');
    const nums = (noPow.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (isArea && nums.length >= 2) {
      /* the altitude is often given after the two areas — take it out of the number list
         and remember which triangle it belongs to ("of the larger / smaller") */
      const mAlt = s.match(/(?:altitude|height|ऊँचाई)[^0-9=]{0,20}?(\d+(?:\.\d+)?)/);
      const altv = mAlt ? parseFloat(mAlt[1]) : null;
      let areaNums = altv === null ? nums.slice() : nums.filter(n => n !== altv);
      let r1 = areaNums[0], r2 = areaNums[1];
      if (altv !== null && (r1 === undefined || r2 === undefined)) { r1 = nums[0]; r2 = nums[1]; }
      /* keep the usual order larger : smaller, matching how the question is worded */
      if (r1 < r2) { const tmp = r1; r1 = r2; r2 = tmp; }
      const altOnSmaller = /altitude|height|ऊँचाई/.test(s.slice(Math.max(0, s.indexOf(String(altv)))));
      const sideRatio = Math.sqrt(r2 / r1);
      const ratio = (r1 * r1) / (r2 * r2);
      return pack({
        kind: 'area-ratio', chapter: 6,
        title: { en: 'Areas of similar triangles — two directions', hi: 'समरूप त्रिभुजों के क्षेत्रफल — दो दिशाएँ' },
        summary: { en: `Areas ${r1} : ${r2}${altv !== null ? ` · altitude ${altv} cm` : ''}`, hi: `क्षेत्रफल ${r1} : ${r2}${altv !== null ? ` · ऊँचाई ${altv} सेमी` : ''}` },
        result: altv !== null
          ? { en: `Ratio of corresponding sides = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)} ⟹ second altitude = ${N.dec(altv * Math.sqrt(r2 / r1), 3)} cm`,
              hi: `संगत भुजाओं का अनुपात = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)} ⟹ दूसरी ऊँचाई = ${N.dec(altv * Math.sqrt(r2 / r1), 3)} सेमी` }
          : { en: `Ratio of corresponding sides = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}${Number.isInteger(Math.sqrt(r1)) && Number.isInteger(Math.sqrt(r2)) ? ` = ${Math.round(Math.sqrt(r1))} : ${Math.round(Math.sqrt(r2))}` : ''}`,
              hi: `संगत भुजाओं का अनुपात = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}${Number.isInteger(Math.sqrt(r1)) && Number.isInteger(Math.sqrt(r2)) ? ` = ${Math.round(Math.sqrt(r1))} : ${Math.round(Math.sqrt(r2))}` : ''}` },
        approaches: [
          {
            name: L('Area ratio = (side ratio)²', 'क्षेत्रफल अनुपात = (भुजा अनुपात)²'),
            tag: L('Downward: side ratio → area ratio', 'नीचे की ओर: भुजा अनुपात → क्षेत्रफल अनुपात'),
            steps: [
              { t: L('Write the side ratio and square each term.', 'भुजा अनुपात लिखिए और प्रत्येक पद का वर्ग कीजिए।'), m: `s₁ : s₂ = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}\nareas = ${r1} : ${r2}` },
              { t: L('State the theorem sentence — examiners look for it.', 'प्रमेय का वाक्य लिखिए — परीक्षक इसे देखते हैं।'), m: 'ar(△ABC)/ar(△DEF) = (AB/DE)²' }
            ],
            why: L('Area is two-dimensional: scaling a figure by k multiplies every area by k². That is why the square appears, and it is the same reason volume scales as k³.',
                    'क्षेत्रफल द्विविमीय है: आकृति को k गुना करने पर प्रत्येक क्षेत्रफल k² गुना होता है। इसीलिए वर्ग आता है, और इसी कारण आयतन k³ से बदलता है।'),
            watch: L('Do not take the square root of the AREA ratio to get sides in a hurry — simplify the ratio first.',
                    'भुजाएँ निकालने के लिए जल्दी में क्षेत्रफल अनुपात का वर्गमूल न लीजिए — पहले अनुपात सरल कीजिए।')
          },
          {
            name: L('Upward: area ratio → side ratio', 'ऊपर की ओर: क्षेत्रफल अनुपात → भुजा अनुपात'),
            tag: L('Most exam questions ask this direction', 'अधिकांश प्रश्न यही दिशा पूछते हैं'),
            steps: [
              { t: L('Take the square root of both terms of the area ratio.', 'क्षेत्रफल अनुपात के दोनों पदों का वर्गमूल लीजिए।'), m: `√(${r1} : ${r2}) = ${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}` },
              { t: L('Scale the resulting ratio to whole numbers if possible.', 'संभव हो तो प्राप्त अनुपात को पूर्ण संख्याओं में बदलिए।'), m: `${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}` }
            ],
            why: L('Square-rooting turns area information into length information, which is what altitude and side questions need.',
                    'वर्गमूल लेने से क्षेत्रफल की सूचना लंबाई की सूचना बन जाती है, जो ऊँचाई और भुजा के प्रश्नों में चाहिए।'),
            watch: L('The ratio of altitudes and medians equals the side ratio, NOT the area ratio.',
                    'ऊँचाइयों और माध्यिकाओं का अनुपात भुजा अनुपात के बराबर होता है, क्षेत्रफल अनुपात के नहीं।')
          }
        ],
        verify: L('Plug the side ratio back: squared it must reproduce the given area ratio exactly.', 'भुजा अनुपात वापस रखिए: उसका वर्ग दिया गया क्षेत्रफल अनुपात ही देगा।'),
        related: [6],
      _geom: { r1: r1, r2: r2, sideRatio: `${N.dec(Math.sqrt(r1), 3)} : ${N.dec(Math.sqrt(r2), 3)}` }
      });
    }
    return null;
  };

  /* ===================== TANGENT ===================== */
  UP.solveTangent = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/tangent|स्पर्श/.test(s)) return null;
    const r = grab(s, ['radius', 'त्रिज्या']);
    /* The external point is named OP, OQ or OT depending on the paper, and is
       often written only as "25 cm from the centre". Try each before giving up. */
    const dq = grab(s, ['op', 'oq', 'ot', 'oa', 'ob'])
      || (() => { const m = s.match(/(\d+(?:\.\d+)?)\s*(?:cm|m|units?)?\s*(?:away\s*)?from the cent(?:re|er)/); return m ? parseFloat(m[1]) : null; })()
      || (() => { const m = s.match(/(\d+(?:\.\d+)?)\s*(?:cm|m)\s*from\s*(?:the\s*)?(?:cent(?:re|er)|o\b)/); return m ? parseFloat(m[1]) : null; })();
    if (!r || !dq || dq <= r) return null;
    const t = Math.sqrt(dq * dq - r * r);
    return pack({
      kind: 'tangent', chapter: 10,
      title: { en: 'Length of a tangent — two proofs', hi: 'स्पर्श रेखा की लंबाई — दो उपपत्तियाँ' },
      summary: { en: `r = ${r}, distance to external point = ${dq}`, hi: `r = ${r}, बाह्य बिंदु तक दूरी = ${dq}` },
      result: { en: `tangent = √(${dq}² − ${r}²) = ${N.dec(t, 3)} units`, hi: `स्पर्श रेखा = √(${dq}² − ${r}²) = ${N.dec(t, 3)} इकाई` },
      approaches: [
        {
          name: L('Pythagoras in △OAT', '△OAT में पाइथागोरस'),
          tag: L('One line — the expected method', 'एक पंक्ति — अपेक्षित विधि'),
          steps: [
            { t: L('The radius to the point of contact is perpendicular to the tangent, so △OAT is right-angled at A.', 'स्पर्श बिंदु तक त्रिज्या स्पर्श रेखा के लंबवत होती है, अतः △OAT में A पर समकोण है।'), m: '∠OAT = 90°' },
            { t: L('Apply Pythagoras with OT as the hypotenuse.', 'OT को कर्ण मानकर पाइथागोरस लगाइए।'), m: `OT² = OA² + AT²  ⇒  ${dq}² = ${r}² + AT²` },
            { t: L('Solve for the tangent.', 'स्पर्श रेखा के लिए हल कीजिए।'), m: `AT = ${N.dec(t, 3)}` }
          ],
          why: L('This right angle is the only reason tangent problems are solvable with school mathematics — it converts a circle question into a triangle question.',
                  'यही समकोण एकमात्र कारण है कि स्पर्श रेखा के प्रश्न स्कूली गणित से हल हो सकते हैं — यह वृत्त का प्रश्न त्रिभुज का प्रश्न बना देता है।'),
          watch: L('OT is the hypotenuse (the longest side). If your tangent length is longer than OT, you have swapped the sides.',
                  'OT कर्ण (सबसे बड़ी भुजा) है। यदि स्पर्श रेखा OT से बड़ी आए तो भुजाएँ बदल गई हैं।')
        },
        {
          name: L('Congruent-triangle proof (for "prove" questions)', 'सर्वांगसम त्रिभुज उपपत्ति ("सिद्ध कीजिए" के लिए)'),
          tag: L('Also proves both tangents are equal', 'दोनों स्पर्श रेखाओं की समानता भी सिद्ध करता है'),
          steps: [
            { t: L('Join the centre to the external point and to both points of contact.', 'केंद्र को बाह्य बिंदु तथा दोनों स्पर्श बिंदुओं से मिलाइए।'), m: 'OA ⟂ PA, OB ⟂ PB' },
            { t: L('Compare △OAP and △OBP: OA = OB (radii), OP common, both right angles.', '△OAP और △OBP की तुलना कीजिए: OA = OB (त्रिज्याएँ), OP सामान्य, दोनों समकोण।'), m: 'RHS congruence' },
            { t: L('Conclude PA = PB by CPCT.', 'CPCT से PA = PB निष्कर्ष निकालिए।'), m: 'PA = PB' }
          ],
          why: L('Writing the congruence makes the "equal tangents" result a consequence rather than a separate thing to memorise, and it is a frequent 3-mark proof.',
                  'सर्वांगसमता लिखने से "समान स्पर्श रेखाएँ" परिणाम अलग से याद करने की वस्तु नहीं रहता, बल्कि निष्कर्ष बन जाता है, और यह बार-बार आने वाली 3-अंक उपपत्ति है।'),
          watch: L('Name the right angle at the point of contact — the RHS criterion requires it explicitly.',
                  'स्पर्श बिंदु पर समकोण का नाम लिखिए — RHS कसौटी के लिए यह स्पष्ट आवश्यक है।')
        }
      ],
      verify: L('The tangent must be shorter than the external distance OT and longer than 0. Compare with the 3-4-5 triple if the numbers look familiar.',
                'स्पर्श रेखा बाह्य दूरी OT से छोटी और 0 से बड़ी होनी चाहिए। यदि संख्याएँ परिचित लगें तो 3-4-5 त्रिक से तुलना कीजिए।'),
      related: [10],
      _geom: { r: r, d: dq, t: N.dec(t, 2), ratio: dq / r }
    });
  };

  /* ===================== PLAIN ARITHMETIC ===================== */
  UP.solveArithmetic = function (q) {
    /* This used to strip every letter and then evaluate whatever was left.
       "exactly filled by 3 spherical scoops of radius r/2" became the string
       "3 /2", which evaluates to 1.5 -- printed as a confident answer to a
       question about cones.  A real "simplify this" ask is short and is almost
       entirely symbols; anything with a sentence around it is not arithmetic. */
    const raw = String(q).trim();
    if (raw.split(/\s+/).length > 12) return null;                  // too wordy
    if ((raw.match(/[A-Za-z]{3,}/g) || []).length > 2) return null; // real prose
    const s = UP.norm(q).replace(/[^0-9+\-*/().^ ]/g, ' ').trim();
    if (!/[+\-*/^]/.test(s) || !/\d/.test(s)) return null;
    if (!/[+\-*/^]\s*[\d(]/.test(s)) return null;                  // no real operator use
    const expr = s.replace(/\^/g, '**');
    if (!/^[\d+\-*/(). ]+$/.test(expr.replace(/\*\*/g, ''))) return null;
    let val;
    try { val = Function('"use strict";return (' + expr + ')')(); } catch (e) { return null; }
    if (!isFinite(val)) return null;
    return pack({
      kind: 'arithmetic', chapter: 0,
      title: { en: 'Simplify the expression — two orders of working', hi: 'व्यंजक सरल कीजिए — दो क्रम' },
      summary: { en: s, hi: s },
      result: { en: `= ${N.fmt(val)}`, hi: `= ${N.fmt(val)}` },
      approaches: [
        {
          name: L('BODMAS / order of operations', 'बोडमास / संक्रिया क्रम'),
          tag: L('The standard legal order', 'मानक वैध क्रम'),
          steps: [
            { t: L('Brackets first, then powers (orders), then division and multiplication left to right, then addition and subtraction left to right.', 'पहले कोष्ठक, फिर घात, फिर बाएँ से दाएँ भाग व गुणा, फिर बाएँ से दाएँ जोड़ व घटाव।'), m: 'B → O → D/M → A/S' },
            { t: L('Evaluate the innermost bracket completely before moving out.', 'बाहर आने से पहले भीतरी कोष्ठक पूरा हल कीजिए।'), m: s },
            { t: L('Finish with the outer additions and subtractions.', 'अंत में बाहरी जोड़-घटाव कीजिए।'), m: `= ${N.fmt(val)}` }
          ],
          why: L('The order exists because the alternative is ambiguity: 2 + 3 × 4 has one agreed meaning only because multiplication binds tighter than addition.',
                  'यह क्रम इसलिए है क्योंकि विकल्प अस्पष्टता है: 2 + 3 × 4 का एक ही स्वीकृत अर्थ है क्योंकि गुणा जोड़ से अधिक प्रबल है।'),
          watch: L('Division and multiplication have EQUAL priority, so go strictly left to right — 24 ÷ 4 × 3 is 18, not 2.',
                  'भाग और गुणा की प्राथमिकता बराबर है, अतः बाएँ से दाएँ चलिए — 24 ÷ 4 × 3 = 18 है, 2 नहीं।')
        },
        {
          name: L('Bracketing / regrouping', 'कोष्ठकीकरण / पुनर्समूहन'),
          tag: L('Useful when the expression has a pattern', 'जब व्यंजक में प्रारूप हो तब उपयोगी'),
          steps: [
            { t: L('Group terms that look like a known identity or a round number (e.g. pairs that add to 100).', 'जो पद किसी ज्ञात सर्वसमिका या पूर्ण संख्या जैसे लगें, उन्हें समूहित कीजिए (जैसे 100 तक जोड़ने वाले युग्म)।'), m: `a×b + a×c = a(b + c)` },
            { t: L('Apply the regrouping and simplify.', 'पुनर्समूहन लगाइए और सरल कीजिए।'), m: `= ${N.fmt(val)}` }
          ],
          why: L('Regrouping uses the distributive law in reverse, which is exactly what makes long arithmetic mentally computable.',
                  'पुनर्समूहन वितरण नियम का उल्टा उपयोग है, और यही लंबी गणना को मन में करने योग्य बनाता है।'),
          watch: L('Only regroup with multiplication over addition — never pull terms through a division sign carelessly.',
                  'केवल गुणा-जोड़ में पुनर्समूहन कीजिए — भाग के चिह्न से पद लापरवाही से न निकालिए।')
        }
      ],
      verify: L('Estimate first: round each number and check the answer is the right size before writing it down.',
                'पहले अनुमान लगाइए: प्रत्येक संख्या को पूर्णांकित करके देखिए कि उत्तर सही परिमाण का है।'),
      related: []
    });
  };
})();
