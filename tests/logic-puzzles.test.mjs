import assert from 'node:assert/strict';
import {numberLogicTypes} from '../puzzles/number-logic-view.js';
import {numberLogicModel,propagateNumbers,inspectNumbers,applyNumber,normalizeNumbers} from '../puzzles/number-logic.js';
import {polyType,mazeType} from '../puzzles/geometry-logic-view.js';
import {mazeStepAllowed,polyModel,pieceCells,placementCells} from '../puzzles/geometry-logic.js';
import {createPuzzleGame} from '../puzzles/puzzle-view.js';
import {createPuzzleRegistry} from '../puzzles/registry.js';
import {createPuzzleProgress} from '../puzzles/progress.js';
import {numberLayout,countNumberPaths,gridFields} from '../scripts/logic-layouts.mjs';
import {oracleNumeric,independentFullCheck} from '../scripts/logic-oracle.mjs';
import {auditPoly,auditMaze,crossRank} from '../scripts/beast-geometry-audit.mjs';
const types=[...numberLogicTypes,polyType,mazeType],registry=createPuzzleRegistry(types);let checked=0;
for(const t of types){const count=t.id==='differenzpyramiden'?9:6;assert.equal(t.levels.length,count);if(numberLogicTypes.includes(t))assert.equal(new Set(t.levels.map(l=>JSON.stringify([l.fields,l.solution]))).size,count,'Different solved boards');assert.deepEqual(t.levels.map(l=>l.band),['Entdecker','Tüftler','Knobelmeister'].flatMap(b=>Array(count/3).fill(b)));
 const rendered={isConnected:true,innerHTML:'',addEventListener(){}};createPuzzleGame({read:(k,f)=>k==='puzzle-ui'?{screen:'levels',typeId:t.id}:f,write(){}}).mount(rendered);assert.deepEqual([...rendered.innerHTML.matchAll(/<strong>Rätsel (\d+)<\/strong>/g)].map(m=>+m[1]),Array.from({length:count},(_,i)=>i+1));
 for(const l of t.levels){checked++;const p=createPuzzleProgress(registry);p.select(t.id,l.id);assert.equal(p.finish().reward,0);
  if(numberLogicTypes.includes(t)){
   assert.ok(independentFullCheck(l,l.solution),l.id);const oracle=l.kind==='number-path'?countNumberPaths(l):oracleNumeric(l);assert.equal(oracle.answers.length,1,`${l.id}: independent uniqueness`);assert.deepEqual(oracle.answers[0],l.solution);
   if(l.origin==='own')assert.equal(l.metrics.difficultyBasis,'pyramid reasoning strategies');else {assert.equal(l.metrics.difficultyBasis,'Beast Academy source stars');assert.equal(l.metrics.sourceStars,l.source.stars);}
   if(l.kind==='cross')assert.ok(crossRank(l).rangeIndependent,'Clues and crossings uniquely determine the board without bounds');
   for(const strength of ['basic','strong'])for(const step of propagateNumbers(l,[],strength).trace)assert.ok(step.after.includes(l.solution[step.cell]));
   let n=p.current().board;const cell=l.fields.findIndex((_,i)=>!Object.hasOwn(l.givens,i));p.change({kind:'note',cell,value:l.solution[cell]});assert.deepEqual(p.current().board.notes[cell],[l.solution[cell]]);p.undo();assert.deepEqual(p.current().board,n);
   for(let i=0;i<l.fields.length;i++)p.change({kind:'value',cell:i,value:l.solution[i]});
   const altered=l.solution.map((v,i)=>Object.hasOwn(l.givens,i)?v:l.domains[i].find(x=>x!==v)??v);assert.equal(inspectNumbers(l,{values:altered}).complete,false);
   const poisoned={...l,solution:l.solution.map(()=>99)};assert.ok(inspectNumbers(poisoned,{values:l.solution}).complete,'checker ignores stored answer');
  }else if(t===mazeType){assert.equal(auditMaze(l).answers.length,1,l.id);const path=l.solution;assert.equal(new Set(path).size,path.length);assert.equal(path.length,l.rows*l.cols-l.blocked.length);for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k];assert.equal(Math.abs(a%l.cols-b%l.cols)+Math.abs(Math.floor(a/l.cols)-Math.floor(b/l.cols)),1);if(k>1&&l.turns[a]){const prev=path[k-2],cross=(a%l.cols-prev%l.cols)*(Math.floor(b/l.cols)-Math.floor(a/l.cols))-(Math.floor(a/l.cols)-Math.floor(prev/l.cols))*(b%l.cols-a%l.cols);assert.equal(cross,l.turns[a]==='L'?-1:1);}p.change({kind:'step',cell:b});}
  }else {assert.equal(auditPoly(l).answers.length,1,l.id);const covered=new Set();l.solution.forEach((v,i)=>{const piece=l.pieces[i];let shape=piece.cells.map(([x,y])=>[v.flip?-x:x,y]);for(let k=0;k<v.turn;k++)shape=shape.map(([x,y])=>[-y,x]);const minX=Math.min(...shape.map(a=>a[0])),minY=Math.min(...shape.map(a=>a[1]));shape=shape.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);const anchor=shape[0];for(const [x,y]of shape){const c=v.anchor%l.cols+x-anchor[0],r=Math.floor(v.anchor/l.cols)+y-anchor[1],cell=r*l.cols+c;assert.ok(c>=0&&c<l.cols&&r>=0&&r<l.rows&&!l.blocked.includes(cell)&&!covered.has(cell));covered.add(cell);}
    p.change({kind:'choose',value:i});for(let r=0;r<v.turn;r++)p.change({kind:'rotate'});if(v.flip)p.change({kind:'flip'});p.change({kind:'place',cell:v.anchor});});assert.equal(covered.size,l.rows*l.cols-l.blocked.length);
  }
  assert.equal(p.finish().reward,l.reward,l.id);assert.equal(p.finish().reward,0);const reloaded=createPuzzleProgress(registry,{saved:p.snapshot()});assert.ok(reloaded.current().type.model.inspect(l,reloaded.current().board).complete);assert.equal(reloaded.totals().coins,l.reward);reloaded.reset();assert.equal(reloaded.finish().reward,0);assert.ok(reloaded.undo());assert.equal(reloaded.finish().reward,0);
 }
}
// Source-rule regressions: 0 and joined rectangles, descending lines, concatenation,
// two-digit differences, 2x2 blocks, relative turns and reflected shapes.
const deka=numberLayout('deka',{rows:2,cols:3,fields:[{x:0,y:0,w:1,h:1},{x:1,y:0,w:2,h:1},{x:0,y:1,w:1,h:1},{x:1,y:1,w:1,h:1},{x:2,y:1,w:1,h:1}]});assert.ok(inspectNumbers(deka,{values:[6,2,2,0,8]}).complete);assert.deepEqual(deka.dots[1].cells,[1,3,4]);assert.equal(applyNumber(deka,normalizeNumbers(deka),{kind:'value',cell:3,value:0}).values[3],0);
const cross=numberLayout('cross',{rows:1,cols:4});assert.ok(inspectNumbers(cross,{values:[35,30,25,20]}).complete);assert.equal(inspectNumbers(cross,{values:[35,30,26,20]}).complete,false);
const digit=numberLayout('digit',{rows:2,cols:2,circles:[{x:1,y:1,target:18}]});assert.ok(inspectNumbers(digit,{values:[6,5,4,7]}).complete);assert.equal(inspectNumbers(digit,{values:[6,5,4,6]}).complete,false);
const su=numberLayout('sudoku',{rows:4,cols:4,comparisons:[]});assert.equal(inspectNumbers(su,{values:[1,2,3,4,2,3,4,1,3,4,1,2,4,1,2,3]}).complete,false,'Latin rows/columns alone do not satisfy blocks');
const maze={rows:3,cols:3,blocked:[],start:3,end:8,turns:{4:'L'}};assert.ok(mazeStepAllowed(maze,[3,4],1));assert.equal(mazeStepAllowed(maze,[3,4],7),false);assert.equal(mazeStepAllowed(maze,[3,4],2),false);
const shape={cells:[[0,0],[0,1],[0,2],[1,2]]};assert.notDeepEqual(pieceCells(shape,0,false),pieceCells(shape,0,true));
const poly=polyType.levels[0],b=polyModel.initialBoard(poly);const turned=polyModel.applyInput(poly,b,{kind:'rotate'});assert.equal(polyModel.inspect(poly,turned).filled,0);
const forbidden=polyType.levels[5];assert.equal(polyModel.inspect(forbidden,{placements:forbidden.pieces.map(()=>({anchor:0,turn:0,flip:false}))}).complete,false);
const flipped=polyType.retiredLevels[0],alternate={placements:flipped.solution.map((p,i)=>{const mirrored=placementCells(flipped,flipped.pieces[i],p).map(c=>Math.floor(c/flipped.cols)*flipped.cols+(flipped.cols-1-c%flipped.cols)).sort((a,b)=>a-b);for(const flip of [false,true])for(let turn=0;turn<4;turn++)for(const anchor of mirrored){const v={anchor,turn,flip};if(placementCells(flipped,flipped.pieces[i],v).sort((a,b)=>a-b).join(',')===mirrored.join(','))return v;}throw Error('Missing reflected placement');})};assert.notDeepEqual(alternate.placements,flipped.solution);assert.ok(polyModel.inspect(flipped,alternate).complete,'Valid alternate covering is accepted');
const controls=createPuzzleProgress(registry);controls.select('polyominos',poly.id);controls.change({kind:'rotate'});assert.equal(controls.current().history.length,0);controls.change({kind:'place',cell:-1});assert.equal(controls.current().history.length,0);
// Two identical I pieces, offset by one row, retain separate outer contours.
const twinI={rows:6,cols:3,blocked:[],pieces:[0,1].map(()=>({label:'I',cells:[[0,0],[0,1],[0,2],[0,3]]}))};
const twinBoard={placements:[{anchor:0,turn:0,flip:false},{anchor:4,turn:0,flip:false}],chosen:0,turn:0,flip:false};
const twinHtml=polyType.renderBoard({type:polyType,level:twinI,board:twinBoard,selected:-1});
const outlines=[...twinHtml.matchAll(/data-poly-piece="\d+" d="([^"]+)"/g)].map(m=>m[1]);assert.equal(outlines.length,2);
const contourEdges=d=>new Set([...d.matchAll(/M(\d+),(\d+)L(\d+),(\d+)/g)].map(m=>[`${m[1]},${m[2]}`,`${m[3]},${m[4]}`].sort().join('|')));
const [firstI,secondI]=outlines.map(contourEdges);assert.equal(firstI.size,10);assert.equal(secondI.size,10);
assert.equal([...firstI].filter(edge=>secondI.has(edge)).length,3,'Adjacent pieces retain all three shared boundary segments');
assert.ok(!firstI.has(['0,100','100,100'].sort().join('|')),'The internal square divider is not part of the thick contour');
assert.ok(!twinHtml.match(/>I<\/button>/));assert.equal(polyType.renderBoard({type:polyType,level:twinI,board:{...twinBoard,placements:[null,null]},selected:-1}).includes('data-poly-piece='),false);
// Every mode belongs to the same extensible progress store; old Sumdoku stays available.
const all=createPuzzleGame({read:(_,f)=>f,write(){}});assert.equal(all.registry.list().length,11);assert.equal(all.registry.get('sumdoku').levels.length,16);
// Difficulty comes from the source, not blank count or a correlated solver.
for(const t of types){const sourced=t.levels.filter(l=>l.origin!=='own');assert.ok(sourced[0].source.stars<sourced[2].source.stars);assert.ok(sourced[2].source.stars<sourced[4].source.stars);}
// Changing a board's identity must retain earned coins and the old saved notes.
const old=numberLogicTypes[0].retiredLevels[0],oldBoard=numberLogicModel.initialBoard(old),oldSaved={types:{zahlenkreuze:{[old.id]:{completed:true,solvedBoard:{values:old.solution},board:oldBoard,history:[]}}}};
const migrated=createPuzzleProgress(registry,{saved:oldSaved});assert.equal(migrated.totals().coins,old.reward);assert.equal(migrated.totals().completed,0);assert.ok(migrated.snapshot().types.zahlenkreuze[old.id]);
const migratedAgain=createPuzzleProgress(registry,{saved:migrated.snapshot()});assert.equal(migratedAgain.totals().coins,old.reward);migratedAgain.select('zahlenkreuze',numberLogicTypes[0].levels[0].id);assert.equal(migratedAgain.finish().reward,0);
assert.equal(checked,57);console.log(`54 Beast Academy variants and 3 own pyramids independently unique, including all 12 geometry boards; difficulty, numbering, notes, restore and one-time gold checked.`);
