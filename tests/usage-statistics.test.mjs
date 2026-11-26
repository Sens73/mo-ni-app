import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createUsageStatistics, isStatisticsSourceAllowed, videoStatisticsTarget, pdfStatisticsTarget, STATISTICS_RELEASE, STATISTICS_EVENTS} from "../usage-statistics.js";
import {statisticsEmbedUrl, observeVideo} from "../video-statistics.js";

const base="https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?audience=34&view=home";
const config={provider:"umami",enabled:true,websiteId:"11111111-1111-4111-8111-111111111111",collectUrl:"https://gateway.umami.is/api/send"};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({href=base, release="v0.13.0", configuration=config, excluded=false, automated=false, denied=false, offline=false, fail=false}={}) {
  const saved=new Map(excluded?[["moni-statistics-excluded","1"]]:[]), requests=[], listeners={};
  const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const scope={location:new URL(href),navigator:{webdriver:automated,onLine:!offline},document:{documentElement:{dataset:{}},addEventListener:(key,fn)=>{listeners[key]=fn;}},
    get localStorage(){if(denied)throw Error("Storage denied");return storage;},
    fetch:async(url,options)=>{requests.push({url,options,body:JSON.parse(options.body)});if(fail)throw Error("Network failed");return {ok:true};}};
  const tracker=createUsageStatistics({scope,release,configuration});
  return {scope,saved,requests,listeners,tracker};
}
assert.equal(isStatisticsSourceAllowed(base,"v0.11.0-release-26"),true);
assert.equal(isStatisticsSourceAllowed(base,"v0.13.0"),true);
for(const href of ["http://localhost:4213/","http://192.168.1.2/","https://test.mo-ni.de/fileadmin/grundschule-app-test/","https://www.mo-ni.de/",
  base+"&stats=off",base+"&test=1",base+"&release=v0.14.0-preview-11",base+"&iphone-test=1",base+"&autoupdate=1"]){
  const f=fixture({href});assert.equal(f.tracker.appStarted(),false,href);assert.equal(f.requests.length,0);
}
for(const opts of [{release:"v0.14.0-preview-11"},{excluded:true},{automated:true},{offline:true},{configuration:{...config,enabled:false}},
  {configuration:{...config,websiteId:""}},{configuration:{...config,collectUrl:"https://evil.example/send"}}]) {
  const f=fixture(opts);assert.equal(f.tracker.appStarted(),false);assert.equal(f.requests.length,0);
}
const f=fixture();
f.tracker.registerContent({resources:[{title:"Mathe-AG 118",category:"mathe-ag",number:118,pdf:"https://www.mo-ni.de/fileadmin/test/118.pdf",video:"https://youtu.be/IMoSwfgSsz8"}],workbooks:{pdfUrl:"./MO65-Arbeitsheft-hash.pdf"}});
assert.equal(f.tracker.appStarted(),true);assert.equal(f.tracker.appStarted(),false);
f.scope.document.documentElement.dataset.moniAudience="713";
assert.equal(f.tracker.trackVideo("video_open","https://youtu.be/IMoSwfgSsz8?personal=secret"),true);
assert.equal(f.tracker.trackPdf("pdf_open","https://www.mo-ni.de/fileadmin/test/118.pdf?download=1&personal=secret"),true);
assert.equal(f.tracker.trackPdf("pdf_open","https://www.mo-ni.de/fileadmin/grundschule-app-test/MO65-Arbeitsheft-hash.pdf"),true);
f.listeners["moni-pdf-saved"]({detail:{url:"https://www.mo-ni.de/fileadmin/test/118.pdf"}});
await tick();
assert.equal(f.requests.length,5);
assert.equal(f.requests[0].body.payload.name,"App geladen");
assert.equal(f.requests[1].body.payload.data.Klassenbereich,"Klasse 7 bis 13");
assert.equal(f.requests[1].body.payload.data.Inhalt,"Mathe-AG 118");
assert.equal(f.requests[2].body.payload.data.Kennung,"pdf:/fileadmin/test/118.pdf");
assert.equal(f.requests[3].body.payload.data.Inhalt,"MO65-Arbeitsheft");
for(const req of f.requests){
  assert.equal(req.url,config.collectUrl);assert.equal(req.options.credentials,"omit");assert.equal(req.body.type,"event");
  assert.equal(req.body.payload.id,undefined);assert.equal(req.body.payload.referrer,"");assert.equal(req.body.payload.screen,"0x0");
  assert.equal(req.body.payload.url,"/fileadmin/grundschule-app-test/index.html?audience="+(req.body.payload.data.Klassenbereich.includes("7 bis")?"713":"34"));
  assert.equal(JSON.stringify(req.body).includes("secret"),false);assert.equal(req.options.headers.Authorization,undefined);
}
assert.equal(f.tracker.pendingCount(),0);
f.tracker.exclude();assert.equal(f.tracker.trackVideo("video_open","https://youtu.be/IMoSwfgSsz8"),false);assert.equal(f.saved.get("umami.disabled"),"1");
const optout=fixture({href:base+"&stats=off",denied:true});assert.equal(optout.tracker.appStarted(),false);
const denied=fixture({denied:true});assert.equal(denied.tracker.appStarted(),true);await tick();assert.equal(denied.requests.length,1);
const failed=fixture({fail:true});failed.tracker.appStarted();await tick();assert.equal(failed.requests.length,1);assert.equal(failed.tracker.pendingCount(),0);
assert.equal(videoStatisticsTarget("https://youtu.be/IMoSwfgSsz8"),"video:IMoSwfgSsz8");
assert.equal(videoStatisticsTarget("https://youtube.com/live/IMoSwfgSsz8"),"video:IMoSwfgSsz8");
assert.equal(videoStatisticsTarget("https://evil.example/watch?v=IMoSwfgSsz8"),null);
assert.equal(pdfStatisticsTarget("javascript:alert(1)",base),null);
const observed=[], opening={};let events, destroyed=0;
const tracker={enabled:()=>true,trackVideo:(metric,url)=>observed.push([metric,url])};
const scope={location:{origin:"https://www.mo-ni.de"}};
const loadApi=async()=>({Player:class{constructor(frame,options){events=options.events;}destroy(){destroyed++;}}});
const frame={isConnected:true};
let dispose=observeVideo(frame,"https://youtu.be/IMoSwfgSsz8",opening,{tracker,scope,loadApi});
await tick();events.onStateChange({data:1});events.onStateChange({data:2});events.onStateChange({data:1});
assert.deepEqual(observed.map(x=>x[0]),["video_open","video_start"]);
dispose();events.onStateChange({data:1});assert.equal(destroyed,1);
dispose=observeVideo(frame,"https://youtu.be/IMoSwfgSsz8",opening,{tracker,scope,loadApi});await tick();events.onStateChange({data:1});dispose();
assert.equal(observed.length,2,"Redrawing the same opening cannot count another open or playback.");
const embedded=statisticsEmbedUrl("https://www.youtube-nocookie.com/embed/IMoSwfgSsz8",tracker,scope);
assert.equal(new URL(embedded).searchParams.get("enablejsapi"),"1");assert.equal(new URL(embedded).searchParams.get("origin"),scope.location.origin);
assert.equal(statisticsEmbedUrl("https://www.youtube-nocookie.com/embed/IMoSwfgSsz8",{enabled:()=>false},scope).includes("enablejsapi"),false);
const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
const sw=await readFile(new URL("../service-worker.js",import.meta.url),"utf8");
assert.match(app,/usageStatistics\.appStarted\(\)/);assert.match(app,/statisticsPdfOpened/);
assert.match(sw,/statistics-test\.html/);assert.match(sw,/statistics-config\.js/);
assert.equal(Object.values(STATISTICS_EVENTS).length,5);
console.log("Validated five events, audience/content labels, preview/local/owner exclusions, no personal query data, failure isolation and single playback counting.");
