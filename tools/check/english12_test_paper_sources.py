#!/usr/bin/env python3
"""Check 19 supplied Class 12 English Core/Elective source-only PDFs.

Checks course, series, set, marks, page counts, identity, SHA-256, source text
and original uploads. Nine Core PDFs are image-only. Tesseract checks useful
cover details if available; all nine cover code/series fields were also visually
inspected because OCR can confuse 1/4 and 5/S. Does not infer the exam year,
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

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def ocr_cover(page,executable):
    pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=False)
    run=subprocess.run([executable,'stdin','stdout','--psm','6'],input=pix.tobytes('png'),capture_output=True,check=True)
    return ' '.join(run.stdout.decode('utf-8',errors='replace').split())

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads',type=Path,help='directory of preserved uploads')
    args=parser.parse_args()
    text=(ROOT/'assets/js/data/class12-original-test-papers.js').read_text()
    rows=[r for r in json.loads(text.split('UP.class12OriginalTestPapers = ',1)[1].strip()[:-1]) if r['subject']=='english']
    assert len(rows)==len(EXPECTED)==19 and {r['originalFile'] for r in rows}==set(EXPECTED)
    assert len({r['id'] for r in rows})==len({r['file'] for r in rows})==len({r['sha256'] for r in rows})==19
    assert Counter(r['course'] for r in rows)=={'core':18,'elective':1}
    assert Counter(r['marks'] for r in rows)=={40:15,80:4}
    assert sum(bool(r.get('imageOnly')) for r in rows)==9
    assert {r['paperCode'] for r in rows if r.get('printedPages')}=={'1/5/1','1/5/2','1/5/3'}
    ocr=shutil.which('tesseract')
    for r in rows:
        name=r['originalFile'];course,code,series,setno,pages,marks,questions,minutes,scan=EXPECTED[name]
        assert (r['course'],r['paperCode'],r['series'],r['set'],r['pages'],r['marks'],r['questions'],r['duration'],bool(r.get('imageOnly'))) == (course,code,series,setno,pages,marks,questions,f'{minutes} minutes',scan),name
        assert r['cls']==12 and r['board']=='cbse' and r['year'] is None and r['visuallyImpaired'] is False
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
                    assert re.search(rf'\bSET\s*[-~:]?\s*{setno}\b',first,re.I),(name,'set')
                if r.get('printedPages'):
                    assert re.search(rf"\b{r['printedPages']}\s+printed\s+pages\b",first,re.I),(name,'printed pages')
            if series=='S7PQR':
                assert re.search(r'(?m)^13\.',doc[-1].get_text()),(name,'final question')
        if args.uploads:
            assert (args.uploads/name).is_file() and digest(args.uploads/name)==r['sha256'],name
        print('PASS',name,course,series,code,pages,'PDF pages; SHA-256 matches',flush=True)
    print('PASS 18 Core + 1 Elective; 9 image-only scans; three covers say 7 printed pages for 8-page PDFs')
    if not ocr:print('WARNING: scanned-cover OCR skipped; inspect those covers separately.')
    print('Scanned cover series/codes were visually checked; exam years, answers and full contents are not certified.')

if __name__=='__main__':main()
