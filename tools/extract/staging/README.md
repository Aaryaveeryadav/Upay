# Business Studies English — source-derived outline staging

`business-studies-en.json` preserves the eleven source-checked candidate
outlines from the supplied NCERT chapter PDFs, with SHA-256 hashes and 1-based
PDF page references. The original candidates are not directly published.
A selected and edited version is in `assets/notes/outlines.json`, mapped to the
CBSE 2026–27 Business Studies syllabus and displayed in the outline library.
The public notes are not CBSE-certified. Financial Markets was not in the supplied
chapters; a separate syllabus-derived outline covers that unit. Project work
is not covered. Some syllabus topics were added as headings even when the staged
principal-heading selection did not contain them.

The candidate `lebs203` source introduction discusses the Consumer Protection
Act, 2019 but its summary refers to the 1986 Act. The student-facing summary
was rewritten to use the 2019 Act; CBSE's current syllabus specifies that Act,
and section 107 repeals the 1986 Act subject to savings. The original candidate
remains here for provenance and must not be used unchanged as current law.

No full chapter prose or AI-generated questions are included. Any future
AI-generated questions must be labelled “practice, not board-verified”.

To rebuild the candidates, install `pypdf` and run
`python3 tools/extract/build-business-studies-candidates.py --pdf-dir DIR`.
Before deleting re-uploaded sources, run
`python3 tools/check/business_studies_candidates.py DIR` and review the
outputs against the sources and current syllabus. Without `DIR`, that check
validates structure only. Delete re-uploaded sources in the same turn only
after extraction and checks, per project rules.
