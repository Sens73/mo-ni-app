import assert from 'node:assert/strict';
import {parseCardCount, validCardCount, cardPage, hasLegalMove, createDivisorRound, isPrime} from '../divisor-game.js';
import {createDivisorGame} from '../divisor-game-view.js';

assert.equal(parseCardCount('40'), 40);
assert.equal(parseCardCount('100'), 100);
for (const value of ['101','150','10000','3000000000',String(Number.MAX_SAFE_INTEGER)]) assert.equal(parseCardCount('custom',value), Number(value));
for (const value of ['','20','40','60','80','100','100.5','-101','1e3','Infinity','NaN','101abc','9007199254740992']) assert.equal(parseCardCount('custom',value), null);
for (const value of [20,41,60,80,99,100.5,Infinity]) assert.equal(validCardCount(value), false);
assert.throws(() => createDivisorRound({count:80}));

const game = createDivisorRound();
const initial = game.snapshot();
assert.equal(game.play(3).ok, false);
assert.deepEqual(game.snapshot(), initial, 'An odd opening must not consume a card or turn');
assert.equal(game.play(6).ok, true);
assert.equal(game.snapshot().nextPlayer, 1);
const afterSix = game.snapshot();
for (const value of [6,42,5,0,-1,2.5]) { assert.equal(game.play(value).ok,false); assert.deepEqual(game.snapshot(),afterSix); }
assert.equal(game.play(36).ok,true);
assert.equal(game.play(12).ok,true);
const restored = createDivisorRound(game.snapshot());
assert.deepEqual(restored.snapshot(),game.snapshot());
const copy = restored.snapshot(); copy.moves.push(99); assert.equal(restored.snapshot().moves.length,3);
assert.throws(() => createDivisorRound({count:40,moves:[6,6]}));
assert.throws(() => createDivisorRound({count:40,moves:[6,5]}));
assert.throws(() => createDivisorRound({count:40,moves:[3]}));

// A published forced line, checked move by move; choosing 1 is not itself a loss.
const ending = createDivisorRound({starter:1});
for (const value of [38,19,1]) { assert.equal(ending.play(value).ok,true); assert.equal(ending.snapshot().finished,false); }
assert.equal(ending.play(37).ok,true);
assert.equal(ending.snapshot().finished,true); assert.equal(ending.snapshot().winner,0);
const terminal = ending.snapshot(); assert.equal(ending.play(2).ok,false); assert.deepEqual(ending.snapshot(),terminal);
assert.deepEqual(createDivisorRound(terminal).snapshot(),terminal);
const longEnding = createDivisorRound();
for (const value of [22,11,33,3,21,7,35,5,25,1,37]) assert.equal(longEnding.play(value).ok,true);
assert.equal(longEnding.snapshot().finished,true); assert.equal(longEnding.snapshot().winner,0);

// Independent exhaustive search over all subsets of small boards. These are
// arbitrary positions, including positions a particular opening may not reach.
let checked = 0;
for (let n=1; n<=11; n++) for (let mask=1; mask < 2**n; mask++) {
  const used=Array.from({length:n},(_,i)=>i+1).filter((_,i)=>mask & 2**i);
  for (const last of used) {
    const moves=[...used.filter(value=>value!==last),last];
    const oracle=Array.from({length:n},(_,i)=>i+1).some(value=>!used.includes(value)&&(value%last===0||last%value===0));
    assert.equal(hasLegalMove(n,moves),oracle,`${n}: ${moves.join(',')}`); checked++;
  }
}
let seed=7489;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<5000;i++) {
  const n=40+Math.floor(random()*200),last=1+Math.floor(random()*n);
  const used=Array.from({length:n},(_,j)=>j+1).filter(v=>v!==last&&random()<.8);used.push(last);
  const oracle=Array.from({length:n},(_,j)=>j+1).some(v=>!used.includes(v)&&(v%last===0||last%v===0));
  assert.equal(hasLegalMove(n,used),oracle); checked++;
}
for(let n=1;n<=3000;n++) {
  const oracle=n>=2&&!Array.from({length:Math.max(0,Math.floor(Math.sqrt(n))-1)},(_,i)=>i+2).some(d=>n%d===0);
  assert.equal(isPrime(n),oracle,`Primality ${n}`);
}
for(const composite of [341,561,1105,1729,3215031751,341550071728321]) assert.equal(isPrime(composite),false);
assert.equal(isPrime(2147483647),true);
assert.equal(hasLegalMove(3000000000,[2,1,2147483647]),false);
const composite=3*2147483647;
assert.equal(hasLegalMove(composite,[1,composite]),true);
assert.equal(hasLegalMove(composite,[1,3,2147483647,composite]),false);

assert.deepEqual(cardPage(40).cards,Array.from({length:40},(_,i)=>i+1));
assert.equal(cardPage(10000,9900).cards.at(-1),10000);
assert.deepEqual(cardPage(101,100).cards,[101]);
assert.equal(cardPage(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER).cards.at(-1),Number.MAX_SAFE_INTEGER);
assert.equal(cardPage(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER).cards.length,91);

// A saved game lives in its own key and survives visibility/selection changes.
const writes=[]; let busy=false;
const view=createDivisorGame({read:()=>({round:game.snapshot(),screen:'playing'}),write:(key,value)=>writes.push([key,value]),onActivityChange:value=>{busy=value;}});
const listeners={};
const root={isConnected:true,innerHTML:'',querySelector(){return null;},addEventListener(name,handler){listeners[name]=handler;}};
view.setVisible(true); view.mount(root); assert.equal(busy,true);
assert.ok(root.innerHTML.includes('data-divisor-card="40"'));
assert.ok(!/data-divisor-(?:hint|suggest)|Passende Karten zeigen/.test(root.innerHTML));
view.setVisible(false); assert.equal(busy,false); view.setVisible(true); assert.equal(busy,true);
view.showSetup(); assert.equal(busy,false); assert.ok(root.innerHTML.includes('Partie mit 40 Karten fortsetzen'));
assert.ok(writes.every(([key])=>key==='divisor-game'));
assert.deepEqual(writes.at(-1)[1].round.moves,[6,36,12]);

assert.doesNotMatch(root.innerHTML,/data-open-viewer|Spielkarten zum Ausdrucken|divisor-materials/,'Protected card sets are not offered');
assert.ok(root.innerHTML.indexOf('class="divisor-rules"') < root.innerHTML.indexOf('data-divisor-settings'),'Rules appear immediately after the introduction, before settings');
const returnedRoot={...root,innerHTML:''};
view.setVisible(false); view.mount(returnedRoot); view.setVisible(true);
assert.deepEqual(writes.at(-1)[1].round.moves,[6,36,12]);
view.mount(root);
console.log(`Teiler-Vielfache-Spiel: parameters, turns, illegal moves, restoration, wins, large counts and ${checked} independent end-state checks passed.`);


// Real controller pointer handlers: validate drops through the same round model.
function interactionFixture(moves=[]) {
  const handlers={},ghosts=[],classes=()=>({values:new Set(),add(value){this.values.add(value);},remove(value){this.values.delete(value);},toggle(value,on){on?this.add(value):this.remove(value);}});
  let state={round:{count:40,starter:0,moves},screen:'playing'},hit=null,captured=null;
  const pile={dataset:{divisorAction:'play'},classList:classes(),closest:selector=>['[data-divisor-stack]','[data-divisor-action]'].includes(selector)?pile:null};
  const panel={isConnected:true,innerHTML:'',ownerDocument:{elementFromPoint:()=>hit,body:{append(){}},createElement(){const ghost={style:{},setAttribute(){},remove(){this.removed=true;}};ghosts.push(ghost);return ghost;}},
    addEventListener:(name,handler)=>{handlers[name]=handler;},querySelector:selector=>selector==='[data-divisor-stack]'?pile:null,
    contains:element=>element===pile,setPointerCapture:id=>{captured=id;},hasPointerCapture:id=>captured===id,releasePointerCapture:()=>{captured=null;}};
  const controller=createDivisorGame({read:()=>state,write:(_key,value)=>{state=value;}});
  controller.setVisible(true);controller.mount(panel);
  const card=(value,{grip=false,disabled=false}={})=>{const el={dataset:{divisorCard:String(value)},disabled,classList:classes()};el.closest=selector=>selector==='[data-divisor-card]'?el:selector==='[data-divisor-grip]'&&grip?el:null;return el;};
  const point=(target,values={})=>({target,button:0,pointerId:1,pointerType:'mouse',clientX:20,clientY:200,preventDefault(){},...values});
  const drop=(value,target=pile)=>{handlers.pointerdown(point(card(value)));handlers.pointermove(point(panel,{clientX:70,clientY:80}));hit=target;handlers.pointerup(point(panel,{clientX:70,clientY:80}));};
  const click=target=>handlers.click({target,detail:0,preventDefault(){}});
  const playButton=pile;
  return {controller,handlers,panel,pile,card,point,drop,click,playButton,ghosts,get state(){return state;},get captured(){return captured;},hit(value){hit=value;}};
}
const input=interactionFixture();
assert.match(input.panel.innerHTML,/Noch keine Karte gelegt/);
assert.doesNotMatch(input.panel.innerHTML,/Deine Auswahl|>Karte legen<|divisor-move/,'The pile is the only place action; the former selection toolbar is gone');
input.click(input.card(6));
input.drop(3);
assert.deepEqual(input.state.round.moves,[],'An odd drop cannot start a game');
assert.equal(input.state.selected,6,'A rejected drop preserves the prior tap selection');
input.handlers.click({target:input.playButton,detail:1,preventDefault(){}});
assert.deepEqual(input.state.round.moves,[],'The compatibility click after a rejected drag cannot place the previous selection');
input.drop(6);assert.deepEqual(input.state.round.moves,[6]);
input.drop(5);assert.deepEqual(input.state.round.moves,[6],'An unrelated drop consumes no turn');
input.drop(12,null);assert.deepEqual(input.state.round.moves,[6],'Dropping outside the pile cancels the move');
input.drop(36);assert.deepEqual(input.state.round.moves,[6,36]);
assert.match(input.panel.innerHTML,/Zug 1: Spieler A, Karte 6/);
assert.match(input.panel.innerHTML,/Zug 2: Spieler B, Karte 36/);
assert.doesNotMatch(input.panel.innerHTML,/<details class="divisor-history"/,'History is visible without expanding it');
input.handlers.pointerdown(input.point(input.card(6,{disabled:true})));assert.equal(input.captured,null);
input.handlers.pointerdown(input.point(input.card(12)));input.handlers.pointermove(input.point(input.panel,{clientX:70,clientY:80}));
input.handlers.pointercancel();assert.equal(input.captured,null);assert.equal(input.ghosts.at(-1).removed,true);assert.deepEqual(input.state.round.moves,[6,36]);
input.handlers.pointerdown(input.point(input.card(12)));input.handlers.pointermove(input.point(input.panel,{clientX:70,clientY:80}));
input.controller.setVisible(false);assert.equal(input.captured,null);assert.equal(input.ghosts.at(-1).removed,true);input.controller.setVisible(true);
input.handlers.pointerdown(input.point(input.card(12),{pointerType:'touch'}));
assert.equal(input.captured,null,'The card number surface allows normal touch scrolling');
input.handlers.pointerdown(input.point(input.card(12,{grip:true}),{pointerType:'touch'}));
input.handlers.pointermove(input.point(input.panel,{pointerType:'touch',clientX:70,clientY:80}));input.hit(input.pile);
input.handlers.pointerup(input.point(input.panel,{pointerType:'touch',clientX:70,clientY:80}));assert.deepEqual(input.state.round.moves,[6,36,12]);
input.handlers.pointerdown(input.point(input.card(4)));input.hit(null);input.handlers.pointerup(input.point(input.panel));
input.handlers.pointerdown(input.point(input.playButton));input.handlers.click({target:input.playButton,detail:1,preventDefault(){}});
assert.deepEqual(input.state.round.moves,[6,36,12,4],'A new fast pointer interaction is not suppressed by the previous drag or tap');
input.click(input.card(2));input.click(input.playButton);assert.deepEqual(input.state.round.moves,[6,36,12,4,2],'The keyboard alternative still places exactly one card');
assert.ok(input.ghosts.every(ghost=>ghost.removed),'No floating cards survive completion or cancellation');
const win=interactionFixture([38,19,1]);win.drop(37);assert.equal(win.state.round.moves.at(-1),37);
assert.match(win.panel.innerHTML,/Spieler B gewinnt!/);assert.match(win.panel.innerHTML,/Zug 4: Spieler B, Karte 37/);
console.log('Visible A/B timeline, mouse/touch-grip drops, invalid/outside/used-card drops, pointer cancellation, saved moves and keyboard alternative passed.');
