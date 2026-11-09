#!/usr/bin/env python3
"""Extract Class 12 Accountancy chapter notes from the NCERT chapter PDFs.

The Class 12 Accountancy chapters in this app were navigation records only: a
title, a one-line description and keyword chips. Their Concepts tab showed a
"PYQ coverage" placeholder instead of the chapter's actual contents, so the
syllabus section told a student nothing a textbook would.

This tool reads the supplied NCERT chapter PDFs and extracts, per chapter:

  * the numbered section outline (e.g. "1.5.1 Profit and Loss Appropriation
    Account") with the opening sentences of each section, and
  * the "Learning Objectives" list the book prints at the start of the chapter.

It does NOT copy the chapters. The output is an outline: section titles plus a
short opening extract, which is what a student needs to see what a chapter
covers and to decide what to revise.

Output: assets/js/data/accountancy-chapters.js  (UP.accountancyNotes)

Usage:
  python3 tools/extract/build-accountancy-notes.py --pdf-dir DIR [--report]
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/js/data/accountancy-chapters.js'

# leac file stem -> chapter id used by chapters12-accountancy.js
CHAPTERS = [
    ('leac101', '101'),
    ('leac102', '102'),
    ('leac103', '103'),
    ('leac104', '104'),
    ('leac201', '201'),
    ('leac202', '202'),
    ('leac203', '203'),
    ('leac204', '204'),
    ('leac205', '205'),
    ('leac206', '206'),
]

# A section heading in the book: "1.5.2 Interest on Drawings"
SECTION = re.compile(r'(?m)^\s*(\d+(?:\.\d+){1,2})\s+([A-Z][^\n]{3,75})$')

# Running heads such as "12 Accountancy – Partnership Accounts"
RUNNING_HEAD = re.compile(
    r'\b\d{1,3}\s+Accountancy\b[^.]{0,70}?(?=[A-Z])', re.I)

OBJECTIVES = re.compile(
    r'(?is)(?:LEARNING OBJECTIVES|Learning Objectives)[^•]{0,80}?(.+?)'
    r'(?:\n\s*\d+\.\s|\n\s*[A-Z][a-z]+\s+is\s|\Z)')

# Word splits produced by the PDF text layer. Each is observed in the supplied
# files and is repaired deterministically rather than guessed at.
OCR_FIXES = [
    (r'\berr ors\b', 'errors'),
    (r'\b([a-z]{2,})-\s+([a-z]{2,})\b', r'\1-\2'),   # "inter- firm" -> "inter-firm"
    (r'\b([a-z])\s([a-z])\b(?=\s+the\b)', r'\1\2'),  # "ratio o f the" -> "ratio of the"
    (r'\b([a-z]{2,})/\s+([a-z]{2,})\b', r'\1/\2'),    # "retirement/ death"
    (r'\s+([,.;:])', r'\1'),                          # "par , at" -> "par, at"
    # a word wrapped across a line: "adjust-ment", "retire-ment"
    (r'\b([a-z]{3,})-(ment|tion|sion|ing|ed|ly|ness|ity|ance|ence|al|s)\b',
     r'\1\2'),
    (r'\b([a-z]{3,}) s\b(?=\s+(?:capital|share|profit|account|book|firm|assets|liabilit))', r"\1's"),
    (r'\s+', ' '),
]

# An objective must start with a verb the book uses, otherwise it is a line
# that bled in from the body text.
OBJECTIVE_VERB = re.compile(
    r'^(define|identify|prepare|explain|calculate|state|distinguish|make|understand|'
    r'describe|compute|analyse|analyze|record|develop|interpret|ascertain|classify)\b',
    re.I)

# Text that must never reach a student-facing summary.
DROP_SNIPPETS = [
    'Reprint 20', 'NOT TO BE REPUBLISHED', 'Rationalised', '© NCERT',
    'Chap', 'indd', 'EXEMPLAR PROBLEMS', 'LEARNING OBJECTIVES',
]


def clean(text):
    t = re.sub(r'\s+', ' ', text or '')
    t = RUNNING_HEAD.sub(' ', t)
    for pat, rep in OCR_FIXES:
        t = re.sub(pat, rep, t)
    for bad in DROP_SNIPPETS:
        if bad in t and bad not in ('Chap',):
            t = t.split(bad)[0] if bad.startswith('Reprint') else t.replace(bad, ' ')
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def first_sentences(text, limit=340):
    """Trim to the first couple of sentences, ending on a sentence boundary."""
    t = clean(text)
    if len(t) <= limit:
        return t
    cut = t[:limit]
    stop = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
    if stop > 120:
        return cut[:stop + 1]
    return cut.rsplit(' ', 1)[0] + '…'


def clean_objective(text):
    """An objective is one bullet from the book. Trim it at the first clause
    separator and drop any page chrome that bled into the last bullet."""
    t = clean(text)
    # the bullet list ends on ';' or '.', after which page chrome can follow
    for sep in (';', ' Reprint', ' NOT TO BE'):
        idx = t.find(sep)
        if idx > 12:
            t = t[:idx]
    # the final bullet is often followed by the running chapter title and a
    # page number: "... comparisons. Accounting Ratios 5"
    t = re.sub(r'\.\s+[A-Z][A-Za-z][A-Za-z ]{2,45}?\s+\d{1,3}\s*$', '', t)
    t = re.sub(r'\.\s*$', '', t).strip(' .,;')
    if t:
        t = t[0].upper() + t[1:]
    return t


# Words that must never end a trimmed objective.
DANGLING = {
    'a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'for', 'with', 'by', 'on',
    'at', 'as', 'from', 'that', 'which', 'their', 'its', 'this', 'these', 'those',
}


def trim_tail(text):
    """Trim to a word boundary and drop trailing function words, so an
    objective never reads '... and the balance sheet of a'."""
    t = text.rsplit(' ', 1)[0] if ' ' in text else text
    words = t.split()
    while words and words[-1].lower().strip(' ,;:') in DANGLING:
        words.pop()
    return ' '.join(words).rstrip(' ,;')


def objectives(pages):
    txt = '\n'.join(pages)
    m = OBJECTIVES.search(txt)
    if not m:
        return []
    items = re.split(r'\s*[•●]\s*', m.group(1))
    out = []
    for it in items:
        it = re.sub(r'\s+', ' ', it).strip(' .;')
        it = it.split('LEARNING')[0].strip()
        it = clean_objective(it)
        if 'you will be able to' in it.lower():
            continue
        if not OBJECTIVE_VERB.match(it):
            continue
        if len(it) > 120:
            it = trim_tail(it[:120])
        if len(it) >= 10:
            out.append(it)
    # de-duplicate while keeping book order
    seen, uniq = set(), []
    for o in out:
        k = o.lower()[:40]
        if k in seen:
            continue
        seen.add(k)
        uniq.append(o)
    return uniq[:9]


def sections(pages):
    txt = '\n'.join(pages)
    hits, seen = [], set()
    for m in SECTION.finditer(txt):
        num, title = m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip()
        if re.match(r'^\d+\s', title) or title.lower().startswith('accountancy'):
            continue
        if len(title) < 4 or num in seen:
            continue
        seen.add(num)
        hits.append((m.start(), m.end(), num, title))

    out = []
    for i, (start, end, num, title) in enumerate(hits):
        stop = hits[i + 1][0] if i + 1 < len(hits) else min(len(txt), end + 3000)
        body = txt[end:stop]
        body = re.sub(r'^\s*[a-z]\s+(?=[A-Z“"(])', '', body)   # stray page digit
        summary = first_sentences(body)
        if len(summary) < 40:
            continue
        out.append({'n': num, 't': title, 'b': summary})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf-dir', required=True)
    ap.add_argument('--report', action='store_true')
    args = ap.parse_args()

    try:
        from pypdf import PdfReader
    except ImportError:
        print('pypdf is required: pip install pypdf --break-system-packages')
        return 2

    src = Path(args.pdf_dir)
    notes, problems = {}, []

    for stem, cid in CHAPTERS:
        pdf = src / (stem + '.pdf')
        if not pdf.exists():
            problems.append('%s: missing %s.pdf' % (cid, stem))
            continue
        reader = PdfReader(str(pdf))
        pages = [(p.extract_text() or '') for p in reader.pages]
        secs = sections(pages)
        objs = objectives(pages)
        if not secs:
            problems.append('%s: no sections found' % cid)
            continue
        notes[cid] = {
            'source': stem,
            'pages': len(reader.pages),
            'objectives': objs,
            'sections': secs,
        }

    total_sections = sum(len(n['sections']) for n in notes.values())
    total_objects = sum(len(n['objectives']) for n in notes.values())

    print('chapters with notes : %d/%d' % (len(notes), len(CHAPTERS)))
    print('sections extracted  : %d' % total_sections)
    print('objectives extracted: %d' % total_objects)
    for cid in sorted(notes):
        n = notes[cid]
        print('  %-4s %2d sections  %d objectives  %2d pages'
              % (cid, len(n['sections']), len(n['objectives']), n['pages']))
    if problems:
        print('\nproblems:')
        for p in problems:
            print('  - ' + p)

    if args.report:
        print('\n--- sample: chapter 205 ---')
        for s in notes.get('205', {}).get('sections', [])[:6]:
            print('  %-7s %s' % (s['n'], s['t']))
            print('          %s' % s['b'][:150])

    body = json.dumps(notes, ensure_ascii=False, indent=0, separators=(',', ':'))
    OUT.write_text(
        '/* GENERATED by tools/extract/build-accountancy-notes.py.\n'
        '   Do not edit by hand: re-run the script instead.\n'
        '   Class 12 Accountancy chapter notes extracted from the NCERT chapter\n'
        '   PDFs: numbered section outline, opening sentences and the book\'s own\n'
        '   learning objectives. Outlines only - the chapters themselves are not\n'
        '   reproduced. */\n'
        'window.UP = window.UP || {};\n'
        'UP.accountancyNotes = ' + body + ';\n',
        encoding='utf-8')
    print('\nwrote %s (%.0f KB)' % (OUT.relative_to(ROOT), OUT.stat().st_size / 1024))
    return 0 if not problems else 1


if __name__ == '__main__':
    sys.exit(main())
