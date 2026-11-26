import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {kenkenEpisode} from '../puzzles/kenken-levels.js';
import {kenkenType} from '../puzzles/kenken-view.js';
import {createSundayPuzzleTypes} from '../puzzles/sunday-types.js';
import {applyKenKen,inspectKenKen,kenkenCandidates,normalizeKenKen,validateKenKen} from '../puzzles/kenken.js';

const sunday=JSON.parse(await readFile(new URL('../data/sunday.json',import.meta.url)));
const publications=JSON.parse(await readFile(new URL('../data/sunday-publications.json',import.meta.url)));
const sizes=[4,5,8],counts=[8,12,28];
assert.equal(kenkenEpisode.levels.length,3);
for(const [k,level] of kenkenEpisode.levels.entries()){
  assert.equal(level.size,sizes[k]);assert.equal(level.cages.length,counts[k]);
  assert.equal(level.number,k+1);assert.equal(level.source.stars,0);
  assert.equal(validateKenKen(level),level);
  const empty=normalizeKenKen(level),filled=normalizeKenKen(level,{values:level.solution});
  assert.equal(inspectKenKen(level,empty).complete,false);
  assert.equal(inspectKenKen(level,empty).conflicts.length,0);
  assert.equal(inspectKenKen(level,filled).complete,true);
  assert.equal(kenkenCandidates(level,empty).length,level.size**2);
  for(const [i,value] of Object.entries(level.givens)){
    assert.equal(empty.values[+i],value);
    assert.equal(applyKenKen(level,empty,{kind:'erase',cell:+i}).values[+i],value);
  }
  const first=level.solution.findIndex((value,i)=>!Object.hasOwn(level.givens,i)&&value!==1);
  const wrong={values:[...level.solution]};wrong.values[first]=1;
  assert.equal(inspectKenKen(level,wrong).complete,false);
  const board=kenkenType.renderBoard({level,board:empty,selected:-1});
  assert.equal((board.match(/class="sumdoku-cell kenken-cell/g)||[]).length,level.size**2);
  assert.equal((board.match(/class="sumdoku-sum kenken-clue/g)||[]).length,counts[k]);
}
const before=createSundayPuzzleTypes(sunday,publications,new Date('2026-10-31T07:59:59Z')).find(type=>type.id==='kenken');
const after=createSundayPuzzleTypes(sunday,publications,new Date('2026-10-31T08:00:01Z')).find(type=>type.id==='kenken');
assert.equal(before.levels.length,0);assert.equal(after.levels.length,3);assert.equal(after.episodes[0].videoAvailable,false);
const published={...publications,confirmed:[...publications.confirmed,'QugmHXn1roM']};
assert.equal(createSundayPuzzleTypes(sunday,published,new Date('2026-11-01T09:00:01Z')).find(type=>type.id==='kenken').episodes[0].videoAvailable,true);
console.log('KenKens: 3 Blattaufgaben, 4/5/8-Gitter, 48 Blöcke, Regelprüfung, Darstellung und getrennte Veröffentlichungszeiten geprüft.');
