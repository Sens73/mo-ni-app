import assert from 'node:assert/strict';
import {maximumMatching,divisibilityGraph,exactMove,legalCards,chooseComputerMove} from '../divisor-computer.js';
import {createDivisorRound} from '../divisor-game.js';
import {createDivisorGame} from '../divisor-game-view.js';

// Independent subset recurrence, with no matching/graph theory assumptions.
function bruteMatching(graph,mask=(1<<graph.length)-1,memo=new Map()) {
  if(!mask)return 0;if(memo.has(mask))return memo.get(mask);
  const v=31-Math.clz32(mask&-mask),rest=mask&~(1<<v);
  let best=bruteMatching(graph,rest,memo);
  for(const u of graph[v])if(rest&(1<<u))best=Math.max(best,1+bruteMatching(graph,rest&~(1<<u),memo));
  memo.set(mask,best);return best;
}
let graphChecks=0;
for(let n=0;n<=6;n++) {
  const edges=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)edges.push([i,j]);
  for(let bits=0;bits<2**edges.length;bits++) {
    const graph=Array.from({length:n},()=>[]);edges.forEach(([i,j],k)=>{if(bits&(1<<k)){graph[i].push(j);graph[j].push(i);}});
    const match=maximumMatching(graph);
    for(let i=0;i<n;i++)if(match[i]!==-1){assert.ok(graph[i].includes(match[i]));assert.equal(match[match[i]],i);}
    assert.equal(match.filter(v=>v!==-1).length/2,bruteMatching(graph));graphChecks++;
  }
}
let randomSeed=7391;
const graphRandom=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/2**32;};
for(let trial=0;trial<200;trial++) {
  const n=7+trial%12,graph=Array.from({length:n},()=>[]),density=.1+(trial%7)/10;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(graphRandom()<density){graph[i].push(j);graph[j].push(i);}
  assert.equal(maximumMatching(graph).filter(v=>v!==-1).length/2,bruteMatching(graph));graphChecks++;
}
let positionChecks=0;
for(let n=2;n<=10;n++) {
  const memo=new Map();
  function win(mask,last) {
    const key=mask+':'+last;if(memo.has(key))return memo.get(key);
    const result=Array.from({length:n},(_,i)=>i+1).some(v=>!(mask&(1<<(v-1)))&&(v%last===0||last%v===0)&&!win(mask|(1<<(v-1)),v));memo.set(key,result);return result;
  }
  for(let mask=1;mask<2**n;mask++)for(let last=1;last<=n;last++)if(mask&(1<<(last-1))) {
    const used=Array.from({length:n},(_,i)=>i+1).filter(v=>mask&(1<<(v-1))), moves=[...used.filter(v=>v!==last),last];
    const result=exactMove({count:n,moves},()=>0),expected=win(mask,last);
    assert.equal(result.winning,expected,`${n}/${mask}/${last}`);
    if(result.value!==null){assert.ok(!(mask&(1<<(result.value-1))));assert.ok(last%result.value===0||result.value%last===0);if(expected)assert.equal(win(mask|(1<<(result.value-1)),result.value),false);}
    else assert.equal(legalCards({count:n,moves}).length,0);
    positionChecks++;
  }
  const opening=exactMove({count:n,moves:[]},()=>0);
  assert.equal(opening.winning,Array.from({length:Math.floor(n/2)},(_,i)=>2*i+2).some(v=>!win(1<<(v-1),v)));
  assert.equal(opening.value%2,0);
  if(opening.winning)assert.equal(win(1<<(opening.value-1),opening.value),false);
}
const seeded=(()=>{let seed=239;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};})();
for(const count of [40,100,150])for(const level of ['easy','medium','strong']) {
  const game=createDivisorRound({count,starter:1});
  while(!game.snapshot().finished) {
    const state=game.snapshot();const result=chooseComputerMove(state,level,seeded);
    assert.equal(game.play(result.value).ok,true,`${count}/${level}/${state.moves}`);
  }
  if(level==='strong')assert.equal(game.snapshot().winner,exactMove({count,moves:[]}).winning?1:0,'Perfect self-play agrees with the opening evaluation');
}
const forced={count:40,moves:[38,19,1]};
for(const level of ['medium','strong'])assert.ok([23,29,31,37].includes(chooseComputerMove(forced,level).value));
const choices=new Set(Array.from({length:50},()=>chooseComputerMove({count:40,moves:[6]},'easy',seeded).value));assert.ok(choices.size>=6,'Easy has genuine variation');
for(const count of [1001,1000000000,Number.MAX_SAFE_INTEGER]) {
  for(const moves of [[],[6],[2,1,2147483647].filter(v=>v<=count),[2,1,99991].filter(v=>v<=count)]) {
    for(const value of legalCards({count,moves},seeded))assert.ok(!moves.includes(value)&&value<=count&&(!moves.length?value%2===0:(value%moves.at(-1)===0||moves.at(-1)%value===0)));
  }
}
assert.equal(chooseComputerMove({count:40,moves:[38,19,1,37],finished:true},'strong').value,null);
console.log(`Maximum matching: ${graphChecks} independent graph checks; exact computer: ${positionChecks} exhaustive positions plus opening checks and complete 40/100/150-card games passed.`);

// Real view controller with a controllable worker and timer: cancellation,
// single turns, persistence and switching modes, including stale async results.
function fixture({moves=[6],starter=0,roundOptions={opponent:'computer',difficulty:'strong'},settings={opponent:'computer',difficulty:'strong'},screen='playing',pauseRandom=()=>.5}={}) {
  let state={settings,roundOptions,round:{count:40,starter,moves},screen};
  const handlers={},timers=new Map(),jobs=[],delays=[];let timerId=0;
  const panel={isConnected:true,innerHTML:'',querySelector:()=>null,addEventListener:(name,fn)=>{handlers[name]=fn;}};
  const controller=createDivisorGame({read:()=>structuredClone(state),write:(_,value)=>{state=structuredClone(value);},
    random:pauseRandom,schedule:(fn,delay)=>{delays.push(delay);timers.set(++timerId,fn);return timerId;},unschedule:id=>timers.delete(id),
    compute:(snapshot,difficulty)=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});const job={promise,snapshot,difficulty,resolve,reject,cancelled:false,cancel(){this.cancelled=true;}};jobs.push(job);return job;}});
  controller.setVisible(true);controller.mount(panel);
  const target=data=>({dataset:data,disabled:false,closest:selector=>selector==='[data-divisor-action]'&&data.divisorAction?target(data):selector==='[data-divisor-card]'&&data.divisorCard?target(data):null});
  const click=data=>handlers.click({target:target(data),detail:0,preventDefault(){}});
  async function begin(){const tasks=[...timers.values()];timers.clear();for(const task of tasks)task();await Promise.resolve();}
  async function settle(value){jobs.at(-1).resolve({value});await Promise.resolve();await Promise.resolve();}
  return {controller,panel,handlers,timers,jobs,delays,click,begin,settle,get state(){return state;}};
}
const f=fixture();assert.equal(f.timers.size,1);assert.match(f.panel.innerHTML,/MO überlegt/);
f.click({divisorCard:'36'});f.click({divisorAction:'play'});assert.deepEqual(f.state.round.moves,[6],'Human cannot move during computer turn');
f.controller.mount(f.panel);assert.equal(f.timers.size,1);await f.begin();assert.equal(f.jobs.length,1);assert.equal(f.jobs[0].difficulty,'strong');
f.controller.setVisible(false);assert.equal(f.jobs[0].cancelled,true);await f.settle(36);assert.deepEqual(f.state.round.moves,[6]);
f.controller.setVisible(true);await f.begin();await f.settle(36);assert.deepEqual(f.state.round.moves,[6,36]);assert.match(f.panel.innerHTML,/Du bist dran/);assert.match(f.panel.innerHTML,/Zug 2: MO, Karte 36/);
f.click({divisorCard:'12'});f.click({divisorAction:'play'});assert.deepEqual(f.state.round.moves,[6,36,12]);assert.equal(f.timers.size,1);
f.controller.showSetup();assert.equal(f.timers.size,0);f.handlers.change({target:{name:'opponent',value:'human'}});
f.click({divisorAction:'resume'});await f.begin();await f.settle(4);assert.deepEqual(f.state.round.moves,[6,36,12,4]);assert.equal(f.state.roundOptions.opponent,'computer','Changing future settings never changes the resumed round');
f.controller.showSetup();f.handlers.submit({target:{matches:s=>s==='[data-divisor-settings]'},preventDefault(){}});assert.equal(f.state.roundOptions.opponent,'human');assert.equal(f.timers.size,0);assert.match(f.panel.innerHTML,/Spieler A ist dran/);
const restored=fixture({moves:f.state.round.moves,roundOptions:f.state.roundOptions,settings:f.state.settings});assert.equal(restored.timers.size,0);
const error=fixture();await error.begin();error.jobs[0].reject(new Error('worker'));await Promise.resolve();await Promise.resolve();assert.match(error.panel.innerHTML,/Computerzug erneut versuchen/);error.click({divisorAction:'retry-computer'});await error.begin();await error.settle(36);assert.deepEqual(error.state.round.moves,[6,36]);
const terminal=fixture({moves:[38,19,1]});await terminal.begin();await terminal.settle(37);assert.match(terminal.panel.innerHTML,/MO gewinnt!/);assert.equal(terminal.timers.size,0);terminal.click({divisorAction:'again'});assert.equal(terminal.state.round.starter,1);assert.equal(terminal.timers.size,1);
const old=fixture({roundOptions:null,settings:{}});assert.equal(old.timers.size,0,'Legacy human games remain human games');
// Pause and actual calculation run concurrently; neither may commit on its own.
const pause=fixture();assert.equal(pause.jobs.length,1,'Calculation starts during the pause');assert.deepEqual(pause.delays,[1500]);
await pause.settle(36);assert.deepEqual(pause.state.round.moves,[6],'A finished calculation waits for the presentation pause');
await pause.begin();await Promise.resolve();assert.deepEqual(pause.state.round.moves,[6,36]);
const abandoned=fixture();await abandoned.settle(36);abandoned.controller.showSetup();await abandoned.begin();assert.deepEqual(abandoned.state.round.moves,[6],'Leaving after calculation also cancels the delayed placement');
for(const [sample,delay] of [[0,0],[.999999,3000]]) {const edge=fixture({pauseRandom:()=>sample});assert.deepEqual(edge.delays,[delay]);edge.controller.setVisible(false);}
const ni=fixture({roundOptions:{opponent:'computer',character:'ni',difficulty:'easy'}});assert.match(ni.panel.innerHTML,/Ni überlegt/);await ni.begin();await ni.settle(36);assert.match(ni.panel.innerHTML,/Zug 2: Ni, Karte 36/);
ni.controller.showSetup();ni.handlers.change({target:{name:'opponent',value:'mo'}});assert.equal(ni.state.settings.character,'mo');ni.click({divisorAction:'resume'});assert.equal(ni.state.roundOptions.character,'ni','A resumed round keeps its chosen figure');
ni.controller.showSetup();ni.handlers.submit({target:{matches:s=>s==='[data-divisor-settings]'},preventDefault(){}});assert.equal(ni.state.roundOptions.character,'mo');
const niRestored=fixture({roundOptions:{opponent:'computer',character:'ni',difficulty:'medium'},settings:{opponent:'computer',character:'ni',difficulty:'medium'},screen:'setup'});assert.match(niRestored.panel.innerHTML,/name="opponent" value="ni" checked/);assert.match(niRestored.panel.innerHTML,/Wie stark spielt Ni/);niRestored.handlers.change({target:{name:'difficulty',value:'strong'}});assert.equal(niRestored.state.settings.difficulty,'strong','Both figures allow all three strengths');
console.log('Computer controller: human input lock, one reply, stale cancellation, resume, retry, game end, alternating start two-player mode, MO/Ni persistence and concurrent random 0–3000 ms pauses passed.');
