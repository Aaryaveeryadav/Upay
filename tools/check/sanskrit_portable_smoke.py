#!/usr/bin/env python3
"""Test portable Sanskrit paper names and unchanged bytes on the local server.

The two case-colliding old names are mapped by server.js and vercel.json; the
other case-distinct papers must continue to resolve to their own original bytes.
This checks links and hashes, not the accuracy of Sanskrit questions or labels.
"""
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')
PREFIX='/assets/sanskrit/papers/'
EXPECTED={
 'Sanskrit.pdf':'6ca5fc440d7e77a4e4945bcbf082a64c95fe2866be5f6c5c1dc07db0e55afbff',
 'Sanskrit-variant-A.pdf':'6ca5fc440d7e77a4e4945bcbf082a64c95fe2866be5f6c5c1dc07db0e55afbff',
 'sanskrit.pdf':'d1ea19adc751c222956087c90799bcd01ae47fd945e286f9c0c18bb1ad5592e3',
 '52_SANSKRIT.pdf':'b5f8826c2c1f8229cb0d382aed44024801c6fafbb400a571a4d464e1c4c5e736',
 '52-SANSKRIT-set-4.pdf':'b5f8826c2c1f8229cb0d382aed44024801c6fafbb400a571a4d464e1c4c5e736',
 '52_Sanskrit.pdf':'8a7955593569b20b5abc86ced047eed69e5f1e4184631837217d3bee6dd3918a',
}

def main():
    text=(ROOT/'assets/sanskrit/sanskrit-papers.js').read_text()
    files=re.findall(r"\bfile:'([^']+\.pdf)'",text)
    assert len(files)==9 and len({f.casefold() for f in files})==9,files
    assert all((ROOT/'assets/sanskrit/papers'/name).is_file() for name in files)
    assert 'Sanskrit-variant-A.pdf' in files and '52-SANSKRIT-set-4.pdf' in files
    routes=json.loads((ROOT/'vercel.json').read_text())['routes']
    for old,new in [('Sanskrit.pdf','Sanskrit-variant-A.pdf'),('52_SANSKRIT.pdf','52-SANSKRIT-set-4.pdf')]:
        assert any(r.get('src') == '^'+PREFIX+old.replace('.pdf',r'\.pdf')+'$' and r.get('dest')==PREFIX+new for r in routes)
    for name,wanted in EXPECTED.items():
        with urlopen(BASE+PREFIX+name,timeout=30) as response:
            assert response.status==200 and response.headers.get_content_type()=='application/pdf',name
            got=hashlib.sha256(response.read()).hexdigest()
        assert got==wanted,(name,got)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
        ctx=browser.new_context(service_workers='block');page=ctx.new_page();errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(BASE+'/#/syllabus',wait_until='networkidle',timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
        page.locator('#topbar select[data-key="subject"]').select_option('sanskrit')
        page.wait_for_function('UP.S.cls === 10 && UP.S.subject === "sanskrit" && window.UP.sanskritPapers && UP.sanskritPapers.length === 9')
        page.wait_for_function('''document.querySelectorAll('a[href^="assets/sanskrit/papers/"]').length === 9''')
        links=page.locator('a[href^="assets/sanskrit/papers/"]').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("href").split("/").pop())')
        assert set(links)==set(files),links
        assert not errors,errors
        ctx.close();browser.close()
    print('PASS nine portable, case-distinct Sanskrit source links')
    print('PASS both legacy URLs and their case-distinct neighbours return the original SHA-256 bytes')
    print('PASS Vercel config contains matching exact legacy rewrites (not a deployed Vercel test)')

if __name__=='__main__':main()
