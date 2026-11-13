# Blank AI schematic regression

## Reproduction

The generic SVG renderer expected `segments` to be arrays such as `[0,0,4,0]`.
AI JSON can instead contain `{x1:0,y1:0,x2:4,y2:0}`. Reading the object as an
array inserted undefined coordinates into the bounds. The scale became NaN,
and the SVG number formatter replaced all resulting coordinates with zero.
A large beige panel remained, with only a tiny mark in its top-left corner.
A mocked object-segment answer reproduced the supplied screenshot locally.

## Fix

- Normalize array/object segments and explicit numeric strings before computing
  geometric bounds. Check all supplied plane/triangle/circle/bar coordinates.
- Refuse incomplete/non-finite geometry, invalid radii or missing triangle
  vertices rather than silently inventing coordinates or drawing a blank SVG.
- Show a concise diagram-unavailable notice with the written answer intact.
- Use the same safe AI renderer for Ask and PYQ answers; conceptual flows no
  longer fall through PYQ's generic geometry renderer.
- Document the exact coordinate schema in the solution policy.
- Handle missing local Ask solver results with an AI-waiting placeholder rather
  than throwing before the AI request can run (found while reproducing).
- Cache bump 26c0 includes a versioned figures.js URL. Source question text,
  other subject banks, source PDFs and all source figure crops are unchanged.

## Validation

`node tools/check/ai_diagram_geometry.js` checks equivalent array/object inputs,
numeric strings, rejected malformed coordinates and preserved circles/bars.

`tools/check/ai_diagram_browser.js` needs Playwright and pngjs (CI installs both
outside the repository). It mocks the AI response but uses the real answer
renderer and real screenshot pixels, not only a DOM-existence check. Tested at
1170px and 390px. Screenshots go to /tmp, not Git. Invalid AI data gives a notice,
without hiding the written approaches. No paid AI/provider or live production
correctness is implied.

Also passed locally: serverless contract smoke, Physics quality regression,
seven-subject conceptual-flow browser check, all 235 Physics source figures at
1280/390px, and the explanation-scroll regression. No source figures were edited.
