# 2016 All India papers — English extraction and reasoning

This is the **2016** upload batch, separate from [2015](../2015-all-india/README.md). No 2015 data was relabelled or overwritten.

## Extracted data

**10 distinct documents, 153 PDF pages:** five question papers (58 pages) and five marking schemes (95 pages). Hindi-A, Hindi-B and Sanskrit were excluded (six files). All 16 uploads have SHA-256 fingerprints in [manifest.json](manifest.json). Each included document has readable Markdown and page-addressable JSON with `year: 2016`, source identity, extraction method and review flags.

| Subject | Questions | Supplied answers and worked/value points |
|---|---|---|
| Mathematics | [30/1 paper](maths-question-paper-2016-all-india.md) | [Scheme for 30/1, 30/2, 30/3](maths-solution-2016-all-india.md) |
| Science | [31/1 paper](science-question-paper-2016-all-india.md) | [English scheme for 31/1](science-solution-2016-all-india.md) |
| Social Science | [32/1 paper](social-science-question-paper-2016-all-india.md) | [English scheme, cover lists 32/1, 32/2, 32/3](social-science-solution-2016-all-india.md) |
| English Communicative | [1/1 paper](communicative-question-paper-2016-all-india.md) | [Scheme for 1/1, 1/2, 1/3](communicative-solution-2016-all-india.md) |
| English Language & Literature | [2/1 paper](language-literature-paper-2016-all-india.md) | [Scheme for 2/1, 2/2, 2/3](language-literature-solution-2016-all-india.md) |

Unlike the 2015 uploads, the 2016 Social Science solution is a distinct marking scheme, not a duplicate paper. The 2015 Science-specific exclusions were **not** applied to the 2016 English Science scheme. All ten included PDFs have distinct hashes.

## Extraction limitations

- All five question papers have corrupt text mappings (including ordinary English in Century Schoolbook fonts). Their 58 pages were processed with English OCR, not published as corrupted text-layer output.
- On bilingual papers, lines containing Hindi-font text were masked on a temporary copy **before OCR**, including Latin numbers/formulas embedded on those lines. The original PDFs were not changed. Separate formula lines and figure labels can still appear twice or as fragments.
- The English marking schemes use their text layers. All pages, including schemes, remain `requiresVisualReview: true`. A method label is not a source-verification certificate.
- OCR can misread question numbers, mathematical notation, chemical subscripts, headings and punctuation. For example Science Q8's molecular formula is rendered as `C;H,O`; it must be checked in the original before use. Maths figure labels and radicals are similarly unsafe to interpret from OCR alone.
- Figures, maps, graph structure and visual annotations are **not transcribed**. The Social Science paper has 11 physical PDF pages (including map/attachment material); this is not a claim that its cover says 11 printed question pages.
- Multi-set schemes remain intact. Question numbers alone are not enough to attach answers; the correct set, stem and subpart must also match. No automatic bank import or per-question pairing has been performed.
- Marking-scheme value points are preserved as supplied, not silently corrected or presented as a guarantee of scientific or grammatical accuracy.

## Logic behind the questions

The linked solution documents retain the supplied worked steps and indicative marking points. The notes below are **explanatory synthesis**, not verbatim board text, and only the examples explicitly listed are discussed. They do not certify all questions in the batch.

### Mathematics: model → relation → calculation → check

Identify the relevant theorem or formula, translate the given conditions into an equation, solve it, and check the result against the original constraints. Explain intermediate steps rather than giving only a final number; the supplied scheme includes step marks and accepts alternative methods.

Examples from **30/1**, questions on PDF pages 3–4 and scheme PDF page 2:

- **Q2, consecutive AP terms:** for k+9, 2k−1, 2k+7, twice the middle term equals the sum of the outer terms. Thus 2(2k−1) = (k+9)+(2k+7), so 4k−2 = 3k+16 and **k = 18**. Check: 27, 35, 43 have common difference 8.
- **Q3, ladder:** cos 60° = adjacent/hypotenuse = 2.5/L. Hence **L = 5 m**. The ladder is the hypotenuse, not the vertical height.
- **Q4, card probability:** “neither a red card nor a queen” excludes the union of red cards and queens. There are 26+4−2 = 28 excluded cards, since the two red queens must not be counted twice. Thus P = (52−28)/52 = **6/13**.

For diagram-dependent questions, check the original geometry and labels before applying a circle or tangent theorem. OCR fragments are not geometric evidence.

### Science: principle → mechanism → result

Definitions require the defining feature. Explanation questions require a causal link. Equations require balanced atoms and the requested product names; numerical answers require correct units. The source scheme's value points are indicative rather than exhaustive.

Examples from **31/1**, paper PDF page 3 and scheme PDF page 2:

- **Q1:** an acceptable three-carbon alcohol is **propan-1-ol, CH₃–CH₂–CH₂–OH**, shown as propanol in the supplied scheme. The three-carbon chain and hydroxyl group together establish the structure.
- **Q2:** a sufficiently long mature Spirogyra filament breaks into fragments, each capable of growing into a new individual: **fragmentation**.
- **Q3:** ozone normally absorbs harmful ultraviolet radiation; depletion allows more UV to reach Earth's surface, increasing health risks such as **skin cancer**.
- **Q4:** a **concave mirror** converges approximately parallel sunlight at its focus, concentrating energy in a small region to produce a high temperature in a solar furnace.

### Social Science: command word → distinct points → explanation

This batch supplies actual answer/value points. Use the paper's command word and marks to decide whether to name, distinguish, explain or justify. Avoid repeating one fact in several forms; retain OR alternatives as alternatives, not cumulative requirements. Maps still require the original visual source.

Examples from the **32/1 scheme, PDF page 1**:

- **Q2:** using cattle dung cakes as fuel creates pollution and consumes dung that could instead serve as manure. The scheme accepts any one of these points. The logic links the practice to an environmental or agricultural cost.
- **Q3:** pressure groups seek to influence policy without directly controlling/sharing political power, whereas political parties seek that power. A distinction should compare both sides on the same basis.
- **Q4:** India's social and geographical diversity supports the need for a multi-party system able to represent different interests. Explain the link between diversity and representation rather than merely naming the system.

### Both English courses: evidence → meaning → expression

- **Reading:** keep the complete passage with its task. Locate relevant evidence and answer the precise subquestion; vocabulary is interpreted in context rather than from an unrelated dictionary sense.
- **Writing:** identify purpose, audience and prescribed format, then cover the requested content in a coherent sequence. Sample/value-point content does not mean only one composition can receive credit.
- **Grammar:** identify the grammatical relationship (agreement, tense, reported speech, editing or word order), apply the rule and preserve the intended meaning.
- **Literature:** identify the extract/character/event and support the requested inference with relevant textual details. Do not invent quotations or fill missing source passages from memory.
- The supplied language schemes explicitly treat answers as suggested value points and permit equivalent correct expression. Their slash and bracket conventions denote alternatives and optional information; they do not mean every alternative must be included.

## Reproduce and validate

Requires Python, `pymupdf` and an English Tesseract `eng.traineddata` directory:

```sh
python tools/extract/all_india_2016.py \
  --pdf-dir /path/to/uploads \
  --tessdata /path/to/tessdata \
  --output extracted/2016-all-india
python tools/check/all_india_2016.py
python tools/check/all_india_2015.py
```

The extractor selects only filenames containing `2016`, explicitly records 2016 in every JSON record, and writes only to its output directory. Structural checks do not certify OCR or answer accuracy. Source PDFs and OCR models are not redistributed. **The live question bank, database and deployment are unchanged.**
