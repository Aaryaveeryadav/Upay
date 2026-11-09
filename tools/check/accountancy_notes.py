#!/usr/bin/env python3
"""Verify the extracted Class 12 Accountancy chapter outline.

The chapters used to be navigation records only, so their Concepts tab repeated
the one-line description under a "PYQ coverage" heading. They now carry an
outline extracted from the NCERT chapter PDFs by
tools/extract/build-accountancy-notes.py.

This check confirms the data is present, complete and clean:

  * every one of the ten chapters has objectives and sections
  * no print debris reached the student-facing text
  * no objective is a fragment or a bare running head
  * the page actually reads the file (boot.js loads it, app.js uses it)

Run: python3 tools/check/accountancy_notes.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NOTES = ROOT / 'assets/js/data/accountancy-chapters.js'
BOOT = ROOT / 'assets/js/boot.js'
APP = ROOT / 'assets/js/app.js'

EXPECTED = ['101', '102', '103', '104', '201', '202', '203', '204', '205', '206']

# Words that must never end an objective, and a hyphen split that the extractor
# already repairs -- if either reappears the extractor regressed.
DANGLING = {
    'a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'for', 'with', 'by', 'on',
    'at', 'as', 'from', 'that', 'which', 'their', 'its', 'this', 'these', 'those',
}
SPLIT_WORD = re.compile(
    r'\b[a-z]{3,}-(?:ment|tion|sion|ing|ed|ly|ness|ity|ance|ence|al|s)\b'
    r'|\b(?:err ors|o f the|retirement\s+/|ratio\s+,)')

DEBRIS = re.compile(
    r'Reprint|NOT TO BE REPUBLISHED|Rationalised|©\s*NCERT|Chap\s*\d*\.?indd'
    r'|EXEMPLAR PROBLEMS|LEARNING OBJECTIVES')

failures = []
notes = []


def check(cond, msg):
    if not cond:
        failures.append(msg)


def main():
    src = NOTES.read_text(encoding='utf-8')
    body = src[src.index('UP.accountancyNotes'):]
    body = body[body.index('=') + 1:].rstrip().rstrip(';')
    data = json.loads(body)

    check(sorted(data) == sorted(EXPECTED),
          'chapter ids differ: %s' % sorted(data))

    total_sections = total_objectives = 0
    for cid in sorted(data):
        n = data[cid]
        secs, objs = n.get('sections', []), n.get('objectives', [])
        total_sections += len(secs)
        total_objectives += len(objs)

        check(len(secs) >= 4, 'chapter %s has only %d sections' % (cid, len(secs)))
        check(len(objs) >= 2, 'chapter %s has only %d objectives' % (cid, len(objs)))
        check(n.get('pages', 0) > 10, 'chapter %s page count looks wrong' % cid)

        for s in secs:
            check(bool(re.match(r'^\d+\.\d', s['n'])),
                  'chapter %s has a section with a bad number: %r' % (cid, s['n']))
            check(len(s['t']) >= 4, 'chapter %s section %s has no title' % (cid, s['n']))
            check(len(s['b']) >= 40,
                  'chapter %s section %s has no summary' % (cid, s['n']))
            check(not DEBRIS.search(s['t']) and not DEBRIS.search(s['b']),
                  'chapter %s section %s carries print debris' % (cid, s['n']))

        for o in objs:
            check(8 <= len(o) <= 130,
                  'chapter %s objective has a bad length: %r' % (cid, o))
            check(not DEBRIS.search(o),
                  'chapter %s objective carries print debris: %r' % (cid, o))
            check(not re.search(r'\b\d{1,3}$', o),
                  'chapter %s objective ends in a page number: %r' % (cid, o))
            check(o[0].isupper(),
                  'chapter %s objective does not start a sentence: %r' % (cid, o))
            last = o.rstrip('.').split()[-1].lower() if o.split() else ''
            check(last not in DANGLING,
                  'chapter %s objective ends on a function word: %r' % (cid, o))
            split = SPLIT_WORD.search(o)
            check(split is None,
                  'chapter %s objective has a split word: %r'
                  % (cid, split.group(0) if split else ''))
            check(not re.search(r'\s[,.;:]', o),
                  'chapter %s objective has detached punctuation: %r' % (cid, o))

    check(total_sections >= 100, 'only %d sections extracted overall' % total_sections)
    notes.append('%d chapters, %d sections, %d objectives'
                 % (len(data), total_sections, total_objectives))

    # the UI must actually reach the data
    check('accountancy-chapters.js' in BOOT.read_text(encoding='utf-8'),
          'boot.js does not load accountancy-chapters.js')
    app = APP.read_text(encoding='utf-8')
    check('UP.accountancyNotes' in app,
          'app.js never reads UP.accountancyNotes')
    check('chapter-notes' in app,
          'app.js does not render the extracted outline')

    # no whole-chapter copying: the outline must stay an outline
    avg = total_sections and sum(
        len(s['b']) for n in data.values() for s in n['sections']) / total_sections
    check(avg < 400, 'section summaries average %.0f chars — that is copying, not an outline' % avg)
    notes.append('average section summary: %.0f characters' % avg)

    print('accountancy chapter notes')
    for n in notes:
        print('  ' + n)

    if failures:
        print('\nFAIL')
        for f in failures[:12]:
            print('  - ' + f)
        return 1
    print('\nPASS  all ten chapters have clean objectives and sections, '
          'and the UI is wired to them')
    return 0


if __name__ == '__main__':
    sys.exit(main())
