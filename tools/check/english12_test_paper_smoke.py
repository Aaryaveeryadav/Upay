#!/usr/bin/env python3
"""Browser/byte smoke for 19 supplied English Core/Elective PDF papers.

Uses guest contexts, never invokes a paid provider, and checks grouping,
downloads, labels, responsive/Hindi UI, subject/board scoping and SW bypass.
Passing does not certify exam years, questions, answers or every source page.
"""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')

def manifest():
    s=(ROOT/'assets/js/data/class12-original-test-papers.js').read_text()
    return [r for r in json.loads(s.split('UP.class12OriginalTestPapers = ',1)[1].strip()[:-1]) if r['subject']=='english']

def main():
    rows=manifest();assert len(rows)==19
    errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
        ctx=browser.new_context(viewport={'width':320,'height':850},service_workers='block',accept_downloads=True)
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'/#/english12',wait_until='networkidle',timeout=60000)
        page.wait_for_function('UP.S.cls===12 && UP.S.subject==="english" && document.querySelectorAll(".english12-chapter-card").length===40')
        page.locator('a[href="#/pyq"]').filter(has_text='Browse original test papers').click()
        page.wait_for_function('document.querySelectorAll(".source-test-paper").length === 19')
        assert page.locator('.source-course-group > h3').all_inner_texts()==['English Core · 18 PDFs','English Elective · 1 PDF']
        assert page.locator('.source-test-paper[data-course="core"]').count()==18
        assert page.locator('.source-test-paper[data-course="elective"]').count()==1
        assert page.locator('.source-course-group[data-course="core"] .source-paper-group h4').all_inner_texts()==['Series A3BAB/1','Series A1BAB/2','Series A4BAB/3','Series A2BAB/4','Series A5BAB/5','Series S7PQR']
        assert page.locator('.source-course-group[data-course="elective"] .source-paper-group h4').inner_text()=='Series FH1EG'
        assert page.locator('.source-test-paper').filter(has_text='Scanned PDF').count()==9
        assert page.locator('.source-test-paper').filter(has_text='cover says 7 printed pages').count()==3
        assert page.locator('.source-test-paper').filter(has_text='40 marks').count()==15
        assert page.locator('.source-test-paper').filter(has_text='80 marks').count()==4
        elec=page.locator('.source-test-paper[data-course="elective"]')
        assert '28' in elec.inner_text() and 'Set 4' in elec.inner_text()
        assert 'English Elective' in elec.get_attribute('aria-label') and 'series FH1EG' in elec.get_attribute('aria-label')
        a5=page.locator('.source-test-paper[data-paper-id="english-core-a5bab-5-1"]')
        assert '8 PDF pages' in a5.inner_text() and 'cover says 7 printed pages' in a5.get_attribute('aria-label')
        text=page.locator('#view').inner_text()
        assert 'Years have not been verified' in text and 'no official answer key was supplied' in text
        assert page.locator('.pyq-count').inner_text()=='0 questions' and page.locator('.q-card.pyq').count()==0
        for width in (320,360,390,768,1024,1440):
            page.set_viewport_size({'width':width,'height':850})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),width
        print('PASS separated Core/Elective groups, seven series, marks, sets, scans, differing page counts and no invented answers',flush=True)
        page.evaluate("location.hash='#/pyq?y=2024&ch=1501'")
        page.wait_for_function('document.querySelectorAll(".source-test-paper").length === 19')
        for name in ('1-1-1 English Core.pdf','1-2-1 English Core.pdf','1-5-3 English Core.pdf','1-7-2.pdf','28_ENGLISH_Elective.pdf'):
            row=next(r for r in rows if r['originalFile']==name)
            with page.expect_download(timeout=30000) as d:
                page.locator(f'.source-test-paper[data-paper-id="{row["id"]}"]').click()
            assert hashlib.sha256(Path(d.value.path()).read_bytes()).hexdigest()==row['sha256'],name
        assert page.locator('.source-test-paper').count()==19,'year/chapter filters must not hide unverified source PDFs'
        for row in rows:
            r=ctx.request.get(BASE+row['file'],timeout=60000)
            assert r.status==200 and 'application/pdf' in r.headers.get('content-type',''),(row['id'],r.status)
            body=r.body();assert len(body)==row['bytes'] and hashlib.sha256(body).hexdigest()==row['sha256'],row['id']
            r.dispose()
        print('PASS five browser downloads and all 19 served PDFs match original SHA-256; bank filters do not hide them',flush=True)
        page.set_viewport_size({'width':320,'height':850})
        page.locator('#topbar [data-action="lang"]').click();page.wait_for_function('UP.S.lang === "hi"')
        assert page.locator('.source-course-group > h3').all_inner_texts()==['अंग्रेज़ी कोर · 18 PDF','अंग्रेज़ी इलेक्टिव · 1 PDF']
        assert page.locator('.source-test-paper').filter(has_text='स्कैन PDF').count()==9
        assert page.locator('.source-test-paper').filter(has_text='मुखपृष्ठ पर 7 मुद्रित पृष्ठ').count()==3
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.locator('#topbar [data-action="lang"]').click();page.wait_for_function('UP.S.lang === "en"')
        page.locator('#topbar select[data-key="board"]').select_option('mp')
        page.wait_for_function('UP.S.board === "mp" && document.querySelectorAll(".source-test-paper").length === 0')
        assert 'Select the CBSE board' in page.locator('#view').inner_text()
        page.locator('#topbar select[data-key="board"]').select_option('cbse')
        page.wait_for_function('UP.S.board === "cbse" && document.querySelectorAll(".source-test-paper").length === 19')
        page.locator('#topbar select[data-key="subject"]').select_option('economics')
        page.wait_for_function('UP.S.subject === "economics" && document.querySelectorAll(".source-test-paper").length === 90')
        assert page.locator('.source-test-paper[data-course]').count()==0
        print('PASS Hindi labels, 320–1440px layouts and board/subject isolation',flush=True)
        assert not errors,errors;ctx.close()
        ctx=browser.new_context(service_workers='allow');page=ctx.new_page()
        page.goto(BASE+'/#/english12',wait_until='networkidle',timeout=60000)
        page.evaluate('navigator.serviceWorker.ready');page.reload(wait_until='networkidle',timeout=60000)
        page.wait_for_function('!!navigator.serviceWorker.controller')
        for row in (rows[0],rows[-1]):
            result=page.evaluate('''async path=>{const r=await fetch(path);const b=await r.arrayBuffer();return {ok:r.ok,bytes:b.byteLength,cached:!!(await caches.match(path))};}''',row['file'])
            assert result=={'ok':True,'bytes':row['bytes'],'cached':False},result
        print('PASS Core and Elective source PDFs bypass the service-worker asset cache',flush=True)
        ctx.close();browser.close()
    print('Class 12 English source-paper smoke: PASS (not an exam-year or answer-key audit)')

if __name__=='__main__':main()
