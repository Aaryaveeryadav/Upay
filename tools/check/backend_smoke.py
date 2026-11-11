#!/usr/bin/env python3
"""Isolated local-server security regression; never opens the app's live data.

Creates an expendable copy of the server with its own data directory, test-only
password, port and mocked Supabase auth. No real credentials or provider calls.
"""
import base64
import http.client
import hashlib
import hmac
import json
import os
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEST_PW = 'Testing-Only-47!'
NEW_PW = 'Testing-Only-48!'

MOCK_HTTPS = r"""
const https = require('https');
const {EventEmitter} = require('events');
https.request = function(opts, cb) {
  const req = new EventEmitter();
  req.setTimeout = function(){ return req; };
  req.destroy = function(){ return req; };
  req.end = function(){
    setImmediate(function(){
      const response = new EventEmitter();
      const token = String(opts.headers && opts.headers.authorization || '').replace(/^Bearer /, '');
      response.statusCode = token.endsWith('.GOOD') ? 200 : 401;
      cb(response);
      response.emit('data', Buffer.from(JSON.stringify(response.statusCode === 200
        ? {id:'test-supabase-user', email:'mock@example.test', user_metadata:{name:'Mock', role:'admin'}}
        : {error:'invalid'})));
      response.emit('end');
    });
  };
  return req;
};
// No network: emulate only the Google endpoint and record the requested prompt.
const fs = require('fs');
global.fetch = async function(url, opts) {
  if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) throw new Error('Unexpected network request in isolated test');
  const request = JSON.parse(opts.body);
  fs.appendFileSync('mock-provider-prompts.jsonl', JSON.stringify(request.contents[0].parts[0].text) + '\n');
  const isEnglish12 = request.contents[0].parts[0].text.includes('English literature and language teacher answering a Class 12');
  const reply = isEnglish12
    ? {question_understood:'An English question',answer:'A sample literary explanation.',summary:'Mock interpretation.',
       approaches:[{name:'Interpretation',steps:[{t:'Consider evidence in the passage.'}]}],check:'Check the book',diagram:{type:'solid'}}
    : {question_understood:'GDP and NDP',answer:'NDP is GDP less depreciation.',summary:'Compare the two measures.',
       approaches:[{name:'Definitions',tag:'Explain',steps:[{t:'Subtract depreciation',m:'NDP = GDP - depreciation'}]}],
       check:'Review the definitions',diagram:{type:'solid'}};
  const payload = {candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}]};
  return {ok:true,status:200,text:async()=>JSON.stringify(payload)};
};
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def request(port, path, method='GET', body=None, token=None, headers=None):
    hdrs = {'Host': 'localhost:%d' % port}
    if headers:
        hdrs.update(headers)
    if token:
        hdrs['Authorization'] = 'Bearer ' + token
    raw = None
    if body is not None:
        raw = json.dumps(body).encode()
        hdrs['Content-Type'] = 'application/json'
    conn = http.client.HTTPConnection('127.0.0.1', port, timeout=10)
    conn.request(method, path, body=raw, headers=hdrs)
    resp = conn.getresponse()
    out = resp.read().decode('utf-8', errors='replace')
    conn.close()
    try:
        payload = json.loads(out)
    except ValueError:
        payload = out
    return resp.status, payload


def expect(port, path, status, **kwargs):
    code, body = request(port, path, **kwargs)
    assert code == status, (path, code, status, body)
    return body


def jwt(exp_offset=3600, signature='GOOD'):
    import time
    enc = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')
    return enc({'alg': 'HS256', 'typ': 'JWT', 'kid': 'same-project-header'}) + '.' + enc({'sub':'mock', 'exp':int(time.time()) + exp_offset}) + '.' + signature


def main():
    with tempfile.TemporaryDirectory(prefix='upay-isolated-', dir=os.environ.get('UPAY_TEST_TMP') or None) as td:
        work = Path(td)
        for name in ('server.js', 'corrupt_gate.js', 'lib/supabase-public.js', 'lib/supabase-auth.js', 'lib/ai-access.js', 'tools/checker.js', 'tools/reset-admin.js', 'tools/seed-admin.js'):
            (work / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, work / name)
        (work / 'index.html').write_text('<title>isolated test</title>')
        (work / 'assets').mkdir()
        (work / 'assets' / 'ok.js').write_text('window.test=true;')
        (work / 'assets' / 'escape').symlink_to(work / 'data', target_is_directory=True)
        (work / 'mock-https.js').write_text(MOCK_HTTPS)
        port = free_port()
        env = dict(os.environ, PORT=str(port), UPAY_ADMIN_PASSWORD=TEST_PW,
                   UPAY_AI_ALLOWED_USERS='test-supabase-user', NODE_OPTIONS='--require ' + str(work / 'mock-https.js'))
        env.pop('UPAY_OPEN', None)
        env.pop('UPAY_NO_AUTH', None)
        env.pop('GEMINI_KEY', None)
        env.pop('GEMINI_KEYS', None)
        proc = None

        def start(open_mode=False):
            nonlocal proc
            opts = dict(env)
            if open_mode:
                opts['UPAY_OPEN'] = '1'
            proc = subprocess.Popen(['node', 'server.js'], cwd=work, env=opts,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            # The ready log is emitted only once the server is listening.
            for line in proc.stdout:
                if 'Upay server on ' in line:
                    return
            raise RuntimeError('isolated server did not start')

        def stop():
            nonlocal proc
            if proc is not None:
                proc.terminate()
                proc.wait(timeout=10)
                proc = None

        try:
            start()
            expect(port, '/', 200)
            expect(port, '/assets/ok.js?v=isolated', 200)
            for path in ['/data/db.json', '/data/secret.key', '/server.js', '/tools/checker.js',
                         '/upay.zip', '/assets/../data/db.json', '/assets/%2e%2e/data/db.json',
                         '/assets/escape/db.json']:
                expect(port, path, 404)
            xss = expect(port, '/assets/%3Cscript%3Ealert(1)%3C/script%3E.html', 404)
            assert '<script>' not in xss and '&lt;script&gt;' in xss, xss
            expect(port, '/api/admin/key', 403)
            expect(port, '/api/admin/key', 403, headers={'Host':'localhost', 'X-Forwarded-For':'198.51.100.10'})
            expect(port, '/api/auth/me', 401)
            expect(port, '/api/ai/cache', 401)
            expect(port, '/api/ai/cache?q=test', 401)
            expect(port, '/api/auth/login', 401, method='POST', body={'user':'admin','password':'wrong'})
            login = expect(port, '/api/auth/login', 200, method='POST', body={'user':'admin','password':TEST_PW})
            token = login['token']
            assert login['user']['role'] == 'admin'
            cache = expect(port, '/api/ai/cache?q=unknown-test-question', 200, token=token)
            assert cache['found'] is False
            expect(port, '/api/admin/key', 200, token=token)
            expect(port, '/api/admin/key', 403, token=token + '.extrasegment')
            expect(port, '/api/auth/logout', 200, method='POST', token=token)
            expect(port, '/api/admin/key', 403, token=token)
            expect(port, '/api/ai/cache', 401, token=token)
            expect(port, '/api/admin/key', 403, token=token + '.extrasegment')

            # Tokens stay revoked through restart; token suffixes cannot evade it.
            stop(); start()
            expect(port, '/api/admin/key', 403, token=token)
            first = expect(port, '/api/auth/login', 200, method='POST', body={'user':'admin','password':TEST_PW})['token']
            import time
            time.sleep(0.01)  # make the replacement expiry distinct in this test
            renewed = expect(port, '/api/auth/renew', 200, method='POST', token=first)['token']
            assert renewed != first
            expect(port, '/api/admin/key', 403, token=first)
            expect(port, '/api/admin/key', 200, token=renewed)
            second = expect(port, '/api/auth/login', 200, method='POST', body={'user':'admin','password':TEST_PW})['token']
            expect(port, '/api/auth/password', 200, method='POST', token=renewed, body={'current':TEST_PW,'next':NEW_PW})
            expect(port, '/api/admin/key', 403, token=first)
            expect(port, '/api/admin/key', 403, token=second)
            admin = expect(port, '/api/auth/login', 200, method='POST', body={'user':'admin','password':NEW_PW})['token']
            made = expect(port, '/api/admin/users', 200, method='POST', token=admin,
                          body={'user':'teststudent','password':'student-test-42','role':'student'})
            student = expect(port, '/api/auth/login', 200, method='POST', body={'user':'teststudent','password':'student-test-42'})['token']
            expect(port, '/api/admin/key', 403, token=student)
            # Seed one private cache fixture without making any provider calls.
            # Old unowned cache records remain on disk but are never returned.
            stop()
            dbfile = work / 'data' / 'db.json'
            db = json.loads(dbfile.read_text())
            secret = bytes.fromhex((work / 'data' / 'secret.key').read_text().strip())
            owner = 'local:' + made['user']['id']
            parts = [owner, 'solve', 'maths', 10, 'en', 'owner fixture question']
            payload = json.dumps(parts, ensure_ascii=False, separators=(',', ':')).encode()
            key = 'v2:' + hmac.new(secret, payload, hashlib.sha256).hexdigest()[:32]
            db['aiCache'][key] = {'owner':owner, 'result':'student-only cached answer', 'approaches':[]}
            db['aiCache']['legacy-fixture'] = {'result':'legacy private answer'}
            dbfile.write_text(json.dumps(db))
            start()
            query = '/api/ai/cache?q=owner%20fixture%20question&subject=maths&cls=10&lang=en'
            cached = expect(port, query, 200, token=student)
            assert cached['found'] and cached['answer']['result'] == 'student-only cached answer'
            assert not expect(port, query, 200, token=admin)['found']
            assert not expect(port, query.replace('cls=10','cls=12'), 200, token=student)['found']
            assert not expect(port, query.replace('lang=en','lang=hi'), 200, token=student)['found']
            assert expect(port, '/api/ai/cache', 200, token=student)['count'] == 1
            assert expect(port, '/api/ai/cache', 200, token=admin)['count'] == 0
            solved = expect(port, '/api/ai/solve', 200, token=student, method='POST',
                            body={'question':'Owner fixture question','subject':'maths','cls':10,'lang':'en'})
            assert solved['cached'] and solved['result'] == 'student-only cached answer'
            expect(port, '/api/ai/solve', 400, token=admin, method='POST',
                   body={'question':'Owner fixture question','subject':'maths','cls':10,'lang':'en'})
            assert 'legacy-fixture' in json.loads(dbfile.read_text())['aiCache']
            # A local mock provider verifies Economics-specific prompts, no
            # unrelated arithmetic verification/diagram, and no answer cache.
            # The fake key and all prompts stay in the expendable temp folder.
            expect(port, '/api/admin/key', 200, token=admin, method='POST', body={'key':'isolated-test-key-not-real-42'})
            econ = {'question':'Explain the difference between GDP and NDP', 'subject':'economics', 'cls':12, 'lang':'en'}
            for _ in range(2):
                answer = expect(port, '/api/ai/solve', 200, token=student, method='POST', body=econ)
                assert answer['result'] == 'NDP is GDP less depreciation.'
                assert answer['check']['state'] == 'unchecked' and answer['diagram'] is None and not answer.get('cached')
            prompts = [json.loads(x) for x in (work / 'mock-provider-prompts.jsonl').read_text().splitlines()]
            assert len(prompts) == 2 and all('Economics teacher answering a Class 12' in p for p in prompts)
            assert all('Do not claim to have read or quoted a textbook' in p for p in prompts)
            assert not expect(port, '/api/ai/cache?q=Explain%20the%20difference%20between%20GDP%20and%20NDP&subject=economics&cls=12&lang=en', 200, token=student)['found']
            english = {'question':'How does Franz view his last lesson?', 'subject':'english', 'cls':12, 'lang':'en'}
            for _ in range(2):
                answer = expect(port, '/api/ai/solve', 200, token=student, method='POST', body=english)
                assert answer['result'] == 'A sample literary explanation.'
                assert answer['check']['state'] == 'unchecked' and answer['diagram'] is None and not answer.get('cached')
            prompts = [json.loads(x) for x in (work / 'mock-provider-prompts.jsonl').read_text().splitlines()]
            assert len(prompts) == 4
            assert all('English literature and language teacher answering a Class 12' in p for p in prompts[2:])
            assert all('PDFs are not automatically supplied' in p and 'Do not invent quotations' in p for p in prompts[2:])
            assert not expect(port, '/api/ai/cache?q=How%20does%20Franz%20view%20his%20last%20lesson%3F&subject=english&cls=12&lang=en', 200, token=student)['found']
            expect(port, '/api/admin/key', 200, token=admin, method='POST', body={'key':None})
            print('PASS isolated Economics and English 12 AI prompts, unchecked answers, no diagrams or cached explanations', flush=True)
            expect(port, '/api/admin/users', 200, method='DELETE', token=admin, body={'id':made['user']['id']})
            expect(port, '/api/auth/me', 401, token=student)

            # Mocked Auth confirms a valid token cannot lend a same-prefix fake
            # JWT its identity, and that signed-out Supabase tokens stay revoked.
            good, bad = jwt(signature='GOOD'), jwt(signature='BAD')
            assert good[:32] == bad[:32]
            me = expect(port, '/api/auth/me', 200, token=good)
            assert me['user']['role'] == 'student'
            expect(port, '/api/auth/me', 401, token=bad)
            expect(port, '/api/ai/solve', 400, token=good, method='POST', body={'question':'A test question'})
            expect(port, '/api/auth/logout', 200, token=good, method='POST')
            expect(port, '/api/auth/me', 401, token=good)
            assert (work / 'data' / 'secret.key').stat().st_mode & 0o077 == 0
            assert (work / 'data' / 'db.json').stat().st_mode & 0o077 == 0
            stop()
            # Recovery must not overwrite existing data or leave old sessions valid.
            before_seed = (work / 'data' / 'db.json').read_bytes()
            seed = subprocess.run(['node','tools/seed-admin.js','test-only-seed-password'], cwd=work, env=env, capture_output=True, text=True)
            assert seed.returncode != 0 and (work / 'data' / 'db.json').read_bytes() == before_seed
            recovery_pw = 'Recovery-Only-49!'
            recovery_env = dict(env, UPAY_ADMIN_PASSWORD=recovery_pw)
            reset = subprocess.run(['node','tools/reset-admin.js'], cwd=work, env=recovery_env, capture_output=True, text=True)
            assert reset.returncode == 0, reset.stderr
            backups = list((work / 'data').glob('db.before-reset-*.json'))
            assert len(backups) == 1 and backups[0].stat().st_mode & 0o077 == 0
            start()
            expect(port, '/api/admin/key', 403, token=admin)
            expect(port, '/api/auth/login', 401, method='POST', body={'user':'admin','password':NEW_PW})
            expect(port, '/api/auth/login', 200, method='POST', body={'user':'admin','password':recovery_pw})
            stop(); start(open_mode=True)
            for headers in ({}, {'Host':'localhost'}, {'Host':'localhost','X-Forwarded-For':'198.51.100.10'},
                            {'Host':'8004-sandbox.e2b.app'}):
                expect(port, '/api/admin/key', 403, headers=headers)
            me = expect(port, '/api/auth/me', 200)
            assert me['user']['role'] == 'student'
            expect(port, '/api/ai/solve', 400, method='POST', body={'question':'A test question'})
            print('Isolated server authentication, revocation, spoofing, owner-scoped cache, static paths and permissions: PASS')
        finally:
            stop()


if __name__ == '__main__':
    main()
