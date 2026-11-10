#!/usr/bin/env python3
"""Structural/provenance checks; optional PDF checks do not certify content."""
import hashlib, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
root = Path(__file__).resolve().parents[2]
notes = json.loads((root/'assets/notes/outlines.json').read_text())
manifest = json.loads((root/'assets/img/notes/manifest.json').read_text())
ledger = json.loads((root/'assets/notes/chemistry-batch.json').read_text())
ledger2 = json.loads((root/'assets/notes/chemistry-batch-2.json').read_text())
bio = json.loads((root/'assets/notes/biology-batch.json').read_text())
bs, chem = notes['business_studies'], notes['chemistry']
assert len(bs) == 12 and [c['id'] for c in chem] == ['lech101','lech102','lech103','lech104','lech105','lech201','lech202','lech203','lech204','lech205']
assert {x['source_file'] for x in ledger2['sources']} == {'lech105.pdf'} | {f'lech20{i}.pdf' for i in range(1,6)}
assert {x['source_file'] for x in ledger['sources']} == {f'lech10{i}.pdf' for i in range(1,5)} | {'lech1an.pdf','lech2an.pdf'}
BIO_TEXT = {f'lebo10{i}.pdf' for i in (3,5,7,9)} | {f'lebo11{i}.pdf' for i in range(0,4)}
BIO_SCAN = {f'lebo10{i}_compressed.pdf' for i in (1,2,4,6,8)}
assert {x['source_file'] for x in bio['sources']} == BIO_TEXT | BIO_SCAN
for record in bio['sources']:
    assert len(record['sha256']) == 64 and record['pages'] > 0
    assert record['text_nonempty_pages'] == 0 if record['source_file'] in BIO_SCAN else record['text_nonempty_pages'] == record['pages']
    assert record['figure_count'] == len(record['figures'])
    if record['source_file'] in BIO_SCAN:
        assert record['figure_count'] == 0 and record['classification'].startswith('image-only scan')
assert sum(r['figure_count'] for r in bio['sources']) == len(bio['crops']) == 59
for c in bs + chem:
    assert c['title'] and c['sections'] and c['objectives'] and c['terms']
    assert 150 <= len(c['summary']) <= 320
    if c['id'] == 'cbse-business-unit10':
        assert c['source_url'].startswith('https://cbseacademic.nic.in/')
    else:
        assert len(c['sha256']) == 64
    assert not re.search(r'Reprint|NOT TO BE REPUBLISHED', c['summary'], re.I)
staged=json.loads((root/'tools/extract/staging/business-studies-en.json').read_text())['chapters']
for chapter in bs:
    if chapter['id'] in staged:
        assert chapter['sha256'] == staged[chapter['id']]['sha256']
        assert chapter['source'] == staged[chapter['id']]['source']
consumer = next(c for c in bs if c['id'] == 'lebs203')
assert '2019' in consumer['summary'] and '1986' not in consumer['summary']
images = manifest['images']
assert len(images) == 139 and len({x['sha256'] for x in images}) == len(images)
for item in images:
    path = root / item['path']
    assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
    assert path.name == item['sha256'] + '.png'
    assert item['origin'] == 'source-pdf-crop' and item['ai_drawn'] is False
    assert any(c['sha256'] == item['source_sha256'] for c in chem + bio['sources'])
counts = {}
for item in images:
    counts[item['source_file']] = counts.get(item['source_file'], 0) + 1
chem_counts = {k: v for k, v in counts.items() if k.startswith('lech')}
bio_counts = {k: v for k, v in counts.items() if k.startswith('lebo')}
assert chem_counts == {'lech101.pdf': 11, 'lech102.pdf': 15, 'lech103.pdf': 12, 'lech104.pdf': 7, 'lech105.pdf': 14, 'lech201.pdf': 7, 'lech202.pdf': 1, 'lech203.pdf': 3, 'lech204.pdf': 2, 'lech205.pdf': 8}, chem_counts
assert bio_counts == {'lebo103.pdf': 6, 'lebo105.pdf': 17, 'lebo107.pdf': 11, 'lebo109.pdf': 8, 'lebo110.pdf': 3, 'lebo111.pdf': 5, 'lebo112.pdf': 7, 'lebo113.pdf': 2}, bio_counts
assert sum(bio_counts.values()) == len(bio['crops'])
by_sha = {x['sha256']: x for x in images}
for crop in bio['crops']:
    hit = by_sha[crop['sha256']]
    assert (hit['source_file'], hit['figure'], hit['pdf_page']) == (crop['source_file'], crop['figure'], crop['pdf_page']), crop
    assert hit['caption'] == crop['caption'] and hit['crop_points'] == crop['crop_points'], crop
# Chemistry outline attach (generated) must track outlines.json and the 2026-27 unit marks
chem_js = (root/'assets/js/data/chemistry-outlines.js').read_text()
payload, rest = chem_js.split('var data = ', 1)
attached = json.loads(rest[:rest.index(';\n')])
assert set(attached) == {str(700 + i) for i in range(1, 11)}
UNIT_MARKS = {1: 7, 2: 9, 3: 7, 4: 7, 5: 7, 6: 6, 7: 6, 8: 8, 9: 6, 10: 7}
for cid, outline in attached.items():
    unit = int(cid) - 700
    assert outline['unit'] == unit and outline['marks'] == UNIT_MARKS[unit]
    src = next(c for c in chem if c['id'] == outline['id'])
    assert outline['summary'] == src['summary'] and outline['sections'] == src['sections'] and outline['terms'] == src['terms']
assert sum(outline['marks'] for outline in attached.values()) == 70
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.ids=set(); self.img=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'img': self.img.append(a.get('src'))
page=Page(); html=(root/'assets/notes/index.html').read_text(); page.feed(html)
assert all(c['id'] in page.ids for c in bs+chem)
assert set(page.img) == {'/'+x['path'] for x in images}
assert 'practice, not board-verified' in html and 'not certified by CBSE' in html
assert '/assets/notes/index.html#business' in (root/'assets/js/app.js').read_text()
if len(sys.argv)>1:
    import pymupdf
    directories=[Path(arg) for arg in sys.argv[1:]]; norm=lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    def source(name):
        return next((d/name for d in directories if (d/name).is_file()), None)
    deleted={r['source_file'] for r in ledger['sources'] + ledger2['sources'] if str(r.get('disposition','')).startswith('deleted')}
    for record in ledger['sources'] + ledger2['sources']:
        name=record['source_file']
        if name in deleted:
            print('skip (deleted after verification):', name); continue
        f=source(name); assert f is not None, name; assert hashlib.sha256(f.read_bytes()).hexdigest() == record['sha256']
        doc=pymupdf.open(f); assert len(doc)==record['pages']
        assert sum(bool(p.get_text().strip()) for p in doc)==record['text_nonempty_pages']
    for record in bio['sources']:
        name=record['source_file']
        if str(record.get('disposition','')).startswith('deleted'):
            print('skip (deleted after verification):', name); continue
        f=source(name)
        if f is None and str(record.get('disposition','')).startswith('excluded'):
            print('skip (excluded from inventory, source not supplied):', name); continue
        assert f is not None, name
        assert hashlib.sha256(f.read_bytes()).hexdigest() == record['sha256'], name
        doc=pymupdf.open(f); assert len(doc)==record['pages'], name
        assert sum(bool(p.get_text().strip()) for p in doc)==record['text_nonempty_pages'], name
    for c in chem:
        src=source(c['source'])
        if src is None and c['source'] in deleted:
            print('skip key-terms (deleted after verification):', c['source']); continue
        doc=pymupdf.open(src); text=norm(' '.join(p.get_text() for p in doc))
        assert norm(c['title']) in text, c['id']
        assert all(norm(t) in text for t in c['terms']), c['id']
    print('PASS: PDF hashes, counts and Chemistry key terms match sources')
print('PASS: outline structure, legal safeguard, image provenance, hashes and page links')
