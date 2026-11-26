import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPuzzleGame} from '../puzzles/puzzle-view.js';
import {classify,reason} from '../scripts/sumdoku-difficulty.mjs';
import { sumdokuLevels as levels } from '../puzzles/sumdoku-levels.js';
import { initialBoard,normalizeBoard,applyInput,inspect,hint,candidates,validateLevel } from '../puzzles/sumdoku.js';
import { sumdokuType } from '../puzzles/sumdoku-view.js';
import { createPuzzleRegistry } from '../puzzles/registry.js';
import { createPuzzleProgress } from '../puzzles/progress.js';
// Independent oracle: row-major Latin backtracking with plain row/column sets,
// cage sum bounds. Does not use production candidates, inspect or solve.
function oracle(level,limit=2){
  const n=level.size,values=Array(n*n).fill(0),rows=Array.from({length:n},()=>new Set()),cols=Array.from({length:n},()=>new Set()),answers=[];
  const cageAt=Array(n*n);level.cages.forEach((c,k)=>c.cells.forEach(i=>{cageAt[i]=k;}));
  const sums=level.cages.map(()=>0),remaining=level.cages.map(c=>c.cells.length);
  function visit(i){if(i===n*n){answers.push([...values]);return;}
    const r=Math.floor(i/n),c=i%n,k=cageAt[i],target=level.cages[k].sum;
    for(let v=1;v<=n;v++){
      if(level.givens[i]&&level.givens[i]!==v||rows[r].has(v)||cols[c].has(v))continue;
      const sum=sums[k]+v,left=remaining[k]-1;if(target!==null&&(sum+left>target||sum+left*n<target))continue;
      values[i]=v;rows[r].add(v);cols[c].add(v);sums[k]+=v;remaining[k]--;visit(i+1);values[i]=0;rows[r].delete(v);cols[c].delete(v);sums[k]-=v;remaining[k]++;if(answers.length>=limit)return;
    }
  }visit(0);return answers;
}
assert.equal(levels.length,16);
// Check the actual rendered cards in their visible order, across group boundaries.
const rendered={isConnected:true,innerHTML:'',addEventListener(){}};
const cards=createPuzzleGame({read:(key,fallback)=>key==='puzzle-ui'?{screen:'levels',typeId:'sumdoku'}:fallback,write(){}});
cards.mount(rendered);
const visibleNumbers=[...rendered.innerHTML.matchAll(/<strong>Rätsel (\d+)<\/strong>/g)].map(m=>Number(m[1]));
assert.deepEqual(visibleNumbers,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],'Actual card labels run consecutively across all groups');

const original=JSON.parse(await readFile(new URL('../scripts/sumdoku-original-pack.json',import.meta.url),'utf8'));
for(const old of original){const current=levels.find(l=>l.id===old.id);assert.ok(current);
  for(const key of ['size','cages','givens','solution','reward'])assert.deepEqual(current[key],old[key],`${old.id}: existing boards and earned rewards stay valid`);
  assert.equal(current.number,levels.indexOf(current)+1);
}
const counts={};
for(const level of levels){
  const rating=classify(level);assert.equal(rating.band,level.band);assert.deepEqual(rating,level.difficulty);
  counts[level.band]=(counts[level.band]||0)+1;
  const result=reason(level,rating.tier);assert.ok(result.complete,`${level.id}: strategy solves fully`);assert.deepEqual(result.values,level.solution);
  if(rating.tier>0)assert.ok(!reason(level,rating.tier-1).complete,`${level.id}: needs more than the preceding strategy`);
  // Every recorded elimination must preserve the separately verified answer.
  for(const step of result.trace)if(step.after)assert.ok(step.after.includes(level.solution[step.cell]),`${level.id}: sound elimination ${step.method}`);
  if(rating.tier===2){assert.ok(rating.contradictions>0);assert.ok(rating.combinedFilled<=level.size**2-8);
    const trials=result.trace.filter(x=>x.method==='Widerspruch prüfen');assert.ok(trials.every(x=>x.proof.length&&x.assumption!==level.solution[x.cell]));
  }
}
assert.deepEqual(counts,{'Entdecker':8,'Tüftler':4,'Knobelmeister':4});
assert.equal(new Set(levels.filter(l=>l.size===4).map(l=>l.band)).size,3,'All three strategies occur in the same 4 × 4 format');
// Restore actual old-schema records across the newly grouped, expanded pack.
const legacyRegistry=createPuzzleRegistry([{...sumdokuType,levels:original}]);
const legacy=createPuzzleProgress(legacyRegistry);legacy.select('sumdoku','sumdoku-05');
const old5=original.find(l=>l.id==='sumdoku-05');for(let i=0;i<16;i++)legacy.change({kind:'value',cell:i,value:old5.solution[i]});legacy.finish();
legacy.select('sumdoku','sumdoku-12');legacy.change({kind:'note',cell:0,value:2});legacy.change({kind:'note',cell:0,value:4});
const migrated=createPuzzleProgress(createPuzzleRegistry([sumdokuType]),{saved:legacy.snapshot()});
assert.deepEqual(migrated.totals(),{completed:1,coins:15});assert.equal(migrated.current().level.id,'sumdoku-12');assert.deepEqual(migrated.current().board.notes[0],[2,4]);

let candidateChecks=0;
for(const level of levels){validateLevel(level);const solutions=oracle(level);assert.equal(solutions.length,1,`${level.id} is uniquely solvable`);assert.deepEqual(solutions[0],level.solution);assert.ok(inspect(level,{values:solutions[0]}).complete);
  const duplicates={values:Array(level.size**2).fill(1)};assert.equal(inspect(level,duplicates).complete,false);
  for(let sample=0;sample<24;sample++){
    const values=level.solution.map((v,i)=>(i*7+sample*3)%(sample%5+2)===0?v:0),board=normalizeBoard(level,{values});
    assert.equal(inspect(level,board).conflicts.length,0);
    const options=candidates(level,board);options.forEach((a,i)=>{assert.ok(a.includes(level.solution[i]),`${level.id} candidate ${i} must preserve valid solution`);candidateChecks++;});
    const tip=hint(level,board);assert.ok(tip.message&&Array.isArray(tip.cells));
  }
  const board=initialBoard(level),cell=board.values.findIndex((v,i)=>!level.givens[i]);
  const noted=applyInput(level,board,{kind:'note',cell,value:1});assert.deepEqual(noted.notes[cell],[1]);assert.equal(noted.values[cell],0);
  assert.deepEqual(applyInput(level,noted,{kind:'note',cell,value:1}).notes[cell],[]);
  const valued=applyInput(level,noted,{kind:'value',cell,value:2});assert.equal(valued.values[cell],2);assert.deepEqual(valued.notes[cell],[]);
  assert.equal(applyInput(level,valued,{kind:'erase',cell}).values[cell],0);
}
// Same digit twice in a cage is valid when its row/column positions differ.
const repeats={id:'repeats',size:3,givens:{},cages:[{cells:[0,1,3],sum:5},...[2,4,5,6,7,8].map(i=>({cells:[i],sum:[1,2,3,2,3,1,3,1,2][i]}))]};
assert.ok(inspect(repeats,{values:[1,2,3,2,3,1,3,1,2]}).complete);
const registry=createPuzzleRegistry([sumdokuType]);let stored;
const progress=createPuzzleProgress(registry,{save:s=>{stored=structuredClone(s);}});
assert.ok(progress.unlocked('sumdoku',levels[11].id));assert.ok(progress.select('sumdoku',levels[11].id));
let s=progress.current();const cell=s.board.values.findIndex((_,i)=>!s.level.givens[i]);progress.change({kind:'note',cell,value:2});progress.change({kind:'note',cell,value:3});
assert.deepEqual(progress.current().board.notes[cell],[2,3]);assert.equal(progress.finish().reward,0);
const reloaded=createPuzzleProgress(registry,{saved:stored});assert.deepEqual(reloaded.current().board.notes[cell],[2,3]);assert.ok(reloaded.undo());assert.deepEqual(reloaded.current().board.notes[cell],[2]);
assert.ok(reloaded.reset());assert.ok(reloaded.undo());assert.deepEqual(reloaded.current().board.notes[cell],[2]);
for(let i=0;i<s.level.size**2;i++)reloaded.change({kind:'value',cell:i,value:s.level.solution[i]});
assert.equal(reloaded.finish().reward,s.level.reward);assert.equal(reloaded.finish().reward,0);assert.deepEqual(reloaded.totals(),{completed:1,coins:s.level.reward});
const again=createPuzzleProgress(registry,{saved:reloaded.snapshot()});again.reset();assert.equal(again.totals().coins,s.level.reward);
for(let i=0;i<s.level.size**2;i++)again.change({kind:'value',cell:i,value:s.level.solution[i]});assert.equal(again.finish().reward,0);
const corrupted=createPuzzleProgress(registry,{saved:{types:{sumdoku:{[levels[0].id]:{completed:true,board:{values:['x',99,-1],notes:[[99,'2',2,2]]},solvedBoard:{values:[]}}}}}});
assert.deepEqual(corrupted.totals(),{completed:0,coins:0});corrupted.select('sumdoku',levels[0].id);assert.equal(corrupted.current().board.values.length,9);
const locked=createPuzzleProgress(registry,{access:'sequential'});assert.equal(locked.select('sumdoku',levels[1].id),false);locked.select('sumdoku',levels[0].id);
for(let i=0;i<9;i++)locked.change({kind:'value',cell:i,value:levels[0].solution[i]});locked.finish();assert.equal(locked.select('sumdoku',levels[1].id),true);
const large=createPuzzleRegistry(Array.from({length:25},(_,i)=>({...sumdokuType,id:`type-${i}`,title:`Typ ${i}`})));assert.equal(large.list().length,25);assert.throws(()=>large.register({...sumdokuType,id:'type-0'}));
console.log(`Validated 16 original unique Sumdokus; 8/4/4 verified strategy bands and old progress preservation with independent solver; ${candidateChecks} candidate checks; notes/undo/reload/one-time rewards; free/sequential progression and 25-type registry.`);
