# Physics import quality and compact solution loading

## Scope and result

All 1,181 imported Physics exercise/2025-paper rows were structurally screened.
333 remain available; 848 are withheld from pack registration, so
withheld rows cannot enter search, chapter lists, suggestions or practice papers.
This is **not** a claim of full source/semantic verification of the remaining rows.
Other subjects and source figure crops are unchanged.

- 29 intact English Assertion–Reason stems are typed as kind 2, with four
  options recovered from instruction text for the same paper series/set.
  Paper-specific D variants are preserved, not replaced with a guessed default.
- 88 inline option sets are separated into four choices without inventing text.
- The two reported rows (`phys25-554-s2-q16` and `phys25-552-s3-q05`)
  are withheld: the former has corrupted Hindi mixed with English instructions;
  the latter contains legacy-font text and multiple joined questions. Their
  original wording cannot be safely restored from these extractions alone.
- Other withheld rows contain PDF control/PUA glyphs, legacy fonts, mixed Hindi
  in English fields, missing figures/options, merged pages/questions, ambiguous
  flattened mathematical layouts or incomplete sentences.
- Unreviewed Hindi extracts are withheld. Where a screened English question is
  available, Hindi mode shows that English with an explicit fallback notice.
  No automatic translation or phonetic legacy-font guessing is used.
- Imported answer strings are not treated as verified: misaligned keys were
  already known in this bank. They are preserved in the ledger but not exposed
  as answers or used for grading. NCERT exercises do not inherit fabricated
  three-mark board weights. The Physics test introduction no longer claims
  generated questions with independently checked answers or a fixed CBSE pattern.

## Reproducible audit

`python3 tools/curate/audit-physics-question-quality.py`

The raw originals, per-row decisions/reasons and counts live in
`assets/notes/physics-question-quality.json`. Rerunning uses these originals and
produces deterministic output; no source records are silently deleted. This
replaces the older structural-only workflow in `repair-physics-pyq.py` for this
batch. **Do not rerun the older repair script as a release step.**

Official board question PDFs/keys are not in the supplied chapter-PDF batch.
Source transcription, missing figure/option recovery and official key alignment
remain necessary before the withheld imports can be restored.

## Loading fix

The giant bulb came from the practice solution's unbounded SVG placeholder,
not from a textbook source figure. Ask, PYQ solution and practice-solution
loading now use a shared accessible three-dot line (31 × 12 CSS pixels).
Animation respects reduced-motion preferences. Source diagrams are untouched.
Asset cache version: `26b8` (includes PR #20's light-only changes).

## Checks

- `node tools/check/physics_question_quality.js`: all imported rows accounted
  for; reported damaged rows excluded; intact AR classification/option sets;
  no fabricated answers or unreviewed Hindi published.
- `python3 tools/check/physics_quality_browser.py`: actual recovered AR row
  renders four choices; unverified picks are not graded; withheld rows never
  enter the practice set; compact loading tested with mocked pending AI and
  error recovery at 1280px and 390px.
- `light_mode_browser.py`, `physics_outline_smoke.py` and
  `trust_browser_smoke.py` passed locally; all 235 source images still load.
- Syntax/diff checks and audit idempotence checked. No paid AI calls or
  production verification are implied.
