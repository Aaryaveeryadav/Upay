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
| Social (Cl 10) | 0 (2025 32/1–32/3 and selected 32/S text; 2026 32/4 text; 47 MCQs added across the passes) | CBSE question papers 2025 and 2026 | **CBSE marking scheme PDFs (32-series, 32/C, 32/S)** — title page says MARKING SCHEME / Strictly Confidential |
| Hindi (Cl 10) | 0 | — | **CBSE Hindi A/B marking schemes or solved papers** |

The [Social follow-up](social-follow-up-nov-2026.md) identifies later
question papers, not marking schemes. Reused paper codes can have different
years; some existing bank year fields still need an individual audit. No
Social keys were attached.

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

### November 2026: 2023 ZZYY1 Social Science upload

The 15 additional 2023 papers are question papers, not marking schemes.
This pass added 21 source-text MCQs and corrected 55 existing year fields;
**no printed answer keys were attached**. The 21 additions have empty answers
and are not eligible for verified-key instant grading. See
[the source inventory and partial-audit details](social-2023-upload-nov-2026.md).
