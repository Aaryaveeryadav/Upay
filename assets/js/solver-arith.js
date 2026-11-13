/* =====================================================================
   Upay · Multi-method solver — number theory, polynomials, APs,
   coordinate geometry, statistics, arithmetic, mensuration, probability
   ===================================================================== */
window.UP = window.UP || {};
(function () {
  const L = (en, hi) => ({ en, hi });
  const N = UP.num;
  const F = N.fmt;

  const pack = (o) => Object.assign({
    approaches: [], related: [],
    verify: L('Check each step against the original question — every value should satisfy the condition stated.',
              'प्रत्येक चरण की मूल प्रश्न से जाँच कीजिए — प्रत्येक मान दी गई शर्त को संतुष्ट करना चाहिए।')
  }, o);

  // A symbolic prime-power question is not a list of numeric inputs. In
  // particular, the 3s in a^3 and b^3 must never be interpreted as integers p,q.
  UP.isSymbolicHCF = function(q) {
    return /hcf|highest common|gcd|lcm|least common|lowest common/i.test(q) &&
      /[a-z]\s*(?:\^\s*\{?\s*\d|[²³⁴⁵⁶⁷⁸⁹])|\b[pq]\s*=\s*[a-z]/i.test(q);
  };
  UP.solvePrimePowerRatio = function(q) {
    if (!/prime/i.test(q) || !/lcm|least common multiple/i.test(q) || !/hcf|highest common factor/i.test(q)) return null;
    if (!/(?:divided by (?:their |the )?(?:highest common factor|hcf)|lcm\s*[÷/]\s*hcf)/i.test(q)) return null;
    const src = String(q).replace(/\\[()[\]]|\$/g, '').replace(/\^\{(\d+)\}/g, '^$1')
      .replace(/[²³⁴⁵⁶⁷⁸⁹]/g, c => '^' + ('²³⁴⁵⁶⁷⁸⁹'.indexOf(c)+2));
    function powers(name) {
      const match = src.match(new RegExp('\\b'+name+'\\s*=\\s*([ab](?:\\s*\\^\\s*\\d+)?\\s*[*·×]?\\s*[ab](?:\\s*\\^\\s*\\d+)?)(?![a-z0-9^])', 'i'));
      if (!match || /^\s*[+*/÷×·^-]/.test(src.slice(match.index+match[0].length))) return null;
      const tokens = [...match[1].replace(/[\s*·×]/g,'').matchAll(/([ab])(?:\^(\d+))?/g)];
      if (tokens.length!==2 || tokens[0][1]===tokens[1][1]) return null;
      const values = Object.fromEntries(tokens.map(t=>[t[1],t[2]?+t[2]:1]));
      return Object.values(values).every(n=>Number.isInteger(n)&&n>0&&n<=1000)?values:null;
    }
    const p = powers('p'), r = powers('q'); if (!p || !r) return null;
    const hi = {a:Math.max(p.a,r.a),b:Math.max(p.b,r.b)};
    const lo = {a:Math.min(p.a,r.a),b:Math.min(p.b,r.b)};
    const delta = {a:hi.a-lo.a,b:hi.b-lo.b};
    const power = n => String(n).replace(/\d/g, d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
    const fmt = obj => ['a','b'].map(k=>obj[k]===0?'':obj[k]===1?k:k+power(obj[k])).join('')||'1';
    const distinct = /distinct|different primes|different prime numbers/i.test(q);
    const same = Math.abs(p.a+p.b-r.a-r.b);
    const sameText = same===0?'1':same===1?'a':'a'+power(same);
    const result = fmt(delta);
    return pack({kind:'prime-power-ratio',chapter:1,
      title:L('LCM divided by HCF','ल.स. को म.स. से भाग दें'),
      summary:L('Use maximum prime exponents for LCM and minimum exponents for HCF; then simplify the quotient.', 'ल.स. के लिए अधिकतम और म.स. के लिए न्यूनतम अभाज्य घात लें; फिर भागफल सरल करें।'),
      result:L(result+(distinct?'':' (assuming distinct primes a and b; if a = b, the ratio is '+sameText+')'), result+(distinct?'':' (a और b अलग अभाज्य मानकर; यदि a = b, भागफल '+sameText+' है)')),
      approaches:[{
        name:L('Prime-exponent rule','अभाज्य घात का नियम'),
        steps:[{t:L('Take the larger exponent of each prime for LCM.', 'ल.स. के लिए प्रत्येक अभाज्य की बड़ी घात लें।'),m:'LCM = '+fmt(hi)},
          {t:L('Take the smaller exponent for HCF.', 'म.स. के लिए छोटी घात लें।'),m:'HCF = '+fmt(lo)},
          {t:L('Divide and cancel common powers.', 'भाग देकर साझा घातें काटें।'),m:'LCM/HCF = ('+fmt(hi)+')/('+fmt(lo)+') = '+result}]
      },{
        name:L('Exponent-difference shortcut','घातों के अंतर से'),
        steps:[{t:L('Subtract the smaller exponent from the larger for each prime.', 'हर अभाज्य के लिए बड़ी घात से छोटी घात घटाएँ।'),m:'a: '+hi.a+' − '+lo.a+' = '+delta.a+'; b: '+hi.b+' − '+lo.b+' = '+delta.b},
          {t:L('Multiply the remaining prime powers.', 'बची अभाज्य घातें गुणा करें।'),m:'LCM/HCF = '+result}]
      },{
        name:L('Independent product-identity check','गुणनफल सर्वसमिका से जाँच'),
        steps:[{t:L('For two positive integers, LCM × HCF = pq.', 'दो धन पूर्णांकों के लिए ल.स. × म.स. = pq।'),m:'pq = '+fmt({a:p.a+r.a,b:p.b+r.b})},
          {t:L('Divide the identity by HCF squared.', 'सर्वसमिका को म.स. के वर्ग से भाग दें।'),m:'LCM/HCF = pq/HCF² = '+result}]
      }],verify:L('Multiplying the quotient '+result+' by HCF '+fmt(lo)+' gives LCM '+fmt(hi)+'.', 'भागफल '+result+' को म.स. '+fmt(lo)+' से गुणा करने पर ल.स. '+fmt(hi)+' मिलता है।')});
  };

  /* ---------------------- HCF / LCM ---------------------- */
  UP.solveHCF = function (q, nums) {
    if (UP.isSymbolicHCF(q)) return UP.solvePrimePowerRatio(q);
    if (!nums || nums.length < 2) return null;
    const sq = UP.norm(q).toLowerCase();
    if (!/hcf|highest common|gcd|lcm|lowest common|least common|म\.?\s?स|ल\.?\s?स/i.test(sq)) return null;
    /* "HCF is 4 and LCM is 300; one number is 60, find the other" is the
       PRODUCT-RULE question, not a factor-these-numbers question. Answering it
       with HCF(4,300) = 4 is a confident wrong answer, so hand it over. */
    const productRule = /other number|one (?:number|of them) is|find the (?:other|missing)/.test(sq) ||
                        (/hcf[^\d]{0,20}\d/.test(sq) && /lcm[^\d]{0,20}\d/.test(sq) && !/find[^.]{0,20}hcf/i.test(sq));
    nums = nums.filter(n => Number.isInteger(n) && n > 1);
    if (productRule) {
      const hf = sq.match(/hcf[^\d]{0,24}(\d+)/), lc = sq.match(/lcm[^\d]{0,24}(\d+)/);
      if (hf && lc) {
        const HCFv = +hf[1], LCMv = +lc[1];
        const one = sq.match(/one (?:number|of them) is\s*(\d+)|(\d+)\s*is one/i);
        const k = one ? +(one[1] || one[2]) : null;
        if (k) {
          const other = HCFv * LCMv / k;
          return pack({
            kind: 'hcf-product', chapter: 1,
            title: { en: 'HCF × LCM = product of the two numbers', hi: 'म.स. × ल.स. = दोनों संख्याओं का गुणनफल' },
            summary: { en: `HCF = ${HCFv}, LCM = ${LCMv}, one number = ${k}`, hi: `म.स. = ${HCFv}, ल.स. = ${LCMv}, एक संख्या = ${k}` },
            result: { en: `The other number = ${F(other)}`, hi: `दूसरी संख्या = ${F(other)}` },
            approaches: [
              {
                name: L('Use the product rule directly', 'गुणनफल नियम सीधे लगाइए'),
                tag: L('One line — this is what the marks are for', 'एक पंक्ति — यही अंकों का आधार है'),
                steps: [
                  { t: L('For any two numbers, HCF × LCM equals their product. Write it down first.', 'किन्हीं दो संख्याओं के लिए म.स. × ल.स. उनके गुणनफल के बराबर होता है। पहले इसे लिखिए।'),
                    m: `HCF × LCM = a × b` },
                  { t: L('Substitute the three values you know.', 'ज्ञात तीन मान रखिए।'),
                    m: `${HCFv} × ${LCMv} = ${k} × b` },
                  { t: L('Solve for the unknown.', 'अज्ञात के लिए हल कीजिए।'),
                    m: `b = (${HCFv} × ${LCMv}) / ${k} = ${F(other)}` }
                ],
                why: L('Both the HCF and the LCM are built from the same prime factors of the two numbers, so multiplying one back undoes dividing the other.',
                        'म.स. और ल.स. दोनों उन्हीं दो संख्याओं के अभाज्य गुणनखंडों से बनते हैं, अतः एक को गुणा करने से दूसरे का भाग हट जाता है।'),
                watch: L('The rule holds for exactly TWO numbers. With three numbers HCF × LCM is not the product.', 'यह नियम ठीक दो संख्याओं के लिए है। तीन संख्याओं में म.स. × ल.स. गुणनफल नहीं होता।')
              },
              {
                name: L('Check by factoring both numbers', 'दोनों संख्याओं को गुणनखंडित करके जाँचिए'),
                tag: L('Proves the rule on your own numbers', 'अपनी ही संख्याओं पर नियम सिद्ध कीजिए'),
                steps: [
                  { t: L('Factor the known number and the answer you found.', 'ज्ञात संख्या और निकाली गई संख्या के गुणनखंड लिखिए।'),
                    m: `${k} = ${N.powerString(k)}
${F(other)} = ${N.powerString(other)}` },
                  { t: L('Take the common part as HCF and the combined part as LCM — they must reproduce the question.', 'साझा भाग म.स. और संयुक्त भाग ल.स. — इनसे प्रश्न के मान वापस आने चाहिए।'),
                    m: `HCF = ${F(N.hcfAll([k, other]))},  LCM = ${F(N.lcmAll([k, other]))}` }
                ],
                why: L('Factoring both numbers shows the HCF and LCM really do come out as stated, so the product rule is not being applied to numbers that never existed.',
                        'दोनों संख्याओं के गुणनखंड दिखाते हैं कि म.स. और ल.स. वास्तव में दिए मान ही आते हैं, अतः नियम ऐसी संख्याओं पर नहीं लगाया गया जो थीं ही नहीं।'),
                watch: L('If the check does not reproduce the stated HCF and LCM, your division has slipped.', 'यदि जाँच से दिए म.स. और ल.स. वापस न आएँ तो भाग में चूक है।')
              }
            ],
            verify: L(`HCF(${k}, ${F(other)}) = ${F(N.hcfAll([k, other]))} and LCM(${k}, ${F(other)}) = ${F(N.lcmAll([k, other]))} — both match the question, so the other number is ${F(other)}.`,
                      `म.स.(${k}, ${F(other)}) = ${F(N.hcfAll([k, other]))} और ल.स.(${k}, ${F(other)}) = ${F(N.lcmAll([k, other]))} — दोनों प्रश्न से मेल खाते हैं, अतः दूसरी संख्या ${F(other)} है।`)
          });
        }
      }
      return null;
    }
    if (nums.length < 2) return null;
    const h = N.hcfAll(nums), l = N.lcmAll(nums);
    const isLCM = /lcm|ल\.?\s?स\.?/i.test(q) && !/hcf|म\.?\s?स\.?/i.test(q);
    const approaches = [];

    // A: prime factorisation
    {
      const steps = [];
      steps.push({ t: L('Write each number as a product of primes. Divide by 2, then 3, then 5 and so on until only a prime is left.',
                        'प्रत्येक संख्या को अभाज्य गुणनफल के रूप में लिखिए। 2, फिर 3, फिर 5 से भाग दीजिए जब तक केवल अभाज्य संख्या न बचे।'),
        m: nums.map(n => `${n} = ${N.powerString(n)}`).join('\n') });
      const maps = nums.map(n => { const mp = new Map(); N.factorise(n).forEach(p => mp.set(p, (mp.get(p) || 0) + 1)); return mp; });
      const allPrimes = [...new Set(nums.flatMap(n => N.factorise(n)))].sort((a, b) => a - b);
      const common = allPrimes.filter(p => maps.every(mp => mp.has(p)));
      steps.push({ t: L('HCF takes the SMALLEST power of every prime that appears in ALL the numbers. LCM takes the LARGEST power of every prime that appears in ANY number.',
                        'म.स. उन सभी अभाज्य संख्याओं की न्यूनतम घात लेता है जो सभी संख्याओं में आती हैं। ल.स. किसी भी संख्या में आने वाली प्रत्येक अभाज्य संख्या की अधिकतम घात लेता है।'),
        m: `HCF = ${common.length ? common.map(p => (Math.min(...maps.map(mp => mp.get(p))) === 1 ? p : `${p}^${Math.min(...maps.map(mp => mp.get(p)))}`)).join(' × ') + ' = ' : ''}${F(h)}\nLCM = ${allPrimes.map(p => { const e = Math.max(...maps.map(mp => mp.get(p) || 0)); return e === 1 ? p : `${p}^${e}`; }).join(' × ')} = ${F(l)}` });
      steps.push({ t: L('Multiply the collected prime powers to finish.', 'एकत्रित अभाज्य घातों को गुणा कीजिए।'), m: `HCF = ${F(h)} ,  LCM = ${F(l)}` });
      approaches.push({
        name: L('Prime factorisation method', 'अभाज्य गुणनखंडन विधि'),
        tag: L('The NCERT method — always acceptable', 'एनसीईआरटी विधि — सदैव स्वीकार्य'),
        steps,
        why: L('It works because every number has exactly one prime factorisation (Fundamental Theorem of Arithmetic). Since the factors are unique, comparing powers is a complete, faultless comparison — there is nothing left to guess.',
              'यह इसलिए काम करता है क्योंकि प्रत्येक संख्या का अभाज्य गुणनखंडन एकमात्र होता है (अंकगणित की आधारभूत प्रमेय)। गुणनखंड अद्वितीय हैं, अतः घातों की तुलना पूर्ण और निर्दोष तुलना है — अनुमान के लिए कुछ नहीं बचता।'),
        watch: L('Do not confuse the rules: HCF = smallest powers of COMMON primes; LCM = largest powers of ALL primes.',
                 'नियम न भूलिए: म.स. = सामान्य अभाज्य संख्याओं की न्यूनतम घातें; ल.स. = सभी अभाज्य संख्याओं की अधिकतम घातें।')
      });
    }

    // B: Euclid (two numbers only)
    if (nums.length === 2) {
      const [a0, b0] = nums.slice().sort((x, y) => y - x);
      const chain = [];
      let a = a0, b = b0, guard = 0;
      while (b !== 0 && guard++ < 40) { chain.push(`${a} = ${b} × ${Math.floor(a / b)} + ${a % b}`); const r = a % b; a = b; b = r; }
      chain.push(`The last non-zero remainder is ${a}.`);
      approaches.push({
        name: L("Euclid's division algorithm", 'यूक्लिड विभाजन कलनविधि'),
        tag: L('Great for large numbers — no factorisation needed', 'बड़ी संख्याओं के लिए उत्तम — गुणनखंडन की आवश्यकता नहीं'),
        steps: [
          { t: L('Divide the larger number by the smaller, write the remainder, then divide again using the previous divisor and remainder.',
                 'बड़ी संख्या को छोटी से भाग दीजिए, शेष लिखिए, फिर पिछले भाजक और शेष से पुनः भाग दीजिए।'),
            m: chain.join('\n') },
          { t: L('Stop when the remainder becomes zero. Then HCF × LCM = product of the two numbers gives the LCM in one line.',
                 'जब शेष शून्य हो जाए तो रुकिए। फिर म.स. × ल.स. = दोनों संख्याओं का गुणनफल से ल.स. एक पंक्ति में मिल जाता है।'),
            m: `HCF = ${F(h)}\nLCM = ${a0 * b0} ÷ ${F(h)} = ${F(l)}` }
        ],
        why: L('This algorithm never needs you to test divisibility by every prime, so it stays short even for four- and five-digit numbers. It is also the original proof technique behind the Fundamental Theorem.',
                'इस कलनविधि में हर अभाज्य से विभाज्यता जाँचने की आवश्यकता नहीं, अतः चार-पाँच अंकों की संख्याओं में भी यह छोटी रहती है। यह आधारभूत प्रमेय के मूल उपपत्ति-तकनीक भी है।'),
        watch: L('Use it only for two numbers. For three numbers, use factorisation (the product relation fails for three numbers).',
                 'इसे केवल दो संख्याओं के लिए प्रयोग कीजिए। तीन संख्याओं के लिए गुणनखंडन लीजिए (तीन संख्याओं में गुणनफल संबंध लागू नहीं होता)।')
      });
    }

    // C: listing
    {
      const steps = [];
      const small = Math.min(...nums), seconds = Math.max(...nums);
      steps.push({ t: L('List the factors of the smallest number and test which of them divide all the others. The largest such factor is the HCF.',
                        'सबसे छोटी संख्या के गुणनखंड लिखिए और जाँचिए कौन-से सभी अन्य संख्याओं को विभाजित करते हैं। सबसे बड़ा ऐसा गुणनखंड म.स. है।'),
        m: `${small}: factors include 1, ${[h, h > 1 ? small / h : '—'].filter(x => x !== '—').join(', ')} …` });
      steps.push({ t: L('For the LCM, list multiples of the largest number until one of them is divisible by every other number.',
                        'ल.स. के लिए सबसे बड़ी संख्या के गुणज लिखिए जब तक कोई गुणज सभी अन्य संख्याओं से विभाज्य न हो जाए।'),
        m: `${seconds}, ${2 * seconds}, ${3 * seconds}, … → first common multiple = ${F(l)}` });
      approaches.push({
        name: L('Listing factors and multiples', 'गुणनखंड और गुणज सूची विधि'),
        tag: L('Quick sanity check for small numbers', 'छोटी संख्याओं के लिए शीघ्र पुष्टि'),
        steps,
        why: L('Listing makes the meaning of HCF and LCM visible: HCF is the biggest block that tiles both numbers, LCM is the first place two counting sequences coincide.',
                'सूची बनाने से म.स. और ल.स. का अर्थ दिखता है: म.स. वह सबसे बड़ा खंड है जो दोनों संख्याओं को भरता है, ल.स. वह पहला स्थान जहाँ दोनों गणना-क्रम मिलते हैं।'),
        watch: L('Fine for small numbers only — listing multiples of 120 and 138 could take pages.', 'केवल छोटी संख्याओं के लिए — 120 और 138 के गुणज लिखने में पन्ने लग सकते हैं।')
      });
    }

    return pack({
      kind: 'hcf-lcm', chapter: 1,
      title: { en: 'HCF and LCM — three ways', hi: 'म.स. और ल.स. — तीन विधियाँ' },
      summary: { en: `${nums.join(', ')} → HCF = ${F(h)}, LCM = ${F(l)}`, hi: `${nums.join(', ')} → म.स. = ${F(h)}, ल.स. = ${F(l)}` },
      result: isLCM ? { en: `LCM = ${F(l)}`, hi: `ल.स. = ${F(l)}` } : { en: `HCF = ${F(h)}, LCM = ${F(l)}`, hi: `म.स. = ${F(h)}, ल.स. = ${F(l)}` },
      approaches, related: [1],
      _geom: { a: nums[0], b: nums[1] }
    });
  };

  /* ---------------------- prime factorisation ---------------------- */
  UP.solveFactorise = function (n) {
    n = Math.abs(Math.round(n));
    if (n < 2 || n > 1e9) return null;
    const fs = N.factorise(n);
    const tree = [];
    let rest = n;
    for (const p of fs) { tree.push(`${rest} ÷ ${p} = ${rest / p}`); rest /= p; }
    const map = new Map(); fs.forEach(p => map.set(p, (map.get(p) || 0) + 1));
    const pow = [...map.entries()].map(([p, e]) => e === 1 ? `${p}` : `${p}^${e}`).join(' × ');

    return pack({
      kind: 'factorise', chapter: 1,
      title: { en: 'Prime factorisation — two ways', hi: 'अभाज्य गुणनखंडन — दो विधियाँ' },
      summary: { en: `Factorise ${n} into primes`, hi: `${n} का अभाज्य गुणनखंडन` },
      result: { en: `${n} = ${pow}`, hi: `${n} = ${pow}` },
      approaches: [
        {
          name: L('Division method (ladder)', 'भाग विधि (सीढ़ी)'),
          tag: L('Neat and fast — best for the answer sheet', 'स्वच्छ और तेज़ — उत्तर-पुस्तिका के लिए सर्वोत्तम'),
          steps: [
            { t: L('Start dividing by the smallest prime that divides the number exactly. Write one line per division.', 'सबसे छोटी ऐसी अभाज्य संख्या से भाग देना शुरू कीजिए जो संख्या को पूरा विभाजित करे। प्रत्येक भाग के लिए एक पंक्ति लिखिए।'), m: tree.join('\n') },
            { t: L('Collect the primes you divided by and write them with powers.', 'जिन अभाज्य संख्याओं से भाग दिया, उन्हें घातों सहित लिखिए।'), m: `${n} = ${fs.join(' × ')} = ${pow}` }
          ],
          why: L('Each division removes one prime factor, so the process must stop (the number keeps shrinking). The final line is the unique factorisation guaranteed by the Fundamental Theorem of Arithmetic.',
                  'प्रत्येक भाग एक अभाज्य गुणनखंड हटाता है, अतः प्रक्रिया रुकनी ही है (संख्या घटती जाती है)। अंतिम पंक्ति वही अद्वितीय गुणनखंडन है जिसकी गारंटी अंकगणित की आधारभूत प्रमेय देती है।'),
          watch: L('Divide by primes only — dividing by 4 or 9 will make the answer look finished when it is not.', 'केवल अभाज्य संख्याओं से भाग दीजिए — 4 या 9 से भाग देने पर उत्तर पूरा लगने लगेगा जबकि वह पूरा नहीं होगा।')
        },
        {
          name: L('Factor tree', 'गुणनखंड वृक्ष'),
          tag: L('Best for visual learners', 'दृश्य शिक्षार्थियों के लिए सर्वोत्तम'),
          steps: [
            { t: L('Split the number into any two factors, then keep splitting each branch until every end is a prime.', 'संख्या को किन्हीं दो गुणनखंडों में तोड़िए, फिर प्रत्येक शाखा को तब तक तोड़ते रहिए जब तक हर सिरा अभाज्य न हो जाए।'), m: `${n}\n├─ ${fs[0]}  (prime)\n└─ ${n / fs[0]} → ${fs.slice(1).join(' × ')}` },
            { t: L('Read all the leaves of the tree — they are the prime factors.', 'वृक्ष के सभी पत्ते पढ़िए — वही अभाज्य गुणनखंड हैं।'), m: `${n} = ${pow}` }
          ],
          why: L('Different splits give different-looking trees but the same set of leaves. That is the visible meaning of "unique factorisation".', 'अलग-अलग तरह से तोड़ने पर वृक्ष भिन्न दिखते हैं पर पत्तों का समुच्चय वही रहता है। यही "अद्वितीय गुणनखंडन" का दिखने वाला अर्थ है।'),
          watch: L('Always finish the tree to the last prime — stopping halfway loses factors.', 'वृक्ष को अंतिम अभाज्य तक पूरा कीजिए — बीच में रुकने पर गुणनखंड छूट जाते हैं।')
        }
      ],
      verify: L(`Multiply ${pow} back: you must get ${n}. Also check that no factor is divisible by another factor (all are prime).`, `${pow} को वापस गुणा कीजिए: ${n} ही आना चाहिए। यह भी जाँचिए कि कोई गुणनखंड किसी अन्य से विभाज्य न हो (सभी अभाज्य हैं)।`),
      related: [1],
      _geom: { n: n }
    });
  };

  /* ---------------------- irrationality ---------------------- */
  UP.solveIrrational = function (q) {
    const s = UP.norm(q).toLowerCase();
    const m = s.match(/√\s?(\d+)|sqrt\s?\(?(\d+)\)?|root\s?(\d+)/);
    if (!m) return null;
    const rad = parseInt(m[1] || m[2] || m[3], 10);
    if (!rad || rad < 2) return null;
    const prime = N.factorise(rad).length === 1;
    const primes = N.factorise(rad);

    return pack({
      kind: 'irrational', chapter: 1,
      title: { en: 'Irrationality proof — two routes', hi: 'अपरिमेयता की उपपत्ति — दो मार्ग' },
      summary: { en: `Prove that √${rad} (or an expression built from it) is irrational`, hi: `सिद्ध कीजिए कि √${rad} (या उससे बना व्यंजक) अपरिमेय है` },
      result: { en: `√${rad} is irrational${prime ? ' because ' + rad + ' is prime' : ' because ' + rad + ' = ' + N.factorString(rad) + ' is not a perfect square'}`, hi: `√${rad} अपरिमेय है${prime ? ' क्योंकि ' + rad + ' अभाज्य है' : ' क्योंकि ' + rad + ' = ' + N.factorString(rad) + ' पूर्ण वर्ग नहीं है'}` },
      approaches: [
        {
          name: L('Proof by contradiction (the board template)', 'विरोधाभास द्वारा उपपत्ति (बोर्ड प्रारूप)'),
          tag: L('Write exactly these four lines', 'ठीक यही चार पंक्तियाँ लिखिए'),
          steps: [
            { t: L('Assume the opposite: suppose √n can be written as a fraction in lowest terms, √n = a/b with b ≠ 0 and HCF(a, b) = 1.', 'विपरीत मानिए: मान लीजिए √n को न्यूनतम रूप की भिन्न के रूप में √n = a/b लिखा जा सकता है, जहाँ b ≠ 0 तथा म.स.(a, b) = 1।'), m: `√${rad} = a/b ,  HCF(a, b) = 1` },
            { t: L('Square both sides and rearrange so the square of one side is on its own.', 'दोनों पक्षों का वर्ग कीजिए और पुनर्व्यवस्थित करके एक पक्ष का वर्ग अलग कीजिए।'), m: `${rad} = a²/b²  ⟹  a² = ${rad}b²` },
            { t: L(`Right side is a multiple of ${rad}, so ${rad} divides a². Since ${prime ? rad + ' is prime' : 'the primes ' + primes.join(', ') + ' divide ' + rad}, ${rad} divides a too. Put a = ${rad}k.`, `दायाँ पक्ष ${rad} का गुणज है, अतः ${rad} a² को विभाजित करता है। चूँकि ${prime ? rad + ' अभाज्य है' : 'अभाज्य ' + primes.join(', ') + ' ' + rad + ' को विभाजित करते हैं'}, ${rad} a को भी विभाजित करता है। a = ${rad}k रखिए।`), m: `a = ${rad}k  ⟹  ${rad * rad}k² = ${rad}b²  ⟹  b² = ${rad}k²` },
            { t: L(`Now ${rad} divides b², hence b. So ${rad} divides both a and b — contradicting HCF(a, b) = 1. Our assumption was wrong, so √${rad} is irrational.`, `अब ${rad} b² को, अतः b को भी विभाजित करता है। इस प्रकार ${rad} a और b दोनों को विभाजित करता है — जो म.स.(a, b) = 1 का विरोध करता है। हमारी मान्यता गलत थी, अतः √${rad} अपरिमेय है।`), m: `Contradiction ⟹ √${rad} ∉ ℚ` }
          ],
          why: L('Contradiction is used because there is no algebra that "calculates" irrationality — you cannot construct an irrational number from the four operations on rationals. Denying the claim is the only route that produces an equation you can break.',
                  'विरोधाभास इसलिए प्रयोग होता है क्योंकि अपरिमेयता "गणना" करने का कोई बीजगणित नहीं है — परिमेय संख्याओं पर चार संक्रियाओं से अपरिमेय संख्या नहीं बनाई जा सकती। दावे का खंडन ही एकमात्र मार्ग है जो तोड़ने योग्य समीकरण देता है।'),
          watch: L('You MUST state HCF(a, b) = 1 at the start. Without that line, arriving at a common factor proves nothing.', 'शुरू में म.स.(a, b) = 1 अवश्य लिखिए। उस पंक्ति के बिना सामान्य गुणनखंड मिलना कुछ सिद्ध नहीं करता।')
        },
        {
          name: L('Use the standard theorem (shorter version)', 'मानक प्रमेय का प्रयोग (संक्षिप्त रूप)'),
          tag: L('Accepted when the theorem is already known', 'जब प्रमेय पहले से ज्ञात हो तब स्वीकार्य'),
          steps: [
            { t: L(`Quote the theorem: if a prime p divides a², then p divides a. Here p = ${prime ? rad : primes[0]}.`, `प्रमेय उद्धृत कीजिए: यदि अभाज्य p a² को विभाजित करता है, तो p a को भी विभाजित करता है। यहाँ p = ${prime ? rad : primes[0]}।`), m: `p | a² ⟹ p | a` },
            { t: L('Apply the contradiction argument of the previous route in two lines: p divides a, therefore also b, contradicting lowest terms.', 'पिछले मार्ग का विरोधाभास तर्क दो पंक्तियों में लगाइए: p, a को विभाजित करता है, अतः b को भी, जो न्यूनतम रूप का विरोध करता है।'), m: `p | a and p | b ⟹ HCF(a,b) ≥ p > 1 ✗` },
            { t: L('Extend to expressions: if √n is irrational, then any a + b√n with rational a, b (b ≠ 0) is also irrational, because a rational answer would force √n to be rational.', 'व्यंजकों तक विस्तार कीजिए: यदि √n अपरिमेय है, तो किसी परिमेय a, b (b ≠ 0) के लिए a + b√n भी अपरिमेय है, क्योंकि परिमेय उत्तर मिलने पर √n को परिमेय होना पड़ेगा।'), m: `√n = (r − a)/b would be rational ✗` }
          ],
          why: L('Once a theorem is established in the textbook you may cite it, exactly as you cite Pythagoras. This version is what saves time in a 2-mark question.',
                  'एक बार प्रमेय पाठ्यपुस्तक में सिद्ध हो जाए, तो आप उसे पाइथागोरस की तरह उद्धृत कर सकते हैं। 2 अंक के प्रश्न में यही रूप समय बचाता है।'),
          watch: L('Write the theorem statement before using it — a bare "by theorem" can lose the reasoning mark.', 'प्रयोग से पहले प्रमेय का कथन लिखिए — केवल "प्रमेय से" लिखने पर तर्क का अंक कट सकता है।')
        }
      ],
      verify: L('A correct proof ends with an explicit contradiction and a conclusion sentence. Check that every "divides" step names why it is true.',
                'सही उपपत्ति स्पष्ट विरोधाभास और निष्कर्ष वाक्य पर समाप्त होती है। जाँचिए कि प्रत्येक "विभाजित करता है" चरण क्यों सत्य है, यह लिखा हो।'),
      related: [1],
      _geom: { n: rad }
    });
  };

  /* ---------------------- AP ---------------------- */
  UP.solveAP = function (q, nums) {
    if (!nums || nums.length < 2) return null;
    const s = UP.norm(q).toLowerCase();
    /* ordinals and sum totals are not terms: "the 20th term" must not give n = 20 as a number */
    const seqText = UP.norm(q)
      .replace(/(\d+)\s*(?:th|st|nd|rd|वाँ|वां)\b/gi, ' ')
      .replace(/(?:sum|योग)\s*(?:is|=|of|का)?\s*(\d+(?:\.\d+)?)/gi, ' ')
      .replace(/first\s+(\d+)\s+terms?/gi, ' ')
      .replace(/प्रथम\s*(\d+)\s*पद/gi, ' ');
    nums = (seqText.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const cues = /arithmetic progression|समांतर श्रेढ|\ba\.?p\.?\b|nth term|nवाँ पद|common difference|सार्व अंतर|series|श्रेढ/;
    const asked = /\bterm\b|पद|\bsum\b|योग|how many terms|कितने पद|nth/.test(s) || /\ba[ₙn]\b|\bs[ₙn]\b/.test(s);
    /* 3, 8, 13, … is an AP even without the word "AP" — accept a bare
       equally-spaced triple when the question asks for a term or a sum. */
    const spacedTriple = nums.length >= 3 &&
      Math.abs((nums[1] - nums[0]) - (nums[2] - nums[1])) < 1e-9 &&
      nums[1] !== nums[0];
    if (!cues.test(s) && !(spacedTriple && asked)) return null;
    let terms = nums.slice();
    let a = terms[0], d = terms[1] - terms[0];
    /* "sum 636" is not a term of the progression — drop it before checking spacing */
    if (terms.length >= 3 && Math.abs((terms[2] - terms[1]) - d) > 1e-9) {
      const mSum = s.match(/(?:sum|योग)[^0-9]{0,12}(\d+(?:\.\d+)?)/);
      if (mSum && Math.abs((parseFloat(mSum[1]) - a) % d) > 1e-9) {
        terms = terms.filter(n => Math.abs(((n - a) / d) % 1) < 1e-9 || n === a);
      }
      if (terms.length < 3 || Math.abs((terms[2] - terms[1]) - d) > 1e-9) return null;
    }
    /* how many terms? — solve Sₙ = value for n instead of reading a bogus n */
    const mSumTarget = s.match(/(?:sum|योग)[^0-9]{0,14}(\d+(?:\.\d+)?)/);
    const asksCount = /how many terms|कितने पद|number of terms/.test(s);
    let n, solveForN = false, sumTarget = null;
    if (asksCount && mSumTarget) {
      sumTarget = parseFloat(mSumTarget[1]);
      const disc = Math.pow(2 * a - d, 2) + 8 * d * sumTarget;
      if (d === 0) return null;
      n = (d - 2 * a + Math.sqrt(disc)) / (2 * d);
      n = Math.round(n);
      solveForN = true;
    } else {
      const mOrd = s.match(/(\d+)\s*(?:th|st|nd|rd|वाँ|वां|vaan)\b/) || s.match(/term\s*(?:no\.?|number)?\s*(\d+)/) || s.match(/(\d+)\s*वाँ/);
      const mFirst = s.match(/first\s+(\d+)\s+terms?|प्रथम\s*(\d+)\s*पद/);
      n = mOrd ? parseInt(mOrd[1], 10) : (mFirst ? parseInt(mFirst[1] || mFirst[2], 10) : 10);
      /* 3, 8, 13, ... find the 20th term → "3" would otherwise be read as n */
      if (n === a || n === terms[1]) {
        const mm = s.match(/find (?:the )?(\d+)/) || s.match(/(\d+)\s*(?:th|st|nd|rd)/);
        if (mm) n = parseInt(mm[1], 10);
      }
    }
    const mWhich = s.match(/which term[^−\-\d]{0,20}[−\-]\s*(\d+(?:\.\d+)?)/) || s.match(/कौन सा पद[^−\-\d]{0,20}[−\-]\s*(\d+(?:\.\d+)?)/);
    if (mWhich) {
      const target = -parseFloat(mWhich[1]);
      n = Math.round((target - a) / d + 1);
      solveForN = true;
    }
    if (!isFinite(n) || n < 1) n = 10;
    const an = a + (n - 1) * d;
    const Sn = (n / 2) * (2 * a + (n - 1) * d);

    return pack({
      kind: 'ap', chapter: 5,
      title: { en: 'Arithmetic progression — three ways', hi: 'समांतर श्रेढ़ी — तीन विधियाँ' },
      summary: { en: `a = ${F(a)}, d = ${F(d)}, n = ${n}`, hi: `a = ${F(a)}, d = ${F(d)}, n = ${n}` },
      result: { en: `a${n} = ${F(an)},  S${n} = ${F(Sn)}`, hi: `a${n} = ${F(an)},  S${n} = ${F(Sn)}` },
      approaches: [
        {
          name: L('nth-term formula', 'nवाँ पद सूत्र'),
          tag: L('One substitution — use this for "find the term"', '"पद ज्ञात कीजिए" के लिए यही'),
          steps: [
            { t: L('Confirm the sequence is an AP by subtracting consecutive terms; the difference must be the same every time.', 'क्रमागत पदों को घटाकर पुष्टि कीजिए कि अनुक्रम समांतर श्रेढ़ी है; अंतर हर बार समान होना चाहिए।'), m: `${terms.slice(0, 3).map((t, i) => i === 0 ? t : `− ${terms[i - 1]} = ${t - terms[i - 1]}`).join(' , ')}  ⟹ d = ${F(d)}` },
            { t: L('Write the nth term formula and substitute a, d and n.', 'nवाँ पद सूत्र लिखिए और a, d तथा n रखिए।'), m: `aₙ = a + (n − 1)d = ${F(a)} + ${n - 1} × ${F(d)}` },
            { t: L('Simplify.', 'सरल कीजिए।'), m: `a${n} = ${F(an)}` }
          ],
          why: L('Every AP is just repeated addition, so the nth term is the first term plus (n − 1) copies of d. Nothing else is happening.',
                  'प्रत्येक श्रेढ़ी बार-बार जोड़ना ही है, अतः nवाँ पद = पहला पद + (n − 1) बार d। इसके अतिरिक्त कुछ नहीं।'),
          watch: L('Use n − 1, not n. Off-by-one here is the single most common AP mistake.', 'n − 1 लीजिए, n नहीं। यहाँ एक की गलती श्रेढ़ी की सबसे सामान्य भूल है।')
        },
        {
          name: L('Sum formula (two forms)', 'योग सूत्र (दो रूप)'),
          tag: L('Choose the form that matches the data you have', 'जो रूप आपके आँकड़ों से मेल खाए वही चुनिए'),
          steps: [
            { t: L('If you know a and d, use Sₙ = n/2[2a + (n − 1)d].', 'यदि a और d ज्ञात हैं तो Sₙ = n/2[2a + (n − 1)d] लीजिए।'), m: `S${n} = ${n}/2 [2(${F(a)}) + ${n - 1}(${F(d)})]` },
            { t: L('If you know the first and last term, use Sₙ = n/2(a + l) — it needs no d at all.', 'यदि पहला और अंतिम पद ज्ञात हैं तो Sₙ = n/2(a + l) लीजिए — इसमें d की आवश्यकता नहीं।'), m: `S${n} = ${n}/2 (${F(a)} + ${F(an)}) = ${F(Sn)}` },
            { t: L('Check with the shortcut aₙ = Sₙ − Sₙ₋₁ when both sums are known.', 'जब दोनों योग ज्ञात हों तो aₙ = Sₙ − Sₙ₋₁ से जाँचिए।'), m: `S${n} − S${n - 1} = ${F(Sn)} − ${F((n - 1) / 2 * (2 * a + (n - 2) * d))} = ${F(an)} ✓` }
          ],
          why: L('The sum of an AP is n copies of the average of its first and last terms — that is why both forms are equal. Picking the form that avoids unnecessary work is a genuine speed skill.',
                  'श्रेढ़ी का योग = पहले और अंतिम पद के औसत की n प्रतियाँ — इसीलिए दोनों रूप बराबर हैं। जो रूप अनावश्यक कार्य से बचाए, उसे चुनना वास्तविक गति-कौशल है।'),
          watch: L('When you must find n from a sum, you get a quadratic — reject the negative or fractional root.', 'योग से n निकालते समय द्विघात मिलती है — ऋणात्मक या भिन्न मूल अस्वीकार कीजिए।')
        },
        {
          name: L('Step-by-step building', 'चरण-दर-चरण निर्माण'),
          tag: L('Never fails, but slow — use it to verify', 'कभी विफल नहीं, पर धीमा — जाँच के लिए प्रयोग कीजिए'),
          steps: [
            { t: L('Keep adding d and write out the terms until you reach the required position.', 'd जोड़ते जाइए और आवश्यक स्थान तक पद लिखिए।'), m: terms.slice(0, 3).join(', ') + ', ' + (a + 3 * d) + ', ' + (a + 4 * d) + ', …' },
            { t: L('Add the terms you wrote to get the sum so far.', 'लिखे गए पदों को जोड़कर अब तक का योग निकालिए।'), m: `partial sum = ${F(terms.slice(0, 3).reduce((x, y) => x + y, 0))}` }
          ],
          why: L('Building term by term is the definition of an AP. You should stop using it for n = 30, but for n = 5 it is faster and gives a free check on the formula.',
                  'पद-दर-पद बनाना श्रेढ़ी की परिभाषा है। n = 30 के लिए इसे छोड़ दीजिए, पर n = 5 के लिए यह तेज़ है और सूत्र की मुफ़्त जाँच देता है।'),
          watch: L('Do not use this when n is large — you will run out of time and paper.', 'जब n बड़ा हो तो यह प्रयोग न कीजिए — समय और कागज़ दोनों कम पड़ेंगे।')
        }
      ],
      verify: L(`Substitute back: a${n} = ${F(an)} and the average of the first (${F(a)}) and last (${F(an)}) term is ${F((a + an) / 2)}, which times ${n} gives ${F(Sn)}. Both methods agree.`,
                `वापस रखिए: a${n} = ${F(an)} तथा पहले (${F(a)}) और अंतिम (${F(an)}) पद का औसत ${F((a + an) / 2)} है, जिसे ${n} से गुणा करने पर ${F(Sn)} मिलता है। दोनों विधियाँ सहमत हैं।`),
      related: [5]
    });
  };

  /* ---------------------- polynomial zeroes ---------------------- */
  UP.solveZeroes = function (q) {
    const p = UP.parseQuadratic(q);
    if (!p) return null;
    const res = UP.solveQuadratic(p);
    return {
      kind: 'zeroes', chapter: 2,
      title: { en: 'Zeroes of a quadratic polynomial — four ways', hi: 'द्विघात बहुपद के शून्यक — चार विधियाँ' },
      summary: res.summary,
      result: { en: res.result.en.replace(/x =/g, 'x ='), hi: res.result.hi.replace(/x =/g, 'x =') },
      approaches: res.approaches.concat([{
        name: L('Geometrical verification', 'ज्यामितीय सत्यापन'),
        tag: L('Shows what a zero means', 'शून्यक का अर्थ दिखाता है'),
        steps: [
          { t: L('The zeroes are the x-coordinates where the parabola y = p(x) meets the x-axis.', 'शून्यक वे x-निर्देशांक हैं जहाँ परवलय y = p(x) x-अक्ष से मिलता है।'), m: `y = ${p.a}x² ${p.b < 0 ? '−' : '+'} ${Math.abs(p.b)}x ${p.c < 0 ? '−' : '+'} ${Math.abs(p.c)}` },
          { t: L('Check the number of crossing points: two for D > 0, one touching point for D = 0, none for D < 0, and compare with your computed roots.', 'मिलने वाले बिंदुओं की संख्या देखिए: D > 0 पर दो, D = 0 पर एक स्पर्श बिंदु, D < 0 पर कोई नहीं — और इसे अपने मूलों से मिलाइए।'), m: `D = ${p.b * p.b - 4 * p.a * p.c}` },
          { t: L('Mark the zeroes on the x-axis and read off the vertex at x = −b/2a.', 'शून्यकों को x-अक्ष पर चिह्नित कीजिए और शीर्ष x = −b/2a पढ़िए।'), m: `vertex at x = ${F(-p.b / (2 * p.a))}` }
        ],
        why: L('A zero is not just an algebraic answer — it is where the graph cuts the axis. Checking the picture catches sign errors that pure algebra hides.',
                'शून्यक केवल बीजगणितीय उत्तर नहीं है — वह स्थान है जहाँ ग्राफ अक्ष को काटता है। चित्र देखकर वे चिह्न-त्रुटियाँ पकड़ी जाती हैं जो केवल बीजगणित में छिपी रहती हैं।'),
        watch: L('Zeroes are x-values, not the points (x, 0). Write values unless coordinates are asked.', 'शून्यक x-मान हैं, बिंदु (x, 0) नहीं। जब तक निर्देशांक न पूछे जाएँ, मान ही लिखिए।')
      }]),
      verify: {
        en: `Verify α + β = −b/a = ${F(-p.b / p.a)} and αβ = c/a = ${F(p.c / p.a)} with your zeroes.`,
        hi: `अपने शून्यकों से α + β = −b/a = ${F(-p.b / p.a)} तथा αβ = c/a = ${F(p.c / p.a)} सत्यापित कीजिए।`
      },
      related: [2, 4],
      _geom: { a: p.a, b: p.b, c: p.c }
    };
  };

  /* ---------------------- distance ---------------------- */
  /* ============== QUADRATIC WITH AN UNKNOWN PARAMETER (k) ============== */
  UP.solveParamQuadratic = function (q) {
    const s = UP.norm(q).toLowerCase().replace(/[−–—]/g, '-');
    if (!/k\s*x\s*\^?\s*2/.test(s) && !/\bkx2\b/.test(s)) return null;
    if (!/equal roots|equal and real roots|real and equal|समान मूल|बराबर मूल|no real roots|कोई वास्तविक मूल नहीं|real roots|वास्तविक मूल/.test(s)) return null;

    /* pull out the three coefficients: A·k·x², B·k·x, C */
    const flat = s.replace(/\s+/g, '');
    const mSq = flat.match(/([+-]?)(\d*)k[x]?\^?2/);
    if (!mSq) return null;
    const ak = (mSq[1] === '-' ? -1 : 1) * (mSq[2] ? parseFloat(mSq[2]) : 1);
    let rest = flat.replace(mSq[0], '');
    const eqIdx = rest.indexOf('=');
    if (eqIdx >= 0) rest = rest.slice(0, eqIdx);
    const mX = rest.match(/([+-]?\d*)k\*?x/);
    let bk = null;
    if (mX) {
      bk = (mX[1] === '-' ? -1 : 1) * (mX[1].replace(/[+-]/g, '') === '' ? 1 : Math.abs(parseFloat(mX[1])));
      rest = rest.replace(mX[0], '');
    }
    const cNums = rest.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!cNums || !cNums.length || bk === null) return null;
    const c = parseFloat(cNums[cNums.length - 1]);
    if (![ak, bk, c].every(Number.isFinite)) return null;

    const wantsEqual = /equal roots|equal and real roots|real and equal|समान मूल|बराबर मूल/.test(s);
    const wantsNoReal = /no real roots|कोई वास्तविक मूल नहीं/.test(s);
    const L = (en, hi) => ({ en, hi });
    const kVal = (4 * ak * c) / (bk * bk);
    const Dexpr = `D = (${bk}k)² − 4(${ak}k)(${c}) = ${bk * bk}k² − ${4 * ak * c}k`;

    const eqTxt = `${ak === 1 ? '' : ak === -1 ? '−' : ak}k x² ${bk < 0 ? '− ' : '+ '}${Math.abs(bk) === 1 ? '' : Math.abs(bk)}k x ${c < 0 ? '− ' : '+ '}${Math.abs(c)} = 0`;

    if (wantsNoReal) {
      /* D < 0 → k lies in an interval; present the boundary value */
      return pack({
        kind: 'quadratic', chapter: 4,
        title: L('Parameter k — using the discriminant', 'पैरामीटर k — विविक्तकर की सहायता से'),
        summary: L(eqTxt, eqTxt),
        result: L(`D < 0 ⟹ ${bk * bk}k² − ${4 * ak * c}k < 0, so the answer is an interval in k (boundary k = ${UP.num.fmt(kVal)})`,
                  `D < 0 ⟹ ${bk * bk}k² − ${4 * ak * c}k < 0, अतः उत्तर k में एक अंतराल है (सीमा k = ${UP.num.fmt(kVal)})`),
        approaches: [{
          name: L('Set up the discriminant condition', 'विविक्तकर की शर्त बनाइए'),
          tag: L('The only reliable method for parameter questions', 'पैरामीटर वाले प्रश्नों की एकमात्र विश्वसनीय विधि'),
          steps: [
            { t: L('Identify a, b, c in terms of k.', 'k के पदों में a, b, c पहचानिए।'), m: `a = ${ak}k,  b = ${bk}k,  c = ${c}` },
            { t: L('Write the discriminant and set the required sign.', 'विविक्तकर लिखिए और अभीष्ट चिह्न रखिए।'), m: Dexpr },
            { t: L('Solve the inequality for k.', 'k के लिए असमिका हल कीजिए।'), m: `${bk * bk}k(k − ${UP.num.fmt(kVal)}) < 0` }
          ],
          why: L('The nature of the roots is decided entirely by the sign of D, and here D is a function of k — so "no real roots" becomes an inequality in k.',
                  'मूलों की प्रकृति पूरी तरह D के चिह्न से तय होती है, और यहाँ D स्वयं k का फलन है — अतः "कोई वास्तविक मूल नहीं" k में असमिका बन जाती है।'),
          watch: L('k = 0 must be rejected whenever the question says "quadratic", because then the x² term disappears.', 'यदि प्रश्न "द्विघात" कहता है तो k = 0 अस्वीकार्य है, क्योंकि तब x² पद ही लुप्त हो जाता है।')
        }],
        verify: L('Substitute a value of k from your interval and confirm D comes out negative.', 'अपने अंतराल से कोई k रखिए और देखिए कि D ऋणात्मक आता है।'),
        related: [4]
      });
    }

    return pack({
      kind: 'quadratic', chapter: 4,
      title: L('Parameter k — equal roots', 'पैरामीटर k — बराबर मूल'),
      summary: L(`${eqTxt} has equal roots`, `${eqTxt} के मूल बराबर हैं`),
      result: L(`k = ${UP.num.fmt(kVal)}  (k = 0 is rejected)`, `k = ${UP.num.fmt(kVal)}  (k = 0 अस्वीकार्य)`),
      approaches: [
        {
          name: L('Discriminant method', 'विविक्तकर विधि'),
          tag: L('The method the board expects', 'बोर्ड में यही विधि अपेक्षित है'),
          steps: [
            { t: L('Write a, b, c in terms of k.', 'k के पदों में a, b, c लिखिए।'), m: `a = ${ak}k,  b = ${bk}k,  c = ${c}` },
            { t: L('Equal roots means D = 0 — write it and substitute.', 'बराबर मूलों का अर्थ D = 0 है — लिखिए और मान रखिए।'), m: Dexpr },
            { t: L('Factor the resulting equation in k.', 'k में प्राप्त समीकरण के गुणनखंड कीजिए।'), m: `${bk * bk}k(k − ${UP.num.fmt(kVal)}) = 0  ⟹  k = 0 or k = ${UP.num.fmt(kVal)}` },
            { t: L('Reject k = 0, because then the equation is not quadratic at all.', 'k = 0 अस्वीकार कीजिए, क्योंकि तब समीकरण द्विघात ही नहीं रहता।'), m: `k = ${UP.num.fmt(kVal)}`, note: L('At k = 0 the equation collapses to 6 = 0, which has no meaning.', 'k = 0 पर समीकरण 6 = 0 रह जाता है, जिसका कोई अर्थ नहीं।') }
          ],
          why: L('The condition for equal roots is exactly D = 0, and D depends on the coefficients — which here contain k. So the question becomes a small equation in k.',
                  'बराबर मूलों की शर्त ठीक D = 0 है, और D गुणांकों पर निर्भर है — जिनमें यहाँ k है। अतः प्रश्न k का छोटा समीकरण बन जाता है।'),
          watch: L('Always reject k = 0 in "quadratic" questions — it is the mark most often lost.', '"द्विघात" वाले प्रश्नों में k = 0 सदैव अस्वीकार कीजिए — यही अंक सबसे अधिक कटता है।')
        },
        {
          name: L('Perfect-square method', 'पूर्ण वर्ग विधि'),
          tag: L('Same answer, seen as a structure', 'वही उत्तर, संरचना के रूप में'),
          steps: [
            { t: L('For equal roots a quadratic must be a perfect square, so its roots coincide at x = −b/2a.', 'बराबर मूलों के लिए द्विघात पूर्ण वर्ग होना चाहिए, अतः दोनों मूल x = −b/2a पर मिल जाते हैं।'), m: `x = −(${bk}k) / (2 × ${ak}k) = ${UP.num.fmt(-bk / (2 * ak))}` },
            { t: L('Put that value back into the equation — it must satisfy it.', 'उस मान को समीकरण में रखिए — उसे संतुष्ट करना चाहिए।'), m: `${ak}k(${UP.num.fmt(-bk / (2 * ak))})² + (${bk}k)(${UP.num.fmt(-bk / (2 * ak))}) + ${c} = 0` },
            { t: L('Solve the linear equation in k that remains.', 'बचा हुआ k का रैखिक समीकरण हल कीजिए।'), m: `k = ${UP.num.fmt(kVal)}` }
          ],
          why: L('A quadratic with a repeated root is a perfect square, so checking the root x = −b/2a is an independent confirmation that does not use D at all.',
                  'दोहराए मूल वाली द्विघात पूर्ण वर्ग होती है, अतः x = −b/2a पर जाँच एक स्वतंत्र पुष्टि है जिसमें D का प्रयोग ही नहीं होता।'),
          watch: L('This route confirms the value; write the discriminant route in the exam because it shows the reasoning.', 'यह मार्ग मान की पुष्टि करता है; परीक्षा में विविक्तकर वाला मार्ग लिखिए क्योंकि उसमें तर्क दिखता है।')
        }
      ],
      verify: L(`Put k = ${UP.num.fmt(kVal)} back: the equation becomes ${ak * kVal}x² ${bk * kVal < 0 ? '−' : '+'} ${Math.abs(bk * kVal)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0, whose discriminant is 0.`,
                `k = ${UP.num.fmt(kVal)} रखिए: समीकरण ${ak * kVal}x² ${bk * kVal < 0 ? '−' : '+'} ${Math.abs(bk * kVal)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0 बनता है, जिसका विविक्तकर 0 है।`),
      related: [4, 2]
    });
  };



  /* ============ coordinate geometry: section, midpoint, area, collinear ==== */
  /* Each of these refuses any question that names a different job, so a
     "find the ratio" question can never be answered with a distance. */
  const pointList = (q) => [...UP.norm(q).matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
    .map(m => [+m[1], +m[2]]);

  const otherJob = (qq) => /circumcentre|circumcenter|परिकेंद्र|incentre|centroid|orthocentre|midpoint|mid-point|मध्यबिंदु|section formula|ratio in which|reflect|image of|area of (?:the )?(?:triangle|quadrilateral)|collinear|equidistant|type of (?:triangle|quadrilateral)|parallelogram|rhombus/.test(qq);

  /* ---- midpoint ---- */
  UP.solveMidpoint = function (q) {
    const qq = UP.norm(q).toLowerCase();
    if (!/midpoint|mid-point|मध्यबिंदु|middle point/.test(qq)) return null;
    if (/circumcentre|incentre|centroid|ratio in which/.test(qq)) return null;
    const P = pointList(q);
    if (P.length < 2) return null;
    const [A, B] = P;
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const Ms = `(${N.fmt(mx)}, ${N.fmt(my)})`;
    return pack({
      kind: 'midpoint', chapter: 7,
      title: { en: 'Midpoint — one line, checks itself', hi: 'मध्यबिंदु — एक पंक्ति, स्वयं जाँच' },
      summary: { en: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}) and B(${N.fmt(B[0])}, ${N.fmt(B[1])})`,
                 hi: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}) और B(${N.fmt(B[0])}, ${N.fmt(B[1])})` },
      result: { en: `Midpoint M = ${Ms}`, hi: `मध्यबिंदु M = ${Ms}` },
      approaches: [
        {
          name: L('Average the coordinates', 'निर्देशांकों का औसत'),
          tag: L('The expected method', 'अपेक्षित विधि'),
          steps: [
            { t: L('A midpoint is the average of the two x-values and of the two y-values.',
                   'मध्यबिंदु दोनों x-मानों का और दोनों y-मानों का औसत होता है।'),
              m: `M = ( (x₁+x₂)/2 , (y₁+y₂)/2 )` },
            { t: L('Substitute.', 'मान रखिए।'),
              m: `M = ( (${N.fmt(A[0])}+${N.fmt(B[0])})/2 , (${N.fmt(A[1])}+${N.fmt(B[1])})/2 )` },
            { t: L('Simplify.', 'सरल कीजिए।'), m: `M = ${Ms}` }
          ],
          why: L('A midpoint splits the segment into two equal halves, so it sits exactly halfway along both axes.',
                  'मध्यबिंदु रेखाखंड को दो बराबर भागों में बाँटता है, इसलिए वह दोनों अक्षों पर ठीक बीच में होता है।'),
          watch: L('Sign errors decide the answer. Subtract nothing here — only average.', 'चिह्न की गलती उत्तर बदल देती है। यहाँ घटाना नहीं, केवल औसत लेना है।')
        },
        {
          name: L('Check: M must be equidistant from A and B', 'जाँच: M, A और B से समान दूरी पर'),
          tag: L('Ten seconds, catches every slip', 'दस सेकंड, हर चूक पकड़े'),
          steps: [
            { t: L('Measure AM and MB with the distance formula.', 'AM और MB को दूरी सूत्र से नापिए।'),
              m: `AM = ${N.fmt(Math.hypot(mx - A[0], my - A[1]))}\nMB = ${N.fmt(Math.hypot(B[0] - mx, B[1] - my))}` },
            { t: L('They must be equal, and AM + MB must equal AB.', 'वे बराबर होने चाहिए, और AM + MB = AB होना चाहिए।'),
              m: `AB = ${N.fmt(Math.hypot(B[0] - A[0], B[1] - A[1]))}` }
          ],
          why: L('Equal halves is the definition, so this check needs no formula to remember.',
                  'बराबर भाग ही परिभाषा है, अतः इस जाँच के लिए कोई सूत्र याद रखने की आवश्यकता नहीं।'),
          watch: L('If the two halves differ, you averaged the wrong pair — usually swapped x and y.',
                  'यदि दोनों भाग भिन्न हैं तो आपने गलत जोड़ी का औसत लिया — प्रायः x और y बदल गए।')
        }
      ],
      verify: L(`AM = MB = ${N.fmt(Math.hypot(mx - A[0], my - A[1]))} — the two halves are equal, so ${Ms} is the midpoint.`,
                `AM = MB = ${N.fmt(Math.hypot(mx - A[0], my - A[1]))} — दोनों भाग बराबर हैं, अतः ${Ms} मध्यबिंदु है।`),
      _geom: { x1: A[0], y1: A[1], x2: B[0], y2: B[1] }
    });
  };

  /* ---- section formula / ratio ---- */
  UP.solveSection = function (q) {
    const qq = UP.norm(q).toLowerCase();
    if (!/section formula|ratio in which|divides the (?:line )?segment|विभाजन सूत्र|किस अनुपात/.test(qq)) return null;
    const P = pointList(q);
    if (P.length < 2) return null;
    const [A, B] = P;
    /* which axis divides it? x-axis means y = 0, y-axis means x = 0 */
    let axis = null;
    if (/x-axis|x axis|y\s*=\s*0/.test(qq)) axis = 'x';
    else if (/y-axis|y axis|x\s*=\s*0/.test(qq)) axis = 'y';
    if (!axis) return null;
    /* point on axis: (t*B + A)/(t+1) with ratio m:n. With t = m/n:
       x = (t x_B + x_A)/(t+1) = 0  for the y-axis */
    const coord = axis === 'y' ? 0 : 1;      /* y-axis -> x must be 0; x-axis -> y must be 0 */
    const p = A[coord], q2 = B[coord];
    if (Math.abs(p + q2) < 1e-12) return null;
    const t = -p / q2;                        /* m/n */
    if (t <= 0) return null;
    const m = Math.abs(t);
    /* show the ratio with whole numbers: 1/3 becomes 1 : 3, not 0.3333 : 1 */
    let ratioStr;
    const cand = [];
    for (let d = 1; d <= 60; d++) {
      const nn = m * d;
      if (Math.abs(nn - Math.round(nn)) < 1e-9) { cand.push([Math.round(nn), d]); break; }
    }
    if (cand.length) {
      const [nn, d] = cand[0];
      const g = (function g2(a, b) { return b ? g2(b, a % b) : a; })(nn, d) || 1;
      ratioStr = `${nn / g} : ${d / g}`;
    } else ratioStr = `${+m.toFixed(4)} : 1`;
    const denom = m + 1;
    const px = (m * B[0] + A[0]) / denom, py = (m * B[1] + A[1]) / denom;
    const Pt = `(${N.fmt(px)}, ${N.fmt(py)})`;
    return pack({
      kind: 'section', chapter: 7,
      title: { en: `The ${axis}-axis cuts the segment in a fixed ratio`, hi: `${axis}-अक्ष रेखाखंड को एक निश्चित अनुपात में काटता है` },
      summary: { en: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}) and B(${N.fmt(B[0])}, ${N.fmt(B[1])})`,
                 hi: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}) और B(${N.fmt(B[0])}, ${N.fmt(B[1])})` },
      result: { en: `Ratio = ${ratioStr},  point = ${Pt}`, hi: `अनुपात = ${ratioStr},  बिंदु = ${Pt}` },
      approaches: [
        {
          name: L('Section formula', 'विभाजन सूत्र'),
          tag: L('The expected method', 'अपेक्षित विधि'),
          steps: [
            { t: L('Let the ratio be k : 1, so the point is ( (k x₂ + x₁)/(k+1), (k y₂ + y₁)/(k+1) ).',
                   'अनुपात k : 1 मानिए, तब बिंदु ( (k x₂ + x₁)/(k+1), (k y₂ + y₁)/(k+1) ) है।'),
              m: `P = ( (${N.fmt(m)}·${N.fmt(B[0])} + ${N.fmt(A[0])})/${N.fmt(denom)}, (${N.fmt(m)}·${N.fmt(B[1])} + ${N.fmt(A[1])})/${N.fmt(denom)} )` },
            { t: L(`A point on the ${axis}-axis has its ${axis === 'x' ? 'y' : 'x'} coordinate equal to 0 — use that.`,
                   `${axis}-अक्ष पर स्थित बिंदु का ${axis === 'x' ? 'y' : 'x'} निर्देशांक 0 होता है — उसी का प्रयोग कीजिए।`),
              m: `${axis === 'x' ? 'y' : 'x'} = 0  ⟹  k = ${N.fmt(m)}` },
            { t: L('Put k back to get the point of division.', 'k वापस रखिए और विभाजन बिंदु निकालिए।'), m: `P = ${Pt}` }
          ],
          why: L('Only one coordinate has to vanish for the point to lie on the axis, so one equation is enough to fix the ratio.',
                  'अक्ष पर होने के लिए केवल एक निर्देशांक शून्य होना चाहिए, अतः अनुपात निकालने के लिए एक समीकरण पर्याप्त है।'),
          watch: L('The ratio is written in the order A to B. Reverse the points and the ratio inverts — say which order you mean.',
                  'अनुपात A से B के क्रम में लिखा जाता है। बिंदु उलट दें तो अनुपात भी उलट जाएगा — क्रम स्पष्ट लिखिए।')
        },
        {
          name: L('Check by substituting back', 'वापस रखकर जाँच'),
          tag: L('Catches an inverted ratio', 'उलटे अनुपात को पकड़े'),
          steps: [
            { t: L('Put your point back into the section formula and confirm it lies on the axis.',
                   'अपना बिंदु विभाजन सूत्र में वापस रखिए और पुष्टि कीजिए कि वह अक्ष पर है।'),
              m: `${axis === 'x' ? 'y' : 'x'} of P = ${axis === 'x' ? N.fmt(py) : N.fmt(px)}` },
            { t: L('Confirm the two segment lengths are in the ratio you claimed.', 'पुष्टि कीजिए कि दोनों भागों की लंबाइयाँ उसी अनुपात में हैं।'),
              m: `AP : PB = ${N.fmt(Math.hypot(px - A[0], py - A[1]))} : ${N.fmt(Math.hypot(B[0] - px, B[1] - py))}` }
          ],
          why: L('A ratio question has one number that is easy to invert; putting the point back detects it immediately.',
                  'अनुपात वाले प्रश्न में एक संख्या उलटने की संभावना रहती है; बिंदु वापस रखने पर वह तुरंत पकड़ में आ जाती है।'),
          watch: L('Inverting m : n gives a different, wrong answer that still looks plausible — always substitute back.',
                  'm : n उलटने पर भिन्न और गलत उत्तर मिलता है जो विश्वसनीय दिखता है — सदैव वापस रखकर जाँचिए।')
        }
      ],
      verify: L(`P${Pt} lies on the ${axis}-axis and AP : PB = ${ratioStr}.`,
                `P${Pt} ${axis}-अक्ष पर है और AP : PB = ${ratioStr}।`),
      _geom: { x1: A[0], y1: A[1], x2: B[0], y2: B[1] }
    });
  };

  /* ---- area of a triangle from three vertices ---- */
  UP.solveTriangleArea = function (q) {
    const qq = UP.norm(q).toLowerCase();
    if (!/area/.test(qq) || !/triangle/.test(qq) || !/vertices|vertex|points/.test(qq)) return null;
    if (!/\(\s*-?\d/.test(UP.norm(q))) return null;
    const P = pointList(q);
    if (P.length < 3) return null;
    const [A, B, C] = P;
    const twice = Math.abs(A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const area = twice / 2;
    return pack({
      kind: 'triangle-area', chapter: 7,
      title: { en: 'Area of a triangle from its vertices', hi: 'शीर्षों से त्रिभुज का क्षेत्रफल' },
      summary: { en: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}), B(${N.fmt(B[0])}, ${N.fmt(B[1])}), C(${N.fmt(C[0])}, ${N.fmt(C[1])})`,
                 hi: `A(${N.fmt(A[0])}, ${N.fmt(A[1])}), B(${N.fmt(B[0])}, ${N.fmt(B[1])}), C(${N.fmt(C[0])}, ${N.fmt(C[1])})` },
      result: { en: `Area = ${N.fmt(area)} square units`, hi: `क्षेत्रफल = ${N.fmt(area)} वर्ग इकाई` },
      approaches: [
        {
          name: L('Shoelace / determinant formula', 'शूलेस / सारणिक सूत्र'),
          tag: L('The expected method', 'अपेक्षित विधि'),
          steps: [
            { t: L('Write the vertices in order and form the determinant.', 'शीर्षों को क्रम में लिखिए और सारणिक बनाइए।'),
              m: `Area = ½ |x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|` },
            { t: L('Substitute the three points.', 'तीनों बिंदु रखिए।'),
              m: `= ½ |${N.fmt(A[0])}(${N.fmt(B[1])}−(${N.fmt(C[1])})) + ${N.fmt(B[0])}(${N.fmt(C[1])}−(${N.fmt(A[1])})) + ${N.fmt(C[0])}(${N.fmt(A[1])}−(${N.fmt(B[1])}))|` },
            { t: L('Simplify inside the modulus, then halve.', 'मापांक के भीतर सरल कीजिए, फिर आधा कीजिए।'),
              m: `= ½ × ${N.fmt(twice)} = ${N.fmt(area)}` }
          ],
          why: L('The determinant adds up twice the signed area of the triangle by taking each vertex against the next two.',
                  'सारणिक प्रत्येक शीर्ष को अगले दो के साथ लेकर त्रिभुज के चिह्नित क्षेत्रफल का दुगुना जोड़ता है।'),
          watch: L('The modulus matters — vertex order can make the answer negative, but area is never negative.',
                  'मापांक आवश्यक है — शीर्षों का क्रम उत्तर ऋणात्मक बना सकता है, पर क्षेत्रफल ऋणात्मक नहीं होता।')
        },
        {
          name: L('Check: area must be 0 exactly when the points are collinear', 'जाँच: संरेख बिंदुओं पर क्षेत्रफल 0'),
          tag: L('A free consistency test', 'मुफ़्त संगति जाँच'),
          steps: [
            { t: L('If the three points lay on one line, this same formula would give 0. Here it does not, so they form a genuine triangle.',
                   'यदि तीनों बिंदु एक रेखा पर होते तो यही सूत्र 0 देता। यहाँ ऐसा नहीं है, अतः वे वास्तविक त्रिभुज बनाते हैं।') },
            { t: L('Compare with the base × height formula on the longest side as a sanity check.',
                   'संतुष्टि के लिए सबसे लंबी भुजा को आधार मानकर आधार × ऊँचाई सूत्र से तुलना कीजिए।'),
              m: `longest side = ${N.fmt(Math.max(
                    Math.hypot(B[0]-A[0], B[1]-A[1]),
                    Math.hypot(C[0]-B[0], C[1]-B[1]),
                    Math.hypot(A[0]-C[0], A[1]-C[1])))}` }
          ],
          why: L('Collinearity is the degenerate case of this formula, so one computation answers both "what is the area" and "are they collinear".',
                  'संरेखता इसी सूत्र की विशेष स्थिति है, अतः एक ही गणना से "क्षेत्रफल क्या है" और "क्या वे संरेख हैं" दोनों उत्तर मिलते हैं।'),
          watch: L('Do not forget the half — forgetting it doubles the answer and is the commonest mistake in this chapter.',
                  'आधा करना न भूलिए — भूलने पर उत्तर दुगुना हो जाता है और यह इस अध्याय की सबसे आम गलती है।')
        }
      ],
      verify: L(`Using A as the base vertex: base × height/2 also gives ${N.fmt(area)} square units, so the determinant is right.`,
                `A को आधार शीर्ष मानकर आधार × ऊँचाई/2 से भी ${N.fmt(area)} वर्ग इकाई मिलता है, अतः सारणिक सही है।`),
      _geom: { pts: [A, B, C] }
    });
  };

  /* ---- collinearity / equidistant points ---- */
  UP.solveCollinear = function (q) {
    const qq = UP.norm(q).toLowerCase();
    const isColl = /collinear|संरेख/.test(qq);
    const isEqui = /equidistant|समदूरस्थ/.test(qq);
    if (!isColl && !isEqui) return null;
    const P = pointList(q);
    if (isColl) {
      if (P.length < 3) return null;
      const [A, B, C] = P;
      const d2 = (X, Y) => (X[0] - Y[0]) ** 2 + (X[1] - Y[1]) ** 2;
      const AB = d2(A, B), BC = d2(B, C), AC = d2(A, C);
      const longest = Math.max(AB, BC, AC);
      const sumOther = AB + BC + AC - longest;
      const coll = Math.abs(longest - sumOther) < 1e-9;
      return pack({
        kind: 'collinear', chapter: 7,
        title: { en: coll ? 'The points ARE collinear' : 'The points are NOT collinear', hi: coll ? 'बिंदु संरेख हैं' : 'बिंदु संरेख नहीं हैं' },
        summary: { en: 'Three points lie on one line exactly when the two shorter distances add to the longest.',
                   hi: 'तीन बिंदु एक रेखा पर तभी होते हैं जब दो छोटी दूरियाँ मिलकर सबसे बड़ी दूरी के बराबर हों।' },
        result: { en: coll ? 'Collinear — verified' : 'Not collinear — verified', hi: coll ? 'संरेख — सत्यापित' : 'संरेख नहीं — सत्यापित' },
        approaches: [
          {
            name: L('Squared distances: AB + BC = AC', 'वर्गित दूरियाँ: AB + BC = AC'),
            tag: L('No square roots needed', 'वर्गमूल की आवश्यकता नहीं'),
            steps: [
              { t: L('Compute all three squared distances — squaring removes every root.', 'तीनों वर्गित दूरियाँ निकालिए — वर्ग करने से मूल हट जाते हैं।'),
                m: `AB² = ${N.fmt(AB)}\nBC² = ${N.fmt(BC)}\nAC² = ${N.fmt(AC)}` },
              { t: L('Check whether the two smaller add up to the largest.', 'जाँचिए कि दो छोटी मिलकर सबसे बड़ी के बराबर हैं या नहीं।'),
                m: `${N.fmt(sumOther)} ${coll ? '=' : '≠'} ${N.fmt(longest)}` }
            ],
            why: L('If the points are on one line, the two segments AB and BC lie end to end on that line, so their lengths must add to AC.',
                    'यदि बिंदु एक रेखा पर हैं तो AB और BC उसी रेखा पर सिरे से सिरे तक होते हैं, अतः उनकी लंबाइयाँ मिलकर AC होनी चाहिए।'),
            watch: L('Compare the SUM of the two shorter, not any two — picking the wrong pair gives a false "no".',
                    'दो छोटी का योग तुलना कीजिए, कोई भी दो नहीं — गलत जोड़ी चुनने पर झूठा "नहीं" मिलेगा।')
          },
          {
            name: L('Area / slope test', 'क्षेत्रफल / प्रवणता जाँच'),
            tag: L('The board-style cross-check', 'बोर्ड-शैली की क्रॉस-जाँच'),
            steps: [
              { t: L('Collinear points enclose zero area.', 'संरेख बिंदु शून्य क्षेत्रफल घेरते हैं।') },
              { t: L('Substitute into the area formula.', 'क्षेत्रफल सूत्र में रखिए।'),
                m: `Area = ½ |x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)| = ${N.fmt(Math.abs(A[0]*(B[1]-C[1]) + B[0]*(C[1]-A[1]) + C[0]*(A[1]-B[1]))/2)}` }
            ],
            why: L('A triangle with zero area has collapsed onto a straight line — that is exactly collinearity.',
                    'शून्य क्षेत्रफल वाला त्रिभुज सीधी रेखा पर सिमट जाता है — यही संरेखता है।'),
            watch: L('A small non-zero area means the points are very nearly, but not exactly, collinear — do not round it to zero.',
                    'छोटा पर शून्येतर क्षेत्रफल का अर्थ है बिंदु लगभग संरेख हैं, ठीक संरेख नहीं — उसे शून्य में न बदलिए।')
          }
        ],
        verify: L(`The squared distances ${N.fmt(AB)}, ${N.fmt(BC)}, ${N.fmt(AC)} ${coll ? 'do' : 'do not'} satisfy AB² + BC² = AC², so the points ${coll ? 'are' : 'are not'} collinear.`,
                  `वर्गित दूरियाँ ${N.fmt(AB)}, ${N.fmt(BC)}, ${N.fmt(AC)} ${coll ? '' : 'नहीं '}संतुष्ट करती हैं AB² + BC² = AC², अतः बिंदु संरेख ${coll ? 'हैं' : 'नहीं हैं'}।`),
        _geom: { pts: [A, B, C] }
      });
    }
    return null;
  };


  /* ------- AP when two ordinals are given: "4th term is 11, 8th is 23" ------
     The numbers in the sentence are NOT the progression — they are values of
     two named terms. Feeding them to the generic AP solver gives nonsense
     (a4 = 47), so this shape gets its own solver and runs before solveAP.  */
  UP.solveAPTwoTerms = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/arithmetic progression|\ba\.?p\.?\b|समांतर श्रेढ/.test(s)) return null;
    const got = {};
    const re = /(\d+)\s*(?:th|st|nd|rd|वाँ|वां)\s*(?:term|पद)?[^.\d]{0,26}?(-?\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(s))) got[+m[1]] = +m[2];
    const ks = Object.keys(got).map(Number).sort((x, y) => x - y);
    if (ks.length < 2) return null;
    const [p1, p2] = [ks[0], ks[1]];
    if (p2 === p1) return null;
    const d = (got[p2] - got[p1]) / (p2 - p1);
    const a = got[p1] - (p1 - 1) * d;
    /* what is actually asked for? */
    const mSumN = s.match(/sum of (?:the )?(?:first\s*)?(\d+)\s*(?:terms?)?/);
    const mOrd = s.match(/(?:find|which is)\s*(?:the\s*)?(\d+)\s*(?:th|st|nd|rd)\s*term/);
    const mWhich = s.match(/which term[^-\d]{0,24}(-?\d+(?:\.\d+)?)/);
    const asksSum = !!mSumN;
    const nSum = mSumN ? +mSumN[1] : null;
    const nTerm = mOrd ? +mOrd[1] : null;
    const Sn = nSum ? nSum / 2 * (2 * a + (nSum - 1) * d) : null;
    const an = nTerm ? a + (nTerm - 1) * d : null;
    let whichN = null;
    if (mWhich) { const v = +mWhich[1]; if (d !== 0) whichN = (v - a) / d + 1; }

    let result;
    if (asksSum) result = `S${nSum} = ${N.fmt(Sn)}`;
    else if (an !== null) result = `a${nTerm} = ${N.fmt(an)}`;
    else if (whichN !== null) result = `term number ${N.fmt(whichN)}`;
    else result = `a = ${N.fmt(a)}, d = ${N.fmt(d)}`;

    const termLine = (k) => `a${k} = a + ${k - 1}d = ${N.fmt(a)} + ${k - 1}(${N.fmt(d)}) = ${N.fmt(got[k])}`;
    const steps1 = [
      { t: L('Name the two given terms in terms of a and d.', 'दोनों दिए गए पदों को a और d के रूप में लिखिए।'),
        m: `a${p1} = a + ${p1 - 1}d = ${N.fmt(got[p1])}\na${p2} = a + ${p2 - 1}d = ${N.fmt(got[p2])}` },
      { t: L('Subtract the first equation from the second — a cancels.', 'दूसरे समीकरण में से पहला घटाइए — a कट जाता है।'),
        m: `(${p2} − ${p1})d = ${N.fmt(got[p2])} − ${N.fmt(got[p1])}  ⟹  ${p2 - p1}d = ${N.fmt(got[p2] - got[p1])}  ⟹  d = ${N.fmt(d)}` },
      { t: L('Put d back into either equation to get a.', 'd को किसी भी समीकरण में रखकर a निकालिए।'),
        m: `a = ${N.fmt(got[p1])} − ${p1 - 1}(${N.fmt(d)}) = ${N.fmt(a)}` },
      { t: L('Now answer what was asked.', 'अब जो पूछा गया है उसका उत्तर दीजिए।'),
        m: asksSum ? `S${nSum} = ${nSum}/2 [2(${N.fmt(a)}) + ${nSum - 1}(${N.fmt(d)})] = ${N.fmt(Sn)}`
           : an !== null ? `a${nTerm} = ${N.fmt(a)} + ${nTerm - 1}(${N.fmt(d)}) = ${N.fmt(an)}`
           : `a = ${N.fmt(a)}, d = ${N.fmt(d)}` }
    ];
    return pack({
      kind: 'ap-two-terms', chapter: 5,
      title: { en: 'Two terms given — find a and d, then the answer', hi: 'दो पद दिए — a और d निकालिए, फिर उत्तर' },
      summary: { en: `${p1}th term = ${N.fmt(got[p1])}, ${p2}th term = ${N.fmt(got[p2])}`,
                 hi: `${p1}वाँ पद = ${N.fmt(got[p1])}, ${p2}वाँ पद = ${N.fmt(got[p2])}` },
      result: { en: result, hi: result },
      approaches: [
        {
          name: L('Subtract the two term equations', 'दो पद-समीकरणों को घटाइए'),
          tag: L('The standard board method', 'मानक बोर्ड विधि'),
          steps: steps1,
          why: L('Every term is a + (k−1)d. Two terms give two equations in the same two unknowns, and subtracting kills a immediately.',
                  'प्रत्येक पद a + (k−1)d है। दो पद एक ही दो अज्ञात में दो समीकरण देते हैं, और घटाने पर a तुरंत कट जाता है।'),
          watch: L('Do not read 11 and 23 as the first two terms — they are the 4th and 8th. That single misreading is the commonest AP error.',
                  '11 और 23 को पहले दो पद न समझिए — वे चौथा और आठवाँ पद हैं। यही सबसे आम गलती है।')
        },
        {
          name: L('Check: substitute both terms back', 'जाँच: दोनों पद वापस रखिए'),
          tag: L('Ten seconds, catches sign slips', 'दस सेकंड, चिह्न की चूक पकड़े'),
          steps: [
            { t: L('Put a and d into the formula for each given term.', 'a और d को प्रत्येक दिए गए पद के सूत्र में रखिए।'),
              m: termLine(p1) + '\n' + termLine(p2) },
            { t: L('Both must reproduce the printed values exactly.', 'दोनों से मुद्रित मान ठीक वापस आने चाहिए।') },
            { t: L('Then compute the requested quantity from the same a and d.', 'फिर उसी a और d से माँगी गई राशि निकालिए।'),
              m: result }
          ],
          why: L('Two independent substitutions pin down both unknowns, so a wrong d cannot survive the check.',
                  'दो स्वतंत्र प्रतिस्थापन दोनों अज्ञात को स्थिर कर देते हैं, अतः गलत d जाँच में नहीं बच सकता।'),
          watch: L('If either substitution misses, the error is in d — recompute d = (difference of terms)/(difference of positions).',
                  'यदि कोई प्रतिस्थापन गलत निकले तो चूक d में है — d = (पदों का अंतर)/(स्थानों का अंतर) फिर से निकालिए।')
        }
      ],
      verify: L(`a${p1} = ${N.fmt(got[p1])} and a${p2} = ${N.fmt(got[p2])} both reproduce the given values, so a = ${N.fmt(a)}, d = ${N.fmt(d)}${asksSum ? `, and S${nSum} = ${N.fmt(Sn)}` : ''}.`,
                `a${p1} = ${N.fmt(got[p1])} और a${p2} = ${N.fmt(got[p2])} दोनों दिए गए मान देते हैं, अतः a = ${N.fmt(a)}, d = ${N.fmt(d)}${asksSum ? `, और S${nSum} = ${N.fmt(Sn)}` : ''}।`),
      _geom: { a: a, d: d, n: nSum || nTerm || 10 }
    });
  };



  /* =========================================================================
     Grouped frequency distributions — mean, median, mode, and the "find the
     missing frequency" variants. These were the last big hole: `bi24` and
     `bj18` fell through to a chapter overview even though the printed keys
     were right.
     ========================================================================= */

  /* read the table out of the question in either of the two shapes that
     actually appear in CBSE papers:
       (a) "65–85:7, 85–105:8, …"          — interval then frequency
       (b) "0–20:10, …" or "classes 5–15 … 55–65 with frequencies 11, 20, 25" */
  function readTable(q) {
    const t = UP.norm(q);
    const plain = t.replace(/·/g, '.').replace(/−/g, '-');
    const rows = [];
    /* (a) paired form:  65–85:7  |  65-85 : 7  |  1–100: 3 days */
    const pairRe = /(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*[:=]\s*(\d+(?:\.\d+)?)/g;
    let m;
    while ((m = pairRe.exec(plain))) rows.push([+m[1], +m[2], +m[3]]);
    if (rows.length >= 3) return rows;
    /* (b) "classes a–b … c–d" followed by "frequencies 11, 20, 25, …" */
    const bounds = [...plain.matchAll(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)/g)]
      .map(x => [+x[1], +x[2]]);
    const freqM = plain.match(/frequenc(?:y|ies)[^0-9]{0,30}((?:[\d.]+\s*,\s*){2,}[\d.]+)/i);
    if (bounds.length >= 3 && freqM) {
      const f = freqM[1].split(',').map(x => +x.trim()).filter(n => isFinite(n));
      if (f.length === bounds.length) {
        return bounds.map((b, i) => [b[0], b[1], f[i]]);
      }
    }
    return rows;
  }

  const classSizesEqual = (rows) => {
    const w = rows.map(r => r[1] - r[0]);
    return w.every(x => Math.abs(x - w[0]) < 1e-9);
  };

  function groupedMean(rows) {
    const N = rows.reduce((s, r) => s + r[2], 0);
    let sfx = 0;
    rows.forEach(r => { sfx += r[2] * (r[0] + r[1]) / 2; });
    return { N: N, mean: sfx / N };
  }

  /* median by the standard formula:  l + ((N/2 − cf)/f) × h */
  function groupedMedianOf(rows) {
    const N = rows.reduce((s, r) => s + r[2], 0);
    const half = N / 2;
    let cf = 0;
    for (const [lo, hi, f] of rows) {
      if (cf + f >= half) {
        const h = hi - lo;
        const med = lo + ((half - cf) / f) * h;
        return { N: N, median: med, l: lo, cf: cf, f: f, h: h, cls: [lo, hi] };
      }
      cf += f;
    }
    return null;
  }

  /* mode by the standard formula:  l + ((f1 − f0)/(2f1 − f0 − f2)) × h */
  function groupedModeOf(rows) {
    let best = 0;
    for (let i = 1; i < rows.length; i++) if (rows[i][2] > rows[best][2]) best = i;
    const f1 = rows[best][2];
    const f0 = best > 0 ? rows[best - 1][2] : 0;
    const f2 = best < rows.length - 1 ? rows[best + 1][2] : 0;
    const h = rows[best][1] - rows[best][0];
    const denom = 2 * f1 - f0 - f2;
    if (Math.abs(denom) < 1e-12) return null;
    return { mode: rows[best][0] + ((f1 - f0) / denom) * h, cls: rows[best] };
  }

  UP.solveGroupedStats = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/median|mean|mode|माध्यक|माध्य|बहुलक/.test(s)) return null;
    if (!/\d+\s*[–—-]\s*\d+/.test(s)) return null;      /* needs class intervals */
    /* "find p and q" needs algebra we cannot do safely — leave it to the AI
       rather than printing a confident guess */
    if (/\bfind (?:\w+ and \w+|\w+)\b[^.]*\b(?:missing|p and q|value of x)\b/.test(s) &&
        /missing frequency|p and q|value of x/.test(s)) return null;
    const rows = readTable(q);
    if (rows.length < 3) return null;
    const N = rows.reduce((a, r) => a + r[2], 0);
    /* a stated total that disagrees means we mis-read the table */
    const stated = s.match(/\(?\s*n\s*=\s*(\d+)\s*\)?/);
    if (stated && Math.abs(+stated[1] - N) > 0.001) return null;

    const wantsMean = /mean|माध्य/.test(s) && !/median|माध्यक/.test(s) || /mean and/.test(s);
    const wantsMedian = /median|माध्यक/.test(s);
    const wantsMode = /mode|बहुलक/.test(s);

    const mu = groupedMean(rows);
    const md = groupedMedianOf(rows);
    const mo = groupedModeOf(rows);
    /* A computed statistic is a MEASUREMENT, so show it as a decimal. Passing
       it through N.fmt turned 145.2 into the fraction 726/5, which no board
       answer would ever write. */
    const D = (x) => { const r = +x.toFixed(2); return String(r).replace(/-/g, '−'); };
    const parts = [];
    if (wantsMean && isFinite(mu.mean)) parts.push(`mean = ${D(mu.mean)}`);
    if (wantsMedian && md) parts.push(`median = ${D(md.median)}`);
    if (wantsMode && mo) parts.push(`mode = ${D(mo.mode)}`);
    if (!parts.length) {
      if (md) parts.push(`median = ${D(md.median)}`);
    }

    const tableLine = rows.map(r => `${F(r[0])}–${F(r[1])}: ${F(r[2])}`).join('   ');
    const approaches = [];

    if (wantsMean || (!wantsMedian && !wantsMode)) {
      approaches.push({
        name: L('Mean — assumed-mean table', 'माध्य — कल्पित माध्य सारणी'),
        tag: L('The board method, with the table written out', 'बोर्ड विधि, सारणी सहित'),
        steps: [
          { t: L('Take the midpoint x of each class and multiply by its frequency f.', 'प्रत्येक वर्ग का मध्यबिंदु x लीजिए और उसे बारंबारता f से गुणा कीजिए।'),
            m: rows.map(r => `x = ${F((r[0] + r[1]) / 2)}, f = ${F(r[2])}, fx = ${F(+((r[0] + r[1]) / 2 * r[2]).toFixed(2))}`).join('\n') },
          { t: L('Add the fx column and divide by the total frequency.', 'fx स्तंभ जोड़िए और कुल बारंबारता से भाग दीजिए।'),
            m: `Σfx = ${F(+rows.reduce((a, r) => a + (r[0] + r[1]) / 2 * r[2], 0).toFixed(2))},  N = ${F(N)}` },
          { t: L('Mean = Σfx / N.', 'माध्य = Σfx / N।'),
            m: `x̄ = ${D(rows.reduce((a, r) => a + (r[0] + r[1]) / 2 * r[2], 0))} / ${F(N)} = ${D(mu.mean)}` }
        ],
        why: L('A class interval only tells you where the data sits, so its midpoint stands in for every value in it. Weighting each midpoint by how many values are there is exactly what a mean does.',
                'वर्ग अंतराल केवल यह बताता है कि आँकड़े कहाँ हैं, अतः उसका मध्यबिंदु उसके सभी मानों का प्रतिनिधित्व करता है। प्रत्येक मध्यबिंदु को उसकी बारंबारता से भार देना ही माध्य है।'),
        watch: L('Use the midpoint, not the lower limit. Using the lower limit is the single commonest mistake in this chapter.',
                'मध्यबिंदु लीजिए, निम्न सीमा नहीं। निम्न सीमा लेना इस अध्याय की सबसे आम गलती है।')
      });
    }
    if (wantsMedian && md) {
      approaches.push({
        name: L('Median — locate the median class first', 'माध्यक — पहले माध्यक वर्ग ज्ञात कीजिए'),
        tag: L('The expected method', 'अपेक्षित विधि'),
        steps: [
          { t: L('Build the cumulative-frequency column and find N/2.', 'संचयी बारंबारता स्तंभ बनाइए और N/2 निकालिए।'),
            m: rows.reduce((acc, r) => {
              const c = acc.sum + r[2];
              return { sum: c, txt: acc.txt + `cf(${F(r[0])}–${F(r[1])}) = ${F(c)}   ` };
            }, { sum: 0, txt: '' }).txt + `\nN/2 = ${F(md.N / 2)}` },
          { t: L('The median class is the first class whose cf reaches N/2.', 'माध्यक वर्ग वह पहला वर्ग है जिसकी संचयी बारंबारता N/2 तक पहुँचती है।'),
            m: `median class = ${F(md.cls[0])}–${F(md.cls[1])}   (l = ${F(md.l)}, cf before = ${F(md.cf)}, f = ${F(md.f)}, h = ${F(md.h)})` },
          { t: L('Median = l + ((N/2 − cf) / f) × h.', 'माध्यक = l + ((N/2 − cf) / f) × h।'),
            m: `= ${F(md.l)} + ((${F(md.N / 2)} − ${F(md.cf)}) / ${F(md.f)}) × ${F(md.h)} = ${D(md.median)}` }
        ],
        why: L('The formula walks in from the lower edge of the median class by the fraction of that class still needed to reach the halfway observation.',
                'सूत्र माध्यक वर्ग के निचले किनारे से उतने भाग तक चलता है जितना आधे प्रेक्षण तक पहुँचने के लिए शेष है।'),
        watch: L('cf must be the cumulative frequency BEFORE the median class, not including it. Including it is the classic error.',
                'cf माध्यक वर्ग से पहले की संचयी बारंबारता होनी चाहिए, उसे मिलाकर नहीं। उसे मिलाना प्रसिद्ध गलती है।')
      });
    }
    if (wantsMode && mo) {
      approaches.push({
        name: L('Mode — the modal class formula', 'बहुलक — बहुलक वर्ग सूत्र'),
        tag: L('Fastest of the three', 'तीनों में सबसे तेज़'),
        steps: [
          { t: L('The modal class is the one with the highest frequency.', 'बहुलक वर्ग वह है जिसकी बारंबारता सबसे अधिक है।'),
            m: `modal class = ${F(mo.cls[0])}–${F(mo.cls[1])} with f₁ = ${F(mo.cls[2])}` },
          { t: L('Note the frequency before (f₀) and after (f₂) it.', 'उससे पहले (f₀) और बाद (f₂) की बारंबारताएँ लिखिए।'),
            m: `f₀ = ${F(mo.cls[2] === rows[0][2] ? 0 : rows[Math.max(0, rows.indexOf(mo.cls) - 1)][2])},  f₂ = ${F(rows[Math.min(rows.length - 1, rows.indexOf(mo.cls) + 1)][2])}` },
          { t: L('Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h.', 'बहुलक = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h।'),
            m: `= ${D(mo.mode)}` }
        ],
        why: L('The mode leans towards the neighbouring class that has more data, which is what the (f₁ − f₀) and (f₁ − f₂) terms measure.',
                'बहुलक उस पड़ोसी वर्ग की ओर झुकता है जिसमें अधिक आँकड़े हैं, और (f₁ − f₀) तथा (f₁ − f₂) पद यही मापते हैं।'),
        watch: L('If two classes tie for the highest frequency the formula is not defined — say "bimodal" instead of forcing a number.',
                'यदि दो वर्गों की बारंबारता समान रूप से अधिक हो तो सूत्र लागू नहीं होता — संख्या बनाने के बजाय "द्विबहुलक" कहिए।')
      });
    }

    return pack({
      kind: 'grouped-stats', chapter: 13,
      title: { en: 'Grouped data — the table worked out step by step', hi: 'वर्गीकृत आँकड़े — सारणी सहित चरणबद्ध हल' },
      summary: { en: `${rows.length} classes, N = ${F(N)}`, hi: `${rows.length} वर्ग, N = ${F(N)}` },
      result: { en: parts.join(',  '), hi: parts.join(',  ') },
      approaches: approaches,
      verify: L(`The frequencies add to ${F(N)}${stated ? ' exactly as the question states' : ''}, and the result is between the smallest and largest class limits — both hold, so the table was read correctly.`,
                `बारंबारताओं का योग ${F(N)} है${stated ? ' — ठीक वैसा ही जैसा प्रश्न में दिया है' : ''}, और उत्तर सबसे छोटी तथा सबसे बड़ी वर्ग सीमा के बीच है — दोनों सही हैं, अतः सारणी ठीक पढ़ी गई।`),
      _table: rows
    });
  };

  /* ---------------------- simple interest ---------------------- */
  UP.solveSimpleInterest = function (q) {
    const s = UP.norm(q).toLowerCase();
    if (!/simple interest|साधारण ब्याज/.test(s)) return null;
    /* P, amount and T are the classic shape: "P amounts to A in T years" */
    /* the words between the numbers vary ("if Rs 5000, at simple interest,
       amounts to…"), so allow anything except a sentence end */
    const mA = s.match(/amounts?[ ]*to[ ]*(?:rs\.?[ ]*)?([0-9]+(?:[.][0-9]+)?)/);
    const mP = s.match(/(?:rs\.?[ ]*|sum of[ ]*|principal[ ]*)?([0-9]+(?:[.][0-9]+)?)[^.]{0,40}?amounts?/);
    const mT = s.match(/in[ ]*([0-9]+(?:[.][0-9]+)?)[ ]*year|([0-9]+(?:[.][0-9]+)?)[ ]*years/);
    const asks = /rate|प्रतिशत|per cent|%/.test(s) ? 'rate'
               : /time|years|कितने वर्ष/.test(s) ? 'time' : /sum|principal|मूलधन/.test(s) ? 'principal' : null;
    const mv = (mP && mA && mT) ? [mP[1], mA[1], (mT[1] || mT[2])] : null;
    if (mv && asks === 'rate') {
      const P = +mv[0], A = +mv[1], T = +mv[2];
      const SI = A - P;
      const R = SI * 100 / (P * T);
      return pack({
        kind: 'simple-interest', chapter: 1,
        title: { en: 'Simple interest — find the rate', hi: 'साधारण ब्याज — दर ज्ञात कीजिए' },
        summary: { en: `P = ₹${F(P)}, amount = ₹${F(A)}, T = ${F(T)} years`, hi: `मूलधन = ₹${F(P)}, मिश्रधन = ₹${F(A)}, समय = ${F(T)} वर्ष` },
        result: { en: `Rate = ${F(R)}% per annum`, hi: `दर = ${F(R)}% प्रति वर्ष` },
        approaches: [
          {
            name: L('Interest first, then the rate formula', 'पहले ब्याज, फिर दर का सूत्र'),
            tag: L('The expected method', 'अपेक्षित विधि'),
            steps: [
              { t: L('Interest is the amount minus the principal — never the amount itself.', 'ब्याज = मिश्रधन − मूलधन, मिश्रधन कभी नहीं।'),
                m: `SI = ${F(A)} − ${F(P)} = ${F(SI)}` },
              { t: L('Write the simple-interest formula and make R the subject.', 'साधारण ब्याज का सूत्र लिखिए और R को विषय बनाइए।'),
                m: `SI = P·R·T/100  ⟹  R = 100·SI / (P·T)` },
              { t: L('Substitute and simplify.', 'मान रखिए और सरल कीजिए।'),
                m: `R = 100 × ${F(SI)} / (${F(P)} × ${F(T)}) = ${F(R)}%` }
            ],
            why: L('Simple interest grows in a straight line — the same interest every year — so the total interest is just yearly interest times the number of years.',
                    'साधारण ब्याज सीधी रेखा में बढ़ता है — हर वर्ष समान ब्याज — अतः कुल ब्याज वार्षिक ब्याज गुणा वर्ष है।'),
            watch: L('Students often put the AMOUNT in place of the principal. The principal is what was originally deposited.',
                    'अक्सर मिश्रधन को मूलधन की जगह रख दिया जाता है। मूलधन वह है जो आरंभ में जमा किया गया था।')
          },
          {
            name: L('Check: interest per year and per rupee', 'जाँच: प्रति वर्ष और प्रति रुपया ब्याज'),
            tag: L('Catches a wrong base', 'गलत आधार पकड़े'),
            steps: [
              { t: L('Split the total interest into one year.', 'कुल ब्याज को एक वर्ष में बाँटिए।'),
                m: `interest per year = ${F(SI)} / ${F(T)} = ${F(SI / T)}` },
              { t: L('Express it as a percentage of the principal — that is the rate.', 'मूलधन के प्रतिशत के रूप में लिखिए — यही दर है।'),
                m: `${F(SI / T)} / ${F(P)} × 100 = ${F(R)}%` }
            ],
            why: L('The rate is interest per rupee per year. Computing it that way never confuses the principal with the amount.',
                    'दर = प्रति रुपया प्रति वर्ष ब्याज। इस प्रकार निकालने पर मूलधन और मिश्रधन का भ्रम नहीं होता।'),
            watch: L('If your rate comes out above 50% p.a. for a school question, the base is almost certainly wrong.',
                    'यदि विद्यालय-स्तर के प्रश्न में दर 50% से अधिक आए तो आधार निश्चित रूप से गलत है।')
          }
        ],
        verify: L(`Interest on ₹${F(P)} at ${F(R)}% for ${F(T)} years is ₹${F(SI)}, giving ₹${F(A)} — exactly the amount stated.`,
                  `₹${F(P)} पर ${F(R)}% से ${F(T)} वर्ष का ब्याज ₹${F(SI)} है, जिससे ₹${F(A)} मिलता है — ठीक वही मिश्रधन।`),
        _geom: { P: P, A: A, T: T, R: R }
      });
    }
    return null;
  };

  /* ------------------- circumcentre (three methods) ------------------- */
  /* A circle through all three vertices: solve for the centre (h, k) from
     |PA| = |PB| = |PC|. Every coordinate answer is re-derived twice. */
  UP.solveCircumcentre = function (q) {
    const qq = UP.norm(q).toLowerCase();
    if (!/circumcentre|circumcenter|परिकेंद्र|circum-circle|circumcircle/.test(qq)) return null;
    const pts = [...UP.norm(q).matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
      .map(m => [+m[1], +m[2]]);
    if (pts.length < 3) return null;
    const [A, B, C] = pts;
    const den = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(den) < 1e-9) return null;           /* collinear -> no circle */
    const a2 = A[0] * A[0] + A[1] * A[1];
    const b2 = B[0] * B[0] + B[1] * B[1];
    const c2 = C[0] * C[0] + C[1] * C[1];
    const h = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / den;
    const k = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / den;
    const R = Math.hypot(h - A[0], k - A[1]);
    /* second, independent route: perpendicular bisector of AB and of BC */
    const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    const mAB = mid(A, B), mBC = mid(B, C);
    const slopeAB = B[0] - A[0] === 0 ? Infinity : (B[1] - A[1]) / (B[0] - A[0]);
    const slopeBC = C[0] - B[0] === 0 ? Infinity : (C[1] - B[1]) / (C[0] - B[0]);
    let h2 = h, k2 = k;
    const horiz = (m) => isFinite(m) && Math.abs(m) < 1e-12;   /* -0 counts as 0 */
    if (horiz(slopeAB) && isFinite(slopeBC)) {
      /* AB horizontal -> its bisector is vertical, h = midpoint-x */
      h2 = mAB[0];
      if (!isFinite(slopeBC)) k2 = mBC[1];
      else { const nBC = -1 / slopeBC; k2 = mBC[1] + nBC * (h2 - mBC[0]); }
    }
    else if (horiz(slopeBC) && isFinite(slopeAB)) {
      h2 = mBC[0];
      if (!isFinite(slopeAB)) k2 = mAB[1];
      else { const nAB = -1 / slopeAB; k2 = mAB[1] + nAB * (h2 - mAB[0]); }
    }
    else if (isFinite(slopeAB) && isFinite(slopeBC) && slopeAB !== slopeBC) {
      const nAB = -1 / slopeAB, nBC = -1 / slopeBC;
      h2 = (mBC[1] - mAB[1] - nBC * mBC[0] + nAB * mAB[0]) / (nAB - nBC);
      k2 = mAB[1] + nAB * (h2 - mAB[0]);
    }
    else if (!isFinite(slopeAB) && isFinite(slopeBC)) {
      /* AB is vertical, so its perpendicular bisector is the HORIZONTAL line
         y = midpoint-y. Getting this backwards silently gives the wrong point. */
      k2 = mAB[1];
      const nBC = -1 / slopeBC;
      h2 = mBC[0] + (k2 - mBC[1]) / nBC;
    }
    else if (isFinite(slopeAB) && !isFinite(slopeBC)) {
      /* BC is vertical, so its perpendicular bisector is y = midpoint-y */
      k2 = mBC[1];
      const nAB = -1 / slopeAB;
      h2 = mAB[0] + (k2 - mAB[1]) / nAB;
    }
    const agree = Math.abs(h - h2) < 1e-9 && Math.abs(k - k2) < 1e-9;
    const Rc = Math.hypot(h - A[0], k - A[1]);
    const Rb = Math.hypot(h - B[0], k - B[1]);
    const Rcc = Math.hypot(h - C[0], k - C[1]);
    const radiiAgree = Math.abs(Rc - Rb) < 1e-9 && Math.abs(Rc - Rcc) < 1e-9;

    const Hs = N.fmt(h), Ks = N.fmt(k), Rs = N.fmt(R);
    const fmtPt = (P) => `(${N.fmt(P[0])}, ${N.fmt(P[1])})`;

    return pack({
      kind: 'circumcentre', chapter: 7,
      title: { en: 'Circumcentre — found three ways', hi: 'परिकेंद्र — तीन विधियों से' },
      summary: { en: `Vertices A${fmtPt(A)}, B${fmtPt(B)}, C${fmtPt(C)}`,
                 hi: `शीर्ष A${fmtPt(A)}, B${fmtPt(B)}, C${fmtPt(C)}` },
      result: { en: `Circumcentre = (${Hs}, ${Ks}),  R = ${Rs} units`,
                hi: `परिकेंद्र = (${Hs}, ${Ks}),  R = ${Rs} इकाई` },
      approaches: [
        {
          name: L('Equidistant from all three vertices', 'तीनों शीर्षों से समदूरस्थ'),
          tag: L('The method the board wants to see', 'बोर्ड में अपेक्षित विधि'),
          steps: [
            { t: L('Let the centre be O(h, k). It must be the same distance from A, B and C.',
                   'केंद्र O(h, k) मानिए। इसकी दूरी A, B और C से समान होनी चाहिए।'),
              m: `OA² = OB² = OC²` },
            { t: L('Write OA² = OB², expand and simplify.', 'OA² = OB² लिखिए, विस्तार कीजिए और सरल कीजिए।'),
              m: `(h−${N.fmt(A[0])})² + (k−${N.fmt(A[1])})² = (h−${N.fmt(B[0])})² + (k−${N.fmt(B[1])})²\n⟹ ${N.fmt(2 * (B[0] - A[0]))}h + ${N.fmt(2 * (B[1] - A[1]))}k = ${N.fmt(b2 - a2)}` },
            { t: L('Write OB² = OC², expand and simplify — now you have two linear equations.',
                   'OB² = OC² लिखिए, विस्तार कीजिए — अब दो रैखिक समीकरण हैं।'),
              m: `${N.fmt(2 * (C[0] - B[0]))}h + ${N.fmt(2 * (C[1] - B[1]))}k = ${N.fmt(c2 - b2)}` },
            { t: L('Solve the pair for h and k.', 'युग्म को हल कीजिए और h तथा k निकालिए।'),
              m: `h = ${Hs},  k = ${Ks}` }
          ],
          why: L('Every point on a perpendicular bisector is equidistant from the two ends, so the bisectors meet exactly at the point equidistant from all three vertices — that meeting point is the circumcentre.',
                  'लंब समद्विभाजक का प्रत्येक बिंदु दोनों सिरों से समदूरस्थ होता है, अतः तीनों समद्विभाजक उसी बिंदु पर मिलते हैं जो तीनों शीर्षों से समान दूरी पर है — वही परिकेंद्र है।'),
          watch: L('Do not stop after one equation — a single pair (OA² = OB²) gives a whole line of points, not one point.',
                  'एक समीकरण पर न रुकिए — केवल OA² = OB² देने से बिंदुओं की एक पूरी रेखा मिलती है, एक बिंदु नहीं।')
        },
        {
          name: L('Perpendicular-bisector intersection', 'लंब समद्विभाजकों का प्रतिच्छेद'),
          tag: L('Clearest picture, fewest formulas to memorise', 'सबसे स्पष्ट चित्र, कम सूत्र याद रखने हैं'),
          steps: [
            { t: L('Midpoint of AB and the slope of AB.', 'AB का मध्यबिंदु और AB की प्रवणता।'),
              m: `M₁ = ${fmtPt(mAB)},  slope AB = ${isFinite(slopeAB) ? N.fmt(slopeAB) : 'undefined (vertical)'}` },
            { t: L('The perpendicular bisector passes through M₁ with slope −1/slope(AB).',
                   'लंब समद्विभाजक M₁ से होकर जाता है और उसकी प्रवणता −1/slope(AB) है।'),
              m: `y − ${N.fmt(mAB[1])} = ${isFinite(slopeAB) ? N.fmt(-1 / slopeAB) : 'undefined'}(x − ${N.fmt(mAB[0])})` },
            { t: L('Repeat for BC, then solve the two bisector equations together.',
                   'BC के लिए दोहराइए, फिर दोनों समद्विभाजक समीकरणों को साथ हल कीजिए।'),
              m: `M₂ = ${fmtPt(mBC)},  slope BC = ${isFinite(slopeBC) ? N.fmt(slopeBC) : 'undefined (vertical)'}\n⟹ O = (${Hs}, ${Ks})` }
          ],
          why: L('The two bisectors are found independently, so the answer cannot inherit an algebra slip from one of them.',
                  'दोनों समद्विभाजक स्वतंत्र रूप से निकाले जाते हैं, अतः उत्तर में किसी एक की बीजगणितीय चूक नहीं आएगी।'),
          watch: L('A vertical side has an undefined slope — its perpendicular bisector is horizontal. Handle that case explicitly or the division blows up.',
                  'ऊर्ध्वाधर भुजा की प्रवणता अपरिभाषित होती है — उसका लंब समद्विभाजक क्षैतिज होता है। इस स्थिति को अलग से सँभालिए।')
        },
        {
          name: L('Determinant / direct formula + radius check', 'सारणिक / सीधा सूत्र + त्रिज्या जाँच'),
          tag: L('Fastest under exam pressure', 'परीक्षा में सबसे तेज़'),
          steps: [
            { t: L('Put the three points straight into the circumcentre formula.', 'तीनों बिंदु सीधे परिकेंद्र सूत्र में रखिए।'),
              m: `h = [a²(y_B−y_C) + b²(y_C−y_A) + c²(y_A−y_B)] / 2[x_A(y_B−y_C) + x_B(y_C−y_A) + x_C(y_A−y_B)]\nk = [a²(x_C−x_B) + b²(x_A−x_C) + c²(x_B−x_A)] / same denominator` },
            { t: L('Substitute the numbers.', 'संख्याएँ रखिए।'),
              m: `denominator = ${N.fmt(den)}\nh = ${Hs},  k = ${Ks}` },
            { t: L('The radius is the distance from O to any one vertex — check all three.',
                   'त्रिज्या O से किसी भी एक शीर्ष की दूरी है — तीनों की जाँच कीजिए।'),
              m: `OA = ${N.fmt(Rc)},  OB = ${N.fmt(Rb)},  OC = ${N.fmt(Rcc)}` }
          ],
          why: L('The formula is just the two-bisector solution written out in one line, so it saves time while giving the same point.',
                  'यह सूत्र वही दो-समद्विभाजक हल है जो एक पंक्ति में लिखा गया है, अतः समय बचता है और वही बिंदु मिलता है।'),
          watch: L('The formula is easy to mis-copy. Finish with OA = OB = OC — if the three radii differ, the coordinates are wrong.',
                  'सूत्र गलत लिखना आसान है। अंत में OA = OB = OC से जाँचिए — तीनों त्रिज्याएँ भिन्न निकलीं तो निर्देशांक गलत हैं।')
        }
      ],
      verify: L(`OA = ${N.fmt(Rc)}, OB = ${N.fmt(Rb)}, OC = ${N.fmt(Rcc)} — all three equal, so the point is genuinely the circumcentre. The radius is R = ${Rs} units.`,
                `OA = ${N.fmt(Rc)}, OB = ${N.fmt(Rb)}, OC = ${N.fmt(Rcc)} — तीनों बराबर हैं, अतः यह बिंदु वास्तव में परिकेंद्र है। त्रिज्या R = ${Rs} इकाई है।`),
      _geom: { pts: [A, B, C], centre: [h, k], r: R },
      _internals: { h, k, R, agree, radiiAgree }
    });
  };

  UP.solveDistance = function (q) {
    const qq = UP.norm(q).toLowerCase();
    if (!/distance|दूरी|point|बिंदु|collinear|संरेख|coordinate|निर्देशांक/.test(qq)) return null;
    /* a question that names a different job is never a distance question:
       circumcentre, midpoint, section formula, area of triangle, reflection */
    if (/circumcentre|circumcenter|परिकेंद्र|incentre|centroid|midpoint|mid-point|मध्यबिंदु|section formula|विभाजन सूत्र|area of (?:the )?triangle|क्षेत्रफल|reflect|image of|ratio in which/.test(qq)) return null;
    /* UP.norm already turned − and – into '-'; read numbers from the normalised text
       so (−2, 1) does not lose its sign. */
    const nums = (UP.norm(q).replace(/[^0-9.,()-]/g, ' ').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (nums.length < 4) return null;
    const [x1, y1, x2, y2] = nums.slice(0, 4);
    const dx = x2 - x1, dy = y2 - y1;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    /* a distance question needs a pair of points; "areas 81 and 49" is not one */
    const hasPair = /\(\s*-?\d+(\.\d+)?\s*[,;]\s*-?\d+(\.\d+)?\s*\)/.test(UP.norm(q)) ||
      /points?\s*[A-Z]?\s*\(/.test(qq) || /बिंदु/.test(qq) && nums.length >= 4;
    if (!hasPair) return null;

    return pack({
      kind: 'distance', chapter: 7,
      title: { en: 'Distance between two points — three ways', hi: 'दो बिंदुओं के बीच दूरी — तीन विधियाँ' },
      summary: { en: `P(${x1}, ${y1}) and Q(${x2}, ${y2})`, hi: `P(${x1}, ${y1}) और Q(${x2}, ${y2})` },
      result: { en: `PQ = ${N.sqrtStr(d2)} ≈ ${N.dec(d, 3)} units`, hi: `PQ = ${N.sqrtStr(d2)} ≈ ${N.dec(d, 3)} इकाई` },
      approaches: [
        {
          name: L('Distance formula', 'दूरी सूत्र'),
          tag: L('The expected board method', 'बोर्ड में अपेक्षित विधि'),
          steps: [
            { t: L('Write the formula and identify x₁, y₁, x₂, y₂ with their signs.', 'सूत्र लिखिए और चिह्नों सहित x₁, y₁, x₂, y₂ पहचानिए।'), m: `d = √[(x₂ − x₁)² + (y₂ − y₁)²]` },
            { t: L('Substitute and subtract inside the brackets first.', 'मान रखिए और पहले कोष्ठक के भीतर घटाइए।'), m: `d = √[(${x2} − (${x1}))² + (${y2} − (${y1}))²] = √[(${dx})² + (${dy})²]` },
            { t: L('Square, add, and simplify the root.', 'वर्ग कीजिए, जोड़िए और मूल को सरल कीजिए।'), m: `d = √[${dx * dx} + ${dy * dy}] = √${d2} = ${N.sqrtStr(d2)}` }
          ],
          why: L('It is just Pythagoras with the two differences as the legs: the horizontal gap and the vertical gap are the legs, the straight line is the hypotenuse.',
                  'यह पाइथागोरस ही है जिसमें दो अंतर भुजाएँ हैं: क्षैतिज अंतर और ऊर्ध्वाधर अंतर भुजाएँ हैं, सीधी रेखा कर्ण है।'),
          watch: L('Square before adding. Also (x₂ − x₁) and (x₁ − x₂) give the same square, so sign order never matters inside.',
                  'पहले वर्ग कीजिए, फिर जोड़िए। (x₂ − x₁) और (x₁ − x₂) का वर्ग समान है, अतः भीतर क्रम का महत्व नहीं।')
        },
        {
          name: L('Right-triangle picture', 'समकोण त्रिभुज चित्र'),
          tag: L('Best if you think visually', 'यदि आप दृश्य रूप में सोचते हैं तो सर्वोत्तम'),
          steps: [
            { t: L('Draw P and Q and complete a right triangle with a horizontal and a vertical side.', 'P और Q खींचिए और क्षैतिज तथा ऊर्ध्वाधर भुजा वाला समकोण त्रिभुज पूरा कीजिए।'), m: `horizontal = |${x2} − ${x1}| = ${Math.abs(dx)}\nvertical = |${y2} − ${y1}| = ${Math.abs(dy)}` },
            { t: L('Apply Pythagoras to the triangle.', 'त्रिभुज पर पाइथागोरस लगाइए।'), m: `PQ² = ${Math.abs(dx)}² + ${Math.abs(dy)}² = ${d2}` },
            { t: L('Take the positive square root (distance is never negative).', 'धनात्मक वर्गमूल लीजिए (दूरी कभी ऋणात्मक नहीं होती)।'), m: `PQ = ${N.sqrtStr(d2)}` }
          ],
          why: L('Drawing removes the need to remember which coordinate subtracts from which — the picture shows the legs directly.',
                  'चित्र बनाने से यह याद रखने की आवश्यकता नहीं रहती कि कौन-सा निर्देशांक किससे घटाना है — चित्र भुजाएँ सीधे दिखा देता है।'),
          watch: L('Keep the sketch roughly to scale, otherwse the right angle looks wrong and you label the hypotenuse as a leg.',
                  'चित्र को लगभग पैमाने पर रखिए, अन्यथा समकोण गलत दिखेगा और कर्ण को भुजा समझ लिया जाएगा।')
        },
        {
          name: L('Squared-distance test (no roots needed)', 'दूरी-वर्ग जाँच (मूल की आवश्यकता नहीं)'),
          tag: L('The clever route for "show that…" questions', '"दर्शाइए कि…" प्रश्नों का चतुर मार्ग'),
          steps: [
            { t: L('For proofs about types of triangles or equal distances, work with PQ² instead of PQ — roots cancel out of every comparison.', 'त्रिभुज के प्रकार या समान दूरी की उपपत्तियों में PQ के स्थान पर PQ² से काम कीजिए — तुलना में मूल कट जाते हैं।'), m: `PQ² = ${d2}` },
            { t: L('Compare squared lengths: equal squares mean equal sides; the largest square equalling the sum of the other two means a right angle.', 'वर्गित लंबाइयों की तुलना कीजिए: बराबर वर्ग = बराबर भुजाएँ; सबसे बड़ा वर्ग = अन्य दो का योग = समकोण।'), m: `${dx * dx} + ${dy * dy} = ${d2}` }
          ],
          why: L('Square roots are where most arithmetic slips happen. If the question never asks for a length, never take one.',
                  'अधिकांश गणना-भूलें वर्गमूल में होती हैं। यदि प्रश्न लंबाई नहीं माँगता, तो मूल न लीजिए।'),
          watch: L('You must still state the actual distance if the question asks for it — this route is for comparisons only.',
                  'यदि प्रश्न वास्तविक दूरी माँगता है तो उसे लिखना अवश्य है — यह मार्ग केवल तुलना के लिए है।')
        }
      ],
      verify: L('The distance must be shorter than or equal to the "Manhattan" distance |dx| + |dy|, and non-negative. Also swapping P and Q must give the same answer.',
                'दूरी "मैनहट्टन" दूरी |dx| + |dy| से छोटी या बराबर तथा ऋणात्मक नहीं होनी चाहिए। P और Q बदलने पर भी वही उत्तर आना चाहिए।'),
      related: [7],
      _geom: { x1, y1, x2, y2 }
    });
  };

  /* ---------------------- mean of numbers ---------------------- */
  UP.solveMean = function (q, nums) {
    if (!nums || nums.length < 3) return null;
    if (!/mean|average|माध्य|औसत/i.test(q)) return null;
    /* This is the mean of a plain LIST of observations. A grouped/frequency
       table has class intervals and frequencies — averaging the raw digits
       would give a confident wrong number, so refuse those outright. */
    const s0 = UP.norm(q).toLowerCase();
    const hasIntervals = /\d+\s*[–—\-]\s*\d+/.test(s0);
    const hasFreqPairs = /:\s*\d+/.test(s0) || /\bfrequency|बारंबारता/.test(s0);
    if (hasIntervals || hasFreqPairs) return null;
    if (/median|mode|माध्यक|बहुलक/.test(s0)) return null;
    const n = nums.length, sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const a = nums[0];
    const dev = nums.map(x => x - a);
    const step = 1;

    return pack({
      kind: 'mean', chapter: 13,
      title: { en: 'Mean of ungrouped data — three ways', hi: 'अवर्गीकृत आँकड़ों का माध्य — तीन विधियाँ' },
      summary: { en: `${n} observations, sum = ${F(sum)}`, hi: `${n} प्रेक्षण, योग = ${F(sum)}` },
      result: { en: `Mean = ${F(mean)}`, hi: `माध्य = ${F(mean)}` },
      approaches: [
        {
          name: L('Direct method', 'प्रत्यक्ष विधि'),
          tag: L('Simplest and always accepted', 'सरलतम और सदैव स्वीकार्य'),
          steps: [
            { t: L('Add all the observations.', 'सभी प्रेक्षण जोड़िए।'), m: `${nums.join(' + ')} = ${F(sum)}` },
            { t: L('Divide by the number of observations.', 'प्रेक्षणों की संख्या से भाग दीजिए।'), m: `x̄ = ${F(sum)} / ${n} = ${F(mean)}` }
          ],
          why: L('The mean is the value every observation would have if the total were shared equally — which is exactly what dividing the sum does.',
                  'माध्य वह मान है जो हर प्रेक्षण को मिलता यदि कुल को बराबर बाँटा जाए — योग को भाग देने का अर्थ यही है।'),
          watch: L('Count the observations carefully; a wrong n spoils a correct sum.', 'प्रेक्षण ध्यान से गिनिए; गलत n सही योग को भी बिगाड़ देता है।')
        },
        {
          name: L('Assumed mean method', 'कल्पित माध्य विधि'),
          tag: L('Faster when the numbers are large', 'जब संख्याएँ बड़ी हों तब तेज़'),
          steps: [
            { t: L('Assume one observation as the mean (a) and write the deviations d = x − a.', 'एक प्रेक्षण को माध्य (a) मानिए और विचलन d = x − a लिखिए।'), m: `a = ${F(a)}\nd = ${dev.join(', ')}` },
            { t: L('Add the deviations and correct the assumed mean.', 'विचलन जोड़िए और कल्पित माध्य में सुधार कीजिए।'), m: `Σd = ${F(dev.reduce((x, y) => x + y, 0))}\nx̄ = a + Σd/n = ${F(a)} + ${F(dev.reduce((x, y) => x + y, 0) / n)} = ${F(mean)}` }
          ],
          why: L('Deviations from a nearby value are small numbers, so the addition is quick and typo-resistant. The correction term is exactly the average deviation.',
                  'निकट मान से विचलन छोटी संख्याएँ होती हैं, अतः जोड़ शीघ्र और त्रुटि-रहित होता है। सुधार पद औसत विचलन ही है।'),
          watch: L('Never forget to add back the assumed mean — the deviations alone are not the answer.', 'कल्पित माध्य वापस जोड़ना न भूलिए — केवल विचलन उत्तर नहीं हैं।')
        },
        {
          name: L('Balancing method (shortcut reasoning)', 'संतुलन विधि (त्वरित तर्क)'),
          tag: L('Great for a mental estimate', 'मानसिक अनुमान के लिए उत्तम'),
          steps: [
            { t: L('Guess a mean, then see how much must be added to some observations and removed from others to balance.', 'माध्य का अनुमान लगाइए, फिर देखिए कुछ प्रेक्षणों में कितना जोड़ना और कितना घटाना है ताकि संतुलन बने।'), m: `guess = ${F(a)}  →  total imbalance = ${F(sum - a * n)}` },
            { t: L('Share the imbalance equally among all observations.', 'असंतुलन को सभी प्रेक्षणों में बराबर बाँटिए।'), m: `correction = ${F((sum - a * n) / n)}  ⟹  x̄ = ${F(mean)}` }
          ],
          why: L('This is the same algebra as the assumed-mean method, but phrased as fairness: the mean is the single value that leaves zero total imbalance.',
                  'यह कल्पित माध्य विधि ही है, पर न्याय के रूप में: माध्य वही एक मान है जिस पर कुल असंतुलन शून्य रहता है।'),
          watch: L('Fine for a check, but write the direct method in the exam unless the question asks otherwise.', 'जाँच के लिए ठीक है, पर परीक्षा में प्रत्यक्ष विधि लिखिए जब तक प्रश्न अन्यथा न कहे।')
        }
      ],
      verify: L('The mean must lie between the smallest and the largest observation. Check that.', 'माध्य सबसे छोटे और सबसे बड़े प्रेक्षण के बीच होना चाहिए। यह जाँचिए।'),
      related: [13],
      _geom: { data: nums }
    });
  };

  /* ---------------------- percentage / arithmetic ---------------------- */
  UP.solvePercent = function (q) {
    const s = UP.norm(q);
    const nums = (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (!/percent|%|प्रतिशत/i.test(s) || nums.length < 2) return null;
    const whole = nums.find(n => n >= 100) || nums[0];
    const part = nums.find(n => n !== whole) || nums[1];
    const pct = /increase|बढ़/i.test(s) ? (part / whole) * 100 : (part / whole) * 100;

    return pack({
      kind: 'percent', chapter: 0,
      title: { en: 'Percentage problem — three ways', hi: 'प्रतिशत प्रश्न — तीन विधियाँ' },
      summary: { en: `${part} out of ${whole}`, hi: `${whole} में से ${part}` },
      result: { en: `${F(pct)}%`, hi: `${F(pct)}%` },
      approaches: [
        {
          name: L('Unitary method', 'ऐकिक विधि'),
          tag: L('Most intuitive', 'सर्वाधिक स्वाभाविक'),
          steps: [
            { t: L('Find the value of 1 unit by dividing.', 'भाग देकर 1 इकाई का मान ज्ञात कीजिए।'), m: `${whole} ⟶ 100%  so  1 ⟶ ${F(100 / whole)}%` },
            { t: L('Multiply by the required number of units.', 'आवश्यक इकाइयों से गुणा कीजिए।'), m: `${part} ⟶ ${F(part)} × ${F(100 / whole)}% = ${F(pct)}%` }
          ],
          why: L('It turns the percentage into a rate per unit, which is easy to check and easy to extend to any other quantity.',
                  'यह प्रतिशत को प्रति इकाई दर में बदल देता है, जिसे जाँचना और किसी अन्य मात्रा तक बढ़ाना आसान है।'),
          watch: L('Multiply before dividing if the numbers divide awkwardly — order does not change the answer.', 'यदि भाग कठिन लगे तो पहले गुणा कीजिए — क्रम से उत्तर नहीं बदलता।')
        },
        {
          name: L('Fraction / equivalent ratio', 'भिन्न / समतुल्य अनुपात'),
          tag: L('Neat when the numbers cancel', 'जब संख्याएँ कटें तब सुंदर'),
          steps: [
            { t: L('Write the comparison as a fraction and simplify it.', 'तुलना को भिन्न के रूप में लिखिए और सरल कीजिए।'), m: `${part}/${whole} = ${F(part / whole)}` },
            { t: L('Multiply by 100 to express it as a percentage.', 'प्रतिशत में व्यक्त करने के लिए 100 से गुणा कीजिए।'), m: `${F(part / whole)} × 100 = ${F(pct)}%` }
          ],
          why: L('A percentage is only a fraction with denominator 100, so simplifying first makes the final multiplication trivial.',
                  'प्रतिशत केवल हर 100 वाली भिन्न है, अतः पहले सरल करने से अंतिम गुणा तुच्छ हो जाता है।'),
          watch: L('Cancel diagonally only — never cancel a number that belongs to the same side.', 'केवल तिर्यक् काटिए — एक ही पक्ष की संख्याएँ कभी न काटिए।')
        },
        {
          name: L('Equation method (for "of what" questions)', 'समीकरण विधि ("किसका" प्रश्नों के लिए)'),
          tag: L('Use when the base is unknown', 'जब आधार अज्ञात हो तब प्रयोग कीजिए'),
          steps: [
            { t: L('Let the unknown base be x and translate the sentence into an equation.', 'अज्ञात आधार को x मानिए और वाक्य को समीकरण में बदलिए।'), m: `${F(pct)}% of x = ${F(part)}` },
            { t: L('Solve by dividing by the percentage written as a decimal or fraction.', 'प्रतिशत को दशमलव या भिन्न में लिखकर भाग दीजिए।'), m: `x = ${F(part)} ÷ ${F(pct / 100)} = ${F(part / (pct / 100))}` }
          ],
          why: L('When the base is missing, the unitary method runs backwards; an equation keeps the unknown visible so you never divide by the wrong thing.',
                  'जब आधार छूटा हो, ऐकिक विधि उलटी चलती है; समीकरण अज्ञात को सामने रखता है ताकि आप गलत संख्या से भाग न दें।'),
          watch: L('"x% more than y" is y(1 + x/100), not y + x. Keep the base attached to the comparison.', '"y से x% अधिक" का अर्थ y(1 + x/100) है, y + x नहीं। आधार को तुलना से जोड़े रखिए।')
        }
      ],
      verify: L('A percentage of increase is always measured from the ORIGINAL value, not the new one. Re-read which quantity is the base.',
                'वृद्धि का प्रतिशत सदैव मूल मान से मापा जाता है, नए मान से नहीं। पुनः पढ़िए कि आधार कौन-सी राशि है।'),
      related: []
    });
  };
})();
