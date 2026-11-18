# 2018 English extraction — audit, data and reasoning

**Status: extracted for review, not fully verified and not imported into the live question bank.** This is the 2018 upload batch; existing earlier-year data is unchanged. Hindi-A, Hindi-B and Sanskrit are excluded as requested.

## Result

**10 distinct documents, 136 physical PDF pages:** five question papers (56 pages) and five schemes (80 pages). [manifest.json](manifest.json) inventories all 16 uploads with SHA-256 fingerprints, document roles and exclusions. No included source is a byte-for-byte duplicate. Each included document has Markdown and page-addressable JSON with `year: 2018` and page review flags.

| Subject | Questions | Supplied scheme | Important limitation |
|---|---|---|---|
| English Communicative | [1/1 paper](communicative-question-paper-2018-all-india.md) | [Scheme](communicative-solution-2018-all-india.md) | Scheme cover says **Delhi**, unlike filename. 1/1 Q1 globalization content agrees in the sampled text comparison; full equivalence not established. |
| English Language & Literature | [2/1 paper](language-literature-paper-2018-all-india.md) | [Scheme](language-literature-solution-2018-all-india.md) | Cover lists 2/1, 2/2, 2/3, but body identifies Set 1 (2/1); do not infer full coverage of the other sets. |
| Mathematics | [30/1 paper](maths-question-paper-2018-all-india.md) | [Scanned scheme, OCR](maths-solution-2018-all-india.md) | All 12 scheme pages use **unverified OCR**. Fractions, radicals, mark fractions and diagrams are unreliable in raw OCR. Cover lists three codes; do not assume all three are fully represented. |
| Science | [31/1 paper](science-question-paper-2018-all-india.md) | [31/1 scheme](science-solution-2018-all-india.md) | **Q4(a) is explicitly ambiguous**: scheme grants a mark whether attempted or not. Preserve the evaluator instruction. |
| Social Science | [32/1 paper](social-science-question-paper-2018-all-india.md) | [Scheme](social-science-solution-2018-all-india.md) | Map content cannot be recovered as a text-only question. Cover lists three codes; no automatic all-set pairing. |

The 2018 year comes from the upload labels and dated accompanying schemes. Not every question-paper cover prints a year; code alone is not proof of year or region. Most papers in this batch state 80 marks; earlier years' question counts and assessment structure were not carried over.

## Checks performed — and what they do not prove

1. Inventoried all 16 supplied files and checked every recorded hash against the original upload after extraction.
2. Excluded the six Hindi/Sanskrit subject files. For bilingual Maths/Science/Social papers, inspected document-specific font mappings and removed Hindi-bearing lines, including Latin numbers/formulas on those lines. CID font names were **not** treated as globally meaningful across subjects.
3. Used text-layer extraction for 124 pages and OCR only for the 12 scanned Maths-scheme pages. Empty OCR pages cause extraction failure. Unexpected control characters or retained E000–EFFF legacy Hindi glyphs in text-layer output also cause failure rather than silent publication.
4. Retained F000–F8FF Adobe Symbol glyphs instead of guessing their meanings; each page records `unmappedSymbolGlyphs`. These may display as boxes or look-alikes and need visual transcription. Absence of literal Hindi characters is not proof that all content is correctly ordered or complete.
5. Visually inspected Maths scheme PDF page 2: Q1–6 answers are separately recorded with explanatory calculations in [review-samples.json](review-samples.json). This is a limited sample, not full visual verification of all questions, diagrams or OCR pages. Questions were compared using their paper text layers.
6. Visually confirmed Science scheme PDF page 2's Q4(a) ambiguity instruction. Initial Communicative Q1 and Language & Literature Q1 passage/value-point topics were compared in their text layers. Same codes or matching first questions do **not** establish every subsequent answer match.
7. Added structural regression checks for counts, years, roles, exclusions, hashes, page sequences, methods and warnings. Earlier-year checks remain available and unchanged.

**No claim is made that every answer is correct or every PDF glyph has been transcribed faithfully.** Figures, maps, fraction structure, superscripts, chemical bonds, reading order and diagrams still require original-PDF review. No missing figure context was invented. Reading passages remain with their associated tasks, not promoted to standalone exam questions.

### Specific source/OCR issues

- Maths scheme page 2 prints **k = 1/2** and **OP = √(x²+y²)**. OCR fragments these expressions. Use the reviewed examples below for those items, not the raw OCR as a verified key. Other OCR pages have not received that review.
- Science Q4(a): the scheme says **“Due to ambiguity in the question award 1 mark whether attempted or not.”** This is an evaluation instruction, not a scientific definition or a permission to invent an answer. It is preserved unchanged and not applied to any app scoring.
- Science's general instruction mentions a 0–100 scale while its actual set table states **Max. Marks: 80**. These source statements are preserved; do not derive the test total from generic evaluator boilerplate.
- Physical page counts differ from some printed cover counts. Communicative has 12 PDF pages but its cover says 11 printed pages; Maths has 12 physical pages but says 11; Social Science has 12 physical pages and says 10 plus one map. Low-text/trailing and map pages remain represented, not silently deleted or counted as questions.
- Supplied schemes can contain indicative answers, optional alternatives and grading exceptions. A slash does not mean that every alternative must be given. A sample response is not the sole acceptable wording.

## Logic behind the questions

These notes are **explanatory synthesis**, distinct from raw source extraction. Only the cited examples have this explicit review; this is not a complete independently solved answer key.

### Mathematics: translate → calculate → check

From **30/1**, paper PDF page 2 (Q1), page 3 (Q2–6); scheme PDF page 2 visually inspected:

- **Q1:** substitute x=3 into x²−2kx−6=0. Then 9−6k−6=0, hence **k=1/2**.
- **Q2:** the smallest prime is 2 and smallest composite is 4; **HCF=2**. One is neither prime nor composite.
- **Q3:** distance to the origin follows from Pythagoras: **√(x²+y²)**, not √x²+y² with the radical ending early.
- **Q4:** a₇=a+6d=4 with d=−4 gives a−24=4, hence **a=28**.
- **Q5:** 67° and 23° are complementary, so cos 67°=sin 23°. Their squared difference is **0**.
- **Q6:** similar-triangle area ratio equals the square of corresponding-side ratio: (1/3)²=**1/9**.

For other items, use the correct question/subpart and check the source's diagram, fraction bars and step marks before pairing a result. OCR alone is insufficient.

### Science: principle → mechanism → requested result

Examples from **31/1**, question paper PDF page 3 and scheme PDF page 2 (these explanatory examples are not a full scientific audit):

- **Q1:** under the usual Mendelian pure-breeding dominant/recessive cross, violet is dominant over white, so the F1 plants have **violet flowers**. The purity assumption matters; violet phenotype alone does not establish a parent's genotype.
- **Q2:** gravitational potential energy of stored water becomes kinetic/mechanical energy and ultimately **electrical energy** in a hydropower plant. The intermediate turbine motion explains the mechanism.
- **Q3:** X is ethanol, Y ethene and Z hydrogen. Ethanol loses water on heating with excess concentrated H₂SO₄ at 443 K: **C₂H₅OH → C₂H₄ + H₂O**. Sulphuric acid acts as a **dehydrating agent**; reaction with sodium accounts for hydrogen evolution.
- **Q4(a):** retain the source grading exception, not a fabricated mandatory answer. For Q4(b), the scheme identifies a as cell body/cyton and b as axon; the full flow-chart order must be read from the original diagram.

### Social Science: command word → distinct points → causal explanation

For **32/1**, question paper PDF page 3 and scheme PDF page 3:

- **Q1 OR alternatives:** Berlin meeting → partition/carving up of Africa; merchants moving to countryside → restrictions on expanding production in towns/trade guilds; Booth's survey → study of low-skilled workers' conditions. Answer the chosen alternative, not all branches indiscriminately.
- **Q2:** explain the Church's concern about rebellious/irreligious ideas when asked about publishing control. For the alternative question, vernacular connects novels to the common people's spoken language.
- **Q3:** resources classified by origin are **biotic and abiotic**. Do not substitute a different classification dimension such as renewability.

Map questions require the map, not just extracted labels or a guessed location.

### Both English courses: passage evidence → precise response

- **Reading:** retain the passage and choose evidence that answers the exact subquestion. Interpret vocabulary in context, not from a memorised key belonging to another set.
- **Writing:** satisfy purpose, audience, format and content, with coherent organisation. Indicative scheme points do not restrict every learner to one model composition.
- **Grammar:** identify the relevant relationship (tense, agreement, word order, reported speech), apply the rule and preserve meaning.
- **Literature:** support an inference with the supplied extract/context. Never reconstruct missing quotations from an answer fragment.
- Example: Language & Literature Q1.1(i), paper PDF page 2/scheme PDF page 2, locates the floating post office on **Dal Lake in Srinagar**. Q1.1(ii) asks specifically about the seal: the **boatman rowing a shikara** is its distinguishing detail. These are passage-comprehension answers, not independent claims about present-day postal services.
- Communicative Q1's globalization value points align with the supplied passage in the sampled comparison, but the scheme's Delhi cover discrepancy remains recorded.

## Reproduce safely

Requires Python with `pymupdf` and a local English `eng.traineddata` directory:

```sh
python tools/extract/all_india_2018.py \
  --pdf-dir /path/to/uploads --tessdata /path/to/tessdata
python tools/check/all_india_2018.py
python tools/check/all_india_2015.py
python tools/check/all_india_2016.py
```

The extractor requires the audited 16 filenames, selects only 2018, reads PDFs without modifying them, stages all extraction before publishing output and refuses to overwrite a manifest from another year. PDFs/models are not redistributed. To compare hashes with the original uploads, add `--pdf-dir /path/to/uploads` to the checker. Use `--unit` with Python/pymupdf to test language filtering and corruption rejection.

**Live question banks, database, app code and deployment are untouched.** Complete original-PDF review, especially all Maths OCR and diagram-dependent content, is still required before any verified-bank import.
