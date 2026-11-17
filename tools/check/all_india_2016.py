#!/usr/bin/env python3
"""Structural regression checks, not certification of OCR/answer accuracy."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'extracted/2016-all-india'
EXPECTED = {
    'Communicative Question Paper': 8,
    'Communicative Solution': 26,
    'Language & Literature Paper': 8,
    'Language & Literature Solution': 25,
    'Maths Question Paper': 15,
    'Maths Solution': 22,
    'Science Question Paper': 16,
    'Science Solution': 8,
    'Social Science Question Paper': 11,
    'Social Science Solution': 14,
}


def main():
    manifest = json.loads((OUT / 'manifest.json').read_text())
    assert len(manifest) == 16
    assert len({x['file'] for x in manifest}) == 16
    assert all(x['year'] == 2016 and '2016' in x['file'] and '2015' not in x['file'] for x in manifest)
    included = [x for x in manifest if 'output' in x]
    excluded = [x for x in manifest if x['status'] == 'excluded-subject']
    assert len(included) == 10 and len(excluded) == 6
    assert all(x['file'].startswith(('Hindi', 'Sanskrit')) and 'output' not in x for x in excluded)
    assert len({x['sha256'] for x in included}) == 10
    assert sum(x['pages'] for x in included) == 153
    ocr_pages, text_pages = 0, 0
    for name, expected_pages in EXPECTED.items():
        item = next(x for x in included if x['file'] == name + ' 2016(All India).pdf')
        assert item['pages'] == expected_pages
        assert re.fullmatch(r'[a-f0-9]{64}', item['sha256'])
        record = json.loads((OUT / item['output']).read_text())
        assert record['year'] == 2016 and record['source'] == item['file']
        assert record['sha256'] == item['sha256']
        assert record['status'] == 'extracted-not-question-verified'
        assert record['kind'] == item['kind']
        assert len(record['pages']) == expected_pages
        is_paper = record['kind'] == 'question-paper'
        for n, page in enumerate(record['pages'], 1):
            assert page['page'] == n and page['requiresVisualReview'] is True
            assert not re.search('[\u0900-\u097f\x00-\x08\x0b\x0c\x0e-\x1f]', page['text'])
            if is_paper:
                assert page['method'] == 'english-ocr-unverified'
                assert page['maskedHindiLines'] >= 0
                ocr_pages += 1
            else:
                assert page['method'] == 'text-layer'
                text_pages += 1
        md = OUT / item['output'].replace('.json', '.md')
        assert md.exists() and 'Year: 2016.' in md.read_text()
    assert (ocr_pages, text_pages) == (58, 95)
    assert len(list(OUT.glob('*.json'))) == 11
    assert len(list(OUT.glob('*.md'))) == 11
    print('PASS: 2016-only inventory; 16 sources, 6 exclusions, 10 documents, 153 pages (58 OCR, 95 text-layer).')


if __name__ == '__main__':
    main()
