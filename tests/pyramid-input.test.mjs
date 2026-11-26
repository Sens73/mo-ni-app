import assert from 'node:assert/strict';
import {pyramidTokens,pyramidModel as m} from '../puzzles/pyramid-input.js';
const l={fields:Array.from({length:5},()=>({})),givens:{0:9},domains:Array.from({length:5},()=>[3,5,9]),bank:[3,3,5,9]};
let b=m.initialBoard(l);
assert.deepEqual(pyramidTokens(l,b).map(t=>t.value),[3,3,5,9]);
const put=a=>b=m.applyInput(l,b,{kind:'token',...a});
put({token:0,cell:1});assert.deepEqual(pyramidTokens(l,b).map(t=>t.value),[3,5,9]);
put({token:1,cell:2});assert.deepEqual(pyramidTokens(l,b).map(t=>t.value),[5,9]);
const full=structuredClone(b);put({token:0,cell:3});assert.deepEqual(b,full,'No extra copy');
put({token:2,cell:3});put({from:1,cell:3});assert.equal(b.values[1],5);assert.equal(b.values[3],3);
put({from:3,cell:null});assert.equal(b.values[3],null);assert.deepEqual(pyramidTokens(l,b).map(t=>t.value),[3,9]);
put({token:pyramidTokens(l,b).find(t=>t.value===3).index,cell:1});assert.equal(b.values[1],3);assert.deepEqual(pyramidTokens(l,b).map(t=>t.value),[5,9]);
const before=structuredClone(b);for(const a of [{from:0,cell:3},{from:1,cell:0},{token:99,cell:3},{from:1,cell:99},{from:1,cell:1}]){put(a);assert.deepEqual(b,before);}
assert.deepEqual(m.normalizeBoard(l,JSON.parse(JSON.stringify(b))),b);
console.log('Pyramid tokens: repeated numbers, depletion, replacement, swap, return, givens and saved boards passed.');
