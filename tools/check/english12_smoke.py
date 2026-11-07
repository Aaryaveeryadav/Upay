#!/usr/bin/env python3
"""Guest-browser/source smoke for the 40 supplied Class 12 English PDFs.

Set UPAY_BASE to a test preview. Covers one-time direct entry, grouping, all
chapter/source links and SHA-256s, bilingual reading notes, class isolation,
empty paper views, PDF cache bypass and a mocked unavailable AI. This is not
an exhaustive literary-content, board-syllabus or live-provider AI audit.
"""
from pathlib import Path
import hashlib
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')
WIDTHS = (320, 360, 390, 768, 1024, 1440)


def read_js(path, marker):
    return json.loads((ROOT/path).read_text(encoding='utf-8').split(marker,1)[1].strip()[:-1])


def nav(page, route, selector):
    page.evaluate('(h) => { location.hash = h; }', route)
    page.wait_for_selector(selector, timeout=30000)


def chapter(page, ch):
    page.evaluate('(id) => { location.hash = "#/chapter/" + id; }', ch['id'])
    page.wait_for_function('(title) => document.querySelector("#view h1")?.textContent === title', arg=ch['en'], timeout=30000)
    page.wait_for_selector('.english12-chapter-source')


def no_overflow(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (label, page.evaluate('[document.documentElement.scrollWidth, innerWidth]'))


def main():
    rows = read_js('assets/js/data/english12-sources.js','UP.english12Sources = ')
    chapters = read_js('assets/js/data/english12.js','UP.course12english = ')
    by_id = {s['chapterId']: s for s in rows}
    errors, bad_requests, ai_requests = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(viewport={'width':390,'height':850},service_workers='block',accept_downloads=True, reduced_motion='reduce')
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: bad_requests.append((r.status,r.url)) if r.status>=400 and r.url.startswith(BASE) and '/api/ai/solve' not in r.url else None)
        def deny_ai(route):
            ai_requests.append(route.request.post_data_json)
            route.fulfill(status=401,content_type='application/json',body='{"error":"Sign in to use AI."}')
        page.route('**/api/ai/solve', deny_ai)
        page.goto(BASE+'/#/english12',wait_until='networkidle',timeout=60000)
        page.wait_for_function('window.UP && UP.S && UP.S.cls === 12 && UP.S.subject === "english" && document.body.classList.contains("up-ready")')
        page.wait_for_function('document.querySelectorAll(".english12-chapter-card").length === 40')
        assert page.url.endswith('#/syllabus')
        for where in ('#topbar','#rail'):
            assert page.locator(where+' select[data-key="subject"]').input_value() == 'english'
            assert page.locator(where+' select[data-key="cls"]').input_value() == '12'
        assert page.locator('.english12-group').count()==7
        for book,section,count in [('flamingo','prose',8),('flamingo','poetry',5),('vistas','readings',6),('kaleidoscope','short-stories',5),('kaleidoscope','poetry',8),('kaleidoscope','non-fiction',6),('kaleidoscope','drama',2)]:
            assert page.locator(f'.english12-group[data-book="{book}"][data-section="{section}"] .english12-chapter-card').count()==count
        coverage=page.locator('.english12-coverage').inner_text()
        for term in ('Vistas','not a complete course','English only','Elective fiction novels were not supplied','Five additional','CBSE 2026–27'):
            assert term in coverage,term
        assert page.locator('.english12-chapter-card .english12-extra-label').count()==5
        print('PASS direct entry, synchronized scope, seven book/section groups, coverage and CBSE caveats',flush=True)

        # Search indexes only the catalogue metadata, not the full PDF text.
        page.locator('#view [data-action="search"]').fill('Milton')
        page.wait_for_function('document.querySelectorAll(".english12-chapter-card").length === 1')
        assert 'Poems by Milton' in page.locator('.english12-chapter-card').inner_text()
        page.locator('#view [data-action="search"]').fill('')
        page.wait_for_function('document.querySelectorAll(".english12-chapter-card").length === 40')
        print('PASS search by author/title within the supplied catalogue',flush=True)

        for width in WIDTHS:
            page.set_viewport_size({'width':width,'height':850})
            for key in ('board','cls','subject'):
                assert page.locator(f'#topbar select[data-key="{key}"]').is_visible(),(width,key)
            no_overflow(page,('syllabus',width))
            nav(page,'#/books','.english12-source-row')
            no_overflow(page,('books',width))
            chapter(page,next(c for c in chapters if c['id']==1612))
            no_overflow(page,('chapter',width))
            nav(page,'#/syllabus','.english12-chapter-card')
        print('PASS syllabus, books and chapter layouts at 320–1440px',flush=True)

        nav(page,'#/books','.english12-source-row')
        assert page.locator('.english12-source-row').count()==40
        assert page.locator('.english12-source-link').count()==40
        assert page.locator('.english12-source-row[data-book="flamingo"]').count()==13
        assert page.locator('.english12-source-row[data-book="vistas"]').count()==6
        assert page.locator('.english12-source-row[data-book="kaleidoscope"]').count()==21
        for ch in chapters:
            row=page.locator(f'.english12-source-row[data-chapter-id="{ch["id"]}"]')
            source=by_id[ch['id']]
            assert row.locator('.english12-source-link').get_attribute('href')==source['file'],ch['en']
            assert row.locator('h3 a').get_attribute('href')==f'#/chapter/{ch["id"]}'
            assert ch['author'] in row.inner_text()
        milton=page.locator('.english12-source-row[data-chapter-id="1612"]').inner_text()
        assert 'On Time' in milton and 'On Shakespear' in milton
        blake=page.locator('.english12-source-row[data-chapter-id="1613"]').inner_text()
        assert 'The Divine Image' in blake and 'The Human Abstract' in blake
        memories=page.locator('.english12-source-row[data-chapter-id="1706"]').inner_text()
        assert 'The Cutting of My Long Hair' in memories and 'We Too are Human Beings' in memories
        assert 'at Coole' in page.locator('.english12-source-row[data-chapter-id="1616"]').inner_text()
        assert 'of Coole' in page.locator('.english12-source-row[data-chapter-id="1616"]').inner_text()
        for id in (1501,1511,1601,1612,1613,1631,1706):
            source=by_id[id]
            with page.expect_download(timeout=30000) as got:
                page.locator(f'.english12-source-row[data-chapter-id="{id}"] .english12-source-link').click()
            assert got.value.suggested_filename==source['originalFile']
            assert hashlib.sha256(Path(got.value.path()).read_bytes()).hexdigest()==source['sha256']
        print('PASS all 40 library links and seven real PDF downloads, including multi-work selections',flush=True)

        for row in rows:
            response=ctx.request.get(BASE+row['file'],timeout=60000)
            assert response.status==200 and 'application/pdf' in response.headers.get('content-type',''),(row['id'],response.status)
            body=response.body()
            assert len(body)==row['bytes'] and hashlib.sha256(body).hexdigest()==row['sha256'],row['id']
        print('PASS all 40 served PDF lengths, content types and original SHA-256 hashes',flush=True)

        for ch in chapters:
            chapter(page,ch)
            assert ch['author'] in page.locator('.detail-hero').inner_text(),ch['en']
            assert page.locator('.english12-chapter-source .english12-source-link').get_attribute('href')==by_id[ch['id']]['file']
            assert page.locator('.english12-study-card ul li').count()==2
            assert page.locator('.english12-study-card ol li').count()==2
            assert 'not past-paper' in page.locator('.english12-study-card').last.inner_text()
            assert page.locator('.tabs [data-tab="pyq"]').count()==0
            assert page.locator('.formula-card').count()==0
            if ch['id'] in (1604,1605,1618,1626,1632):
                assert 'Not listed in CBSE' in page.locator('.detail-hero').inner_text()
        print('PASS every chapter opens its own PDF, two reading-focus points and two explicitly non-board review prompts',flush=True)

        chapter(page,next(c for c in chapters if c['id']==1612))
        page.reload(wait_until='networkidle',timeout=60000)
        page.wait_for_selector('.english12-chapter-source')
        assert page.evaluate('UP.S.cls === 12 && UP.S.subject === "english"')
        page.locator('a[href="#/cheatsheet/1612"]').click()
        page.wait_for_selector('.cheatsheet')
        text=page.locator('.cheatsheet').inner_text()
        assert 'On Time' in text and 'On Shakespear' in text and 'official answer key' in text and '[object Object]' not in text
        print('PASS reload/deep-link persistence and printable two-poem review',flush=True)

        page.set_viewport_size({'width':320,'height':850})
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        nav(page,'#/books','.english12-source-row')
        assert page.locator('.english12-source-link').count()==40
        assert 'मूल PDF केवल अंग्रेज़ी में' in page.locator('.english12-coverage').inner_text()
        no_overflow(page,('Hindi library',320))
        page.evaluate("location.hash='#/chapter/1612'")
        page.wait_for_function('document.querySelector("#view h1")?.textContent === "पोएम्स बाय मिल्टन"')
        assert 'दो कविताएँ' in page.locator('#view').inner_text()
        no_overflow(page,('Hindi chapter',320))
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "en"')
        print('PASS bilingual interface/review prompts with correctly labelled English-only PDFs',flush=True)

        nav(page,'#/pyq','.pyq-count')
        assert page.locator('.pyq-count').inner_text()=='0 questions'
        assert 'English Core and Elective papers' in page.locator('#view').inner_text()
        assert 'no official answer key was supplied' in page.locator('#view').inner_text()
        assert page.locator('.q-card.pyq').count()==0
        assert page.locator('.source-test-paper').count()==101
        nav(page,'#/test','.page-head')
        page.wait_for_function('document.querySelector("#view")?.textContent.includes("No questions for these filters")')
        nav(page,'#/search?q=Lencho','#qSearchInput')
        assert '0 results' in page.locator('#view').inner_text() and page.locator('.pyq-item').count()==0
        nav(page,'#/mock','.empty')
        assert 'No questions' in page.locator('#view').inner_text()
        nav(page,'#/','.hero')
        assert 'Lencho' not in page.locator('#view').inner_text()
        assert 'The Last Lesson' in page.locator('#view').inner_text()
        print('PASS 101 source-only papers and no Class 10 or invented searchable questions or mock paper in Class 12 English',flush=True)

        nav(page,'#/ask?q=Why%20does%20Franz%20value%20his%20language%3F','#answerMount')
        page.get_by_text('AI solution unavailable.').wait_for(timeout=20000)
        assert page.evaluate('UP.S.answer.kind')=='no-local-solver'
        assert 'There is no verified local solution' in page.locator('#answerMount').inner_text()
        assert page.locator('[data-action="askLocal"]').count()==0
        assert ai_requests and ai_requests[-1]['subject']=='english' and ai_requests[-1]['cls']==12
        assert 'does not automatically see these PDFs' in page.locator('#view').inner_text()
        print('PASS AI-unavailable fallback: no maths answer and no claim that AI can see the PDFs',flush=True)

        # Fresh #/english12 entry starts from maths without loading the Class 10
        # pack; changing only the class must load the retained English pack.
        page.locator('#topbar select[data-key="cls"]').select_option('10')
        page.wait_for_function('UP.S.cls === 10 && UP.S.subject === "english" && UP.catalogue(10,"english").length > 0',timeout=30000)
        nav(page,'#/syllabus','.ch-card')
        page.wait_for_function('document.querySelectorAll(".ch-card").length > 0')
        assert page.locator('.english12-chapter-card').count()==0
        assert 'The Last Lesson' not in page.locator('#view').inner_text()
        assert page.evaluate('UP.catalogue(10,"english").length') > 0
        page.locator('#topbar select[data-key="cls"]').select_option('12')
        page.wait_for_function('UP.S.cls === 12 && UP.S.subject === "english"')
        page.wait_for_function('document.querySelectorAll(".english12-chapter-card").length === 40')
        nav(page,'#/pyq','.pyq-count')
        assert page.locator('.pyq-count').inner_text()=='0 questions'
        print('PASS Class 10 English lazy-load and return to isolated Class 12 without question leakage',flush=True)
        assert not errors,errors
        assert not bad_requests,bad_requests
        ctx.close()

        ctx=browser.new_context(service_workers='block')
        page=ctx.new_page()
        page.goto(BASE+'/#/chapter/1706?cls=12&sub=english',wait_until='networkidle',timeout=60000)
        page.wait_for_selector('.english12-chapter-source')
        assert page.locator('#view h1').inner_text()=='Memories of Childhood'
        page.locator('a[href="#/books"]').first.click()
        page.wait_for_selector('.english12-source-row')
        page.reload(wait_until='networkidle',timeout=60000)
        page.wait_for_function('UP.S.cls === 12 && UP.S.subject === "english" && document.querySelectorAll(".english12-source-row").length === 40')
        print('PASS fresh explicit Vistas chapter deep link keeps Class 12 English after navigation and reload',flush=True)
        ctx.close()

        ctx=browser.new_context(service_workers='allow')
        page=ctx.new_page()
        page.goto(BASE+'/#/english12',wait_until='networkidle',timeout=60000)
        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle',timeout=60000)
        page.wait_for_function('!!navigator.serviceWorker.controller',timeout=20000)
        for id in (1501,1612,1613,1706):
            pdf=by_id[id]['file']
            result=page.evaluate('''async path => {
              const r=await fetch(path);const data=await r.arrayBuffer();
              return {ok:r.ok,bytes:data.byteLength,cached:!!(await caches.match(path)),sw:!!navigator.serviceWorker.controller};
            }''',pdf)
            assert result=={'ok':True,'bytes':by_id[id]['bytes'],'cached':False,'sw':True},result
        print('PASS English book PDFs across all three books bypass the service-worker asset cache',flush=True)
        ctx.close();browser.close()
    print('Class 12 English smoke: PASS (not a full textbook/answer-key or real-provider AI audit)',flush=True)


if __name__=='__main__': main()
