# Symbolic LCM/HCF quotient routing

The reported question p = a³b², q = ab³ was incorrectly sent to the numeric
HCF/LCM solver. Its number extractor saw the exponents 3 and 3 as input integers,
so the app displayed HCF = 3, LCM = 3 instead of the requested quotient.

The router now detects symbolic prime-power HCF/LCM questions before numeric
extraction. Supported two-prime monomials are solved with maximum/minimum
exponents and the quotient is returned as the final answer, with three developed
explanation styles: exponent rule, difference shortcut and product-identity
check. The direct HCF solver entry is guarded too. Unsupported symbolic forms
are explicitly not attempted rather than passed to numeric arithmetic.

For distinct primes a,b, the reported problem has LCM a³b³, HCF ab², and quotient
a²b. Because the original wording does not say distinct, the answer also notes
that if a=b the quotient is a. The app does not quietly certify the unstated
assumption. Other exponent pairs compute the corresponding equal-prime caveat.

Supported syntax includes caret, braced caret and single superscript exponents,
optional multiplication separators and reversed a,b order. Missing prime
conditions, additive/extra-factor expressions and unrelated symbolic HCF tasks
are refused, not guessed. This is a bounded offline solver, not a full algebra
engine. Numeric HCF/LCM behavior is unchanged.

Checks: exact reported question, direct entry, notation variants, unsafe-input
refusal, 256 exponent combinations compared with numeric gcd/lcm for a=2,b=3,
and English/Hindi browser rendering at 1280/390px with mocked unavailable AI.
The browser asserts three approaches, symbolic final answer and the caveat;
there are no real-provider/production correctness claims. Cache version 26c2
versions both modified solver scripts and updates the preload. No imported
subject banks or source figures changed.
