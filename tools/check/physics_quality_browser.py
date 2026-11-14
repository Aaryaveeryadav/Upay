#!/usr/bin/env python3
"""Physics import/display regressions; mocked AI, no content certification."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8005').rstrip('/')
with sync_playwright() as p:
    options={'headless':True,'args':['--disable-dev-shm-usage']}
    if os.environ.get('UPAY_CHROMIUM'): options['executable_path']=os.environ['UPAY_CHROMIUM']
    browser=p.chromium.launch(**options)
    context=browser.new_context(service_workers='block')
    page=context.new_page();errors=[];pending=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/api/ai/solve',lambda r:pending.append(r))
    page.goto(BASE,wait_until='networkidle')
    page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
    page.locator('#topbar select[data-key="cls"]').select_option('12')
    page.locator('#topbar select[data-key="subject"]').select_option('physics')
    page.wait_for_function('() => UP.pyq.some(q=>q.subject==="physics" && q.kind===2)')
    assert page.evaluate('() => !UP.pyq.some(q=>["phys25-554-s2-q16","phys25-552-s3-q05"].includes(q.id))')
    ar=page.evaluate('''() => {
      const q=UP.pyq.find(q=>q.subject==='physics' && q.kind===2);
      q.y=2097; return q.id;
    }''')
    page.evaluate('() => location.hash="#/pyq?y=2097"')
    page.wait_for_selector('#'+ar)
    assert page.locator('#'+ar+' .q-opt').count()==4
    assert 'Assertion' in page.locator('#'+ar+' .pyq-kind').inner_text()
    assert 'Questions number' not in page.locator('#'+ar+' .q-text').inner_text()
    choices = page.locator('#'+ar+' .q-opts')
    assert choices.is_hidden(), 'past-paper choices should start collapsed'
    page.locator('#'+ar+' .q-options-toggle').click()
    assert choices.is_visible(), 'the options control should reveal past-paper choices'
    page.locator('#'+ar+' [data-i="0"]').click()
    assert page.locator('#'+ar+' .q-opt.right, #'+ar+' .q-opt.wrong').count()==0
    for width in (1280,390):
        page.set_viewport_size({'width':width,'height':844})
        # Language preference must fall back honestly, never show legacy text.
        page.locator('.lang-btn[data-lang="hi"]').first.click()
        assert 'हिंदी पाठ' in page.locator('#'+ar).inner_text() or not page.evaluate('(id)=>UP.pyq.find(q=>q.id===id).hindiReview',ar)
        page.locator('.lang-btn[data-lang="en"]').first.click()
        page.evaluate('() => { UP.S.paper=null; location.hash="#/test"; }')
        page.wait_for_selector('.q-toggle')
        page.locator('.q-toggle').first.click()
        page.wait_for_selector('.ai-placeholder .ai-dots')
        assert page.locator('.ai-placeholder svg').count()==0
        box=page.locator('.ai-placeholder .ai-dots').first.bounding_box()
        assert box['width']<=40 and box['height']<=16,box
        assert page.locator('.ai-placeholder .ai-dot').count()==3
        assert page.locator('.ai-placeholder [role="status"]').count()==1
        assert page.evaluate('() => UP.S.paper.sections.flatMap(s=>s.questions).every(q=>q.raw.qualityStatus!=="withheld")')
        page.locator('.ai-placeholder').first.scroll_into_view_if_needed()
        page.wait_for_timeout(350)
        page.screenshot(path=f'/tmp/physics-quality/loading-{width}.png',full_page=False)
        # Release the mocked request; no provider call or answer-key fabrication.
        for r in pending:r.fulfill(status=503,content_type='application/json',body='{"error":"Mock provider unavailable"}')
        pending.clear()
        page.wait_for_selector('.ai-placeholder',state='detached')
        page.evaluate('() => location.hash="#/pyq?y=2097"')
        page.wait_for_selector('#'+ar)
        print(f'PASS {width}px: source AR options/type, ungraded picks, withheld rows absent from bank/test, compact accessible three-dot loading and error recovery')
    assert not errors,errors
    context.close();browser.close()
