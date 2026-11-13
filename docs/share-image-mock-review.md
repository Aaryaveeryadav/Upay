# Share-image layout and mock-test review

## Sharing

The former canvas wrapper returned the baseline of its last line. Callers advanced only 8–20 pixels before drawing the next text block despite 20–30px fonts, causing the overlap in the reported parallel-resistor image. The new layout measures/wraps text first, advances by complete line heights, preserves paragraphs, includes formula/working and notes, and sizes the canvas to its content. Very long first explanations are capped and explicitly labelled excerpts. The export remains the first explanation, not all four methods; it does not embed diagrams.

Clicking Share image now opens a preview. Browsers without native file sharing explain that limitation and offer an explicit Download image button. Native-share cancellation never triggers a surprise download. The preview supports keyboard dismissal, and its object URL is released on close. Body font preferences are used for content. Asset cache version: 26d3.

## Mock practice

Each question has:
- a saved draft, Submit answer and Edit answer controls (submitted answers are read-only until edited);
- an accessible info disclosure showing mapped chapter, source and supplied marks (unknown marks are labelled, not guessed);
- submitted-answer feedback, reference key only when explicitly verified, and links to explanation/chapter revision.

Finishing or the three-hour timer assesses the saved answers and shows confirmed auto-marked marks, known paper marks, unknown marks and pending-review questions separately. A question count of up to 80 is not a claim that this randomly sampled practice is an official 80-mark board paper.

`mock-assessment.js` auto-marks only supported objective keys explicitly tagged `keyVerified: true`: mapped MCQ options and one-mark bare numeric/fraction answers. Withheld/suspect options, unverified/missing keys, descriptive answers, multi-mark workings and unsupported answer formats remain pending; they are not silently marked wrong or assigned an invented score. No provider-generated key is promoted to verified. No source question/key files were changed.

After finishing, learners can save and check separate correction attempts without changing the original answers/confirmed score. Known-mark pending questions can receive optional bounded self-review marks (half-mark increments); these appear in a clearly labelled self-assessed estimate separate from confirmed marks, not a verified or official result. Full descriptive grading still needs a real rubric/human review.

Per-question submission state, original answers, corrections and review marks use the existing owner-scoped session persistence. Scope/new-test behavior is preserved. This is local practice, not a tamper-proof proctored exam.

## Tests

`mock_assessment.js`: verified-only scoring, numeric/fraction equivalence, MCQ matching, unknown marks, review-required theory, refusal to flatten exponents, bounded self-assessment and pending totals.

`share_mock_browser.js` passes at 1280px and 390px: non-overlapping canvas baselines and working lines; preview with no download; explicit download; canceled native sharing; per-question submit/edit/reload; info disclosure; correct/wrong feedback; pending theory; total marks; separate corrections/self-review and timer expiry. The parallel-resistor preview was visually inspected. Synthetic verified test keys do not certify real source keys.

Existing serverless, provider-budget, prose, routing and radical regressions plus desktop/mobile science-timeout recovery pass. No claim of all CI or live deployment success is made.
