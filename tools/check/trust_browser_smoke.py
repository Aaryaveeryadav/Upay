#!/usr/bin/env python3
"""Read-only/mock browser checks. Fixtures do NOT verify textbook content or AI."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')
with sync_playwright() as p:
    options={'headless':True,'args':['--disable-dev-shm-usage']}
    if os.environ.get('UPAY_CHROMIUM'): options['executable_path']=os.environ['UPAY_CHROMIUM']
    browser=p.chromium.launch(**options)
    context=browser.new_context(service_workers='block')
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/api/tel',lambda r:r.fulfill(status=204))
    page.goto(BASE+'/',wait_until='networkidle')
    page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
    assert page.get_by_role('region',name='Study plan').count()==1
    page.locator('[data-action="study-goal"]').select_option('5')
    page.reload(wait_until='networkidle')
    page.wait_for_selector('[data-action="study-goal"]')
    assert page.locator('[data-action="study-goal"]').input_value()=='5'
    page.locator('#topbar select[data-key="cls"]').select_option('12')
    page.locator('#topbar select[data-key="subject"]').select_option('physics')
    page.wait_for_function('() => UP.physicsOutlines && UP.S.subject === "physics"')
    page.wait_for_timeout(700)
    page.evaluate('() => location.hash="#/chapter/608"')
    page.wait_for_selector('.outline-panel')
    page.evaluate('() => location.hash="#/home"')
    page.wait_for_selector('section[aria-label="Study plan"] a[href="#/chapter/608"]')
    # Synthetic, browser-memory-only answer: proves render/click wiring, NOT a key.
    page.evaluate('''() => UP.pyq.push({id:'trust-fixture',cls:12,subject:'physics',board:'cbse',y:2098,ch:603,
      q:1,kind:1,m:1,en:'A 1000 W heater: synthetic render fixture.',cleanText:true,
      opts:[{en:'Fixture right',hi:''},{en:'Fixture B',hi:''},{en:'Fixture C',hi:''},{en:'Fixture D',hi:''}],
      ans:'Fixture right',src:'TEST ONLY',keyVerified:true,textReview:'source-verified'})''')
    page.evaluate('''() => UP.pyq.push({...UP.pyq.find(q=>q.id==='trust-fixture'),id:'trust-unverified',q:2,keyVerified:false})''')
    page.evaluate('() => location.hash="#/pyq?y=2098"')
    page.wait_for_selector('#trust-fixture')
    assert '1000 W' in page.locator('#trust-fixture').inner_text()
    assert page.locator('#trust-fixture .q-opt').count()==4
    page.locator('#trust-fixture [data-i="0"]').click()
    assert page.locator('#trust-fixture .q-opt.right').count()==1
    assert page.locator('#trust-fixture a',has_text='Report a problem').count()==1
    page.locator('#trust-unverified [data-i="0"]').click()
    assert page.locator('#trust-unverified .q-opt.right, #trust-unverified .q-opt.wrong').count()==0
    page.locator('#topbar select[data-key="subject"]').select_option('economics')
    page.wait_for_function('() => UP.S.subject === "economics"')
    page.wait_for_timeout(700)
    page.route('**/api/ai/solve',lambda r:r.fulfill(status=429,content_type='application/json',body='{"code":"provider_rate_limit","error":"Provider temporarily limited","retryAfter":15}'))
    page.evaluate('() => location.hash="#/ask?q=Explain%20GDP%20for%20a%20mock%20recovery%20test"')
    page.wait_for_selector('[data-action="copy-ai-question"]',timeout=20000)
    assert page.locator('[data-action="savePyq"]').count()>0
    assert 'Retry after 15 seconds' in page.locator('#answerMount').inner_text()
    page.locator('#answerMount [data-action="savePyq"]').click()
    assert page.evaluate('() => UP.S.saved.some(q => q.q.includes("mock recovery test"))')
    assert not errors,errors
    browser.close()
print('PASS shortcuts, scoped resume/goal, synthetic options/correct pick/1000 W, report link and mocked AI recovery')
