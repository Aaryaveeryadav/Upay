# Exact positive-integer square problems (26c7)

The reported AI draft claimed n=191 for n²+10n+2026, but substitution gives
40417, not a square (201²=40401, 202²=40804). The complete solution set is
15,27,327,995, with squares 49²,55²,335²,1001² respectively.

## Bounded exact solver

square-integers.js is one shared browser/Node module. It strictly parses the
supported question wording asking for ALL POSITIVE integers n for which
n²+bn+c is a perfect square (b nonnegative/even <=2000 and 0<c−(b/2)²<=10⁷).
Unsupported variants/additional conditions/odd linear terms return null, not a
guessed solution. Original source banks and official keys are not edited.

With h=b/2 and D=c−h², write m²−(n+h)²=D. For n>0 and h>=0, m>n+h>0.
Thus u=m−n−h and v=m+n+h are positive, u<v, uv=D, and have matching parity.
Enumerating divisors through √D enumerates every pair; n=(v−u)/2−h is retained
only when positive and exact substitution also succeeds. This proves
completeness rather than merely checking a few candidates. Three explanation
styles are given: factor derivation, systematic divisor enumeration (labelled
as the same identity), and substitution/completeness verification.

## Integration and trust

- Ask returns exact results immediately without a provider call. Rendering old
  supported wrong drafts also repairs the shared state used by Listen/Copy.
- Practice and PYQ/revealed/cached answers use the same calculation, ahead of
  old answer caches. The narrowly recognized intact expression bypasses a false
  positive in the old corruption display gate; other imports are unchanged.
- Both server and serverless solve paths preserve existing authentication, then
  return exact supported Maths results before cache/provider access. No provider
  quota is spent. Other subjects do not use this branch.
- UI explicitly says Solved by exact calculation and identifies the arithmetic
  check. It does not mislabel generated output as an official answer key or AI
  verification. A proof flow remains available.

## Checks

- Exact reported set/roots; 191 rejected; strict unsupported input refusal;
  900 supported parameter cases checked against bounded brute-force search.
- Serverless contract test verifies exact output and zero provider calls.
- Browser 1280/390px: Ask, stale 191 draft including speech state, Hindi,
  practice and PYQ; all three explanations; zero calls to a deliberately wrong
  mock provider. The pasted-question timing regression uses a separate
  unsupported prompt now that the reported example is handled exactly.
- Existing formatting, symbolic quotient and mocked serverless checks pass.
- No claim is made to verify arbitrary AI answers; unsupported questions still
  require separate checking. No real provider or production deployment test.
