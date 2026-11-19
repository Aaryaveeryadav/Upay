"""Append the second supplied batch of Hindi Core papers to the archive.

OMP_THREAD_LIMIT=1 python tools/extract/hindi12_papers_batch2.py INPUT TESSDATA
Requires pymupdf, pillow and tesserocr; use tessdata_fast hin and eng models.
The 20 files in this batch use different series from batch 1 (same codes,
different content), so colliding codes get a series suffix in their IDs.
Boundaries are source locations, not arithmetic inferred from marks/answers.
"""
import hashlib
import json
import re
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import pymupdf
import tesserocr
from PIL import Image

DEST = Path('assets/papers/hindi-core')

# (source filename, id, code, series, set, kind)
JOBS = [
    ('2-1-1 HINDI CORE.pdf', '2-1-1-yzw1x', '2/1/1', 'YZW1X', 1, 'scan'),
    ('2-1-2 HINDI CORE.pdf', '2-1-2-yzw1x', '2/1/2', 'YZW1X', 2, 'scan'),
    ('2-1-3 HINDI CORE.pdf', '2-1-3-yzw1x', '2/1/3', 'YZW1X', 3, 'scan'),
    ('2-2-1 HINDI CORE.pdf', '2-2-1-wyx2z', '2/2/1', 'WYX2Z', 1, 'scan'),
    ('2-2-2 HINDI CORE.pdf', '2-2-2-wyx2z', '2/2/2', 'WYX2Z', 2, 'scan'),
    ('2-2-3 HINDI CORE.pdf', '2-2-3-wyx2z', '2/2/3', 'WYX2Z', 3, 'scan'),
    ('2-4-1 HINDI CORE.pdf', '2-4-1-yxwz4', '2/4/1', 'YXWZ4', 1, 'digital'),
    ('2-4-2 HINDI CORE.pdf', '2-4-2-yxwz4', '2/4/2', 'YXWZ4', 2, 'digital'),
    ('2-4-3 HINDI CORE.pdf', '2-4-3-yxwz4', '2/4/3', 'YXWZ4', 3, 'digital'),
    ('2-5-1 HINDI CORE.pdf', '2-5-1-5wxzy', '2/5/1', '5WXZY', 1, 'digital'),
    ('2-5-2 HINDI CORE.pdf', '2-5-2-5wxzy', '2/5/2', '5WXZY', 2, 'digital'),
    ('2-5-3 HINDI CORE.pdf', '2-5-3-5wxzy', '2/5/3', '5WXZY', 3, 'digital'),
    ('2-6-1 HINDI CORE.pdf', '2-6-1', '2/6/1', 'ZW6YX', 1, 'digital'),
    ('2-6-2 HINDI CORE.pdf', '2-6-2', '2/6/2', 'ZW6YX', 2, 'digital'),
    ('2-6-3 HINDI CORE.pdf', '2-6-3', '2/6/3', 'ZW6YX', 3, 'digital'),
    ('2-7-1 HINDI CORE.pdf', '2-7-1-wyx7z', '2/7/1', 'WYX7Z', 1, 'digital'),
    ('2-7-2 HINDI CORE.pdf', '2-7-2-wyx7z', '2/7/2', 'WYX7Z', 2, 'digital'),
    ('2-S-1_Hindi Core.pdf', '2-s-1', '2/S/1', 'WXYZ/S', 1, 'digital'),
    ('2-S-2_Hindi Core.pdf', '2-s-2', '2/S/2', 'WXYZ/S', 2, 'digital'),
    ('2-S-3_Hindi Core.pdf', '2-s-3', '2/S/3', 'WXYZ/S', 3, 'digital'),
]

# Scanned PDFs: Q1-Q12 label positions read from the printed left margins
# (PDF page, vertical top of printed label in PDF points).
SCAN_LABELS = {
    '2-1-1-yzw1x': [(2,479),(5,124),(7,402),(7,588),(8,281),(8,544),(10,589),(11,243),(11,451),(13,594),(14,275),(14,523)],
    '2-1-2-yzw1x': [(2,472),(5,121),(7,418),(8,125),(8,295),(8,585),(9,278),(9,572),(11,583),(12,247),(12,529),(15,125)],
    '2-1-3-yzw1x': [(2,486),(5,124),(7,377),(7,568),(8,301),(8,582),(10,610),(11,275),(11,552),(14,125),(14,400),(15,125)],
    '2-2-1-wyx2z': [(2,464),(5,127),(7,228),(7,424),(8,125),(8,412),(11,125),(11,330),(11,486),(13,566),(14,279),(14,588)],
    '2-2-2-wyx2z': [(2,480),(5,121),(7,468),(8,125),(8,321),(8,599),(9,245),(11,477),(12,125),(12,416),(13,121),(15,125)],
    '2-2-3-wyx2z': [(2,456),(5,127),(7,220),(7,436),(8,125),(8,415),(9,125),(9,396),(11,481),(12,212),(14,367),(15,125)],
}

# Printed right-margin totals read from the scanned sets.
SCAN_MARKS = {
    '2-1-1-yzw1x': '10 8 6 4×2=8 2×4=8 5×1=5 2×3=6 2×2=4 5×1=5 2×3=6 2×2=4 2×5=10',
    '2-1-2-yzw1x': '8 10 4×2=8 6 2×4=8 2×3=6 2×2=4 5×1=5 2×2=4 2×3=6 5×1=5 2×5=10',
    '2-1-3-yzw1x': '10 8 6 4×2=8 2×4=8 5×1=5 2×3=6 2×2=4 5×1=5 2×2=4 2×3=6 2×5=10',
    '2-2-1-wyx2z': '10 8 6 4×2=8 2×4=8 5×1=5 2×3=6 2×2=4 5×1=5 2×3=6 2×2=4 2×5=10',
    '2-2-2-wyx2z': '8 10 4×2=8 6 2×4=8 2×2=4 5×1=5 2×3=6 2×3=6 2×2=4 5×1=5 2×5=10',
    '2-2-3-wyx2z': '10 8 2×4=8 4×2=8 6 2×2=4 2×3=6 5×1=5 2×3=6 5×1=5 2×2=4 2×5=10',
}

SCAN_HASHES = {
    '2-1-1-yzw1x': '00f89b31c500623213f4cdbae2c1cc3250b2993227aa0183f3bc9cd4e948daec',
    '2-1-2-yzw1x': '88b63320ec9cb802fd619ca7bb32165acc9a2e747caa3f8085e5f6f0b8836f22',
    '2-1-3-yzw1x': '3230e4661c665ce2bd64993a765b3c7ec3a74b383a08a6d1780f63426b128602',
    '2-2-1-wyx2z': '16eb600eb9774ba717ee7f8e71393640db517687b260804838b1d71b3bd9f125',
    '2-2-2-wyx2z': '9c21129356538685ea6ccea1f91f60cae74061c1c298a329d35ce721cacf4c54',
    '2-2-3-wyx2z': 'edbe42a556f6f016e89162b2dac11e6a82c6810408ce54e7e44ab3fcd8319d7f',
}


def ocr(api, page, top, bottom):
    clip = pymupdf.Rect(0, top, page.rect.width, bottom)
    pix = page.get_pixmap(dpi=205, clip=clip, colorspace=pymupdf.csGRAY)
    api.SetImage(Image.frombytes('L', (pix.width, pix.height), pix.samples))
    text = api.GetUTF8Text().strip()
    return '\n'.join(re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines())


def digital_labels_and_marks(doc):
    """Main labels sit at x<60; subparts are indented. Marks are inline at
    the right (x>450): either 'A´B=C' (2/S) or split 'A' + 'B=C' tokens."""
    labels, marks = [], {}
    for i, page in enumerate(doc, 1):
        words = page.get_text('words')
        for x, y, _, _, word, *_ in words:
            if x >= 60 or not re.fullmatch(r'(?:[1-9]|1[0-2])\.', word):
                continue
            n = int(word[:-1])
            labels.append((n, i, max(0, y - 4)))
            near = [w[4] for w in words if w[0] > 450 and -8 <= w[1] - y <= 45]
            mark = None
            for t in near:
                m = re.fullmatch(r'(\d+)´(\d+)=(\d+)', t)
                if m:
                    mark = f'{m.group(1)}×{m.group(2)}={m.group(3)}'
                    break
            if mark is None:
                for a, b in zip(near, near[1:]):
                    if re.fullmatch(r'\d+', a) and re.fullmatch(r'\d+=\d+', b):
                        mark = a + '×' + b
                        break
            if mark is None:
                for t in near:
                    if re.fullmatch(r'\d+', t):
                        mark = t
                        break
            marks[n] = mark
    return labels, marks


def extract(job):
    source, pid, code, series, set_no, kind = job
    scanned = kind == 'scan'
    pages, labels = [], []
    with pymupdf.open(source) as doc, tesserocr.PyTessBaseAPI(path=TESSDATA, lang='hin+eng') as api:
        if scanned:
            assert hashlib.sha256(source.read_bytes()).hexdigest() == SCAN_HASHES[pid]
            labels = [(i, p, max(0, y - 4)) for i, (p, y) in enumerate(SCAN_LABELS[pid], 1)]
        else:
            cover = doc[0].get_text()
            assert 'HINDI (Core)' in cover and '80' in cover
            assert re.search(r'Series\s*:?\s*([\w/]+)', cover)[1] == series
            labels, _ = digital_labels_and_marks(doc)
        assert [n for n, _, _ in labels] == list(range(1, 13)), pid
        active = None
        for i, page in enumerate(doc, 1):
            if i == 1 or (scanned and i == len(doc)):
                pages.append([dict(question=None, text=ocr(api, page, 0, page.rect.height))])
                continue
            top, bottom = (62, 795) if scanned else (40, 800)
            starts = [(y, n) for n, p, y in labels if p == i]
            segments = []
            for y, n in starts + [(bottom, None)]:
                if y - top > 4:
                    text = ocr(api, page, top, y)
                    if text:
                        segments.append(dict(question=active, text=text))
                active, top = (n if n is not None else active), y
            pages.append(segments)
    questions = [dict(number=n, startPage=p) for n, p, _ in labels]
    record = dict(id=pid, code=code, cls=12, board='cbse', subject='hindi-core',
                  series=series, set=set_no, source=source.name,
                  sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                  pdf=f'/assets/papers/hindi-core/{pid}.pdf', pageCount=len(pages),
                  maxMarks=80, durationMinutes=180, status='unverified-ocr',
                  method='scan-ocr' if scanned else 'rendered-ocr-with-embedded-number-labels')
    shutil.copyfile(source, DEST / f'{pid}.pdf')
    return assemble(record, questions, pages)


def assemble(record, questions, pages):
    """Store each text fragment once, retaining PDF-page boundaries inside a question."""
    if record['id'] in SCAN_MARKS:
        marks = dict(enumerate(SCAN_MARKS[record['id']].split(), 1))
    else:
        with pymupdf.open(DEST / (record['id'] + '.pdf')) as doc:
            _, marks = digital_labels_and_marks(doc)
    by_number = {q['number']: dict(**q, printedMarks=marks.get(q['number']), needsReview=True, parts=[])
                 for q in questions}
    other = []
    for page_no, segments in enumerate(pages, 1):
        for segment in segments:
            n = segment['question']
            (other if n is None else by_number[n]['parts']).append(dict(page=page_no, text=segment['text']))
    assert all(q['parts'] and q['parts'][0]['page'] == q['startPage'] for q in by_number.values())
    assert sum(int(q['printedMarks'].split('=')[-1]) for q in by_number.values()) == 80
    return dict(**record, questions=list(by_number.values()), otherText=other)


if __name__ == '__main__':
    TESSDATA = sys.argv[2]
    sources = Path(sys.argv[1])
    jobs = [(sources / name, pid, code, series, set_no, kind)
            for name, pid, code, series, set_no, kind in JOBS]
    for source, *_ in jobs:
        assert source.exists(), source
    with ProcessPoolExecutor(max_workers=2) as pool:
        new_papers = list(pool.map(extract, jobs))
    corpus = json.loads((DEST / 'questions.json').read_text())
    existing = {p['id'] for p in corpus['papers']}
    assert not existing & {p['id'] for p in new_papers}
    corpus['papers'] = sorted(corpus['papers'] + new_papers, key=lambda p: p['id'])
    (DEST / 'questions.json').write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n')
    print(f"merged {len(new_papers)} papers; total {len(corpus['papers'])}")
