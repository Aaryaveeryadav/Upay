#!/usr/bin/env python3
"""Structural checks only; they do not certify source accuracy or board review."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
data = json.loads((root / 'tools/extract/staging/business-studies-en.json').read_text())
expected = {f'lebs1{i:02d}' for i in range(1, 9)} | {f'lebs2{i:02d}' for i in range(1, 4)}
assert set(data['chapters']) == expected
assert 'not reviewed' in data['status']
for stem, chapter in data['chapters'].items():
    assert chapter['source'] == stem + '.pdf'
    assert len(chapter['sha256']) == 64
    assert chapter['title'] and chapter['sections'] and chapter['objectives'] and chapter['key_terms']
    assert 0 < len(chapter['summary_excerpt']) <= 300
    assert 1 <= chapter['summary_page'] <= chapter['pages']
    assert all(s['title'] and 1 <= s['page'] <= chapter['pages'] for s in chapter['sections'])
    assert all(len(o) <= 200 for o in chapter['objectives'])
assert 'publicity' in data['chapters']['lebs202']['objectives'][-1]
print('PASS: 11 staged outlines structurally valid; source review still required')

# Optional source verification before deleting the supplied chapter PDFs.
# This confirms textual correspondence, not CBSE syllabus/board verification.
import sys
if len(sys.argv) > 1:
    import hashlib, logging, re
    from pypdf import PdfReader
    logging.getLogger('pypdf').setLevel(logging.ERROR)
    def norm(s):
        return re.sub(r'[^a-z0-9]', '', s.lower())
    for stem, c in data['chapters'].items():
        pdf = Path(sys.argv[1]) / c['source']
        assert hashlib.sha256(pdf.read_bytes()).hexdigest() == c['sha256'], stem
        reader = PdfReader(pdf)
        pages = [p.extract_text() or '' for p in reader.pages]
        assert len(pages) == c['pages'], stem
        assert all(norm(o) in norm(pages[0]) for o in c['objectives']), stem
        assert norm(c['summary_excerpt']) in norm(pages[c['summary_page'] - 1]), stem
        assert all(norm(s['title']) in norm(pages[s['page'] - 1]) for s in c['sections']), stem
        assert all(any(norm(t) in norm(p) for p in pages) for t in c['key_terms']), stem
    print('PASS: hashes, objective text, excerpts, headings and key terms matched the source text')
