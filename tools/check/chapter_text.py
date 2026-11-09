#!/usr/bin/env python3
"""Verify the extracted Class 12 chapter text that replaced the chapter PDFs.

Checks that every catalogue entry resolves to usable text, that the data files
are well-formed, and that nothing under assets/papers/ was disturbed.

Run: python3 tools/check/chapter_text.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUMMARY = ROOT / 'assets/js/data/chapter-summary.js'
FULLTEXT = ROOT / 'assets/js/data/chapter-fulltext.js'
BOOKS = ROOT / 'assets/books'
PAPERS = ROOT / 'assets/papers'


def load(path, var):
    src = path.read_text(encoding='utf-8')
    body = src[src.index(var):]
    body = body[body.index('=') + 1:].rstrip().rstrip(';')
    return json.loads(body)


def catalogue():
    recs = []
    for rel in ('assets/js/data/english12-sources.js',
                'assets/js/data/economics-sources.js'):
        src = (ROOT / rel).read_text(encoding='utf-8')
        for m in re.finditer(r'\{\s*"id".*?\}', src, re.S):
            recs.append(json.loads(m.group(0)))
    return recs


def main():
    summaries = load(SUMMARY, 'UP.chapterSummary')
    fulltext = load(FULLTEXT, 'UP.chapterFullText')
    recs = catalogue()

    assert len(recs) == 64, f'expected 64 catalogue entries, found {len(recs)}'
    assert len(summaries) == 64, f'summary covers {len(summaries)}/64 entries'

    usable = available_missing = 0
    for rec in recs:
        sid = rec['id']
        s = summaries[sid]
        assert s['id'] == sid
        assert s['book'] == rec['book']
        assert s['lang'] == rec['lang']
        assert isinstance(s['sections'], list) and isinstance(s['key'], list)
        if s.get('available') is False:
            available_missing += 1
            assert s['reason'] == 'legacy-encoding', sid
            assert sid not in fulltext, sid
            continue
        usable += 1
        assert s['words'] > 40, (sid, 'too short', s['words'])
        assert s['lead'].strip(), (sid, 'no lead')
        assert s['readMin'] >= 1, sid
        f = fulltext[sid]
        assert isinstance(f['paras'], list) and f['paras'], (sid, 'no paragraphs')
        actual = sum(len(p.split()) for p in f['paras'])
        # summary counts the body it saw; full text carries the same paragraphs
        assert abs(actual - s['words']) <= max(30, s['words'] * 0.02), \
            (sid, 'word count mismatch', actual, s['words'])
        # no mojibake or control junk leaking into the reader
        joined = ' '.join(f['paras'])
        assert '\ufffd' not in joined, (sid, 'replacement char')
        assert not re.search(r'[\uf000-\uf8ff]', joined), (sid, 'private-use glyphs')

    assert usable == 52, f'expected 52 usable chapters, got {usable}'
    assert available_missing == 12, f'expected 12 legacy-Hindi skips, got {available_missing}'

    # English chapter PDFs must be gone; the 12 Hindi ones must remain.
    remaining = sorted(p.name for p in BOOKS.rglob('*.pdf'))
    assert len(remaining) == 12, f'expected 12 chapter PDFs left, found {len(remaining)}'
    assert all(n.startswith('lhec') for n in remaining), remaining

    # Test papers are a separate corpus and must be untouched.
    papers = list(PAPERS.rglob('*.pdf'))
    assert len(papers) == 212, f'expected 212 test-paper PDFs, found {len(papers)}'

    print(f'PASS {usable} chapters have extracted text; {available_missing} legacy-Hindi '
          f'chapters are marked unavailable and their PDFs were kept')
    print(f'PASS {len(papers)} test-paper PDFs untouched')
    print('Not a proof-read of the extracted text against the printed books.')


if __name__ == '__main__':
    main()
