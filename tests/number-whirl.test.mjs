import assert from 'node:assert/strict';
import {normalizeWhirl, generateWave, createWhirlRound, createStoneMotion, stonePositions, waveDuration, whirlScoreKey, whirlReward, fallingDeadline} from '../number-whirl.js';

assert.equal(normalizeWhirl(null).range,20);
assert.equal(normalizeWhirl({count:99,range:-1}).count,3);
let seed=1729;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;
for(const range of [20,100,1000])for(const content of ['numbers','calculations','mixed'])for(const op of ['add','subtract','multiply','divide']) {
  for(let i=0;i<200;i++) {
    const wave=generateWave({range,content,operations:[op],count:6},random);
    assert.equal(wave.length,6);
    for(const stone of wave) {
      assert.ok(Number.isInteger(stone.value)&&stone.value>=0&&stone.value<=range);
      const parts=stone.label.match(/^(\d+) ([+−×:]) (\d+)$/);
      if(parts) {
        const a=+parts[1],b=+parts[3],symbol=parts[2];
        assert.ok(a<=range&&b<=range);
        const expected=symbol==='+'?a+b:symbol==='−'?a-b:symbol==='×'?a*b:a/b;
        assert.equal(stone.value,expected);
        if(symbol===':'){assert.ok(b>0);assert.equal(a%b,0);}
      } else assert.equal(+stone.label,stone.value);
      checks++;
    }
  }
}
for(const direction of ['ascending','descending']) {
  const round=createWhirlRound({mode:'practice',direction,count:6,content:'mixed'}, {random});
  let t=0;
  for(let wave=0;wave<20;wave++) {
    const s=round.snapshot();
    const ordered=[...s.stones].sort((a,b)=>direction==='ascending'?a.value-b.value:b.value-a.value);
    for(const stone of ordered){assert.ok(round.answer(stone.id,s.waveId,t+=20));assert.equal(round.answer(stone.id,s.waveId,t),false,'Double click never awards twice');}
    assert.equal(round.snapshot().coins,(wave+1)*8);
    assert.equal(round.snapshot().completed,wave+1);
    round.tick(t+=1001);
    assert.equal(round.answer(ordered[0].id,s.waveId,t),false,'Stale wave rejected');
  }
}
const tied=createWhirlRound({mode:'practice',count:3},{random:()=>0});
assert.equal(tied.answer(2,1,0),true);assert.equal(tied.answer(0,1,1),true);assert.equal(tied.answer(1,1,2),true);assert.equal(tied.snapshot().coins,5);
const wrong=createWhirlRound({count:6},{random});
let s=wrong.snapshot();let sorted=[...s.stones].sort((a,b)=>a.value-b.value);
if(sorted.at(-1).value!==sorted[0].value) {
  wrong.answer(sorted.at(-1).id,s.waveId,1);assert.equal(wrong.snapshot().errors,1);assert.equal(wrong.snapshot().coins,0);
  assert.equal(wrong.answer(sorted.at(-1).id,s.waveId,2),false);assert.equal(wrong.snapshot().errors,1);
  wrong.answer(sorted[0].id,s.waveId,802);assert.equal(wrong.snapshot().coins,0);
}
const paused=createWhirlRound({movement:'fall'},{random});paused.tick(3000);paused.pause(4000);const before=paused.snapshot();paused.tick(500000);assert.deepEqual(paused.snapshot(),before);paused.resume(500000);paused.tick(501000);assert.equal(paused.snapshot().remaining,55000);assert.equal(paused.snapshot().elapsed,5000);
const escaped=createWhirlRound({movement:'fall',speed:'fast'},{random});escaped.tick(4500);assert.equal(escaped.snapshot().escaped,1);assert.equal(escaped.snapshot().phase,'feedback');assert.deepEqual(escaped.snapshot().feedback.order.map(x=>x.value),[...escaped.snapshot().stones].map(x=>x.value).sort((a,b)=>a-b));assert.equal(escaped.answer(0,1,4500),false);escaped.tick(7301);assert.equal(escaped.snapshot().waveId,2);
const deadline=createWhirlRound({}, {random});assert.equal(deadline.answer(0,1,60000),false);assert.equal(deadline.snapshot().phase,'done');assert.equal(deadline.snapshot().coins,0);
const practice=createWhirlRound({mode:'practice',movement:'float'},{random});practice.tick(1e6);assert.equal(practice.snapshot().phase,'playing');assert.equal(practice.snapshot().escaped,0);practice.finish(1e6);assert.equal(practice.snapshot().phase,'done');
assert.equal(waveDuration({movement:'float'}),24000);assert.equal(waveDuration({mode:'practice',movement:'float'}),Infinity);assert.notEqual(whirlScoreKey({count:3}),whirlScoreKey({count:4}));
for(const [speed,fall,float] of [['slow',15000,24000],['normal',9750,20000],['fast',4500,16000]]) {
  assert.equal(waveDuration({movement:'fall',speed}),fall);
  assert.equal(waveDuration({movement:'float',speed}),float);
  for(const [movement,duration] of [['fall',fall],['float',float]]) {
    assert.equal(waveDuration({movement,speed,mode:'practice'}),movement==='float'?Infinity:duration);
    const timed=createWhirlRound({movement,speed},{random});
    timed.tick(duration-1);assert.equal(timed.snapshot().phase,'playing');
    timed.tick(duration);assert.equal(timed.snapshot().escaped,1);assert.equal(timed.snapshot().phase,'feedback');
  }
}
// Requested five-stone fall times must be exact for both content allowances.
for(const [speed,numbers,calculations] of [['slow',20000,30000],['normal',13000,20000],['fast',6000,10000]]) {
 for(const content of ['numbers','calculations','mixed'])for(const mode of ['timed','practice']) {
  const duration=content==='numbers'?numbers:calculations;
  const settings={movement:'fall',speed,count:5,content,mode};
  assert.equal(waveDuration(settings),duration);
  assert.equal(fallingDeadline(settings,332),duration);
  assert.equal(whirlReward(settings,duration/4-1).base,5);
  assert.equal(whirlReward(settings,duration/4).base,4);
 }
}
// Rewards depend on active group time, using the selected thinking-time allowance.
for(const movement of ['fall','float'])for(const speed of ['slow','normal','fast'])for(const count of [3,4,5,6])for(const content of ['numbers','mixed','calculations']) {
  const settings={movement,speed,count,content}, duration=waveDuration(settings);
  for(let tier=0;tier<count;tier++) {
    const elapsed=duration*tier/(count-1);
    assert.deepEqual(whirlReward(settings,elapsed),{base:count-tier,bonus:2,total:count+2-tier});
    assert.deepEqual(whirlReward(settings,elapsed,1),{base:count-tier,bonus:0,total:count-tier});
    assert.deepEqual(whirlReward({...settings,mode:'practice'},elapsed),whirlReward(settings,elapsed));
  }
  assert.equal(whirlReward(settings,duration-1).base,2);
  assert.equal(whirlReward(settings,duration*100).base,1,'Slow practice retains one group coin');
  assert.equal(whirlReward(settings,-100).base,count);
}
assert.notEqual(whirlScoreKey({}),JSON.stringify(normalizeWhirl({})),'Old and new scoring records are not compared');
assert.notEqual(whirlScoreKey({}),`group-time-v1:${JSON.stringify(normalizeWhirl({}))}`,'Previous time-tier records stay stored and separate');
assert.notEqual(whirlScoreKey({}),`group-time-v2:${JSON.stringify(normalizeWhirl({}))}`,'Earlier rain tempos are stored but not compared');
assert.equal(whirlScoreKey({movement:'float'}),`group-time-v2:${JSON.stringify(normalizeWhirl({movement:'float'}))}`,'Unchanged floating tempos retain comparable records');
function fixedRandom() {let i=0;return ()=>[.1,.3,.7][i++%3];}
function solve(round,firstTime,step=1) {
  const state=round.snapshot(), ordered=[...state.stones].sort((a,b)=>state.settings.direction==='ascending'?a.value-b.value:b.value-a.value);
  ordered.forEach((stone,i)=>assert.ok(round.answer(stone.id,state.waveId,firstTime+i*step)));
  return round.snapshot();
}
const flawless=createWhirlRound({},{random:fixedRandom()});
assert.equal(solve(flawless,100).coins,5);
assert.equal(flawless.snapshot().feedback.bonus,2);
assert.equal(flawless.answer(2,1,105),false);assert.equal(flawless.snapshot().coins,5);
const groupMistake=createWhirlRound({},{random:fixedRandom()});
assert.ok(groupMistake.answer(2,1,100));assert.equal(groupMistake.snapshot().groupErrors,1);
assert.equal(groupMistake.answer(0,1,101),false,'Wrong feedback blocks rapid retry');
assert.equal(solve(groupMistake,901).coins,3,'One wrong click removes the entire group bonus');
assert.deepEqual(groupMistake.snapshot().feedback,{kind:'complete',base:3,bonus:0,total:3,order:undefined});
groupMistake.tick(1904);assert.equal(groupMistake.snapshot().groupErrors,0);
assert.equal(solve(groupMistake,1905).coins,8,'The next clean group earns its own bonus again');
const multipleMistakes=createWhirlRound({},{random:fixedRandom()});
multipleMistakes.answer(2,1,0);multipleMistakes.answer(2,1,801);
assert.equal(solve(multipleMistakes,1602).coins,3);assert.equal(multipleMistakes.snapshot().errors,2);
const slower=createWhirlRound({},{random:fixedRandom()});
assert.equal(solve(slower,9000).coins,4,'A slower clean group earns two plus two');
const slowWrong=createWhirlRound({},{random:fixedRandom()});slowWrong.answer(2,1,0);
assert.equal(solve(slowWrong,14000).coins,2,'Slow completion after a mistake earns two without bonus');
const partial=createWhirlRound({},{random:fixedRandom()});partial.answer(0,1,0);partial.finish(100);
assert.equal(partial.snapshot().coins,0,'Unfinished groups award no coins');
const missed=createWhirlRound({},{random:fixedRandom()});missed.answer(0,1,0);missed.tick(15000);
assert.equal(missed.snapshot().coins,0,'Escaped groups award no coins');
missed.tick(17801);assert.equal(solve(missed,17802).coins,5,'A missed group does not remove the next bonus');
const rewardedPause=createWhirlRound({},{random:fixedRandom()});rewardedPause.pause(100);
rewardedPause.resume(100000);assert.equal(solve(rewardedPause,100001).coins,5,'Pause does not reduce reward');
const verySlowPractice=createWhirlRound({mode:'practice',movement:'float'},{random:fixedRandom()});
assert.equal(solve(verySlowPractice,1e6).coins,3,'Practice has no expiry and retains one plus flawless bonus');
const lateFinish=createWhirlRound({},{random:fixedRandom()});lateFinish.answer(0,1,59997);
assert.equal(lateFinish.snapshot().coins,0,'Overall deadline does not award an incomplete group');
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} != ${expected}`);
const initialSlow=createStoneMotion({speed:'slow'},302,332).snapshot();
for(const [speed,multiplier] of [['normal',1/.65],['fast',1.5/.65]]) {
  const positions=createStoneMotion({speed},302,332).snapshot();
  for(let i=0;i<positions.length;i++) {near(positions[i].vx,initialSlow[i].vx*multiplier,'Horizontal speed');near(positions[i].vy,initialSlow[i].vy*multiplier,'Vertical speed');}
}
// Previous revision's full floating speed: all new steps are strictly calmer.
const previousBase=Math.max(24,(332/2-56-24)*Math.PI*.73/4.5);
for(const [speed,oldScale] of [['slow',1],['normal',2],['fast',4]]) {
 const first=createStoneMotion({speed},302,332).snapshot()[0];
 assert.ok(Math.hypot(first.vx,first.vy)<previousBase*oldScale);
}
for(const movement of ['fall','float'])for(const speed of ['slow','normal','fast'])for(const count of [3,4,5,6]) {
 const numbers=waveDuration({movement,speed,count,content:'numbers'}),mixed=waveDuration({movement,speed,count,content:'mixed'});
 assert.ok(mixed>numbers,'Calculations get more thinking time');
 if(count>3)assert.ok(numbers>waveDuration({movement,speed,count:count-1}),'More targets get more time');
 const deadline=waveDuration({movement,speed,count,content:'mixed'}),timed=createWhirlRound({movement,speed,count,content:'mixed'},{random});
 timed.tick(deadline-1);assert.equal(timed.snapshot().escaped,0);
 timed.tick(deadline);assert.equal(timed.snapshot().escaped,1);assert.equal(timed.snapshot().phase,'feedback');
}
assert.equal(waveDuration({movement:'float',speed:'fast',count:5,content:'mixed'}),32000);
const body=(x,y,vx,vy)=>({x,y,vx,vy,width:20,height:20});
const headOn=createStoneMotion({},200,100,{stones:[body(20,20,30,0),body(80,20,-30,0)]});
headOn.advance(1000);let collision=headOn.snapshot();
near(collision[0].x,30,'Head-on position');near(collision[1].x,70,'Head-on position');
assert.deepEqual(collision.map(x=>x.vx),[-30,30],'Head-on stones reflect instead of passing through');
const vertical=createStoneMotion({},100,200,{stones:[body(20,20,0,30),body(20,80,0,-30)]});
vertical.advance(1000);assert.deepEqual(vertical.snapshot().map(x=>x.vy),[-30,30]);
const glancing=createStoneMotion({},200,100,{stones:[body(20,20,30,7),body(80,25,-30,-3)]});
glancing.advance(1000);assert.deepEqual(glancing.snapshot().map(x=>[x.vx,x.vy]),[[-30,7],[30,-3]],'Glancing collision preserves motion along the contact edge');
const parallel=createStoneMotion({},200,200,{stones:[body(20,20,0,30),body(40,60,0,-30)]});
parallel.advance(1000);assert.deepEqual(parallel.snapshot().map(x=>x.vy),[30,-30],'Adjacent lanes do not create a false collision');
const corner=createStoneMotion({},100,100,{stones:[body(80,80,20,20)]});
corner.advance(1000);assert.deepEqual(corner.snapshot().map(x=>[x.x,x.y,x.vx,x.vy]),[[60,60,-20,-20]]);
const touching=createStoneMotion({},200,100,{stones:[body(0,20,-20,0),body(20,20,-10,0),body(40,20,-30,0)]});
touching.advance(1000);assert.deepEqual(touching.snapshot().map(x=>[x.x,x.vx]),[[10,10],[40,20],[70,30]],'Simultaneous wall/contact chain resolves without overlap');
const collected=createStoneMotion({},200,100,{stones:[body(20,20,30,0),body(80,20,-30,0)]});
collected.setActive([1]);collected.advance(1700);
near(collected.snapshot()[1].x,29,'Collected stone is no invisible obstacle');assert.equal(collected.snapshot()[1].vx,-30);
const energy=states=>states.reduce((total,b)=>total+b.vx*b.vx+b.vy*b.vy,0);
for(const count of [3,4,5,6]) {
  const coarse=createStoneMotion({count,speed:'fast'},244,212),fine=createStoneMotion({count,speed:'fast'},244,212);
  const initialEnergy=energy(coarse.snapshot());coarse.advance(12000);
  for(let t=40;t<=12000;t+=40)fine.advance(t);
  const a=coarse.snapshot(),b=fine.snapshot();near(energy(a),initialEnergy,'Elastic collisions conserve total kinetic energy');
  for(let i=0;i<count;i++)for(const field of ['x','y','vx','vy'])near(a[i][field],b[i][field],`Long frame matches short frames: ${count}/${field}`);
  const pausedState=fine.snapshot();fine.advance(12000);assert.deepEqual(fine.snapshot(),pausedState,'An unchanged game clock leaves motion paused');
}
let layouts=0;
for(const width of [244,302,580,1000])for(const height of [212,252,332])for(const count of [3,4,5,6])for(const speed of ['slow','normal','fast'])for(const movement of ['fall','float'])for(const mode of ['timed','practice']) {
  const motion=movement==='float'?createStoneMotion({count,speed},width,height):null;
  for(let elapsed=0;elapsed<=60000;elapsed+=317) {
    const positions=motion?motion.advance(elapsed):stonePositions({count,movement,mode,speed},elapsed,width,height);
    for(let i=0;i<positions.length;i++) {
      const a=positions[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=width+1e-8&&a.y+a.height<=height+1e-8);
      for(let j=i+1;j<positions.length;j++){const b=positions[j];assert.ok(a.x+a.width<=b.x+1e-7||b.x+b.width<=a.x+1e-7||a.y+a.height<=b.y+1e-7||b.y+b.height<=a.y+1e-7,'Targets must not overlap');}
    }
    layouts++;
  }
}
console.log(`Zahlenwirbel: ${checks} independent value checks, ${layouts} bounded/non-overlapping layouts at all three speeds; head-on/glancing/corner/chain reflections, no invisible collected obstacle, kinetic energy and frame independence; time-dependent group rewards, error-free-only bonus, tier boundaries, renewed group eligibility and scoring record separation; sorting, ties, deadlines, stale/double clicks, escape, pause and practice verified.`);

// Visible falling contact and model expiry share exactly the same selected speed and geometry.
for(const speed of ['slow','normal','fast'])for(const count of [3,4,5,6])for(const mode of ['timed','practice'])for(const height of [212,252,332]) {
 const settings={speed,count,mode,movement:'fall'},duration=waveDuration(settings);
 assert.equal(fallingDeadline(settings,height),duration);
 let previous=stonePositions(settings,0,302,height);
 for(let fraction=1;fraction<=4;fraction++){
  const time=duration*fraction/4,next=stonePositions(settings,time,302,height);
  for(let i=0;i<count;i++)assert.ok(next[i].y>=previous[i].y,'Rain cannot rise again in either round mode');
  previous=next;
 }
 near(Math.max(...previous.map(p=>p.y+p.height)),height,'The first stone touches the marked floor exactly at expiry');
 assert.deepEqual(stonePositions(settings,duration*4,302,height),previous,'Expired falling groups stay at contact without reversing');
 const round=createWhirlRound(settings,{random});round.setPlayfieldHeight(height);round.tick(duration-1);assert.equal(round.snapshot().escaped,0);
 round.tick(duration);assert.equal(round.snapshot().phase,'feedback');assert.equal(round.snapshot().escaped,1);assert.equal(round.snapshot().coins,0);
 assert.equal(round.answer(0,1,duration),false,'A click at floor contact cannot rescue or reward an escaped group');
}
// A collected lowest stone is invisible and cannot expire the still visible group.
for(const speed of ['slow','normal','fast']) {
 let index=0;const settings={count:5,speed,movement:'fall',mode:'practice'},round=createWhirlRound(settings,{random:()=>[.2,.4,.6,.8,0][index++%5]});
 round.setPlayfieldHeight(332);assert.ok(round.answer(4,1,0));
 const original=waveDuration(settings),remaining=[0,1,2,3],deadline=fallingDeadline(settings,332,remaining);
 assert.ok(deadline>original);round.tick(original);assert.equal(round.snapshot().phase,'playing');assert.equal(whirlReward(settings,original).base,1);
 const positions=stonePositions(settings,deadline,302,332,remaining);near(Math.max(...remaining.map(i=>positions[i].y+positions[i].height)),332,'First remaining stone determines physical contact');
 round.tick(deadline-1);assert.equal(round.snapshot().escaped,0);round.tick(deadline);assert.equal(round.snapshot().escaped,1);assert.equal(round.snapshot().coins,0);
}
for(const speed of ['slow','normal','fast']) {
 const settings={count:5,movement:'fall',speed},duration=waveDuration(settings);
 assert.equal(whirlReward(settings,0).base,5);
 for(let tier=1;tier<=4;tier++){const boundary=duration*tier/4;assert.equal(whirlReward(settings,boundary-1).base,6-tier);assert.equal(whirlReward(settings,boundary).base,5-tier);}
}
console.log('Rain: monotone downward motion, exact first-visible-stone floor contact in both round modes, no invisible collected deadline, count-based rewards with four equal quarters for five stones at all speeds, and isolated previous records verified.');
