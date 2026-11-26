// Build-time only. Reproducible original puzzles; no worksheet puzzles are copied.
import { readFile,writeFile } from 'node:fs/promises';
import { validateLevel,solve } from '../puzzles/sumdoku.js';
import { classify } from './sumdoku-difficulty.mjs';
let seed=20261007;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function latin(n){
  const values=Array(n*n).fill(0);
  function fill(i){if(i===values.length)return true;const r=Math.floor(i/n),c=i%n;
    for(const v of shuffle(Array.from({length:n},(_,k)=>k+1))){if(values.some((x,j)=>x===v&&(Math.floor(j/n)===r||j%n===c)))continue;values[i]=v;if(fill(i+1))return true;values[i]=0;}return false;
  }fill(0);return values;
}
function cages(n,solution,max){const left=new Set(Array.from({length:n*n},(_,i)=>i)),groups=[];
  while(left.size){const cells=[shuffle([...left])[0]];left.delete(cells[0]);const target=1+Math.floor(random()*max);
    while(cells.length<target){const neighbors=shuffle([...left].filter(j=>cells.some(i=>Math.abs(i-j)===n||Math.floor(i/n)===Math.floor(j/n)&&Math.abs(i-j)===1)));if(!neighbors.length)break;cells.push(neighbors[0]);left.delete(neighbors[0]);}
    cells.sort((a,b)=>a-b);groups.push({cells,sum:cells.reduce((a,i)=>a+solution[i],0)});
  }return groups.sort((a,b)=>a.cells[0]-b.cells[0]);
}
// Keep initial grids, stable IDs and rewards intact for saved progress.
const original=JSON.parse(await readFile(new URL('./sumdoku-original-pack.json',import.meta.url),'utf8'));
const pack=original.map(({metrics,...p},i)=>({...p,number:i+1,band:classify(p).band,difficulty:classify(p)}));
seed=2026100711;
const generation=[];
for(const n of [4,5]){
  const pool=[];
  for(let attempt=0;attempt<12000&&pool.length<8;attempt++){
    const solution=latin(n),partition=cages(n,solution,5);
    if(partition.filter(c=>c.cells.length===1).length>1)continue;
    const level={id:'candidate',size:n,cages:partition,givens:{}};
    const initial=classify(level);
    if(initial.tier!==2||initial.combinedFilled>n*n-8||initial.contradictions<1||initial.contradictions>4)continue;
    const answers=solve(level);if(answers.length!==1)continue;
    validateLevel(level);pool.push({...level,solution:answers[0],difficulty:initial});
    generation.push({size:n,attempt,...initial});
  }
  if(pool.length<2)throw Error(`Zu wenige anspruchsvolle Rätsel ${n}: ${pool.length}`);
  pool.sort((a,b)=>a.difficulty.contradictions-b.difficulty.contradictions||b.difficulty.combinedFilled-a.difficulty.combinedFilled);
  for(const p of [pool[0],pool[pool.length-1]]){
    const number=pack.length+1;
    pack.push({...p,id:`sumdoku-${String(number).padStart(2,'0')}`,number,title:'Mit Möglichkeiten knobeln',band:'Knobelmeister',reward:25});
  }
}
const rank={'Entdecker':0,'Tüftler':1,'Knobelmeister':2};
pack.sort((a,b)=>rank[a.band]-rank[b.band]||a.number-b.number);
// Visible numbers follow the displayed order; immutable IDs own saved progress.
pack.forEach((p,i)=>{p.number=i+1;});
await writeFile(new URL('../puzzles/sumdoku-levels.js',import.meta.url),`// Original MO-Ni puzzles. Stable initial grids plus audited additions (seed 2026100711).\n// Latin rows/columns and cage sums; repeats within cages are allowed.\nexport const sumdokuLevels = ${JSON.stringify(pack,null,2)};\n`);
await writeFile(new URL('../docs/sumdoku-niveau-audit.json',import.meta.url),JSON.stringify({strategyVersion:1,seed:2026100711,limitations:'Reproducible strategy classification; not a child-tested difficulty scale. Alternative human shortcuts are possible.',puzzles:pack.map(p=>({id:p.id,number:p.number,size:p.size,reward:p.reward,...p.difficulty})),generation},null,2)+'\n');
console.log(pack.map(x=>({id:x.id,number:x.number,size:x.size,...x.difficulty})));
