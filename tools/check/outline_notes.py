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
phy = json.loads((root/'assets/notes/physics-batch.json').read_text())
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
assert len(images) == 139 + len(phy['crops']) and len({x['sha256'] for x in images}) == len(images)
for item in images:
    path = root / item['path']
    assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
    assert path.name == item['sha256'] + '.png'
    assert item['origin'] == 'source-pdf-crop' and item['ai_drawn'] is False
    assert any(c['sha256'] == item['source_sha256'] for c in chem + bio['sources'] + phy['sources'])
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
# --- Biology: chapter outlines, their generated pack, and the figure mapping ---
bio_out = notes['biology']
BIO_UNITS = {6: 16, 7: 20, 8: 12, 9: 12, 10: 10}
assert len(bio_out) == 13 and [c['id'] for c in bio_out] == ['lebio8%02d' % i for i in range(1, 14)]
assert [c['chapter'] for c in bio_out] == list(range(1, 14))
for c in bio_out:
    assert c['title'] and 150 <= len(c['summary']) <= 320
    assert len(c['sections']) >= 6 and len(c['objectives']) == 3 and len(c['terms']) >= 8
    assert c['marks'] == BIO_UNITS[c['unit']] and 6 <= c['unit'] <= 10
    assert not re.search(r'Reprint|NOT TO BE REPUBLISHED', c['summary'] + ' '.join(c['sections']), re.I)
assert sum(BIO_UNITS.values()) == 70
bio_js = (root/'assets/js/data/biology-outlines.js').read_text()
bio_payload, bio_rest = bio_js.split('var data = ', 1)
bio_attached = json.loads(bio_rest[:bio_rest.index(';\n')])
assert sorted(int(k) for k in bio_attached) == list(range(1, 14))
assert sum(len(v['figures']) for v in bio_attached.values()) == 59
for cid, outline in bio_attached.items():
    src = bio_out[int(cid) - 1]
    assert outline['id'] == src['id'] and outline['summary'] == src['summary']
    assert outline['sections'] == src['sections'] and outline['terms'] == src['terms']
    assert outline['marks'] == BIO_UNITS[outline['unit']]
    for fig in outline['figures']:
        assert fig['fig'].split(':')[0].split('.')[0] == cid, (cid, fig['fig'])
        assert any(x['sha256'] == fig['sha256'] and x['figure'] == fig['fig'] and x['source_file'].startswith('lebo') for x in manifest['images']), fig
assert (root/'assets/js/data/biology-outlines.js').read_text() == bio_js
assert 'assets/js/data/biology-outlines.js' in (root/'assets/js/boot.js').read_text()
assert 'UP.biology12' in (root/'assets/js/data-extra.js').read_text()
# --- Physics: chapter outlines and their generated pack (no unit marks) ---
phy_out = notes['physics']
PHY_UNITS = {1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6, 11: 7, 12: 8, 13: 8, 14: 9}
assert len(phy_out) == 14 and [c['id'] for c in phy_out] == ['lephy12%02d' % i for i in range(1, 15)]
assert [c['chapter'] for c in phy_out] == list(range(1, 15))
for c in phy_out:
    assert c['title'] and 150 <= len(c['summary']) <= 320
    assert 6 <= len(c['sections']) <= 10 and len(c['objectives']) == 3 and 8 <= len(c['terms']) <= 16
    assert len(set(c['terms'])) == len(c['terms'])
    assert c['unit'] == PHY_UNITS[c['chapter']] and 1 <= c['unit'] <= 9
    # Physics claims no unit marks: the published 042 unit rows do not sum to 70.
    assert 'marks' not in c
    assert not re.search(r'Reprint|NOT TO BE REPUBLISHED', c['summary'] + ' '.join(c['sections']), re.I)
phy_js = (root/'assets/js/data/physics-outlines.js').read_text()
phy_payload, phy_rest = phy_js.split('var data = ', 1)
phy_attached = json.loads(phy_rest[:phy_rest.index(';\n')])
assert sorted(int(k) for k in phy_attached) == list(range(1, 15))
for cid, outline in phy_attached.items():
    src = phy_out[int(cid) - 1]
    assert outline['id'] == src['id'] and outline['summary'] == src['summary']
    assert outline['sections'] == src['sections'] and outline['objectives'] == src['objectives']
    assert outline['terms'] == src['terms'] and outline['unit'] == src['unit']
    assert 'marks' not in outline
    expected = [x for x in images if x['source_file'].startswith('leph') and x['figure'].split('.')[0] == cid]
    assert len(outline['figures']) == len(expected)
    assert {f['sha256'] for f in outline['figures']} == {f['sha256'] for f in expected}
assert (root/'assets/js/data/physics-outlines.js').read_text() == phy_js
assert 'assets/js/data/physics-outlines.js' in (root/'assets/js/boot.js').read_text()
assert 'UP.physics12' in (root/'assets/js/data-extra.js').read_text()
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.ids=set(); self.img=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'img': self.img.append(a.get('src'))
page=Page(); html=(root/'assets/notes/index.html').read_text(); page.feed(html)
assert all(c['id'] in page.ids for c in bs+chem+bio_out+phy_out)
assert set(page.img) == {'/'+x['path'] for x in images}
assert 'practice, not board-verified' in html and 'not certified by CBSE' in html
# Headings and eyebrows name the chapter or unit; a supplied PDF filename is
# provenance and belongs in the sources prose, not in a label.
for _m in re.finditer(r'<(h[1-4]|div class="eyebrow")[^>]*>(.*?)</\1>', html, re.S):
    assert '.pdf' not in _m.group(2), 'filename in a heading: %r' % _m.group(2)[:80]
assert '<h3>Chapter 3 · Reproductive Health</h3>' in html
assert '<h3>Unit 1 · Solutions</h3>' in html
assert '/assets/notes/index.html#business' in (root/'assets/js/app.js').read_text()
# Physics ledger includes all supplied files, even chapters pending review.
phy_images = [x for x in images if x['source_file'].startswith('leph')]
assert len(phy_images) == len(phy['crops']) == sum(s['figure_count'] for s in phy['sources'])
for record in phy['sources']:
    hits = [x for x in phy_images if x['source_file'] == record['source_file']]
    assert record['figure_count'] == len(record['figures']) == len(hits)
    assert set(record['figures']) == {x['figure'] for x in hits}
    assert record['text_nonempty_pages'] == record['pages']
for crop in phy['crops']:
    hit = by_sha[crop['sha256']]
    for key in ('source_file', 'figure', 'pdf_page', 'caption', 'crop_points'):
        assert hit[key] == crop[key], (key, crop)
    assert hit['edit'] == 'none' and crop['verified'].startswith('visual inspection')
assert 'figures-phy' in page.ids
assert '<h3>Chapter 8 · Electromagnetic Waves</h3>' in html
if '--physics-pdfs' in sys.argv:
    import pymupdf
    i = sys.argv.index('--physics-pdfs')
    directory = Path(sys.argv[i+1]); del sys.argv[i:i+2]
    for record in phy['sources']:
        f = directory / record['source_file']
        assert hashlib.sha256(f.read_bytes()).hexdigest() == record['sha256']
        doc = pymupdf.open(f)
        assert len(doc) == record['pages']
        assert sum(bool(p.get_text().strip()) for p in doc) == record['text_nonempty_pages']
    print('PASS: all 15 Physics PDF hashes and text-layer page counts')
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
