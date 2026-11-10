# Sending Class 12 Physics data

The format for sending Physics material to Upay. There are three kinds of
material. Send any mix of them:

| You have | Send | Format |
| --- | --- | --- |
| NCERT textbook chapters or CBSE papers as **PDFs** | the files themselves | no format needed — see §1 |
| **Questions** you have typed out | a spreadsheet (`.xlsx` / `.csv`) or JSON | §2 |
| **Chapter outlines** you have written | JSON | §3 |

Templates you can copy:

* `tools/curate/physics-questions.template.csv` — open it in Excel or Google Sheets.
* `tools/curate/physics-data.template.json` — chapters and questions in one file.

Before you send a file, you can check it (optional):

```bash
python3 tools/curate/validate-physics-data.py my-physics.json   # or .csv / .xlsx
```

`OK` means the format is correct. The checker cannot tell whether the physics
itself is right; a person still has to review that.

---

## 1. PDFs: just upload them

| File | Used for |
| --- | --- |
| NCERT Physics Part I: `leph101.pdf` … `leph108.pdf` (chapters 1–8) | figures cropped onto the chapter pages, outline check |
| NCERT Physics Part II: `leph201.pdf` … `leph206.pdf` (chapters 9–14) | same |
| CBSE question papers, e.g. `55_1_1_Physics.pdf`, plus the marking scheme | questions for the bank (§2), diagrams for those questions |

* Keep NCERT's own file names. A `_compressed` suffix is fine.
  **Note:** `leph201.pdf` is chapter **9**, not chapter 2 (see §4).
* Every numbered figure is cropped from the page, checked against that page,
  and only then added. Nothing is redrawn or generated. If a PDF is an image
  scan with no text layer, its captions can't be read, so its figures are left
  out rather than guessed. This is how the Biology chapters were handled.
* Don't send screenshots of figures. A crop has to come from the PDF itself so
  it can be checked against the page.

---

## 2. Questions

Use one spreadsheet row, or one JSON object, per question. The sheet's column
names are the same as the JSON keys.

| Field | Needed | Value |
| --- | --- | --- |
| `chapter` | always | NCERT chapter number **1–14** (§4). Not the site id 601–614. Use `0` only if you don't know the chapter. |
| `type` | always | `mcq` · `assertion-reason` · `very-short` · `short` · `case-study` · `long` |
| `from` | always | `board-paper` · `sample-paper` · `ncert` · `exemplar` |
| `question` | always | The English text, exactly as printed. |
| `marks` | board / sample paper | `1`–`5`. MCQ and A-R = 1, very-short = 2, short = 3, case-study = 4, long = 5 |
| `year` | board / sample paper | The year the exam is held: the March 2025 paper → `2025`; the 2026–27 sample paper → `2027`. |
| `paper` | board paper | The code printed on the paper, e.g. `55/1/1` |
| `q_no` | optional | The question number in the paper, or an exercise number such as `"3.10"` |
| `options` | `mcq` (optional for A-R) | 4 texts in A, B, C, D order. In a sheet: columns `option_a` … `option_d` |
| `answer` | `mcq` / A-R | The letter `A`–`D`. For other types: optional final answer or worked answer |
| `difficulty` | optional | `1` easy · `2` medium · `3` hard |
| `hindi_question` | optional | Unicode Hindi only (see the rules below) |
| `hindi_options` | optional | 4 Hindi texts. In a sheet: `hindi_option_a` … `hindi_option_d` |
| `figure_file` + `figure_page` | if the question has a diagram | The PDF the diagram is printed in, and its page number. Upload that PDF too. |
| `id` | optional | Your own unique id, so you can update the question later |

### Examples

Two real questions, with sources you can check:

```json
{ "chapter": 11, "type": "mcq", "marks": 1, "from": "board-paper", "year": 2025, "paper": "55/5/1", "q_no": 7,
  "question": "Light of which of the following colours will have the maximum energy in a photon associated with it?",
  "options": ["Red light", "Yellow light", "Green light", "Blue light"],
  "answer": "D" }
```

```json
{ "chapter": 1, "type": "short", "from": "ncert", "q_no": "1.1",
  "question": "What is the force between two small charged spheres having charges of 2 × 10⁻⁷ C and 3 × 10⁻⁷ C placed 30 cm apart in air?",
  "answer": "6 × 10⁻³ N (repulsive)" }
```

These four only show the format. Put your own text where the `…` is.

With Hindi:

```json
{ "chapter": 3, "type": "very-short", "marks": 2, "from": "board-paper", "year": 2025, "paper": "55/…",
  "question": "Define … . Write its SI unit.",
  "hindi_question": "… की परिभाषा दीजिए। इसका SI मात्रक लिखिए।",
  "answer": "…" }
```

Assertion-reason:

```json
{ "chapter": 13, "type": "assertion-reason", "marks": 1, "from": "sample-paper", "year": 2026,
  "question": "Assertion (A): … Reason (R): …",
  "answer": "C" }
```

If you leave out `options` on an assertion-reason question, the standard CBSE
options are used:

* A: Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of the Assertion (A).
* B: Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of the Assertion (A).
* C: Assertion (A) is true, but Reason (R) is false.
* D: Assertion (A) is false and Reason (R) is also false.

If your paper words these differently, include its own `options`.

Case study:

```json
{ "chapter": 9, "type": "case-study", "marks": 4, "from": "sample-paper", "year": 2026,
  "question": "Read the passage … and answer the following. (i) … (ii) … (iii) … OR (iii) …",
  "answer": "(i) … (ii) … (iii) …" }
```

With a diagram:

```json
{ "chapter": 3, "type": "short", "marks": 3, "from": "board-paper", "year": 2025, "paper": "55/…",
  "question": "In the circuit shown, find …",
  "figure_file": "your-paper.pdf", "figure_page": 9 }
```

### Writing rules

* **One question per row.** An internal choice stays in the same row:
  `(a) … OR (b) …`.
* **Case studies** take one row, with the parts written inline as
  `(i) … (ii) … (iii) …`. The site doesn't keep line breaks.
* **Symbols:** type the character itself: `×` `⁻¹` `²` `μ` `Ω` `λ` `θ` `π` `ε₀`
  `μ₀` `√` `∝` `°` `Å`. Don't use LaTeX (`$…$`, `\frac`); the site would show it
  as raw text.
* **Hindi must be Unicode.** Text copied from KrutiDev or Chanakya PDFs comes
  out like `ok;q esa ,d&nwljs`, and the checker rejects it.
* **An MCQ answer is a letter** (`"D"`), never the option text.
* **Excel:** set the `q_no` and `paper` columns to *Text* before typing.
  Otherwise Excel turns `3.10` into `3.1`. Send the `.xlsx`, or save it as
  *CSV UTF-8*.
* **`from` must be true.** The bank shows every question with its source (board
  paper, sample paper, or "NCERT · practice"), so there's no place for questions
  that came from somewhere else.

Where questions show up: in **Past papers** (`#/pyq`, which can be filtered by
chapter) and in **mock tests**. Physics chapter pages show the outline and
figures only; they don't list questions.

---

## 3. Chapter outlines

All 14 chapters already have a reviewed outline. Send one only if you want to
**replace** it. A chapter you don't send stays as it is.

```json
{
  "subject": "physics",
  "class": 12,
  "chapters": [
    {
      "chapter": 1,
      "title": "Electric Charges and Fields",
      "summary": "2–3 sentences, 150–320 characters.",
      "sections": ["6 to 10 topics, in teaching order", "…"],
      "objectives": ["Exactly three.", "Each one sentence.", "Each starts with a verb."],
      "terms": ["8 to 16 key terms", "no duplicates", "…"]
    }
  ]
}
```

* English only. Hindi stays in the chapter title fields the site already has.
* **Leave out** `id`, `unit` and `unit_title`; they're filled in from the
  chapter number.
* **Don't add** `marks`. Physics pages show no unit marks unless an official
  CBSE breakdown is supplied separately.
* **Don't add** `figures`. Figures only come from the PDFs (§1).
* The full template shows chapter 1 exactly as it is on the site now:
  `tools/curate/physics-data.template.json`.

---

## 4. Chapter numbers

| No. | NCERT chapter | Unit | NCERT PDF |
| --- | --- | --- | --- |
| 1 | Electric Charges and Fields | 1 · Electrostatics | `leph101.pdf` |
| 2 | Electrostatic Potential and Capacitance | 1 · Electrostatics | `leph102.pdf` |
| 3 | Current Electricity | 2 · Current Electricity | `leph103.pdf` |
| 4 | Moving Charges and Magnetism | 3 · Magnetic Effects of Current and Magnetism | `leph104.pdf` |
| 5 | Magnetism and Matter | 3 · Magnetic Effects of Current and Magnetism | `leph105.pdf` |
| 6 | Electromagnetic Induction | 4 · Electromagnetic Induction and Alternating Currents | `leph106.pdf` |
| 7 | Alternating Current | 4 · Electromagnetic Induction and Alternating Currents | `leph107.pdf` |
| 8 | Electromagnetic Waves | 5 · Electromagnetic Waves | `leph108.pdf` |
| 9 | Ray Optics and Optical Instruments | 6 · Optics | `leph201.pdf` |
| 10 | Wave Optics | 6 · Optics | `leph202.pdf` |
| 11 | Dual Nature of Radiation and Matter | 7 · Dual Nature of Radiation and Matter | `leph203.pdf` |
| 12 | Atoms | 8 · Atoms and Nuclei | `leph204.pdf` |
| 13 | Nuclei | 8 · Atoms and Nuclei | `leph205.pdf` |
| 14 | Semiconductor Electronics: Materials, Devices and Simple Circuits | 9 · Electronic Devices | `leph206.pdf` |

---

## 5. After it arrives (ingest notes)

1. Run `validate-physics-data.py`. It must report `OK`.
2. **Outlines:** merge them into `assets/notes/outlines.json["physics"]`, then
   run `python3 tools/curate/build-physics-outlines.py`.
3. **Questions:** write a new pack, `assets/js/data/pyq-physics-extra.js`, and
   load it in the `physics` pack in `assets/js/boot.js` after `physics12.js`.
   Store each question in the shape the site actually renders:

   | Sent | Stored | Why |
   | --- | --- | --- |
   | `chapter` N | `ch: 600 + N` | Physics chapter ids are 601–614. |
   | `type` | `kind` 1–6 (mcq 1, assertion-reason 2, very-short 3, short 4, long 5, case-study 6) | `PYQ_KIND` only labels numeric kinds. |
   | `options` | `opts: [{en, hi}, …]` | `hasOpts()` only renders arrays. The object form used in `pyq-physics-2025.js` shows no options at all. |
   | `answer` letter | `ans:` that option's English text | The quiz marks an answer by comparing `ans` with the option text. A bare letter never scores. |
   | `from` / `year` / `paper` / `q_no` | `src`, `y`, `set`, `q` | For `ncert` and `exemplar`, `src` starts with `NCERT`, so the question is labelled "practice, not board-verified". |
   | `question`, `hindi_*` | `en`, `hi`, `opts[i].hi`, kept verbatim | `cleanQText()` deletes standalone 4–5 digit numbers (`1000 W` becomes `W`) and collapses spaces. These rows need a bypass flag in `pyqQuestionText()`. Don't reuse `paperCode` for this: it switches the card to the Accountancy layout. |

4. **PDFs:** crop each figure and check it against its page. Then add it to
   `assets/img/notes/manifest.json` and attach it to the chapter's outline.
   Never delete a source PDF until its sha256 has been checked against the
   ledger.
5. Run `tools/check/outline_notes.py` and bump the cache token (`index.html`,
   `assets/js/boot.js`, `sw.js`). Then open a PR and merge it; Vercel deploys
   `main` automatically.
