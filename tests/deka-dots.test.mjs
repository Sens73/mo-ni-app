import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sundayEpisodes} from '../puzzles/sunday-levels.js';
import {createSundayPuzzleTypes} from '../puzzles/sunday-types.js';
import {createPuzzleRegistry} from '../puzzles/registry.js';
import {createPuzzleProgress} from '../puzzles/progress.js';
import {oracleNumeric} from '../scripts/logic-oracle.mjs';

const sunday=JSON.parse(await readFile(new URL('../data/sunday.json',import.meta.url)));
const publications=JSON.parse(await readFile(new URL('../data/sunday-publications.json',import.meta.url)));
const episode=sundayEpisodes.find(e=>e.number===6),levels=episode.levels;
assert.equal(episode.typeId,'deka-dots');
assert.deepEqual(levels.map(l=>l.source.stars),[1,2,3,4,5]);
assert.deepEqual(levels.map(l=>l.fields.length),[4,4,8,11,9]);
// Paper task 2 has two full-height outside rectangles. Paper task 5 has
// a full-height left pair and two horizontal pairs, never a split left box.
assert.deepEqual(levels[1].fields.filter(f=>f.h===2),[{x:0,y:0,w:1,h:2},{x:2,y:0,w:1,h:2}]);
assert.deepEqual(levels[4].fields.filter(f=>f.w>1||f.h>1),[{x:0,y:0,w:1,h:2},{x:1,y:0,w:2,h:1},{x:2,y:2,w:2,h:1}]);
const before=createSundayPuzzleTypes(sunday,publications,new Date('2026-10-24T07:59:59Z'));
assert.equal(before.find(t=>t.id===episode.typeId).levels.length,0);
const types=createSundayPuzzleTypes(sunday,publications,new Date('2026-10-24T08:00:00Z'));
const type=types.find(t=>t.id===episode.typeId);
assert.equal(types.flatMap(t=>t.levels).length,30);
assert.equal(type.levels.length,5);
assert.equal(type.episodes[0].videoAvailable,false);
assert.equal(type.episodes[0].videoNotice,'Lösungsvideo ab 25.10., 10:00 Uhr');
const withoutSheet={...publications,worksheets:publications.worksheets.filter(w=>w.id!==episode.id)};
assert.equal(createSundayPuzzleTypes(sunday,withoutSheet,new Date('2026-10-24T12:00:00Z')).find(t=>t.id===type.id).levels.length,0);
// Even an early confirmation cannot expose Sunday's solution video on Saturday.
const confirmed={...publications,confirmed:[...publications.confirmed,episode.videoId]};
assert.equal(createSundayPuzzleTypes(sunday,confirmed,new Date('2026-10-25T08:59:59Z')).find(t=>t.id===type.id).episodes[0].videoAvailable,false);
assert.equal(createSundayPuzzleTypes(sunday,confirmed,new Date('2026-10-25T09:00:00Z')).find(t=>t.id===type.id).episodes[0].videoAvailable,true);
assert.equal(createSundayPuzzleTypes(sunday,publications,new Date('2026-10-25T09:00:00Z')).find(t=>t.id===type.id).episodes[0].videoAvailable,true);
let progress=createPuzzleProgress(createPuzzleRegistry(types));
for(const level of levels){
  const independent=oracleNumeric(level);
  assert.equal(independent.answers.length,1);
  assert.deepEqual(level.solution,independent.answers[0]);
  // A shared large rectangle contributes once per point; diagonal equality is allowed.
  for(const dot of level.dots){
    assert.equal(new Set(dot.cells).size,dot.cells.length);
    assert.equal(dot.cells.reduce((sum,i)=>sum+level.solution[i],0),10);
  }
  for(const pair of level.neighbors)assert.notEqual(level.solution[pair[0]],level.solution[pair[1]]);
  progress.select(type.id,level.id);
  const empty=level.fields.findIndex((_,i)=>!Object.hasOwn(level.givens,i));
  progress.change({kind:'note',cell:empty,value:0});
  progress=createPuzzleProgress(createPuzzleRegistry(types),{saved:progress.snapshot()});
  assert.deepEqual(progress.current().board.notes[empty],[0],'Zero is a persisted candidate, not an empty cell');
  for(let i=0;i<level.solution.length;i++)progress.change({kind:'value',cell:i,value:level.solution[i]});
  assert.equal(progress.finish().reward,level.reward);
  assert.equal(progress.finish().reward,0,'Repeated completion cannot award a second reward');
}
assert.equal(progress.totals().completed,5);
assert.equal(progress.totals().coins,100);
const first=levels[0],wrong=type.model.initialBoard(first);wrong.values[2]=5;
assert.equal(type.model.inspect(first,wrong).complete,false,'A full wrong board is rejected');
wrong.values[2]=4;assert.equal(type.model.inspect(first,wrong).complete,true);
const fifth=levels[4],zeroBoard=type.model.normalizeBoard(fifth,{values:fifth.solution});
assert.equal(zeroBoard.values.filter(v=>v===0).length,2);
assert.equal(type.model.inspect(fifth,zeroBoard).complete,true);
console.log('Deka Dots: five independently unique paper tasks, merged boxes, zero/candidates, rewards, persistence and separate worksheet/video gates verified.');
