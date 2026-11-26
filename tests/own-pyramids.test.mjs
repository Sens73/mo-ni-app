import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ownPyramidLevels} from '../puzzles/own-pyramid-levels.js';
import {pyramidLayout} from '../scripts/logic-layouts.mjs';
import {oracleNumeric} from '../scripts/logic-oracle.mjs';
import {pyramidFromBottom,pyramidClues,pyramidBank,countPyramidCompletions} from '../scripts/pyramid-enumeration.mjs';
import {propagateNumbers} from '../puzzles/number-logic.js';
const audit=JSON.parse(await readFile(new URL('../docs/own-pyramid-audit.json',import.meta.url)));
assert.equal(ownPyramidLevels.length,3);assert.equal(new Set(ownPyramidLevels.map(l=>JSON.stringify(l.solution))).size,3);
for(const [k,l]of ownPyramidLevels.entries()){
 assert.equal(l.height,5);assert.equal(l.origin,'own');assert.equal(l.source.book,undefined);
 assert.deepEqual(pyramidFromBottom(l.solution.slice(0,5)),l.solution);
 const r=countPyramidCompletions(l.height,l.givens,l.bank);assert.equal(r.answers.length,1);assert.ok(r.exhaustive);assert.deepEqual(r.answers[0],l.solution);
 const poisoned={...l,solution:Array(15).fill(999)};assert.deepEqual(oracleNumeric(poisoned).answers,[l.solution]);
 const basic=propagateNumbers(l,[],'basic'),combined=propagateNumbers(l,[],'strong');assert.equal(basic.complete,k===0);assert.equal(combined.complete,k<2);
 for(const step of combined.trace)assert.ok(step.after.includes(l.solution[step.cell]),'No deduction removes the true value');
 // All sets smaller than the claimed minimum (zero), plus every singleton.
 const noClues=countPyramidCompletions(5,{},l.solution,{limit:1000});assert.ok(noClues.exhaustive);assert.equal(noClues.answers.length,2);
 assert.deepEqual(noClues.answers.map(a=>JSON.stringify(a)).sort(),[l.solution,pyramidFromBottom(l.solution.slice(0,5).reverse())].map(a=>JSON.stringify(a)).sort());
 const singles=Array.from({length:15},(_,i)=>{const g=pyramidClues(l.solution,[i]),bank=pyramidBank(l.solution,[i]),a=countPyramidCompletions(5,g,bank),b=oracleNumeric(pyramidLayout(5,l.solution,g));assert.equal(a.answers.length,b.answers.length);return a.answers.length;});
 assert.ok(singles.includes(1));assert.equal(l.metrics.minimumGivens,1);assert.deepEqual(singles,audit[k].minimality.singlePositionChecks.map(s=>s.solutions));
 assert.deepEqual(singles.map((n,i)=>n>1?i:null).filter(i=>i!==null),[2,10,14],'A central clue cannot distinguish reflection');
}
const hard=ownPyramidLevels[2],trialBank=[...hard.bank];trialBank.splice(trialBank.indexOf(12),1);
assert.equal(countPyramidCompletions(5,{...hard.givens,1:12},trialBank).answers.length,0,'Wrong trial with correctly consumed stock is impossible');
// Cross-check the independent algorithms on repeated numbers, zeros and every
// 3-stone bottom row in 0..4; neither checker receives a solution as a premise.
let cases=0;
for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++)for(const ids of [[],[0],[4],[0,1,2]]){
 const s=pyramidFromBottom([a,b,c]),g=pyramidClues(s,ids),bank=pyramidBank(s,ids);
 assert.equal(countPyramidCompletions(3,g,bank).answers.length,oracleNumeric(pyramidLayout(3,s,g)).answers.length);cases++;
}
console.log(`Three own five-stage pyramids unique in two independent algorithms; minimal clues, reflection, reasoning tiers and ${cases} zero/repeated-number cross-checks passed.`);
