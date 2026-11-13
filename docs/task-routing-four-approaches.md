# Focused task routing and four explanations

Clear composition, grammar and subject-specific cues override the subject sent to the solver, without changing the student's selected syllabus. Ambiguous questions retain the selected subject. Hindi script alone does not imply Hindi content. Both solve endpoints share `assets/js/task-routing.js` with the browser.

Writing tasks bypass the local arithmetic engine, including its failure fallback. Word limits such as 150–200 are not HCF inputs. Explicit numerical HCF/LCM questions remain supported. The detected-task notice explains overrides; writing responses use explanation labels and suppress unrelated numeric keys/diagrams.

Completed AI responses require at least four substantive approaches, with one repair attempt before a clear failure. Theory requires four complete explanations, not subparts masquerading as methods. Composition prompts request four complete alternatives in the required language, format and word range. This validates response structure, not factual correctness or actual essay word counts. The policy/cache version is `four-approaches-v2`; client asset version is `26c9`. Existing local/seeded material is not globally rewritten; shorter local responses are labelled starter solutions.

Tests: `node tools/check/task_routing.js`, `node tools/check/serverless_smoke.js`, and Playwright `tools/check/task_routing_browser.js` cover wrong-subject Hindi essays, script/content distinction, four-response handling, no spurious arithmetic/diagram fallback, unchanged syllabus selection and provider failure. Browser tests mock the provider; no live-provider or production verification is implied.

Known unrelated test failure: `tools/check/trust_controls.js` expects 1019 Physics records but currently loads 202. This patch does not change Physics source data or that assertion.
