import {readFile,writeFile} from 'node:fs/promises';
import {numberLayout,pyramidLayout,countNumberPaths} from './logic-layouts.mjs';
import {oracleNumeric,independentFullCheck} from './logic-oracle.mjs';
import {auditMaze,auditPoly,crossRank} from './beast-geometry-audit.mjs';
export function compileTemplate(t){
 if(t.kind==='pyramid'){const n=t.height*(t.height+1)/2,l=pyramidLayout(t.height,Array(n).fill(0),t.givens);l.bank=t.bank;l.domains=l.fields.map((_,i)=>Object.hasOwn(t.givens,i)?[t.givens[i]]:[...new Set(t.bank)]);l.constraints.at(-1).numbers=t.bank;return {...l,source:t.source};}
 if(['poly','maze'].includes(t.kind))return structuredClone(t);
 return numberLayout(t.kind,{...t,maxNumber:t.kind==='cross'?200:undefined});
}
if(process.argv[1]?.endsWith('check-beast-templates.mjs')){
 const source=JSON.parse(await readFile(new URL('beast-academy-templates.json',import.meta.url))),cross=JSON.parse(await readFile(new URL('beast-cross-proof.json',import.meta.url))),out={};
 for(const [kind,templates]of Object.entries(source)){out[kind]=[];for(const t of templates){
  const l=compileTemplate(t);let result;
  if(kind==='cross'){
   const proof=cross.find(p=>p.source.task===t.source.task),rank=crossRank(l);
   if(!proof||!rank.rangeIndependent||!independentFullCheck(l,proof.solution))throw Error(`Ungültiger Kreuznachweis: ${t.source.task}`);
   result={answers:[proof.solution],...rank};
  }
  else if(kind==='maze')result=auditMaze(l);else if(kind==='poly')result=auditPoly(l);else if(kind==='number-path')result=countNumberPaths(l);else result=oracleNumeric(l);
  if(result.answers.length!==1)throw Error(`Vorlage nicht eindeutig: ${kind} ${t.source.task}`);
  out[kind].push({source:t.source,...result});console.log(kind,t.source.task,result.answers.length,result.nodes??result.metrics?.nodes??result.rank);
 }}
 await writeFile(new URL('beast-template-audit.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
}
