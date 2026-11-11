#!/usr/bin/env python3
"""Exercise local sign-in and mocked Supabase browser flows on an isolated DB."""
import os
import shutil
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PASSWORD = 'Browser-Test-Only-42!'
NEW_PASSWORD = 'Browser-Test-Only-43!'
MOCK_SDK = r"""
window.__insertCalls = 0;
window.__sdkLoadedAfterApp = !!(window.UP && window.UP.S);
window.supabaseJs = { createClient: function () {
  const user = {id:'mock-student-id', email:'student@example.test', user_metadata:{name:'Mock Student'}};
  let session = {access_token:'mock-supabase-token', user};
  const query = {
    select(){return this}, eq(){return this}, order(){return this},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    limit(){return Promise.resolve({data:[],error:null})},
    insert(){window.__insertCalls++;return this},
    single(){return Promise.resolve({data:{id:'new-id'},error:null})},
    upsert(){return Promise.resolve({error:null})}, delete(){return this}
  };
  return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){},
    signOut:async()=>{session=null;return {};}},from(){return query}};
}};
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]


def main():
    with tempfile.TemporaryDirectory(prefix='upay-browser-auth-', dir=os.environ.get('UPAY_TEST_TMP') or None) as td:
        work = Path(td)
        for name in ('server.js','corrupt_gate.js','lib/supabase-public.js','lib/supabase-auth.js','lib/ai-access.js','tools/checker.js','index.html','sw.js'):
            (work / name).parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(ROOT / name,work / name)
        (work / 'assets').symlink_to(ROOT / 'assets', target_is_directory=True)
        port = free_port(); base = f'http://127.0.0.1:{port}'
        env = dict(os.environ, PORT=str(port), UPAY_ADMIN_PASSWORD=PASSWORD)
        env.pop('UPAY_OPEN',None); env.pop('UPAY_NO_AUTH',None); env.pop('NODE_OPTIONS',None)
        server = subprocess.Popen(['node','server.js'], cwd=work, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        try:
            for line in server.stdout:
                if 'Upay server on ' in line: break
            else: raise RuntimeError('isolated server did not start')
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
                ctx = browser.new_context(service_workers='block')
                ctx.add_init_script('''
                  localStorage.setItem('upay.saved', JSON.stringify([{q:'Guest-only saved question'}]));
                  localStorage.setItem('upay.seeded','true');
                  localStorage.setItem('upay.mastery',JSON.stringify({legacyMarker:{attempted:4}}));
                  localStorage.setItem('upay.progress',JSON.stringify({daily:{'2000-01-01':13},subjects:{maths:13}}));
                  localStorage.setItem('upay.recent',JSON.stringify([{q:'Guest-only recent',subject:'maths',cls:10,board:'cbse'}]));
                  localStorage.setItem('upay.mockTest',JSON.stringify({scope:'guest-private',items:[{q:'Guest-only mock'}],started:1}));
                ''')

                page = ctx.new_page(); errors=[]; model_calls=[]
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: model_calls.append(r.url) if '/api/admin/key/models' in r.url else None)
                page.route('**/api/tel',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
                page.route('**/assets/js/vendor/supabase.umd.js',lambda r:r.fulfill(status=404,body='unavailable'))
                page.goto(base+'/',wait_until='networkidle',timeout=60000)
                page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
                assert page.evaluate('UP.S.user') is None
                guest_saved = page.evaluate('UP.S.saved.map(x=>x.q)')
                assert guest_saved
                assert page.evaluate("localStorage.getItem('upay.mastery') !== null && !UP.S.mastery.legacyMarker"), 'legacy unscoped data was mixed or deleted'
                guest_mock = page.evaluate('UP.S.mockTest')
                guest_recent = page.evaluate('UP.S.recent')
                guest_progress = page.evaluate('UP.S.progress')
                page.evaluate('''() => { UP.S.mastery.guestMarker={attempted:2};
                  const k='mastery.scope.'+encodeURIComponent(JSON.stringify([UP.S.savedKey,UP.S.board,+UP.S.cls,UP.S.subject]));
                  localStorage.setItem('upay.'+k,JSON.stringify(UP.S.mastery)); }''')
                page.evaluate("location.hash='#/login'")
                page.locator('#authForm input[name="email"]').fill('admin')
                page.locator('#authForm input[name="password"]').fill(PASSWORD)
                page.locator('#authForm button[type="submit"]').click()
                page.wait_for_function("UP.S.user && UP.S.user.role==='admin' && UP.S.user.auth==='local'",timeout=15000)
                page.wait_for_function("location.hash==='#/account'")
                assert page.evaluate('UP.S.saved.length') == 0, 'guest saved list leaked into admin list'
                assert page.evaluate('UP.S.mockTest === null && UP.S.recent.length === 0 && !UP.S.mastery.guestMarker && Object.keys(UP.S.progress.daily||{}).length===0'), 'guest practice leaked into admin session'
                old_token = page.evaluate("localStorage.getItem('upay.token')")
                form = page.locator('#localPasswordForm')
                form.locator('input[name="current"]').fill(PASSWORD)
                form.locator('input[name="next"]').fill(NEW_PASSWORD)
                form.locator('input[name="confirm"]').fill(NEW_PASSWORD)
                form.locator('button[type="submit"]').click()
                page.wait_for_function("location.hash==='#/login' && UP.S.user===null",timeout=15000)
                invalid = page.evaluate("async token => (await fetch('/api/auth/me',{headers:{authorization:'Bearer '+token}})).status",old_token)
                assert invalid == 401, invalid
                page.locator('#authForm input[name="email"]').fill('admin')
                page.locator('#authForm input[name="password"]').fill(NEW_PASSWORD)
                page.locator('#authForm button[type="submit"]').click()
                page.wait_for_function("UP.S.user && UP.S.user.role==='admin' && location.hash==='#/home'",timeout=15000)
                token = page.evaluate("localStorage.getItem('upay.token')")
                page.evaluate("location.hash='#/admin'")
                page.locator('#ak-status').wait_for(timeout=15000)
                page.wait_for_timeout(200)
                assert not model_calls, 'admin page triggered paid/live provider model lookup automatically'
                page.reload(wait_until='networkidle',timeout=60000)
                page.wait_for_function("UP.S.user && UP.S.user.role==='admin'",timeout=15000)
                assert page.evaluate("UP.S.savedKey.includes('local.admin')")
                page.evaluate('UP.sbSignOut()')
                page.wait_for_function('UP.S.user===null && !localStorage.getItem("upay.token")')
                assert page.evaluate('UP.S.saved.map(x=>x.q)') == guest_saved
                assert page.evaluate('UP.S.mockTest') == guest_mock
                assert page.evaluate('UP.S.recent') == guest_recent
                assert page.evaluate('UP.S.progress') == guest_progress
                assert page.evaluate('!!UP.S.mastery.guestMarker'), 'guest study state was not restored'
                status = page.evaluate("async token => (await fetch('/api/auth/me',{headers:{authorization:'Bearer '+token}})).status",token)
                assert status == 401, status
                assert not errors,errors
                ctx.close()

                # Exercise the actual bundled UMD SDK, not only a hand-written
                # mock. It exports window.supabase (not window.supabaseJs).
                ctx = browser.new_context(service_workers='block'); page = ctx.new_page(); errors=[]; public_keys=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.route('**/api/tel',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
                page.route('**/auth/v1/health',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
                def public_data(route):
                    public_keys.append(route.request.headers.get('apikey',''))
                    route.fulfill(status=200,content_type='application/json',body='[]')
                page.route('**/rest/v1/profiles*',public_data)
                page.goto(base+'/',wait_until='networkidle',timeout=60000)
                page.wait_for_function("window.__SUPABASE__ && window.__SUPABASE__.auth && typeof window.__SUPABASE__.from==='function'",timeout=15000)
                key = page.evaluate('window.__SUPABASE__.supabaseKey')
                assert key.startswith('sb_publishable_'), 'browser still uses a legacy JWT API key'
                reply = page.evaluate("async () => { const r=await window.__SUPABASE__.from('profiles').select('id').limit(0); return {status:r.status, error:r.error}; }")
                assert reply['status']==200 and reply['error'] is None and public_keys==[key], 'bundled client did not send the public API key'
                assert page.evaluate('window.__supabaseOnline') is True and not errors, errors
                ctx.close()

                # A loaded script without a working SDK must not claim that
                # Supabase is online or leave an unresolved client promise.
                ctx = browser.new_context(service_workers='block'); page = ctx.new_page()
                page.route('**/api/tel',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
                page.route('**/assets/js/vendor/supabase.umd.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body='window.supabase = {};'))
                page.goto(base+'/',wait_until='networkidle',timeout=60000)
                page.wait_for_function('window.__SUPABASE__ === null && window.__supabaseOnline === false',timeout=15000)
                ctx.close()

                # Mock a delayed SDK, a verified student session, and public
                # endpoints. The app must await the client and attach its token
                # even when a caller supplies an empty Bearer placeholder.
                ctx = browser.new_context(service_workers='block'); page=ctx.new_page(); errors=[]; auth=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                ctx.add_init_script("localStorage.setItem('upay.saved', JSON.stringify([{q:'Guest-only saved question'}])); localStorage.setItem('upay.seeded','true');")
                page.route('**/api/tel',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
                page.route('**/auth/v1/health',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
                def delayed_sdk(route):
                    # Delay the actual script response while core assets load.
                    # Its top-level marker confirms app.js ran before the SDK.
                    time.sleep(1.8)
                    route.fulfill(status=200,content_type='application/javascript',body=MOCK_SDK)
                page.route('**/assets/js/vendor/supabase.umd.js',delayed_sdk)
                def cache_route(route):
                    auth.append(route.request.headers.get('authorization',''))
                    route.fulfill(status=200,content_type='application/json',body='{"found":false}')
                page.route('**/api/ai/cache*',cache_route)
                page.goto(base+'/',wait_until='networkidle',timeout=60000)
                page.wait_for_function("window.UP && UP.S && UP.S.user && UP.S.user.auth==='supabase'",timeout=20000)
                assert page.evaluate('window.__sdkLoadedAfterApp') is True, 'SDK was not delayed past app initialization'
                assert page.evaluate('UP.S.saved.length') == 0, 'guest list crossed into Supabase account'
                assert page.evaluate('window.__insertCalls') == 0, 'guest list was uploaded without consent'
                page.evaluate("fetch('/api/ai/cache',{headers:{authorization:'Bearer '}})")
                assert auth[-1] == 'Bearer mock-supabase-token',auth
                page.evaluate('UP.sbSignOut()')
                page.wait_for_function('UP.S.user===null')
                assert page.evaluate('UP.S.saved.map(x=>x.q)') == ['Guest-only saved question']
                assert not errors,errors
                ctx.close(); browser.close()
            print('Isolated login, password rotation, owner-scoped state, actual bundled Supabase SDK, publishable key, SDK failure and delayed-token forwarding: PASS')
        finally:
            server.terminate(); server.wait(timeout=10)

if __name__ == '__main__': main()
