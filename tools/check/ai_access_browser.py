#!/usr/bin/env python3
"""Mocked approval UI, not proof of live database or credential readiness."""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')
with sync_playwright() as p:
    opts={'headless':True,'args':['--disable-dev-shm-usage']}
    if os.environ.get('UPAY_CHROMIUM'):opts['executable_path']=os.environ['UPAY_CHROMIUM']
    browser=p.chromium.launch(**opts);context=browser.new_context(service_workers='block');page=context.new_page();errors=[];state={'status':'none','admin':False}
    page.on('pageerror',lambda e:errors.append(str(e)))
    def access(route):
        req=route.request
        if req.method=='POST':
            body=req.post_data_json
            state['status']={'request':'pending','approve':'approved','revoke':'revoked'}[body['action']]
        result=[{'user_id':'10000000-0000-4000-8000-000000000001','email':'student@example.test','status':state['status']}] if 'manage=1' in req.url else {'status':state['status']}
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'admin':state['admin'],'result':result}))
    page.route('**/api/ai/access*',access)
    page.goto(BASE+'/',wait_until='networkidle')
    page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
    page.evaluate('() => location.hash="#/ai-access"')
    page.get_by_role('button',name='Request AI access',exact=True).click()
    page.wait_for_function('() => document.querySelector("#ai-access-panel").innerText.includes("pending")')
    assert page.get_by_role('button',name='Manage student requests').count()==0
    state['admin']=True
    page.get_by_role('button',name='Refresh',exact=True).click()
    page.get_by_role('button',name='Manage student requests').click()
    page.wait_for_selector('[data-action="ai-access-decide"]')
    page.on('dialog',lambda d:d.accept())
    page.get_by_role('button',name='Approve',exact=True).click()
    page.wait_for_function('() => document.querySelector("#ai-access-panel").innerText.includes("approved")')
    page.get_by_role('button',name='Revoke',exact=True).click()
    page.wait_for_function('() => document.querySelector("#ai-access-panel").innerText.includes("revoked")')
    assert not errors,errors
    browser.close()
print('PASS mocked student request / admin approve / revoke UI; no live permissions changed')
