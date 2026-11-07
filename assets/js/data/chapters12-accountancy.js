/*
 * Class XII Accountancy chapter map.
 * These are navigation/classification records, not textbook chapter notes.
 * PYQs are attached from pyq-accountancy-2023-2026-extracted.js.
 */
window.UP = window.UP || {};
(function (UP) {
function accountancyChapter(id, no, curriculumCode, en, hi, enDesc, hiDesc, keywords, hiKeywords) {
  return {
    id: id,
    n: no,
    displayNo: no,
    curriculumCode: curriculumCode,
    en: en,
    hi: hi,
    enDesc: enDesc,
    hiDesc: hiDesc,
    demand: "outline",
    concepts: [{
      t: { en: "PYQ coverage", hi: "विगत-वर्ष प्रश्नों का दायरा" },
      b: { en: enDesc, hi: hiDesc }
    }],
    formulas: [],
    pyqs: [],
    plan: [{
      en: "Review the matching NCERT chapter, then practise the CBSE PYQs tagged here. The question bank contains English source text; translations and answer keys are not included.",
      hi: "संबंधित NCERT अध्याय पढ़ें और यहाँ टैग किए गए CBSE विगत-वर्ष प्रश्नों का अभ्यास करें। प्रश्न-बैंक में मूल अंग्रेज़ी पाठ है; अनुवाद और उत्तर-कुंजी शामिल नहीं हैं।"
    }],
    keywords: { en: keywords, hi: hiKeywords }
  };
}

UP.course12accountancy = [
  accountancyChapter(101, 1, "leac101", "Partnership Fundamentals", "साझेदारी के मूलभूत सिद्धांत", "Partnership deed, profit appropriation, capitals, drawings and goodwill fundamentals.", "साझेदारी विलेख, लाभ-विनियोजन, पूँजी, आहरण और ख्याति के मूल सिद्धांत।", ["partnership", "appropriation", "capital", "drawings", "goodwill"], ["साझेदारी", "विनियोजन", "पूँजी", "आहरण", "ख्याति"]),
  accountancyChapter(102, 2, "leac102", "Reconstitution — Admission of a Partner", "पुनर्गठन — नए साझेदार का प्रवेश", "Admission, new and sacrificing ratios, goodwill, revaluation and capital adjustments.", "नए साझेदार का प्रवेश, नया व त्याग अनुपात, ख्याति, पुनर्मूल्यांकन और पूँजी समायोजन।", ["admission", "new partner", "sacrificing ratio", "revaluation"], ["प्रवेश", "नया साझेदार", "त्याग अनुपात", "पुनर्मूल्यांकन"]),
  accountancyChapter(103, 3, "leac103", "Reconstitution — Retirement or Death of a Partner", "पुनर्गठन — साझेदार की सेवानिवृत्ति या मृत्यु", "Retirement and death, gaining ratio, goodwill, revaluation and settlement with executors.", "सेवानिवृत्ति व मृत्यु, लाभ अनुपात, ख्याति, पुनर्मूल्यांकन और निष्पादकों से निपटान।", ["retirement", "death", "gaining ratio", "executor"], ["सेवानिवृत्ति", "मृत्यु", "लाभ अनुपात", "निष्पादक"]),
  accountancyChapter(104, 4, "leac104", "Dissolution of a Partnership Firm", "साझेदारी फर्म का विघटन", "Realisation of assets and liabilities and settlement of partners’ accounts on dissolution.", "विघटन पर परिसंपत्तियों व दायित्वों का वसूलीकरण और साझेदारों के खातों का निपटान।", ["dissolution", "realisation", "realisation account"], ["विघटन", "वसूलीकरण", "वसूलीकरण खाता"]),
  accountancyChapter(201, 5, "leac201", "Accounting for Share Capital", "अंश पूँजी का लेखांकन", "Issue, allotment, calls, forfeiture and reissue of shares; securities premium and company share capital.", "अंशों का निर्गम, आबंटन, माँग, जब्ती व पुनर्निर्गम; प्रतिभूति प्रीमियम और कंपनी की अंश पूँजी।", ["shares", "allotment", "forfeiture", "securities premium"], ["अंश", "आबंटन", "जब्ती", "प्रतिभूति प्रीमियम"]),
  accountancyChapter(202, 6, "leac202", "Issue and Redemption of Debentures", "ऋणपत्रों का निर्गम एवं शोधन", "Issue, interest, discount or premium, loss on issue and redemption of debentures.", "ऋणपत्रों का निर्गम, ब्याज, बट्टा या प्रीमियम, निर्गम पर हानि और शोधन।", ["debentures", "issue", "interest", "redemption"], ["ऋणपत्र", "निर्गम", "ब्याज", "शोधन"]),
  accountancyChapter(203, 7, "leac203", "Financial Statements of a Company", "कंपनी के वित्तीय विवरण", "Company financial statements, Schedule III presentation and classification of balance-sheet items.", "कंपनी के वित्तीय विवरण, अनुसूची III में प्रस्तुति और तुलन-पत्र मदों का वर्गीकरण।", ["company", "balance sheet", "Schedule III"], ["कंपनी", "तुलन-पत्र", "अनुसूची III"]),
  accountancyChapter(204, 8, "leac204", "Analysis of Financial Statements", "वित्तीय विवरणों का विश्लेषण", "Comparative and common-size statements and interpretation of financial information.", "तुलनात्मक व सामान्य-आकार विवरण और वित्तीय सूचना की व्याख्या।", ["comparative statement", "common-size", "analysis"], ["तुलनात्मक विवरण", "सामान्य-आकार", "विश्लेषण"]),
  accountancyChapter(205, 9, "leac205", "Accounting Ratios", "लेखांकन अनुपात", "Liquidity, solvency, activity and profitability ratios and their interpretation.", "तरलता, शोधन-क्षमता, गतिविधि और लाभप्रदता अनुपात तथा उनकी व्याख्या।", ["liquidity", "solvency", "turnover", "profitability"], ["तरलता", "शोधन-क्षमता", "टर्नओवर", "लाभप्रदता"]),
  accountancyChapter(206, 10, "leac206", "Cash Flow Statement", "नकदी प्रवाह विवरण", "Cash and cash equivalents and operating, investing and financing cash flows.", "नकद व नकद समतुल्य तथा परिचालन, निवेश और वित्तीय नकदी प्रवाह।", ["cash flow", "operating activities", "investing activities", "financing activities"], ["नकदी प्रवाह", "परिचालन गतिविधियाँ", "निवेश गतिविधियाँ", "वित्तीय गतिविधियाँ"])
];

/* Part B Option II is a separate Computerized Accounting track, not one of the ten leac chapters. */
UP.course12computerized = [
  accountancyChapter(301, 1, "optionII-cas-1", "Computerized Accounting Systems", "कम्प्यूटरीकृत लेखांकन प्रणालियाँ", "Accounting software, system components, data, vouchers, account groups, Tally and system controls.", "लेखांकन सॉफ़्टवेयर, प्रणाली के घटक, डेटा, वाउचर, खाता-समूह, टैली और प्रणाली नियंत्रण।", ["software", "Tally", "vouchers", "account groups", "security"], ["सॉफ़्टवेयर", "टैली", "वाउचर", "खाता-समूह", "सुरक्षा"]),
  accountancyChapter(302, 2, "optionII-cas-2", "Spreadsheets in Accounting", "लेखांकन में स्प्रेडशीट", "Spreadsheet formulas, cell references, functions, charts, formatting and error handling.", "स्प्रेडशीट सूत्र, सेल संदर्भ, फ़ंक्शन, चार्ट, स्वरूपण और त्रुटि-सुधार।", ["spreadsheet", "Excel", "cell reference", "formula", "chart"], ["स्प्रेडशीट", "एक्सेल", "सेल संदर्भ", "सूत्र", "चार्ट"])
];
})(window.UP);
