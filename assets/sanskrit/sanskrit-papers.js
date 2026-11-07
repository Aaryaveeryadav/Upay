/* ======================================================================
   CBSE Class 10 Sanskrit (Code 52) — board past-paper registry.
   Paper PDFs are stored in assets/sanskrit/papers/ (copied from source-pdfs).
   The text layer in these PDFs is a messy mix of Krutidev glyphs and bad
   Devanagari OCR (null chars, broken matras, mis-ordered conjuncts).  Bulk
   auto-extraction has been SKIPPED by design: as the user noted, a single
   wrong maatra/letter changes meaning in Sanskrit.  Instead each paper is
   listed by year/set/series so students can open and read the PDF directly;
   individual questions reach the bank only after manual AI-assisted cleanup
   (see tools/extract-sanskrit-pyq.py, which is run question-by-question with
   a verifier).
   ====================================================================== */
(function () {
  UP.sanskritPapers = [
    // Identified by Series code + Set printed on p1; file names may differ.
    { id:'san-paper-mnl2k-set4', file:'sanskrit.pdf',
      year: 2025, set:4, series:'MNL2K', marks:80, time:'3 hours',
      title:{ en:'CBSE 2025 (Series MNL2K, Set-4)', hi:'सीबीएसई 2025 (सीरीज MNL2K, सेट-4)' } },
    { id:'san-paper-zwyx-set4', file:'Sanskrit-3.pdf',
      year: 2025, set:4, series:'ZWYX/C', marks:80, time:'3 hours',
      title:{ en:'CBSE 2025 (Series ZWYX/C, Set-4)', hi:'सीबीएसई 2025 (सीरीज ZWYX/C, सेट-4)' } },
    { id:'san-paper-03', file:'Sanskrit-variant-A.pdf',
      year: null, set:null, marks:80, time:'3 hours',
      title:{ en:'CBSE Sanskrit Board Paper (variant A)', hi:'सीबीएसई संस्कृत बोर्ड प्रश्नपत्र (A)' } },
    { id:'san-paper-04', file:'Sanskrit-2.pdf',
      year: null, set:null, marks:80, time:'3 hours',
      title:{ en:'CBSE Sanskrit Board Paper (variant B)', hi:'सीबीएसई संस्कृत बोर्ड प्रश्नपत्र (B)' } },
    { id:'san-paper-52-a', file:'52_Sanskrit.pdf',
      year: null, set:null, marks:80, time:'3 hours', code:52,
      title:{ en:'CBSE Sanskrit Code-52 Board Paper (A)', hi:'सीबीएसई कोड-52 संस्कृत प्रश्नपत्र (A)' } },
    { id:'san-paper-52-b', file:'52-SANSKRIT-set-4.pdf',
      year: null, set:4, marks:80, time:'3 hours', code:52,
      title:{ en:'CBSE Sanskrit Code-52 Board Paper (Set-4)', hi:'सीबीएसई कोड-52 संस्कृत प्रश्नपत्र (सेट-4)' } },
    { id:'san-paper-52-c', file:'52_Sanskrit-2.pdf',
      year: null, set:null, marks:80, time:'3 hours', code:52,
      title:{ en:'CBSE Sanskrit Code-52 Board Paper (C)', hi:'सीबीएसई कोड-52 संस्कृत प्रश्नपत्र (C)' } },
    { id:'san-paper-52-d', file:'52_Sanskrit-3.pdf',
      year: null, set:null, marks:80, time:'3 hours', code:52,
      title:{ en:'CBSE Sanskrit Code-52 Board Paper (D)', hi:'सीबीएसई कोड-52 संस्कृत प्रश्नपत्र (D)' } },
    { id:'san-paper-52-e', file:'52_Sanskrit-4.pdf',
      year: null, set:null, marks:80, time:'3 hours', code:52,
      title:{ en:'CBSE Sanskrit Code-52 Board Paper (E)', hi:'सीबीएसई कोड-52 संस्कृत प्रश्नपत्र (E)' } },
  ];
})();
