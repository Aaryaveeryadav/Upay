# Generated question stems, read aloud and readable AI maths

## Generated question regression

Generated Maths questions put the stem in en/hi and optional internal parameters
in raw. The practice view preferred any truthy raw object and therefore passed
metadata without a stem to the source-question renderer. Render the generated
stem directly, never through the legacy OCR cleaner: it also removed valid
numeric expressions such as `= 7.464 (`. Bank questions retain their existing
source-aware text handling. No question-bank text or source crops were changed.

## Listen

The localization helper assumed every field was an en/hi object; AI response
fields are plain strings. answerToText called trim on undefined and Listen
failed before creating an utterance. P now handles strings/numbers as well as
localized objects. Speech reads the currently displayed AI answer first.

A retained session owns short utterances (at most 220 characters), addressing
long-answer browser stalls/garbage collection. Stop and navigation cancel the
session; completion/errors reset the button. Missing speech APIs or speech-engine
errors show feedback. English/Hindi voice preference falls back to the browser
engine when no matching installed voice is available. No external TTS request
is made and actual audio availability still depends on the browser/device.

## Readable maths

answer-format.js converts supported TeX to escaped plain-Unicode presentation:
`K_{max} = h\nu - \Phi_0` becomes `Kₘₐₓ = hν - Φ₀`.
Fractions retain explicit grouping: `(h/e)ν - (Φ₀/e)`. Nested supported fractions,
roots, text wrappers, Greek letters, relations, subscripts and powers are handled.
Unknown commands are preserved, not silently deleted or guessed. This is not a
full LaTeX renderer. AI policy explicitly requests Unicode throughout.

Normalization applies to AI textual fields, including summary/result, method
steps/notes and diagram labels, across Ask, PYQ/cached and practice solutions.
Source questions/IDs are not transformed. The formatter returns text only;
existing HTML escaping remains in place. Saved/cached provider data can be
formatted on display without editing the imported question bank. Cache 26c1.

## Checks

- Unit cases include the supplied photoelectric equations, grouping, nested
  commands, immutability/idempotence.
- question_audio_format_browser.js compares every generated trig stem with its
  actual English/Hindi generator text at 1280/390px, checks Unicode output,
  and exercises mocked native-speech start, chunk completion, Stop, error and
  navigation without browser exceptions.
- Diagram screenshot regression, seven-subject conceptual flow and explanation
  scroll regressions pass. Speech mock verifies app behavior, not real audible
  playback; AI is also mocked, not a real-provider accuracy test.
