import { createDivisorGame } from "../divisor-game-view.js";
import { createPuzzleGame } from "../puzzles/puzzle-view.js";
import { createSundayPuzzleTypes } from "../puzzles/sunday-types.js";
import { createNumberWhirlGame } from "../number-whirl-view.js";
import { createMentalMathGame } from "../mental-math-view.js";
import assert from "node:assert/strict";
import { usageStatistics } from "../usage-statistics.js";
import { statisticsEmbedUrl, observeVideo } from "../video-statistics.js";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as audience from "../audience.js";
import * as filters from "../journey-filters.js";
import * as presentation from "../material-presentation.js";
import * as videos from "../video-content.js";
import * as updates from "../app-updates.js";
import { contentAvailabilitySignature, sundayWorksheetIsAvailable } from "../content-updates.js";
import { prepareMaterialLink } from "../material-links.js";
import { shouldUseOriginalPdfPrint, prepareOriginalPdfPrint } from "../original-pdf-print.js";
import { createPrintManager } from "../print-manager.js";

const root = new URL("../", import.meta.url);
const source = (await readFile(new URL("app.js", root), "utf8")).replace(/^import .*;\n/gm, "");
function cardMarkup(markup, title) {
  return [...markup.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)]
    .map(match => match[0]).find(card => card.includes(`<h3>${title}</h3>`)) || "";
}
const content = JSON.parse(await readFile(new URL("data/content.json", root), "utf8"));
content.sunday = JSON.parse(await readFile(new URL("data/sunday.json", root), "utf8"));
content.journey = JSON.parse(await readFile(new URL("data/journey.json", root), "utf8"));
content.videoPlaylists = JSON.parse(await readFile(new URL("data/video-playlists.json", root), "utf8"));
content.puzzlePublications = JSON.parse(await readFile(new URL("data/sunday-publications.json", root), "utf8"));

// Run the actual app entry and event handlers; only browser transport is stubbed.
async function appHarness({ waitingWorker = null, focused = false, pdf = false, storage = {}, search = "?audience=34&view=home" } = {}) {
  let currentContent = structuredClone(content);
  let time = new Date("2026-10-10T07:59:00Z").getTime();
  let reloads = 0;
  let nativeDialogOpen = false;
  const documentEvents = new Map();
  const workerEvents = new Map();
  const frames = [];
  const renderJobs = [];
  const fetchJobs = [];
  const pdfFrames = [];
  const revoked = [];
  const pdfContainer = { isConnected: true };
  const pdfStatus = { isConnected: true, hidden: false, textContent: "" };
  const queueJob = (jobs, value) => new Promise((resolve, reject) => jobs.push({ ...value, resolve, reject }));
  const errors = [];
  const app = { innerHTML: "", querySelectorAll: () => [] };
  const toast = { textContent: "", classList: { add() {}, remove() {} } };
  const button = { matches: () => false };
  const printButton = {
    isConnected: true, disabled: false, focusCalls: 0,
    setAttribute(name) { if (name === "disabled") { this.disabled = true; document.activeElement = button; } },
    removeAttribute(name) { if (name === "disabled") this.disabled = false; },
    focus() { assert.equal(this.disabled, false, "The app restores focus only after re-enabling the print button."); this.focusCalls += 1; document.activeElement = this; }
  };
  const input = { matches: () => true };
  const document = {
    documentElement: {dataset: {}},
    activeElement: focused ? input : button,
    visibilityState: "visible",
    querySelector: selector => selector === "#app" ? app : selector === "#toast" ? toast : selector === "dialog[open]" && nativeDialogOpen ? {} : pdf && selector === "#pdf-pages" ? pdfContainer : pdf && selector === "#pdf-status" ? pdfStatus : pdf && selector === '[data-action="print-document"]' ? printButton : null,
    querySelectorAll: () => [],
    addEventListener: (name, handler) => documentEvents.set(name, handler),
    contains: () => true,
    body: { append(frame) { frame.isConnected = true; } },
    createElement(tag) {
      assert.equal(tag, "iframe");
      const listeners = new Map();
      const frame = {
        style: {}, isConnected: false, printCalls: 0,
        setAttribute() {},
        addEventListener: (name, handler) => listeners.set(name, handler),
        removeEventListener: name => listeners.delete(name),
        emit: name => listeners.get(name)?.(),
        remove() { this.isConnected = false; }
      };
      frame.contentWindow = { focus() { document.activeElement = frame; }, print() { frame.printCalls += 1; } };
      pdfFrames.push(frame);
      return frame;
    }
  };
  const registration = {
    waiting: waitingWorker,
    addEventListener() {},
    update: async () => {}
  };
  class TestDate extends Date {
    constructor(...values) { super(...(values.length ? values : [time])); }
    static now() { return time; }
  }
  const window = {
    navigator: { standalone: false, userAgent: pdf ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/26.0 Safari/605.1.15" : "test" },
    document,
    URL: { createObjectURL: () => `blob:https://app.test/${pdfFrames.length}`, revokeObjectURL: url => revoked.push(url) },
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval() {},
    scrollY: 120,
    scrollTo() {}
  };
  const context = vm.createContext({
    usageStatistics, statisticsEmbedUrl, observeVideo,
    createMentalMathGame, createNumberWhirlGame, createPuzzleGame, createSundayPuzzleTypes, createDivisorGame,
    ...audience, ...filters, ...presentation, ...videos, ...updates,
    prepareMaterialLink,
    contentAvailabilitySignature: value => contentAvailabilitySignature(value, new Date(time)),
    sundayWorksheetIsAvailable: value => sundayWorksheetIsAvailable(value, new Date(time)),
    createPrintManager: pdf ? createPrintManager : () => ({}),
    shouldUseOriginalPdfPrint, prepareOriginalPdfPrint,
    renderPdfDocument: options => queueJob(renderJobs, options),
    fetchPdfFile: options => queueJob(fetchJobs, options),
    document, window, URL, URLSearchParams, AbortController, AbortSignal, Intl, Date: TestDate,
    history: { replaceState() {} },
    localStorage: { getItem: key => storage[key] ?? null, setItem(key,value) { storage[key] = value; } },
    navigator: {
      onLine: true,
      userAgent: "test",
      serviceWorker: {
        controller: {},
        register: async () => registration,
        addEventListener: (name, handler) => workerEvents.set(name, handler)
      }
    },
    location: {
      search, hash: "", pathname: "/index.html", protocol: "http:",
      href: "http://localhost:4212/index.html?audience=34&view=home",
      reload: () => { reloads += 1; }
    },
    fetch: async path => ({ ok: true, json: async () => structuredClone(String(path).includes('publications') ? currentContent.puzzlePublications : currentContent) }),
    requestAnimationFrame: callback => { frames.push(callback); },
    setTimeout: () => 1,
    clearTimeout() {},
    console: pdf ? { ...console, error: error => errors.push(error) } : console
  });
  await vm.runInContext(source, context);
  await Promise.resolve();
  const run = script => vm.runInContext(script, context);
  return {
    run, app, document, renderJobs, fetchJobs, pdfFrames, revoked, printButton, pdfStatus, toast, errors,
    focus: () => { document.activeElement = input; },
    blur: () => { document.activeElement = button; },
    dialog: open => { nativeDialogOpen = open; },
    time: value => { time = new Date(value).getTime(); },
    incoming: change => { change(currentContent); },
    click: dataset => documentEvents.get('click')({preventDefault(){},target:{closest:selector=>
      (selector==='[data-audience]'&&dataset.audience || selector==='[data-view]'&&dataset.view || selector==='[data-game]'&&dataset.game || selector==='[data-play-sunday]'&&dataset.playSunday || selector==='[data-open-viewer]'&&dataset.openViewer!==undefined || selector==='[data-action]'&&dataset.action) ? {dataset,attributes:Object.entries(dataset).map(([name,value])=>({name:`data-${name.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,value})),getBoundingClientRect:()=>({top:80})} : null}}),
    controllerChanged: () => workerEvents.get("controllerchange")(),
    flushFrames: () => { while (frames.length) frames.shift()(); },
    get reloads() { return reloads; }
  };
}

const timed = await appHarness();
assert.match(timed.app.innerHTML, /Bereit für dein nächstes Mathe-Abenteuer/,
  "The actual startup succeeds after all update bindings have initialized");
const initialMarkup=timed.app.innerHTML;
timed.incoming(value=>{value.puzzlePublications.checkedAt='2026-10-10T08:00:00Z';});
await timed.run('refreshContent()');
assert.equal(timed.app.innerHTML,initialMarkup,'A repeated public-video check is not a new-content update');
assert.equal(timed.toast.textContent,'');
timed.run("state.view = 'sunday'; render();");
assert.doesNotMatch(timed.app.innerHTML, /<h3>Polyominos<\/h3>/);
timed.time("2026-10-10T08:01:00Z");
await timed.run("refreshContent()");
assert.match(timed.app.innerHTML, /<h3>Polyominos<\/h3>/,
  "A planned PDF becomes visible with unchanged JSON at the publication time");
const saturdayCard = cardMarkup(timed.app.innerHTML, "Polyominos");
assert.match(saturdayCard, /data-viewer-type="pdf"/);
assert.doesNotMatch(saturdayCard, /data-viewer-type="video"/,
  "Saturday's worksheet does not link to the still-private Sunday video");
timed.time("2026-10-11T08:01:00Z");
timed.run("refreshTimedContent()");
assert.match(cardMarkup(timed.app.innerHTML, "Polyominos"), /data-viewer-type="video"/,
  "The same JSON enables the video automatically on Sunday");
timed.time("2026-10-03T09:00:00Z");
timed.run("render()");
const publicPremiere = cardMarkup(timed.app.innerHTML, "Zahlenkreuze");
assert.match(publicPremiere, /Premiere:/);
assert.match(publicPremiere, /data-viewer-type="video"/,
  "An already public scheduled premiere remains accessible before its start");
timed.time("2026-10-11T08:01:00Z");

timed.run("state.view = 'more'; state.contactMessage = 'Meine Frage bleibt hier.'; render();");
timed.focus();
const focusedMarkup = timed.app.innerHTML;
timed.incoming(value => { value.meta.website = "https://www.mo-ni.de/?neu=1"; });
await timed.run("refreshContent()");
assert.equal(timed.app.innerHTML, focusedMarkup, "Content refresh does not replace the focused textarea");
assert.equal(timed.run("pendingContentRender"), true);
timed.blur();
timed.run("applyPendingContent()");
assert.match(timed.app.innerHTML, /https:\/\/www\.mo-ni\.de\/\?neu=1/);
assert.match(timed.app.innerHTML, />Meine Frage bleibt hier\.<\/textarea>/,
  "The deferred refresh preserves the contact draft");
assert.equal(timed.run("pendingContentRender"), false);

timed.run("state.contactMessage = ''; state.view = 'viewer'; state.viewer = {type:'video',url:'https://www.youtube.com/watch?v=7o0KxLDxKDA',title:'Zahlenkreuze'}; render();");
const playingMarkup = timed.app.innerHTML;
timed.incoming(value => { value.sunday.items.find(item => item.number === 2).title = "Zahlenpfade aktualisiert"; });
await timed.run("refreshContent()");
assert.equal(timed.app.innerHTML, playingMarkup, "New content leaves the active video frame intact");
assert.equal(timed.run("pendingContentRender"), true);
timed.run("setView('sunday', undefined, true)");
assert.match(timed.app.innerHTML, /<h3>Zahlenpfade aktualisiert<\/h3>/,
  "Returning to the archive displays the waiting content");

timed.run("state.view = 'dates'; state.audience = '34'; state.dateFilter = 'olympiade'; render();");
assert.match(timed.app.innerHTML, /18\. Dezember 2026/, "The primary-school first-round deadline is visible");
timed.run("state.audience = '56'; render();");
assert.match(timed.app.innerHTML, /27\. Februar 2027/, "The grade-5/6 final-round end date is visible");

const calendar = await appHarness();
calendar.run("state.view = 'dates'; state.audience = '34'; state.dateFilter = 'all'; render();");
const firstRoundPosition = calendar.app.innerHTML.indexOf("1. Stufe: Einstiegsrunde");
const decemberPosition = calendar.app.innerHTML.indexOf("Anmeldeschluss für neue Grundschulen");
assert.ok(firstRoundPosition >= 0 && decemberPosition > firstRoundPosition,
  "The October round is listed before the December registration deadline despite its later end date");
const monthLabels = [...calendar.app.innerHTML.matchAll(/<div class="month-label">([^<]+)<\/div>/g)].map(match => match[1]);
assert.ok(monthLabels.indexOf("Oktober 2026") < monthLabels.indexOf("Dezember 2026"));
assert.equal(monthLabels.filter(label => label === "Oktober 2026").length, 1,
  "The calendar does not return to an earlier month after a later deadline");
calendar.time("2026-11-01T12:00:00Z");
calendar.run("render()");
const novemberTitles = [...calendar.app.innerHTML.matchAll(/<div class="date-copy"><small>[\s\S]*?<\/small><strong>([^<]+)<\/strong>/g)].map(match => match[1]);
assert.equal(novemberTitles[0], "1. Stufe: Einstiegsrunde",
  "An ongoing round remains visible ahead of future events after its start day");
assert.ok(novemberTitles.includes("Anmeldeschluss für neue Grundschulen"));
calendar.time("2026-12-18T12:00:00Z");
calendar.run("render()");
assert.match(calendar.app.innerHTML, /1\. Stufe: Einstiegsrunde/, "The round remains visible on its final day");
calendar.time("2026-12-19T12:00:00Z");
calendar.run("refreshTimedContent()");
assert.doesNotMatch(calendar.app.innerHTML, /1\. Stufe: Einstiegsrunde/,
  "The ongoing round disappears automatically the day after its deadline");
assert.match(calendar.app.innerHTML, /2\. Stufe: Auswahlklausur/, "Later rounds remain visible after the completed round expires");

// A different tab can activate a worker while this tab still has a draft.
const protectedTab = await appHarness();
protectedTab.run("state.view = 'more'; state.contactMessage = 'Noch nicht gesendet'; render();");
protectedTab.controllerChanged();
assert.equal(protectedTab.reloads, 0);
protectedTab.run("state.contactMessage = '';");
protectedTab.focus();
protectedTab.run("maybeApplyAppUpdate()");
assert.equal(protectedTab.reloads, 0);
protectedTab.blur();
protectedTab.dialog(true);
protectedTab.run("maybeApplyAppUpdate()");
assert.equal(protectedTab.reloads, 0, "An open download dialog prevents a reload even with focus outside it");
protectedTab.dialog(false);
protectedTab.run("maybeApplyAppUpdate()");
assert.equal(protectedTab.reloads, 1);
protectedTab.run("maybeApplyAppUpdate()");
assert.equal(protectedTab.reloads, 1, "A controller change reloads the safe tab exactly once");

const messages = [];
const waitingWorker = { postMessage: message => messages.push(message) };
const waitingTab = await appHarness({ waitingWorker, focused: true });
assert.equal(messages.length, 0, "A waiting worker does not activate over an active input");
waitingTab.blur();
waitingTab.dialog(true);
waitingTab.run("maybeApplyAppUpdate()");
assert.equal(messages.length, 0, "A native dialog prevents worker activation even with focus outside it");
waitingTab.dialog(false);
waitingTab.run("maybeApplyAppUpdate()");
assert.equal(messages.length, 1);
assert.equal(messages[0].type, "SKIP_WAITING");
waitingTab.run("maybeApplyAppUpdate()");
assert.equal(messages.length, 1);

const pdfApp = await appHarness({ pdf: true });
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
const originalFile = { type: "application/pdf" };
const openPdf = () => pdfApp.run("state.view = 'viewer'; state.previousView = 'sunday'; state.viewer = { type:'pdf', url:'./blatt.pdf', title:'Testblatt' }; hydratePdfViewer()");

let pendingPdf = openPdf();
pdfApp.run("setView('sunday')");
pdfApp.renderJobs.shift().resolve();
await pendingPdf;
assert.equal(pdfApp.fetchJobs.length, 0, "A canvas render finishing after returning to the archive starts no PDF print preparation.");
assert.equal(pdfApp.pdfFrames.length, 0);

pendingPdf = openPdf();
pdfApp.renderJobs.shift().resolve();
await flush();
let fetchJob = pdfApp.fetchJobs.shift();
pdfApp.run("setView('home')");
assert.equal(fetchJob.signal.aborted, true, "Returning during PDF file loading aborts the old request.");
fetchJob.resolve(originalFile);
await pendingPdf;
assert.equal(pdfApp.pdfFrames.length, 0, "An old response cannot create a print iframe in the next view.");

pendingPdf = openPdf();
pdfApp.renderJobs.shift().resolve();
await flush();
pdfApp.fetchJobs.shift().resolve(originalFile);
await flush();
assert.equal(pdfApp.run("state.viewer.pdfReady"), false, "Native PDF printing waits for the preloaded frame.");
const abandonedFrame = pdfApp.pdfFrames.at(-1);
pdfApp.run("setView('training')");
await pendingPdf;
assert.equal(abandonedFrame.isConnected, false, "Returning during iframe loading removes the abandoned frame.");
assert.equal(pdfApp.revoked.length, 1);
abandonedFrame.emit("load");
assert.equal(pdfApp.run("state.viewer"), null, "A late iframe event cannot restore an abandoned viewer.");

pendingPdf = openPdf();
pdfApp.renderJobs.shift().resolve();
await flush();
pdfApp.fetchJobs.shift().resolve(originalFile);
await flush();
const loadedFrame = pdfApp.pdfFrames.at(-1);
loadedFrame.emit("load");
await pendingPdf;
assert.equal(pdfApp.run("state.viewer.pdfReady"), true);
const printing = pdfApp.run("requestSystemPrint()");
assert.equal(loadedFrame.printCalls, 1, "The real app handler invokes the prepared PDF frame before yielding.");
await printing;
assert.equal(pdfApp.document.activeElement, pdfApp.printButton, "After the native frame call, focus returns to the enabled app print button.");
await pdfApp.run("requestSystemPrint()");
assert.equal(loadedFrame.printCalls, 2, "The app can retry the same prepared frame without discarding its PDF.");
assert.equal(loadedFrame.isConnected, true);
pdfApp.run("setView('sunday', undefined, true)");
assert.equal(loadedFrame.isConnected, false, "The ready frame is disposed on the actual viewer return path.");
assert.equal(pdfApp.revoked.length, 2);
assert.equal(pdfApp.run("state.view"), "sunday");
assert.match(pdfApp.app.innerHTML, /Sonntagsrätsel/);

for (const failure of ["file", "frame"]) {
  pendingPdf = openPdf();
  pdfApp.renderJobs.shift().resolve();
  await flush();
  const job = pdfApp.fetchJobs.shift();
  if (failure === "file") job.reject(new Error("PDF file unavailable"));
  else {
    job.resolve(originalFile);
    await flush();
    pdfApp.pdfFrames.at(-1).emit("error");
  }
  await pendingPdf;
  assert.equal(pdfApp.run("state.viewer.pdfReady"), false);
  assert.match(pdfApp.run("state.viewer.printError"), /Öffne das Aufgabenblatt bitte erneut/);
  assert.equal(pdfApp.pdfStatus.hidden, false);
  assert.match(pdfApp.pdfStatus.textContent, /Drucken konnte nicht vorbereitet werden/);
  await pdfApp.run("requestSystemPrint()");
  assert.match(pdfApp.toast.textContent, /Öffne das Aufgabenblatt bitte erneut/,
    "A failed print preparation explains recovery rather than permanently asking the child to wait.");
  assert.doesNotMatch(pdfApp.toast.textContent, /Bitte warte/);
  pdfApp.run("setView('sunday')");
}

console.log("Actual app integration: startup, scheduled and deferred refresh, chronological date expiry, safe app updates and original-PDF load cancellation, synchronous printing and viewer return verified.");

const gameBusy = await appHarness();
gameBusy.run("state.gameActive = true;");
const gameMarkup = gameBusy.app.innerHTML;
gameBusy.run("let activatedGameUpdate = 0; state.waitingWorker = {postMessage: () => activatedGameUpdate++}; appUpdateCoordinator.offer(state.waitingWorker);");
gameBusy.incoming(content => { content.dates.push({id:'game-time-update',date:'2026-10-18',title:'Game-time update',type:'Organisation'}); });
await gameBusy.run("refreshContent()");
assert.equal(gameBusy.run("pendingContentRender"), true, "New content was fetched successfully and is deferred");
assert.equal(gameBusy.run("state.content.dates.some(item => item.id === 'game-time-update')"), true);
assert.equal(gameBusy.app.innerHTML, gameMarkup, "Incoming content does not replace the active game DOM");
assert.equal(gameBusy.run("maybeApplyAppUpdate()"), false);
gameBusy.run("state.gameActive = false; applyPendingContent()");
assert.equal(gameBusy.run("pendingContentRender"), false);
gameBusy.run("maybeApplyAppUpdate()");
assert.equal(gameBusy.run("activatedGameUpdate"), 1, "The waiting code update activates after the round finishes");
console.log("Actual app content and code updates wait for a running or paused game.");

// Real puzzle controller restores a partially solved board and protects it from updates.
const puzzleFixture = createPuzzleGame({types:createSundayPuzzleTypes(content.sunday,content.puzzlePublications),read: () => ({}), write() {}});
puzzleFixture.progress.select('sumdoku', 'sunday-01-task-3');
puzzleFixture.progress.change({kind:'note',cell:0,value:2});
const puzzleBusy = await appHarness({search:'?audience=34&view=games&game=puzzles',storage:{
  'moni-public-v1-puzzle-progress':JSON.stringify(puzzleFixture.progress.snapshot()),
  'moni-public-v1-puzzle-ui':JSON.stringify({screen:'playing',typeId:'sumdoku',mode:'note',selected:0})
}});
assert.equal(puzzleBusy.run('puzzleGame.active'), true);
assert.equal(puzzleBusy.run('state.gameActive'), true);
const puzzleMarkup = puzzleBusy.app.innerHTML;
puzzleBusy.incoming(content => {content.dates.push({id:'puzzle-update',date:'2026-10-19',title:'Puzzle update',type:'Organisation'});});
await puzzleBusy.run('refreshContent()');
assert.equal(puzzleBusy.app.innerHTML, puzzleMarkup);
assert.equal(puzzleBusy.run('pendingContentRender'), true);
puzzleBusy.run('let puzzleActivation = 0; state.waitingWorker = {postMessage: () => puzzleActivation++}; appUpdateCoordinator.offer(state.waitingWorker);');
assert.equal(puzzleBusy.run('maybeApplyAppUpdate()'), false);
puzzleBusy.run("state.view = 'home'; render(); applyPendingContent(); maybeApplyAppUpdate();");
assert.equal(puzzleBusy.run('state.gameActive'), false);
assert.equal(puzzleBusy.run('puzzleActivation'), 1);
assert.equal(puzzleBusy.run('puzzleGame.progress.current().board.notes[0][0]'), 2);
console.log('Actual restored puzzle protects content/code updates; leaving it safely applies updates without losing notes.');

// Exercise the real navigation handler and renderer across all grade groups.
const dockLabels=['Start','Spiel und Spaß','Termine','Mehr'];
const dockViews=['home','games','dates','more'];
const starts={
  '34':['Mathe-AG','Mathe-Olympiade','Knobelreise','Mathe mit dem Känguru','Arbeitshefte','Sonntagsrätsel','MathePlus'],
  '56':['Mathe-AG','Mathematik-Olympiade','Mathe mit dem Känguru','Sonntagsrätsel','MathePlus'],
  '713':['Bist du fit?','Mathe mit dem Känguru','Mathe-Olympiade']
};
function checkDock(harness,view) {
  const dock=harness.app.innerHTML.match(/<nav[^>]+aria-label="Hauptnavigation">([\s\S]*?)<\/nav>/)[1];
  assert.deepEqual([...dock.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]),dockLabels);
  assert.deepEqual([...dock.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]),dockViews);
  assert.equal((dock.match(/aria-current="page"/g)||[]).length,1);
  assert.match(dock,new RegExp(`data-view="${view}" aria-current="page"`));
}
const sharedDock=await appHarness();
for(const audience of ['34','56','713']) {
  await sharedDock.click({audience});
  for(const view of dockViews) {
    await sharedDock.click({view});
    assert.equal(sharedDock.run('state.view'),view);
    checkDock(sharedDock,view);
    if(view==='home') assert.deepEqual([...sharedDock.app.innerHTML.matchAll(/class="quick-card"[\s\S]*?<strong>([^<]+)<\/strong>/g)].map(m=>m[1]),starts[audience]);
    if(view==='games') assert.match(sharedDock.app.innerHTML,/data-math-root/);
  }
  const direct=await appHarness({search:`?audience=${audience}&view=games&game=rally`});
  assert.equal(direct.run('state.view'),'games');checkDock(direct,'games');
}
const primaryKangaroo=await appHarness({search:'?audience=34&view=kangaroo'});
// Every existing offer renders the same introduction, including empty video archives.
const offerRoutes={
  '34':[['training','mathe-ag','mathe-ag'],['training','olympiade','olympiade'],['journey',null,'journey'],['kangaroo',null,'kangaroo'],['workbooks',null,'workbooks'],['sunday',null,'sunday'],['training','matheplus','matheplus']],
  '56':[['training','mathe-ag','mathe-ag'],['training','olympiade','olympiade'],['journey',null,'kangaroo'],['sunday',null,'sunday'],['training','matheplus','matheplus']],
  '713':[['training','bist-du-fit','bist-du-fit'],['journey',null,'kangaroo'],['training','olympiade','olympiade']]
};
const shell=await readFile(new URL('service-worker.js',root),'utf8');
for(const [group,routes] of Object.entries(offerRoutes)) {
  const pictures=[];
  for(const [view,tab,offer] of routes) {
    const page=await appHarness({search:`?audience=${group}&view=${view}${tab?`&tab=${tab}`:''}`});
    const header=page.app.innerHTML.match(/<section class="offer-header"[^>]*>([\s\S]*?)<\/section>/);
    assert.ok(header,`${group}/${offer}: the introduction renders through the actual app entry`);
    assert.match(header[0],new RegExp(`data-offer="${offer}"`));
    assert.equal((page.app.innerHTML.match(/class="offer-header"/g)||[]).length,1);
    assert.equal((header[1].match(/<h1>/g)||[]).length,1);
    assert.match(header[1],/<p>[^<]+<\/p>/,'Every offer has a short introduction');
    assert.doesNotMatch(header[1],/eyebrow|<svg|audience-chip/,'No decorative star, extra subtitle or grade badge');
    const image=header[1].match(/<img src="([^"]+)"/)[1];
    await readFile(new URL(image,root));
    assert.ok(shell.includes(`"${image}"`),'Every offer illustration belongs to the offline shell');
    pictures.push(image);
    const searchIndex=page.app.innerHTML.indexOf('class="search-field"');
    if(searchIndex>=0) assert.ok(searchIndex>header.index+header[0].length,'Search follows the illustrated introduction');
    assert.ok(page.app.innerHTML.indexOf('<h1>')===header.index+header[0].indexOf('<h1>'),'Offer heading is the first heading');
  }
  assert.equal(new Set(pictures).size,pictures.length,`All ${group} offers have different topic pictures`);
}
console.log('All 15 offer routes: shared introduction, distinct topic pictures, empty archive, search order and offline assets verified.');
assert.equal(primaryKangaroo.run('state.view'),'kangaroo','The new primary-school destination also works as a direct link');
for(const [audience,count] of [['34',123],['56',61],['713',90]]) {
  await primaryKangaroo.click({audience});
  assert.equal(primaryKangaroo.run('state.view'),'kangaroo');
  assert.equal((primaryKangaroo.app.innerHTML.match(/data-video-entry="thumbnail"/g)||[]).length,count);
  assert.equal((primaryKangaroo.app.innerHTML.match(/data-video-entry="button"/g)||[]).length,count,'Every video keeps its visible video button');
  checkDock(primaryKangaroo,'home');
}
await primaryKangaroo.click({audience:'34'});
await primaryKangaroo.click({view:'journey'});
assert.equal(primaryKangaroo.run('state.view'),'journey');
assert.match(primaryKangaroo.app.innerHTML,/data-action="open-journey-video"/);
assert.doesNotMatch(primaryKangaroo.app.innerHTML,/data-video-entry="thumbnail"/,'Primary Knobelreise and Kangaroo stay separate');
for(const [audience,count] of [['56',61],['713',90]]) {
  const legacyKangaroo=await appHarness({search:`?audience=${audience}&view=journey`});
  assert.equal((legacyKangaroo.app.innerHTML.match(/data-video-entry="thumbnail"/g)||[]).length,count,'Existing older Kangaroo links keep working');
}
console.log('Primary Kangaroo direct link, 123/61/90 distinct videos, visible video buttons, audience switching and separate Knobelreise verified.');
// A saved original puzzle remains active and blocks updates even in 5–13.
const commonPuzzle=await appHarness({search:'?audience=56&view=games&game=puzzles',storage:{
  'moni-public-v1-puzzle-progress':JSON.stringify(puzzleFixture.progress.snapshot()),
  'moni-public-v1-puzzle-ui':JSON.stringify({screen:'playing',typeId:'sumdoku',mode:'note',selected:0})
}});
for(const audience of ['56','713','34']) {
  await commonPuzzle.click({audience});
  assert.equal(commonPuzzle.run('state.view'),'games');checkDock(commonPuzzle,'games');
  assert.equal(commonPuzzle.run('puzzleGame.active'),true);assert.equal(commonPuzzle.run('state.gameActive'),true);
  assert.deepEqual(commonPuzzle.run('puzzleGame.progress.current().board.notes[0]'),[2]);
  commonPuzzle.run("state.previousView='games'; state.view='viewer'; state.viewer={type:'video',url:'https://www.youtube.com/watch?v=5prZEh2zlXY',title:'Sumdoku'}; render();");
  checkDock(commonPuzzle,'games');await commonPuzzle.click({view:'games'});
  assert.equal(commonPuzzle.run('puzzleGame.active'),true);
}
console.log('Same four dock destinations, real navigation/direct links in 3–4/5–6/7–13, distinct start offers and preserved active puzzle verified.');

// Re-entering puzzles resets navigation, while saved work and resource returns survive.
const puzzleStorage={
  'moni-public-v1-puzzle-progress':JSON.stringify(puzzleFixture.progress.snapshot()),
  'moni-public-v1-puzzle-ui':JSON.stringify({screen:'playing',typeId:'sumdoku',mode:'note',selected:0})
};
const puzzleReturn=await appHarness({search:'?audience=34&view=games&game=puzzles',storage:puzzleStorage});
const savedPuzzle=JSON.stringify(puzzleReturn.run('puzzleGame.progress.snapshot()'));
const puzzleUi=()=>JSON.parse(puzzleStorage['moni-public-v1-puzzle-ui']);
for(const game of ['whirl','rally']) {
  await puzzleReturn.click({game});
  assert.equal(puzzleReturn.run('state.selectedGame'),game);
  await puzzleReturn.click({game:'puzzles'});
  assert.equal(puzzleUi().screen,'types');
  assert.equal(puzzleReturn.run('puzzleGame.active'),false);
  assert.equal(JSON.stringify(puzzleReturn.run('puzzleGame.progress.snapshot()')),savedPuzzle);
  await puzzleReturn.click({playSunday:content.sunday.items.find(item=>item.number===1).id});
  assert.equal(puzzleUi().screen,'levels','A direct Sunday link still opens the requested type');
}
for(const view of ['home','dates','more']) {
  await puzzleReturn.click({view});
  await puzzleReturn.click({view:'games'});
  assert.equal(puzzleUi().screen,'types');
  assert.equal(JSON.stringify(puzzleReturn.run('puzzleGame.progress.snapshot()')),savedPuzzle);
  await puzzleReturn.click({playSunday:content.sunday.items.find(item=>item.number===1).id});
}
// Clearing the UI also cancels deferred startup restoration, without deleting the pending board.
const emptyTypes=createSundayPuzzleTypes(content.sunday,{confirmed:[]});
const delayedStorage={};
const delayedPuzzle=createPuzzleGame({types:emptyTypes,read:key=>key==='puzzle-progress'?puzzleFixture.progress.snapshot():{screen:'playing',typeId:'sumdoku'},write:(key,value)=>{delayedStorage[key]=value;}});
delayedPuzzle.showCatalog();
delayedPuzzle.updateTypes(createSundayPuzzleTypes(content.sunday,content.puzzlePublications));
assert.equal(delayedStorage['puzzle-ui'].screen,'types');
assert.deepEqual(delayedPuzzle.progress.current().board.notes[0],[2]);
console.log('Puzzle game/dock returns reset to the catalogue; direct Sunday links and delayed saved notes remain intact.');

