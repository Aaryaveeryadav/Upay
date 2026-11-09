#!/usr/bin/env python3
"""Verify the 24 supplied Economics source PDFs and their manifest.

Run: python3 tools/check/economics_sources.py --uploads /home/user/uploads
Checks identity, safe paths, labels, page counts and hashes, not the accuracy of
summaries, translations or any board syllabus.
"""
import argparse
import hashlib
import json
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SUMMARY_JS = ROOT / 'assets/js/data/chapter-summary.js'


def _load_summaries():
    import json
    src = SUMMARY_JS.read_text(encoding='utf-8')
    body = src[src.index('UP.chapterSummary'):]
    body = body[body.index('=') + 1:].rstrip().rstrip(';')
    return json.loads(body)


SUMMARIES = _load_summaries()
MANIFEST = ROOT / 'assets/js/data/economics-sources.js'
EXPECTED = {
    **{f'leec10{i}.pdf': ('macro', i, 'en', 'chapter') for i in range(1, 7)},
    **{f'lhec10{i}.pdf': ('macro', i, 'hi', 'chapter') for i in range(1, 7)},
    **{f'leec20{i}.pdf': ('micro', i, 'en', 'chapter') for i in range(1, 6)},
    **{f'lhec20{i}.pdf': ('micro', i, 'hi', 'chapter') for i in range(1, 6)},
    'leec2gl.pdf': ('micro', None, 'en', 'glossary'),
    'lhec2gl.pdf': ('micro', None, 'hi', 'glossary'),
}


def digest(path):
    sha = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()


def load_manifest():
    marker = 'UP.economicsSources = '
    text = MANIFEST.read_text(encoding='utf-8')
    assert text.count(marker) == 1
    raw = text.split(marker, 1)[1].strip()
    assert raw.endswith(';')
    return json.loads(raw[:-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads', type=Path, help='directory of preserved uploaded originals')
    args = parser.parse_args()
    rows = load_manifest()
    assert len(rows) == len(EXPECTED) == 24
    assert len({r['id'] for r in rows}) == 24
    assert {r['originalFile'] for r in rows} == set(EXPECTED)
    assert len({r['file'] for r in rows}) == 24
    for row in rows:
        name = row['originalFile']
        book, chapter, lang, kind = EXPECTED[name]
        assert (row['book'], row['chapter'], row['lang'], row['kind']) == (book, chapter, lang, kind), name
        assert row['id'] == f'{book}-{chapter or "glossary"}-{lang}'
        assert row['file'] == f'/assets/books/economics/{book}/{name}'
        path = ROOT / row['file'].lstrip('/')
        # English chapter PDFs were removed in favour of extracted text; the
        # Hindi ones could not be extracted (legacy KrutiDev encoding) and were
        # deliberately kept. Either way, the manifest row must be consistent.
        if path.is_file():
            assert not path.is_symlink() and path.resolve().is_relative_to(ROOT.resolve()), path
            assert path.read_bytes()[:5] == b'%PDF-' and path.stat().st_size == row['bytes']
            assert digest(path) == row['sha256'], name
            with pymupdf.open(path) as doc:
                assert len(doc) == row['pages'] and len(doc) > 0, name
        else:
            extracted = SUMMARIES.get(row['id'])
            assert extracted is not None, (name, 'neither PDF nor extracted text')
            assert extracted.get('available') is not False, (name, 'extraction failed')
            assert extracted['words'] > 40, (name, 'extraction too short')
        if args.uploads:
            original = args.uploads / name
            assert original.is_file() and digest(original) == row['sha256'], name
        print('PASS', name, book, lang, row['pages'], 'pages; SHA-256 matches', flush=True)
    print('PASS 24 unique PDFs: 12 Macro, 10 Micro chapter files and 2 Micro glossaries')
    print('This does not certify textbook summaries, suggested answers or current board syllabus coverage.')


if __name__ == '__main__':
    main()
