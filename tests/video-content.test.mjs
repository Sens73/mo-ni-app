import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ag56Dates, isoWeek, videosFor, kangarooVideosFor, kangarooCardLabel, withAg56Dates} from '../video-content.js';
import {matchesAudience} from '../audience.js';
import {parsePlaylistHtml, readPublicPlaylist, readApiPlaylist, makeCollections, synchronize} from '../scripts/sync-video-playlists.mjs';

const serverImporter=await import('../../../Serverautomatisierung/sync-video-playlists.mjs');
const content=JSON.parse(await readFile(new URL('../data/content.json',import.meta.url),'utf8'));
const dates=ag56Dates(content.ag56Schedule);
assert.equal(dates[0].date,'2026-11-02');
assert.equal(dates[0].number,56);
assert.equal(isoWeek('2026-12-28'),53);
assert.equal(isoWeek('2027-01-04'),1);
assert.equal(isoWeek('2027-01-11'),2);
assert.equal(dates.find(d=>d.date>'2027-01-01').date,'2027-01-18');
assert.equal(dates.find(d=>d.date>'2027-03-21').date,'2027-04-12');
assert.ok(!dates.some(d=>d.date==='2027-02-01'));
dates.forEach((d,i)=>{
  assert.equal(new Date(`${d.date}T12:00Z`).getUTCDay(),1);
  assert.equal(isoWeek(d.date)%2,1);
  assert.ok(!content.ag56Schedule.holidays.some(h=>d.date>=h.start&&d.date<=h.end));
  assert.equal(d.number,56+i);
});
assert.deepEqual(withAg56Dates(withAg56Dates(content)),withAg56Dates(content),'No duplicated dates on reload');
assert.deepEqual(withAg56Dates(content).dates.filter(d=>!d.id.startsWith('ag-56-')),content.dates);
assert.equal(matchesAudience({category:'matheplus',grades:[7]},'56'),true);
assert.equal(matchesAudience({category:'matheplus',grades:[7]},'34'),false);
assert.equal(matchesAudience({category:'olympiade',grades:[7]},'56'),false);

const config={collections:[{key:'test',title:'Test',description:'',sources:[{id:'source',title:'Quelle',grades:[5]},{id:null,title:'Offen',grades:[6]}]}]};
const video={videoId:'abcdefghijk',title:'Aufgabe 2026'};
const html=count=>`<script>var ytInitialData = ${JSON.stringify({playlistSidebarPrimaryInfoRenderer:{stats:[{simpleText:`${count} Videos`}]},items:[{lockupViewModel:{contentType:'LOCKUP_CONTENT_TYPE_VIDEO',contentId:video.videoId,metadata:{lockupMetadataViewModel:{title:{content:video.title}}}}},{playlistVideoRenderer:{videoId:video.videoId,title:{simpleText:video.title},isPlayable:true}}]})};</script>`;
assert.equal(parsePlaylistHtml(html(2)).length,1,'One card for a duplicate playlist video');
assert.throws(()=>parsePlaylistHtml(html(3)),/unvollständig/);
assert.throws(()=>parsePlaylistHtml('consent page'),/keine lesbaren/);
const merged=makeCollections(config,new Map([['source',[video]]]));
assert.deepEqual(serverImporter.makeCollections(config,new Map([['source',[video]]])).collections,merged.collections,'Server and local import preserve the same metadata');
assert.deepEqual(merged.collections.test.pendingGrades,[6]);
assert.equal(videosFor(merged.collections.test,'5','2026').length,1);
assert.equal(videosFor(merged.collections.test,'6').length,0);
const olympiadConfig = {collections:[{...config.collections[0],key:"olympiad56",sources:[
  config.collections[0].sources[0], {id:"grade6",title:"Klasse 6",grades:[6]}
]}]};
const oldOlympiadVideo = {...video,publishedAt:"2023-11-05T11:01:19Z"};
const newerGrade5 = {videoId:"12345678901",title:"Klasse 5",publishedAt:"2026-11-06T13:00:01Z"};
const latestGrade6 = {videoId:"lmnopqrstuv",title:"Klasse 6",publishedAt:"2026-11-06T13:00:02Z"};
const scheduledVideo = {videoId:"scheduled01",title:"Geplant",publishedAt:"2099-11-07T13:00:00Z"};
const olympiadSources = new Map([["source",[oldOlympiadVideo,newerGrade5,scheduledVideo]],["grade6",[latestGrade6]]]);
const olympiadCollection = makeCollections(olympiadConfig,olympiadSources).collections.olympiad56;
assert.deepEqual(videosFor(olympiadCollection).map(item=>item.videoId),[latestGrade6.videoId,newerGrade5.videoId,video.videoId]);
assert.deepEqual(videosFor(olympiadCollection,"5").map(item=>item.videoId),[newerGrade5.videoId,video.videoId]);
assert.deepEqual(serverImporter.makeCollections(olympiadConfig,olympiadSources).collections.olympiad56,olympiadCollection);
assert.throws(()=>makeCollections(olympiadConfig,new Map([["source",[video]],["grade6",[latestGrade6]]])),/Veröffentlichungsdatum/);
const curatedConfig={...config,presentation:{abcdefghijk:{displayTitle:'Würfel bauen',task:'B4',year:'2020'}}};
const curated=makeCollections(curatedConfig,new Map([['source',[video]]]));
assert.equal(curated.collections.test.videos[0].title,video.title,'Source title remains unchanged');
assert.equal(videosFor(curated.collections.test,'all','2020 B4').length,1,'Search matches year plus verified task code');
assert.equal(videosFor(curated.collections.test,'all','Würfel').length,1,'Search matches the concise card heading');
assert.equal(makeCollections(config,new Map([['source',[{...video,title:'B6 Känguru 2018 | Uhrzeit auf den Kopf gestellt'}]]])).collections.test.videos[0].displayTitle,'Uhrzeit auf den Kopf gestellt','New videos get a usable heading without a new app package');
const actual=JSON.parse(await readFile(new URL('../data/video-playlists.json',import.meta.url),'utf8'));
const tasks=actual.collections.kangaroo56.videos;
const primarySource=JSON.parse(await readFile(new URL('../docs/quellen-kaenguru-34/playlists-2026-10-11.json',import.meta.url),'utf8'));
const primary=actual.collections.kangaroo34;
assert.equal(primarySource.playlistEntryCount,125,'The entire primary playlist includes its continuation page');
assert.equal(primarySource.entries.length,125);
assert.equal(primarySource.initialEntries,100);
assert.equal(primarySource.duplicates.length,2);
assert.equal(primary.videos.length,123,'Duplicate playlist entries must not create duplicate cards');
for (const [grades,label] of [[[3,4],"Klasse 3 und 4"],[[5,6],"Klasse 5 und 6"],[[7,8],"Klasse 7 und 8"],[[9,10],"Klasse 9 und 10"],[[11,12,13],"Klasse 11 bis 13"]]) {
  assert.equal(kangarooCardLabel({grades,year:"2000",task:"B7"}),`${label} | 2000 B7`,"All Känguru audiences use the requested caption and separator");
}
assert.deepEqual(primary.videos.slice(0,3).map(v=>[v.videoId,v.year,v.task]),[["A50i7jbAlxw","2026","B1"],["eeVYGZHXy7M","2026","A7"],["ERcdCO1cemI","2026","A5"]],"First three original videos match the official 2026 tasks");
assert.deepEqual(kangarooVideosFor(primary,["34"],["2026"],"",["B"]).map(v=>v.videoId),["A50i7jbAlxw"],"The previously missing B1 appears under B");
assert.deepEqual(kangarooVideosFor(primary,["34"],["2026"],"",["A"]).map(v=>v.videoId),["eeVYGZHXy7M","ERcdCO1cemI"],"Both newly identified A tasks appear under A");

assert.deepEqual(primary.videos.map(v=>({videoId:v.videoId,title:v.title})),primarySource.videos,'All unique primary videos and original titles remain in source order');
assert.ok(primary.videos.every(v=>v.grades.join(',')==='3,4' && v.year && v.url.endsWith(v.videoId)));
assert.equal(kangarooVideosFor(primary,['34']).length,123);
assert.equal(kangarooVideosFor(primary,['56']).length,0,'Primary videos stay separate from the older class collection');
assert.equal(kangarooVideosFor(primary,['34'],['2021'],'',['B']).length,7,'Year and B filters include the tasks whose short titles lack metadata');
assert.equal(kangarooVideosFor(primary,['34'],['2021'],'musliriegel B8')[0]?.videoId,'6-qMxSW_ado');
assert.equal(primary.videos.find(v=>v.videoId==='v4Lj6kAh1UE').task,'C8','Verified description restores the missing task label');
assert.deepEqual(kangarooVideosFor(primary,['34'],['2025'],'',['A']).map(v=>v.videoId),['VgGT3ONn0X4'],'A full competition recording covers A as well as B and C');
assert.equal(kangarooVideosFor(primary,['34'],['2001'],'',['B']).length,0,'Impossible selections are really empty');
const primaryConfig=JSON.parse(await readFile(new URL('../data/video-sources.json',import.meta.url),'utf8'));
assert.deepEqual(makeCollections({collections:primaryConfig.collections.filter(c=>c.key==='kangaroo34'),presentation:primaryConfig.presentation},new Map([[primarySource.id,primarySource.videos]])).collections.kangaroo34,primary,'Future imports keep the source-verified year and task corrections');
assert.equal(tasks.length,61);
const actualCubeIds=videosFor(actual.collections.kangaroo56,'all','Würfel').map(v=>v.videoId);
assert.ok(actualCubeIds.length>0,'Existing cube tasks are searchable');
assert.deepEqual(videosFor(actual.collections.kangaroo56,'all','wurfel').map(v=>v.videoId),actualCubeIds,'Missing umlaut dots find the same real cards as in the AG and Sunday searches');
assert.deepEqual(videosFor(actual.collections.kangaroo56,'all','wu\u0308rfel').map(v=>v.videoId),actualCubeIds,'Decomposed umlauts find the same real cards');
assert.equal(videosFor(actual.collections.kangaroo56,'all','wurfel 2020 B5')[0]?.displayTitle,'Würfel bauen','Accent-tolerant topic search still combines year and task filters');
assert.ok(tasks.every(v=>v.year && /^[A-C][1-9]$/.test(v.task) && v.displayTitle.length<=45),'Every existing Känguru card has year, task and concise heading');
assert.equal(tasks.find(v=>v.videoId==='B44wd2defvE').task,'B4','Task number follows the task image, not the erroneous YouTube title');
assert.equal(tasks.find(v=>v.videoId==='AZEylhtu6so').task,'C5');
assert.equal(tasks.find(v=>v.videoId==='aEjS0BcmRgI').year,'2021');
const senior=actual.collections.kangaroo713;
assert.equal(senior.videos.length,90);
assert.equal(kangarooVideosFor(senior,'78').length,37);
assert.equal(kangarooVideosFor(senior,'910').length,22);
assert.equal(kangarooVideosFor(senior,'1113').length,31);
assert.ok(kangarooVideosFor(senior,'910','2024','A10').some(v=>v.videoId==='FA_PUOrZL1Y'),'Two-digit task codes remain searchable');
assert.ok(kangarooVideosFor(senior,'78','2022','B10').some(v=>v.videoId==='lOc9DqOGvXY'));
assert.equal(kangarooVideosFor(senior,'78','2025','B10').length,1);
assert.equal(kangarooVideosFor(senior,'78','2025','gibt-es-nicht').length,0);
const filterExample={videos:[
  {videoId:'first',title:'Würfel',grades:[7,8],year:'2022',task:'A8'},
  {videoId:'second',title:'Würfel',grades:[9,10],year:'2023',task:'B10'},
  {videoId:'third',title:'Würfel',grades:[11,12,13],year:'2022',task:'C1'},
  {videoId:'fourth',title:'Dreieck',grades:[7,8],year:'2023',task:'C2'},
  {videoId:'stream',title:'Livestream',grades:[7,8],year:'2022'}
]};
const filteredIds=(groups,years,query,tasks)=>kangarooVideosFor(filterExample,groups,years,query,tasks).map(video=>video.videoId);
assert.deepEqual(filteredIds([],[],'',[]),['first','second','third','fourth','stream'],'Unfiltered archive retains videos without a task code');
assert.deepEqual(filteredIds(['78','910'],['2022','2023'],'wurfel',['A','B']),['first','second'],'OR within each dimension, AND between dimensions and accent-tolerant search');
assert.deepEqual(filteredIds(['78'],['2022'],'',['A']),['first'],'Three filter dimensions combine and exclude unclassified livestreams');
assert.deepEqual(filteredIds(['78'],['2022'],'',['B']),[],'Impossible combinations return a real empty result');
assert.deepEqual(filteredIds([],['2023'],'',['B','C']),['second','fourth'],'Multiple task groups and reset class selection work together');
assert.equal(kangarooVideosFor(actual.collections.kangaroo56,['56']).length,61,'Shared Känguru view also supports the existing class 5–6 collection');
assert.ok(kangarooVideosFor(senior,['910'],['2024'],'',['A']).some(v=>v.videoId==='FA_PUOrZL1Y'),'A10 belongs to the A group');
assert.equal(actual.collections.olympiad713.videos.length,0);
assert.deepEqual(actual.collections.olympiad713.pendingGrades,[7,8,9,10,11,12,13]);
assert.equal(actual.collections.fit713.videos.length,107);
assert.ok(videosFor(actual.collections.fit713,'all','Exponentialgleichung').length>0);
const sources=JSON.parse(await readFile(new URL('../docs/quellen-klassen-7-13/playlists-2026-10-06.json',import.meta.url),'utf8'));
for(const source of sources) {
  const collection=/Algebra/.test(source.title)?actual.collections.fit713:senior;
  const imported=collection.videos.filter(v=>v.playlistIds.includes(source.id));
  assert.deepEqual(imported.map(v=>({videoId:v.videoId,title:v.title})),source.videos,'Entire public playlist and original titles preserved in source order');
}
const publicFirst={playlistSidebarPrimaryInfoRenderer:{stats:[{simpleText:'2 Videos'}]},itemSectionRenderer:{contents:[{playlistVideoRenderer:{videoId:'abcdefghijk',title:{simpleText:'Erste'},isPlayable:true}},{continuationItemViewModel:{continuationCommand:{innertubeCommand:{continuationCommand:{token:'next'}}}}}]}};
const publicHtml=`<script>var ytInitialData = ${JSON.stringify(publicFirst)};</script><script>{"INNERTUBE_CLIENT_VERSION":"test"}</script>`;
const publicRequests=[];
const publicResult=await readPublicPlaylist({id:'source'},async (url,options)=>{
  publicRequests.push({url,options});
  return options?.method==='POST' ? {ok:true,json:async()=>({onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[{playlistVideoRenderer:{videoId:'lmnopqrstuv',title:{simpleText:'Zweite'},isPlayable:true}}]}}]})} : {ok:true,text:async()=>publicHtml};
});
assert.equal(publicResult.length,2);
assert.equal(publicRequests.length,2);
assert.equal(JSON.parse(publicRequests[1].options.body).continuation,'next');
await assert.rejects(readPublicPlaylist({id:'source'},async (url,options)=>options?.method==='POST'?{ok:true,json:async()=>({})}:{ok:true,text:async()=>publicHtml}),/unvollständig/,'Missing continuation must never silently truncate a playlist');
await assert.rejects(readPublicPlaylist({id:'source'},async (url,options)=>options?.method==='POST'?{ok:true,json:async()=>({continuationCommand:{token:'next'}})}:{ok:true,text:async()=>publicHtml}),/Wiederholte/);
const requests=[];
const apiVideos=await readApiPlaylist({id:'source'},'test-secret',async url=>{
  requests.push(new URL(url));
  return {ok:true,json:async()=> requests.length===1 ? {items:[{status:{privacyStatus:'public'},snippet:{title:'Erste',resourceId:{videoId:'abcdefghijk'}}}],nextPageToken:'second'} : {items:[{status:{privacyStatus:'private'},snippet:{title:'Private video',resourceId:{videoId:'12345678901'}}},{status:{privacyStatus:'public'},snippet:{title:'Zweite',resourceId:{videoId:'lmnopqrstuv'}}}]}};
});
assert.equal(apiVideos.length,2);
assert.equal(requests.length,2);
assert.equal(requests[1].searchParams.get('pageToken'),'second');
assert.equal(requests[0].searchParams.get('maxResults'),'50');
const temp=await mkdtemp(join(tmpdir(),'moni-video-test-'));
try {
  const configPath=join(temp,'config.json'),outputPath=join(temp,'videos.json');
  await writeFile(configPath,JSON.stringify(config));
  await writeFile(outputPath,'LAST GOOD');
  await mkdir(join(temp,'snapshots'));
  await writeFile(join(temp,'snapshots/source.html'),html(3));
  await assert.rejects(synchronize({configPath,outputPath,snapshotDirectory:join(temp,'snapshots')}),/unvollständig/);
  assert.equal(await readFile(outputPath,'utf8'),'LAST GOOD','Failed update must retain the full last good archive');
  await writeFile(join(temp,'snapshots/source.html'),html(2));
  await synchronize({configPath,outputPath,snapshotDirectory:join(temp,'snapshots'),dryRun:true});
  assert.equal(await readFile(outputPath,'utf8'),'LAST GOOD','Dry run must not change content');
  await synchronize({configPath,outputPath,snapshotDirectory:join(temp,'snapshots')});
  assert.equal(JSON.parse(await readFile(outputPath,'utf8')).collections.test.videos.length,1);
  const unchanged=await readFile(outputPath,'utf8');
  await synchronize({configPath,outputPath,snapshotDirectory:join(temp,'snapshots')});
  assert.equal(await readFile(outputPath,'utf8'),unchanged,'Unchanged source must not trigger an app content update');
  const singleGradeConfig = {collections:[{...config.collections[0],key:"olympiad56"}]};
  await writeFile(configPath,JSON.stringify(singleGradeConfig));
  const watchPath = join(temp,`snapshots/${video.videoId}.watch.html`);
  await writeFile(watchPath,'<script>{"publishDate":"2023-11-05T03:01:19-08:00"}</script>');
  const dated = await synchronize({configPath,outputPath,snapshotDirectory:join(temp,"snapshots")});
  assert.equal(dated.collections.olympiad56.videos[0].publishedAt,"2023-11-05T11:01:19.000Z");
  await rm(watchPath);
  assert.deepEqual(await synchronize({configPath,outputPath,snapshotDirectory:join(temp,"snapshots")}),dated);
  await writeFile(outputPath+'.lock','locked');
  await assert.rejects(synchronize({configPath,outputPath,snapshotDirectory:join(temp,'snapshots')}),/EEXIST/);
} finally {await rm(temp,{recursive:true,force:true});}
console.log(`Video sync: duplicates, pagination, private filtering, failure retention, dry run and lock verified. ${dates.length} holiday-safe AG dates; existing grade-7 MathePlus exception retained; 90 Känguru and 107 algebra videos for 7–13 verified.`);
