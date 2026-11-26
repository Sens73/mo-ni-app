export function createSundayPublicationCheck({confirmed=[],worksheets=[],previewWorksheets=[],probe=publicVideo,clock=()=>Date.now()}={}){
 const known=new Set(confirmed),expires=new Map();let checkedAt=null;
 return async sunday=>{
  const now=clock();await Promise.all((sunday.items||[]).map(async item=>{
   if(!/^[\w-]{11}$/.test(item.videoId||'')||!Number.isFinite(Date.parse(item.publishedAt))||Date.parse(item.publishedAt)>now||known.has(item.videoId)||(expires.get(item.videoId)||0)>now)return;
   expires.set(item.videoId,now+300000);
   if(await probe(item.videoId).catch(()=>false))known.add(item.videoId);
  }));checkedAt=new Date(now).toISOString();return {confirmed:[...known],worksheets,previewWorksheets,checkedAt};
 };
}
async function publicVideo(id){
 const response=await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v='+id)}`,{signal:AbortSignal.timeout(4000)});
 if(!response.ok)return false;const metadata=await response.json();return metadata.provider_name==='YouTube'&&typeof metadata.html==='string'&&metadata.html.includes('/embed/'+id);
}
