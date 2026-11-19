"""Build the supplied Class XII Hindi Core paper archive.
OMP_THREAD_LIMIT=1 python tools/extract/hindi12_papers.py INPUT TESSDATA
Requires pymupdf, pillow and tesserocr; use tessdata_fast hin and eng models.
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
# The six image-only PDFs: manually read Q1–Q12 labels from their printed
# left margins. (PDF page, vertical centre of printed label in PDF points).
SCAN_LABELS = {
    '2-1-1': [(2,411),(5,73),(7,163),(7,375),(8,73),(8,303),(10,434),(11,73),(11,275),(14,73),(14,359),(15,73)],
    '2-1-2': [(2,439),(5,73),(7,412),(8,73),(8,227),(8,454),(9,73),(11,73),(11,298),(11,532),(12,258),(15,73)],
    '2-1-3': [(2,411),(5,73),(7,163),(7,386),(8,73),(8,369),(9,73),(9,318),(11,412),(12,73),(14,386),(15,73)],
    '2-2-1': [(2,413),(5,73),(7,154),(7,295),(7,487),(8,150),(10,258),(10,521),(11,329),(13,458),(14,175),(14,478)],
    '2-2-2': [(2,418),(5,73),(7,165),(7,459),(8,73),(8,423),(9,73),(11,73),(11,387),(12,73),(12,315),(14,516)],
    '2-2-3': [(2,418),(5,73),(7,160),(7,407),(8,73),(8,323),(8,522),(9,231),(11,456),(12,159),(14,358),(15,73)],
}


def ocr(api, page, top, bottom):
    clip = pymupdf.Rect(0, top, page.rect.width, bottom)
    pix = page.get_pixmap(dpi=205, clip=clip, colorspace=pymupdf.csGRAY)
    api.SetImage(Image.frombytes('L', (pix.width, pix.height), pix.samples))
    text = api.GetUTF8Text().strip()
    return '\n'.join(re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines())


def extract(job):
    source, tessdata = job
    slug = '-'.join(re.match(r'^(2)[_-]([1-7])[_-]([1-3])', source.name).groups())
    scanned = slug in SCAN_LABELS
    pages, labels = [], []
    with pymupdf.open(source) as doc, tesserocr.PyTessBaseAPI(path=tessdata, lang='hin+eng') as api:
        if scanned:
            labels = [(i, p, y-9) for i,(p,y) in enumerate(SCAN_LABELS[slug],1)]
            series = 'QR1SP' if slug.startswith('2-1-') else 'S2RPQ'
        else:
            cover = doc[0].get_text()
            assert 'HINDI (Core)' in cover and '80' in cover and '3 घ' in cover
            series = re.search(r'Series\s*:?\s*(\w+)',cover)[1]
            for i,page in enumerate(doc,1):
                for x,y,_,_,word,*_ in page.get_text('words'):
                    if x < page.rect.width*.18 and re.fullmatch(r'(?:[1-9]|1[0-2])\.',word):
                        labels.append((int(word[:-1]),i,max(0,y-4)))
        assert [n for n,_,_ in labels]==list(range(1,13))
        active = None
        for i,page in enumerate(doc,1):
            # Keep covers and final scan leaves separately from Q12. PDF pages
            # remain authoritative: repeated footers are not question text.
            if i == 1 or (scanned and i==16):
                pages.append([dict(question=None,text=ocr(api,page,0,page.rect.height))]); continue
            top,bottom = (62,636) if scanned else (36,654)
            starts = [(y,n) for n,p,y in labels if p==i]
            segments=[]
            for y,n in starts+[(bottom,None)]:
                if y-top>4:
                    text=ocr(api,page,top,y)
                    if text: segments.append(dict(question=active,text=text))
                active,top=(n if n is not None else active),y
            pages.append(segments)
    questions=[dict(number=n,startPage=p) for n,p,_ in labels]
    record=dict(id=slug,code=slug.replace('-','/'),cls=12,board='cbse',subject='hindi-core',series=series,set=int(slug[-1]),source=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),pdf=f'/assets/papers/hindi-core/{slug}.pdf',pageCount=len(pages),maxMarks=80,durationMinutes=180,status='unverified-ocr',method='scan-ocr' if scanned else 'rendered-ocr-with-embedded-number-labels')
    shutil.copyfile(source, DEST / f'{slug}.pdf')
    return assemble(record, questions, pages)


# Transcribed from the printed right-margin totals on the six scanned sets.
# Bind human annotations (including the page locations) to these exact files.
SCAN_MARKS = {
    '2-1-1':'10 8 6 4×2=8 2×4=8 5×1=5 2×3=6 2×2=4 5×1=5 2×3=6 2×2=4 2×5=10',
    '2-1-2':'8 10 4×2=8 6 2×4=8 2×2=4 5×1=5 2×3=6 2×3=6 2×2=4 5×1=5 2×5=10',
    '2-1-3':'10 8 2×4=8 4×2=8 6 2×2=4 2×3=6 5×1=5 2×3=6 5×1=5 2×2=4 2×5=10',
    '2-2-1':'10 8 6 4×2=8 2×4=8 5×1=5 2×3=6 2×2=4 5×1=5 2×3=6 2×2=4 2×5=10',
    '2-2-2':'8 10 4×2=8 6 2×4=8 2×2=4 5×1=5 2×3=6 2×3=6 2×2=4 5×1=5 2×5=10',
    '2-2-3':'10 8 2×4=8 4×2=8 6 2×2=4 2×3=6 5×1=5 2×3=6 5×1=5 2×2=4 2×5=10',
}
SCAN_HASHES = {
    '2-1-1':'4c037a09a84caf079108bdfef6a57a858ae25677bb8f8d58b6879bb101dadcaa',
    '2-1-2':'fc86002a6fd36878ed26ae4d3e914251fdcc282c93bc995b3c97efe20b1fed58',
    '2-1-3':'492c1a272a350038e82b8f916194cfd208dad70682611db6a3ed59e2b883c83f',
    '2-2-1':'088e1b7bebff94c5740d4933a3d1b1fce890f0cb314a3657a16fcf761ab91822',
    '2-2-2':'8132a59e0ad583d1551bba52cd43bb93ed9c23947f1f75874d2085d066bf1fdd',
    '2-2-3':'4084c5f4acbbc2557613b4716c9007635d7cac6cf01024d01fb6c761fae3c872',
}


def printed_marks(record):
    if record['id'] in SCAN_MARKS:
        assert record['sha256']==SCAN_HASHES[record['id']]
        return dict(enumerate(SCAN_MARKS[record['id']].split(),1))
    marks = {}
    with pymupdf.open(DEST / (record['id']+'.pdf')) as doc:
        for page in doc:
            words = page.get_text('words')
            for x,y,_,_,label,*_ in words:
                if x>=page.rect.width*.18 or not re.fullmatch(r'(?:[1-9]|1[0-2])\.',label): continue
                right = [w[4].replace('\uf0b4','×') for w in words if w[0]>.85*page.rect.width and -5<=w[1]-y<=32]
                candidates=[w for w in right if re.fullmatch(r'\d+(?:×\d+=\d+)?',w)]
                marks[int(label[:-1])] = candidates[0] if len(candidates)==1 else None
    return marks


def assemble(record, questions, pages):
    """Store each text fragment once, retaining PDF-page boundaries inside a question."""
    marks = printed_marks(record)
    by_number = {q['number']:dict(**q,printedMarks=marks.get(q['number']),needsReview=True,parts=[]) for q in questions}
    other = []
    for page_no,segments in enumerate(pages,1):
        for segment in segments:
            n = segment['question']
            (other if n is None else by_number[n]['parts']).append(dict(page=page_no,text=segment['text']))
    assert all(q['parts'] and q['parts'][0]['page']==q['startPage'] for q in by_number.values())
    return dict(**record, questions=list(by_number.values()), otherText=other)


def write_archive(papers):
    corpus = dict(schemaVersion=1, transcription='Unverified Hindi OCR. Consult the original PDF. No answer keys supplied.', papers=sorted(papers,key=lambda p:p['id']))
    (DEST/'questions.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    sources = sorted(p for p in Path(sys.argv[1]).glob('*.pdf') if re.fullmatch(r'2(?:-[3457]-[123]|_[12]_[123]_Hindi Core)\.pdf', p.name))
    if len(sources)!=18: raise ValueError('Expected the 18 supplied Hindi Core sets')
    DEST.mkdir(parents=True,exist_ok=True)
    with ProcessPoolExecutor(max_workers=2) as pool:
        write_archive(pool.map(extract,[(p,sys.argv[2]) for p in sources]))
