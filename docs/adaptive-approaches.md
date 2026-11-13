# Useful approaches and answer layout

The `useful-approaches-v1` solve policy replaces the four-approach minimum. One complete, useful answer is sufficient; further approaches must add substantive value. Composition and theory default to one developed response, not outlines or repeated styles. Both solve endpoints accept one or more usable approaches and repair only when none survives validation. Completeness, deduplication, source/language and consistency guards remain. Cached answers use the new policy version.

Prose lists collapse template whitespace while retaining explicit text line breaks. Paragraphs have compact margins and no numbered-step connector. Accordion enhancement removes all previously nested next-method controls before rebuilding them; next/show-all controls reflect the current sibling/open state.

Regression checks: serverless smoke accepts natural counts of one, two and three, collapses duplicates and rejects unusable drafts. The adaptive browser check covers 1280px and 390px layouts, paragraph gaps and connector suppression, twelve close/open cycles, next/show-all state, and a single-answer response without extra controls. It runs in trust-checks CI. Task-routing, language-integrity, prose, exact solver and mistake-queue regressions also passed locally. Mocked responses do not establish live provider quality or deployment status.
