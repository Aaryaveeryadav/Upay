# Chapter text extraction

The Class 12 chapter PDFs (`assets/books/…`) have been removed and replaced by
text extracted from them. This directory holds the tooling.

## What produces what

| Command | Effect |
|---|---|
| `python3 tools/extract/build-chapter-text.py` | Reads every chapter PDF and regenerates `assets/js/data/chapter-summary.js` (lean outline, loaded with the critical core) and `assets/js/data/chapter-fulltext.js` (whole chapter, lazy-loaded). Also writes `.chapter-text-cache.json`. |
| `python3 tools/extract/build-chapter-text.py --no-pdf` | Regenerates the two data files from `.chapter-text-cache.json` **without needing the PDFs**. Use this in a normal checkout, since the PDFs are gone. |
| `python3 tools/extract/build-chapter-text.py --report` | QC table: page count, raw characters, words, sections and key expressions per chapter. |
| `python3 tools/extract/remove-chapter-pdfs.py --dry-run` | Lists what would be deleted. |
| `python3 tools/extract/remove-chapter-pdfs.py --apply` | Deletes only the chapter PDFs that have usable extracted text. Never touches `assets/papers/`. |
| `python3 tools/check/chapter_text.py` | Regression check: every catalogue entry resolves to text, and the 212 test-paper PDFs are untouched. |

Requires `pip install pypdf`.

## Rules this tooling follows

1. **Only chapter PDFs are touched.** Anything under `assets/papers/` is refused outright, and so is question data — no `.js` file containing questions is written here.
2. **Extracted text must be usable before the source is deleted.** `remove-chapter-pdfs.py` skips any file whose summary is missing or whose extraction failed.
3. **No mojibake is ever shipped.** Text that fails the check is marked `available: false` and the UI says so, instead of rendering garbage.

## The 12 Hindi Economics chapters

`lhec101–106`, `lhec201–205` and `lhec2gl` use a legacy KrutiDev font: the PDF
text layer is Latin look-alikes (`vk; dk ys[kkadu`), not Devanagari. The
extractor detects this and marks those chapters unavailable rather than
shipping garbage. **Those 12 PDFs were deliberately kept.**

To fix them, re-upload Unicode (Devanagari) copies over the same filenames,
then re-run `build-chapter-text.py`. They will be extracted like the rest, and
`remove-chapter-pdfs.py --apply` will then delete them.

## Re-adding a chapter PDF later

Drop the file back at the path recorded in
`assets/js/data/english12-sources.js` / `economics-sources.js`, run the builder,
and the summary and full text regenerate. The `bytes` and `sha256` fields in
those catalogues describe the original uploads; update them if the file differs.
