const assert=require('node:assert/strict'),r=require('../../assets/js/task-routing'),fs=require('node:fs'),vm=require('node:vm');
const essay='“जल संरक्षण केवल सरकार की जिम्मेदारी नहीं, हर नागरिक का कर्तव्य है।” इस विषय पर लगभग 150–200 शब्दों में अपने विचार लिखिए। तर्क, उदाहरण और कम-से-कम दो व्यावहारिक उपाय शामिल कीजिए।';
assert.deepEqual(r.resolve(essay,'social'),{selected:'social',subject:'hindi',task:'writing',changed:true,reason:'Hindi composition/word-limit task',language:'hi'});
for(const [q,selected,expected] of [
 ['Write a formal letter to the editor arguing against replacing a park with a parking lot.','maths','english'],
 ['A 12 V battery is connected to a 4 Ω resistor in series with 6 Ω and 3 Ω resistors.','social','physics'],
 ['Describe how copper is purified by electrolytic refining.','maths','chemistry'],
 ['Explain how glucose is broken down in muscle cells without oxygen.','social','biology'],
 ['Why did different groups join the Civil Disobedience Movement?','maths','social'],
 ['Propose a water-management plan using rainwater harvesting and groundwater recharge.','hindi','social'],
 ['Using Belgium and Sri Lanka explain power sharing.','maths','social'],
 ['Evaluate income, risk and sustainability for the farmer.','maths','social'],
 ['Find all positive integers n for which n²+10n+2026 is a perfect square.','social','maths'],
 ['महत्तम समापवर्तक ज्ञात कीजिए।','social','maths'],
 ['प्रकाश संश्लेषण समझाइए।','social','biology'],
 ['संज्ञा की परिभाषा लिखिए।','social','hindi'],
 ['Explain an ambiguous topic','social','social']
])assert.equal(r.resolve(q,selected).subject,expected,q);
const UP={taskRouting:r,chapters:[]};const ctx=vm.createContext({UP,window:{UP},console});for(const n of ['core','arith','geo','route'])vm.runInContext(fs.readFileSync(`assets/js/solver-${n}.js`,'utf8'),ctx);
assert.equal(UP.answerQuestion(essay),null);
assert.equal(UP.solveHCF(essay,[150,200]),null);
assert.equal(UP.fallbackAnswer(essay,'hi',true).kind,'ai-waiting');
assert.equal(UP.solveHCF('जल संरक्षण के 150 और 200 उदाहरण',[150,200]),null,'Hindi words must not match LCM abbreviation');
assert.equal(UP.solveHCF('Find HCF and LCM of 150 and 200',[150,200]).result.en,'HCF = 50, LCM = 600');
console.log('PASS task hints for supplied subjects, script/content separation, writing word counts blocked at router and calculator, numeric HCF intact');
