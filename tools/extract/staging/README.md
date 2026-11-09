# Business Studies English — source-checked outline staging

`business-studies-en.json` contains short outlines extracted from the eleven
uploaded NCERT chapter PDFs, with source SHA-256 hashes and 1-based PDF page
references. The source headings were checked against the PDF layout, and the
objectives, excerpts, selected key terms and headings were checked against the
extracted text before deletion. This is **not** independently board-verified and
is not loaded by the app; do not publish it as verified notes without current
board-syllabus and source review.

- Section lists cover principal headings, not every subheading. Some wording or
  spelling reflects the original PDF (including its typographical errors).
- Objectives are from the first-page lists. Summaries are brief verbatim textbook
  excerpts, not AI-authored notes, and can be shorter than 300 characters. The
  key terms are a selection, not necessarily the complete lists.
- `lebs203` discusses the Consumer Protection Act 2019 in its introduction but
  refers to the 1986 Act in its summary. Resolve the source's inconsistency
  against current authoritative material before publishing legal information.
- No full chapter prose or AI-generated questions are included. Any future AI
  questions must be labelled “practice, not board-verified”.

To rebuild, install `pypdf` and run
`python3 tools/extract/build-business-studies-candidates.py --pdf-dir DIR`.
Before deleting the sources, run
`python3 tools/check/business_studies_candidates.py DIR`. Without `DIR`, the
check validates the staged file's structure only. Delete re-uploaded sources in
the same turn after extraction and checks, per project rules.
