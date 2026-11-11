# Physics source batch — progress

## Completed (2026-11-10)

- All 15 uploaded PDFs checked: every page has extractable text. No scan-only
  files. SHA-256, page counts and text-layer counts recorded in
  `assets/notes/physics-batch.json`. All source files retained in upload storage.
- Chapter 8, Electromagnetic Waves: all six numbered figures (8.1–8.6),
  including exercise figures, cropped directly, visually compared with rendered
  source pages, and registered with unedited provenance. Figures 8.5 and 8.6
  have no printed descriptive caption; their caption strings are intentionally empty.
- Physics outline builder attaches manifest figures; static inventory has
  `figures-phy`; Physics chapter pages offer “All source figures”.
- Removed potentiometer from chapter 3 and Davisson–Germer from chapter 11
  outlines and static articles, based on the supplied chapter PDFs. Passing
  mentions in other chapters are not treated as chapter topics.
- Added independent `cleanText` bypass; removed indiscriminate standalone
  4–5 digit deletion, preserving quantities such as 1000 W.

## Checks passed

- Physics syntax validator: all 14 outlines.
- `python3 tools/check/outline_notes.py --physics-pdfs /tmp/arena-coding-uploads`
- `node --check assets/js/app.js`
- Existing Biology, Chemistry and Business Studies outlines and all 139
  existing manifest records are unchanged.

## Remaining — do not treat this batch as released

- Chapter 11 completed in the follow-up batch: all five numbered figures (11.1–11.5) directly cropped, visually checked against PDF pages 4–6, registered and checked.
- Figures remaining: chapters 1–7, 9–10 and 12–14, whole chapters at a time.
- Existing Physics PYQs: option repair/review, numeric kinds, answer mapping,
  render/correct-pick regression test. Initial audit found truncated option
  fragments and options attached to unrelated stems, not just object/array
  incompatibility. All existing rows have empty answer keys; do not invent keys.
- No question spreadsheet/JSON or replacement-outline file was attached.
  No extra question pack has been created from the PDFs or the format example.
- Final cache-token bump, commit, PR, merge and Vercel production verification
  are deferred until the full requested batch and render tests are complete.
