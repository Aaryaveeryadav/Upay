# Verified answers — coverage status

Updated November 2026. "Verified" means the key was printed by the board or
the textbook source, and the row passed strict admission (complete, distinct,
undamaged options). AI-checked answers are never counted here.

| Subject | Verified keys | Source | Still needed |
|---|---|---|---|
| Science (Cl 10) | 171/171 NCERT exercises | NCERT answers | — |
| Sanskrit (Cl 10) | 61 | CBSE 52-series solved material | more sets welcome |
| English (Cl 10) | 45 MCQs | CBSE 184 solved papers | marking schemes for the rest |
| Maths (Cl 10) | 115 harvested board-key MCQs + 18 admitted from the 430-series key table (42 rows; 24 rejected as damaged/incomplete) | CBSE printed keys | solved papers for other years to grow this |
| Social (Cl 10) | 0 (question *text* cross-verified for series 32/1–32/4 from official QPs; 43 MCQs added from them) | CBSE question papers 2025 | **CBSE marking scheme PDFs (32-series, 32/C, 32/S)** — title page says MARKING SCHEME / Strictly Confidential |
| Hindi (Cl 10) | 0 | — | **CBSE Hindi A/B marking schemes or solved papers** |

The [later Social upload inventory](social-upload-nov-2026.md) contains
question papers, not marking schemes; its 32/5 paper is from a different
year and does not verify the 2025 bank. No Social keys were attached.

## How Maths admission works

`UP.questionQuality.boardKeyAdmission` (assets/js/question-quality.js) trusts
a printed key only when: the key letter is valid, there are exactly four
distinct options, no option carries fraction-shred (`8 1`) or paper-code
debris, and the row passes the test-readiness gate. Admitted rows grade in
MCQ practice; rejected rows stay unscored practice with the key withheld.
Five bank records whose text signature-matches an admitted key
(`imp1108670/671/675/676/6711`) also carry `keyVerified` for the PYQ view.
The audit (`tools/check/question_text_audit.js`) locks all of this in.

## What would raise coverage fastest

Upload, in any order: Social marking schemes, Hindi A/B marking schemes,
more solved Maths/Science papers. Each upload converts directly into
verified keys; nothing is ever inferred or generated into a key.
