# Chapter outline syntax

How a chapter page gets real content, and the exact syntax to add a subject —
written for **Physics** (Class 12, ids 601–614), with Biology and Chemistry as
the two working examples.

---

## 1. Why a chapter page is empty

A Class 12 chapter page renders the outline view only when the chapter object
carries an attached `outline`:

```js
// assets/js/app.js — viewChapter()
const isChemistryOutline = +S.cls === 12 && S.subject === 'chemistry' && ch.outline;
const isSciOutline       = +S.cls === 12 && (S.subject === 'biology' || S.subject === 'physics') && ch.outline;
```

Without one, the page falls through to the generic view, which renders
`ch.concepts`, `ch.formulas`, `ch.pyqs` and `ch.plan` — and if those arrays are
empty, only the one-line `enDesc` is left on screen. That is the whole bug:

```
assets/js/data/physics12.js  →  14 chapters, all of them
{ id: 601, en: "Electric Charges and Fields", weight: 5,
  enDesc: "NCERT Class 12 Physics · Chapter 1: Electric Charges and Fields",
  concepts: [], formulas: [], pyqs: [], plan: [], keywords: {en: [...], hi: [...]} }
```

`#/chapter/601` therefore shows a heading, that sentence, and nothing else — the
same state Biology was in before `biology-outlines.js` existed. It is missing
content, not a render bug.

The chapter object is produced by `UP.catalogue(cls, subject)`
(`assets/js/data-extra.js`), which for Physics returns `UP.physics12`
unchanged from `assets/js/data/physics12.js`.

---

## 2. The record syntax

One record per chapter, kept in `assets/notes/outlines.json` under a new key
(`"physics"`). This is the exact shape the Biology key uses:

```json
{
  "physics": [
    {
      "id": "lephy1201",
      "title": "Electric Charges and Fields",
      "summary": "Static charge is described by Coulomb's law and by the electric field it sets up. Superposition, field lines, dipoles and continuous charge distributions lead to Gauss's law and its use for symmetric charge distributions.",
      "sections": [
        "Electric charge and its properties",
        "Coulomb's law",
        "Electric field and field lines",
        "Electric dipole",
        "Gauss's law and its applications"
      ],
      "objectives": [
        "State and apply Coulomb's law.",
        "Relate field, flux and charge through Gauss's law.",
        "Compute fields for symmetric charge distributions."
      ],
      "terms": [
        "Quantisation of charge",
        "Coulomb's law",
        "Electric field",
        "Electric dipole moment",
        "Electric flux",
        "Gauss's law"
      ],
      "chapter": 1,
      "unit": 1,
      "unit_title": "Electrostatics",
      "marks": 16,
      "source": "NCERT Class 12 Physics, chapter 1"
    }
  ]
}
```

| key | type | rule |
| --- | --- | --- |
| `id` | string | `le` + `phy` + `12` + two-digit chapter → `lephy1201`. Must be unique and stable; the notes library links to `#<id>`. |
| `title` | string | The NCERT chapter title, spelled as in the textbook. |
| `summary` | string | 150–320 characters, 2–3 sentences, English. The checker rejects anything outside that range. |
| `sections` | string[] | 6–10 topics in teaching order. |
| `objectives` | string[] | Exactly 3, each one sentence, starting with a verb. |
| `terms` | string[] | 8–16 key terms, no duplicates. |
| `chapter` | number | 1–14. **Must match the chapter number inside `id`.** |
| `unit` | number | NCERT unit number (Physics: 1–9). |
| `unit_title` | string | Unit name, shown on the chapter header and on the syllabus card. |
| `marks` | number | Optional. The **unit's** theory marks from the published CBSE breakdown — never a per-chapter guess. Chapters sharing a unit repeat the same number; all units together must total 70. **Physics omits it** (see below). |
| `source` | string | `NCERT Class 12 Physics, chapter N`. |

Optional field, used only when a subject has a verified figure inventory:

```json
"figures": [
  { "fig": "1.3", "path": "assets/img/notes/<sha256>.png", "caption": "…", "page": 4, "sha256": "…" }
]
```

Physics ships without `marks`. The unit rows in the copies of the CBSE 042
course structure that were available do not add up to the stated theory total
of 70, so its chapter pages and syllabus cards print the unit name and the paper
code and claim no weightage — a made-up number would be worse than none. The
header renders `Electrostatics` instead of `Electrostatics · 16 marks (unit)`
because the template only adds the mark when `n.marks` exists.

`figures` is **never written by hand** — Biology's build script fills it from
`assets/img/notes/manifest.json`. No Physics crops exist, so leave it out
entirely and the page renders no figure section at all (an empty array instead
prints a "nothing inventoried yet" note).

---

## 3. Wiring a subject (four steps)

### 3.1 The content

Add the `"physics"` key to `assets/notes/outlines.json`, one record per chapter,
in chapter order. Nothing else in that file changes.

### 3.2 The build script

Physics already has one: `tools/curate/build-physics-outlines.py`, which reads
`outlines.json['physics']`, checks the shape and writes
`assets/js/data/physics-outlines.js`, attaching each record to the chapter whose
id is `600 + chapter`. Run it after any edit to the outlines:

```bash
python3 tools/curate/build-physics-outlines.py
```

For another subject, copy `tools/curate/build-biology-outlines.py` (it also
joins the figure manifest) or the physics one (outlines only) and change
three things:

```diff
-bio = json.loads((root / 'assets/notes/outlines.json').read_text())['biology']
+bio = json.loads((root / 'assets/notes/outlines.json').read_text())['physics']

-UNIT_MARKS = {6: 16, 7: 20, 8: 12, 9: 12, 10: 10}
+UNIT_MARKS = {1: 16, 2: 16, ...}      # from the current 042 curriculum, sum 70

-assert sorted(int(k) for k in outlines) == list(range(1, 14))
+assert sorted(int(k) for k in outlines) == list(range(1, 15))
```

and drop the manifest/figures block (no Physics crops), so each record is just
`dict(entry)` plus `record['figures'] = ...` omitted. The generated file is
`assets/js/data/physics-outlines.js`, and the tail that attaches the outline is
the one that already exists for Chemistry:

```js
window.UP = window.UP || {};
(function () {
  var data = { "601": { /* record as above */ }, /* … 602–614 */ };
  UP.physicsOutlines = data;
  (UP.physics12 || []).forEach(function (ch) {
    var o = data[String(ch.id)];
    if (!o) return;
    ch.outline   = o;
    ch.displayNo = o.chapter;   // "Chapter 1" on the header
    ch.n         = o.chapter;
    ch.demand    = 'outline';
    ch.weight    = o.marks;     // unit mark, labelled as a unit mark
  });
})();
```

Build it with `python3 tools/curate/build-physics-outlines.py`, which prints one
line per chapter so a wrong count is visible immediately.

### 3.3 Load it

`assets/js/boot.js`, in the `physics:` pack (order matters — after the chapters
it decorates):

```js
physics: [
  'assets/js/data/physics12.js',
  'assets/js/data/physics-outlines.js',   // outline view per chapter
  'assets/js/data/pyq-physics-2025.js'
],
```

`UP.catalogue()` already returns `UP.physics12` for 12/Physics, so an attached
outline reaches the page with no change to `data-extra.js`.

### 3.4 Render it

`assets/js/app.js` already routes it. `isSciOutline` accepts
`biology` **and** `physics`; the header paper code comes from
`OUTLINE_PAPER_CODE` (`043` chemistry, `044` biology, `042` physics). A subject
with no figure inventory simply shows no figures section and no "All source
figures" button. **No app.js edit was needed to add Physics** — attaching
`n.outline` in its pack is the whole change.

The syllabus card picks the outline up automatically (`chCard()` prints the
summary and badges it with `unit_title`, adding `· N marks (unit)` only when the
record carries `marks`).

The notes library needs one more thing: an anchor per record, or the chapter
page's "Full outline library" button lands nowhere. Physics and Biology both
have a section in `assets/notes/index.html` (`<h2 id="physics">`, then one
`<article id="lephy12NN">` per chapter); the checker asserts every outline id is
a page id.

---

## 4. Verification

```bash
# Does the pack attach the outline to the chapter objects?
# (biology-outlines.js is the working example — swap in physics once it exists.)
node -e "global.window={};global.UP={};const f=require('fs');
  eval(f.readFileSync('assets/js/data/biology-outlines.js','utf8'));
  const o=UP.biologyOutlines['5'];
  console.log(o.id, o.chapter, o.marks, o.sections.length, o.figures.length);"
# lebio805 5 20 10 17
# (UP.biology12 itself is built from UP.sci12.biology, so it needs the page's
#  own packs loaded — inspect UP.biologyOutlines when testing standalone.)

# Then load #/chapter/601 with Class 12 · Physics selected and check the header
# reads 'CBSE 2026–27 · 042' and the Sections / Objectives / Key terms blocks
# are populated. (jsdom boots this app only if window.fetch is polyfilled and
# window.matchMedia is stubbed — assets/js/answers.js calls fetch at load.)

What correct output looks like (rendered from a stub outline during
development):

```
Chapter 1   Electrostatics · 16 marks (unit)   CBSE 2026–27 · 042
Electric Charges and Fields
<summary>  …pills…
Sections …  Objectives …  Key terms …
Source: NCERT Class 12 Physics, chapter 1. The source PDF is not provided on the site.
```

Add assertions to `tools/check/outline_notes.py` in the same style as the
Biology block: record count, ids `lephy12NN`, `chapter` agreeing with `id`,
summary length, unit-marks total, and the pack being registered in `boot.js`.

---

## 5. Rules that hold for every subject

* English body text only; Hindi stays in the title fields (`hi`).
* The page must keep "Mapped to CBSE 2026–27, not certified by CBSE" and
  "Outline only — not a full chapter, not an answer key".
* `marks` is a **unit** figure and is labelled as one.
* Never invent a figure: an image appears only if it is a verified crop listed
  in `assets/img/notes/manifest.json`.
* Generated packs are committed (the site has no build step at runtime); the
  source of truth stays `assets/notes/outlines.json` plus the build script.
