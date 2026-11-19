# Question audit — what happens to a question when it arrives

Run it with:

```bash
node tools/check/question_audit.js
```

It walks 26 question shapes through the same decision the Ask screen makes and
prints which pipeline takes each one. It is in
`.github/workflows/trust-checks.yml`, so a routing change that silently sends a
matrix to the model fails CI.

## The four pipelines

| pipeline | meaning |
| --- | --- |
| `exact` | the app answers it itself, from the question's own numbers (no provider call) |
| `repair` | it looks like matrices but cannot be read: the student confirms the values |
| `figure+ai` | the model writes the prose; the drawing and its numbers are computed here |
| `ai` | the model takes the question unchanged |

## The audit table

```
question type                         subject        pipeline    verdict
--------------------------------------------------------------------------------
matrix · photo, digits lost           maths          repair      ok
matrix · flat rows, complete          maths          exact       ok
matrix · canonical AX = B             maths          exact       ok
matrix · XA = B                       maths          exact       ok
matrix · determinant                  maths          exact       ok
matrix · inverse                      maths          exact       ok
matrix · product, no word "product"   maths          exact       ok
matrix · singular                     maths          exact       ok
matrix · theory question              maths          ai          ok
matrix · question with no numbers     maths          ai          ok
arithmetic · perfect square           maths          exact       ok
arithmetic · integer radical sum      maths          exact       ok
arithmetic · √1764 (no local solver)  maths          ai          ok
mensuration · cylinder                maths          figure+ai   ok
mensuration · cone                    maths          figure+ai   ok
mensuration · hemisphere              maths          figure+ai   ok
coordinate geometry · distance        maths          figure+ai   ok
trigonometry · tower                  maths          figure+ai   ok
optics · convex lens                  physics        figure+ai   ok
optics · concave mirror               physics        figure+ai   ok
circuits · resistors                  physics        figure+ai   ok
hindi · poem meaning                  hindi          ai          ok
chemistry · balance equation          chemistry      ai          ok
physics · statement of law            physics        ai          ok
biology · process                     biology        ai          ok
arithmetic · data rows, not a matrix  maths          ai          ok
--------------------------------------------------------------------------------
26 questions audited: 9 answered exactly here, 1 sent back for confirmation,
8 with a computed figure, 8 to the model.
```

## The invariants that are actually asserted

1. **A matrix question never reaches the model as line-soup.** It is solved
   here (all four operations) or handed back for confirmation. This is the
   failure the audit exists for: a photo flattened `AX = B` into
   `2 1 -1 41 / : 2 1|X= : 0]. / 3 -1 2 8 5` and that string was forwarded.
2. **A complete flat paste is rebuilt**, not refused: rows of numbers that
   force one reading become `A = [[…], […]]` / `B = [[…], […]]` and are then
   solved exactly. This is also how the OCR transcript is post-processed, so the
   question the student sees and the question the engine reads are the same.
3. **A ragged paste is never repaired by invention.** In the reported photo a
   digit had genuinely been lost (`2 1 -1 41` is `2 1 -1` and `4 1` run
   together, and the middle line lost entries); `fromRows` answers
   `reason: 'ragged'` and the student confirms.
4. **Ordinary number rows are not a matrix.** `fromRows` requires a matrix
   signal — the word matrix/determinant/inverse, bracket fragments from the
   scan, `X` in an equation, or two labelled blocks — and the reconstruction
   must solve with a passing substitution check. A shopping list of numbers
   stays a word problem.
5. **Theory stays theory.** "Explain matrix multiplication" and "What is a
   matrix?" have no numbers and go to the model.

## Known gaps (reported honestly, not hidden)

- A plain surd such as √1764 has no local solver; it goes to the model.
- `figure+ai` questions get a figure computed here but the written answer is
  the model's, so the four-approach structure is not guaranteed for them.
- Hindi, chemistry and biology have no local solver at all.

Each of these is visible in the table above rather than silently passing.

## When a question is too big for one request

See [split-answers.md](split-answers.md): if the single call cannot finish, the
answer is fetched in parts (the answer plus one method, then one method per
request) and whatever arrives is kept.
