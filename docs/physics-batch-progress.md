# Physics source batch — progress

## Source figures completed (2026-11-10)

All fourteen Physics chapters now have their complete numbered-figure inventory:
**235 figures**, including the **193 added in this batch**. Chapters 1, 8 and 11
retain their previously verified 42 images unchanged.

| Chapter | Title | Figures |
| --- | --- | ---: |
| 1 | Electric Charges and Fields | 31 |
| 2 | Electrostatic Potential and Capacitance | 31 |
| 3 | Current Electricity | 20 |
| 4 | Moving Charges and Magnetism | 23 |
| 5 | Magnetism and Matter | 8 |
| 6 | Electromagnetic Induction | 16 |
| 7 | Alternating Current | 17 |
| 8 | Electromagnetic Waves | 6 |
| 9 | Ray Optics and Optical Instruments | 30 |
| 10 | Wave Optics | 18 |
| 11 | Dual Nature of Radiation and Matter | 5 |
| 12 | Atoms | 8 |
| 13 | Nuclei | 2 |
| 14 | Semiconductor Electronics: Materials, Devices and Simple Circuits | 20 |

- All 15 uploaded PDFs, including the answers supplement, have extractable text
  on every page. Source hashes, page counts and text-layer counts are recorded
  in `assets/notes/physics-batch.json`. **All PDFs remain retained**.
- Each numbered figure is one direct 144-dpi PDF rectangle, including its
  subpanels. Source pages and crop sheets were visually reviewed; clipped
  labels and neighbouring prose were corrected before registration.
- No AI drawing, image retouching, compositing or redrawing was used.
  Figure 10.1 has two interleaved source captions: its single crop retains both
  captions and both panels. Figure 2.15 retains the number label because the
  lower charge labels extend beside it. Other empty caption strings mean the
  source supplies only a figure number, not an inferred description.
- Captions come from the PDF text layer, with source-overprint duplicates
  removed and legacy Symbol glyphs decoded where needed. No captions were
  inferred from the diagram contents.
- Provenance includes source hash, PDF page, crop rectangle and PNG hash.
  The manifest, static `figures-phy` inventory and generated Physics chapter
  outlines agree. Chapter titles come from `outlines.json`.
- Biology, Chemistry and Business Studies content and crops are unchanged,
  as are all 181 pre-existing manifest entries and image hashes.
- Existing “Outline only” / non-certification labels and absence of unverified
  Physics unit marks remain intact. Cache version is `26b6`.

## Checks passed locally

- `python3 tools/check/outline_notes.py --physics-pdfs /tmp/arena-coding-uploads --physics-render-crops`
  checks all 15 PDF hashes and text-layer counts, all 235 figure records, and
  reproduces all 235 PNGs byte-for-byte from the retained source rectangles.
- `python3 tools/check/physics_outline_smoke.py` against `server.js`: all 14
  chapter outlines and all 235 images load at desktop 1280px and mobile 390px;
  no figure-grid overflow, browser exceptions or same-origin HTTP errors;
  inventory links work and “1000 W” remains intact.
- Physics outline builder and JavaScript syntax checks pass.
- Baseline comparison: protected subject ledgers, all outlines, existing images
  and the entire static inventory preceding the Physics figures are unchanged.

## Separate outstanding work — not implied complete

- Existing Physics PYQs still require official option/answer-source repair and
  correct-pick regression testing. Initial audit found truncated option fragments,
  unrelated options and empty answer keys. Do not invent keys.
- No replacement question spreadsheet/JSON was attached; no extra question pack
  was fabricated from the source PDFs.
- Production deployment/verification and the historical browser CI failure
  investigation are not covered by these local source-figure checks.
- Live paid-provider AI quality testing and usage/access activation remain
  separate; source crops do not validate generated AI solutions.
