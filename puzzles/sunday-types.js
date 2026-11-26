import {extensionTypes} from './extension-library.js?v=0.14.0-release-4';
import {sundayEpisodes} from './sunday-levels.js?v=0.14.0-release-4';
import {sundayPresentation} from './sunday-presentation.js?v=0.14.0-release-4';
function matchesEpisode(episode,item){
 return Boolean(item&&item.id===episode.id&&item.videoId===episode.videoId&&item.pdf===episode.pdf&&item.pdf&&item.video);
}
export function sundayVideoAvailable(episode,item,confirmed,now=new Date()){
 return Boolean(matchesEpisode(episode,item)&&Number.isFinite(Date.parse(item.publishedAt))&&new Date(item.publishedAt)<=now&&confirmed.includes(item.videoId));
}
export function sundayEpisodeAvailable(episode,item,confirmed,now=new Date(),worksheets=[]){
 if(!matchesEpisode(episode,item))return false;
 const release=Date.parse(item.worksheetAvailableAt);
 const worksheetPublic=Number.isFinite(release)&&release<=now.getTime()&&worksheets.some(w=>w.id===item.id&&w.pdf===item.pdf&&/^[a-f0-9]{64}$/.test(w.sha256));
 return worksheetPublic||sundayVideoAvailable(episode,item,confirmed,now);
}
export function createSundayPuzzleTypes(sunday={},publications={},now=new Date(),episodes=sundayEpisodes,{allowPreviewWorksheets=false}={}){
 const confirmed=Array.isArray(publications.confirmed)?publications.confirmed:[];
 const worksheets=[...(Array.isArray(publications.worksheets)?publications.worksheets:[]),
  ...(allowPreviewWorksheets&&Array.isArray(publications.previewWorksheets)?publications.previewWorksheets.filter(w=>Number.isFinite(Date.parse(w.approvedAt))&&Date.parse(w.approvedAt)<=now.getTime()):[])];
 return extensionTypes.map(base=>{
  const all=episodes.filter(e=>e.typeId===base.id),visible=all.filter(e=>sundayEpisodeAvailable(e,sunday.items?.find(i=>i.id===e.id),confirmed,now,worksheets)).map(e=>{
   const item=sunday.items.find(i=>i.id===e.id),videoAvailable=sundayVideoAvailable(e,item,confirmed,now);
   const videoNotice=Date.parse(item.publishedAt)>now.getTime()?`Lösungsvideo ab ${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(item.publishedAt))} Uhr`:'Lösungsvideo folgt';
   return {...e,videoAvailable,videoNotice};
  });
  const levels=visible.flatMap(e=>e.levels),active=new Set(levels.map(l=>l.id));
  const retiredLevels=[...base.levels,...(base.retiredLevels||[]),...all.flatMap(e=>e.levels)].filter(l=>!active.has(l.id));
  return {...base,...sundayPresentation[base.id],levels,retiredLevels,sunday:true,episodes:visible,
   bandDescriptions:Object.fromEntries(visible.map(e=>[e.levels[0].band,'Dieselben fünf Aufgaben wie auf dem Aufgabenblatt. Wähle frei aus.'])),
   levelDetail:l=>`${base.levelDetail(l)}${l.source?.stars>0?' · '+'★'.repeat(l.source.stars):''}`};
 }).sort((a,b)=>(a.episodes[0]?.number??100)-(b.episodes[0]?.number??100));
}
