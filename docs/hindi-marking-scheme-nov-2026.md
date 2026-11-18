# Hindi practice papers and marking schemes (2023-24 uploads)

Audit date: 17 November 2026. Thirty-six Hindi PDFs were supplied in two
batches — eighteen practice papers and marking schemes (2023-24), then eighteen
board sets (Course A `3/x/y`, Course B `4/S/x`). This pass examined every one,
matched printed answer keys against the question bank **only** where year,
paper, question number and option order all agree, and added nothing that the
sources do not print.

**Result: 0 printed keys could be attached, 0 questions added.** The first
batch is coach-made practice papers and their answer schemes; the second is real
board sets, but it contains **no marking scheme at all**, so nothing in it can
key a question. Every text-bearing file in both batches carries a text layer
that is not a faithful transcription of the printed page. Details and the evidence
for each decision are below; the machine-readable record is
`tools/check/fixtures/hindi-practice-papers-2023-24.json` and the contract that
locks it in is `tools/check/hindi_practice_papers.js`.

Nothing in the question bank was changed. The tool that produced this audit is
`tools/extract/hindi_practice_papers.py`; it reads the PDFs, never writes to the
bank, and the PDFs themselves are not committed.

## Why nothing could be attached

Three independent conditions each block a key on their own, and the second batch
fails the first two for a different reason than the first batch fails them.

### First batch (18 practice papers, 2023-24)

1. **The uploads are not board papers.** Cover headings read
   "अभ्यास प्रश्नपत्र" / "अतिरिक्त अभ्यास" (practice / extra-practice paper) and
   the schemes read "अंक योजना - अतिरिक्त अभ्यास प्रश्नपत्र (2023-24)". None
   prints a CBSE paper code, series or set number. The bank's Hindi rows are
   keyed by `src` (source PDF) and by the paper they were transcribed from; a
   coach's practice paper has no slot a printed key can be matched to.
2. **No scheme has a unique matching question paper.** Each of the four schemes
   prints session 2023-24 and a course, but two question papers carry that same
   label for each course (e.g. `HindiA-PQ` and `HindiA-PQ2`), with different
   questions and different numbering. `HindiCourseA-PQ` is 2021-22 and has no
   scheme at all.
3. **The text layer of every text-bearing file is mechanically unfaithful.** A
   Devanagari syllable can never begin with a dependent vowel sign, an anusvara
   or a virama. In these files it does, on hundreds of words per file: `ल` is
   emitted as `ि` (`लोक` → `िोक`), `हिंदी` as `त ंदी`, `निर्देश` as `विदेश`,
   `लिए` as `शलए`. The rendered page reads correctly to the eye; the extracted
   string is not the printed text. Comparing a key's option text with an
   option's text is therefore comparing two corrupted strings.

### Second batch (18 board sets)

4. **The board sets are genuine, and that changes nothing.** `3/2/1` … `3/5/3`
   print Series `KMLN2` / `KL3MN` / `N4KLM` / `KN5ML`; `4/S/1` … `4/S/3` print
   Series `EFGH/S`. Each prints its own code and SET number, and their Hindi is
   set in an embedded font whose ToUnicode table is missing or wrong.
5. **No marking scheme was supplied with them.** The batch is question papers
   only — zero schemes — so there is no printed key to compare against even if
   the text were clean. This is the decisive difference from the first batch:
   there, schemes existed but no text could be trusted; here, there is no scheme
   to attach.

The Course A sets lose nearly all their Hindi to the font (only ~400 Latin
characters of page furniture survive — question numbers, `P.T.O.`, the series
code). The Course B `4/S/x` sets keep ~7,400 Devanagari characters, and it is
shifted exactly as the first batch is: **462**, **407** and **460** words begin
with a dependent vowel sign, which no printed Hindi word can do. `3/1/1` … `3/1/3`
are image-only scans with no text layer at all.

Fifteen of these eighteen sets are already cited by **156 shipped bank rows**
(`hca26-3a26…`). Those rows stay unkeyed: their source has no faithful text and
the batch has no scheme, so there is nothing to verify against. The three
Course B sets are cited by nothing.

### The comparison that was run anyway

The audit still ran the comparison, and reports it as unresolved rather than as
agreement. `HindiA-PQMS` against `HindiA-PQ2` compares 43 of its 44 printed keys
with a real four-option slot: the printed letter lands on the option whose text
most resembles the key text at only **7** of them, and at none of those is the
text similarity strong enough to accept. `HindiA-PQMS2` scores 10 of 43 the same
way, and the Course B schemes 0 of 1 and 1 of 1 — a rate consistent with chance
between two independently corrupted strings.

An earlier, looser probe put 31 of 44 letter positions "consistent", which is why
this document records that figure explicitly: it is coincidence, not evidence,
and it is **not** admitted. No key is inferred here, none is marked
`keyVerified`, and no row in the bank was changed.

## What each file is

Creation dates are the PDF's own metadata. They corroborate the printed
session; they are not used as year proof on their own.

| File | Type | Course | Printed code / set / series | Created | Pages | Printed MCQ keys |
|---|---|---|---|---|---|---|
| `HindiA-PQ.pdf` | Practice question paper | A (002) | — (session 2023-24) | 2023-09-06 | 17 | — |
| `HindiA-PQ2.pdf` | Extra-practice question paper | A (002) | — (session 2023-24) | 2023-11-13 | 14 | — |
| `HindiA-PQMS.pdf` | Marking scheme | A (002) | — (session 2023-24) | 2023-09-06 | 9 | 44 |
| `HindiA-PQMS2.pdf` | Marking scheme | A (002) | — (session 2023-24) | 2023-11-13 | 4 | 44 |
| `HindiB-PQ.pdf` | Practice question paper | B (085) | — (session 2023-24) | 2023-10-18 | 16 | — |
| `HindiB-PQ2.pdf` | Extra-practice question paper | B (085) | — (session 2023-24) | 2023-11-13 | 13 | — |
| `HindiB-PQMS.pdf` | Marking scheme | B (085) | — (session 2023-24) | 2023-10-18 | 12 | 44 |
| `HindiB-PQMS2.pdf` | Marking scheme | B (085) | — (session 2023-24) | 2023-11-13 | 5 | 45 |
| `HindiCourseA-PQ.pdf` | Practice question paper, 2021-22 | A (002) | — (session 2021-22) | 2021-11-18 | 15 | — (no scheme supplied) |
| `4-6-1 Hindi-B.pdf` | Board question paper, set 1 | B | 4/6/1, SET 1, SRQPE/C | 2022-08-29 | 4 | — |
| `4-6-2 Hindi-B.pdf` | Board question paper, set 2 | B | 4/6/2, SET 2, SRQPE/C | 2022-08-29 | 4 | — |
| `4-6-3 Hindi-B.pdf` | Board question paper, set 3 | B | 4/6/3, SET 3, SRQPE/C | 2022-08-29 | 4 | — |
| `4-7-1 … E2_26.pdf` | Board question paper, set 1 | B | 4/7/1, SET 1, series E7DFG | 2026-05-19 | 11 | — |
| `4-7-2 … E2_26.pdf` | Board question paper, set 2 | B | 4/7/2, SET 2, series E7DFG | 2026-05-19 | 11 | — |
| `4-7-3 … E2_26.pdf` | Board question paper, set 3 | B | 4/7/3, SET 3, series E7DFG | 2026-05-19 | 11 | — |
| `4-8-1 … E2_26.pdf` | Board question paper, set 1 | B | 4/8/1, SET 1, series 8EFDG | 2026-05-19 | 16 | — |
| `4-8-2 … E2_26.pdf` | Board question paper, set 2 | B | 4/8/2, SET 2, series 8EFDG | 2026-05-20 | 16 | — |
| `4-8-3 … E2_26.pdf` | Board question paper, set 3 | B | 4/8/3, SET 3, series 8EFDG | 2026-05-20 | 16 | — |
| `3-1-1 … (1).pdf` | Board question paper, set 1 | A | 3/1/1, SET 1 — image-only scan | — | 16 | — |
| `3-1-2 … (1).pdf` | Board question paper, set 2 | A | 3/1/2, SET 2 — image-only scan | — | 16 | — |
| `3-1-3 … (1).pdf` | Board question paper, set 3 | A | 3/1/3, SET 3 — image-only scan | — | 16 | — |
| `3-2-1 … (1).pdf` | Board question paper, set 1 | A | 3/2/1, SET 1, series KMLN2 | — | 15 | — |
| `3-2-2 … (1).pdf` | Board question paper, set 2 | A | 3/2/2, SET 2, series KMLN2 | — | 15 | — |
| `3-2-3 … (1).pdf` | Board question paper, set 3 | A | 3/2/3, SET 3, series KMLN2 | — | 15 | — |
| `3-3-1 … (1).pdf` | Board question paper, set 1 | A | 3/3/1, SET 1, series KL3MN | — | 16 | — |
| `3-3-2 … (1).pdf` | Board question paper, set 2 | A | 3/3/2, SET 2, series KL3MN | — | 16 | — |
| `3-3-3 … (1).pdf` | Board question paper, set 3 | A | 3/3/3, SET 3, series KL3MN | — | 16 | — |
| `3-4-1 Hindi A.pdf` | Board question paper, set 1 | A | 3/4/1, SET 1, series N4KLM | — | 16 | — |
| `3-4-2 Hindi A.pdf` | Board question paper, set 2 | A | 3/4/2, SET 2, series N4KLM | — | 16 | — |
| `3-4-3 Hindi (A).pdf` | Board question paper, set 3 | A | 3/4/3, SET 3, series N4KLM | — | 16 | — |
| `3-5-1 Hindi (A).pdf` | Board question paper, set 1 | A | 3/5/1, SET 1, series KN5ML | — | 16 | — |
| `3-5-2 Hindi (A).pdf` | Board question paper, set 2 | A | 3/5/2, SET 2, series KN5ML | — | 16 | — |
| `3-5-3 Hindi (A).pdf` | Board question paper, set 3 | A | 3/5/3, SET 3, series KN5ML | — | 16 | — |
| `4-S-1_Hindi Course B.pdf` | Board question paper, set 1 | B | 4/S/1, SET 1, series EFGH/S | — | 11 | — |
| `4-S-2_Hindi Course B.pdf` | Board question paper, set 2 | B | 4/S/2, SET 2, series EFGH/S | — | 11 | — |
| `4-S-3_Hindi Course B.pdf` | Board question paper, set 3 | B | 4/S/3, SET 3, series EFGH/S | — | 11 | — |

Counts, in one line: **9 practice-paper files (5 question papers, 4 marking
schemes), 6 image-only board-paper scans, 3 KrutiDev board-paper scans; 177
printed MCQ keys read in total; 0 attachable.**

The six `4-7-*` / `4-8-*` files are the only genuine main-board papers in the
set, and they are 2026 Course B. They are image-only: `gettext` returns no
characters at all (their covers were read visually to identify the paper).
Reading them would need OCR, which this repository's policy forbids for source
material, so no question or key was taken from them.

The three `4-6-*` files are Course B board papers whose text layer is entirely
Latin letters — they were typeset in the legacy KrutiDev font, so the page holds
a real text layer with no Devanagari code points in it at all. The printed code,
set and series survive because they are Latin and digits.

### Printed key counts

Every scheme prints keys for the ten MCQ questions only (Q1–Q10); Q11 onward is
descriptive marking points with no lettered options, so no key exists there.
The four schemes print 44, 44, 44 and 45 lettered keys in four different
layouts (`1.1` + `(d)`, `क. C`, `1` + `(a)`, and `(1)` + `(A)`), which is why
the audit reads all four rather than one.

`HindiB-PQMS2` prints 45, one more than the others: Q10's marking points carry
two sub-answers where the other schemes carry one. It is still inside the MCQ
section and still unreadable as text.

## Text-layer damage, file by file

"Impossible word starts" counts Devanagari words whose first character is a
dependent vowel sign, virama, anusvara, visarga or nukta — all impossible in
correct Hindi. A faithful file scores 0. For reference the shipped Hindi
corpus scores 0.02–0.26 %.

| File | Devanagari chars | Impossible word starts | Signature shifts seen |
|---|---|---|---|
| `HindiA-PQ.pdf` | 15,184 | 802 | 350 word-initial `ि` for `ल`, 452 word-initial signs, 20 `होिा/कििे`, 60 `त ंदी/र्ा` |
| `HindiA-PQ2.pdf` | 15,673 | 412 | 321 / 91 / 5 / 37 (plus 14 `िैसे/िोग`, 8 `ठ`) |
| `HindiA-PQMS.pdf` | 9,454 | 374 | 163 / 211 / 2 / 1 |
| `HindiA-PQMS2.pdf` | 4,171 | 46 | 45 / 1, plus `नहीों` 9, `शलए` 5, `अशिव्यक्त` 3 |
| `HindiB-PQ.pdf` | 15,116 | 731 | 321 / 410 / 25 / 108 |
| `HindiB-PQ2.pdf` | 13,091 | 131 | 131 / 0 / 3 / 70, plus `र्द` 228 |
| `HindiB-PQMS.pdf` | 9,291 | 294 | 90 / 204 / 0 / 1 |
| `HindiB-PQMS2.pdf` | 3,637 | 74 | 25 / 49 / 0 / 3, plus 61 `ठ` for `क्ष` |
| `HindiCourseA-PQ.pdf` | 13,480 | 813 | 543 / 270 / 6 / 16 |
| `4-6-1/2/3 Hindi-B.pdf` | 0 | 0 | none — all text is Latin (KrutiDev) |
| `4-7-*`, `4-8-*` | 0 | 0 | no text layer at all |

Two repair routes were tested and both are impossible here, so no de-mangled
text exists to compare:

- **Uniform code-point shift.** The best-scoring shift between every file and
  the known-good Hindi corpus is **+0**, i.e. no shift — the damage is per-glyph
  substitution, not a moved block.
- **Font metadata.** The embedded Kokila subset has 723 glyphs, all unnamed
  (`glyphNNNNN`), and a WinAnsi-only `cmap`. There is no Unicode map to invert.

## Structure that does survive (and what it proves)

Question numbers, sub-part letters and key letters are Latin or digits, so they
come through untouched even when the Hindi around them does not:

- `HindiA-PQ2` parses as **43 four-option MCQs**; independent option-run counting
  agrees (42 Latin four-option blocks, plus one printed with Devanagari letters).
- `HindiA-PQ` and `HindiB-PQ` each print **44 four-option blocks** in Latin
  letters. Their sub-parts are numbered with bare `1`,`2`… rather than a letter,
  which is why slot-by-slot matching is impossible there: there is no sub-part
  identifier to match a key's `(a)`–`(d)` against.
- `HindiB-PQ2` prints 29 Latin four-option blocks; its sub-parts use `(1)`–`(6)`.
- `HindiCourseA-PQ` prints **zero** four-option blocks: it is a 2021-22 paper
  whose options are `(क)`–`(घ)` under `(i)`–`(x)` sub-numbers, and no marking
  scheme was supplied for it. Its 107 option tokens pair up as `(क)`,`(ख)`,
  `(ग)`,`(घ)` written in an order that the corrupt layer cannot vouch for.

The exact printed question counts ("17 प्रश्न हैं", "10 प्रश्न हैं", "18 प्रश्न
हैं") were recovered from three files and used only as a sanity bound.

## Finding: damage already inside the shipped Hindi bank

Of the 1,214 imported Hindi rows, the original sidecar retained 930. The broad
word-start scan flagged 45 of these. They were **not** all practice questions:
13 were reading passages already excluded from standalone practice. The other
32, including the three unkeyed MCQs `hcan-3n83-601` (`्मृति`),
`hbp26v2-4b26v213-702` (`(ंए)`) and `hbpsup2-4S22-701` (`्र्ठ`), could
still reach students.

The revised sidecar retains **898** of the 1,214. It withholds those 32
questions without rewriting their wording or attaching any key. A leading
dependent sign attached to a word is evidence of lost letters; an isolated
matra used in a grammar question, a dotted-circle example or a visarga used
as punctuation is not. Six flagged stems without an attached word were held
for their actual torn words, missing word limit, damaged choice table or
merged debris. The same holds apply to duplicate transcriptions. The 13
passages remain reading material. This is not a semantic audit of the 898.

- The `4-6-1` rows (`hbplitb-4blit6x-*`) show the KrutiDev failure mode in full:
  paper instructions promoted to MCQs (`…-04`), essay topics recorded as 3-mark
  questions (`…-401/402/403`), an empty stem (`…-501`), and `आमपके` (`…-601`).
  The `4_1_1` rows fold the options into the stem. Some of these are already
  withheld by the sidecar; the tool lists which rows cite each file.

`tools/check/hindi_practice_papers.js` checks the raw imports, the generated
sidecar and the language gate separately. No standalone practice question
among these imports may retain the audit's word-start flag, and the three
reported MCQs must remain unkeyed in the source.

## How to use this tool

```
python3 tools/extract/hindi_practice_papers.py --pdf-dir <dir of the 18 PDFs> \
        --json /tmp/hindi-report.json
node tools/check/hindi_practice_papers.js     # contract over the committed fixture
```

The tool prints, per file, its identity, its structure counts, its text-layer
verdict and the bank rows that cite it, and per scheme the pairing verdict. It
needs `pymupdf` and reads PDFs only; it never writes to the bank.

## What would change the answer

A **printed main-board Hindi marking scheme with the matching question paper**,
where the question paper's text layer is faithful (a born-digital PDF or a
scanned paper transcribed by hand). That gives an unambiguous paper identity and
an option order that can be compared, which is exactly what the 28 Social
Science keys had. The CBSE archive links in
[the online source inventory](online-marking-schemes-nov-2026.md) are the
starting point; the archives themselves still need question-by-question review.
