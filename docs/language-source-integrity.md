# Language question/source integrity

## Diagnosed causes

- PYQ difficulty levels in the imported language banks are numbers, but hash URL parameters are strings. Strict comparison made populated levels render empty. PYQ chapter filters also coerced string chapter IDs to numbers, breaking IDs such as `san10-sk01` and `hind10-kr01`. Book-divider records were incorrectly offered as chapter filters.
- Hindi chapter data was in the Science lazy pack, not Hindi's pack. Visiting Hindi directly could leave chapter labels/context unavailable until Science had been opened.
- The legacy Sanskrit bank contains Hindi review prompts with empty `sa` fields. These are not transcriptions of the user's Sanskrit paper PDFs. Some accompanying outlines/summaries also have no source-verification record; translating them would not make them originals.
- Hindi imports include reading passages (`kind: text`) and glossary/OCR fragments such as `बरामदा 22. साफ़, शुद्ध` among standalone exercise questions.

## Changes

Filters preserve string IDs, normalise level comparisons and exclude book headers. Numeric Maths template chapter IDs remain numeric. Sanskrit chapter filters list only source-indexed chapters, rather than dozens of empty/unmapped outline entries. Hindi now loads its chapter catalogue directly. Language practice respects its level filter and does not invent missing marks.

`language-policy.js` withholds unverified Sanskrit rows from the searchable exam bank, test, mock and other scoped practice. Original data files are retained unchanged. All nine supplied Sanskrit PDFs are exposed in PYQ/test/mock source-only views. The legacy Hindi summaries are not displayed as original Sanskrit chapter text; their outlines are explicitly unverified. The PDF questions are not yet a verified chapter/difficulty-indexed bank. No complete re-upload is needed for the existing originals; a specific missing item needs its paper code, question number and source page for review.

Reading-only rows and the reported glossary fragment are not exam questions. Source exercise labels distinguish them from board questions. The diary exercise is already mapped to `hind10-kr01` (माता का आँचल, कृतिका) in the existing source metadata. Correctly loading the catalogue reveals this context. Matching an exact existing question can recover its unique mapped chapter; the original question text is not prefixed or rewritten. Chapter title is sent separately to both solve endpoints as provided context, never as proof the original passage was supplied.

Sanskrit answer language defaults to `sa`, with explicit Sanskrit-writing cues recognised. Native `sa` question text is preferred when available. Shared instructions require grammatical Sanskrit by default, prohibit fake source transcriptions/quotes/authors and require missing extracts instead of guesses. Clearly Hindi/Latin-only default Sanskrit answers are filtered before the bounded repair and before success; explicit Hindi/English translation requests are allowed. Cached Hindi-default Sanskrit replies are not reused. This heuristic is not a Sanskrit grammar or semantic correctness certificate.

Short deictic prompts without chapter context request it. Glossary debris requests the full question. A long supplied passage without a task asks whether the learner wants a summary/explanation/translation or particular question answers. This includes the reported travel extract; no comprehension questions are invented. General grammar/composition outside the dataset remains available, but unseen source-specific claims are not certified.

Assets: 26d5. No Chemistry/Biology/Business Studies material or crop/PDF contents changed. The nine Sanskrit PDF SHA-256 hashes match the pre-change Git versions.

## Verification and remaining work

Unit tests cover source/review separation, numeric/string filter fixtures, incomplete prompts/passages, Sanskrit routing/language rejection and translation exceptions. Mocked serverless test checks a missing-context 422 without provider usage, supplied chapter context, Sanskrit default and repair of a Hindi-only reply.

Browser checks at 1280px and 390px pass: direct Sanskrit load with nine original PDFs; no Hindi placeholder questions in PYQ/test; numeric levels 1/2/3 and string chapter IDs using reviewed synthetic Sanskrit rows; direct Hindi load without visiting Science; exact diary chapter context; withheld glossary/passage rows; no provider call for incomplete inputs. Existing share/mock tests pass. These tests do not certify real Sanskrit wording or actual provider grammar/accuracy.

Outstanding: source-verified transcription and chapter mapping of the full supplied Sanskrit papers. No universal guarantee of correct AI answers (inside or outside the bank) is possible; missing context and uncertainty must remain explicit. No live-provider or production deployment test has been performed.
