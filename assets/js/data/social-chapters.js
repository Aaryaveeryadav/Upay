/* Class 10 Social Science chapter content knowledge base.
   Provides concept bullets, key terms, and study plan for each of the 22 NCERT chapters
   across Geography (1-7), Economics (8-12), History (13-17), Civics (18-22). */
window.UP = window.UP || {};
UP.socialChapters = [
  /* ============ GEOGRAPHY — Contemporary India II (ch 1-7) ============ */
  { b:'geo', ch:1, en:'Resources and Development', hi:'संसाधन एवं विकास',
    concepts:[
      {en:'Classification of resources: biotic/abiotic, renewable/non-renewable, individual/community/national/international, potential/developed/stock/reserves.',
       hi:'संसाधनों का वर्गीकरण: जैव/अजैव, नवीकरणीय/अनवीकरणीय, व्यक्तिगत/सामुदायिक/राष्ट्रीय/अंतर्राष्ट्रीय, संभावित/विकसित/भंडार/संचय।'},
      {en:'Resource planning in India: identification, inventory, planning, and matching development plans to national goals.',
       hi:'भारत में संसाधन नियोजन: पहचान, सूची, योजना, और विकास योजनाओं को राष्ट्रीय लक्ष्यों से जोड़ना।'},
      {en:'Land resources: land utilisation, land degradation, conservation measures. 43% plain, 30% mountains, 27% plateau.',
       hi:'भूमि संसाधन: भूमि उपयोग, भूमि क्षरण, संरक्षण उपाय। 43% मैदान, 30% पर्वत, 27% पठार।'},
      {en:'Soil as a resource: alluvial, black, red & yellow, laterite, arid, forest/mountain soils. Soil erosion and conservation.',
       hi:'मृदा संसाधन: जलोढ़, काली, लाल व पीली, लैटेराइट, शुष्क, वन/पर्वतीय मृदाएँ। मृदा अपरदन व संरक्षण।'}
    ], terms:'resource,stock,reserve,alluvial,black-cotton,land-degradation,soil-erosion,gully,sheet-erosion' },
  { b:'geo', ch:2, en:'Forest and Wildlife Resources', hi:'वन और वन्य जीव संसाधन',
    concepts:[
      {en:'Biodiversity: ~1.6 million species classified; India is one of 12 mega-diversity countries with 8% of recorded species.',
       hi:'जैव विविधता: लगभग 16 लाख वर्गीकृत प्रजातियाँ; भारत 12 अति-विविधता देशों में, 8% दर्ज प्रजातियाँ।'},
      {en:'Flora & fauna in India: 47,000 plant species, 89,000 animal species. Negative/positive/normal species lists.',
       hi:'भारत में वनस्पति व जीव: 47,000 पौध प्रजातियाँ, 89,000 जंतु प्रजातियाँ। विलुप्त/संकटग्रस्त/सामान्य सूचियाँ।'},
      {en:'Conservation: Project Tiger (1973), Project Rhino, Project Elephant, biosphere reserves, national parks, wildlife sanctuaries.',
       hi:'संरक्षण: प्रोजेक्ट टाइगर (1973), प्रोजेक्ट राइनो, प्रोजेक्ट एलीफेंट, जैवमंडल आरक्षित क्षेत्र, राष्ट्रीय उद्यान, वन्यजीव अभयारण्य।'},
      {en:'Community & conservation: Chipko, Bhairodev Dakav Sonchuri, Joint Forest Management, Beej Bachao Andolan.',
       hi:'समुदाय व संरक्षण: चिपको, भैरोदेव डाकव सोंचुरी, संयुक्त वन प्रबंधन, बीज बचाओ आंदोलन।'}
    ], terms:'biodiversity,endemic,endangered,vulnerable,biome,biosphere,national-park,wildlife-sanctuary' },
  { b:'geo', ch:3, en:'Water Resources', hi:'जल संसाधन',
    concepts:[
      {en:'Fresh water: only 3% of global water; ~1% available as surface/ground water. Scarcity causes: over-exploitation, pollution, unequal access.',
       hi:'ताजा जल: वैश्विक जल का केवल 3%; लगभग 1% सतही/भूमिगत रूप में। कमी के कारण: अत्यधिक दोहन, प्रदूषण, असमान पहुँच।'},
      {en:'Multi-purpose river projects: dams for flood control, irrigation, electricity, navigation, fish-breeding. Social/environmental costs.',
       hi:'बहुउद्देशीय नदी परियोजनाएँ: बाढ़ नियंत्रण, सिंचाई, बिजली, नौपरिवहन, मत्स्यपालन के लिए बाँध। सामाजिक/पर्यावरणीय लागत।'},
      {en:'Hydraulic structures in ancient India: Sringaverapura, Bhopal lake, Iltutmish tank, dams/lakes/tanks built across centuries.',
       hi:'प्राचीन भारत में जल-संरचनाएँ: श्रृंगवेरपुर, भोपाल झील, इल्तुतमिश तालाब, सदियों से बने बाँध/झीलें/तालाब।'},
      {en:'Rainwater harvesting: traditional (kuls, johads, kunds, eris, bamboo drip irrigation) and modern rooftop RWH.',
       hi:'वर्षा जल संचयन: पारंपरिक (कुल, जोहड़, कुंड, एरी, बांस टपक सिंचाई) और आधुनिक छत-आधारित RWH।'}
    ], terms:'scarcity,dams,multi-purpose,rainwater-harvesting,kuls,johads,kunds,palar-pani' },
  { b:'geo', ch:4, en:'Agriculture', hi:'कृषि',
    concepts:[
      {en:'Types: primitive subsistence (jhum/shifting), intensive subsistence, commercial (plantation, wheat, rice, cotton).',
       hi:'प्रकार: आदिम निर्वाह (झूम/स्थानांतरी), गहन निर्वाह, व्यावसायिक (बागान, गेहूँ, चावल, कपास)।'},
      {en:'Cropping seasons: Rabi (Oct-Mar, wheat/gram), Kharif (Jun-Oct, rice/maize/cotton/jowar/bajra), Zaid (Mar-Jun, cucumber/muskmelon).',
       hi:'फसली मौसम: रबी (अक्टूबर–मार्च, गेहूँ/चना), खरीफ (जून–अक्टूबर, चावल/मक्का/कपास/ज्वार/बाजरा), जायद (मार्च–जून, ककड़ी/खरबूजा)।'},
      {en:'Major crops: rice (kharif, staple), wheat (rabi), millets (jowar/bajra/ragi), pulses (tur/urad/moong), tea, coffee, sugarcane, oilseeds, cotton, jute, rubber.',
       hi:'प्रमुख फसलें: चावल (खरीफ, मुख्य), गेहूँ (रबी), मोटे अनाज (ज्वार/बाजरा/रागी), दालें (अरहर/उड़द/मूँग), चाय, कॉफी, गन्ना, तिलहन, कपास, जूट, रबर।'},
      {en:'Institutional reforms: collectivisation, consolidation of holdings, abolition of zamindari, Green/White Revolution, PM-KISAN, crop insurance, KCC, PDS.',
       hi:'संस्थागत सुधार: सामूहिकीकरण, जोत चकबंदी, जमींदारी उन्मूलन, हरित/श्वेत क्रांति, PM-KISAN, फसल बीमा, KCC, PDS।'},
      {en:'Food security: PDS, buffer stock (FCI), MSP; impact of globalisation on agriculture.',
       hi:'खाद्य सुरक्षा: PDS, बफर स्टॉक (FCI), MSP; कृषि पर वैश्वीकरण का प्रभाव।'}
    ], terms:'jhum,rabi,kharif,zaid,plantation,slash-burn,MSP,Green-Revolution,KCC,food-security' },
  { b:'geo', ch:5, en:'Minerals and Energy Resources', hi:'खनिज और ऊर्जा संसाधन',
    concepts:[
      {en:'Mineral classification: metallic (ferrous/non-ferrous/precious), non-metallic, energy minerals. Rock-ore distribution belts.',
       hi:'खनिज वर्गीकरण: धात्विक (लौह/अलौह/कीमती), अधात्विक, ऊर्जा खनिज। शैल-अयस्क वितरण पेटियाँ।'},
      {en:'Iron ore: magnetite (70% Fe) & haematite (50-60%); belts — Odisha-Jharkhand, Durg-Bastar-Chandrapur, Bellary-Chitradurga, Maharashtra-Goa.',
       hi:'लौह अयस्क: मैग्नेटाइट (70% Fe) व हेमेटाइट (50-60%); पेटियाँ — ओडिशा-झारखंड, दुर्ग-बस्तर-चंद्रपुर, बेल्लारी-चित्रदुर्ग, महाराष्ट्र-गोवा।'},
      {en:'Coal: Gondwana (250 my) vs tertiary (~55 my); Jharia/Raniganj/Bokaro; petroleum: Mumbai High, Digboi, Ankaleshwar; natural gas (KG basin).',
       hi:'कोयला: गोंडवाना (250 मिलियन वर्ष) बनाम तृतीयक (~55 मिलियन वर्ष); झरिया/रानीगंज/बोकारो; पेट्रोलियम: मुंबई हाई, डिगबोई, अंकलेश्वर; प्राकृतिक गैस (KG बेसिन)।'},
      {en:'Non-conventional energy: solar, wind (Nagarcoil/Jaisalmer), biogas, tidal, geothermal. Conservation imperative.',
       hi:'गैर-परंपरागत ऊर्जा: सौर, पवन (नागरकोइल/जैसलमेर), बायोगैस, ज्वारीय, भू-तापीय। संरक्षण अनिवार्य।'}
    ], terms:'magnetite,haematite,bauxite,mica,limestone,anthracite,bituminous,lignite,thermal-power,hydro-power,biogas' },
  { b:'geo', ch:6, en:'Manufacturing Industries', hi:'विनिर्माण उद्योग',
    concepts:[
      {en:'Classification: agro-based (textiles, sugar, tea, coffee), mineral-based (iron-steel, cement, chemicals, electronics), consumer vs capital goods, small/large scale.',
       hi:'वर्गीकरण: कृषि-आधारित (वस्त्र, चीनी, चाय, कॉफी), खनिज-आधारित (लौह-इस्पात, सीमेंट, रसायन, इलेक्ट्रॉनिक्स), उपभोक्ता/पूंजीगत वस्तुएँ, लघु/वृहद उद्योग।'},
      {en:'Industrial location: proximity to raw material, labour, capital, power, market (least cost theory by Weber). Agglomeration economies.',
       hi:'औद्योगिक स्थान: कच्चे माल, श्रम, पूँजी, ऊर्जा, बाज़ार की निकटता (वेबर का न्यूनतम लागत सिद्धांत)। संकुलन मितव्ययिता।'},
      {en:'Cotton textiles: Mumbai-Ahmedabad legacy; sugar: UP/Maharashtra/Karnataka belt; steel: SAIL/TISCO, Bhilai/Rourkela/Durgapur/Bokaro; auto/two-wheeler clusters.',
       hi:'सूती वस्त्र: मुंबई-अहमदाबाद विरासत; चीनी: UP/महाराष्ट्र/कर्नाटक पेटी; इस्पात: SAIL/TISCO, भिलाई/राउरकेला/दुर्गापुर/बोकारो; ऑटो/दोपहिया क्लस्टर।'},
      {en:'Industrial pollution & environmental degradation: air/water/thermal/noise; NTPC approach (ISO 14001).',
       hi:'औद्योगिक प्रदूषण व पर्यावरण ह्रास: वायु/जल/तापीय/ध्वनि; NTPC दृष्टिकोण (ISO 14001)।'}
    ], terms:'agglomeration,SMSE,light-industry,heavy-industry,public-sector,private-sector,JTBF,NMIZ' },
  { b:'geo', ch:7, en:'Life Lines of National Economy', hi:'राष्ट्रीय अर्थव्यवस्था की जीवन रेखाएँ',
    concepts:[
      {en:'Transport modes: road (NH/SH/MDR), rail, pipeline, waterways (national NW1-NW6), airways; trade-offs of each.',
       hi:'परिवहन साधन: सड़क (राजमार्ग/राज्य/जिला), रेल, पाइपलाइन, जलमार्ग (NW1-NW6), वायुमार्ग; प्रत्येक की तुलना।'},
      {en:'Road density, border roads (BRO), golden quadrilateral, north-south/east-west corridors; expressways.',
       hi:'सड़क घनत्व, सीमा सड़कें (BRO), स्वर्णिम चतुर्भुज, उत्तर-दक्षिण/पूर्व-पश्चिम कॉरिडोर; एक्सप्रेसवे।'},
      {en:'Railway zones; pipeline network (HBJ, Salaya-Koyali, Kandla-Bhatinda); ports (major/medium/minor: Kandla, Mumbai, Marmagao, NMPT, Kochi, Chennai, Vishakhapatnam, Paradip, Kolkata, Haldia).',
       hi:'रेलवे ज़ोन; पाइपलाइन जाल (HBJ, सलाया-कोयली, कांडला-भटिंडा); बंदरगाह (प्रमुख/मध्यम/छोटे: कांडला, मुंबई, मार्मगाओ, NMPT, कोच्चि, चेन्नई, विशाखापत्तनम, पारादीप, कोलकाता, हल्दिया)।'},
      {en:'Communication: postal, telecom, Doordarshan/AIR, internet; international trade (balance of trade, tourism).',
       hi:'संचार: डाक, दूरसंचार, दूरदर्शन/आकाशवाणी, इंटरनेट; अंतर्राष्ट्रीय व्यापार (व्यापार संतुलन, पर्यटन)।'}
    ], terms:'GQ,NS-EW,BRO,pipeline,ports,balance-of-trade,tourism' },

  /* ============ ECONOMICS — Understanding Economic Development (ch 8-12) ============ */
  { b:'eco', ch:8, en:'Development', hi:'विकास',
    concepts:[
      {en:'Per-capita income (World Bank criterion: HIC/MIC/LIC); average income masks inequalities.',
       hi:'प्रति व्यक्ति आय (विश्व बैंक मानदंड: HIC/MIC/LIC); औसत आय असमानताओं को छुपाती है।'},
      {en:'Beyond income: infant mortality, literacy, net attendance ratio, BMI; HDI (UNDP) with life expectancy/education/PCI.',
       hi:'आय से परे: शिशु मृत्यु दर, साक्षरता, शुद्ध उपस्थिति अनुपात, BMI; HDI (UNDP) में जीवन प्रत्याशा/शिक्षा/PCI।'},
      {en:'Sustainability: renewable vs non-renewable; over-use of groundwater, crude oil — development must be sustainable.',
       hi:'स्थिरता: नवीकरणीय बनाम अनवीकरणीय; भूजल व कच्चे तेल का अतिदोहन — विकास सतत् होना चाहिए।'}
    ], terms:'PCI,HDI,HIC,MIC,LIC,IMR,literacy,NAR,sustainable-development' },
  { b:'eco', ch:9, en:'Sectors of the Indian Economy', hi:'भारतीय अर्थव्यवस्था के क्षेत्रक',
    concepts:[
      {en:'Primary (agriculture/forestry/fishing/mining), secondary (industry/manufacturing), tertiary (services).',
       hi:'प्राथमिक (कृषि/वानिकी/मत्स्य/खनन), द्वितीयक (उद्योग/विनिर्माण), तृतीयक (सेवाएँ)।'},
      {en:'Value of final goods only; intermediate goods excluded. GDP = sum of primary+secondary+tertiary (in India: services share >50%).',
       hi:'केवल अंतिम वस्तुओं का मूल्य; मध्यवर्ती वस्तुएँ बाहर। GDP = प्राथमिक+द्वितीयक+तृतीयक का योग (भारत में: सेवाओं की हिस्सेदारी >50%)।'},
      {en:'Employment trends: disguised unemployment in agriculture; MGNREGA 2005 (100 days guaranteed wage employment).',
       hi:'रोजगार प्रवृत्तियाँ: कृषि में प्रच्छन्न बेरोजगारी; मनरेगा 2005 (100 दिन गारंटित मजदूरी रोजगार)।'},
      {en:'Organised vs unorganised sector; public/private sectors and their social objectives.',
       hi:'संगठित बनाम असंगठित क्षेत्र; सार्वजनिक/निजी क्षेत्र और उनके सामाजिक उद्देश्य।'}
    ], terms:'primary,secondary,tertiary,GDP,final-goods,disguised-unemployment,MGNREGA,organised,unorganised' },
  { b:'eco', ch:10, en:'Money and Credit', hi:'मुद्रा और साख',
    concepts:[
      {en:'Money as medium of exchange; double coincidence of wants solved by money. Modern currency: paper notes/coins authorised by RBI.',
       hi:'विनिमय के माध्यम के रूप में मुद्रा; आवश्यकताओं के दोहरे संयोग को मुद्रा ने हल किया। आधुनिक मुद्रा: RBI द्वारा अधिकृत कागज़ी नोट/सिक्के।'},
      {en:'Banks: deposits, demand deposits (cheques), loans; 15% CRR kept with RBI, balance lent; credit creation multiplier.',
       hi:'बैंक: जमाएँ, माँग जमा (चेक), ऋण; 15% CRR RBI के पास रखा जाता है, शेष उधार; साख निर्माण गुणक।'},
      {en:'Credit: formal (banks, cooperatives, RBI-supervised) vs informal (moneylenders/traders/friends/relatives); debt traps.',
       hi:'साख: औपचारिक (बैंक, सहकारिता, RBI-पर्यवेक्षित) बनाम अनौपचारिक (साहूकार/व्यापारी/मित्र/संबंधी); ऋणजाल।'},
      {en:'SHGs (Self-Help Groups) as micro-credit mechanism, especially for rural women (e.g., Grameen model).',
       hi:'स्वयं सहायता समूह (SHG) माइक्रो-क्रेडिट तंत्र के रूप में, खासकर ग्रामीण महिलाओं हेतु (जैसे, ग्रामीण मॉडल)।'}
    ], terms:'double-coincidence,dmand-deposit,cheque,collateral,CRR,RBI,formal-credit,informal-credit,SHG,debt-trap' },
  { b:'eco', ch:11, en:'Globalisation and the Indian Economy', hi:'वैश्वीकरण और भारतीय अर्थव्यवस्था',
    concepts:[
      {en:'MNCs locate production globally to minimize cost (close to markets, cheap labour, raw materials); outsourcing & offshoring.',
       hi:'बहुराष्ट्रीय कंपनियाँ लागत न्यून करने हेतु विश्व भर में उत्पादन करती हैं (बाज़ार, सस्ता श्रम, कच्चा माल); आउटसोर्सिंग/ऑफशोरिंग।'},
      {en:'Foreign trade integrates markets; foreign investment (FDI/FPI). Liberalisation, privatisation, globalisation (LPG 1991).',
       hi:'विदेशी व्यापार बाजारों को जोड़ता है; विदेशी निवेश (FDI/FPI)। उदारीकरण, निजीकरण, वैश्वीकरण (LPG 1991)।'},
      {en:'Trade barriers: tax on imports; WTO (164 members) aims to liberalise trade. Fair vs free trade debate.',
       hi:'व्यापार अवरोध: आयात पर कर; WTO (164 सदस्य) व्यापार उदारीकरण के लिए। निष्पक्ष बनाम मुक्त व्यापार वाद-विवाद।'},
      {en:'Impact on India: IT/BPO growth, competition, rise of consumer choice; uneven benefits to small producers/workers.',
       hi:'भारत पर प्रभाव: IT/BPO वृद्धि, प्रतिस्पर्धा, उपभोक्ता विकल्प वृद्धि; छोटे उत्पादकों/श्रमिकों को असमान लाभ।'}
    ], terms:'MNC,FDI,FPI,WTO,LPG,liberalisation,SEZ,outsourcing,trade-barrier' },
  { b:'eco', ch:12, en:'Consumer Rights', hi:'उपभोक्ता अधिकार',
    concepts:[
      {en:'Consumer movement in India: COPRA 1986. Rights: safety, information, choice, redressal, representation, education, healthy environment.',
       hi:'भारत में उपभोक्ता आंदोलन: COPRA 1986। अधिकार: सुरक्षा, सूचना, चयन, निवारण, प्रतिनिधित्व, शिक्षा, स्वस्थ पर्यावरण।'},
      {en:'Three-tier quasi-judicial system: district (up to ₹20L), state (₹20L–₹1cr), national (>₹1cr). Agmark, ISI, Hallmark quality marks.',
       hi:'त्रि-स्तरीय अर्ध-न्यायिक तंत्र: जिला (₹20 लाख तक), राज्य (₹20 लाख–₹1 करोड़), राष्ट्रीय (₹1 करोड़ से ऊपर)। एगमार्क, ISI, हॉलमार्क गुणवत्ता चिह्न।'},
      {en:'ISI, Agmark, BIS standards; consumer courts (DCDRC/SCDRC/NCDRC).',
       hi:'ISI, एगमार्क, BIS मानक; उपभोक्ता अदालतें (DCDRC/SCDRC/NCDRC)।'}
    ], terms:'COPRA,consumer-court,ISI,Agmark,Hallmark,RBI-ombudsman,right-to-information' },

  /* ============ HISTORY — India & the Contemporary World II (ch 13-17) ============ */
  { b:'hist', ch:13, en:'The Rise of Nationalism in Europe', hi:'यूरोप में राष्ट्रवाद का उदय',
    concepts:[
      {en:'French Revolution 1789: idea of la patrie, le citoyen; Napoleonic Code 1804 — civil code of equality.',
       hi:'फ्रांसीसी क्रांति 1789: ला पात्री, ल सितोयेन का विचार; नेपोलियन संहिता 1804 — समानता की नागरिक संहिता।'},
      {en:'Unification of Italy: Mazzini (Young Italy), Cavour (diplomacy), Garibaldi (Red Shirts) — Victor Emmanuel II 1861.',
       hi:'इटली का एकीकरण: माजिनी (यंग इटली), कावूर (कूटनीति), गैरीबाल्डी (लाल कमीज़ें) — विक्टर एमैनुएल II 1861।'},
      {en:'Unification of Germany: Bismarck with "blood and iron" policy; three wars (Denmark, Austria 1866, France 1870) → Kaiser William I 1871.',
       hi:'जर्मनी का एकीकरण: बिस्मार्क की "खून और लोहा" नीति; तीन युद्ध (डेनमार्क, ऑस्ट्रिया 1866, फ्रांस 1870) → कैसर विलियम I 1871।'},
      {en:'Britain: formation of United Kingdom (Act of Union 1707), suppression of Scottish/Catholic identities; Ireland divided 1921.',
       hi:'ब्रिटेन: यूनाइटेड किंगडम का बनना (विलय अधिनियम 1707), स्कॉटिश/कैथोलिक पहचान का दमन; आयरलैंड 1921 में विभाजित।'},
      {en:'Visualising the nation: Marianne (France), Germania (Germany); allegory in art & nationalism.',
       hi:'राष्ट्र का चित्रण: मारिआन (फ्रांस), जर्मेनिया (जर्मनी); कला और राष्ट्रवाद में रूपक।'}
    ], terms:'napoleonic-code,Bismarck,Garibaldi,Cavour,Mazzini,unification,allegory,absolutism,conservatism' },
  { b:'hist', ch:14, en:'Nationalism in India', hi:'भारत में राष्ट्रवाद',
    concepts:[
      {en:'Rowlatt Act 1919, Jallianwala Bagh (Amritsar 13 April 1919), Khilafat movement, Non-Cooperation 1920-22, Chauri-Chaura (call off).',
       hi:'रॉलेट एक्ट 1919, जलियाँवाला बाग (अमृतसर 13 अप्रैल 1919), खिलाफत आंदोलन, असहयोग 1920-22, चौरी-चौरा (स्थगित)।'},
      {en:'Civil Disobedience: Salt/Dandi March 1930; Gandhi-Irwin Pact; Round Table Conferences; Poona Pact 1932 (Ambedkar).',
       hi:'सविनय अवज्ञा: नमक/दांडी मार्च 1930; गाँधी-इरविन समझौता; गोलमेज़ सम्मेलन; पूना पैक्ट 1932 (अंबेडकर)।'},
      {en:'Quit India 1942; Cripps Mission failure; parallel developments — Azad Hind Fauj (Bose), INA trials.',
       hi:'भारत छोड़ो 1942; क्रिप्स मिशन की विफलता; समानांतर घटनाएँ — आज़ाद हिंद फौज (बोस), INA मुकदमे।'},
      {en:'Sense of collective belonging: folklore, icons, history reinterpreted (Bharat Mata by Abanindranath Tagore, Vande Mataram).',
       hi:'सामूहिक पहचान: लोकगीत, प्रतीक, इतिहास का पुनर्पाठ (अबनिंद्रनाथ टैगोर की भारत माता, वंदे मातरम्)।'}
    ], terms:'Rowlatt,Jallianwala,Khilafat,Non-Cooperation,Civil-Disobedience,Dandi,Salt-Satyagraha,Quit-India,Congress,Muslim-League' },
  { b:'hist', ch:15, en:'The Making of a Global World', hi:'वैश्विक विश्व का निर्माण',
    concepts:[
      {en:'Silk routes, food travels (potatoes, chillies, soya from New World); disease (smallpox in Americas), conquest of Americas.',
       hi:'रेशम मार्ग, खाद्य आवागमन (नई दुनिया से आलू, मिर्च, सोया); रोग (अमेरिका में चेचक), अमेरिका पर विजय।'},
      {en:'Nineteenth century: global migration, indentured labour from India/China to Caribbean/Africa/SE Asia; Canal colonies in Punjab.',
       hi:'उन्नीसवीं सदी: वैश्विक प्रवास, भारत/चीन से गिरमिटिया मजदूर कैरिबियन/अफ्रीका/दक्षिण-पूर्व एशिया; पंजाब में नहरी कॉलोनियाँ।'},
      {en:'World War I (1914-18) and World War II (1939-45) causes and effects; inter-war economy, Great Depression (1929).',
       hi:'प्रथम विश्वयुद्ध (1914-18) और द्वितीय विश्वयुद्ध (1939-45) के कारण और प्रभाव; युद्धकालीन अर्थव्यवस्था, महामंदी (1929)।'},
      {en:'Bretton Woods institutions 1944 (IMF, World Bank); post-war settlement, NIEO demands, G-77 (developing nations).',
       hi:'ब्रेटन वुड्स संस्थान 1944 (IMF, विश्व बैंक); युद्धोत्तर समझौता, NIEO माँगें, G-77 (विकासशील राष्ट्र)।'}
    ], terms:'silk-route,indentured,colonialism,WWI,WWII,Great-Depression,Bretton-Woods,IMF,World-Bank,G-77,NIEO' },
  { b:'hist', ch:16, en:'The Age of Industrialisation', hi:'औद्योगीकरण का युग',
    concepts:[
      {en:'Proto-industrialisation; Spinning Jenny; steam engine (James Watt); earliest factories in cotton (1730s).',
       hi:'प्रोटो-औद्योगीकरण; स्पिनिंग जेनी; भाप इंजन (जेम्स वॉट); कपास के प्रारंभिक कारखाने (1730)।'},
      {en:'Hand labour vs machines; American Civil War impact on cotton supply; seasonal demand.',
       hi:'हाथ का श्रम बनाम मशीनें; अमेरिकी गृहयुद्ध का कपास आपूर्ति पर प्रभाव; मौसमी माँग।'},
      {en:'Indian textiles pre-British (muslin, calico); East India Company: gomasthas, weaver misery; Manchester competition; decline of surat port.',
       hi:'ब्रिटिश-पूर्व भारतीय वस्त्र (मलमल, कैलिको); ईस्ट इंडिया कंपनी: गोमास्था, बुनकर की दुर्दशा; मैनचेस्टर प्रतिस्पर्धा; सूरत बंदरगाह का पतन।'},
      {en:'Indian mills: first in Bombay (1854, Cowasjee Nanabhoy); TISCO at Jamshedpur (1907); Swadeshi industrial growth; WWII era boom.',
       hi:'भारतीय मिलें: बॉम्बे में प्रथम (1854, कावसजी नानाभाई); जमशेदपुर में TISCO (1907); स्वदेशी औद्योगिक विकास; WWII बूम।'}
    ], terms:'proto-industrialisation,spinning-jenny,steam-engine,spinning-mule,fly-shuttle,gomasthas,EIC,TISCO,swadeshi' },
  { b:'hist', ch:17, en:'Print Culture and the Modern World', hi:'मुद्रण संस्कृति और आधुनिक विश्व',
    concepts:[
      {en:'Earliest print: China/Japan woodblock; Gutenberg Bible 1455; impact of print on Reformation (Luther) and Renaissance.',
       hi:'प्रारंभिक मुद्रण: चीन/जापान काठ ब्लॉक; गुटनबर्ग बाइबल 1455; धर्मसुधार (लूथर) और पुनर्जागरण पर प्रभाव।'},
      {en:'Print in India: Goa Portuguese press (1556), Bengal Gazette (1780 James Hickey); newspapers, novels, caste reform.',
       hi:'भारत में मुद्रण: गोवा पुर्तगाली प्रेस (1556), बंगाल गजट (1780 जेम्स हिक्की); समाचार पत्र, उपन्यास, जाति सुधार।'},
      {en:'Vernacular Press Act 1878 (Lytton); press & nationalism in 20th century — Amrita Bazar Patrika, Kesari (Tilak).',
       hi:'वर्नाक्यूलर प्रेस एक्ट 1878 (लिटन); 20वीं सदी में प्रेस और राष्ट्रवाद — अमृत बाजार पत्रिका, केसरी (तिलक)।'},
      {en:'Manuscript culture before print, oral culture; role of libraries, libraries for women (e.g., Rashsundari Debi).',
       hi:'मुद्रण से पहले पांडुलिपि संस्कृति, मौखिक संस्कृति; पुस्तकालयों की भूमिका, महिलाओं के लिए पुस्तकालय (जैसे, राससुंदरी देबी)。'}
    ], terms:'Gutenberg,woodblock,Vernacular-Press-Act,calligraphy,lithography,manuscripts,censorship' },

  /* ============ CIVICS — Democratic Politics II (ch 18-22) ============ */
  { b:'civ', ch:18, en:'Power Sharing', hi:'शक्ति की साझेदारी',
    concepts:[
      {en:'Belgium & Sri Lanka case studies: majoritarianism vs accommodation; 4 forms of power sharing (horizontal/vertical/social/pressure groups).',
       hi:'बेल्जियम और श्रीलंका के उदाहरण: बहुमतवाद बनाम सामंजस्य; शक्ति-साझा के 4 प्रकार (क्षैतिज/ऊर्ध्वाधर/सामाजिक/दबाव समूह)।'},
      {en:'Why power sharing: prudential (reduces conflict) and moral (deepens democracy) reasons.',
       hi:'शक्ति साझा क्यों: विवेकपूर्ण (संघर्ष घटाता है) और नैतिक (लोकतंत्र गहराता है) कारण।'},
      {en:'Community government in Belgium; Sinhala-only policy 1956, civil war in Sri Lanka (LTTE).',
       hi:'बेल्जियम में समुदाय सरकार; सिंहल-मात्र नीति 1956, श्रीलंका में गृहयुद्ध (LTTE)।'}
    ],terms:'majoritarianism,accommodation,community-government,horizontal-powers,vertical-powers,civil-war,Belgium,Sri-Lanka' },
  { b:'civ', ch:19, en:'Federalism', hi:'संघवाद',
    concepts:[
      {en:'Federation vs unitary govt; India as federal country with strong centre (quasi-federal).',
       hi:'संघ बनाम एकात्मक सरकार; भारत मजबूत केंद्र वाला संघ (अर्ध-संघीय)।'},
      {en:'Lists: Union (97), State (66), Concurrent (47); residuary powers with centre. 73rd/74th Amendments — panchayats/municipalities.',
       hi:'सूचियाँ: संघ (97), राज्य (66), समवर्ती (47); अवशिष्ट शक्तियाँ केंद्र के पास। 73वां/74वां संशोधन — पंचायतें/नगरपालिकाएँ।'},
      {en:'How federalism practised: linguistic states (Andhra 1953), language policy, centre-state relations, coalition era 1990+.',
       hi:'संघवाद कैसे चला: भाषाई राज्य (आंध्र 1953), भाषा नीति, केंद्र-राज्य संबंध, गठबंधन युग 1990 के बाद।'},
      {en:'Decentralisation: 3-tier panchayati raj; gram sabha, zila parishad; states like Belgium and federal features.',
       hi:'विकेंद्रीकरण: 3-स्तरीय पंचायती राज; ग्राम सभा, जिला परिषद; बेल्जियम जैसे राज्य और संघीय विशेषताएँ।'}
    ],terms:'union-list,state-list,concurrent-list,residuary,73rd-amendment,74th-amendment,panchayati-raj,gram-sabha,coalition' },
  { b:'civ', ch:20, en:'Gender, Religion and Caste', hi:'लिंग, धर्म और जाति',
    concepts:[
      {en:'Gender division: patriarchy, unequal roles; women\'s political representation (33% reservation in panchayats, Women\'s Reservation Bill 2023).',
       hi:'लैंगिक विभाजन: पितृसत्ता, असमान भूमिका; महिला राजनीतिक प्रतिनिधित्व (पंचायतों में 33% आरक्षण, महिला आरक्षण विधेयक 2023)।'},
      {en:'Religion & politics: communalism; secularism in Indian Constitution (no official religion, freedoms, minority rights).',
       hi:'धर्म व राजनीति: सांप्रदायिकता; भारतीय संविधान में धर्मनिरपेक्षता (कोई राजधर्म नहीं, स्वतंत्रताएँ, अल्पसंख्यक अधिकार)।'},
      {en:'Caste & politics: caste in elections, caste inequalities (untouchability abolished); caste reforms (Jyotiba Phule, Ambedkar, Periyar, Gandhiji).',
       hi:'जाति और राजनीति: चुनावों में जाति, जातिगत असमानता (अस्पृश्यता उन्मूलन); जाति सुधार (ज्योतिबा फुले, अंबेडकर, पेरियार, गाँधी जी)。'},
      {en:'Family laws; gendered division of labour.',
       hi:'पारिवारिक क़ानून; श्रम का लैंगिक विभाजन।'}
    ],terms:'patriarchy,communalism,secularism,reservation,gender,caste,family-laws,women-reservation' },
  { b:'civ', ch:21, en:'Political Parties', hi:'राजनीतिक दल',
    concepts:[
      {en:'Functions of parties: contest elections, put forward policies, form government, opposition role; one-party/two-party/multi-party systems.',
       hi:'दलों के कार्य: चुनाव लड़ना, नीतियाँ रखना, सरकार बनाना, विपक्ष की भूमिका; एक-दल/द्वि-दल/बहु-दल प्रणाली।'},
      {en:'National parties (NDA/INDIA blocs); recognized national parties (BJP, Congress, CPI, CPM, NCP, BSP, TMC, AAP); state parties (regional).',
       hi:'राष्ट्रीय दल (NDA/INDIA गुट); मान्यता प्राप्त राष्ट्रीय दल (भाजपा, कांग्रेस, CPI, CPM, NCP, BSP, TMC, AAP); क्षेत्रीय दल।'},
      {en:'Challenges: lack of democracy inside parties, money & muscle power, dynastic succession. Reforms: anti-defection, affidavit, RTI, funding reform.',
       hi:'चुनौतियाँ: दलों के भीतर लोकतंत्र का अभाव, धन-बल, वंशवाद। सुधार: दलबदल-विरोध, शपथ-पत्र, RTI, वित्तपोषण सुधार।'}
    ],terms:'multi-party,national-party,state-party,anti-defection,affidavit,NDA,INDIA,opposition,ruling-party' },
  { b:'civ', ch:22, en:'Outcomes of Democracy', hi:'लोकतंत्र के परिणाम',
    concepts:[
      {en:'Democracy: accountable, responsive, legitimate government. Not just rule of majority — protection of minority rights.',
       hi:'लोकतंत्र: जवाबदेह, संवेदी, वैध सरकार। केवल बहुमत का शासन नहीं — अल्पसंख्यक अधिकारों की सुरक्षा।'},
      {en:'Accommodates diversity; reduces conflict (not eliminates); dignity of individual; produces accountable govt but is slower.',
       hi:'विविधता को समाहित करता; संघर्ष घटाता है (समाप्त नहीं); व्यक्ति की गरिमा; जवाबदेह सरकार देता है पर धीमा होता है।'},
      {en:'Democracy not necessarily richer or faster in economic growth; reduces inequality, poverty, caste/gender injustice over time.',
       hi:'लोकतंत्र आवश्यक नहीं कि धनी या आर्थिक विकास में तेज़; समय के साथ असमानता, गरीबी, जाति/लैंगिक अन्याय घटाता है।'}
    ],terms:'accountability,transparency,legitimacy,accommodation,transparency,dignity,economic-growth'
  }
];
