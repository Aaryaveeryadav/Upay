const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const UP={};vm.runInNewContext(fs.readFileSync('assets/js/figures.js','utf8'),{UP,window:{UP}});
const f=UP.figures;
for(const topology of ['parallel','series']){
 const spec=f.circuitForQuestion({caption:'Wrong old caption',resistors:[{value:999},{value:999}]},`Two resistors of 2 Ω and 6 Ω are connected in ${topology}.`);
 const svg=f.generic(spec);
 assert.equal((svg.match(/class="circuit-resistor"/g)||[]).length,2);
 assert(svg.includes('R₁ = 2 Ω')&&svg.includes('R₂ = 6 Ω'));
 assert(!svg.includes('999'));
 assert.equal(spec.topology,topology);
}
assert.equal(f.circuitForQuestion({},'Two resistors of 2 and 6 ohms in parallel.').resistors[0].value,2);
assert.equal(f.circuitForQuestion({},'Two resistors of 2 kΩ and 6 kΩ in parallel.').resistors[0].value,2000);
const symbolic=f.generic(f.circuitForQuestion({},'Two resistors in parallel.'));
assert(symbolic.includes('R₁')&&symbolic.includes('R₂')&&!symbolic.includes(' Ω'));
assert.equal(f.generic({type:'circuit',caption:'two resistors in parallel'}),'','caption alone must not become a default circuit');
assert.equal(f.circuitForQuestion({},'Three resistors in parallel.'),null);
assert.equal(f.generic({type:'apparatus',parts:[],caption:'Copper refining'}),'');
assert.equal(f.generic({type:'apparatus',parts:[{kind:'unknown'}],caption:'Not a diagram'}),'');
const copper=f.generic({type:'copper-refining'});
for(const text of ['Impure Cu anode (+)','Pure Cu cathode (−)','Acidified CuSO₄(aq)','Anode mud','Soluble impurities'])assert(copper.includes(text));
console.log('PASS true two-resistor topologies, values from question only, symbolic labels, unsupported/empty omission, labelled copper cell');
