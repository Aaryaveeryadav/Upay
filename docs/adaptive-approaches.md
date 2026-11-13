# Four-approach policy update

The active policy is now `four-approaches-v4`, superseding the natural-count policy below. Both solve endpoints require at least four distinct usable complete approaches after validation, attempt one repair for short drafts, and return a retryable error rather than padding or accepting a short response. Frontend AI acceptance and cached-answer versions match. Composition alternatives must be complete drafts; theory alternatives must each cover the whole question. Verification/explanation styles must be labelled honestly when four independent derivations do not exist.

Local/offline starter solutions and fixed question-bank answer keys are not manufactured into four methods; short local solutions remain explicitly labelled as starters. The minimum applies to successful complete AI answers, not clarification requests or unavailable-provider errors.

## Historical layout changes (count policy superseded)

# Useful approaches and answer layout

The `useful-approaches-v1` solve policy replaces the four-approach minimum. One complete, useful answer is sufficient; further approaches must add substantive value. Composition and theory default to one developed response, not outlines or repeated styles. Both solve endpoints accept one or more usable approaches and repair only when none survives validation. Completeness, deduplication, source/language and consistency guards remain. Cached answers use the new policy version.

Prose lists collapse template whitespace while retaining explicit text line breaks. Paragraphs have compact margins and no numbered-step connector. Accordion enhancement removes all previously nested next-method controls before rebuilding them; next/show-all controls reflect the current sibling/open state.

Regression checks: serverless smoke accepts natural counts of one, two and three, collapses duplicates and rejects unusable drafts. The adaptive browser check covers 1280px and 390px layouts, paragraph gaps and connector suppression, twelve close/open cycles, next/show-all state, and a single-answer response without extra controls. It runs in trust-checks CI. Task-routing, language-integrity, prose, exact solver and mistake-queue regressions also passed locally. Mocked responses do not establish live provider quality or deployment status.
