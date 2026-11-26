import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.HOME + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:844,height:390},acceptDownloads:true});const page=await context.newPage();
const base=process.argv[2]||'http://127.0.0.1:4199/';
// The local flat test site uses public server PDFs; production uses the same origin.
if(base.includes('127.0.0.1')) await page.route(/https:\/\/www\.mo-ni\.de\/fileadmin\/.*\.pdf(?:\?.*)?$/,async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})});
for(const archive of ['mathe-ag','olympiade']) {
 const data=await context.request.get(base+archive+'.json').then(r=>r.json());
 await page.goto(base+'index.html?view=training&tab='+archive);
 const open=page.locator(`[data-resource-id="${data.items[0].id}"][data-viewer-type="pdf"]`);await open.click();
 await page.waitForFunction(()=>document.querySelector('#pdf-status')?.hidden===true,{},{timeout:60000});
 const url=page.url();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Herunterladen',exact:true}).click();const download=await pending;await download.saveAs('/tmp/mo-ni-release13/'+archive+'-download.pdf');assert.equal(await download.failure(),null);assert.equal(page.url(),url);await page.locator('dialog').waitFor({state:'detached'});
 await page.locator('[data-action="close-viewer"]').click();await open.waitFor();console.log(archive+': PDF-Ansicht, Download und Rückweg funktionieren.');
}
await page.goto(base+'workbook-view.html');await page.waitForFunction(()=>document.querySelector('#reader-canvas')?.getAttribute('aria-label')==='Seite 1 von 57'&&!document.querySelector('#reader-status').textContent);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'/tmp/mo-ni-release13/reader-landscape.png'});
await context.close();await browser.close();
