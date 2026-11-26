import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const debugPort = process.argv[2] || "9230";
const appPort = process.argv[3] || "4189";
const appUrl = `http://127.0.0.1:${appPort}/?version=0.13.0&view=journey`;
const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then(response => response.json());
const target = targets.find(entry => entry.type === "page" && entry.url.includes(`127.0.0.1:${appPort}`));
if (!target) throw new Error("Die geöffnete Version 0.13 wurde im Testbrowser nicht gefunden.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const operation = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error.message));
  else operation.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
await command("Runtime.enable");
await command("Page.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await command("Page.navigate", { url: appUrl });
for (let attempt = 0; attempt < 40; attempt += 1) {
  await pause(200);
  if (await evaluate(`Boolean(document.querySelector(".journey-page"))`).catch(() => false)) break;
}

const portrait = await evaluate(`({
  width: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  title: document.querySelector(".journey-header h1")?.textContent,
  next: document.querySelector(".journey-next-card h2")?.textContent,
  nextTime: document.querySelector(".journey-next-card p")?.textContent,
  videos: document.querySelectorAll(".journey-video-card").length,
  firstCode: document.querySelector(".journey-video-card .meta-chip")?.textContent,
  publishedTimes: [...document.querySelectorAll(".journey-video-card .meta-row")].some(node => /\\d{1,2}:\\d{2}/.test(node.textContent)),
  nav: [...document.querySelectorAll(".bottom-nav .nav-item span")].map(node => node.textContent),
  brand: document.querySelector(".brand-copy")?.textContent.replace(/\\s+/g, " ").trim(),
  brandColor: getComputedStyle(document.querySelector(".brand-title")).color,
  moColor: getComputedStyle(document.querySelector(".brand-mo")).color,
  niColor: getComputedStyle(document.querySelector(".brand-ni")).color,
  journeyEyebrowText: document.querySelector(".journey-header .eyebrow")?.textContent.trim(),
  textColor: getComputedStyle(document.body).color,
  mutedColor: getComputedStyle(document.querySelector(".journey-video-copy p")).color,
  thumbnailMetaGap: Math.round(document.querySelector(".journey-video-card .meta-row").getBoundingClientRect().top - document.querySelector(".journey-video-card > img").getBoundingClientRect().bottom),
  logoLoaded: document.querySelector(".brand-mark img")?.complete && document.querySelector(".brand-mark img")?.naturalWidth > 0,
  interactiveText: /Punkte|Zuschaueraufgabe|Rangliste|Trickkiste/.test(document.body.textContent),
  internalText: /PWA-Testversion|Testkreis|Minimalapp|Lokaler Inhaltsdienst|im Prototyp/.test(document.body.textContent)
})`);
assert.equal(portrait.title, "Knobelreise mit MO und Ni");
assert.match(portrait.next, /^NI\d{6}/);
assert.match(portrait.nextTime, /14:00/);
assert.ok(portrait.videos >= 1);
assert.match(portrait.firstCode, /^NI\d{6}/);
assert.equal(portrait.publishedTimes, false);
assert.deepEqual(portrait.nav, ["Start", "Termine", "Mehr"]);
assert.equal(portrait.brand, "Unterwegs mit MO und Ni");
assert.notEqual(portrait.brandColor, portrait.moColor);
assert.equal(portrait.journeyEyebrowText, "");
assert.equal(portrait.textColor, "rgb(59, 117, 95)");
assert.equal(portrait.mutedColor, "rgb(89, 115, 103)");
assert.equal(portrait.moColor, "rgb(214, 95, 67)");
assert.equal(portrait.niColor, "rgb(46, 140, 142)");
assert.ok(portrait.thumbnailMetaGap >= 6 && portrait.thumbnailMetaGap <= 8);
assert.equal(portrait.logoLoaded, true);
assert.equal(portrait.interactiveText, false);
assert.equal(portrait.internalText, false);
assert.equal(portrait.scrollWidth, portrait.width, "Die Knobelreise darf im Hochformat nicht horizontal überlaufen.");
const portraitScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile("/private/tmp/mo-ni-v011-journey-portrait.png", Buffer.from(portraitScreenshot.data, "base64"));
await evaluate(`document.querySelector(".journey-video-card").scrollIntoView({ block: "start" })`);
await pause(100);
const journeyCardScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile("/private/tmp/mo-ni-v011-journey-card.png", Buffer.from(journeyCardScreenshot.data, "base64"));

await evaluate(`document.querySelector('.journey-video-card [data-action="open-journey-video"]').click()`);
await pause(400);
assert.equal(await evaluate(`document.querySelector('[data-action="close-viewer"]')?.getAttribute("aria-label")`), "Zurück zur Knobelreise");
await evaluate(`document.querySelector('[data-action="close-viewer"]').click()`);
await pause(150);
assert.equal(await evaluate(`Boolean(document.querySelector(".journey-page"))`), true);

await evaluate(`document.querySelector('[data-view="home"]').click()`);
await pause(150);
const home = await evaluate(`({
  quick: [...document.querySelectorAll(".quick-card strong")].map(node => node.textContent),
  additional: Boolean(document.querySelector(".additional-offer")),
  nextTitle: document.querySelector(".date-card .date-copy strong")?.textContent,
  hasOldEyebrow: document.body.textContent.includes("Mathe wächst mit jeder Idee"),
  featureIconBackgrounds: [...document.querySelectorAll(".quick-card .icon-tile")].map(node => getComputedStyle(node).backgroundColor),
  activeNavBackground: getComputedStyle(document.querySelector(".nav-item.active")).backgroundColor,
  brandMarkLeft: document.querySelector(".brand-mark").getBoundingClientRect().left,
  versionBadgeRight: document.querySelector(".version-badge").getBoundingClientRect().right,
  viewportWidth: document.documentElement.clientWidth,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
})`);
assert.deepEqual(home.quick, ["Mathe-AG", "Olympiade", "Knobelreise", "Sonntagsrätsel", "Arbeitshefte", "MathePlus"]);
assert.equal(home.additional, false);
assert.equal(home.nextTitle, "116. Mathe-Online-AG");
assert.equal(home.hasOldEyebrow, false);
assert.equal(new Set(home.featureIconBackgrounds).size, 1);
assert.equal(home.featureIconBackgrounds[0], home.activeNavBackground);
assert.ok(home.brandMarkLeft >= 0, "Das Kanallogo muss vollständig innerhalb der Titelleiste liegen.");
assert.ok(home.versionBadgeRight <= home.viewportWidth, "Die Versionsanzeige muss vollständig innerhalb der Titelleiste liegen.");
assert.equal(home.overflow, 0);
const homeScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile("/private/tmp/mo-ni-v011-home-portrait.png", Buffer.from(homeScreenshot.data, "base64"));

await evaluate(`document.querySelector('[data-view="sunday"]').click()`);
await pause(150);
const sunday = await evaluate(`({
  title: document.querySelector(".sunday-page h1")?.textContent,
  preview: document.querySelector(".sunday-empty h2")?.textContent,
  activeNav: document.querySelector(".nav-item.active span")?.textContent,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
})`);
assert.equal(sunday.title, "Sonntagsrätsel");
assert.equal(sunday.preview, "Das erste Rätsel ist unterwegs");
assert.equal(sunday.activeNav, "Start");
assert.equal(sunday.overflow, 0);

await evaluate(`document.querySelector('[data-view="dates"]').click()`);
await pause(150);
const dateTitles = await evaluate(`[...document.querySelectorAll(".timeline-item .date-copy strong")].map(node => node.textContent)`);
assert.equal(dateTitles[0], "116. Mathe-Online-AG");
assert.equal(dateTitles.at(-1), "Versand der Urkunden und Preise");
assert.equal(dateTitles.includes("115. Mathe-Online-AG"), false);

await evaluate(`document.querySelector('[data-view="home"]').click()`);
await pause(100);
await evaluate(`document.querySelector('[data-view="workbooks"]').click()`);
await pause(150);
const workbooks = await evaluate(`({
  title: document.querySelector(".workbooks-header h1")?.textContent,
  date: document.querySelector(".workbook-announcement small")?.textContent,
  announcement: document.querySelector(".workbook-announcement h2")?.textContent,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
})`);
assert.equal(workbooks.title, "Arbeitshefte");
assert.match(workbooks.date, /Jetzt verfügbar/);
assert.match(workbooks.announcement, /QR-Codes für MO65/);
assert.equal(workbooks.overflow, 0);

await evaluate(`document.querySelector('[data-view="more"]').click()`);
await pause(150);
assert.equal(await evaluate(`/PWA-Testversion|Testkreis|Minimalapp|Lokaler Inhaltsdienst|im Prototyp/.test(document.body.textContent)`), false);
assert.equal(await evaluate(`/Bitte keine vollständigen Namen|Lernangebote und Datenschutz|Datensparsam/.test(document.body.textContent)`), false);
await evaluate(`document.querySelector('[data-action="open-about"]').click()`);
await pause(100);
assert.equal(await evaluate(`document.querySelector(".modal h2")?.textContent`), "Über die MO-Ni-App");
assert.equal(await evaluate(`/PWA|Testbetrieb|Minimalapp|Einfach und datensparsam/.test(document.querySelector(".modal")?.textContent || "")`), false);
await evaluate(`document.querySelector('[data-action="close-modal"]').click()`);

await command("Page.navigate", { url: `http://127.0.0.1:${appPort}/?version=0.13.0&view=more&install=1` });
for (let attempt = 0; attempt < 30; attempt += 1) {
  await pause(200);
  if (await evaluate(`Boolean(document.querySelector(".install-guides"))`).catch(() => false)) break;
}
const installText = await evaluate(`document.querySelector(".modal")?.textContent || ""`);
assert.match(installText, /iPhone oder iPad/);
assert.match(installText, /Android-Handy oder -Tablet/);
assert.match(installText, /PC oder Mac/);

await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
await command("Page.navigate", { url: `http://127.0.0.1:${appPort}/?version=0.13.0&view=home` });
for (let attempt = 0; attempt < 30; attempt += 1) {
  await pause(200);
  if (await evaluate(`Boolean(document.querySelector(".hero"))`).catch(() => false)) break;
}
const narrow = await evaluate(`(() => {
  const text = document.querySelector(".hero-copy").getBoundingClientRect();
  const picture = document.querySelector(".hero-mascot").getBoundingClientRect();
  const overlap = !(text.right <= picture.left || text.left >= picture.right || text.bottom <= picture.top || text.top >= picture.bottom);
  const brand = document.querySelector(".brand-title").getBoundingClientRect();
  const badge = document.querySelector(".version-badge").getBoundingClientRect();
  return {
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overlap,
    brandOverflow: document.querySelector(".topbar").scrollWidth - document.querySelector(".topbar").clientWidth,
    brandBadgeOverlap: brand.right > badge.left
  };
})()`);
assert.equal(narrow.scrollWidth, narrow.width, "Die Startseite darf bei 320 Pixel Breite nicht horizontal überlaufen.");
assert.equal(narrow.overlap, false, "Das MO-und-Ni-Bild darf den Startseitentext bei 320 Pixel Breite nicht überdecken.");
assert.equal(narrow.brandOverflow, 0, "Logo, Untertitel und Versionsbadge müssen in die schmale Titelleiste passen.");
assert.equal(narrow.brandBadgeOverlap, false, "Titel und Versionsanzeige dürfen sich in der schmalen Titelleiste nicht überlagern.");
const narrowScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile("/private/tmp/mo-ni-v011-home-narrow.png", Buffer.from(narrowScreenshot.data, "base64"));

await command("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
await command("Page.navigate", { url: appUrl });
for (let attempt = 0; attempt < 30; attempt += 1) {
  await pause(200);
  if (await evaluate(`Boolean(document.querySelector(".journey-page"))`).catch(() => false)) break;
}
const landscape = await evaluate(`({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector(".journey-video-list")).gridTemplateColumns })`);
assert.equal(landscape.scrollWidth, landscape.width, "Die Knobelreise darf im Querformat nicht horizontal überlaufen.");
assert.ok(landscape.columns.split(" ").length >= 2, "Die Videoliste soll im Querformat zweispaltig sein.");
const landscapeScreenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile("/private/tmp/mo-ni-v011-journey-landscape.png", Buffer.from(landscapeScreenshot.data, "base64"));

socket.close();
console.log("Browser smoke test passed: six start areas, Sunday puzzles, journey, return routes and responsive layouts are present.");
