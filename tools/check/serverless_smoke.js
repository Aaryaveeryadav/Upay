'use strict';
// Mocked serverless contract/auth test. No real users, network, or API keys.
const assert = require('assert');
const { Readable } = require('stream');
process.env.UPAY_AI_ALLOWED_USERS = 'allowed-test-user,allowed-test-user-2';
// Prefer the new public key over a stale legacy env override; both are fixtures.
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_fixture';
// This contract test drives the Gemini-shaped mock below, so it names that
// provider explicitly. The shipped default (lib/ai-provider.js) is the site's
// own local model, and the local path has its own mocked test.
process.env.UPAY_SOLVE_PROVIDER = 'gemini';
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
  for(const subject of ['hindi-core','hindi-elective']) {
    const body={subject,cls:12,board:'cbse',question:'कवि को अपनी स्वर्गीया पत्नी की याद क्यों आई?'};
    r=await invoke(solve,{method:'POST',token:'valid',body});assert.equal(r.code,200);
    assert(lastPrompt.includes('CBSE Class 12 Hindi '+(subject==='hindi-core'?'Core':'Elective')));
    assert.equal(r.body.check.state,'unchecked');assert.match(r.body.check.note,/not checked against an official answer key/);
    r=await invoke(solve,{method:'POST',token:'valid',body:{...body,board:'rajasthan'}});assert.equal(r.code,422);
    r=await invoke(solve,{method:'POST',token:'valid',body:{...body,cls:10}});assert.equal(r.code,422);
  }
  r = await invoke(solve,{method:'POST', token:'valid', body:{question:'Describe electromagnetic induction', subject:'physics', cls:12}});
  assert.equal(r.code,200); assert.match(lastPrompt,/Science teacher/);
  const beforeCache = providerCalls;
  const privateQuestion = {question:'Owner-isolation fixture question', subject:'physics', cls:12, lang:'en'};
  r = await invoke(solve,{method:'POST', token:'valid', body:privateQuestion});
  assert.equal(r.code,200); assert.equal(providerCalls,beforeCache+1); assert.notEqual(r.body.cached,true);
  r = await invoke(solve,{method:'POST', token:'valid', body:privateQuestion});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeCache+2);
  r = await invoke(solve,{method:'POST', token:'valid-two', body:privateQuestion});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeCache+3);
  r = await invoke(solve,{method:'POST', token:'valid-two', body:{...privateQuestion,lang:'hi'}});
  assert.equal(r.code,200); assert.notEqual(r.body.cached,true); assert.equal(providerCalls,beforeCache+4);
  // A wrong headline must not survive even when the workings happen to be correct.
  const circuitQuestion = 'A 6 Ω resistor and a 3 Ω resistor are connected in parallel, then connected in series with a 2 Ω resistor to a 12 V battery. Find the total resistance and the current through each parallel resistor.';
  const wrongCircuit = JSON.stringify({answer:'Total resistance = 4 Ω; Current through 6 Ω resistor = 1.33 A; Current through 3 Ω resistor = 2.67 A',approaches:four()});
  const correctCircuit = JSON.stringify({answer:'Total resistance = 4 Ω; Current through 6 Ω resistor = 1 A; Current through 3 Ω resistor = 2 A',approaches:four()});
  const beforeCircuit=providerCalls; queuedReplies=[wrongCircuit,correctCircuit];
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:circuitQuestion,subject:'physics'}});
  assert.equal(r.code,200); assert.equal(providerCalls,beforeCircuit+2); assert.match(r.body.result,/6 Ω resistor = 1 A/);
  assert.match(lastPrompt,/Independent circuit calculation/);
  queuedReplies=[wrongCircuit,wrongCircuit];
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:circuitQuestion,subject:'physics'}});
  assert.equal(r.code,502); assert.match(r.body.error,/independent calculation/);
  queuedReplies=[];
  // One complete repair for a short draft, including theory and non-maths subjects.
  const short = JSON.stringify({answer:'A theory answer', approaches:[]});
  const complete = JSON.stringify({answer:'A theory answer', approaches:four(),
    diagram:{type:'flow',nodes:['Cause','Mechanism','Effect'],caption:'Cause leads to effect through a mechanism.'}});
  for (const subject of ['maths','applied-maths','physics','chemistry','biology','accountancy','computerized-accounting','economics','english','hindi','social','business']) {
    const before = providerCalls;
    queuedReplies = [short, complete];
    r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Explain a policy test '+subject,subject,cls:12,minMethods:0}});
    assert.equal(r.code,200,subject); assert.equal(providerCalls,before+2);
    assert.equal(r.body.approaches.length,4); assert.equal(r.body.diagram.type,'flow');
    assert.match(lastPrompt,/at least FOUR/);
    assert.match(lastPrompt,/REPAIR:/);
  }
  // Short responses require repair; duplicates cannot satisfy the minimum.
  for(const count of [1,2,3]){
    const before=providerCalls;
    queuedReplies=[JSON.stringify({answer:'Complete result',approaches:four().slice(0,count)}),complete];
    r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Natural method count '+count,subject:'physics'}});
    assert.equal(r.code,200);assert.equal(r.body.approaches.length,4);assert.equal(providerCalls,before+2);
  }
  queuedReplies=[1,2].map(()=>JSON.stringify({answer:'A',approaches:[four()[0],four()[0],{...four()[0],name:'Renamed copy'}]}));
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Collapse duplicate method fixture',subject:'physics'}});
  assert.equal(r.code,502);
  queuedReplies=[short,short];
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Reject genuinely empty fixture',subject:'physics'}});
  assert.equal(r.code,502);assert.match(r.body.error,/four distinct complete approaches/);


  // ---- a long question answered in parts (the client asks for these) ----
  // The whole-answer request can outrun the budget; these parts are small and
  // each one is merged into the same answer by assets/js/solve-parts.js.
  queuedReplies = [JSON.stringify({ question_understood:'A long question', answer:'The settled answer',
    summary:'What it asks', check:'Substitute back', approaches:[four()[0]] })];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Long multi-part fixture question',subject:'physics',cls:12,part:'core'}});
  assert.equal(r.code,200); assert.equal(r.body.part,'core'); assert.equal(r.body.complete,false);
  assert.equal(r.body.approaches.length,1); assert.equal(r.body.result,'The settled answer');
  assert.match(lastPrompt,/PART 1 OF 4/); assert.match(lastPrompt,/exactly ONE approach/);
  const coreBudget = callBudgets[callBudgets.length-1];
  assert.equal(coreBudget.maxOutputTokens,4096, 'a part gets a smaller output budget');
  assert(coreBudget.deadline - Date.now() <= 42000 + 100, 'and a shorter deadline');
  queuedReplies = [JSON.stringify({ approaches:[four()[1]] })];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Long multi-part fixture question',subject:'physics',cls:12,
    part:'approach',index:2,taken:['First principles'],core:{answer:'The settled answer'}}});
  assert.equal(r.code,200); assert.equal(r.body.part,'approach'); assert.equal(r.body.index,2);
  assert.equal(r.body.approaches.length,1);
  assert.match(lastPrompt,/PART 2 OF 4/); assert.match(lastPrompt,/The settled answer/); assert.match(lastPrompt,/First principles/);
  assert.equal(callBudgets[callBudgets.length-1].maxOutputTokens,3072);
  // No four-approach requirement on a part, but an empty part is still a failure.
  queuedReplies = [JSON.stringify({ answer:'A', approaches:[] })];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Long empty fixture',subject:'physics',part:'core'}});
  assert.equal(r.code,502);
  // A part without an answer field cannot be the core part.
  queuedReplies = [JSON.stringify({ approaches:[four()[0]] })];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Long answerless fixture',subject:'physics',part:'core'}});
  assert.equal(r.code,502);
  queuedReplies = [];
  r = await invoke(readImage,{method:'POST',token:'valid',body:{}}); assert.equal(r.code,400);
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'a'.repeat(240),mime:'image/png'}});
  assert.equal(r.code,200); assert.equal(r.body.question,'Read a question from the photo');
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'a'.repeat(240),mime:'text/html'}});
  assert.equal(r.code,400);
  r = await invoke(readImage,{method:'POST',token:'valid',body:{data:'X'.repeat(4*1024*1024),mime:'image/png'}});
  assert.equal(r.code,400);
  const malformedCalls = providerCalls;
  const incompleteJSON = JSON.stringify({answer:'The partial structure is closed safely.',approaches:four()});
  const truncatedAfterNestedStep = incompleteJSON.slice(0,incompleteJSON.lastIndexOf('}]')+1);
  replyText = truncatedAfterNestedStep;
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Check safe nested JSON closure',subject:'accountancy',cls:12}});
  assert.equal(r.code,200,'a truncated nested JSON structure is repaired before shape validation');
  assert.equal(r.body.result,'The partial structure is closed safely.');
  assert.equal(r.body.approaches.length,4);
  assert.equal(providerCalls,malformedCalls+1,'safe structure repair does not need a second model call');

  const regenerationCalls = providerCalls;
  queuedReplies = ['not JSON',JSON.stringify({answer:'Regenerated answer',approaches:four()})];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Regenerate a malformed provider response',subject:'accountancy',cls:12}});
  assert.equal(r.code,200,'unrecoverable JSON triggers one bounded provider repair');
  assert.equal(r.body.result,'Regenerated answer');
  assert.equal(providerCalls,regenerationCalls+2);
  assert.match(lastPrompt,/REPAIR:.*PREVIOUS DRAFT/s);
  queuedReplies = [];

  replyText = 'not JSON';
  r = await invoke(solve,{method:'POST',token:'valid',body:JSON.stringify({question:'different test input',subject:'accountancy',cls:12})});
  assert.equal(r.code,502);
  const stream = Readable.from([Buffer.from('{"one":1}')]);
  assert.deepEqual(await lib.readBody(stream), {one:1});
  assert.deepEqual(await lib.readBody({body:Buffer.from('{"two":2}')}), {two:2});
  queuedReplies=[1,2].map(()=>JSON.stringify({answer:'Three useful approaches',approaches:four().slice(0,3)}));
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Accept a three-approach response under the new policy',subject:'physics'}});
  assert.equal(r.code,502);
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
  const singleLetterQuestion = 'अपने विद्यालय के प्रधानाचार्य को पत्र लिखकर पुस्तकालय में हिंदी की नई पुस्तकों और समाचार-पत्रों की व्यवस्था करने का अनुरोध कीजिए।';
  const oneDraft = 'सेवा में, प्रधानाचार्य महोदय, विद्यालय। विषय: नई पुस्तकें और समाचार-पत्र। महोदय, सविनय निवेदन है कि हमारे पुस्तकालय में हिंदी की नई पुस्तकों तथा समाचार-पत्रों की आवश्यकता है। इनसे विद्यार्थियों में पठन की रुचि बढ़ेगी और हमें भाषा तथा समसामयिक विषयों का ज्ञान मिलेगा। कृपया पुस्तकालय में इनकी नियमित व्यवस्था कराने की कृपा करें। धन्यवाद। भवदीय, एक विद्यार्थी।';
  queuedReplies = []; replyText = JSON.stringify({answer:'पुस्तकालय में नई पुस्तकों की व्यवस्था का अनुरोध',approaches:[{name:'औपचारिक पत्र',steps:[{t:oneDraft}]}]});
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:singleLetterQuestion,subject:'maths',cls:10}});
  assert.equal(r.code,502, 'one draft must not be presented as four');
  queuedReplies = [JSON.stringify({answer:'Four complete formal letter options', approaches:four()})];
  replyText = JSON.stringify({answer:'I urge the council to retain our public park.', approaches:four().map((a,i)=>({name:a.name, steps:[{t:letter.replace('Preserve our public park', ['Save our green space','Protect shared recreation','Choose sustainable parking','Keep the park accessible'][i])}]}))});
  const beforeLetter = providerCalls;
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:letterQuestion,subject:'social'}});
  assert.equal(r.code,200); assert.equal(providerCalls,beforeLetter+2,'outline must trigger repair');
  assert.equal(callBudgets.at(-1),callBudgets.at(-2),'repair uses the exact same budget and signal');
  assert(callBudgets.at(-1).signal.aborted,'successful request releases provider resources');
  assert(callBudgets.at(-1).deadline > Date.now() && callBudgets.at(-1).deadline <= Date.now()+140000);
  assert.equal(r.body.approaches.length,4);
  assert(r.body.approaches.every(a=>a.format==='prose' && a.steps[0].t.includes('Yours faithfully')));
  assert.match(lastPrompt,/actual finished prose/);
  queuedReplies=[1,2].map(()=>JSON.stringify({answer:'Four letter options',approaches:four()}));
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:letterQuestion,subject:'english'}});
  assert.equal(r.code,502,'persistent outlines must not be shown as completed letters');
  const callsBeforeExact = providerCalls;
  replyText = JSON.stringify({answer:'Mock answer',approaches:four()}); queuedReplies=[];
  r = await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all positive integers n for which n²+10n+2026 is a perfect square.',subject:'maths'}});
  assert.equal(r.code,200); assert.equal(r.body.source,'ai'); assert.equal(providerCalls,callsBeforeExact+1);
  const ambiguousCalls=providerCalls;
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all positive integers 7 for which n2 + 10m + 2026 is a perfect square.',subject:'maths'}});
  assert.equal(r.code,422);assert.equal(r.body.code,'question_needs_confirmation');assert.equal(providerCalls,ambiguousCalls);
  const contextCalls=providerCalls;
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'पाठ पढ़ते-पढ़ते आपको भी अपने माता-पिता का लाड-प्यार याद आ रहा होगा। अपनी इन भावनाओं को डायरी में अंकित कीजिए',subject:'hindi'}});
  assert.equal(r.code,422);assert.equal(r.body.code,'language_context_required');assert.equal(providerCalls,contextCalls);
  replyText=JSON.stringify({answer:'रामागच्छति।',approaches:['प्रत्यक्षरूपम्','नियमः','उदाहरणम्','परीक्षणम्'].map((name,i)=>({name,steps:[{t:'अत्र सवर्णदीर्घसन्धिः भवति। अकारस्य आकारस्य च मेलने आकारः भवति। '+['रामः आगच्छति।','सन्धिरूपं रामागच्छति इति।','एतत् सन्धेः उदाहरणम् अस्ति।','अत्र वर्णयोः संयोगः परीक्ष्यते।'][i]}]}))});
  queuedReplies=[JSON.stringify({answer:'यह उत्तर है।',approaches:four().map(a=>({...a,steps:[{t:'यह उत्तर है। इसमें क्या होता है और कैसे होता है।'}]}))})];
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'सन्धिं कुरुत — राम + आगच्छति',subject:'sanskrit',lang:'hi',chapterTitle:'सन्धिः'}});
  assert.equal(r.code,200);assert.equal(r.body.subjectRouting.language,'sa');assert.match(lastPrompt,/grammatical Sanskrit/);assert.match(lastPrompt,/Provided chapter context.*सन्धिः/);
  const radicalCalls = providerCalls;
  replyText=JSON.stringify({answer:'Mock result',approaches:four()}); queuedReplies=[];
  r=await invoke(solve,{method:'POST',token:'valid',body:{question:'Find all integers x for which √(x+6) + √(19-x) is an integer.',subject:'social'}});
  assert.equal(r.code,200); assert.equal(r.body.source,'ai'); assert.equal(providerCalls,radicalCalls+1);
  await assert.rejects(lib.readBody({body:'{bad json'}));
  console.log('Mocked serverless auth, paid-AI allowlist, fresh responses, response shape, image reading and body parsing: PASS');
}
main().catch(err => { console.error(err); process.exitCode=1; });
