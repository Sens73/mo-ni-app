// Browser regression: node tests/workbook-reader.browser.mjs <debug-port> <app-base-url>
import assert from 'node:assert/strict';
import {readFile,writeFile,cp} from 'node:fs/promises';
const targets=await fetch(`http://127.0.0.1:${process.argv[2] || '9232'}/json`).then(r=>r.json());
const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
let id=0;const pending=new Map();socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(m.error):resolve(m.result)}});
function command(method,params={}){const i=++id;socket.send(JSON.stringify({id:i,method,params}));return new Promise((resolve,reject)=>pending.set(i,{resolve,reject}))}
async function ev(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression){for(let i=0;i<100;i++){if(await ev(expression).catch(()=>false))return;await pause(200)}throw Error('Timeout: '+expression)}
await command('Page.enable');await command('Network.enable');await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
const origin=process.argv[3] || 'http://127.0.0.1:4198/';
await command('Page.navigate',{url:origin+'index.html?view=workbooks'});
await until('Boolean(document.querySelector(".workbook-actions"))');
assert.equal(await ev('document.querySelector(".workbook-actions a").getAttribute("target")'),null);
await ev('document.querySelector(".workbook-actions a").click()');
await until('document.querySelector("#reader-canvas")?.getAttribute("aria-label") === "Seite 1 von 57" && !document.querySelector("#reader-status").textContent');
assert.equal(await ev('document.querySelectorAll("canvas").length'),1);
assert.equal(await ev('document.querySelector("#reader-previous").disabled'),true);
assert.equal(await ev('document.documentElement.scrollWidth > innerWidth'),false);
let shot=await command('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/mo-ni-reader-portrait.png',Buffer.from(shot.data,'base64'));
await ev('document.querySelector("#reader-next").click()');
await until('document.querySelector("#reader-canvas").getAttribute("aria-label") === "Seite 2 von 57" && !document.querySelector("#reader-status").textContent');
await ev('document.querySelector("#reader-previous").click()');
await until('document.querySelector("#reader-canvas").getAttribute("aria-label") === "Seite 1 von 57" && !document.querySelector("#reader-status").textContent');
await ev('(()=>{const p=document.querySelector("#reader-page");p.value="6";p.dispatchEvent(new Event("change"));})()');
await until('document.querySelector("#reader-canvas").getAttribute("aria-label") === "Seite 6 von 57" && !document.querySelector("#reader-status").textContent');
const qrLinks=await ev('[...document.querySelectorAll("#reader-links a")].map(a=>a.href)');
assert.ok(qrLinks.some(u=>u.includes('iKPQYEVlyZU')));await ev('(()=>{const p=document.querySelector("#reader-page");p.value="7";p.dispatchEvent(new Event("change"));})()');
await until('document.querySelector("#reader-canvas").getAttribute("aria-label") === "Seite 7 von 57" && !document.querySelector("#reader-status").textContent');
const moreQrLinks=await ev('[...document.querySelectorAll("#reader-links a")].map(a=>a.href)');
assert.ok(moreQrLinks.some(u=>u.includes('ssXjpy-Hrz0')));assert.ok(moreQrLinks.some(u=>u.includes('wbGuqWN3L70')));
await ev('window.scrollTo(0,500)');assert.ok(await ev('document.querySelector(".reader-back").getBoundingClientRect().top >= 0'));
await ev('(()=>{const p=document.querySelector("#reader-page");p.value="57";p.dispatchEvent(new Event("change"));})()');
await until('document.querySelector("#reader-canvas").getAttribute("aria-label") === "Seite 57 von 57" && !document.querySelector("#reader-status").textContent');
assert.equal(await ev('document.querySelector("#reader-next").disabled'),true);
assert.equal(await ev('document.querySelectorAll("canvas").length'),1);
await command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
assert.equal(await ev('document.documentElement.scrollWidth > innerWidth'),false);
shot=await command('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/mo-ni-reader-landscape.png',Buffer.from(shot.data,'base64'));
await ev('document.querySelector(".reader-back").click()');
await until('Boolean(document.querySelector(".workbook-actions"))');
assert.match(await ev('location.href'),/view=workbooks/);
console.log('PDF im selben App-Fenster geöffnet; 57 Seiten erreichbar, vor/zurück und Seitensprung funktionieren. QR-Verknüpfungen erhalten, ein Canvas, Rückkehr zum Arbeitsheftbereich erfolgreich; Hoch-/Querformat ohne Überlauf.');
socket.close();
