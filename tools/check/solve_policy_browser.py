#!/usr/bin/env python3
"""Mocked AI rendering only; does not verify provider accuracy or availability."""
import json
import os
from playwright.sync_api import sync_playwright
base = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')
with sync_playwright() as p:
    options = {'headless': True, 'args': ['--disable-dev-shm-usage']}
    if os.environ.get('UPAY_CHROMIUM'):
        options['executable_path'] = os.environ['UPAY_CHROMIUM']
    browser = p.chromium.launch(**options)
    page = browser.new_page(service_workers='block', viewport={'width':390,'height':844})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    fixture = {'source':'ai','policyVersion':'four-approaches-v2','result':'A mock answer',
        'approaches':[{'name':n,'steps':[{'t':t}]} for n,t in [
            ('First principles','Explain the underlying concept.'),
            ('Worked example','Apply the concept to an example.'),
            ('Comparison','Contrast related concepts.'),
            ('Application','Apply to a new supported scenario.')]],
        'diagram':{'type':'flow','nodes':['Cause','<img src=x onerror=alert(1)>','Effect'],
            'caption':'Conceptual causal chain; not to scale.'},'check':{'state':'unchecked'}}
    page.route('**/api/tel', lambda r:r.fulfill(status=204))
    page.route('**/api/ai/solve', lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture)))
    page.goto(base+'/',wait_until='networkidle')
    page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
    for subject in ['maths','physics','chemistry','biology','economics','english','accountancy']:
        page.evaluate('(subject) => { UP.S.subject=subject; UP.S.cls=12; location.hash="#/ask?q=Explain%20a%20concept%20in%20"+subject; }',subject)
        page.wait_for_selector('#answerMount .ai-flow-nodes li')
        assert page.locator('#answerMount .ai-flow-nodes li').count() == 3
        assert page.locator('#answerMount .ai-flow-nodes img').count() == 0
        assert '<img src=x' in page.locator('#answerMount .ai-flow-nodes').inner_text()
        assert 'Comparison' in page.locator('#answerMount').inner_text()
        assert page.locator('#answerMount .ai-flow-nodes').evaluate('(e) => e.scrollWidth <= e.clientWidth')
    assert not errors, errors
    browser.close()
print('PASS mocked four-approach answers and escaped concept diagrams across seven subjects on mobile')
