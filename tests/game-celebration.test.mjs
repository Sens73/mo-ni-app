import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createCelebrationPlayer} from '../game-celebration.js';
import {createNumberWhirlGame} from '../number-whirl-view.js';
import {normalizeWhirl,whirlScoreKey} from '../number-whirl.js';
import {createMentalMathGame} from '../mental-math-view.js';
class Events {
  events=new Map();
  addEventListener(name,fn){const list=this.events.get(name)||new Set();list.add(fn);this.events.set(name,list);}
  removeEventListener(name,fn){this.events.get(name)?.delete(fn);}
  emit(name){for(const fn of this.events.get(name)||[])fn();}
}
class Movie extends Events {
  paused=true;ended=false;hidden=false;isConnected=true;currentTime=5;plays=0;reject=false;
  play(){this.plays++;if(this.reject)return Promise.reject(new Error('Blocked'));this.paused=false;this.emit('play');return Promise.resolve();}
  pause(){this.paused=true;this.emit('pause');}
}
function harness(reduced=false){
 const document=new Events();document.visibilityState='visible';const preference=new Events();preference.matches=reduced;
 const movie=new Movie(),poster={hidden:true},root={querySelector:selector=>selector.includes('poster')?poster:movie};
 const player=createCelebrationPlayer({scope:{document,matchMedia:()=>preference}});
 return {player,document,preference,movie,poster,root};
}
const h=harness();h.player.mount(h.root);assert.equal(h.movie.plays,0,'Hidden result never starts');
h.player.setVisible(true);await Promise.resolve();assert.equal(h.movie.paused,false);assert.equal(h.movie.muted,true);
h.document.visibilityState='hidden';h.document.emit('visibilitychange');assert.equal(h.movie.paused,true);
h.document.visibilityState='visible';h.document.emit('visibilitychange');await Promise.resolve();assert.equal(h.movie.paused,false,'Resume the same film after backgrounding');
h.player.setVisible(false);assert.equal(h.movie.paused,true);h.player.setVisible(true);await Promise.resolve();
h.movie.pause();h.document.visibilityState='hidden';h.document.emit('visibilitychange');h.document.visibilityState='visible';h.document.emit('visibilitychange');assert.equal(h.movie.paused,true,'User pause stays paused');
h.player.replay();await Promise.resolve();assert.equal(h.movie.currentTime,0);assert.equal(h.movie.paused,false);
h.movie.paused=true;h.movie.emit('ended');const played=h.movie.plays;h.player.setVisible(false);h.player.setVisible(true);assert.equal(h.movie.plays,played,'The film does not loop');
h.player.mount(null);assert.equal(h.movie.paused,true);assert.equal(h.movie.events.get('play').size,0);
h.player.destroy();assert.equal(h.document.events.get('visibilitychange').size,0);
const r=harness(true);r.player.setVisible(true);r.player.mount(r.root);assert.equal(r.movie.plays,0);assert.equal(r.movie.hidden,true);assert.equal(r.poster.hidden,false);
r.player.replay();await Promise.resolve();assert.equal(r.movie.paused,false);assert.equal(r.movie.hidden,false);assert.equal(r.poster.hidden,true,'Manual replay is available with reduced motion');
r.player.destroy();
const b=harness();b.movie.reject=true;b.player.setVisible(true);b.player.mount(b.root);await Promise.resolve();await Promise.resolve();assert.equal(b.movie.hidden,false,'Native controls stay available after autoplay rejection');b.movie.reject=false;b.player.replay();await Promise.resolve();assert.equal(b.movie.paused,false);b.player.destroy();
// Drive real result views through a round, including a correct answer or completed group for the
// positive branch. Puzzle replays still use their independent solved condition.
function roundView(kind,positive) {
 const values={range:20,content:'numbers',direction:'ascending',count:3,movement:'float',speed:'slow',mode:'practice'};
 const inputs={querySelector:selector=>selector.includes('[name=')?{value:values[selector.match(/name="([^"]+)"/)[1]]}:{hidden:false},querySelectorAll:()=>[{value:'add'}]};
 const handlers=new Map(),root={isConnected:true,innerHTML:'',contains:()=>true,addEventListener:(name,fn)=>handlers.set(name,fn),querySelector:selector=>selector===`[data-${kind}-form]`?inputs:null};
 const document=new Events();document.visibilityState='visible';
 const scope={document,performance:{now:()=>0},setInterval:()=>1,clearInterval(){},matchMedia:()=>({matches:false})};
 const game=(kind==='whirl'?createNumberWhirlGame:createMentalMathGame)({scope,read:(key,f)=>key.endsWith('settings')?{...values,operations:['add']}:f,write(){}});
 game.setVisible(true);game.mount(root);
 handlers.get('submit')({target:{matches:()=>true},preventDefault(){}});
 const click=dataset=>handlers.get('click')({target:{closest:selector=>selector.includes('answer')&&!Object.hasOwn(dataset,'mathAnswer')||selector.includes('stone')&&!Object.hasOwn(dataset,'whirlStone')?null:{dataset}}});
 if(positive) {
  if(kind==='whirl') {
   const stones=[...root.innerHTML.matchAll(/data-whirl-stone="(\d+)" data-wave-id="(\d+)" aria-label="(\d+)"/g)].sort((a,b)=>Number(a[3])-Number(b[3]));
   assert.equal(stones.length,3);
   for(const stone of positive==='partial'?stones.slice(0,1):stones)click({whirlStone:stone[1],waveId:stone[2]});
  } else {
   const expression=root.innerHTML.match(/data-math-question>(\d+) ([+−×:]) (\d+) =/),a=Number(expression[1]),b=Number(expression[3]);
   const result=expression[2]==='+'?a+b:expression[2]==='−'?a-b:expression[2]==='×'?a*b:a/b;
   click({mathAnswer:String(result),questionId:root.innerHTML.match(/data-question-id="(\d+)"/)[1]});
  }
 }
 click({[kind==='whirl'?'whirlAction':'mathAction']:'finish'});
 if(positive&&positive!=='partial'){assert.match(root.innerHTML,/<video /);assert.match(root.innerHTML,/action="replay"/);assert.match(root.innerHTML,kind==='whirl'?/5 Goldtaler gesammelt!/:/1 Goldtaler gesammelt!/);}
 else {assert.doesNotMatch(root.innerHTML,/<video |action="replay"/);assert.match(root.innerHTML,/0 Goldtaler<\/h2>/);assert.match(root.innerHTML,/ohne Zeitlimit/i);}
 game.mount(null);
}
for(const kind of ['whirl','math'])for(const positive of [false,true])roundView(kind,positive);
roundView('whirl','partial');
// Completing a real timed round stores the new reward record without replacing old scores.
{
 const settings=normalizeWhirl({mode:'timed',movement:'float',operations:['add']}), oldKey=JSON.stringify(settings),newKey=whirlScoreKey(settings);
 const stored={[oldKey]:24},writes=[],handlers=new Map();let time=0,interval;
 const form={querySelector:selector=>selector.includes('[name=')?{value:settings[selector.match(/name="([^"]+)"/)[1]]}:{hidden:false},querySelectorAll:()=>[{value:'add'}]};
 const root={isConnected:true,innerHTML:'',contains:()=>true,addEventListener:(name,fn)=>handlers.set(name,fn),querySelector:selector=>selector==='[data-whirl-form]'?form:null};
 const document=new Events();document.visibilityState='visible';
 const scope={document,performance:{now:()=>time},setInterval:fn=>(interval=fn,1),clearInterval(){},matchMedia:()=>({matches:false})};
 const game=createNumberWhirlGame({scope,read:(key,f)=>key==='whirl-settings'?settings:key==='whirl-scores'?stored:f,write:(key,value)=>writes.push({key,value})});
 game.setVisible(true);game.mount(root);
 assert.match(root.innerHTML,/Dein Rekord mit dieser Auswahl: <strong>0 Goldtaler/,'A legacy score is retained but not presented as comparable');
 handlers.get('submit')({target:{matches:()=>true},preventDefault(){}});
 const stones=[...root.innerHTML.matchAll(/data-whirl-stone="(\d+)" data-wave-id="(\d+)" aria-label="(\d+)"/g)].sort((a,b)=>Number(a[3])-Number(b[3]));
 for(const stone of stones)handlers.get('click')({target:{closest:selector=>selector.includes('stone')?{dataset:{whirlStone:stone[1],waveId:stone[2]}}:null}});
 assert.match(root.innerHTML,/Gruppe geschafft! \+5 Goldtaler/);
 time=60000;interval();
 const scores=writes.find(x=>x.key==='whirl-scores').value;
 assert.deepEqual(scores,{[oldKey]:24,[newKey]:5});
 assert.deepEqual(stored,{[oldKey]:24},'Reading and updating records does not mutate the prior stored object');
 assert.match(root.innerHTML,/Bestleistung mit dieser Auswahl: 5 Goldtaler/);
 interval();assert.equal(writes.filter(x=>x.key==='whirl-scores').length,1,'A completed round is recorded once');
 game.mount(null);
}
// Actual offline service-worker fetch handler: full movie, range, suffix and 416.
const worker=await readFile(new URL('../service-worker.js',import.meta.url),'utf8'),handlers=new Map();
const bytes=Uint8Array.from({length:100},(_,i)=>i),url='https://www.mo-ni.de/app/assets/celebration/mo-ni-jubelfilm.mp4';
runInNewContext(worker,{self:{location:{origin:'https://www.mo-ni.de'},addEventListener:(n,fn)=>handlers.set(n,fn)},caches:{match:async()=>new Response(bytes,{headers:{'Content-Type':'video/mp4','Content-Length':'100'}})},fetch:()=>{throw Error('Offline');},URL,Response,Headers,Request});
for(const [range,status,expected] of [[null,200,[0,99]],['bytes=0-1',206,[0,1]],['bytes=20-',206,[20,99]],['bytes=-7',206,[93,99]],['bytes=95-120',206,[95,99]],['bytes=100-',416,null],['bytes=30-20',416,null],['bytes=-0',416,null]]) {
 let promise;handlers.get('fetch')({request:new Request(url,{headers:range?{Range:range}:{}}),respondWith:value=>promise=value});
 const response=await promise;assert.equal(response.status,status,range);
 const body=new Uint8Array(await response.arrayBuffer());if(expected){assert.deepEqual([...body],[...bytes.slice(expected[0],expected[1]+1)]);if(status===206)assert.equal(response.headers.get('Content-Range'),`bytes ${expected[0]}-${expected[1]}/100`);}else assert.equal(body.length,0);
}
console.log('Film playback, hide/resume, native pause, replay, no loop, reduced motion, rejected autoplay zero/positive round results and offline byte ranges verified.');
