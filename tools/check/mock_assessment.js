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
for(const m of [null,undefined,0,6,'bad'])assert.equal(a.marks({source:{m}}),null);
assert.equal(a.assess({source:{m:1,keyVerified:true,ans:'B',opts:mcq.source.opts,qualityStatus:'withheld'}},'B').awarded,null);
const items=[numeric,mcq,{source:{m:3,keyVerified:false,ans:'fake key'}},{source:{}}];
const s=a.score({items,answers:{0:'0.5',1:'red',2:'essay'}});
assert.deepEqual(s,{earned:1,gradable:2,knownTotal:5,unknownMarks:1,pendingMarks:3,pending:2,attempted:3,total:4,selfEarned:0,selfPossible:0,selfReviewed:0});
console.log('PASS verified-key objective/numeric marks, fractions, no invented theory scores, unknown marks and pending totals');

assert.equal(a.assess(numeric,'x = 1/2').awarded,null,'unparsed workings need review, not automatic failure');
assert.equal(a.score({items,answers:{},reviewMarks:{2:2.5,3:1}}).selfEarned,2.5);
assert.equal(a.score({items,answers:{},reviewMarks:{2:4}}).selfReviewed,0,'cannot exceed supplied marks');

assert.equal(a.assess({source:{m:1,keyVerified:true,ans:'22'}},'2²').awarded,null,'never flatten exponents into decimal digits');
