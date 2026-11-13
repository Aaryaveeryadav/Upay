'use strict';
// Mocked serverless contract/auth test. No real users, network, or API keys.
const assert = require('assert');
const { Readable } = require('stream');
process.env.UPAY_AI_ALLOWED_USERS = 'allowed-test-user,allowed-test-user-2';
// Prefer the new public key over a stale legacy env override; both are fixtures.
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_fixture';
process.env.SUPABASE_ANON_KEY = 'legacy_test_fixture';
const lib = require('../../lib/gemini.js');
let providerCalls = 0, lastPrompt = '', replyText = '', queuedReplies = [], callBudgets = [];
const four = () => [
  {name:'First principles', steps:[{t:'The underlying principle links the supplied information to the conclusion, with the assumptions stated explicitly.'}]},
  {name:'Worked application', steps:[{t:'A concrete application illustrates the principle while the boundary conditions show where the comparison stops being valid.'}]},
  {name:'Comparison', steps:[{t:'The relevant concepts differ in their scope and conditions, and this distinction determines which conclusion follows.'}]},
  {name:'Independent check', steps:[{t:'The conclusion is consistent with the requirements because each condition is satisfied without introducing unsupported assumptions.'}]}
];
lib.callGeminiResilient = async function (prompt, keys, model, image, options) {
  providerCalls++;
  lastPrompt = prompt;
  if (options) callBudgets.push(options);
  if (image) return { text: 'Read a question from the photo', model: 'mock-model' };
  return { text: queuedReplies.length ? queuedReplies.shift() : replyText, model: 'mock-model' };
};
const authMe = require('../../api/auth/me.js');
const localLogin = require('../../api/auth/login.js');
const telemetry = require('../../api/tel.js');
const solve = require('../../api/ai/solve.js');
const readImage = require('../../api/ai/read-image.js');
global.fetch = async function (_url, options) {
  assert.equal(options.headers.apikey, 'sb_publishable_test_fixture', 'use the publishable override for provider token verification');
  const token = String(options.headers.authorization || '').replace(/^Bearer /, '');
  if (token === 'unavailable') throw new Error('mock offline');
  if (token === 'invalid') return { ok: false, status: 401 };
  if (token === 'other') return { ok: true, status: 200, json: async () => ({ id: 'other-user', email:'other@example.test' }) };
  if (token === 'valid') return { ok: true, status: 200, json: async () => ({ id:'allowed-test-user', email:'student@example.test', user_metadata:{role:'admin'} }) };
  if (token === 'valid-two') return { ok: true, status: 200, json: async () => ({ id:'allowed-test-user-2', email:'second@example.test' }) };
  return { ok: false, status: 401 };
};
function res() {
  return {
    headers:{}, code:0, body:null,
    setHeader(k,v){ this.headers[k.toLowerCase()] = v; return this; },
    status(n){ this.code=n; return this; },
    send(value){ try { this.body = JSON.parse(value); } catch (_) { this.body=value; } return this; },
    json(value){ this.body=value; return this; }
  };
}
async function invoke(handler, { method='GET', token='', body }={}) {
  const req = { method, headers: token ? { authorization: 'Bearer ' + token } : {}, body };
  const r = res(); await handler(req,r); return r;
}
async function main() {
  for (const method of ['POST','OPTIONS']) {
    const tel = await invoke(telemetry,{method,body:{e:'route'}});
    assert.equal(tel.code,204); assert.equal(tel.headers['cache-control'],'no-store');
  }
  const telGet = await invoke(telemetry); assert.equal(telGet.code,405);
  const unavailableLogin = await invoke(localLogin,{method:'POST',body:{user:'test',pass:'test'}});
  assert.equal(unavailableLogin.code,401); assert.ok(unavailableLogin.body.error); assert.ok(!unavailableLogin.body.user);
  assert.equal((await invoke(localLogin)).code,405);
  let r = await invoke(authMe);
  assert.equal(r.code,200); assert.equal(r.body.user.role,'student'); assert.equal(r.body.user.user,'guest');
  r = await invoke(authMe,{token:'invalid'}); assert.equal(r.code,401);
  r = await invoke(authMe,{token:'unavailable'}); assert.equal(r.code,503);
  r = await invoke(authMe,{token:'valid'}); assert.equal(r.code,200); assert.equal(r.body.user.role,'student');
  for (const [token, status] of [['',401],['invalid',401],['other',403],['unavailable',503]]) {
    r = await invoke(solve,{method:'POST', token, body:{question:'test question'}});
    assert.equal(r.code,status); assert.equal(providerCalls,0);
    r = await invoke(readImage,{method:'POST', token, body:{data:'abc',mime:'image/png'}});
    assert.equal(r.code,status); assert.equal(providerCalls,0);
  }
  replyText = JSON.stringify({ question_understood:'Capital accounts', answer:'Debit X', summary:'An accounting entry',
    approaches:four(), check:'Review the entry',
    diagram:{type:'solid'} });
  r = await invoke(solve,{method:'POST', token:'valid', body:{question:'Record a partnership entry', subject:'accountancy', cls:12}});
  assert.equal(r.code,200); assert.equal(r.body.result,'Debit X'); assert.equal(r.body.questionUnderstood,'Capital accounts');
  assert.equal(r.body.check.state,'unchecked'); assert.equal(r.body.diagram,null);
  assert.match(lastPrompt,/Class 12 Accountancy/); assert.doesNotMatch(lastPrompt,/Class 10 Mathematics/);
  r = await invoke(solve,{method:'POST', token:'valid', body:{question:'Which spreadsheet formula applies?', subject:'computerized-accounting', cls:12}});
  assert.equal(r.code,200); assert.match(lastPrompt,/Computerised Accounting/);
  const beforeEconomics = providerCalls;
  const economicsQuestion = {question:'Explain the difference between GDP and NDP', subject:'economics', cls:12, lang:'en'};
  r = await invoke(solve,{method:'POST', token:'valid', body:economicsQuestion});
  assert.equal(r.code,200); assert.match(lastPrompt,/Economics teacher answering a Class 12/);
  assert.match(lastPrompt,/Do not claim to have read or quoted a textbook/);
  assert.equal(r.body.check.state,'unchecked'); assert.equal(r.body.diagram,null);
  r = await invoke(solve,{method:'POST', token:'valid', body:economicsQuestion});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeEconomics+2);
  const beforeEnglish12 = providerCalls;
  replyText = JSON.stringify({ question_understood:'An English question', answer:'A sample literary explanation.', summary:'A mock response.',
    approaches:four(), check:'Check the book', diagram:{type:'solid'} });
  const english12Question = {question:'How does Franz view his last lesson?', subject:'english', cls:12, lang:'en'};
  for (let i=0; i<2; i++) {
    r = await invoke(solve,{method:'POST', token:'valid', body:english12Question});
    assert.equal(r.code,200); assert.equal(r.body.result,'A sample literary explanation.');
    assert.match(lastPrompt,/English literature and language teacher answering a Class 12/);
    assert.match(lastPrompt,/PDFs are not automatically supplied/);
    assert.match(lastPrompt,/Do not invent quotations/);
    assert.equal(r.body.check.state,'unchecked'); assert.equal(r.body.diagram,null); assert.notEqual(r.body.cached,true);
  }
  assert.equal(providerCalls,beforeEnglish12+2);
  r = await invoke(solve,{method:'POST', token:'valid', body:{question:'Describe electromagnetic induction', subject:'physics', cls:12}});
  assert.equal(r.code,200); assert.match(lastPrompt,/Science teacher/);
  const beforeCache = providerCalls;
  const privateQuestion = {question:'Owner-isolation fixture question', subject:'physics', cls:12, lang:'en'};
  r = await invoke(solve,{method:'POST', token:'valid', body:privateQuestion});
  assert.equal(r.code,200); assert.equal(providerCalls,beforeCache+1); assert.notEqual(r.body.cached,true);
  r = await invoke(solve,{method:'POST', token:'valid', body:privateQuestion});
  assert.equal(r.code,200); assert.equal(r.body.cached,true); assert.equal(providerCalls,beforeCache+1);
  r = await invoke(solve,{method:'POST', token:'valid-two', body:privateQuestion});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeCache+2);
  r = await invoke(solve,{method:'POST', token:'valid-two', body:{...privateQuestion,lang:'hi'}});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeCache+3);
  // One complete repair for a short draft, including theory and non-maths subjects.
  const short = JSON.stringify({answer:'A theory answer', approaches:[four()[0]]});
  const complete = JSON.stringify({answer:'A theory answer', approaches:four(),
    diagram:{type:'flow',nodes:['Cause','Mechanism','Effect'],caption:'Cause leads to effect through a mechanism.'}});
  for (const subject of ['maths','applied-maths','physics','chemistry','biology','accountancy','computerized-accounting','economics','english','hindi','social','business']) {
    const before = providerCalls;
    queuedReplies = [short, complete];
    r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Explain a policy test '+subject,subject,cls:12,minMethods:0}});
    assert.equal(r.code,200,subject); assert.equal(providerCalls,before+2);
    assert.equal(r.body.approaches.length,4); assert.equal(r.body.diagram.type,'flow');
    assert.match(lastPrompt,/at least 4 genuinely distinct/i);
    assert.match(lastPrompt,/REPAIR:/);
  }
  // Repeated/renamed working is not counted; do not return a partial success.
  queuedReplies = [short, JSON.stringify({answer:'A',approaches:[four()[0],four()[0],{...four()[0],name:'Renamed copy'}]})];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Reject duplicate method fixture',subject:'physics'}});
  assert.equal(r.code,502); assert.match(r.body.error,/four distinct/);
  queuedReplies = [];
  r = await invoke(readImage,{method:'POST',token:'valid',body:{}}); assert.equal(r.code,400);
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'a'.repeat(240),mime:'image/png'}});
  assert.equal(r.code,200); assert.equal(r.body.question,'Read a question from the photo');
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'a'.repeat(240),mime:'text/html'}});
  assert.equal(r.code,400);
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'X'.repeat(4*1024*1024),mime:'image/png'}});
  assert.equal(r.code,400);
  replyText = 'not JSON';
  r = await invoke(solve,{method:'POST',token:'valid',body:JSON.stringify({question:'different test input',subject:'accountancy',cls:12})});
  assert.equal(r.code,502);
  const stream = Readable.from([Buffer.from('{"one":1}')]);
  assert.deepEqual(await lib.readBody(stream), {one:1});
  assert.deepEqual(await lib.readBody({body:Buffer.from('{"two":2}')}), {two:2});
  queuedReplies=[1,2].map(()=>JSON.stringify({answer:'Only three approaches',approaches:four().slice(0,3)}));
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Reject a three-approach response under the new policy',subject:'physics'}});
  assert.equal(r.code,502);assert.match(r.body.error,/four distinct/);
  const hindiPrompt='“जल संरक्षण केवल सरकार की जिम्मेदारी नहीं, हर नागरिक का कर्तव्य है।” इस विषय पर लगभग 150–200 शब्दों में अपने विचार लिखिए।';
  replyText=JSON.stringify({answer:'एक लेखन उत्तर',approaches:four()});
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:hindiPrompt,subject:'social',cls:10,lang:'en'}});
  assert.equal(r.code,200);assert.equal(r.body.subjectRouting.subject,'hindi');
  assert.match(lastPrompt,/Class 10 hindi/i);assert.match(lastPrompt,/FOUR complete alternative responses/);
  assert.equal(r.body.approaches.length,4);
  const letterQuestion = 'Write a formal letter to the editor arguing against replacing a public park with a parking lot. Discuss health, environment and access to public space, and suggest a practical alternative.';
  const letter = '[Your address]\n[Date]\nThe Editor\n[Newspaper]\n[Town]\nSubject: Preserve our public park\nSir or Madam,\nThrough your newspaper, I urge the council to retain our public park rather than replace it with a parking lot.\nThe park offers free space for walking, exercise and play. Its loss would particularly affect children and older residents who cannot afford private recreation. Trees provide shade, absorb some pollutants and help rainwater soak into the soil; paving the site would increase heat and runoff.\nPublic green space belongs to everyone, including households without cars. Convenient parking should not take priority over their access to recreation and community life.\nThe council should instead improve existing parking on already paved land, introduce timed parking near shops and strengthen bus connections. Please encourage a public consultation before any decision.\nYours faithfully,\n[Your name]';
  queuedReplies = [JSON.stringify({answer:'Four complete formal letter options', approaches:four()})];
  replyText = JSON.stringify({answer:'I urge the council to retain our public park.', approaches:four().map((a,i)=>({name:a.name, steps:[{t:letter.replace('Preserve our public park', ['Save our green space','Protect shared recreation','Choose sustainable parking','Keep the park accessible'][i])}]}))});
  const beforeLetter = providerCalls;
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:letterQuestion,subject:'social'}});
  assert.equal(r.code,200); assert.equal(providerCalls,beforeLetter+2,'outline must trigger repair');
  assert.equal(callBudgets.at(-1),callBudgets.at(-2),'repair uses the exact same budget and signal');
  assert(callBudgets.at(-1).signal.aborted,'successful request releases provider resources');
  assert(callBudgets.at(-1).deadline > Date.now() && callBudgets.at(-1).deadline <= Date.now()+140000);
  assert(r.body.approaches.every(a=>a.format==='prose' && a.steps[0].t.includes('Yours faithfully')));
  assert.match(lastPrompt,/actual finished prose/);
  queuedReplies=[1,2].map(()=>JSON.stringify({answer:'Four letter options',approaches:four()}));
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:letterQuestion,subject:'english'}});
  assert.equal(r.code,502,'persistent outlines must not be shown as completed letters');
  const callsBeforeExact = providerCalls;
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all positive integers n for which n²+10n+2026 is a perfect square.',subject:'maths'}});
  assert.equal(r.code,200); assert.equal(r.body.result,'n = 15, 27, 327, 995');
  assert.equal(r.body.source,'exact'); assert.equal(r.body.check.source,'arithmetic');
  assert.equal(providerCalls,callsBeforeExact,'exact supported question must not spend a provider call');
  const ambiguousCalls=providerCalls;
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all positive integers 7 for which n2 + 10m + 2026 is a perfect square.',subject:'maths'}});
  assert.equal(r.code,422);assert.equal(r.body.code,'question_needs_confirmation');assert.equal(providerCalls,ambiguousCalls);
  const radicalCalls = providerCalls;
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all integers x for which √(x+6) + √(19-x) is an integer.',subject:'social'}});
  assert.equal(r.code,200);assert.equal(r.body.result,'x ∈ {-6, 3, 10, 19}');
  assert.equal(r.body.source,'exact');assert.equal(providerCalls,radicalCalls);
  for(const approach of r.body.approaches)assert.equal(approach.steps.at(-1).m,r.body.result);
  await assert.rejects(lib.readBody({body:'{bad json'}));
  console.log('Mocked serverless auth, paid-AI allowlist, owner-scoped cache, response shape, image reading and body parsing: PASS');
}
main().catch(err => { console.error(err); process.exitCode=1; });
