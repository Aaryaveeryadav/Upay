'use strict';
const assert=require('node:assert/strict'),a=require('../../assets/js/mock-assessment');
const numeric={source:{m:1,keyVerified:true,ans:'1/2'}};
assert.equal(a.assess(numeric,'0.5').awarded,1);
assert.equal(a.assess(numeric,'2').awarded,0);
assert.equal(a.assess(numeric,'').status,'unattempted');
const mcq={source:{m:1,keyVerified:true,ans:'B',opts:[{en:'red'},{en:'blue'},{en:'green'},{en:'black'}]}};
for(const answer of ['B','(b)','blue'])assert.equal(a.assess(mcq,answer).awarded,1);
assert.equal(a.assess(mcq,'red').status,'incorrect');
for(const keyVerified of [undefined,false])assert.equal(a.assess({source:{m:1,ans:'2',keyVerified}},'2').awarded,null);
assert.equal(a.assess({source:{m:3,keyVerified:true,ans:'2'}},'2').awarded,null,'workings require rubric review');
assert.equal(a.assess({source:{m:1,keyVerified:true,ans:'Photosynthesis'}},'Plants make food').awarded,null,'semantic grading cannot be exact word matching');
for(const m of [null,undefined,0,6,'bad',true,[1]])assert.equal(a.marks({source:{m}}),null);
assert.equal(a.assess({source:{m:1,keyVerified:true,ans:'B',opts:mcq.source.opts,qualityStatus:'withheld'}},'B').awarded,null);
for(const flags of [{keyVerified:false},{textReview:'awaiting-source-review'},{qualityReasons:['damaged']},
  {raw:{keyVerified:false}},{raw:{paperCode:'fixture'}},{kind:1,opts:[]},{ans:'unmatched choice'}]){
 const it={source:{...mcq.source,...flags}};
 assert.equal(a.key(it),'','do not send an untrusted reference to the AI checker');
 assert.equal(a.assess(it,'B').status,'pending');
}
assert.equal(a.key({source:{m:1,keyVerified:true,ans:'1',raw:{kind:1,opts:['red','green','blue','black']}}}),'','an omitted raw choice list is not a written numeric key');
const signed={source:{m:1,keyVerified:true,ans:'−40',opts:['−44','−36','4·0','−40']}};
assert.equal(a.assess(signed,'D').awarded,1);assert.equal(a.assess(signed,'4·0').awarded,0);
const items=[numeric,mcq,{source:{m:3,keyVerified:false,ans:'fake key'}},{source:{}}];
const s=a.score({items,answers:{0:'0.5',1:'red',2:'essay'}});
assert.deepEqual(s,{earned:1,gradable:2,knownTotal:5,unknownMarks:1,pendingMarks:3,pending:2,attempted:3,total:4,selfEarned:0,selfPossible:0,selfReviewed:0});
console.log('PASS verified-key objective/numeric marks, fractions, no invented theory scores, unknown marks and pending totals');

assert.equal(a.assess(numeric,'x = 1/2').awarded,null,'unparsed workings need review, not automatic failure');
assert.equal(a.score({items,answers:{},reviewMarks:{2:2.5,3:1}}).selfEarned,2.5);
assert.equal(a.score({items,answers:{},reviewMarks:{2:4}}).selfReviewed,0,'cannot exceed supplied marks');

assert.equal(a.assess({source:{m:1,keyVerified:true,ans:'22'}},'2²').awarded,null,'never flatten exponents into decimal digits');

const unknownMarkMCQ={source:{...mcq.source,m:null}};
assert.equal(a.assess(unknownMarkMCQ,'A').status,'incorrect');assert.equal(a.assess(unknownMarkMCQ,'A').awarded,null,'checked correctness does not invent missing marks');

// Numeric equivalents may match; explicit units, dimensions, operators and
// exact integer/decimal values may not be erased to obtain a match.
for (const [given,want] of [['5°','5 cm'],['5 cm²','5 cm'],['5 m','5 cm'],['5 cm','5'],
  ['0.0000001','0'],['9007199254740993','9007199254740992'],['1 2','12'],['1/0','0'],['x²','x2'],['5 mW','5 MW']])
  assert.equal(a.samePracticeAnswer(given,want),false,`${given} is not ${want}`);
for (const [given,want] of [['5','5 cm'],['50 mm','5 cm'],['0.0005 m^2','5 cm²'],['.4','2/5'],['-0.25','−1/4'],['x²-6x+8','x² − 6x + 8']])
  assert.equal(a.samePracticeAnswer(given,want),true,`${given} matches ${want}`);
assert.equal(a.assess({source:{m:1,ans:'9007199254740992',keyVerified:true}},'9007199254740993').awarded,0);
assert.equal(a.key({source:{...mcq.source,opts:['red','blue','blue','green']}}),'','reject damaged choices even with a stored key');
