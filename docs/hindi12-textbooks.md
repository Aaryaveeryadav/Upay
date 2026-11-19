# Class XII Hindi: imported textbook material, not a syllabus or marking scheme

| Course | PDF stems | Chapter files |
|---|---|---:|
| Core | lhar101–115 (आरोह), lhvt101–103 (वितान) | 18 |
| Elective | lhat101–117 (अंतरा), lhan101–103 (अंतराल) | 20 |

`lhvt1lp` is वितान author material, not another chapter. Across the 39 files there are 354 pages. Source IDs and page links use PDF page order starting at 1, not printed folios. Reprints in the uploads differ; no exam-year coverage claim is made.

The reader displays the printed page first. `tools/extract/hindi12_pages.py` renders it; `tools/extract/hindi12_text.py` separately decodes the Walkman-Chanakya font layer for search. Both take a source directory. Text packs are fetched per course, and only the current page image loads. Search is approximate: it does not index illustrations or unsupported fonts. No missing letters are supplied from a language model. All machine transcriptions still need proofreading. `hindi12-review.json` identifies 7 pages without a supported text layer and 84 pages with known suspect sequences. This is a triage list, **not** a certification of the remaining pages.

All printed exercises can be read in the chapter reader. The smaller interactive bank in `assets/js/data/hindi12.js` has one selected textbook prompt per chapter; the rest are not standalone test items. IDs, class, board and course are independent of the legacy Class X Hindi bank. The separate [Hindi Core paper archive](hindi12-test-papers.md) now has original question papers and their printed marks. The textbook bank has no answer keys or verified model answers. Self-tests are ungraded. The AI prompt receives the question and its chapter context, not the entire textbook; its explanation is unverified.

Checks: `node tools/check/hindi12_sources.js`, `node tools/check/serverless_smoke.js`, and `tools/check/hindi12_browser.js` (Playwright Core with Chromium, optionally `UPAY_CHROMIUM` and `UPAY_BASE`). The browser test runs a guest flow at 1280px and 390px and intercepts the solve request. It does not use production accounts or a paid provider.
