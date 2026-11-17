#!/usr/bin/env python3
"""Structural checks only; not certification of transcription or answer accuracy."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2] / 'extracted/2015-all-india'
manifest = json.loads((root / 'manifest.json').read_text())
assert len(manifest) == 18
included = [x for x in manifest if 'output' in x]
assert len(included) == 9
assert sum(x['pages'] for x in included) == 138
assert sum(x['status'] == 'excluded-subject' for x in manifest) == 6
by_name = {x['file']: x for x in manifest}
social_q = by_name['Social Science Question Paper 2015(All India).pdf']
social_s = by_name['Social Science Solution 2015(All India).pdf']
assert social_s['sha256'] == social_q['sha256']
assert social_s['duplicateOf'] == social_q['file']
ocr_pages = 0
for item in included:
    record = json.loads((root / item['output']).read_text())
    assert record['sha256'] == item['sha256']
    assert len(record['pages']) == item['pages']
    for n, page in enumerate(record['pages'], 1):
        assert page['page'] == n
        assert page['requiresVisualReview'] is True
        assert not re.search('[\u0900-\u097f]', page['text'])
        ocr_pages += page['method'] == 'english-ocr-unverified'
    assert (root / item['output'].replace('.json', '.md')).exists()
assert ocr_pages == 11
print('PASS: 18 sources, 9 extracted documents, 138 pages, 11 OCR pages; exclusions and duplicates checked.')
