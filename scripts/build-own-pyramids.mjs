import {writeFile} from 'node:fs/promises';
import {pyramidLayout} from './logic-layouts.mjs';
import {oracleNumeric,independentFullCheck} from './logic-oracle.mjs';
import {pyramidFromBottom,pyramidClues,pyramidBank,countPyramidCompletions} from './pyramid-enumeration.mjs';
import {propagateNumbers,solveNumbers} from '../puzzles/number-logic.js';
// No book or prior puzzle data enters construction. Reproducible bottom rows.
const seed=2026100721,height=5;let state=seed;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
const bottoms=Array.from({length:19},()=>Array.from({length:height},()=>3+Math.floor(random()*38)));
const specs=[{trial:0,indices:[0,1,2,3,4],band:'Entdecker',reward:10,key:'easy'},
 {trial:1,indices:[7],band:'Tüftler',reward:15,key:'medium'},
 {trial:18,indices:[0],band:'Knobelmeister',reward:25,key:'hard'}];
const levels=[],audit=[];
for(const spec of specs){
 const bottom=bottoms[spec.trial],solution=pyramidFromBottom(bottom),givens=pyramidClues(solution,spec.indices),level=pyramidLayout(height,solution,givens);
 const independent=countPyramidCompletions(height,givens,level.bank),second=oracleNumeric(level);
 if(independent.answers.length!==1||second.answers.length!==1||JSON.stringify(independent.answers[0])!==JSON.stringify(solution)||JSON.stringify(second.answers[0])!==JSON.stringify(solution)||!independentFullCheck(level,solution))throw Error('Construction not independently unique');
 const basic=propagateNumbers(level,[],'basic'),combined=propagateNumbers(level,[],'strong'),search=solveNumbers(level);
 if(spec.key==='easy'&&!basic.complete||spec.key==='medium'&&(basic.complete||!combined.complete)||spec.key==='hard'&&(combined.complete||search.metrics.depth<2))throw Error('Reasoning tiers do not differ');
 // Check every position, not just a greedy clue-removal path.
 const zero=countPyramidCompletions(height,{},solution,{limit:1000});if(!zero.exhaustive)throw Error('Zero-clue audit not exhaustive');
 const one=Array.from({length:solution.length},(_,cell)=>{const ids=[cell],r=countPyramidCompletions(height,pyramidClues(solution,ids),pyramidBank(solution,ids));return {cell,value:solution[cell],solutions:r.answers.length,exhaustive:r.exhaustive,nodes:r.nodes};});
 const minimum=zero.answers.length===1?0:one.some(r=>r.solutions===1)?1:null;if(minimum===null)throw Error('Minimum not established');
 const removal=spec.indices.map(cell=>{const ids=spec.indices.filter(i=>i!==cell),r=countPyramidCompletions(height,pyramidClues(solution,ids),pyramidBank(solution,ids));return {removedCell:cell,solutions:r.answers.length,exhaustive:r.exhaustive,nodes:r.nodes};});
 const rows=[];let offset=0;for(let n=height;n>0;n--){rows.push(solution.slice(offset,offset+n));offset+=n;}
 Object.assign(level,{id:`own-pyramid-20261007-${spec.key}`,band:spec.band,reward:spec.reward,solution,
  origin:'own',source:{creator:'MO-Ni',method:'Rückwärtskonstruktion aus eigener unterer Zahlenreihe',seed,trial:spec.trial},
  metrics:{difficultyBasis:'pyramid reasoning strategies',basicFilled:basic.filled,combinedFilled:combined.filled,total:solution.length,solutions:1,minimumGivens:minimum,searchDepth:search.metrics.depth}});
 const evidence={id:level.id,band:spec.band,height,bottom,fullRowsBottomUp:rows,givens,bank:level.bank,
  independentEnumeration:{solutions:1,exhaustive:independent.exhaustive,nodes:independent.nodes},secondConstraintOracle:{solutions:1,nodes:second.nodes},
  strategies:{basicFilled:basic.filled,combinedFilled:combined.filled,total:solution.length,search:search.metrics,basicTrace:basic.trace,combinedTrace:combined.trace},
  minimality:{minimumGivens:minimum,scope:'Diese konkrete Pyramide mit vollständigem Zahlenvorrat der jeweils entfernten Felder; alle Mengen mit weniger Vorgaben und sämtliche Einzelpositionen geprüft.',withoutGivens:{solutions:zero.answers.length,exhaustive:zero.exhaustive,nodes:zero.nodes},singlePositionChecks:one,removeOneGivenChecks:removal}};
 if(spec.key==='hard'){
  const incorrect={...givens,1:12};
  // Additional trial is not a clue removed from the answer; stock must retain
  // the original 6 and consume the trial 12, exactly as in a player's board.
  const trialBank=[...level.bank];trialBank.splice(trialBank.indexOf(12),1);
  const trial=countPyramidCompletions(height,incorrect,trialBank);
  if(trial.answers.length!==0||!trial.exhaustive)throw Error('Trial contradiction not proved');
  evidence.wrongTrial={cell:1,value:12,impliedUpper:18,solutions:0,nodes:trial.nodes,exhaustive:true};
 }
 levels.push(level);audit.push(evidence);console.log(level.id,level.band,'clues',spec.indices.length,'solutions',1,'minimum',minimum,'basic/combined',basic.filled,combined.filled);
}
await writeFile(new URL('../puzzles/own-pyramid-levels.js',import.meta.url),`// Own reverse constructions, not based on a book puzzle.\nexport const ownPyramidLevels = ${JSON.stringify(levels,null,2)};\n`);
await writeFile(new URL('../docs/own-pyramid-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
