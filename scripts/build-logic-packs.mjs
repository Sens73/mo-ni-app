import {writeFile} from 'node:fs/promises';
import {numberLayout,pyramidLayout,gridFields,range,countNumberPaths} from './logic-layouts.mjs';
import {solveNumbers,propagateNumbers,validateNumberLevel} from '../puzzles/number-logic.js';
let seed=2026100715;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(random()*a.length)];
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hamilton(rows,cols){const used=new Set(),path=[];
  function visit(i){used.add(i);path.push(i);if(path.length===rows*cols)return true;const options=shuffle(range(0,rows*cols-1).filter(j=>!used.has(j)&&Math.abs(j%cols-i%cols)+Math.abs(Math.floor(j/cols)-Math.floor(i/cols))===1));
    for(const j of options)if(visit(j))return true;path.pop();used.delete(i);return false;}
  for(const i of shuffle(range(0,rows*cols-1)))if(visit(i)){const values=Array(rows*cols);path.forEach((i,k)=>values[i]=k+1);return values;}throw Error('Kein eigener Pfad');
}
function specimen(kind,trial){
  if(kind==='pyramid'){
    const height=trial%3===0?3:trial%3===1?4:5,base=range(1,height).map(()=>Math.floor(random()*17)),solution=[...base];let row=base;
    while(row.length>1){row=row.slice(0,-1).map((v,i)=>Math.abs(v-row[i+1]));solution.push(...row);}
    return {solution,make:g=>pyramidLayout(height,solution,g)};
  }
  let config,solution;
  if(kind==='cross'){
    const single=trial%3===0,n=trial%3===2?7:5,fields=gridFields(n,n).filter(f=>single?f.x===2||f.y===2:f.x%2===1||f.y%2===1);
    const a=pick([1,2,3,4]),b=pick([1,2]),c=pick([1,2]),e=n===7?0:pick([0,1]);solution=fields.map(f=>a+b*f.y+c*f.x+e*f.x*f.y);config={rows:n,cols:n,fields};
  }else if(kind==='deka'){
    const rows=trial%3===0?2:3,cols=trial%3===0?2:3;let fields=gridFields(rows,cols);
    if(rows===3&&trial%2){fields=fields.filter(f=>!(f.y===0&&f.x===2));fields.find(f=>f.y===0&&f.x===1).w=2;}
    config={rows,cols,fields};const raw=numberLayout(kind,config);raw.domains=raw.domains.map(a=>shuffle(a));const solved=solveNumbers(raw,1);if(!solved.answers.length)return null;solution=solved.answers[0];
  }else if(kind==='sudoku'){
    const digits=shuffle([1,2,3,4]),rowOrder=[...shuffle([0,1]),...shuffle([2,3])],colOrder=[...shuffle([0,1]),...shuffle([2,3])];
    solution=rowOrder.flatMap(r=>colOrder.map(c=>digits[(c+[0,2,1,3][r])%4]));
    const edges=[];for(let i=0;i<16;i++)for(const j of [i%4<3?i+1:-1,i<12?i+4:-1])if(j>=0)edges.push({small:solution[i]<solution[j]?i:j,large:solution[i]<solution[j]?j:i});
    config={rows:4,cols:4,comparisons:shuffle(edges).slice(0,2+trial%5)};
  }else if(kind==='magic'){
    const n=trial%3===2?5:4,digits=shuffle(range(0,n-1)),rowOrder=shuffle(range(0,n-1)),colOrder=shuffle(range(0,n-1));const raw=rowOrder.flatMap(r=>colOrder.map(c=>digits[(r+c)%n])),blocked=raw.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
    const fields=gridFields(n,n,blocked);solution=fields.map(f=>raw[f.y*n+f.x]);
    const lines=shuffle([...range(0,n-1).map(line=>({line,vertical:false,target:0})),...range(0,n-1).map(line=>({line,vertical:true,target:0}))]).slice(0,2+trial%4);
    config={rows:n,cols:n,blocked,sums:lines};const model=numberLayout(kind,config);config.sums=model.sums.map(s=>({...s,target:s.cells.reduce((total,i,k)=>total+s.weights[k]*solution[i],0)}));
  }else if(kind==='digit'){
    const rows=trial%3===0?2:3,cols=trial%3===2?4:3;solution=gridFields(rows,cols).map(f=>f.x<cols-1?pick(range(1,9)):pick(range(0,9)));const circles=[];
    for(let y=1;y<rows;y++)for(let x=1;x<cols;x++){const i=(y-1)*cols+x-1,j=y*cols+x-1;circles.push({x,y,target:Math.abs(10*solution[i]+solution[i+1]-10*solution[j]-solution[j+1])});}config={rows,cols,circles};
  }else if(kind==='number-path'){
    const rows=trial%3===0?3:4,cols=trial%3===0?3:4;solution=hamilton(rows,cols);config={rows,cols};
  }else throw Error(kind);
  return {solution,make:g=>({...numberLayout(kind,config),givens:{...g}})};
}
const kinds=['cross','number-path','pyramid','deka','magic','digit','sudoku'],packs={},audit=[];
for(const kind of kinds){const pool=[[],[],[]],seen=new Set();
  for(let trial=0;trial<20000&&pool.some(a=>a.length<6);trial++){
    const specimenData=specimen(kind,trial);if(!specimenData)continue;const {solution,make}=specimenData,givens=Object.fromEntries(solution.map((v,i)=>[i,v]));
    for(const i of shuffle(range(0,solution.length-1))){
      if(kind==='number-path'&&(solution[i]===1||solution[i]===solution.length))continue;
      const old=givens[i];delete givens[i];const level={id:'candidate',...make(givens)},solved=kind==='number-path'?countNumberPaths(level):solveNumbers(level);
      if(solved.answers.length!==1||solved.metrics.exhausted){givens[i]=old;continue;}
      const empty=solution.length-Object.keys(givens).length;if(empty<2)continue;
      const basic=propagateNumbers(level,[],'basic'),strong=propagateNumbers(level,[]),tier=kind==='cross'?(level.rows===7&&empty>=12?2:level.fields.length>9&&empty>=5?1:0):basic.complete?0:strong.complete?1:2;
      if(tier===2&&empty<5||pool[tier].length>=18)continue;
      const fingerprint=JSON.stringify([level.fields,solution,level.sums,level.comparisons,level.circles]);
      const existing=pool[tier].findIndex(p=>p.fingerprint===fingerprint);
      const candidate=structuredClone({...level,solution,fingerprint,metrics:{tier,empty,criterion:kind==='cross'?'Linked crossing runs and missing entries':'Direct deductions / linked candidates / branching',basicFilled:basic.filled,strongFilled:strong.filled,rounds:strong.rounds,...solved.metrics}});
      if(existing>=0){if(pool[tier][existing].metrics.empty<empty)pool[tier][existing]=candidate;}
      else pool[tier].push(candidate);
    }
    if(trial%20===0)console.log(kind,trial,pool.map(a=>a.length));
  }
  if(pool.some(a=>a.length<2))throw Error(`Keine ehrliche Abstufung ${kind}: ${pool.map(a=>a.length)}`);
  const used=new Set(),chosen=pool.flatMap((a,tier)=>{a.sort((x,y)=>x.metrics.empty-y.metrics.empty||x.metrics.rounds-y.metrics.rounds);const available=a.filter(p=>!used.has(p.fingerprint)&&(kind!=='cross'||tier!==0||p.fields.length===9)&&(kind!=='cross'||tier!==1||p.rows===5));if(available.length<2)throw Error('Zu wenige verschiedene Gitter '+kind);return [available[Math.floor(available.length/3)],available[available.length-1]].map((p,k)=>{used.add(p.fingerprint);const {fingerprint,...data}=p;return {...data,id:`${kind}-${tier*2+k+1}`,band:['Entdecker','Tüftler','Knobelmeister'][tier],reward:[10,15,25][tier]};});});
  chosen.forEach(validateNumberLevel);packs[kind]=chosen;audit.push({kind,pool:pool.map(a=>a.length),puzzles:chosen.map((p,i)=>({id:p.id,number:i+1,rows:p.rows,cols:p.cols,...p.metrics}))});console.log('SELECTED',kind,chosen.map(p=>p.metrics));
}
await writeFile(new URL('../puzzles/logic-levels.js',import.meta.url),`// Own interactive puzzles, seed 2026100715. No worksheet layouts copied.\nexport const logicPacks = ${JSON.stringify(packs,null,2)};\n`);
await writeFile(new URL('../docs/logic-pack-audit.json',import.meta.url),JSON.stringify({seed:2026100715,audit},null,2)+'\n');
