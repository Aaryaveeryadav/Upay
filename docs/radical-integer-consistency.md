# Exact integer radical sums

The shared browser/server exact solver now also supports the explicitly parsed class:

`Find all integers x for which √(x+a) + √(b-x) is an integer.`

It accepts `such that`, `integer values of x`, `sqrt(...)` and simple TeX square roots. Constants are nonnegative integers with 1 ≤ a+b ≤ 1000. The parser consumes the entire question; extra constraints, real-valued domains, changed coefficients and unsupported forms are refused, not silently solved as another question.

For integer u,v ≥ 0 with u+v > 0, an integer sum √u+√v=k implies 2k√u=k²+u−v, hence √u is rational and therefore an integer; √v is then also an integer. Exact square-pair checks over the full finite domain produce the canonical solution set. All four complete explanations end with that same set: square-pair proof, completed bounded-k cases, exhaustive verification, and a substitution/completeness certificate. The latter two are honestly labelled checks rather than unrelated new derivations.

Regression: a=6, b=19 gives x ∈ {−6, 3, 10, 19}. x=15 and 18 fail the original expression. The k=6 case has (u−v)²=504, not an integer square. No floating-point near-integer sum is accepted by the solver; candidate roots must square back exactly to the integer radicands.

Existing shared entry points supply this answer in Ask, practice/PYQ and both API implementations. Ask also replaces stale AI result state, protecting display, speech and copy. Integer radical cues route to maths despite a wrong selected subject; selected syllabus is unchanged. Asset cache version is 26d1.

Tests: `radical_integers.js` covers the reported answer, four equal conclusions, notation, unsupported constraints and 960 small-domain comparisons against an independent original-expression numerical oracle. `serverless_smoke.js` confirms no provider call, even with Social selected. Desktop/mobile `square_integer_browser.js` checks four-way agreement and stale result correction; routing browser regression also passes. Existing square and prose tests pass.

For arbitrary AI-only questions, the shared prompt now explicitly requires completed methods, exact candidate substitution and agreement. This is not a universal mathematical verifier: deterministic guarantees apply only to the supported exact classes. No production deployment or live-provider verification is claimed.
