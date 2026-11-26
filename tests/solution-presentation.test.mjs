import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sundayEpisodes} from '../puzzles/sunday-levels.js';
import {createSundayPuzzleTypes} from '../puzzles/sunday-types.js';
import {createPuzzleRegistry} from '../puzzles/registry.js';
import {createPuzzleProgress} from '../puzzles/progress.js';
import {createPuzzleGame} from '../puzzles/puzzle-view.js';
import {numberLogicTypes} from '../puzzles/number-logic-view.js';
import {sumdokuType} from '../puzzles/sumdoku-view.js';
import {numberPathGeometry,solutionDuration,PATH_COLOR} from '../puzzles/solution-presentation.js';
const sunday=JSON.parse(await readFile(new URL('../data/sunday.json',import.meta.url))),publications={confirmed:sundayEpisodes.map(e=>e.videoId)};
const types=createSundayPuzzleTypes(sunday,publications,new Date('2026-10-19T08:00:00Z'));
for(const level of sundayEpisodes[1].levels){
 const route=numberPathGeometry(level,{values:level.solution});
 assert.deepEqual(route.order.map(i=>level.solution[i]),Array.from({length:level.fields.length},(_,i)=>i+1));
 assert.deepEqual(route.points[0],[(level.fields[level.solution.indexOf(1)].x+.5)*100,(level.fields[level.solution.indexOf(1)].y+.5)*100]);
 assert.equal(route.duration,(level.fields.length-1)*350);
 assert.equal(solutionDuration(level,{values:level.solution})-route.duration,3000);
 assert.ok(route.width>25&&route.width<32,'Source 5.2pt stroke proportion follows the original cell sizes');
 const wrong=[...level.solution];[wrong[0],wrong[1]]=[wrong[1],wrong[0]];
 assert.equal(numberPathGeometry(level,{values:wrong}),null,'An invalid route never gets a success path');
 assert.equal(numberPathGeometry(level,{values:level.solution.map((v,i)=>i?v:null)}),null);
}
assert.equal(PATH_COLOR,'#D6D6DE');
function harness(typeId,index=0,{solvedUi=false,missing=false,empty=false,reduceMotion=false}={}){
 const type=types.find(t=>t.id===typeId),level=type.levels[index];
 const finalCell=level.kind!=='poly'?level.solution.findIndex((_,i)=>!Object.hasOwn(level.givens,i)):-1;
 const progress=createPuzzleProgress(createPuzzleRegistry(types));progress.select(typeId,level.id);
 for(let i=0;i<level.solution.length;i++)if(!empty&&level.kind!=='poly'&&(!missing||i!==finalCell))progress.change({kind:'value',cell:i,value:level.solution[i]});
 if(!empty&&level.kind==='poly')for(let i=0;i<level.solution.length;i++){const placement=level.solution[i];progress.change({kind:'choose',value:i});while(progress.current().board.turn!==placement.turn)progress.change({kind:'turn'});if(progress.current().board.flip!==placement.flip)progress.change({kind:'flip'});progress.change({kind:'place',cell:placement.anchor});}
 if(solvedUi)progress.finish();
 const stored={'puzzle-progress':progress.snapshot(),'puzzle-ui':{screen:solvedUi?'solved':'playing',typeId,selected:Math.max(0,finalCell),reward:solvedUi?level.reward:0}};
 let time=0,jobs=[],handlers={};
 const root={isConnected:true,innerHTML:'',addEventListener(name,fn){handlers[name]=fn;},contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[]};
 const game=createPuzzleGame({types,read:(key,f)=>stored[key]??f,write:(key,v)=>stored[key]=v,reduceMotion:()=>reduceMotion,now:()=>time,schedule:(fn,delay)=>{const job={fn,due:time+delay};jobs.push(job);return job;},cancel:job=>job.cancelled=true});
 game.setVisible(true);game.mount(root);
 return {game,root,stored,level,click:dataset=>handlers.click({target:{closest:()=>({dataset})}}),input(cell,text){handlers.input({target:{dataset:{puzzleCell:String(cell)},value:text,maxLength:level.domains?String(Math.max(...level.domains[cell])).length:1,closest:()=>null,matches:q=>q==='[data-puzzle-cell-input]'}});},key(cell,key,value=''){let prevented=false;handlers.keydown({key,target:{value,maxLength:level.domains?String(Math.max(...level.domains[cell])).length:1,matches:q=>q==='[data-puzzle-cell-input]'},preventDefault:()=>prevented=true});return prevented;},focus(cell){handlers.focusin({target:{dataset:{puzzleCell:String(cell)},matches:q=>q==='[data-puzzle-cell-input]',select(){}}});},advance(ms){const end=time+ms;while(true){const job=jobs.filter(j=>!j.cancelled&&j.due<=end).sort((a,b)=>a.due-b.due)[0];if(!job)break;time=job.due;job.cancelled=true;job.fn();}time=end;},jobs:()=>jobs};
}
for(const id of ['sumdoku','zahlenpfade','zahlenkreuze','differenzpyramiden','polyominos']){
 const h=harness(id);h.click({puzzleAction:'check'});
 assert.equal(h.stored['puzzle-ui'].screen,'solved');assert.ok(h.game.active);assert.equal(h.game.updateTypes(types),false);
 assert.equal(h.game.progress.totals(id).coins,h.level.reward);
 const solvedBoard=JSON.stringify(h.game.progress.current().board);
 h.click({puzzleNumber:'1'});assert.equal(JSON.stringify(h.game.progress.current().board),solvedBoard,'Inputs are frozen after success');
 const duration=solutionDuration(h.level,h.game.progress.current().board);
 h.advance(duration-1);assert.equal(h.stored['puzzle-ui'].screen,'solved','Complete board stays visible through the final millisecond');
 h.advance(1);assert.equal(h.stored['puzzle-ui'].screen,'result');
 assert.equal(h.game.progress.finish().reward,0);
 h.click({puzzleAction:'review'});assert.equal(h.stored['puzzle-ui'].screen,'playing');
 if(id==='zahlenpfade'){assert.match(h.root.innerHTML,/solved-number-path/);assert.ok(!h.root.innerHTML.includes('class="drawing"'),'Review shows the complete route without another animation');}
}
const automatic=harness('zahlenpfade',0,{missing:true});automatic.click({puzzleNumber:String(automatic.level.solution[automatic.stored['puzzle-ui'].selected])});assert.equal(automatic.stored['puzzle-ui'].screen,'solved','The final correct entry starts the path without an extra check click');automatic.game.showCatalog();
// Completion phases pause in resource views, survive remount, and cancel stale callbacks.
const paused=harness('zahlenpfade');paused.click({puzzleAction:'check'});paused.advance(700);paused.game.setVisible(false);paused.advance(10000);assert.equal(paused.stored['puzzle-ui'].screen,'solved');assert.equal(paused.stored['puzzle-ui'].solutionElapsed,700);
paused.game.setVisible(true);paused.game.mount(paused.root);paused.advance(solutionDuration(paused.level,paused.game.progress.current().board)-701);assert.equal(paused.stored['puzzle-ui'].screen,'solved');paused.advance(1);assert.equal(paused.stored['puzzle-ui'].screen,'result');
const cancelled=harness('sumdoku');cancelled.click({puzzleAction:'check'});const stale=cancelled.jobs().at(-1).fn;cancelled.game.showCatalog();stale();assert.equal(cancelled.stored['puzzle-ui'].screen,'types');assert.equal(cancelled.game.progress.totals('sumdoku').coins,cancelled.level.reward);
const reduced=harness('zahlenpfade',0,{reduceMotion:true});reduced.click({puzzleAction:'check'});reduced.advance(2999);assert.equal(reduced.stored['puzzle-ui'].screen,'solved');reduced.advance(1);assert.equal(reduced.stored['puzzle-ui'].screen,'result','Reduced motion still gets three seconds to view the full solution');
const restored=harness('zahlenpfade',0,{solvedUi:true});assert.equal(restored.stored['puzzle-ui'].screen,'solved');restored.advance(solutionDuration(restored.level,restored.game.progress.current().board));assert.equal(restored.stored['puzzle-ui'].screen,'result');assert.equal(restored.game.progress.finish().reward,0);
console.log('All five source paths: order, continuity, colour/width and 350ms steps; 3s holds, frozen boards, one reward, pause/remount/restore and cancelled stale callbacks verified.');

// Play through the actual visible inputs: no manual check or hint toolbar is required.
for(const id of ['sumdoku','zahlenpfade','zahlenkreuze','differenzpyramiden','polyominos']){
 const h=harness(id,0,{empty:true});
 assert.ok(!h.root.innerHTML.includes('puzzle-tools'));
 assert.ok(!h.root.innerHTML.includes('puzzle-rules'));
 assert.ok(!h.root.innerHTML.includes('puzzle-play-meta'));
 assert.ok(!h.root.innerHTML.includes('Sonntagsrätsel #'));
 assert.ok(!h.root.innerHTML.includes('puzzle-notice'),'No idle instruction repeats the controls');
 if(id==='polyominos'){
  assert.ok(!h.root.innerHTML.includes('puzzle-input-tools'));
  for(let i=0;i<h.level.solution.length;i++){
   const p=h.level.solution[i];h.click({puzzleCustom:'choose',puzzleValue:String(i)});
   for(let turn=0;turn<p.turn;turn++)h.click({puzzleCustom:'rotate'});
   if(p.flip)h.click({puzzleCustom:'flip'});
   h.click({puzzleCell:String(p.anchor)});
  }
 }else if(id==='differenzpyramiden'){
  assert.ok(!h.root.innerHTML.includes('data-puzzle-mode='));
  assert.ok(!h.root.innerHTML.includes('data-puzzle-cell-input'));
  for(let i=0;i<h.level.solution.length;i++)if(!Object.hasOwn(h.level.givens,i))h.game.progress.change({kind:'value',cell:i,value:h.level.solution[i]});
  h.click({puzzleAction:'check'});
 }else{
  const free=h.level.solution.map((_,i)=>i).filter(i=>!Object.hasOwn(h.level.givens,i));
  const first=free[0];h.click({puzzleCell:String(first)});h.click({puzzleMode:'note'});
  h.input(first,String(h.level.solution[first]));
  assert.deepEqual(h.game.progress.current().board.notes[first],[h.level.solution[first]]);
  h.focus(first);assert.ok(h.key(first,'Backspace'));assert.deepEqual(h.game.progress.current().board.notes[first],[]);
  h.click({puzzleMode:'value'});
  for(const i of free)h.input(i,String(h.level.solution[i]));h.advance(600);
 }
 assert.equal(h.stored['puzzle-ui'].screen,'solved',id+': final correct visible input starts success automatically');
 assert.equal(h.game.progress.totals(id).coins,h.level.reward);
}
const wrong=harness('sumdoku',0,{empty:true});
for(let i=0;i<wrong.level.solution.length;i++)if(!Object.hasOwn(wrong.level.givens,i)){wrong.click({puzzleCell:String(i)});wrong.click({puzzleNumber:'1'});}
assert.equal(wrong.stored['puzzle-ui'].screen,'playing');
assert.match(wrong.root.innerHTML,/has-conflict/,'Full but incorrect grids report their rule conflicts automatically');
assert.equal(wrong.game.progress.totals().coins,0);
// Reloading or reopening a complete incorrect grid must retain visible feedback
// even though transient notices and conflicts are not stored with the board.
const wrongSaved=structuredClone(wrong.stored),wrongBoard=structuredClone(wrong.game.progress.current().board);
let reloadHandler;
const reloadRoot={isConnected:true,innerHTML:'',contains:()=>true,addEventListener(name,fn){if(name==='click')reloadHandler=fn;},querySelector:()=>({focus(){}})};
const wrongReloaded=createPuzzleGame({types,read:(key,f)=>wrongSaved[key]??f,write:(key,v)=>wrongSaved[key]=v});
const reloadClick=dataset=>reloadHandler({target:{closest:()=>({dataset})}});
wrongReloaded.setVisible(true);wrongReloaded.mount(reloadRoot);
const expectedConflicts=wrongReloaded.progress.current().type.model.inspect(wrong.level,wrongBoard).conflicts;
assert.match(reloadRoot.innerHTML,/has-conflict/,'Reload immediately shows the saved full-grid error');
assert.equal((reloadRoot.innerHTML.match(/class="sumdoku-alert"/g)||[]).length,expectedConflicts.length,'Reload marks every actual conflicting field');
assert.deepEqual(wrongReloaded.progress.current().board,wrongBoard,'Rendering error feedback does not change saved entries');
assert.equal(wrongReloaded.progress.totals().coins,0);
reloadClick({puzzleAction:'levels'});reloadClick({puzzleLevel:wrong.level.id});
assert.match(reloadRoot.innerHTML,/has-conflict/,'Reopening the same puzzle retains the full-grid error');
const firstEditable=wrong.level.solution.findIndex((_,i)=>!Object.hasOwn(wrong.level.givens,i));
reloadClick({puzzleCell:String(firstEditable)});reloadClick({puzzleAction:'erase'});
assert.doesNotMatch(reloadRoot.innerHTML,/puzzle-notice|sumdoku-alert/,'An incomplete grid has no automatic whole-grid error feedback');
assert.equal(wrongReloaded.progress.totals().coins,0);
console.log('Compact puzzle inputs: notes/erase, all five automatic completions, incorrect-full-grid feedback after entry/reload/reopen, and one-time rewards verified.');

// Native input events cover both physical and mobile keyboards without a custom number pad.
for(let index=0;index<types.find(t=>t.id==='sumdoku').levels.length;index++){
 const h=harness('sumdoku',index,{empty:true}),free=h.level.solution.map((_,i)=>i).filter(i=>!Object.hasOwn(h.level.givens,i)),cell=free[0];
 assert.ok(h.root.innerHTML.includes('inputmode="numeric"'));assert.ok(!h.root.innerHTML.includes('data-puzzle-number'));
 const markup=h.root.innerHTML;assert.ok(markup.indexOf('<h2')<markup.indexOf('sumdoku-board'));assert.ok(markup.indexOf('sumdoku-board')<markup.indexOf('puzzle-modes'));assert.ok(markup.indexOf('puzzle-mode-help')<markup.indexOf('Aufgabenblatt öffnen'));assert.ok(!markup.includes('data-puzzle-action="erase"'));
 h.focus(cell);assert.equal(h.stored['puzzle-ui'].selected,cell);
 h.input(cell,'1');h.input(cell,'2');assert.equal(h.game.progress.current().board.values[cell],2,'Native entry replaces an existing digit');
 h.input(cell,'9');h.input(cell,'abc');assert.equal(h.game.progress.current().board.values[cell],2,'Invalid keyboard and paste values cannot corrupt the board');
 h.input(cell,'');assert.equal(h.game.progress.current().board.values[cell],0);
 h.click({puzzleMode:'note'});h.input(cell,'1');h.input(cell,'2');assert.deepEqual(h.game.progress.current().board.notes[cell],[1,2]);
 h.input(cell,'1');assert.deepEqual(h.game.progress.current().board.notes[cell],[2],'Repeated candidate toggles it off');
 assert.ok(h.key(cell,'Backspace'));assert.deepEqual(h.game.progress.current().board.notes[cell],[]);
 assert.equal(h.key(cell,'3'),false,'Digits use the native input event, including mobile keyboards without useful key codes');
 const given=Object.keys(h.level.givens)[0];if(given!==undefined){h.input(+given,'2');assert.equal(h.game.progress.current().board.values[+given],h.level.givens[given]);assert.match(h.root.innerHTML,/readonly/);}
 h.focus(cell);h.key(cell,'ArrowRight');assert.equal(h.stored['puzzle-ui'].selected,Math.floor(cell/h.level.size)*h.level.size+Math.min(h.level.size-1,cell%h.level.size+1));
 h.click({puzzleMode:'value'});for(const i of free)h.input(i,String(h.level.solution[i]));
 assert.equal(h.stored['puzzle-ui'].screen,'solved');assert.equal(h.game.progress.totals('sumdoku').coins,h.level.reward);assert.equal((h.root.innerHTML.match(/ disabled/g)||[]).length,h.level.solution.length);
 h.input(cell,'1');assert.equal(h.game.progress.current().board.values[cell],h.level.solution[cell],'Completed input events are ignored');
}
console.log('All five Sumdokus: native numeric inputs, layout order, overwrite, candidates, erasure, fixed clues, navigation, invalid input and automatic completion verified.');

// Saved generated puzzles remain compatible; their black clues cannot be edited.
{
 const level=sumdokuType.levels.find(l=>Object.keys(l.givens).length),cell=+Object.keys(level.givens)[0];
 const progress=createPuzzleProgress(createPuzzleRegistry([sumdokuType]));progress.select('sumdoku',level.id);
 const stored={'puzzle-progress':progress.snapshot(),'puzzle-ui':{screen:'playing',typeId:'sumdoku',selected:cell}},handlers={};
 const root={isConnected:true,innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn,contains:()=>true,querySelector:()=>({focus(){}})};
 const game=createPuzzleGame({types:[sumdokuType],read:(key,f)=>stored[key]??f,write:(key,v)=>stored[key]=v});game.setVisible(true);game.mount(root);
 assert.match(root.innerHTML,new RegExp('data-puzzle-cell="'+cell+'" data-puzzle-cell-input value="'+level.givens[cell]+'" readonly'));
 handlers.input({target:{dataset:{puzzleCell:String(cell)},value:'1',matches:q=>q==='[data-puzzle-cell-input]'}});
 assert.equal(game.progress.current().board.values[cell],level.givens[cell]);
 handlers.keydown({key:'Delete',target:{matches:q=>q==='[data-puzzle-cell-input]'},preventDefault(){}});
 assert.equal(game.progress.current().board.values[cell],level.givens[cell]);
}
console.log('Saved Sumdoku clues: readonly field rendering and fixed values preserved through native input and Delete.');

// Multi-digit typing must replace provisional candidates and defer completion until the number is finished.
for(const id of ['zahlenkreuze','zahlenpfade']){
 for(let index=0;index<types.find(t=>t.id===id).levels.length;index++){
  const h=harness(id,index,{empty:true}),free=h.level.solution.map((_,i)=>i).filter(i=>!Object.hasOwn(h.level.givens,i));
  assert.match(h.root.innerHTML,/data-puzzle-cell-input/);assert.doesNotMatch(h.root.innerHTML,/data-puzzle-number|data-puzzle-entry/);
  const markup=h.root.innerHTML;assert.ok(markup.indexOf('<h2')<markup.indexOf('logic-board'));assert.ok(markup.indexOf('logic-board')<markup.indexOf('puzzle-modes'));assert.ok(!markup.includes('data-puzzle-action="erase"'));
  for(const cell of free){h.focus(cell);for(let n=1;n<=String(h.level.solution[cell]).length;n++)h.input(cell,String(h.level.solution[cell]).slice(0,n));}
  h.advance(600);assert.equal(h.stored['puzzle-ui'].screen,'solved',id+' '+index+' can be solved digit by digit');assert.equal(h.game.progress.totals(id).coins,h.level.reward);
 }
}
{
 const h=harness('zahlenkreuze',2,{empty:true}),cell=h.level.solution.findIndex((_,i)=>!Object.hasOwn(h.level.givens,i));
 h.focus(cell);h.input(cell,'0');assert.equal(h.game.progress.current().board.values[cell],0,'Zero is a valid number, not an empty cell');
 h.input(cell,'');assert.equal(h.game.progress.current().board.values[cell],null);h.click({puzzleMode:'note'});
 h.input(cell,'1');h.input(cell,'12');h.key(cell,'Enter');
 assert.deepEqual(h.game.progress.current().board.notes[cell],[12],'Typing 12 does not leave an extra candidate 1');
 h.input(cell,'1');h.input(cell,'13');h.key(cell,'Enter');assert.deepEqual(h.game.progress.current().board.notes[cell],[12,13]);
 h.input(cell,'1');h.input(cell,'12');h.key(cell,'Enter');assert.deepEqual(h.game.progress.current().board.notes[cell],[13],'Entering an existing multi-digit candidate removes only that candidate');
 h.input(cell,'abc');assert.deepEqual(h.game.progress.current().board.notes[cell],[13]);
 assert.ok(h.key(cell,'Backspace'));assert.deepEqual(h.game.progress.current().board.notes[cell],[],'An empty note input still lets Backspace erase its saved candidates without a separate button');
}
{
 const pyramid=numberLogicTypes.find(t=>t.id==='differenzpyramiden');
 assert.equal(pyramid.cellInput,null,'Pyramids use individual tokens instead of typed numbers');
}
console.log('All numeric source puzzles: digit-by-digit native entry, zero, multi-digit candidates without provisional leftovers, invalid values, pyramid token input and automatic completion verified.');
