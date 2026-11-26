import assert from 'node:assert/strict';
import { normalizeSettings, generateQuestion, createRound, scoreKey } from '../mental-math.js';
import { availableDestination } from '../audience.js';
import { canActivateAppUpdate } from '../app-updates.js';
let seed = 3413;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const calculate = q => ({ add: () => q.a + q.b, subtract: () => q.a - q.b, multiply: () => q.a * q.b, divide: () => q.a / q.b })[q.operation]();
for (const range of [20,100,1000]) for (const operation of ['add','subtract','multiply','divide']) {
  const signatures = new Set();
  for (let i=0;i<1000;i++) {
    const q=generateQuestion({range,operations:[operation]},random);
    assert.equal(q.operation,operation);
    assert.equal(q.result,calculate(q));
    for (const n of [q.a,q.b,q.result,...q.answers]) assert.ok(Number.isInteger(n) && n>=0 && n<=range, `${operation}, range ${range}: ${n}`);
    assert.equal(q.answers.length,3); assert.equal(new Set(q.answers).size,3);
    assert.equal(q.answers.filter(n=>n===q.result).length,1);
    if(operation==='divide') assert.ok(q.b>0 && q.a%q.b===0);
    signatures.add(q.signature);
  }
  assert.ok(signatures.size>15,`Enough variety for ${operation}/${range}`);
}
assert.deepEqual(normalizeSettings(null),{range:100,operations:['add','subtract'],mode:'timed'});
assert.deepEqual(normalizeSettings({range:5,operations:4}),normalizeSettings());
assert.equal(scoreKey({range:20,operations:['subtract','add']}),scoreKey({range:20,operations:['add','subtract']}));
assert.notEqual(scoreKey({range:20,operations:['add']}),scoreKey({range:100,operations:['add']}));
assert.notEqual(scoreKey({range:20,operations:['add']}),scoreKey({range:20,operations:['add'],mode:'practice'}));
const round=createRound({range:20,operations:['add']},{now:100,random});
let s=round.snapshot();
assert.equal(round.answer(s.question.result,s.question.id,1100),true);
assert.equal(round.answer(s.question.result,s.question.id,1101),false,'Double click does not award twice');
assert.equal(round.snapshot().coins,1);
assert.equal(round.tick(1700),false,'Feedback is visible long enough');
assert.equal(round.tick(1800),true);
assert.equal(round.answer(s.question.result,s.question.id,1801),false,'A late click on a replaced question is ignored');
s=round.snapshot(); const wrong=s.question.answers.find(n=>n!==s.question.result);
round.answer(wrong,s.question.id,2000);
assert.equal(round.snapshot().mistakes.length,1); assert.equal(round.snapshot().coins,1);
assert.equal(round.tick(2699),false,'Wrong-answer feedback is still visible before 700 ms');
assert.equal(round.tick(2700),true,'Wrong-answer feedback ends after the same 700 ms as correct-answer feedback');
round.tick(3700); round.pause(5100); const remaining=round.snapshot().remaining;
round.tick(100000); assert.equal(round.snapshot().remaining,remaining,'Paused time is not consumed');
assert.equal(round.answer(round.snapshot().question.result,round.snapshot().question.id,100000),false);
round.resume(100000);round.tick(100000+remaining-1);assert.equal(round.snapshot().phase,'playing');
assert.equal(round.answer(round.snapshot().question.result,round.snapshot().question.id,100000+remaining),false,'Answer at the deadline is rejected');
assert.equal(round.snapshot().phase,'done');assert.equal(round.snapshot().mistakes.length,1,'Unanswered final question is not a mistake');
const last=createRound({range:100,operations:['divide']},{random});
s=last.snapshot();last.answer(s.question.result,s.question.id,59999);
last.tick(60000);assert.equal(last.snapshot().phase,'feedback','The final solution remains visible');
last.tick(60700);assert.equal(last.snapshot().phase,'done');assert.equal(last.snapshot().coins,1);
const practice=createRound({mode:'practice'},{random});practice.tick(999999);assert.equal(practice.snapshot().phase,'playing');
practice.finish(1000000);assert.equal(practice.snapshot().phase,'done');
for(const mode of ['timed','practice']) for(const right of [true,false]) {
  const feedbackRound=createRound({mode},{random}); const q=feedbackRound.snapshot().question;
  const value=right?q.result:q.answers.find(n=>n!==q.result);
  assert.equal(feedbackRound.answer(value,q.id,100),true);
  assert.equal(feedbackRound.tick(799),false);
  assert.equal(feedbackRound.snapshot().phase,'feedback');
  assert.equal(feedbackRound.tick(800),true);
  assert.equal(feedbackRound.snapshot().phase,'playing');
  assert.equal(feedbackRound.snapshot().coins,right?1:0);
  const paused=createRound({mode},{random}); const pq=paused.snapshot().question;
  paused.answer(right?pq.result:pq.answers.find(n=>n!==pq.result),pq.id,100);
  paused.pause(300);paused.resume(10000);
  assert.equal(paused.tick(10499),false,'Pause preserves the remaining feedback duration');
  assert.equal(paused.tick(10500),true);
  if(mode==='timed') {
    const deadline=createRound({mode},{random}); const dq=deadline.snapshot().question;
    deadline.answer(right?dq.result:dq.answers.find(n=>n!==dq.result),dq.id,59999);
    deadline.tick(60698);assert.equal(deadline.snapshot().phase,'feedback');
    deadline.tick(60699);assert.equal(deadline.snapshot().phase,'done');
  }
}
console.log('Rechen-Rallye: correct and wrong feedback both last 700 ms, including practice, pause/resume and the final timed answer.');
assert.equal(availableDestination('34','games').view,'games');
assert.equal(availableDestination('56','games').view,'games');
assert.equal(availableDestination('713','games').view,'games');
assert.equal(canActivateAppUpdate({view:'games',gameActive:true},null),false);
assert.equal(canActivateAppUpdate({view:'home',gameActive:true},null),false,'A paused round is protected from app updates too');
assert.equal(canActivateAppUpdate({view:'games',gameActive:false},null),true);
console.log('Mental math: 12000 independent arithmetic checks, answer uniqueness, selected ranges/operations, deadline, double/stale clicks, feedback, pause, practice, score grouping and update safety verified.');
