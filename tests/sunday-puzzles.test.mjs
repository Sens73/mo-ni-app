import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sundayEpisodes as allSundayEpisodes} from '../puzzles/sunday-levels.js';
import {createSundayPuzzleTypes} from '../puzzles/sunday-types.js';
import {extensionTypes} from '../puzzles/extension-library.js';
import {createPuzzleRegistry} from '../puzzles/registry.js';
import {createPuzzleProgress} from '../puzzles/progress.js';
import {createPuzzleGame} from '../puzzles/puzzle-view.js';
import {createSundayPublicationCheck} from '../scripts/sunday-publications.mjs';
import {compileTemplate} from '../scripts/check-beast-templates.mjs';
import {oracleNumeric} from '../scripts/logic-oracle.mjs';
import {countNumberPaths} from '../scripts/logic-layouts.mjs';
import {auditPoly,crossRank} from '../scripts/beast-geometry-audit.mjs';
import {countSundaySumdoku} from '../scripts/sunday-sumdoku-oracle.mjs';
import {solve} from '../puzzles/sumdoku.js';
const sunday=JSON.parse(await readFile(new URL('../data/sunday.json',import.meta.url))),currentPublications=JSON.parse(await readFile(new URL('../data/sunday-publications.json',import.meta.url)));
const sundayEpisodes=allSundayEpisodes.filter(episode=>episode.number<=6);
// Historical worksheet/video-gate scenarios use the three confirmations available on 8 October.
const seed={...currentPublications,confirmed:currentPublications.confirmed.filter(id=>sundayEpisodes.slice(0,3).some(e=>e.videoId===id))};
const currentTypes=createSundayPuzzleTypes(sunday,currentPublications,new Date('2026-10-12T08:00:00Z'));
assert.equal(currentTypes.find(t=>t.id==='polyominos').episodes[0].videoAvailable,true,'Published #04 solution video is available from the saved confirmation, including offline');
assert.equal(currentTypes.filter(t=>t.levels.length).length,4,'Unpublished #05 remains hidden');
const original=JSON.parse(await readFile(new URL('../scripts/beast-academy-templates.json',import.meta.url))),sumOriginal=JSON.parse(await readFile(new URL('../scripts/sunday-sumdoku-template.json',import.meta.url)));
const now=new Date('2026-10-08T08:00:00Z'),active=createSundayPuzzleTypes(sunday,seed,now),visible=active.filter(t=>t.levels.length);
assert.deepEqual(visible.map(t=>t.id),['sumdoku','zahlenpfade','zahlenkreuze']);assert.equal(visible.flatMap(t=>t.levels).length,15);assert.equal(extensionTypes.flatMap(t=>t.levels).length,73);
assert.deepEqual(sundayEpisodes.map(e=>e.levels.length),[5,5,5,5,5,5]);
let checked=0;
for(const e of sundayEpisodes)for(const [i,l] of e.levels.entries()){
 assert.equal(l.number,i+1);assert.equal(l.source.worksheetTask,i+1);assert.equal(l.source.transformation,'Keine; unveränderte Blattaufgabe');
 const t=active.find(t=>t.id===e.typeId),base=l.size?sumOriginal[i]:compileTemplate((l.kind==='deka'?JSON.parse(await readFile(new URL('../scripts/sunday-number-templates.json',import.meta.url))).deka:original[l.kind])[i]);
 for(const key of ['size','fields','givens','cages','bank','blocked','pieces'])if(base[key])assert.deepEqual(l[key],base[key],`${l.id} source ${key}`);
 const answers=l.size?countSundaySumdoku(l).answers:l.kind==='poly'?auditPoly(l).answers:l.kind==='number-path'?countNumberPaths(l).answers:oracleNumeric(l).answers;
 assert.equal(answers.length,1);assert.deepEqual(answers[0],l.solution);if(l.size)assert.deepEqual(solve(l),answers);if(l.kind==='cross')assert.ok(crossRank(l).rangeIndependent);
 assert.ok(t.model.inspect(l,t.model.normalizeBoard(l,l.kind==='poly'?{placements:l.solution}:{values:l.solution})).complete);checked++;
}
const registry=createPuzzleRegistry(active),p=createPuzzleProgress(registry);
for(const t of visible){
 const root={isConnected:true,innerHTML:'',addEventListener(){}};
 createPuzzleGame({types:active,read:(k,f)=>k==='puzzle-ui'?{screen:'levels',typeId:t.id}:f,write(){}}).mount(root);
 assert.deepEqual([...root.innerHTML.matchAll(new RegExp(`<strong>${t.label} (\\d+)</strong>`,'g'))].map(m=>+m[1]),[1,2,3,4,5]);
 assert.ok(root.innerHTML.includes(t.intro.example.puzzle));assert.ok(root.innerHTML.includes(t.intro.example.solution));
 assert.ok(!root.innerHTML.includes('Alle Aufgaben sind frei wählbar'));assert.ok(!root.innerHTML.includes('Sonntagsrätsel #'));
 p.select(t.id,t.levels[0].id);
 const playRoot={isConnected:true,innerHTML:'',addEventListener(){}};
 createPuzzleGame({types:active,read:(k,f)=>k==='puzzle-progress'?p.snapshot():k==='puzzle-ui'?{screen:'playing',typeId:t.id}:f,write(){}}).mount(playRoot);
 assert.ok(playRoot.innerHTML.includes('Lösungsvideo anschauen'));assert.ok(playRoot.innerHTML.includes(`data-sunday-id="${t.episodes[0].id}"`));
 for(const l of t.levels){p.select(t.id,l.id);assert.equal(p.finish().reward,0);for(let i=0;i<l.solution.length;i++)p.change({kind:'value',cell:i,value:l.solution[i]});assert.equal(p.finish().reward,l.reward);assert.equal(p.finish().reward,0);}
}
const restored=createPuzzleProgress(registry,{saved:p.snapshot()});assert.equal(restored.totals().completed,15);assert.equal(restored.totals().coins,p.totals().coins);
// Preserve all hidden types, old successes/notes, and their already earned coins.
const old=createPuzzleProgress(createPuzzleRegistry(extensionTypes));old.select('sumdoku','sumdoku-01');const oldLevel=old.current().level;for(let i=0;i<oldLevel.solution.length;i++)old.change({kind:'value',cell:i,value:oldLevel.solution[i]});old.finish();old.select('sumdoku','sumdoku-12');old.change({kind:'note',cell:1,value:3});
const migrated=createPuzzleProgress(registry,{saved:old.snapshot()});assert.equal(migrated.totals().coins,10);assert.equal(migrated.totals().completed,0);assert.deepEqual(migrated.record('sumdoku','sumdoku-12').board.notes[1],[3]);assert.equal(createPuzzleProgress(registry,{saved:migrated.snapshot()}).totals().coins,10);
// Legacy video-only releases require both Sunday time and public confirmation.
const allSeed={confirmed:sundayEpisodes.map(e=>e.videoId)};
assert.equal(createSundayPuzzleTypes(sunday,allSeed,new Date('2026-10-11T07:59:59Z')).filter(t=>t.levels.length).length,3);
assert.equal(createSundayPuzzleTypes(sunday,{confirmed:seed.confirmed},new Date('2026-10-11T08:00:00Z')).filter(t=>t.levels.length).length,3);
assert.equal(createSundayPuzzleTypes(sunday,allSeed,new Date('2026-10-11T08:00:00Z')).filter(t=>t.levels.length).length,4);
assert.equal(createSundayPuzzleTypes(sunday,allSeed,new Date('2026-10-18T08:00:00Z')).filter(t=>t.levels.length).length,5);
// The verified public worksheet unlocks #04 on Saturday, independently of its video.
const saturday=new Date('2026-10-10T08:00:00Z'),sheetTypes=createSundayPuzzleTypes(sunday,seed,saturday),poly=sheetTypes.find(t=>t.id==='polyominos');
assert.equal(createSundayPuzzleTypes(sunday,seed,new Date(saturday-1)).filter(t=>t.levels.length).length,3);
assert.deepEqual(sheetTypes.filter(t=>t.levels.length).map(t=>t.id),['sumdoku','zahlenpfade','zahlenkreuze','polyominos']);
assert.equal(sheetTypes.flatMap(t=>t.levels).length,20);assert.equal(poly.levels.length,5);assert.equal(poly.episodes[0].videoAvailable,false);
assert.equal(poly.episodes[0].videoNotice,'Lösungsvideo ab 11.10., 10:00 Uhr');assert.deepEqual(poly.levels.map(l=>l.source.stars),[1,1,2,3,3]);
const unconfirmedSheet={...seed,worksheets:[]};assert.equal(createSundayPuzzleTypes(sunday,unconfirmedSheet,saturday).filter(t=>t.levels.length).length,3);
const futureSheet={...seed,worksheets:[...seed.worksheets,{...seed.worksheets[0],id:sundayEpisodes[4].id,pdf:sundayEpisodes[4].pdf}]};assert.equal(createSundayPuzzleTypes(sunday,futureSheet,saturday).filter(t=>t.levels.length).length,4);
const wrongSheet={...seed,worksheets:seed.worksheets.map(w=>({...w,pdf:w.pdf+'-other'}))};assert.equal(createSundayPuzzleTypes(sunday,wrongSheet,saturday).filter(t=>t.levels.length).length,3);
const withoutDate=structuredClone(sunday);delete withoutDate.items.find(i=>i.number===4).worksheetAvailableAt;assert.equal(createSundayPuzzleTypes(withoutDate,seed,saturday).filter(t=>t.levels.length).length,3);
const polyRoot={isConnected:true,innerHTML:'',addEventListener(){}};const polyGame=createPuzzleGame({types:sheetTypes,read:(k,f)=>k==='puzzle-ui'?{screen:'levels',typeId:poly.id}:f,write(){}});polyGame.mount(polyRoot);
assert.deepEqual([...polyRoot.innerHTML.matchAll(/<strong>Polyomino (\d+)<\/strong>/g)].map(m=>+m[1]),[1,2,3,4,5]);assert.ok(polyRoot.innerHTML.includes('Regeln und Beispiel'));assert.ok(!polyRoot.innerHTML.includes('<details open'));
polyGame.progress.select(poly.id,poly.levels[0].id);const polyPlay={isConnected:true,innerHTML:'',addEventListener(){}};
createPuzzleGame({types:sheetTypes,read:(k,f)=>k==='puzzle-progress'?polyGame.progress.snapshot():k==='puzzle-ui'?{screen:'playing',typeId:poly.id}:f,write(){}}).mount(polyPlay);
assert.match(polyPlay.innerHTML,/data-viewer-type="pdf">Aufgabenblatt öffnen/);assert.match(polyPlay.innerHTML,/disabled>Lösungsvideo ab 11\.10\., 10:00 Uhr/);assert.ok(!polyPlay.innerHTML.includes('data-viewer-type="video"'));
const releasedTypes=createSundayPuzzleTypes(sunday,{...seed,confirmed:[...seed.confirmed,poly.episodes[0].videoId]},new Date('2026-10-11T08:00:00Z'));
assert.equal(createSundayPuzzleTypes(sunday,seed,new Date('2026-10-11T08:00:00Z')).find(t=>t.id===poly.id).episodes[0].videoAvailable,false);
assert.ok(polyGame.updateTypes(releasedTypes),'Video availability can update without any new puzzle IDs');assert.equal(polyGame.progress.current().level.id,poly.levels[0].id);
const releasedPlay={isConnected:true,innerHTML:'',addEventListener(){}};createPuzzleGame({types:releasedTypes,read:(k,f)=>k==='puzzle-progress'?polyGame.progress.snapshot():k==='puzzle-ui'?{screen:'playing',typeId:poly.id}:f,write(){}}).mount(releasedPlay);assert.match(releasedPlay.innerHTML,/data-viewer-type="video">Lösungsvideo anschauen/);
const expandedProgress=createPuzzleProgress(createPuzzleRegistry(sheetTypes),{saved:p.snapshot()});assert.equal(expandedProgress.totals().completed,15);assert.equal(expandedProgress.totals().coins,p.totals().coins);
for(const l of poly.levels){expandedProgress.select(poly.id,l.id);l.solution.forEach((placement,piece)=>{expandedProgress.change({kind:'choose',value:piece});for(let turn=0;turn<placement.turn;turn++)expandedProgress.change({kind:'rotate'});if(placement.flip)expandedProgress.change({kind:'flip'});expandedProgress.change({kind:'place',cell:placement.anchor});});assert.equal(expandedProgress.finish().reward,l.reward);assert.equal(expandedProgress.finish().reward,0);}
assert.equal(expandedProgress.totals().completed,20);
const wrongFeed=structuredClone(sunday);wrongFeed.items.find(i=>i.number===1).videoId='xxxxxxxxxxx';assert.equal(createSundayPuzzleTypes(wrongFeed,seed,now).filter(t=>t.levels.length).length,2);
// A repeated type continues the visible numbering; worksheet numbers and IDs stay unchanged.
const repeat={...structuredClone(sundayEpisodes[0]),id:'sunday-repeat',number:6,videoId:'abcdefghijk',publishedAt:'2026-10-08T00:00:00Z'};repeat.levels=repeat.levels.map((l,i)=>({...l,id:`repeat-${i}`,episodeId:repeat.id,band:'Sonntagsrätsel #6'}));
const repeatFeed={items:[...sunday.items,repeat]},repeatTypes=createSundayPuzzleTypes(repeatFeed,{confirmed:[...seed.confirmed,repeat.videoId]},now,[...sundayEpisodes,repeat]);assert.equal(repeatTypes[0].levels.length,10);
const repeatRoot={isConnected:true,innerHTML:'',addEventListener(){}};createPuzzleGame({types:repeatTypes,read:(k,f)=>k==='puzzle-ui'?{screen:'levels',typeId:'sumdoku'}:f,write(){}}).mount(repeatRoot);assert.deepEqual([...repeatRoot.innerHTML.matchAll(/<strong>Sumdoku (\d+)<\/strong>/g)].map(m=>+m[1]),[1,2,3,4,5,6,7,8,9,10]);assert.deepEqual(repeat.levels.map(l=>l.number),[1,2,3,4,5]);
// A video probe is necessary; failed/unknown/private responses cannot unlock.
let time=Date.parse('2026-10-11T07:59:59Z'),calls=[];const checker=createSundayPublicationCheck({confirmed:seed.confirmed,clock:()=>time,probe:async id=>{calls.push(id);return false;}});await checker(sunday);assert.equal(calls.length,0);time+=1000;assert.equal((await checker(sunday)).confirmed.length,3);assert.deepEqual(calls,[sundayEpisodes[3].videoId]);
const published=createSundayPublicationCheck({confirmed:seed.confirmed,worksheets:seed.worksheets,clock:()=>time,probe:async()=>true});const publicationResult=await published(sunday);assert.equal(publicationResult.confirmed.length,4);assert.deepEqual(publicationResult.worksheets,seed.worksheets);
// Refresh after navigating away retains the current puzzle and entered notes.
const game=createPuzzleGame({types:active,read:(_,f)=>f,write(){}});game.progress.select('sumdoku','sunday-01-task-1');game.progress.change({kind:'note',cell:0,value:2});assert.ok(game.updateTypes(repeatTypes));assert.deepEqual(game.progress.current().board.notes[0],[2]);
console.log(`${checked} original worksheet puzzles independently unique; 20 released worksheet tasks completed; separate worksheet/video gates, repeated episodes, paper numbers, stock archive and progress checked.`);
// Content arrives after initial boot: last selected task and UI must survive
// the temporary empty active catalogue, which still stores all retired records.
const savedTask=createPuzzleProgress(registry);savedTask.select('sumdoku','sunday-01-task-5');savedTask.change({kind:'note',cell:0,value:2});
const boot=createPuzzleGame({types:createSundayPuzzleTypes(),read:(k,f)=>k==='puzzle-progress'?savedTask.snapshot():k==='puzzle-ui'?{screen:'playing',typeId:'sumdoku',selected:0}:f,write(){}});
assert.equal(boot.progress.current(),null);assert.ok(boot.updateTypes(active));assert.equal(boot.progress.current().level.id,'sunday-01-task-5');assert.deepEqual(boot.progress.current().board.notes[0],[2]);
const bootRoot={isConnected:true,innerHTML:'',addEventListener(){}};boot.mount(bootRoot);assert.ok(bootRoot.innerHTML.includes('Sumdoku 5'));assert.ok(bootRoot.innerHTML.includes('data-puzzle-cell="0"'));
assert.deepEqual(sundayEpisodes[1].levels.map(l=>l.source.stars),[1,2,3,4,5]);assert.deepEqual(sundayEpisodes[2].levels.map(l=>l.sourceBlocks.length),[0,0,0,2,17]);
// A last played puzzle from another type must not replace the selected type page at boot.
savedTask.select('zahlenkreuze','sunday-03-task-1');savedTask.change({kind:'note',cell:0,value:2});
const selectedType=createPuzzleGame({types:createSundayPuzzleTypes(),read:(k,f)=>k==='puzzle-progress'?savedTask.snapshot():k==='puzzle-ui'?{screen:'levels',typeId:'sumdoku'}:f,write(){}});
assert.ok(selectedType.updateTypes(active));const selectedRoot={isConnected:true,innerHTML:'',addEventListener(){}};selectedType.mount(selectedRoot);
assert.ok(selectedRoot.innerHTML.includes('<h2>Sumdoku</h2>'));assert.equal(selectedType.progress.current().level.id,'sunday-03-task-1');
// The explicitly approved local preview may show #05 before the public upload;
// the same data on a public host and the solution video retain their gates.
const previewNow=new Date('2026-10-17T23:59:00Z');
// The V0.14 base already contains the released fifth worksheet. Keep an explicit
// pre-publication fixture for the preview-only gate instead of changing live data.
const fifthWorksheet=currentPublications.worksheets.find(w=>w.id==='sonntagsraetsel-05-differenzpyramiden');
assert.ok(fifthWorksheet);
assert.equal(createSundayPuzzleTypes(sunday,currentPublications,previewNow).filter(t=>t.levels.length).length,5);
const beforeWorksheetPublication={...currentPublications,worksheets:currentPublications.worksheets.filter(w=>w!==fifthWorksheet),previewWorksheets:[fifthWorksheet]};
assert.equal(createSundayPuzzleTypes(sunday,beforeWorksheetPublication,previewNow).filter(t=>t.levels.length).length,4);
const previewTypes=createSundayPuzzleTypes(sunday,beforeWorksheetPublication,previewNow,undefined,{allowPreviewWorksheets:true});
const pyramid=previewTypes.find(t=>t.id==='differenzpyramiden');
assert.equal(previewTypes.flatMap(t=>t.levels).length,25);
assert.equal(pyramid.levels.length,5);assert.deepEqual(pyramid.levels.map(l=>l.source.stars),[1,2,3,4,5]);
assert.equal(pyramid.episodes[0].videoAvailable,false);
assert.equal(pyramid.episodes[0].videoNotice,'Lösungsvideo ab 18.10., 10:00 Uhr');
const invalidPreview={...beforeWorksheetPublication,previewWorksheets:beforeWorksheetPublication.previewWorksheets.map(w=>({...w,pdf:w.pdf+'-wrong'}))};
assert.equal(createSundayPuzzleTypes(sunday,invalidPreview,previewNow,undefined,{allowPreviewWorksheets:true}).find(t=>t.id===pyramid.id).levels.length,0);
const previewProgress=createPuzzleProgress(createPuzzleRegistry(previewTypes),{saved:p.snapshot()});
assert.equal(previewProgress.totals().coins,p.totals().coins);
for(const l of pyramid.levels){
 previewProgress.select(pyramid.id,l.id);
 const root={isConnected:true,innerHTML:'',addEventListener(){}};
 createPuzzleGame({types:previewTypes,read:(k,f)=>k==='puzzle-progress'?previewProgress.snapshot():k==='puzzle-ui'?{screen:'playing',typeId:pyramid.id}:f,write(){}}).mount(root);
 assert.match(root.innerHTML,/Aufgabenblatt öffnen/);assert.match(root.innerHTML,/disabled>Lösungsvideo ab 18\.10\., 10:00 Uhr/);
 l.solution.forEach((value,cell)=>previewProgress.change({kind:'value',cell,value}));
 assert.equal(previewProgress.finish().reward,l.reward);assert.equal(previewProgress.finish().reward,0);
}
assert.equal(previewProgress.totals().completed,20);
assert.equal(createPuzzleProgress(createPuzzleRegistry(previewTypes),{saved:previewProgress.snapshot()}).totals().coins,previewProgress.totals().coins);
const previewCheck=createSundayPublicationCheck({confirmed:currentPublications.confirmed,previewWorksheets:beforeWorksheetPublication.previewWorksheets,clock:()=>previewNow.getTime(),probe:async()=>false});
assert.deepEqual((await previewCheck(sunday)).previewWorksheets,beforeWorksheetPublication.previewWorksheets);
console.log('Local #05 opt-in, 25 visible tasks, five pyramid completions, preserved rewards and separate public/video gates verified.');
