import {readFile,writeFile} from 'node:fs/promises';
import {compileTemplate} from './check-beast-templates.mjs';
import {numberLayout,countNumberPaths} from './logic-layouts.mjs';
import {oracleNumeric,independentFullCheck} from './logic-oracle.mjs';
import {auditMaze,auditPoly,crossRank} from './beast-geometry-audit.mjs';
const templates=JSON.parse(await readFile(new URL('beast-academy-templates.json',import.meta.url))),originalAudit=JSON.parse(await readFile(new URL('beast-template-audit.json',import.meta.url)));
const bands=['Entdecker','Tüftler','Knobelmeister'],rewards=[10,15,25],packs={},audit=[];
const sourceIndices={cross:[0,3,4],'number-path':[0,2,4],deka:[0,2,4],sudoku:[0,2,4],pyramid:[0,2,4],magic:[0,2,4],digit:[0,2,4],maze:[0,2,4],poly:[0,2,4]};
const valueMap=(object,fn)=>Object.fromEntries(Object.entries(object).map(([i,v])=>[i,fn(v)]));
function numericalVariant(base,answer,variant){
 const kind=base.kind,l=structuredClone(base);let values=[...answer],operation;
 if(kind==='pyramid'){
  const factor=variant+2;l.fields=l.fields.map(f=>variant?{...f,x:l.cols-f.x-f.w}:f);l.givens=valueMap(l.givens,v=>v*factor);l.bank=l.bank.map(v=>v*factor);l.domains=l.domains.map(a=>a.map(v=>v*factor));l.constraints.at(-1).numbers=l.bank;values=values.map(v=>v*factor);operation=`Zahlen × ${factor}${variant?'; waagerecht gespiegelt':''}`;
 }else{
  let mapField,mapNumber=v=>v;
  if(kind==='magic'){
   const digitMax=l.digits;mapNumber=v=>digitMax+1-v;mapField=f=>variant?f:{...f,x:f.y,y:f.x,w:f.h,h:f.w};
   l.sums=l.sums.map(s=>({...s,vertical:variant?s.vertical:!s.vertical,target:(digitMax+1)*s.weights.reduce((a,b)=>a+b,0)-s.target}));
   operation=`Ziffern ${digitMax+1} − Zahl${variant?'':'; an der Diagonalen gespiegelt'}`;
  }else if(kind==='sudoku'){
   mapNumber=v=>5-v;mapField=f=>variant?{...f,x:l.cols-f.x-f.w}:{...f,x:f.y,y:f.x};l.comparisons=l.comparisons.map(c=>({small:c.large,large:c.small}));operation=`Ziffern 5 − Zahl; ${variant?'waagerecht':'an der Diagonalen'} gespiegelt`;
  }else if(kind==='digit'){
   mapField=f=>variant?f:{...f,y:l.rows-f.y-f.h};if(variant)mapNumber=v=>9-v;
   if(!variant)l.circles=l.circles.map(c=>({...c,y:l.rows-c.y}));operation=variant?'Ziffern 9 − Zahl':'Senkrecht gespiegelt';
  }else{
   mapField=f=>variant?{...f,y:l.rows-f.y-f.h}:{...f,x:l.cols-f.x-f.w};
   if(kind==='cross'){const offset=variant?7:2;mapNumber=v=>v+offset;operation=`Zahlen + ${offset}; ${variant?'senkrecht':'waagerecht'} gespiegelt`;}
   else if(kind==='number-path'){if(variant)mapNumber=v=>l.fields.length+1-v;operation=`${variant?'Senkrecht gespiegelt; Zahlenfolge umgekehrt':'Waagerecht gespiegelt'}`;}
   else operation=`${variant?'Senkrecht':'Waagerecht'} gespiegelt`;
  }
  l.fields=l.fields.map(mapField);l.givens=valueMap(l.givens,mapNumber);values=values.map(mapNumber);
  if(kind==='cross')l.maxNumber=Math.ceil((Math.max(...values)+5)/10)*10;
  Object.assign(l,numberLayout(kind,l));
 }
 return {level:l,solution:values,operation};
}
function geometryVariant(base,variant){
 const l=structuredClone(base),oldCols=l.cols,oldRows=l.rows;
 const point=i=>[i%oldCols,Math.floor(i/oldCols)];
 const transform=([x,y])=>variant?[oldRows-1-y,x]:[oldCols-1-x,y];
 if(variant){l.cols=oldRows;l.rows=oldCols;}
 const cell=i=>{const [x,y]=transform(point(i));return y*l.cols+x;};
 l.blocked=l.blocked.map(cell).sort((a,b)=>a-b);
 if(l.kind==='maze'){l.start=cell(l.start);l.end=cell(l.end);l.turns=Object.fromEntries(Object.entries(l.turns).map(([i,v])=>[cell(+i),variant?v:v==='L'?'R':'L']));}
 return {level:l,operation:variant?'Um 90 Grad gedreht':'Waagerecht gespiegelt'};
}
for(const [kind,indices]of Object.entries(sourceIndices)){
 packs[kind]=[];
 for(const [tier,index]of indices.entries()){
  const template=templates[kind][index],base=compileTemplate(template),original=originalAudit[kind][index];
  if(original.answers.length!==1)throw Error(`Mehrdeutige Vorlage: ${kind} ${template.source.task}`);
  for(let variant=0;variant<2;variant++){
   const result=['maze','poly'].includes(kind)?geometryVariant(base,variant):numericalVariant(base,original.answers[0],variant),l=result.level;
   l.id=`ba1-${kind}-${tier*2+variant+1}`;l.band=bands[tier];l.reward=rewards[tier];l.source={...template.source,variant:result.operation};
   let verification;
   if(kind==='poly')verification=auditPoly(l);else if(kind==='maze')verification=auditMaze(l);else if(kind==='number-path')verification=countNumberPaths(l);else verification=oracleNumeric(l);
   if(verification.answers.length!==1)throw Error(`Nicht genau eine Lösung: ${l.id} (${verification.answers.length})`);
   l.solution=verification.answers[0];if(result.solution&&JSON.stringify(l.solution)!==JSON.stringify(result.solution))throw Error('Transformationsfehler '+l.id);
   if(!['poly','maze'].includes(kind)&&!independentFullCheck(l,l.solution))throw Error('Regelfehler '+l.id);
   const rank=kind==='cross'?crossRank(l):{};if(kind==='cross'&&!rank.rangeIndependent)throw Error('Zahlenbereich entscheidet '+l.id);
   l.metrics={difficultyBasis:'Beast Academy source stars',sourceStars:template.source.stars,solutions:1,empty:l.fields?l.fields.length-Object.keys(l.givens).length:undefined,...rank};
   packs[kind].push(l);audit.push({id:l.id,kind,number:tier*2+variant+1,band:l.band,source:l.source,solutions:1,nodes:verification.nodes??verification.metrics?.nodes,...rank});console.log(l.id,l.band,l.source.stars,verification.answers.length);
  }
 }
}
const numeric=Object.fromEntries(Object.entries(packs).filter(([k])=>!['poly','maze'].includes(k)));
await writeFile(new URL('../puzzles/beast-number-levels.js',import.meta.url),`// Variants of the documented Beast Academy structures; checked independently.\nexport const beastLogicPacks = ${JSON.stringify(numeric,null,2)};\n`);
await writeFile(new URL('../puzzles/beast-geometry-levels.js',import.meta.url),`// Exact-cover and Hamilton-route uniqueness verified before inclusion.\nexport const beastMazeLevels = ${JSON.stringify(packs.maze,null,2)};\nexport const beastPolyLevels = ${JSON.stringify(packs.poly,null,2)};\n`);
await writeFile(new URL('../docs/beast-pack-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
