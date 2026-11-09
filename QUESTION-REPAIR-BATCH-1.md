# Question-bank repair — batch 1

Repairs for the four data defects found during the inventory pass. Nothing was
invented: every record kept is either untouched source text or source text with
known print debris removed. Everything held back is listed by id so it can be
reviewed or restored.

## 1. What was actually wrong

| Defect | Reality found | Fix |
|---|---|---|
| 25 duplicate ids | Only 17 real id collisions, and both sides held different questions | Later record given a fresh id — nothing lost |
| Chemistry "damaged" text | 84 looked odd, but 65 were OCR stems missing their options (not junk). Real damage was **print debris** on 68 records | Debris stripped from text |
| Class 10 English ch mapping | All 872 records unmapped — but they are *whole subsections*, not questions | Not remapped: nothing verifiable to map against. **Filter bug fixed instead** (see 3) |
| 5,529 unmapped questions | Most are legitimately unmapped board papers | Made visible honestly; no fabricated mapping |

## 2. Records repaired or held back

`question bank: 11,539 → 11,312`

| Kind | Subject | Count |
|---|---|---|
| Blank in both languages | 10/hindi | 131 |
| Exact duplicate within the same paper + set | 10/hindi | 73 |
| Exact duplicate within the same paper + set | 10/maths | 9 |
| Table/figure cell promoted to a question | 10/social | 12 |
| Table/figure cell promoted to a question | 10/hindi | 1 |
| Exact duplicate within the same paper + set | 10/social | 1 |
| **Total held back** | | **227 (1.97%)** |
| Print debris removed from text | 12/physics | 43 |
| Print debris removed from text | 12/chemistry | 25 |
| Id given a fresh name (content kept) | 10/social | 17 |

### Why the drops are defensible

* **Blank (131)** — text is empty in both `en` and `hi`, so the record can never
  render. All in Class 10 Hindi sample papers.
* **Duplicates (83)** — identical `en` **and** `hi` **and** answer, in the same
  paper and set. Pair records such as `bd10` / `bd10b` were deliberately *kept*:
  those are the two "OR" alternatives of one question.
* **Table cells (13)** — a table row that the PDF extractor promoted to a
  question, e.g. `"Handloom weaver working in his/her house 70"`. No question
  signal, no options. Real MCQs that merely lost their options were kept.

### Why the text repairs are defensible

Only known print chrome is removed, and nothing else:

```
before ... "what is the net charge on the sphere?  Reprint 2026-27 Physics"
after  ... "what is the net charge on the sphere?  Physics"

before ... "electrostatic energy is lost in the process?  Reprint 2026-27"
after  ... "electrostatic energy is lost in the process?"
```

## 3. The bug that mattered more than any of the above

`app.js` built a chapter-filtered test with:

```js
pool = pool.filter(q => q.ch == null || q.ch === 0 || S.test.chapters.some(...));
```

So selecting **one** chapter pulled in **every unmapped question in the subject**.
Because `boot.js` maps unmapped Class 10 records to `ch = 0`, this meant:

| Subject | Unmapped share | A single-chapter test before the fix |
|---|---|---|
| 10/english | 99.3% | 872 questions from every paper |
| 10/hindi | 76.8% | 775 questions from every paper |
| 10/social | 75.8% | 1,016 questions from every paper |

Class 10 Social Science, chapter 18: a chapter with **6** questions produced a
pool of **1,022**. After the fix it is **6**. Unmapped questions still appear when
the chapter filter is left on "All".

## 4. How it is implemented

The source data files are **untouched**. A generated sidecar holds the repairs:

* `tools/curate/build-curation.js` — computes the corrections from the live data
* `assets/js/data/question-overrides.js` — the generated sidecar (40 KB)
* `assets/js/boot.js` — `applyCuration()` applies it after every pack loads,
  guarded so it runs once per record
* `tools/check/question_quality.py` — regression check, also fails if the
  sidecar goes stale against the data

## 5. Verification

```
question_quality       PASS   227 held back, 68 repairs, 17 renames
chapter_text           PASS
english12_sources      PASS
economics_sources      PASS
source_papers          PASS
```

Boot-order DOM run over all 10 subjects:

```
TOTAL records      : 11310
unique ids         : 11310 | duplicate ids: 0
blank both langs   : 0
print debris left  : 0
page errors        : 0
```

Route sweep, 20 class/subject/language combinations × 5 views:

```
renders: 100 | with errors: 0
```

## 6. Still open (deliberately not "fixed")

These need real source material, so inventing them is out of bounds:

* **Class 10 English structure** — 872 records are whole subsections containing
  `Attempt any Ten…` plus `(i)(ii)(iii)`. Splitting them into real questions needs
  the source papers to define the boundaries; a guess would fabricate questions.
* **Class 12 Chemistry OCR formulas** — flattened to `C H OH 2 5`, `SO Cl g`. There
  is no `chapterTags` or `paperCode` to rebuild from, and re-deriving formulas is
  content generation, not repair.
* **Answer keys** — 771 / 11,539 (6.7%). The chosen approach is AI-generated keys
  marked unverified; not started in this batch.
* **Unmapped 2,663 Class 10 records** — visible under "All", excluded from
  chapter tests. Mapping them needs a source that ties each item to a chapter.
* **Empty areas** — Class 12 English and Economics have 0 questions despite 191
  test papers; Class 11 has 0; Class 12 Biology is a name-only stub.
