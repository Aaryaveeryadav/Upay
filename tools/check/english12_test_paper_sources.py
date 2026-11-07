#!/usr/bin/env python3
"""Check 91 supplied Class 12 English Core/Elective source-only PDFs.

Checks course, series, set, marks, page counts, identity, SHA-256, source text
and original uploads. Eighteen Core PDFs are image-only. Tesseract checks useful
cover details if available; all eighteen cover code/series fields were also visually
inspected because OCR can confuse 1/4 and 5/S or skip headings. Does not infer the exam year,
transcribe questions, certify every page, or supply an official answer key.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path
import pymupdf

ROOT=Path(__file__).resolve().parents[2]
SERIES={1:'A3BAB/1',2:'A1BAB/2',3:'A4BAB/3',4:'A2BAB/4',5:'A5BAB/5',7:'S7PQR'}
EXPECTED={}
for group in (1,2,3,4,5,7):
    for setno in (1,2,3):
        name=f'1-{group}-{setno} English Core.pdf' if group!=7 else f'1-7-{setno}.pdf'
        EXPECTED[name]=('core',f'1/{group}/{setno}',SERIES[group],setno,19 if group==7 else 7 if group in (2,4) else 8,80 if group==7 else 40,13 if group==7 else 6,180 if group==7 else 120,group in (1,3,5))
EXPECTED['28_ENGLISH_Elective.pdf']=('elective','28','FH1EG',4,15,80,13,180,False)
for group,series in ((3,'Q3SPR'),(4,'S4PRQ'),(5,'S5RPQ')):
    for setno in (1,2,3):
        EXPECTED[f'1-{group}-{setno}_Eng_lish Core.pdf']=('core',f'1/{group}/{setno}',series,setno,19,80,13,180,False)
for group,series in ((1,'QR1SP'),(2,'S2RPQ')):
    for setno in (1,2,3):
        EXPECTED[f'230{group}-{setno}_1-{group}-{setno}_English (Core).pdf']=('core',f'1/{group}/{setno}',series,setno,24,80,13,180,False)
for setno in (1,2,3):
    EXPECTED[f'1-S-{setno}_English Core.pdf']=('core',f'1/S/{setno}','WXYZ/S',setno,19,80,13,180,False)
for group,series in ((1,'ZYW1X'),(2,'ZYW2X'),(4,'4YWZX'),(5,'ZYWX5'),(6,'W6YXZ'),(7,'ZX7YW')):
    for setno in (1,2,3):
        EXPECTED[f'1-{group}-{setno}_English Core.pdf']=('core',f'1/{group}/{setno}',series,setno,16 if group in (1,2) else 19,80,13,180,group in (1,2))
for group,series in ((1,'QS1PR/1'),(2,'SRQP2/2'),(3,'S3QRP/3'),(4,'S4PQR/4'),(5,'QP5RS/5')):
    for setno in (1,2,3):
        EXPECTED[f'1_{group}_{setno}_English Core.pdf']=('core',f'1/{group}/{setno}',series,setno,16 if group in (4,5) else 19,80,13,180,group==4)
for setno in (1,2,3):
    EXPECTED[f'1_C_{setno} ENGLISH CORE.pdf']=('core',f'1/C/{setno}','FH1EG/C',setno,19,80,13,180,False)
for setno in (1,2,3):
    EXPECTED[f'1-S-{setno} English Core.pdf']=('core',f'1/S/{setno}','&RQPS/S',setno,19,80,13,180,False)
for group in range(1,6):
    for setno in (1,2,3):
        name=f'1-{group}-{setno} '+('(English Core)' if group in (2,5) else 'ENGLISH (Core)')+'.pdf'
        EXPECTED[name]=('core',f'1/{group}/{setno}',f'FH1EG/{group}',setno,16 if group in (2,5) else 19,80,13,180,False)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def ocr_cover(page,executable):
    pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=False)
    run=subprocess.run([executable,'stdin','stdout','--psm','6'],input=pix.tobytes('png'),capture_output=True,check=True)
    return ' '.join(run.stdout.decode('utf-8',errors='replace').split())

def ocr_region(page,executable,coords):
    w,h=page.rect.width,page.rect.height
    x0,y0,x1,y1=coords
    pix=page.get_pixmap(matrix=pymupdf.Matrix(4,4),clip=pymupdf.Rect(w*x0,h*y0,w*x1,h*y1),alpha=False)
    run=subprocess.run([executable,'stdin','stdout','--psm','6'],input=pix.tobytes('png'),capture_output=True,check=True)
    return ' '.join(run.stdout.decode('utf-8',errors='replace').split())

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads',type=Path,help='directory of preserved uploads')
    args=parser.parse_args()
    text=(ROOT/'assets/js/data/class12-original-test-papers.js').read_text()
    rows=[r for r in json.loads(text.split('UP.class12OriginalTestPapers = ',1)[1].strip()[:-1]) if r['subject']=='english']
    assert len(rows)==len(EXPECTED)==91 and {r['originalFile'] for r in rows}==set(EXPECTED)
    assert len({r['id'] for r in rows})==len({r['file'] for r in rows})==len({r['sha256'] for r in rows})==91
    assert Counter(r['course'] for r in rows)=={'core':90,'elective':1}
    assert Counter(r['marks'] for r in rows)=={40:15,80:76}
    assert sum(bool(r.get('imageOnly')) for r in rows)==18
    assert {r['originalFile'] for r in rows if r.get('printedPages')==7}=={f'1-5-{i} English Core.pdf' for i in (1,2,3)}
    assert {r['originalFile'] for r in rows if r.get('printedPages')==23}=={f'230{g}-{i}_1-{g}-{i}_English (Core).pdf' for g in (1,2) for i in (1,2,3)}
    assert {r['originalFile'] for r in rows if r.get('printedPages')==15}==({f'1-{g}-{i}_English Core.pdf' for g in (1,2) for i in (1,2,3)} | {f'1_{g}_{i}_English Core.pdf' for g in (4,5) for i in (1,2,3)} | {f'1-{g}-{i} (English Core).pdf' for g in (2,5) for i in (1,2,3)})
    assert sum(bool(r.get('footerCode')) for r in rows)==24
    ocr=shutil.which('tesseract')
    for r in rows:
        name=r['originalFile'];course,code,series,setno,pages,marks,questions,minutes,scan=EXPECTED[name]
        assert (r['course'],r['paperCode'],r['series'],r['set'],r['pages'],r['marks'],r['questions'],r['duration'],bool(r.get('imageOnly'))) == (course,code,series,setno,pages,marks,questions,f'{minutes} minutes',scan),name
        assert r['cls']==12 and r['board']=='cbse' and r['year'] is None and r['visuallyImpaired'] is False
        if series in ('S4PQR/4','QP5RS/5'):
            assert r.get('footerCode')==f'{201 if series=="S4PQR/4" else 202} {"ABC"[setno-1]}',name
        if series in ('FH1EG/2','FH1EG/5'):
            assert r.get('footerCode')==f'{268 if series=="FH1EG/2" else 271} {"ABC"[setno-1]}',name
        assert r['file'].startswith(f'/assets/papers/english/{course}/') and r['file'].endswith('.pdf')
        path=ROOT/r['file'].lstrip('/')
        assert path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(ROOT.resolve())
        assert path.read_bytes()[:5]==b'%PDF-' and path.stat().st_size==r['bytes'] and digest(path)==r['sha256'],name
        with pymupdf.open(path) as doc:
            assert len(doc)==pages
            first=' '.join(doc[0].get_text().split())
            if scan:
                assert not any(p.get_text().strip() for p in doc),name
                first=ocr_cover(doc[0],ocr) if ocr else ''
                if ocr and series in ('ZYW1X','ZYW2X'):
                    # Targeted crops avoid full-page OCR skipping the boxed header.
                    header=ocr_region(doc[0],ocr,(.10,.10,.32,.15))
                    set_text=ocr_region(doc[0],ocr,(.62,.10,.77,.15))
                    code_text=ocr_region(doc[0],ocr,(.75,.153,.90,.192))
                    footer=ocr_region(doc[0],ocr,(.11,.835,.30,.875))
                    assert series in header and code in code_text,(name,header,code_text)
                    assert re.search(rf'\bSET\s*[-~:]?\s*{setno}\b',set_text,re.I),(name,set_text)
                    assert r.get('footerCode')==f'{734 if series=="ZYW1X" else 735}-{setno}' and r['footerCode'] in footer,(name,footer)
                    first+=' '+set_text
                if ocr and series=='S4PQR/4':
                    # Full-page OCR skips SET-2; these fields were visually checked.
                    header=ocr_region(doc[0],ocr,(.10,.115,.38,.165))
                    set_text=ocr_region(doc[0],ocr,(.72,.115,.88,.165))
                    code_text=ocr_region(doc[0],ocr,(.70,.155,.89,.205))
                    assert series in header and code in code_text,(name,header,code_text)
                    assert re.search(rf'\bSET\s*[-~:]?\s*{setno}\b',set_text,re.I),(name,set_text)
                    first+=' '+set_text
                    # The extra 16th page is footer/QR-only; question 13 is on page 15.
                    assert re.search(r'\b13\.\s',ocr_cover(doc[-2],ocr)),(name,'question 13')
            if first:
                assert re.search(r'ENGLISH\s*\(\s*'+course+r'\s*\)',first,re.I),(name,'course')
                assert re.search(rf'maximum\s+marks\s*:\s*{marks}\b',first,re.I),(name,'marks')
                assert re.search(rf'time\s+allowed\s*:\s*{minutes//60}\s+hours?\b',first,re.I),(name,'duration')
                assert re.search(rf'\b{questions}\s+questions\b',first,re.I),(name,'question count')
                if scan:
                    # OCR code/series characters are not used as authority; every
                    # scanned cover was visually compared with the EXPECTED table.
                    assert re.search(rf'\bSET(?:\s*No\.)?\s*[-~:]?\s*{setno}\b',first,re.I),(name,'set OCR')
                else:
                    assert code in first and series in first,(name,'code/series')
                    assert re.search(rf'\bSET\s*[-~:–—]?\s*{setno}\b',first,re.I),(name,'set')
                if r.get('printedPages'):
                    assert re.search(rf"\b{r['printedPages']}\s+printed\s+pages\b",first,re.I),(name,'printed pages')
            if r.get('footerCode') and not scan:
                assert r['footerCode'] in first and r['footerCode'] in doc[-1].get_text(),(name,'footer code')
                assert re.search(r'(?m)^\s*13\.',doc[-2].get_text()),(name,'question 13')
            if series in ('S7PQR','Q3SPR','S4PRQ','S5RPQ','WXYZ/S','4YWZX','ZYWX5','W6YXZ','ZX7YW','QS1PR/1','SRQP2/2','S3QRP/3','FH1EG/C','&RQPS/S','FH1EG/1','FH1EG/3','FH1EG/4'):
                assert re.search(r'(?m)^\s*13\.',doc[-1].get_text()),(name,'final question')
        if args.uploads:
            assert (args.uploads/name).is_file() and digest(args.uploads/name)==r['sha256'],name
        print('PASS',name,course,series,code,pages,'PDF pages; SHA-256 matches',flush=True)
    for group,count in ((1,5),(2,5),(3,4),(4,5),(5,5),(7,2),('S',2)):
        for setno in (1,2,3):
            same=[r for r in rows if r['paperCode']==f'1/{group}/{setno}']
            assert len(same)==count and len({r['series'] for r in same})==count and len({r['sha256'] for r in same})==count
    print('PASS 90 Core + 1 Elective; repeated codes separated by series; 18 image-only scans')
    print('PASS three 8-page PDFs say 7 printed pages; six 24-page PDFs say 23; eighteen 16-page PDFs say 15')
    if not ocr:print('WARNING: scanned-cover OCR skipped; inspect those covers separately.')
    print('Scanned cover series/codes were visually checked; exam years, answers and full contents are not certified.')

if __name__=='__main__':main()
