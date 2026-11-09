#!/usr/bin/env python3
"""Structural/provenance checks; optional PDF checks do not certify content."""
import hashlib, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
root = Path(__file__).resolve().parents[2]
notes = json.loads((root/'assets/notes/outlines.json').read_text())
manifest = json.loads((root/'assets/img/notes/manifest.json').read_text())
ledger = json.loads((root/'assets/notes/chemistry-batch.json').read_text())
bs, chem = notes['business_studies'], notes['chemistry']
assert len(bs) == 11 and [c['id'] for c in chem] == ['lech101','lech102','lech103','lech104']
assert {x['source_file'] for x in ledger['sources']} == {f'lech10{i}.pdf' for i in range(1,5)} | {'lech1an.pdf','lech2an.pdf'}
for c in bs + chem:
    assert c['title'] and c['sections'] and c['objectives'] and c['terms']
    assert 150 <= len(c['summary']) <= 320
    assert len(c['sha256']) == 64
    assert not re.search(r'Reprint|NOT TO BE REPUBLISHED', c['summary'], re.I)
consumer = next(c for c in bs if c['id'] == 'lebs203')
assert '2019' in consumer['summary'] and '1986' not in consumer['summary']
images = manifest['images']
assert len(images) == 4 and len({x['sha256'] for x in images}) == len(images)
for item in images:
    path = root / item['path']
    assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
    assert path.name == item['sha256'] + '.png'
    assert item['origin'] == 'source-pdf-crop' and item['ai_drawn'] is False
    assert any(c['image'] == item['path'] and c['sha256'] == item['source_sha256'] for c in chem)
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
    directory=Path(sys.argv[1]); norm=lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    for record in ledger['sources']:
        f=directory/record['source_file']; assert hashlib.sha256(f.read_bytes()).hexdigest() == record['sha256']
        doc=pymupdf.open(f); assert len(doc)==record['pages']
        assert sum(bool(p.get_text().strip()) for p in doc)==record['text_nonempty_pages']
    for c in chem:
        doc=pymupdf.open(directory/c['source']); text=norm(' '.join(p.get_text() for p in doc))
        assert all(norm(t) in text for t in c['terms']), c['id']
    print('PASS: PDF hashes, counts and Chemistry key terms match sources')
print('PASS: outline structure, legal safeguard, image provenance, hashes and page links')
