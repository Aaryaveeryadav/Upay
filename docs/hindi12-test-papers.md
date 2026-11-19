# Supplied Hindi Core test papers

Downloadable dataset: [`assets/papers/hindi-core/questions.json`](../assets/papers/hindi-core/questions.json). In the app, open **CBSE → Class 12 → Hindi Core → Past papers**. The archive can be searched by paper code, series or a phrase in a question. Each transcript fragment links to the corresponding page of the original PDF. No data is added to Hindi Elective or to the graded question bank.

| Codes (three sets per series) | Printed series | PDF pages per set | Question-boundary source |
|---|---|---:|---|
| 2/1/1–3 | QR1SP | 16 | Printed labels inspected on the scans |
| 2/2/1–3 | S2RPQ | 16 | Printed labels inspected on the scans |
| 2/3/1–3 | Q3SPR | 11 | Explicit left-margin number labels |
| 2/4/1–3 | S4PRQ | 11 | Explicit left-margin number labels |
| 2/5/1–3 | S5RPQ | 11 | Explicit left-margin number labels |
| 2/7/1–3 | S7PQR | 11 | Explicit left-margin number labels |

The 216 records are **main numbered questions in their individual sets**, not 216 unique prompts. Related passages, alternatives and subquestions are kept together. Each question has a number, a one-based PDF start page, the printed mark expression and page-attributed `parts`. Cover/instruction text outside the question ranges is stored in `otherText`. Some section headings immediately preceding the next question can remain at the end of the preceding transcript. PDF page counts include end leaves and do not necessarily equal the printed page count.

**Review status:** all transcriptions are OCR drafts. Six PDFs have no text layer; twelve have a text layer with systematic Hindi character substitutions. OCR uses the rendered page rather than propagating those substitutions. It can still misread words, skip text, or scramble options, marks and their reading order. The PDF is authoritative. `printedMarks` is separate from OCR: right-margin marks were read from the digital PDFs or inspected on the scanned sets. No subpart marks, years, chapter mappings or official answers have been inferred. No answer keys were supplied.

**Reproduction:** `OMP_THREAD_LIMIT=1 python tools/extract/hindi12_papers.py /path/to/uploads /path/to/tessdata` with PyMuPDF, pillow, tesserocr and the `hin` and `eng` tessdata_fast models. The scan annotations are bound to the supplied PDF checksums. `node tools/check/hindi12_papers.js` checks set identity, original file hashes, paper totals and question-to-page boundaries. `tools/check/hindi12_browser.js` covers the paper reader alongside existing Hindi course flows.
