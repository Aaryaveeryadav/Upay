# A question too big for one request

A long or complex question used to end one way:

> The AI took too long to answer.

The single call had a fixed budget (`serverMs`, 50 s normally, 140 s for long
writing tasks). When the provider ran past it, the whole answer was thrown away
— even when three of the four methods had already been written.

## What happens now

The first attempt is unchanged, so ordinary questions still cost exactly one
call. **If that attempt fails for any reason** — the client aborts at
`clientMs`, the provider times out, or the model returns fewer than four usable
methods — the app asks again in parts:

| part | what it returns | budget |
| --- | --- | --- |
| `core` | the answer, its summary, the check, and **one** complete method | 42 s server / 50 s client |
| `approach` | **one** more method, told which methods are already shown | 38 s server / 46 s client |

`assets/js/solve-parts.js` owns that sequence:

- `next()` builds each request (`part:'core'`, then `part:'approach'` with
  `index`, `taken` and the settled `core.answer`),
- `absorb()` folds a part into the one answer object, refusing to show the same
  method twice and never letting a later part overwrite the settled answer,
- `status()` produces the banner ("The answer is ready — the remaining methods
  are still being written (1 of 4)").

The card is re-painted after every part, so the student sees the answer as soon
as it exists. When the loop ends short of four methods, the banner says how
many arrived and a **Request the missing methods** button resumes from where it
stopped (`_parts` on the answer keeps the count).

## Why parts help

- Each request asks for one method instead of four, so its output is roughly a
  quarter of the size and finishes inside the budget.
- A failure costs one method, not the answer: `absorb` keeps everything that
  arrived.
- The prompt for later parts carries the settled answer, so the methods are
  forced to agree with it instead of being re-derived from scratch.

## Cost

Split mode is a fallback, not the default: the first whole-answer call runs
exactly as before. Only when it fails does the app spend extra calls — up to
four more — and only to salvage an answer the student would otherwise not get.

## Tests

- `node tools/check/solve_parts.js` — the request sequence, de-duplication by
  method name, the banner text, a lost part keeping the answer, and the retry
  resuming rather than restarting.
- `tools/check/serverless_smoke.js` — `part:'core'` and `part:'approach'` return
  one method with no four-approach requirement, the smaller output budgets are
  requested, the prompt states the part number and the settled answer, an empty
  part is still a 502, and the whole-answer path still demands four.
- `tools/check/worked_figure_browser.js` (case 7) — the whole-answer call
  returns 504, and the card still ends up with the answer, four methods and no
  "took too long" message.
