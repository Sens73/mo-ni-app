import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileTemplate} from './check-beast-templates.mjs';
import {countNumberPaths} from './logic-layouts.mjs';
import {oracleNumeric,independentFullCheck} from './logic-oracle.mjs';
import {auditPoly,crossRank} from './beast-geometry-audit.mjs';
import {countSundaySumdoku} from './sunday-sumdoku-oracle.mjs';
import {validateLevel,inspect} from '../puzzles/sumdoku.js';
const templates=JSON.parse(await readFile(new URL('sunday-number-templates.json',import.meta.url))),sum=JSON.parse(await readFile(new URL('sunday-sumdoku-template.json',import.meta.url)));
const sourceHashes=JSON.parse(await readFile(new URL('sunday-source-hashes.json',import.meta.url)));
const sunday=JSON.parse(await readFile(new URL('../data/sunday.json',import.meta.url))),audit=[],episodes=[];
const crossDecorations=JSON.parse(await readFile(new URL('sunday-cross-decorations.json',import.meta.url)));
const specs=[['sumdoku',1,'sumdoku'],['number-path',2,'zahlenpfade'],['cross',3,'zahlenkreuze'],['poly',4,'polyominos'],['pyramid',5,'differenzpyramiden'],['deka',6,'deka-dots']];
const {ordner}=await import('./orte.mjs'),{pathToFileURL}=await import('node:url');
const sourceRoot=pathToFileURL(ordner('Sonntagsrätsel mit MO und Ni')+'/Arbeitsblätter/');
for(const [kind,number,typeId] of specs){
 const item=sunday.items.find(i=>i.number===number);if(!item)throw Error('Missing Sunday metadata');
 const worksheet=`Sonntagsrätsel ${String(number).padStart(2,'0')} – ${item.title}.tex`;
 const sourceBytes=await readFile(new URL(worksheet,sourceRoot)),sha=createHash('sha256').update(sourceBytes).digest('hex');
 if(sourceHashes[worksheet]!==sha)throw Error(`Re-extract changed worksheet first: ${worksheet}`);
 const levels=[];
 for(const [index,t] of (kind==='sumdoku'?sum:templates[kind]).entries()){
  const l=kind==='sumdoku'?structuredClone(t):compileTemplate(t);
  if(kind==='sumdoku'&&l.source.sourceSha256!==sha)throw Error('Re-extract changed Sumdoku source first');
  if(kind==='cross')l.sourceBlocks=crossDecorations[index+1];
  l.id=`sunday-${String(number).padStart(2,'0')}-task-${index+1}`;l.number=index+1;l.band=item.code;
  l.episodeId=item.id;l.origin='sunday';l.source={...l.source,bookStars:kind==='sumdoku'?undefined:l.source.stars,stars:['sumdoku','number-path'].includes(kind)?index+1:l.source.stars,worksheet,worksheetTask:index+1,sourceSha256:sha,transformation:'Keine; unveränderte Blattaufgabe'};
  l.reward=10+5*(l.source.stars-1);
  let checked=kind==='sumdoku'?countSundaySumdoku(l):kind==='poly'?auditPoly(l):kind==='number-path'?countNumberPaths(l):oracleNumeric(l);
  if(checked.answers.length!==1)throw Error(`Not unique: ${l.id}`);
  l.solution=checked.answers[0];
  if(kind==='sumdoku'){validateLevel(l);if(!inspect(l,{values:l.solution}).complete)throw Error('Sumdoku mismatch');}
  else if(kind!=='poly'&&!independentFullCheck(l,l.solution))throw Error('Invalid full solution');
  const rank=kind==='cross'?crossRank(l):{};if(kind==='cross'&&!rank.rangeIndependent)throw Error('Cross depends on artificial upper bound');
  audit.push({id:l.id,episode:item.id,number:index+1,typeId,source:l.source,solutions:1,nodes:checked.nodes??checked.metrics?.nodes,...rank});levels.push(l);
 }
 episodes.push({id:item.id,number:item.number,title:item.title,typeId,publishedAt:item.publishedAt,videoId:item.videoId,video:item.video,pdf:item.pdf,levels});
 console.log(item.code,typeId,levels.length,'original tasks independently unique');
}
await writeFile(new URL('../puzzles/sunday-levels.js',import.meta.url),`// Unmodified Sunday worksheet tasks. Future episodes are publication-gated.\nexport const sundayEpisodes = ${JSON.stringify(episodes,null,2)};\n`);
await writeFile(new URL('../docs/sunday-puzzle-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
