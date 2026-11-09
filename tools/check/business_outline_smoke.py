#!/usr/bin/env python3
"""Guest UI smoke. Requires Playwright/Chromium and a running Upay server."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')
with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if os.environ.get('CHROMIUM_PATH'): kwargs['executable_path']=os.environ['CHROMIUM_PATH']
    browser=p.chromium.launch(**kwargs)
    for width in (1440,390):
        ctx=browser.new_context(viewport={'width':width,'height':900},service_workers='block')
        page=ctx.new_page(); errors=[]
        page.on('pageerror',lambda ex: errors.append(str(ex)))
        page.goto(BASE+'/',wait_until='networkidle',timeout=60000)
        page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")',timeout=60000)
        page.evaluate("location.hash='#/syllabus'")
        page.locator('#view select[data-key="cls"]').select_option('12')
        page.locator('#view select[data-key="subject"]').select_option('business-studies')
        page.wait_for_function("() => document.querySelectorAll('#view [data-chapter-id]').length === 12")
        page.locator('#view [data-chapter-id="2110"]').click()
        page.get_by_role('heading',name='Financial Markets',exact=True).wait_for()
        assert 'CBSE Class 12 Business Studies syllabus' in page.locator('#view').inner_text()
        page.evaluate("location.hash='#/syllabus'")
        page.locator('#view [data-chapter-id="2112"]').click()
        page.get_by_role('heading',name='Consumer Protection',exact=True).wait_for()
        content=page.locator('#view').inner_text()
        assert 'Consumer Protection Act, 2019' in content and 'Objectives' in content and 'Key terms' in content
        page.reload(wait_until='networkidle')
        page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
        assert 'Consumer Protection Act, 2019' in page.locator('#view').inner_text()
        page.evaluate("location.hash='#/syllabus'")
        page.locator('select[data-action="set"][data-key="board"]:visible').first.select_option('rajasthan')
        page.wait_for_function("() => document.querySelector('#view').innerText.includes('other boards have not been verified')")
        assert page.locator('#view [data-chapter-id]').count()==0
        page.evaluate("location.hash='#/chapter/2112?ncert=1'")
        page.get_by_role('heading',name='CBSE outlines only').wait_for()
        page.evaluate("location.hash='#/syllabus'")
        page.locator('select[data-action="set"][data-key="board"]:visible').first.wait_for()
        page.locator('select[data-action="set"][data-key="board"]:visible').first.select_option('cbse')
        page.wait_for_function("() => document.querySelectorAll('#view [data-chapter-id]').length === 12")
        page.locator('#view select[data-key="subject"]').select_option('chemistry')
        page.wait_for_function("() => document.querySelector('#view').innerText.includes('Biomolecules')")
        page.locator('a[href="#/chapter/710"]').first.click()
        page.get_by_role('heading', name='Biomolecules', exact=True).wait_for()
        view_text = page.locator('#view').inner_text()
        assert 'Sections' in view_text and 'Objectives' in view_text and 'Nucleic acids' in view_text
        assert 'not certified by CBSE' in view_text
        assert 'source crop, not AI-drawn' in view_text
        # summary is shown directly on the chapter page and on the syllabus card
        assert 'Biomolecules support the structure' in view_text
        page.get_by_role('link', name='Full outline library').click()
        page.wait_for_url('**/assets/notes/index.html#lech205')
        assert page.locator('#lech205 img').count()==1
        page.locator('#lech205 img').scroll_into_view_if_needed()
        page.wait_for_function("() => { const e=document.querySelector('#lech205 img'); return e.complete && e.naturalWidth>0; }")
        assert not errors, errors
        print('PASS',width,'business selector, syllabus-sourced unit, law, reload, board isolation and chemistry inline outline panel')
        ctx.close()
    browser.close()
