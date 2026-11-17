# Social Science follow-up upload: paper identity and text audit

This report covers the 15 files added after the [first upload inventory](social-upload-nov-2026.md).
All are **question papers**, including the three named `SOCIAL SCIENCE 32_S_*`;
none is a marking scheme or establishes an answer key. Covers, series codes,
text, and the PDF creation metadata were inspected; metadata alone does not
prove an exam year.

| Uploads (sets 1–3) | Series / identity | Outcome |
|---|---|---|
| `32-6-*_Social Science.pdf` | SRQPE/C; 2022 compartment, 13 questions, 40 marks | Short-answer paper, not the anticipated 2025 MCQ paper. Bank entries with this code include matching older questions, currently labelled 2025. |
| `32_C_* Social Science.pdf` | ZZYY1/C; 2023 compartment | Bank has matching text and code but existing rows are labelled 2025; year fields need individual correction. The English text layer also has gaps. |
| `SOCIAL SCIENCE 32_S_*.pdf` | CDBA/S; metadata July 2024 | Question papers, not marking schemes; not the EFGH/S paper. |
| `32-S-*_Social Science.pdf` | EFGH/S; metadata July 2025 | Matches 2025 32/S bank text; selected rows repaired or checked below. |
| `1183-*_32-5-*_Social Sc..pdf` | NML5K; 2026 | Different from the 2025 32/5 paper. Existing 32/5 bank entries include NML5K questions labelled 2025, alongside other material. |

Independent year references: [2022 32/6/1 marking scheme](https://cdn.savemyexams.com/uploads/2026/01/25578-32%206%201%20Social%20Science%20July%202022%20CBSE%20Class%2010%20MS.pdf),
[2023 ZZYY1/C paper](https://mindjjo.com/Compartment-paper-class10-2023/Social%20science%20set%201_merged.pdf),
and [2026 NML5K paper](https://edurev.in/p/542649/pyqp-class-10-social-science-2026-set-1-3251).
The external 2022 scheme was used to corroborate paper identity, **not** to
attach keys: its questions are not the requested 2025 MCQs.

## This pass

- **4 added**: 3 from 2025 EFGH/S set 1 (Q4, Q5, Q12), plus one from
  2026 NML5K set 1 (Q1, page 5). The 2025 S sets 2 and 3 reorder those
  three questions; only one new record per distinct question was added.
- **33 existing 32/S bank rows compared** against their matching paper/set,
  complete English stem and four options. **27** were repaired from the
  source and **6** already matched. These counts are per bank row, not
  distinct questions. The checks and per-paper page numbers are recorded in
  `tools/check/fixtures/social-2025-s.json` and
  `tools/check/social_source_verification.js`.
- **0 verified keys attached**. Remaining figure, assertion–reason, and
  table questions were not included in these counts; automated extraction
  alone cannot safely establish complete context and option order.
- Corrected the year of the five earlier 32/4 additions from 2025 to 2026:
  `sscp-3241-1`, `sscp-3241-4x`, `sscp-3241-10x`, `sscp-3242-11x`,
  `sscp-3242-20x`. They came from LKM4N, independently identified as a
  [2026 paper](https://edurev.in/p/542643/pyqp-class-10-social-science-2026-set-1-3241).
  The prior report erroneously treated it as a 2025 paper.

**Still open:** The mixed-year 32/4, 32/5, 32/6 and 32/C bank needs a
record-by-record provenance/year audit; only the five previously added 32/4
rows above were corrected in this pass. Do not match by Q.P. code alone.
The remaining 2025 32/4–32/6 question papers and actual relevant CBSE marking
schemes are needed. Unrepaired text remains subject to the existing quality
filters, which do not guarantee that a year label is correct.

## SHA-256 fingerprints

```
b33f8813227f27d76c53d93d78a3e926c63c64b091765c4c30e9a80acfc8132b  32-6-1_Social Science.pdf
2e2ad2725723eacd88242a728ab9f02c4ff397aea1db3750a262758f0c390fc9  32-6-2_Social Science.pdf
d5e980f270029d08e5203286aa9f2c16a20ce44e0f20f371e6acc5ef12d148d3  32-6-3_Social Science.pdf
2d800db300989382e2f93da5cdf1242fd22bbf09c4aa4e9556bc79864901da59  32_C_1 Social Science.pdf
68188fef0eed243db4ae7e2ec346f5c2113660ab6d15150762e68e5ec42a33b5  32_C_2 Social Science.pdf
33d97c78bb35bda96439c3136d432ec482749168a1b7470b3936112fca4c27d1  32_C_3 Social Science.pdf
4679057f953781105c474544229ccc6852099e57359d00ff2584e8414d7e89cc  SOCIAL SCIENCE 32_S_1.pdf
9b6b3136e2b8da97f98837ba45b4297b2915d6c7b6e1fedc967a99d9ef43a518  SOCIAL SCIENCE 32_S_2.pdf
c349031cab78c4586dc76d36d8dc06242083aafe60ca15973620d9f7921e6af0  SOCIAL SCIENCE 32_S_3.pdf
1f4648ad090ab3360b735892b13d5c7d096cdb3ef5eba9b34c84893c2b65a00e  32-S-1_Social Science.pdf
67cb90fa00e20abc358e57cd74d259c459b0c5dbd79a0d5842335e102a07fd79  32-S-2_Social Science.pdf
443cc9181bdc1b6dfb7391940293eb3460134037336c46d598404c9c68576f51  32-S-3_Social Science.pdf
77636087e19a47069eda043364ac2768a5ffa6ad1040a64f607ae3b6668d4221  1183-1_32-5-1_Social Sc..pdf
fb97263b89fb2575bc0a96c5c15c01f9585d43bd303280b6bf9762f154d11b20  1183-2_32-5-2_Social Sc..pdf
15a278355ae27d23ee63cbfca825642defd4d188fed377e62601da911c6ac571  1183-3_32-5-3_Social Sc..pdf
```
