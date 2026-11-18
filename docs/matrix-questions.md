# Matrix questions — read the grid, then solve it exactly

A matrix question is a grid of numbers and one operation. Pasted out of a PDF or
read by OCR, the grid flattens:

```
Hard Matrix Question: 2 1 -1 41 : 2 1 | X = : 0]. 3 -1 2 8 5
```

A model reading that sentence cannot see a 3×3 matrix and a 3×2 matrix; in the
report that prompted this work it called them 2×2 and 2×3, then returned three
entries where X needs six. The fix cannot be "ask the model harder" — the
values are not in the text any more.

So the app reads the matrices itself, computes the answer itself, and draws the
matrices it used.

![A 3×3 matrix times X equals a 3×2 matrix, with X = A⁻¹B computed in exact fractions](images/worked-figure-matrix.png)

## What happens on Ask

1. **`UP.matrices.isMatrixQuestion(text)`** — the word *matrix* (or आव्यूह) plus
   at least one number. Theory questions ("explain matrix multiplication") are
   left to the model.
2. **`UP.matrices.solve(text)`** parses every bracketed block — `[[1,2],[3,4]]`,
   `[1 2; 3 4]`, `((1,2),(3,4))`, one row per line — and reads the operation
   from the words: `A X = B`, `X A = B`, `|A|`, `A⁻¹`, `AB`.
3. **If it solved**, the question is restated in an unambiguous form before
   anything else sees it:

   ```
   Find the matrix X if A X = B, where A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]]
   and B = [[4, 1], [7, 0], [8, 5]].
   ```

   The model's prose is written against that sentence, and the figure below is
   drawn from the same numbers. If the written answer does not repeat any entry
   of the computed X, the figure says so (`worked-figure-mismatch`).
4. **If it could not**, nothing is guessed. The student gets a card with the
   text as it was read and two grids to fill (or the `A = [1 2; 3 4]` form).
   Those values are solved and drawn, and the question is then asked normally.

## The arithmetic

Exact rational arithmetic on `BigInt` fractions, never floats:

- Gauss–Jordan elimination on `[A | B]` gives `X` for `AX = B`; `XA = B` is
  solved as `AᵀXᵀ = Bᵀ`.
- `|A|` comes from the same elimination (product of the pivots, with the sign
  of every row swap), so the determinant on the figure is the one used to
  invert.
- Every solve is verified: `A·X` (or `X·A`) is recomputed and compared with `B`
  entry by entry. `check: true` in the spec means that comparison passed.
- Answers stay exact: `37/18`, `10/9`, `−7/9` — not `2.0555555555555554`.

For the question in the report:

```
A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]]       B = [[4, 1], [7, 0], [8, 5]]
|A| = 18
X = [[37/18, 10/9], [29/18, -7/9], [31/18, 4/9]]
A·X = B                                        (checked entry by entry)
```

## What is refused

- `A` not square, or `B` with the wrong number of rows (or columns for `XA`);
- `|A| = 0` — no unique solution, said plainly rather than divided by zero;
- more than four rows or columns, or a block where one row has a different
  length;
- a paste with no complete block left: that goes to the repair card, not to a
  guessed matrix.

## Where it lives

- `assets/js/matrices.js` — parser, exact solver, canonical restatement,
  figure spec.
- `assets/js/figures.js` — `matrixFig`, the bracketed grids.
- `assets/js/app.js` — `askAI` restates or asks for the values;
  `workedFigureFor` draws the matrix before any other figure family;
  `renderAnswer` renders the repair card.
- `lib/solve-policy.js` (`four-approaches-v7`) tells the model to state each
  matrix as `[[row],[row]]` with its real shape and never to restate a matrix
  it cannot read.

## Tests

- `node tools/check/matrices.js` — the exact X and |A| for the reported
  question, substitution check, inverse/determinant/product/`XA` cases, the
  figure contents, and the refusals (singular, mismatched, unparsable,
  five-row blocks, non-matrix text).
- `tools/check/worked_figure_browser.js` — at 1280 px and 390 px: the matrix
  figure is drawn with `37/18`, a wrong AI answer raises the mismatch note, a
  flattened paste produces the repair card with no figure, and the confirmed
  values are then solved and drawn.
