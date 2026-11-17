# Social Science 2025 papers — verification report

Owner-supplied CBSE Class 10 Social Science question papers (code 32,
series GEF1H, created 25 Feb 2025 → **2025 board papers**), checked against
the site's Social bank (`UP.socialPyq`, 1,036 records before this pass).

## What the papers could and could not prove

- The PDFs are **question papers only**. They contain no answers, so they
  verify question *text*, never answer keys. All Social answers remain
  unverified (AI-checked in the app, labelled as such) until CBSE marking
  schemes are supplied.
- 9 papers (series 32/1, 32/2, 32/3 — all sets) have a clean English text
  layer. 146 Section-A MCQs were extracted from them
  (`tools/extract/social2025_extract.py`).
- 7 papers (series 32/4, 32/5, 32/6) in the first upload were **image-only
  scans** with no text layer. They were not OCR'd: OCR output is exactly the
  unverified text this project refuses to present as source material.
- Earlier report correction: the text-layer 32/4 papers (series LKM4N)
  belong to **2026**, not 2025. They are not the same papers as a 2025
  paper with the same Q.P. code. The earlier pass extracted 29 MCQs,
  reported 24 existing matches, and added 5 records. The 5 added rows'
  year fields have now been corrected to 2026; the older 24-match claim
  needs a year-by-year re-audit. The identity is corroborated by the
  [2026 LKM4N paper](https://edurev.in/p/542643/pyqp-class-10-social-science-2026-set-1-3241).
- Subsequent uploads are inventoried in [the earlier file inventory](docs/social-upload-nov-2026.md)
  and [the follow-up report](docs/social-follow-up-nov-2026.md). None of the
  uploaded files is a marking scheme.

## Findings

1. **38 MCQs from the official papers were missing from the bank** (after
   de-duplication against every existing record, since sets reorder the same
   questions). They were added with official-paper provenance
   (`src: "32/x/x SST Set N"`, `ans: ""` — no key claimed).
2. **48 "Match Column" bank records were shredded**: the column table had
   been chopped into 6–10 fake "options". A new `broken-options` readiness
   reason gates these — and every record like them — out of tests and
   practice pools. Bank-wide it currently gates **306 records** (including
   Science sample-paper rows whose 5th "option" is the next question glued
   on, or a duplicated Assertion–Reason option).
3. Records whose only flaw was a **debris tail option** (e.g. `"/S 9"`, a
   page-number fragment) were repaired by trimming the junk entry.
4. Most remaining bank↔PDF text differences were benign: bank question
   numbering follows its own order across reordered sets, and some bank
   stems drop the trailing instruction line ("Choose the correct option :")
   that the PDF prints. No wrong-question substitutions were found in the
   strictly comparable sample.

## Still open (needs owner input)

- **Verified Social keys**: upload the CBSE marking scheme PDFs for the
  32-series (and ideally 32/C, 32/S in the bank). Keys will be attached only
  where the marking scheme prints them.
- **Verified Hindi keys**: no Hindi source material exists yet. Upload CBSE
  Hindi A/B marking schemes or solved papers; without them Hindi answers
  stay AI-checked and unlabelled-as-board.
- The 2025 32/4–32/6 papers and relevant marking schemes are still
  needed. The 2026 LKM4N and NML5K papers use the same codes but are
  different papers. Existing same-code bank entries include mixed years;
  their remaining year fields need an individual audit.

## Historical audit after the original pass

Whole-bank audit (`tools/check/question_text_audit.js`): 6,066 questions
scanned, 714 not test-ready and excluded from test/practice pools
(306 broken-options, 118 missing-figure, 87 truncated-end, 62 broken-identity,
62 damaged-text, 54 debris, 10 missing-content, 7 fragment, 6 empty,
2 truncated-start).
