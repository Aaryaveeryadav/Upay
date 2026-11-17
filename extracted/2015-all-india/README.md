# 2015 All India papers — English extraction and reasoning

## Scope and result

English text from **five question papers and four distinct English solution files** is available here as readable Markdown and page-addressable JSON. Hindi-A, Hindi-B and Sanskrit were excluded. Hindi text inside bilingual papers was excluded using its source font/script, not by removing non-ASCII characters (which would destroy mathematics).

Start with the subject links below. `manifest.json` inventories all 18 uploads with SHA-256 fingerprints and exclusion/duplicate reasons. These are extraction deliverables, **not new verified entries in the app's live question bank**. No production database or deployment changed.

| Subject | Questions | Supplied answers / reasoning |
|---|---|---|
| Maths | [Paper](maths-question-paper-2015-all-india.md) | [Marking scheme, including worked steps for 30/1, 30/2, 30/3](maths-solution-2015-all-india.md) |
| Science | [Paper 31/1](science-question-paper-2015-all-india.md) | [English scheme 31/1](science-solution-2015-all-india-2.md) |
| Social Science | [Paper 32/1](social-science-question-paper-2015-all-india.md) | **No solution supplied:** the file labelled “Solution” is byte-identical to the question paper. |
| English Communicative | [Paper 1/1](communicative-question-paper-2015-all-india.md) | [Scheme for 1/1, 1/2, 1/3](communicative-solution-2015-all-india.md) |
| English Language & Literature | [Scanned paper 2/1/1, OCR](language-literature-paper-2015-all-india.md) | [Scheme for 2/1, 2/2, 2/3](language-literature-solution-2015-all-india.md) |

## Source issues and limits

- The two Science solutions without `(2)` are identical Hindi scans. Neither is included in the English output. The distinct `(2)` file is an English marking scheme.
- The Language & Literature cover was visually checked: **Set 1, code 2/1/1**, not the OCR's `2/4/4`. Its body footers also read 2/1/1. Raw OCR is preserved so its limitations remain visible; do not use its cover code without this correction.
- OCR is unverified except for that cover identity. All 11 scanned English-paper pages were OCR processed. Reading passages remain with their questions, rather than being turned into standalone questions.
- Text-layer extraction also needs review: mathematical radicals, superscripts, Symbol-font characters, fraction layout, tables and reading order can be wrong. For example, Maths Q2's `20√3` shadow is flattened to `20` then `3` in the extracted text. Figures, maps and handwritten/graphical content are **not transcribed**. Do not treat these files as complete visual reproductions.
- Multi-set schemes are retained whole. No automatic question-to-answer pairing is asserted merely from question number. General evaluator instructions also contain numbered paragraphs.
- A blank or missing solution has not been replaced with an invented board answer.

## The logic behind the papers

The full source reasoning/value points, where supplied, are retained in the linked schemes. The guide below is **an explanatory synthesis**, not a quotation from or substitute for the board scheme, and not a per-question verification of the entire batch.

### Mathematics

Identify the mathematical model, write the relevant equation/theorem, substitute the given values, then show the result and units. The source scheme awards step marks and accepts alternative methods. Use the correct set's section of the scheme.

Examples from paper 30/1:

- **Q2 (PDF p3):** a 20 m tower has a 20√3 m shadow. A right triangle gives tan θ = opposite/adjacent = 20/(20√3) = 1/√3, hence **θ = 30°**. The radical must be checked against the original because extraction loses it. Scheme: PDF p2, Q2.
- **Q3 (PDF p3):** two different fair dice give 36 equally likely ordered outcomes. Product 6 occurs for (1,6), (6,1), (2,3), (3,2), so **P = 4/36 = 1/9**. Counting unordered pairs instead would give the wrong sample space. Scheme: PDF p2, Q3.
- For geometry, preserve the diagram's labels and justify each relation with the applicable tangent, circle or triangle theorem. A text-only extraction cannot establish a diagram's configuration.

### Science

Connect the requested observation to the relevant scientific principle. Definitions require the defining property; explanations require a cause-and-effect link; numerical answers require a formula, substitution and units. The supplied scheme contains indicative value points rather than every acceptable wording.

Examples from paper 31/1 (questions on PDF p3; scheme PDF p2):

- **Q1:** ethane is C₂H₆, with six C–H bonds and one C–C bond: **7 covalent bonds**.
- **Q2:** **reproduction** increases the number of organisms in a population; growth of one organism is not population growth.
- **Q3:** apply the 10% energy-transfer rule: 0.10 × 10,000 J = **1,000 J** at the second trophic level.
- For refraction questions, use n = c/v and keep media labels and units explicit. Do not silently replace the paper's given refractive indices with familiar textbook values. Formula layout in Q4's extracted scheme needs visual review.

### Social Science

No supplied answer key or worked reasoning can be extracted from this batch. A suitable answering method is to identify the command word (name, explain, compare, justify), provide distinct relevant points and connect causes to effects. Map questions need the original map. This is general study guidance, **not a verified solution to the supplied paper**.

### English: both courses

- **Reading:** locate evidence in the supplied passage, answer the precise question, and paraphrase without changing meaning. Vocabulary questions use the word's meaning in context. Keep passages attached to their tasks.
- **Writing:** follow the required format and purpose, cover the requested content and audience, and organise ideas coherently. Marking-scheme sample content is indicative, not the only acceptable composition.
- **Grammar:** determine the grammatical function first (tense, agreement, reported speech, word order or editing), then apply the rule while preserving meaning.
- **Literature:** identify the extract/character/event, answer the requested inference and support it with relevant textual details. Do not invent quotations or missing passage context.
- Example: Communicative Q2's scheme (PDF p3) awards content points for communication-skills answers, including learning from good communicators and avoiding offensive jokes. The logic is to select the passage evidence relevant to each subquestion, not copy unrelated sentences.

## Reproduce

Use Python with `pymupdf` installed and a local English Tesseract `eng.traineddata` directory:

```sh
python tools/extract/all_india_2015.py \
  --pdf-dir /path/to/original-uploads \
  --tessdata /path/to/tessdata \
  --output extracted/2015-all-india
python tools/check/all_india_2015.py
```

The extractor reads original uploads, does not modify them, and does not write any live-bank file. PDFs and OCR model binaries are not redistributed here. JSON page numbers are one-based PDF pages, not necessarily printed page numbers.
