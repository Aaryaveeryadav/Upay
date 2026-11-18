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
| Social (Cl 10) | 28 MCQ keys: 2023 32/6/1 Q1–20 and 32/5/1 Q1–8 | Printed marking-scheme copies, checked against the corresponding question paper and option order | Remaining sets and years need individual source review; see [online source inventory](online-marking-schemes-nov-2026.md) |
| Hindi (Cl 10) | 0 | 18 Hindi practice papers/schemes audited, no key attachable ([inventory](hindi-marking-scheme-nov-2026.md)) | **CBSE Hindi A/B marking schemes together with the matching question paper** |

The November 2026 Hindi uploads were practice papers (and their answer
schemes), not board sets, and every text-bearing file has a damaged text layer,
so **no key was attached and no question added**. The chosen approach in
`QUESTION-REPAIR-BATCH-1.md` §6 — AI-generated keys marked unverified — was not
started and is not used here. See
[the Hindi audit](hindi-marking-scheme-nov-2026.md) for per-file evidence,
including the 32 damaged practice rows now withheld. The sidecar retains 898
of 1,214 imported Hindi records; all 13 remaining word-start flags are in
reading passages, not standalone practice questions.

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
**no printed answer keys were attached**. At the time of that pass, the 21 additions had empty answers; the later online
source pass found printed matching schemes and admitted 28 keys, including
those 21 additions. See
[the source inventory and partial-audit details](social-2023-upload-nov-2026.md).
