# Accountancy PYQ extraction — QA handoff

Updated 7 November 2026. These checks are targeted and do not prove that every transcription or answer is correct.

## Current data

- **34 CBSE Class 12 Accountancy papers, 1,428 question roots**, with 42 roots per paper: 26 Part A, 8 Part B Option I, and 8 Part B Option II.
- 2023 Main: 3 papers / 126 roots; 2024 Compartment: 3 / 126; 2025 Main: 15 / 630; 2025 Compartment: 3 / 126; 2026 Main: 10 / 420.
- Part A and Option I: 1,156 records in `accountancy`. Option II: 272 records in `computerized-accounting`, with `parentSubject: accountancy` and chapter IDs 301/302.
- **205** roots have multiple chapter tags. Primary chapter counts: 101:218, 102:172, 103:93, 104:89, 201:162, 202:122, 203:55, 204:36, 205:85, 206:124, 301:149, 302:123.
- Main browser asset: `upay/assets/js/data/pyq-accountancy-2023-2026-extracted.js`; machine-readable mirror: `pipeline/export-34-papers.json`. Records retain paper/year/session, question/part/option, source file/page and chapter metadata.

## Additional source-only papers (not in those counts)

Seventeen more uploads received on 7 November 2026 do not match any existing year/session/code tuple. They have **not** been added as searchable questions. The site lists unaltered source PDFs under Past Years → Original papers, separate from the 34-paper bank:

- 2023 Main, 12 papers: `67/1/1–3`, `67/3/1–3`, `67/4/1–3`, and `67/5/1–3`.
- 2024 Main, five papers: `67/4/2–3` and `67/5/1–3`.

Paper codes repeat across years: 2023 and 2024 papers with the same codes must not be treated as duplicates. Year identification uses the PDF creation metadata and series, cross-checked against published listings: [2023 EF1GH series](https://www.cbseboardonline.com/cbse-class-12.html) and [2024 QSS4R/4 and Q5QPS/5 series](https://school.careers360.com/boards/cbse/cbse-previous-year-question-papers-class-12). The uploaded PDFs remain the source authority.

The searchable 2023 files have text layers that drop meaningful text and reorder some mathematical fractions. The 2023 `67/5/*` files and all five 2024 PDFs are image-only; some questions contain integral screenshots or tables. Basic OCR also misreads fractions, currency symbols and question text; source-level review is needed before any future import. The site does not present these 17 PDFs as searchable, chapter-tagged or answered questions. This does not imply a source-fidelity audit of the existing bank.

Unaltered public assets are in `upay/assets/papers/accountancy/{year}/`, with SHA-256 and provenance metadata in `assets/js/data/accountancy-original-papers.js`. The five newer 2023 paths are hard links to their preserved `-2` uploads to avoid an additional physical copy; editing either path affects the shared file. A portable package must store their bytes. Snapshot tools may still count both paths toward the workspace cap. The site service worker does not cache the PDFs, and the PDF list ignores chapter/level filters. `python3 tools/check/source_papers.py --uploads /home/user/uploads` verifies all copies against their uploads; browser smoke checks filtering, scope, links and representative HTTP responses. Neither test proves transcription or year accuracy.

## What was repaired

The 12 rebuilt 2025 Main papers (67/1/x, 67/2/x, 67/4/x and 67/5/x) had page-footer truncation, OCR, fraction, glyph and cross-page continuation problems. Their extraction and targeted transcriptions were repaired against the supplied source pages. Additional selected 2025 corrections are in `pipeline/source_fixes_2025.py`; tests for those examples are in `pipeline/qa_source_regression.py`. Decorative footer artifacts were also removed from the older `67/7/*` import.

The three unusually short roots `acc12-2025-67-4-1-bii-q31`, `acc12-2025-67-4-2-bii-q32` and `acc12-2025-67-4-3-bii-q31` were checked against their sources. One Abhay question in `67/4/*` has a printed date inconsistency; the source wording is preserved instead of guessing a correction.

## Checks performed

- Structural export checks: 34 papers, 42 expected slots each, 1,428 unique records, valid scope and chapter tags, no detected structural errors; no flagged legacy decorative-footer patterns. `qa_export.py` also prints nonfatal review flags, which are **not** an accuracy certificate.
- Selected source-backed regression assertions pass. **The whole 1,428-record bank has not been compared character by character with the PDFs.** OCR, tables, options and classification still warrant human review before high-stakes use.
- Playwright regression scripts cover fresh load, chapter/year filters, subject and board isolation, daily self-assessment and scoped mistake lists, progress export/import, source-preserving search, sample papers, ungraded mock lifecycle, reloads, mobile navigation and simulated AI success/failure. Tests do not validate every page or every question.
- One small isolated local-server Gemini request returned a response through the live provider on 7 November 2026. That does not establish correctness of generated answers, availability of every key/model, or operation of a separately hosted deployment.

## Important limits

- **No official Accountancy answer key, Hindi translation, or fully verified solutions are included.** A typed or selected answer is not scored as correct or incorrect for this bank. Mock practice is currently ungraded across subjects. AI responses are labelled unverified and can be wrong.
- Most source options remain inline within the extracted question text; they are not necessarily separated into selectable fields. Marks and question-kind metadata are not comprehensively populated.
- Class 11 Accountancy is outside this import. Board/class/subject data availability is uneven; switching to a board without supplied questions should show an empty state.
- The source PDFs remain in `/home/user/uploads`; the `pipeline/` directory contains extraction, classification, import and regression scripts.

## Reproduction

```sh
cd /home/user/pipeline
python3 extract_v6.py          # OCR/extraction and source-backed repairs
python3 classify_v6.py
python3 import_candidates.py
python3 qa_export.py
python3 qa_source_regression.py

cd /home/user/upay
python3 tools/check/accountancy_smoke.py
python3 tools/check/site_smoke.py
```

The extractor may take longer without its OCR cache. Preserve source PDFs and user data; do not treat an old application archive as a safe deployment package.
