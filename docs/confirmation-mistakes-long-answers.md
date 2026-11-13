# Ambiguous equations, persistent mistakes and long-answer budgets

## Reported square problem

The exact original `n² + 10n + 2026` problem already has four verified positive solutions: 15, 27, 327, 995. The reported stem instead says `positive integers 7` and mixes `n2` with `10m`. That does not match the supported mathematical problem; it must not be silently rewritten and sent to the model as if unambiguous.

The shared exact module now recognises this narrowly bounded malformed stem and returns a confirmation request. Ask displays the original text alongside an explicitly labelled possible intended question. Only the learner's confirmation opens the corrected question and the deterministic solver. Both endpoints return 422 with the same confirmation contract without spending provider quota. Added whitespace/`integer values of n` support does not change the polynomial algorithm. Extra constraints are never discarded to manufacture an exact answer. This is not a general OCR-repair system.

## Mistake lifetime

A new owner/board/class/subject-scoped unresolved queue records checked incorrect objective/numeric attempts from mock submissions, finishing/time expiry, correction attempts and supported practice/PYQ/board-key quizzes. Repeated identical submissions are deduplicated. A checked correct answer removes the corresponding queue entry; simply opening an AI solution, self-marking, or editing a draft does not. Queue questions have no dismissal button and can be retried directly from Mistakes. Legacy manually flagged hard/SRS cards remain separate.

Sources without a usable verified/computed key or descriptive rubric remain pending review, not automatically wrong. Board-key MCQs can have known correctness but unknown supplied marks; no mark is invented. Queue corrections do not rewrite the original completed mock score. Persistence and backup use the existing owner-scoped study storage. This is local practice storage, not a proctored/tamper-proof assessment service.

## Extended output profile

`solve-timing.js` is shared by browser and both solve endpoints. English/Hindi/Sanskrit, explicit long compositions/detailed requests and prompts over 600 characters use a 140-second total request budget, 70-second model slices, up to 12,288 output tokens and a 165-second browser transport limit. Other requests keep the prior 50/24/65-second profile and 6,144 tokens. Repair, fallback and cancellation still share one deadline.

`vercel.json` requests a 180-second duration for the solve function specifically; all other endpoints retain their configured 60-second limit. Deployment/project-plan acceptance has not been verified. The budget increase does not guarantee provider availability, factual correctness, or adherence to word limits. No production settings were changed through connected apps. Asset version: 26d4.

## Checks

- Unit regressions: malformed notation never auto-solves; explicit corrected question has the four correct solutions; queued wrong attempts persist/deduplicate; pending/self-assessed answers cannot clear them; correct checked retry resolves them.
- Provider virtual clock: a 60-second composition is allowed and receives the larger output budget, while ordinary expiry/fallback/cancellation regressions still pass.
- Browser at 1280px and 390px: confirmation with zero provider calls; wrong mock answer -> Mistakes -> reload/scope isolation -> viewing solution keeps it -> wrong retry keeps it -> correct retry removes it; a 90-second English response remains active and completes.
- Existing share/mock scoring and science-timeout desktop/mobile regressions pass; serverless, exact square, grading and provider-budget unit checks pass. These tests mock the provider; no live deployment verification is claimed.
