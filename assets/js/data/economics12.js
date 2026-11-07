/* Class 12 Economics: concise bilingual study guides written for Upay.
 * These are overviews and original review checks, not transcribed exercises,
 * official answers, past papers, or a complete board syllabus. Source files
 * are catalogued separately in economics-sources.js.
 */
window.UP = window.UP || {};
(function (UP) {
  const bi = (en, hi) => ({ en, hi });
  const idea = (enTitle, hiTitle, en, hi) => ({ t: bi(enTitle, hiTitle), b: bi(en, hi) });
  const formula = (en, hi, expression, enNote, hiNote) => ({ n: bi(en, hi), e: expression, note: bi(enNote, hiNote) });
  const check = (enQ, hiQ, enA, hiA) => ({ q: bi(enQ, hiQ), a: bi(enA, hiA) });
  const books = {
    macro: bi('Introductory Macroeconomics', 'समष्टि अर्थशास्त्र : एक परिचय'),
    micro: bi('Introductory Microeconomics', 'व्यष्टि अर्थशास्त्र : एक परिचय')
  };
  const plan = [
    bi('Read the source chapter, including its diagrams and examples; mark unfamiliar terms.', 'मूल अध्याय को चित्रों और उदाहरणों सहित पढ़ें; अपरिचित शब्द चिह्नित करें।'),
    bi('Revise these key ideas and any formulas, then attempt the review checks without looking at the suggested answers.', 'यहाँ दिए मुख्य विचार और सूत्र दोहराएँ; फिर सुझाए गए उत्तर देखे बिना अभ्यास करें।'),
    bi('Try the textbook exercises in the PDF and discuss your answers with a teacher. No official answer key is supplied here.', 'PDF में पाठ्यपुस्तक के अभ्यास प्रश्न हल करें और शिक्षक से जाँचें। यहाँ आधिकारिक उत्तर-कुंजी नहीं दी गई है।')
  ];
  function chapter(book, n, en, hi, enDesc, hiDesc, concepts, formulas, practice, enKeywords, hiKeywords) {
    return {
      id: (book === 'macro' ? 1100 : 1200) + n, n, displayNo: n, book, bookTitle: books[book],
      subject: 'economics', className: 12, en, hi, enDesc, hiDesc, demand: 'outline',
      concepts, formulas, practice, pyqs: [], plan, keywords: { en: enKeywords, hi: hiKeywords }
    };
  }

  UP.course12economics = [
    chapter('macro', 1, 'Introduction', 'परिचय',
      'Economy-wide questions, the four sectors and the development of macroeconomic thinking.',
      'सम्पूर्ण अर्थव्यवस्था के प्रश्न, चार क्षेत्रक और समष्टि विचार का विकास।', [
        idea('Micro and macro', 'व्यष्टि और समष्टि', 'Microeconomics studies individual decision-makers and markets. Macroeconomics studies aggregates such as total output, employment and the general price level.', 'व्यष्टि अर्थशास्त्र व्यक्तिगत निर्णयकर्ताओं और बाज़ारों का अध्ययन करता है। समष्टि अर्थशास्त्र कुल उत्पादन, रोज़गार और सामान्य मूल्य स्तर जैसे समुच्चयों को देखता है।'),
        idea('Four sectors', 'चार क्षेत्रक', 'The textbook distinguishes households, firms, government and the external sector. They are linked through production, income, spending and trade.', 'पाठ्यपुस्तक परिवारों, फर्मों, सरकार और विदेशी क्षेत्र को अलग करती है। उत्पादन, आय, व्यय और व्यापार से ये जुड़े हैं।'),
        idea('Why aggregates matter', 'समुच्चय क्यों महत्त्वपूर्ण हैं', 'The Great Depression drew attention to persistent unemployment and inadequate aggregate demand. Keynes challenged the idea that a market economy must quickly return to full employment.', 'महामंदी ने लंबे समय की बेरोज़गारी और अपर्याप्त समग्र माँग की ओर ध्यान खींचा। कीन्स ने इस विचार को चुनौती दी कि बाज़ार अर्थव्यवस्था हमेशा जल्दी पूर्ण रोज़गार पर लौट आती है।')
      ], [], [
        check('Is the output of one firm a microeconomic or macroeconomic variable?', 'एक फर्म का उत्पादन व्यष्टि चर है या समष्टि चर?', 'It is a microeconomic variable; total output of the economy is a macroeconomic aggregate.', 'यह व्यष्टि चर है; अर्थव्यवस्था का कुल उत्पादन समष्टि समुच्चय है।'),
        check('Name the four sectors in the textbook model.', 'पाठ्यपुस्तक के मॉडल में चार क्षेत्रक बताइए।', 'Households, firms, government and the external sector.', 'परिवार, फर्म, सरकार और विदेशी क्षेत्र।')
      ], ['aggregate', 'sectors', 'Great Depression', 'Keynes'], ['समुच्चय', 'क्षेत्रक', 'महामंदी', 'कीन्स']),

    chapter('macro', 2, 'National Income Accounting', 'राष्ट्रीय आय का लेखांकन',
      'Circular flow, value added, GDP, depreciation and national income measures.',
      'आय का चक्रीय प्रवाह, मूल्य संवर्धन, GDP, मूल्यह्रास और राष्ट्रीय आय की माप।', [
        idea('Circular flow', 'आय का चक्रीय प्रवाह', 'Production generates factor incomes. Spending on final goods and services becomes revenue for producers; the product, income and expenditure approaches describe the same activity with appropriate adjustments.', 'उत्पादन से साधन आय बनती है। अंतिम वस्तुओं और सेवाओं पर व्यय उत्पादकों की प्राप्ति बनता है; उचित समायोजन के बाद उत्पाद, आय और व्यय विधियाँ इसी गतिविधि को अलग तरीकों से मापती हैं।'),
        idea('Final goods and value added', 'अंतिम वस्तुएँ और मूल्य संवर्धन', 'Intermediate goods are used up in further production. Counting both their full value and the final product would double count; value added subtracts intermediate inputs from output.', 'मध्यवर्ती वस्तुएँ आगे के उत्पादन में प्रयुक्त होती हैं। उनका पूरा मूल्य और अंतिम उत्पाद दोनों जोड़ने पर दोहरी गणना होगी; मूल्य संवर्धन में उत्पादन से मध्यवर्ती लागत घटाते हैं।'),
        idea('Gross, net, domestic and national', 'सकल, शुद्ध, घरेलू और राष्ट्रीय', 'Gross measures include depreciation; net measures deduct it. Domestic production is within the economic territory; national measures add net factor income from abroad.', 'सकल माप में मूल्यह्रास शामिल है; शुद्ध माप में उसे घटाते हैं। घरेलू उत्पादन आर्थिक क्षेत्र के भीतर होता है; राष्ट्रीय माप में विदेश से शुद्ध साधन आय जोड़ते हैं।'),
        idea('Stocks and flows', 'स्टॉक और प्रवाह', 'A stock is measured at a point in time, such as the capital stock. A flow is measured over a period, such as investment or income.', 'स्टॉक किसी एक समय पर मापा जाता है, जैसे पूँजी का भंडार। प्रवाह किसी अवधि में मापा जाता है, जैसे निवेश या आय।')
      ], [
        formula('Expenditure identity', 'व्यय की सर्वसमिका', 'GDP = C + I + G + (X − M)', 'At market prices: C consumption, I gross investment, G government final spending, X exports and M imports.', 'बाज़ार मूल्य पर: C उपभोग, I सकल निवेश, G सरकारी अंतिम व्यय, X निर्यात और M आयात।'),
        formula('Depreciation', 'मूल्यह्रास', 'NDP = GDP − depreciation', 'Use consistent prices and the same period.', 'एक ही मूल्य आधार और अवधि का उपयोग करें।'),
        formula('Domestic to national', 'घरेलू से राष्ट्रीय', 'GNP = GDP + net factor income from abroad', 'Net factor income from abroad = factor income received from abroad − factor income paid abroad.', 'विदेश से शुद्ध साधन आय = विदेश से प्राप्त साधन आय − विदेश को दी गई साधन आय।')
      ], [
        check('A firm sells output for ₹100 after using ₹40 of intermediate inputs. What is its value added?', 'किसी फर्म का उत्पादन ₹100 में बिकता है और मध्यवर्ती लागत ₹40 है। मूल्य संवर्धन कितना है?', '₹60, assuming the figures cover the same period and valuation.', '₹60, यदि दोनों मूल्य एक ही अवधि और मूल्यांकन से संबंधित हैं।'),
        check('If GDP is ₹500 crore and depreciation is ₹20 crore, find NDP.', 'GDP ₹500 करोड़ और मूल्यह्रास ₹20 करोड़ है। NDP ज्ञात करें।', 'NDP is ₹480 crore.', 'NDP ₹480 करोड़ है।')
      ], ['GDP', 'national income', 'value added', 'depreciation', 'circular flow'], ['सकल घरेलू उत्पाद', 'राष्ट्रीय आय', 'मूल्य संवर्धन', 'मूल्यह्रास']),

    chapter('macro', 3, 'Money and Banking', 'मुद्रा और बैंकिंग',
      'Functions of money, deposits, credit creation and central-bank policy tools.',
      'मुद्रा के कार्य, जमा, साख सृजन और केंद्रीय बैंक के नीति उपकरण।', [
        idea('Functions of money', 'मुद्रा के कार्य', 'Money is a medium of exchange, a unit of account and a store of value. It reduces the need for the double coincidence of wants required by barter.', 'मुद्रा विनिमय का माध्यम, लेखे की इकाई और मूल्य संचय का साधन है। यह वस्तु-विनिमय में इच्छाओं के दोहरे संयोग की आवश्यकता कम करती है।'),
        idea('Commercial banks', 'वाणिज्यिक बैंक', 'Banks accept deposits, keep reserves and make loans. Lending can create additional deposits, subject to reserve requirements, demand for loans and other constraints.', 'बैंक जमा स्वीकार करते हैं, आरक्षित निधि रखते हैं और ऋण देते हैं। ऋण से अतिरिक्त जमा बन सकती है, पर आरक्षण, ऋण की माँग और अन्य सीमाएँ भी प्रभाव डालती हैं।'),
        idea('Central bank', 'केंद्रीय बैंक', 'The central bank issues currency and helps manage liquidity and banking stability. The book discusses reserve requirements, policy rates and open-market operations.', 'केंद्रीय बैंक मुद्रा जारी करता है और तरलता तथा बैंकिंग स्थिरता के प्रबंधन में सहायता करता है। पुस्तक आरक्षित अनुपात, नीतिगत दरों और खुले बाज़ार की क्रियाओं की चर्चा करती है।')
      ], [
        formula('Simple deposit multiplier', 'सरल जमा गुणक', 'Maximum deposit multiplier = 1 / reserve ratio', 'Idealised case: fixed reserve ratio, full re-lending and redepositing, with no cash or excess-reserve leakage. Actual outcomes can differ.', 'आदर्श स्थिति: निश्चित आरक्षित अनुपात, पूरा पुनर्ऋण व पुनर्जमा, और नकदी या अतिरिक्त आरक्षित रिसाव नहीं। वास्तविक परिणाम भिन्न हो सकते हैं।')
      ], [
        check('Which function lets money act as a common measure of prices?', 'मुद्रा का कौन-सा कार्य कीमतों को सामान्य माप देता है?', 'Its function as a unit of account.', 'लेखे की इकाई का कार्य।'),
        check('In the simple model, what is the deposit multiplier when the reserve ratio is 20%?', 'सरल मॉडल में आरक्षित अनुपात 20% हो तो जमा गुणक क्या होगा?', '1 / 0.20 = 5, under the stated ideal assumptions.', 'दी गई आदर्श मान्यताओं में 1 / 0.20 = 5।')
      ], ['money', 'bank', 'reserve ratio', 'central bank', 'credit'], ['मुद्रा', 'बैंक', 'आरक्षित अनुपात', 'केंद्रीय बैंक', 'साख']),

    chapter('macro', 4, 'Determination of Income and Employment', 'आय और रोज़गार का निर्धारण',
      'Aggregate demand, consumption, planned investment, equilibrium and the multiplier.',
      'समग्र माँग, उपभोग, नियोजित निवेश, संतुलन और गुणक।', [
        idea('Aggregate demand', 'समग्र माँग', 'In the simple closed economy without government, planned aggregate demand is consumption plus planned investment. Firms respond to unplanned inventory changes.', 'सरकार रहित सरल बंद अर्थव्यवस्था में नियोजित समग्र माँग उपभोग और नियोजित निवेश का योग है। अनियोजित माल-सूची परिवर्तन पर फर्में प्रतिक्रिया करती हैं।'),
        idea('Consumption and saving', 'उपभोग और बचत', 'The marginal propensity to consume (MPC) is the change in consumption divided by the change in income. With income divided between consumption and saving, MPC + MPS = 1.', 'सीमांत उपभोग प्रवृत्ति (MPC) आय के परिवर्तन से उपभोग में परिवर्तन का अनुपात है। यदि आय केवल उपभोग और बचत में बँटती है, तो MPC + MPS = 1।'),
        idea('Equilibrium and multiplier', 'संतुलन और गुणक', 'Equilibrium output occurs where planned spending equals output. In the simplified model, a change in autonomous spending induces a larger change in income when 0 < MPC < 1.', 'संतुलन उत्पादन वहाँ है जहाँ नियोजित व्यय उत्पादन के बराबर है। सरल मॉडल में 0 < MPC < 1 होने पर स्वायत्त व्यय के परिवर्तन से आय में अधिक परिवर्तन होता है।')
      ], [
        formula('Simple equilibrium', 'सरल संतुलन', 'Y = (C₀ + I) / (1 − c)', 'For C = C₀ + cY, fixed planned I, a closed economy without government, and c < 1.', 'जब C = C₀ + cY, नियोजित I निश्चित हो, अर्थव्यवस्था बंद व सरकार रहित हो और c < 1।'),
        formula('Autonomous expenditure multiplier', 'स्वायत्त व्यय गुणक', 'k = 1 / (1 − MPC) = 1 / MPS', 'In the simple model with MPC + MPS = 1 and 0 < MPC < 1.', 'सरल मॉडल में MPC + MPS = 1 और 0 < MPC < 1 होने पर।')
      ], [
        check('If MPC is 0.8, what are MPS and the simple multiplier?', 'MPC 0.8 हो तो MPS और सरल गुणक क्या होंगे?', 'MPS = 0.2 and k = 5, under the model’s assumptions.', 'मॉडल की मान्यताओं में MPS = 0.2 और k = 5।'),
        check('If C₀ = 20, I = 30 and MPC = 0.8, what is equilibrium income in this model?', 'इस मॉडल में C₀ = 20, I = 30 और MPC = 0.8 हो तो संतुलन आय कितनी होगी?', 'Y = (20 + 30) / (1 − 0.8) = 250.', 'Y = (20 + 30) / (1 − 0.8) = 250।')
      ], ['aggregate demand', 'MPC', 'MPS', 'equilibrium', 'multiplier'], ['समग्र माँग', 'सीमांत उपभोग प्रवृत्ति', 'संतुलन', 'गुणक']),

    chapter('macro', 5, 'Government Budget and the Economy', 'सरकारी बजट एवं अर्थव्यवस्था',
      'Revenue and capital items, fiscal policy and budget deficit measures.',
      'राजस्व व पूँजी मदें, राजकोषीय नीति और बजट घाटे की माप।', [
        idea('Budget components', 'बजट के घटक', 'The government budget sets out estimated receipts and expenditure. Revenue receipts neither create liabilities nor reduce assets; a capital receipt creates a liability or reduces an asset.', 'सरकारी बजट अनुमानित प्राप्तियाँ और व्यय दिखाता है। राजस्व प्राप्ति न देनदारी बनाती है और न परिसंपत्ति घटाती है; पूँजी प्राप्ति देनदारी बनाती है या परिसंपत्ति घटाती है।'),
        idea('Revenue and capital expenditure', 'राजस्व और पूँजी व्यय', 'Revenue expenditure generally neither creates assets nor reduces liabilities. Capital expenditure creates assets or reduces liabilities; classification depends on the nature of the transaction.', 'राजस्व व्यय सामान्यतः न परिसंपत्ति बनाता है और न देनदारी घटाता है। पूँजी व्यय परिसंपत्ति बनाता है या देनदारी घटाता है; वर्गीकरण लेन-देन की प्रकृति पर निर्भर करता है।'),
        idea('Deficits', 'घाटे', 'Revenue, fiscal and primary deficits measure different gaps. A fiscal deficit indicates the financing need before borrowing; it is not the same as the revenue deficit.', 'राजस्व, राजकोषीय और प्राथमिक घाटे अलग-अलग अंतर मापते हैं। राजकोषीय घाटा उधार लेने से पहले वित्त की आवश्यकता दिखाता है; यह राजस्व घाटे के बराबर होना आवश्यक नहीं है।')
      ], [
        formula('Revenue deficit', 'राजस्व घाटा', 'Revenue deficit = revenue expenditure − revenue receipts', 'A positive result represents a deficit.', 'धनात्मक परिणाम घाटा दर्शाता है।'),
        formula('Fiscal deficit', 'राजकोषीय घाटा', 'Fiscal deficit = total expenditure − (revenue receipts + non-debt capital receipts)', 'Borrowings are excluded from receipts in this calculation.', 'इस गणना में उधार को प्राप्तियों से बाहर रखा जाता है।'),
        formula('Primary deficit', 'प्राथमिक घाटा', 'Primary deficit = fiscal deficit − interest payments', 'Use interest payments for the same budget period.', 'उसी बजट अवधि के ब्याज भुगतान का प्रयोग करें।')
      ], [
        check('Is borrowing a revenue receipt or a capital receipt?', 'उधार राजस्व प्राप्ति है या पूँजी प्राप्ति?', 'A capital receipt, because it creates a liability.', 'पूँजी प्राप्ति, क्योंकि इससे देनदारी बनती है।'),
        check('If fiscal deficit is ₹100 crore and interest payments are ₹30 crore, find primary deficit.', 'राजकोषीय घाटा ₹100 करोड़ और ब्याज भुगतान ₹30 करोड़ हो तो प्राथमिक घाटा क्या है?', '₹70 crore.', '₹70 करोड़।')
      ], ['budget', 'receipts', 'fiscal deficit', 'revenue deficit', 'primary deficit'], ['बजट', 'प्राप्तियाँ', 'राजकोषीय घाटा', 'राजस्व घाटा', 'प्राथमिक घाटा']),

    chapter('macro', 6, 'Open Economy Macroeconomics', 'खुली अर्थव्यवस्था समष्टि अर्थशास्त्र',
      'Trade, balance of payments, exchange rates and the open economy.',
      'व्यापार, भुगतान संतुलन, विनिमय दरें और खुली अर्थव्यवस्था।', [
        idea('Trade and external transactions', 'व्यापार और बाहरी लेन-देन', 'An open economy trades goods and services and can engage in financial transactions with the rest of the world. Net exports are exports minus imports.', 'खुली अर्थव्यवस्था शेष विश्व से वस्तुओं और सेवाओं का व्यापार तथा वित्तीय लेन-देन कर सकती है। शुद्ध निर्यात, निर्यात में से आयात घटाने पर मिलता है।'),
        idea('Balance of payments', 'भुगतान संतुलन', 'The current account includes goods, services, primary income and transfers. The capital/financial side records relevant capital and financial transactions; official reserves can help finance an imbalance.', 'चालू खाते में वस्तुएँ, सेवाएँ, प्राथमिक आय और अंतरण शामिल हैं। पूँजी/वित्तीय पक्ष संबंधित पूँजी और वित्तीय लेन-देन दर्ज करता है; आधिकारिक आरक्षित निधि असंतुलन के वित्तपोषण में सहायक हो सकती है।'),
        idea('Exchange rates', 'विनिमय दरें', 'Depreciation is a market-driven fall in a currency’s value under a flexible rate; devaluation is an official reduction under a fixed-rate arrangement. The real exchange rate also reflects price levels.', 'मूल्यह्रास लचीली दर में मुद्रा के मूल्य की बाज़ार-जनित गिरावट है; अवमूल्यन स्थिर दर व्यवस्था में आधिकारिक कमी है। वास्तविक विनिमय दर में मूल्य स्तर भी शामिल होते हैं।')
      ], [
        formula('Net exports', 'शुद्ध निर्यात', 'NX = X − M', 'X = exports and M = imports, measured over the same period.', 'X = निर्यात और M = आयात; दोनों एक ही अवधि के हों।')
      ], [
        check('Exports are ₹90 crore and imports are ₹110 crore. What are net exports?', 'निर्यात ₹90 करोड़ और आयात ₹110 करोड़ है। शुद्ध निर्यात क्या होगा?', '−₹20 crore: imports exceed exports by ₹20 crore.', '−₹20 करोड़: आयात, निर्यात से ₹20 करोड़ अधिक है।'),
        check('How is devaluation different from depreciation?', 'अवमूल्यन और मूल्यह्रास में क्या अंतर है?', 'Devaluation is an official reduction under a fixed-rate system; depreciation is a fall determined by market forces under a flexible rate.', 'अवमूल्यन स्थिर दर व्यवस्था में आधिकारिक कमी है; मूल्यह्रास लचीली दर में बाज़ार शक्तियों से होने वाली गिरावट है।')
      ], ['open economy', 'balance of payments', 'exports', 'exchange rate'], ['खुली अर्थव्यवस्था', 'भुगतान संतुलन', 'निर्यात', 'विनिमय दर']),

    chapter('micro', 1, 'Introduction', 'परिचय',
      'Scarcity, opportunity cost, production possibilities and economic systems.',
      'दुर्लभता, अवसर लागत, उत्पादन संभावनाएँ और आर्थिक व्यवस्थाएँ।', [
        idea('Scarcity and choice', 'दुर्लभता और चयन', 'Resources are limited relative to wants, so an economy must decide what to produce, how to produce and for whom. Choosing one use involves giving up another opportunity.', 'इच्छाओं की तुलना में संसाधन सीमित हैं, इसलिए अर्थव्यवस्था को क्या, कैसे और किसके लिए उत्पादन करना है, यह तय करना होता है। एक विकल्प चुनने पर दूसरा अवसर छोड़ना पड़ता है।'),
        idea('Production possibility frontier', 'उत्पादन संभावना सीमा', 'A production possibility frontier shows feasible combinations of two goods when resources and technology are given and efficiently used. Its opportunity cost reflects how much of one good is forgone for more of the other.', 'उत्पादन संभावना सीमा दिए गए संसाधनों और तकनीक के कुशल उपयोग पर दो वस्तुओं के संभव संयोजन दिखाती है। अवसर लागत बताती है कि एक वस्तु अधिक पाने के लिए दूसरी कितनी छोड़नी होगी।'),
        idea('Positive and normative', 'सकारात्मक और मानक विश्लेषण', 'Positive analysis describes or tests what is; normative analysis concerns judgments about what ought to be. Market, centrally planned and mixed systems coordinate choices differently.', 'सकारात्मक विश्लेषण बताता या जाँचता है कि क्या है; मानक विश्लेषण में क्या होना चाहिए पर मूल्य निर्णय होते हैं। बाज़ार, केंद्रीय नियोजित और मिश्रित व्यवस्थाएँ चुनाव अलग तरीकों से समन्वित करती हैं।')
      ], [], [
        check('What is opportunity cost?', 'अवसर लागत क्या है?', 'The value of the next-best alternative forgone when a choice is made.', 'चुनाव करते समय छोड़े गए अगले सर्वोत्तम विकल्प का मूल्य।'),
        check('Is “the government should reduce inequality” positive or normative?', '“सरकार को असमानता कम करनी चाहिए” सकारात्मक है या मानक?', 'Normative: it expresses a value judgment about what should happen.', 'मानक: यह क्या होना चाहिए, इस पर मूल्य निर्णय है।')
      ], ['scarcity', 'opportunity cost', 'production possibilities', 'market economy'], ['दुर्लभता', 'अवसर लागत', 'उत्पादन संभावना', 'बाज़ार अर्थव्यवस्था']),

    chapter('micro', 2, 'Theory of Consumer Behaviour', 'उपभोक्ता व्यवहार का सिद्धांत',
      'Budget sets, preferences, consumer choice, demand and elasticity.',
      'बजट समुच्चय, वरीयताएँ, उपभोक्ता चयन, माँग और लोच।', [
        idea('Budget constraint', 'बजट बाधा', 'A consumer can afford bundles whose total cost does not exceed income. A budget line shows bundles that use the entire budget at given prices.', 'उपभोक्ता वे संयोजन खरीद सकता है जिनकी कुल लागत आय से अधिक न हो। निश्चित कीमतों पर पूरी आय खर्च करने वाले संयोजन बजट रेखा पर होते हैं।'),
        idea('Preferences and optimum', 'वरीयताएँ और सर्वोत्तम चयन', 'Indifference curves represent equally preferred bundles. With suitable smooth, convex preferences and an interior optimum, the marginal rate of substitution equals the price ratio; corner solutions need separate treatment.', 'उदासीनता वक्र समान वरीयता वाले संयोजन दिखाते हैं। उपयुक्त चिकनी, उत्तल वरीयताओं और आंतरिक सर्वोत्तम बिंदु पर सीमांत प्रतिस्थापन दर कीमत अनुपात के बराबर होती है; कोने के समाधान अलग देखे जाते हैं।'),
        idea('Demand and elasticity', 'माँग और लोच', 'The demand curve relates quantity demanded to a good’s own price, holding other factors constant. Price elasticity measures the responsiveness of quantity demanded to a price change.', 'माँग वक्र अन्य कारक स्थिर रखते हुए किसी वस्तु की कीमत और माँगी गई मात्रा का संबंध दिखाता है। कीमत लोच, कीमत बदलने पर माँगी गई मात्रा की प्रतिक्रिया मापती है।')
      ], [
        formula('Budget set', 'बजट समुच्चय', 'pₓx + pᵧy ≤ M', 'pₓ and pᵧ are prices, x and y are quantities, and M is income. Equality gives the budget line.', 'pₓ व pᵧ कीमतें, x व y मात्राएँ और M आय है। बराबरी बजट रेखा देती है।'),
        formula('Price elasticity of demand', 'माँग की कीमत लोच', '|Eᵈ| = |% change in quantity demanded / % change in price|', 'Use a consistent percentage-change convention and non-zero bases; the absolute value reports magnitude.', 'प्रतिशत परिवर्तन की एक समान विधि और शून्य से अलग आधार लें; निरपेक्ष मान परिमाण बताता है।')
      ], [
        check('Income is ₹100 and good X costs ₹20. If nothing else is bought, what is the maximum quantity of X?', 'आय ₹100 और वस्तु X की कीमत ₹20 है। कुछ और न खरीदें तो X की अधिकतम मात्रा क्या है?', '5 units, assuming the entire income can be spent on X.', '5 इकाइयाँ, यदि पूरी आय X पर खर्च की जा सकती है।'),
        check('What does a budget line show?', 'बजट रेखा क्या दिखाती है?', 'Bundles that exactly exhaust income at the given prices.', 'दी गई कीमतों पर आय को पूरा खर्च करने वाले वस्तु-संयोजन।')
      ], ['budget line', 'consumer', 'demand', 'indifference curve', 'elasticity'], ['बजट रेखा', 'उपभोक्ता', 'माँग', 'उदासीनता वक्र', 'लोच']),

    chapter('micro', 3, 'Production and Costs', 'उत्पादन तथा लागत',
      'Production functions, short and long runs, product measures and costs.',
      'उत्पादन फलन, अल्प और दीर्घ अवधि, उत्पाद माप तथा लागत।', [
        idea('Production and time', 'उत्पादन और अवधि', 'A production function relates input combinations to maximum feasible output. In the short run at least one input is fixed; in the long run all inputs can vary.', 'उत्पादन फलन आगतों के संयोजन को अधिकतम संभव उत्पादन से जोड़ता है। अल्प अवधि में कम-से-कम एक आगत स्थिर होता है; दीर्घ अवधि में सभी बदल सकते हैं।'),
        idea('Total, average and marginal product', 'कुल, औसत और सीमांत उत्पाद', 'For a variable input, average product is output per unit of that input. Marginal product is the additional output from an additional unit, holding other inputs fixed.', 'परिवर्तनशील आगत का औसत उत्पाद प्रति इकाई आगत उत्पादन है। अन्य आगत स्थिर रखते हुए एक अतिरिक्त इकाई से बढ़ा उत्पादन सीमांत उत्पाद है।'),
        idea('Cost measures', 'लागत के माप', 'Total cost combines fixed and variable cost. Average cost is cost per unit of output; marginal cost is the additional total cost of an extra unit of output.', 'कुल लागत स्थिर और परिवर्तनशील लागत का योग है। औसत लागत प्रति इकाई उत्पादन लागत है; सीमांत लागत अतिरिक्त उत्पादन इकाई की अतिरिक्त कुल लागत है।')
      ], [
        formula('Total cost', 'कुल लागत', 'TC = TFC + TVC', 'TFC is total fixed cost and TVC is total variable cost.', 'TFC कुल स्थिर लागत और TVC कुल परिवर्तनशील लागत है।'),
        formula('Average and marginal cost', 'औसत और सीमांत लागत', 'AC = TC / Q;  MC = ΔTC / ΔQ', 'For Q > 0; for a discrete output change, use the corresponding change in total cost.', 'Q > 0 हो; असतत उत्पादन परिवर्तन पर कुल लागत का संबंधित परिवर्तन लें।'),
        formula('Product of labour', 'श्रम का उत्पाद', 'AP = TP / L;  MP = ΔTP / ΔL', 'L is the variable labour input; other inputs are held fixed. AP requires L > 0.', 'L परिवर्तनशील श्रम आगत है; अन्य आगत स्थिर हैं। AP के लिए L > 0।')
      ], [
        check('Fixed cost is ₹40 and variable cost is ₹60. What is total cost?', 'स्थिर लागत ₹40 और परिवर्तनशील लागत ₹60 है। कुल लागत क्या है?', '₹100.', '₹100।'),
        check('Output rises from 20 to 26 units when one worker is added. What is that worker’s marginal product?', 'एक श्रमिक जोड़ने पर उत्पादन 20 से 26 इकाई होता है। उस श्रमिक का सीमांत उत्पाद क्या है?', '6 units, with other inputs held fixed.', 'अन्य आगत स्थिर होने पर 6 इकाइयाँ।')
      ], ['production', 'fixed cost', 'variable cost', 'marginal cost', 'product'], ['उत्पादन', 'स्थिर लागत', 'परिवर्तनशील लागत', 'सीमांत लागत']),

    chapter('micro', 4, 'The Theory of the Firm under Perfect Competition', 'पूर्ण प्रतियोगिता में फर्म का सिद्धांत',
      'Price-taking firms, revenue, profit maximisation and supply.',
      'कीमत स्वीकार करने वाली फर्में, संप्राप्ति, लाभ अधिकतमकरण और पूर्ति।', [
        idea('Price taker', 'कीमत स्वीकारकर्ता', 'A perfectly competitive firm takes the market price as given. At that price its average and marginal revenue equal the price for each unit sold.', 'पूर्ण प्रतियोगिता में फर्म बाज़ार कीमत को दिया हुआ मानती है। इस कीमत पर प्रति इकाई औसत और सीमांत संप्राप्ति कीमत के बराबर होती है।'),
        idea('Profit maximisation', 'लाभ अधिकतमकरण', 'Profit is total revenue minus total cost. In the standard smooth-cost model an interior profit-maximising output has price equal to marginal cost on the rising part of marginal cost, subject to the relevant shutdown condition.', 'लाभ कुल संप्राप्ति में से कुल लागत घटाने पर मिलता है। सामान्य चिकनी लागत मॉडल में आंतरिक लाभ-अधिकतम उत्पादन पर कीमत बढ़ती सीमांत लागत के बराबर होती है और उपयुक्त बंद करने की शर्त भी लागू होती है।'),
        idea('Supply and shutdown', 'पूर्ति और उत्पादन बंद करना', 'In the standard short-run model, a firm may produce when price covers average variable cost; below minimum average variable cost it shuts down. At equality it can be indifferent.', 'सामान्य अल्पकालीन मॉडल में कीमत औसत परिवर्तनशील लागत पूरी करे तो फर्म उत्पादन कर सकती है; न्यूनतम औसत परिवर्तनशील लागत से नीचे उत्पादन बंद करती है। बराबरी पर वह उदासीन हो सकती है।')
      ], [
        formula('Revenue', 'संप्राप्ति', 'TR = p × Q;  AR = MR = p', 'For a price-taking firm; AR is defined when Q > 0.', 'कीमत स्वीकारकर्ता फर्म के लिए; AR, Q > 0 पर परिभाषित है।'),
        formula('Profit', 'लाभ', 'π = TR − TC', 'Subtract total cost, including fixed cost, from total revenue.', 'कुल संप्राप्ति में से स्थिर लागत सहित कुल लागत घटाएँ।')
      ], [
        check('A price-taking firm sells 10 units at ₹12 each; total cost is ₹100. Find its profit.', 'फर्म 10 इकाइयाँ ₹12 प्रति इकाई बेचती है और कुल लागत ₹100 है। लाभ ज्ञात करें।', 'Revenue = ₹120; profit = ₹120 − ₹100 = ₹20.', 'संप्राप्ति = ₹120; लाभ = ₹120 − ₹100 = ₹20।'),
        check('What are marginal and average revenue for a price-taking firm?', 'कीमत स्वीकारकर्ता फर्म के लिए सीमांत और औसत संप्राप्ति क्या होती हैं?', 'Both equal the market price, with average revenue defined at positive output.', 'दोनों बाज़ार कीमत के बराबर हैं; औसत संप्राप्ति धनात्मक उत्पादन पर परिभाषित है।')
      ], ['perfect competition', 'firm', 'profit', 'revenue', 'supply'], ['पूर्ण प्रतियोगिता', 'फर्म', 'लाभ', 'संप्राप्ति', 'पूर्ति']),

    chapter('micro', 5, 'Market Equilibrium', 'बाज़ार संतुलन',
      'Demand, supply, equilibrium, shifts and price controls.',
      'माँग, पूर्ति, संतुलन, वक्रों के बदलाव और कीमत नियंत्रण।', [
        idea('Equilibrium', 'संतुलन', 'At a competitive market equilibrium, quantity demanded equals quantity supplied. Excess demand is a shortage; excess supply is a surplus at the prevailing price.', 'प्रतियोगी बाज़ार संतुलन पर माँगी गई मात्रा और पूर्ति की गई मात्रा बराबर होती हैं। प्रचलित कीमत पर अतिरिक्त माँग कमी और अतिरिक्त पूर्ति अधिशेष है।'),
        idea('Changes in demand or supply', 'माँग या पूर्ति में बदलाव', 'A shift of demand or supply changes the equilibrium. Trace the shift against the other curve and state which assumptions are held constant; outcomes depend on curve shapes.', 'माँग या पूर्ति वक्र के खिसकने से संतुलन बदलता है। दूसरे वक्र के सापेक्ष बदलाव दिखाएँ और स्थिर मान्यताएँ बताएँ; परिणाम वक्रों के आकार पर निर्भर करते हैं।'),
        idea('Price ceiling and floor', 'अधिकतम और न्यूनतम कीमत', 'A binding price ceiling below the equilibrium price can create excess demand. A binding price floor above equilibrium can create excess supply, if other conditions remain unchanged.', 'संतुलन से नीचे प्रभावी अधिकतम कीमत अतिरिक्त माँग बना सकती है। संतुलन से ऊपर प्रभावी न्यूनतम कीमत अतिरिक्त पूर्ति बना सकती है, यदि अन्य स्थितियाँ अपरिवर्तित रहें।')
      ], [
        formula('Equilibrium condition', 'संतुलन की शर्त', 'Qᵈ = Qˢ', 'Quantity demanded equals quantity supplied at the equilibrium price.', 'संतुलन कीमत पर माँगी और पूर्ति की गई मात्राएँ बराबर हैं।')
      ], [
        check('At a price, demand is 80 units and supply is 60 units. Is there a shortage or surplus?', 'एक कीमत पर माँग 80 और पूर्ति 60 इकाई है। कमी है या अधिशेष?', 'A shortage of 20 units: demand exceeds supply.', '20 इकाई की कमी: माँग, पूर्ति से अधिक है।'),
        check('What can a binding price ceiling below equilibrium cause?', 'संतुलन से नीचे प्रभावी अधिकतम कीमत का क्या प्रभाव हो सकता है?', 'Excess demand or a shortage, other things being equal.', 'अन्य बातें समान रहने पर अतिरिक्त माँग या कमी हो सकती है।')
      ], ['demand', 'supply', 'equilibrium', 'price ceiling', 'price floor'], ['माँग', 'पूर्ति', 'संतुलन', 'अधिकतम कीमत', 'न्यूनतम कीमत'])
  ];
})(window.UP);
