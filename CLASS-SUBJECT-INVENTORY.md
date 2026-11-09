# Upay — Class-wise / Subject-wise Question Inventory

Measured by loading every data file in `assets/js/boot.js` load order (core → post-paint → all subject packs) and replaying the same `foldLiteratureIntoBank()` de-dupe. Numbers are record counts, not paper counts.

**Grand total: 11,539 searchable question records — only 11 subjects, across classes 10 and 12. Class 11 has zero questions.**

---

## 1. The master matrix

| Class | Subject | Questions | Chapters | Has answer key | Hindi text | MCQ options | Years covered |
|---|---|---:|---:|---:|---:|---:|---|
| **10** | maths | **2,014** | 14 | 332 (16%) | 332 | 174 | 2010–2026 |
| **10** | social | **1,361** | 22 | 0 | 79 | 865 | 2025 only |
| **10** | hindi | **1,214** | 32 | 0 | 1,083 | 202 | 2024–2026 |
| **10** | english | **872** | 0 ⚠ | 0 | 0 | 26 | 2023–2026 |
| **10** | science | **755** | 13 | 242 (32%) | 0 | 254 | 2026 only |
| **10** | sanskrit | **62** | 27 | 0 | 62 | 0 | none |
| | **Class 10 total** | **6,278** | | 574 (9%) | 1,556 | 1,521 | |
| **12** | chemistry | **1,750** | 10 | 110 (6%) | 0 | 0 | 2022–2025 |
| **12** | physics | **1,181** | 14 | 87 (7%) | 484 | 0 | 2025 only |
| **12** | accountancy | **1,156** | 10 | 0 | 0 | 0 | 2023–2026 |
| **12** | maths | **788** | 13 | 0 | 66 | 0 | 2024–2025 |
| **12** | computerized-accounting | **272** | 2 | 0 | 0 | 0 | 2023–2026 |
| **12** | applied-maths | **114** | 10 | 0 | 0 | 0 | 2025 only |
| | **Class 12 total** | **5,261** | | 197 (4%) | 550 | 0 | |
| **11** | *any subject* | **0** | 16+14+14+19 named | — | — | — | — |
| | **GRAND TOTAL** | **11,539** (47.9% unmapped) | | **771 (6.7%)** | **2,106 (18%)** | **1,521 (13%)** | 2010–2026 |

Two extra questions sit inside chapter maps rather than the bank: **70** in Class 10 maths chapters and **50** in Class 12 maths chapters (`UP.chapters[].pyqs`).

---

## 2. Class 10 — 6 subjects, 6,278 questions

Declared in `UP.classes`: `maths, science, social, hindi, english, sanskrit` — **all six have questions.**

| Subject | n | Chapter map | Backing data files | State |
|---|---:|---|---|---|
| **maths** | 2,014 | 14 (IDs 1–14) + 19 RBSE | `chapters1.js`, `chapters2.js`, `pyq.js`, `pyq-2024.js`, `pyq-keys.js`, `rbse.js` | Best-covered subject in the app. 16 years of papers, 3 solution-method engines (`maths-solvers.js`, `solver-arith`, `solver-geo`). |
| **social** | 1,361 | 26 (IDs 1–26) | `social-chapters.js`, `social10-q.js`, `pyq-social.js` | 1,036 of these come from the legacy `socialPyq` array. 865 MCQs but **0 answer keys**. |
| **hindi** | 1,214 | 42 (`hindi10Chapters`) | `hindi10-q.js`, `hindi10-rich.js`, `pyq-hindi-final/-a5b4/-a6b5.js` | Best Hindi coverage (1,083 of 1,214). |
| **english** | 872 | 18 (`english10`) ⚠ | `english10-ff.js`, `english10-fp.js`, `english10.js`, `pyq-english.js` | ⚠ Chapter map uses **string IDs** (`eng10-ff01`), so these questions have `ch: 0` and **cannot be chapter-filtered**. No Hindi, no keys. |
| **science** | 755 | 13 (`science10`) | `science10.js`, `science10-q.js`, `hindi10-ch.js`, `pyq-science.js` | Highest answer-key rate (32%). All 2026-dated. Contains figures. |
| **sanskrit** | 62 | 39 (`sanskrit10Chapters`) | `sanskrit10-q.js`, `sanskrit10-rich.js` | Thinnest class-10 subject. No years recorded. Plus **9 source-only paper PDFs**. |

---

## 3. Class 12 — 6 subjects with questions, 3 declared subjects empty

Declared in `UP.classes`: `maths, applied-maths, physics, chemistry, biology, accountancy, computerized-accounting, economics, english` — **9 declared, only 6 have questions.**

| Subject | n | Chapter map | State |
|---|---:|---|---|
| **chemistry** | 1,750 | 10 (701–710) | Largest class-12 bank, but **text is corrupted** by PDF extraction (`"6 5 2 3 C H NH CHCl"` instead of `C₆H₅NH₂ + CHCl₃`). No Hindi, no MCQs, no figures. |
| **physics** | 1,181 | 14 (601–614) | Good Hindi coverage (484). Only 2025 papers. Diagrams embedded for 33 questions. |
| **accountancy** | 1,156 | 10 (101–206) | 34 source-tagged papers. **Zero answer keys, zero Hindi.** Plus **17 source-only PDFs**. |
| **maths** | 788 | 13 (1–13) | Only 2024–25 papers — the thinnest year spread. |
| **computerized-accounting** | 272 | 2 (301–302) | Option II track. Shares the accountancy question import. |
| **applied-maths** | 114 | 10 (501–513) | Smallest bank in the app; 2025 only. |
| **economics** | **0** ⚠ | 11 (1101–1205) | **Full chapter map + 24 source PDFs + 90 test-paper PDFs, but not one searchable question.** Only 22 `practice` items embedded in chapters. |
| **english** | **0** ⚠ | 40 (1501–1706) | **40 study chapters + 40 source PDFs + 101 test-paper PDFs, but not one searchable question.** |
| **biology** | **0** ⚠ | 13 named | **Only chapter names** (`UP.sci12.biology`) + **4 source-only PDFs**. No chapters, no questions. |

---

## 4. Class 11 — declared, scaffolded, completely empty

`UP.classes` declares `maths, physics, chemistry, biology`. Chapter names exist in `helpers` form only:

| Subject | Chapter names | Questions | Chapter maps |
|---|---:|---:|---|
| maths | 16 (`course11maths`, with formulas/concepts) | **0** | 16 ✅ |
| physics | 14 (`UP.sci11.physics`) | **0** | names only, no concepts |
| chemistry | 14 (`UP.sci11.chemistry`) | **0** | names only |
| biology | 19 (`UP.sci11.biology`) | **0** | names only |

The UI will let a student select Class 11 and then show **empty chapter pages and empty practice sets**.

---

## 5. Subject count summary

| | Declared | With a chapter map | With questions | Well-covered |
|---|---:|---:|---:|---:|
| Class 10 | 6 | 6 | **6** | 4 (maths, social, hindi, science) |
| Class 11 | 4 | 4 | **0** | 0 |
| Class 12 | 9 | 9 | **6** | 3 (chemistry, physics, accountancy) |
| **Total** | **19** | 19 | **12** | 7 |

---

## 6. How many *test papers* (not questions)?

Separately from the searchable bank, these are **source-only PDFs** — no questions imported:

| Collection | PDFs | Subjects |
|---|---:|---|
| `class12OriginalTestPapers` | 195 | English Core 93, English Elective 8, Economics 90, Biology 4 |
| `english12Sources` (textbooks) | 40 | Flamingo 13, Vistas 6, Kaleidoscope 21 |
| `economicsSources` (textbooks) | 24 | Macro 12, Micro 12 |
| `accountancyOriginalPapers` | 17 | Accountancy 2023 Main 12, 2024 Main 5 |
| `sanskritPapers` | 9 | Sanskrit |
| **Catalogue total** | **285 records** | |
| On disk | **285 PDFs / ~464 MB** | |

**Total on-disk PDFs: 285.** 195 of them are test papers; the rest are textbook chapters.

---

## 7. What to fix, in priority order

Ranked by student-visible impact per unit of work:

1. **Economics + Class 12 English have PDFs but no questions (0 of 5,261).** These are the two biggest visible wins — the material is already supplied, it just needs importing. That alone would roughly **+40%** the class-12 bank.
2. **Class 11 renders an empty app.** Either import questions or hide Class 11 from `UP.classes` until content exists — a silently empty page is worse than an absent option.
3. **Biology is a name-only stub** (class 11 and 12). 4 PDFs exist for class 12.
4. **5,529 of 11,539 questions (47.9%) are unmapped** — 1,994 have no `ch` at all and 5,529 use the `ch: 0` "misc" sentinel — so they are invisible to chapter-filtered practice. Class 10 English is 100% unmapped because its chapter IDs are strings.
5. **Answer keys: 6.7% coverage.** Social, Hindi, English, Accountancy, Applied Maths and Computerized Accounting have **zero** keys, so practice there can never be graded.
6. **Chemistry text corruption** (1,750 records) — the single largest block of visibly broken content.
7. **Hindi coverage is class-10-only.** All of class 12 except physics (484) is English-only.
8. **Year spread is very uneven** — science/social/physics/applied-maths are single-year, maths has 16 years. Filters feel broken on the thin subjects.
9. **25 duplicate IDs** across packs.
10. `assets/answers/*.json` are empty stubs despite being documented as a seed bundle.
