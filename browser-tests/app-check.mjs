// Prüft die App in einem echten Browser, so wie sie auf mo-ni.de ausgeliefert wird:
// als reine Dateien unter /fileadmin/grundschule-app-test/, ohne Entwicklungsserver.
// Aufruf: node browser-tests/app-check.mjs   (braucht das Paket "playwright" mit Chromium)
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium, devices } = createRequire(import.meta.url)("playwright");
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const PUBLIC_PATH = "/fileadmin/grundschule-app-test/";
const types = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

// sunday-publications.php ist eine freiwillige Quelle; fehlt sie, liest die App data/sunday-publications.json.
// Wie TYPO3: Dateien ausliefern, alles andere ist 404. Es gibt keine /api/-Schnittstelle.
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (!pathname.startsWith(PUBLIC_PATH)) return response.writeHead(404).end();
  const file = resolve(root, pathname.slice(PUBLIC_PATH.length) || "index.html");
  if (!file.startsWith(root + sep)) return response.writeHead(404).end();
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("kein Dateiname");
    const headers = { "Content-Type": types[extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes" };
    // Wie der echte Webserver: Teilstücke auf Anfrage (pdf.js und Videos nutzen das).
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "");
    if (range) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : info.size - 1, info.size - 1);
      response.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
      if (request.method === "HEAD") return response.end();
      return createReadStream(file, { start, end }).pipe(response);
    }
    response.writeHead(200, { ...headers, "Content-Length": info.size });
    if (request.method === "HEAD") return response.end();
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const appUrl = `${origin}${PUBLIC_PATH}index.html`;

const views = [
  ["Start", "?view=home"], ["Termine", "?view=dates"], ["Mathe-AG", "?view=training&tab=mathe-ag"],
  ["Olympiade", "?view=training&tab=olympiade"], ["MathePlus", "?view=training&tab=matheplus"],
  ["Knobelreise", "?view=journey"], ["Känguru", "?view=kangaroo"], ["Sonntagsrätsel", "?view=sunday"],
  ["Mehr", "?view=more"], ["Spiele", "?view=games"]
];
const profiles = [["iPhone", devices["iPhone 13"]], ["Android", devices["Pixel 7"]]];
const problems = [];
const browser = await chromium.launch();

async function checkProfile(name, device) {
  const context = await browser.newContext({ ...device, serviceWorkers: "allow" });
  const external = new Set();
  const failed = [];
  // Im Test geht nichts ins Internet. Wir merken uns nur, welche fremden Adressen die App anfragt.
  // Aufgabenblätter von mo-ni.de ersetzt ein Blatt aus dem App-Ordner (5 Seiten wie Blatt 57 gibt es lokal nicht, KenKen hat 2).
  await context.route(url => !url.href.startsWith(origin), route => {
    const url = new URL(route.request().url());
    if (url.hostname === "www.mo-ni.de" && url.pathname.endsWith(".pdf")) return route.fulfill({ path: resolve(root, "Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf"), contentType: "application/pdf" });
    external.add(url.hostname);
    route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => problems.push(`${name}: Skriptfehler ${error.message}`));
  page.on("console", message => { if (message.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(message.text())) problems.push(`${name}: Konsole ${message.text()}`); });
  page.on("response", response => {
    const url = response.url();
    if (url.startsWith(origin) && response.status() >= 400 && !url.includes("/api/") && !url.endsWith("/sunday-publications.php")) failed.push(`${response.status()} ${url.slice(origin.length)}`);
  });

  for (const [label, query] of [["Erster Start", "?audience=34"], ...views.map(([viewLabel, viewQuery]) => [viewLabel, `${viewQuery}&audience=56`])]) {
    await page.goto(`${appUrl}${query}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("#app")?.children.length > 0, null, { timeout: 15000 })
      .catch(() => problems.push(`${name}: ${label} zeigt keinen Inhalt`));
    await page.waitForLoadState("networkidle").catch(() => {});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${name}: ${label} ist ${overflow} px breiter als der Bildschirm`);
  }

  // Lehrkräfte-Karte bei Blatt 57 (Klasse 5/6): aufklappen, Angaben lesen, geteilten Link öffnen.
  await page.goto(`${appUrl}?view=training&tab=mathe-ag&audience=56`);
  const teacher = page.locator(".teacher-card").first();
  if (await teacher.waitFor({ timeout: 15000 }).then(() => true, () => false)) {
    await teacher.locator(".teacher-task > summary").first().click();
    for (const label of ["Lernziel", "Vorwissen", "Einstieg", "Vertiefung"]) {
      if (!await teacher.locator("dt", { hasText: label }).first().isVisible()) problems.push(`${name}: Lehrkräfte-Karte zeigt „${label}“ nicht`);
    }
    const shareUrl = await teacher.locator("[data-action=share-task]").first().getAttribute("data-share-url");
    await page.goto(shareUrl.replace(/^https?:\/\/[^/]+/, origin));
    await page.locator(".pdf-sheet").nth(1).waitFor({ timeout: 20000 }).catch(() => problems.push(`${name}: Geteilter Aufgabenlink öffnet das Blatt nicht`));
    // Aufgabe 3 steht auf Seite 2: Der Link springt dorthin.
    await page.waitForFunction(() => document.querySelector("#pdf-status")?.hidden !== false || !document.querySelector("#pdf-status")?.textContent, null, { timeout: 20000 }).catch(() => {});
    // Das Ersatzblatt hat nur 2 Seiten; dann reicht es, ganz nach unten gescrollt zu sein.
    const top = await page.locator(".pdf-sheet").nth(1).evaluate(sheet => {
      const atBottom = scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
      return atBottom && scrollY > 0 ? 0 : sheet.getBoundingClientRect().top;
    }).catch(() => 9999);
    if (Math.abs(top) > 120) problems.push(`${name}: Geteilter Link zeigt nicht Seite 2 (Abstand ${Math.round(top)} px)`);
  } else problems.push(`${name}: Lehrkräfte-Karte bei Blatt 57 fehlt`);

  // PDF-Leser: Der Aufgabentext muss als echter, vorlesbarer Text über der Seite liegen.
  const pdf = await page.evaluate(async () => {
    const container = Object.assign(document.createElement("div"), { className: "pdf-pages" });
    document.querySelector("#app").prepend(container);
    const { renderPdfDocument } = await import("./pdf-viewer.js");
    await renderPdfDocument({ url: "./Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf", container });
    const sheet = container.querySelector(".pdf-sheet");
    const word = [...sheet.querySelectorAll(".textLayer span")].find(span => span.textContent.includes("Fülle jedes leere"));
    const box = word?.getBoundingClientRect(), frame = sheet.getBoundingClientRect();
    const result = { text: Boolean(word), inside: Boolean(box && box.width > 20 && box.left >= frame.left && box.right <= frame.right + 1), hidden: sheet.querySelector("canvas").getAttribute("aria-hidden") };
    container.remove();
    return result;
  });
  if (!pdf.text) problems.push(`${name}: PDF-Leser zeigt keinen vorlesbaren Text`);
  else if (!pdf.inside) problems.push(`${name}: Text im PDF-Leser liegt nicht auf der Seite`);
  if (pdf.text && pdf.hidden !== "true") problems.push(`${name}: Seitenbild wird zusätzlich zum Text vorgelesen`);

  // Offline-Paket: Service Worker muss fertig installiert sein, danach im Flugmodus neu starten.
  const shell = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(done => navigator.serviceWorker.addEventListener("controllerchange", done, { once: true }));
    let bytes = 0, files = 0;
    for (const key of await caches.keys()) {
      if (!key.includes("shell")) continue;
      const cache = await caches.open(key);
      for (const request of await cache.keys()) { files += 1; bytes += (await (await cache.match(request)).arrayBuffer()).byteLength; }
    }
    return { active: Boolean(registration.active), bytes, files };
  });
  if (!shell.active || !shell.files) problems.push(`${name}: Offline-Paket wurde nicht installiert`);

  // Blatt offline sichern, App-Update nachstellen (Laufzeitspeicher weg), im Flugmodus wieder öffnen.
  const sheetButton = "[data-open-sunday-resource][data-viewer-type=pdf]";
  await page.goto(`${appUrl}?view=sunday&audience=34`);
  await page.locator(sheetButton).first().click();
  await page.locator(".pdf-sheet canvas").first().waitFor({ timeout: 20000 });
  await page.locator("[data-action=save-offline]").click();
  await page.locator("[data-action=offline-info]").waitFor({ timeout: 20000 })
    .catch(() => problems.push(`${name}: „Offline sichern“ meldet keinen Erfolg`));
  await page.evaluate(async () => { for (const key of await caches.keys()) if (key.endsWith("-runtime")) await caches.delete(key); });
  await context.setOffline(true);
  await page.goto(`${appUrl}?view=home&audience=34`).catch(error => problems.push(`${name}: Offline-Start ${error.message}`));
  await page.waitForFunction(() => document.querySelector("#app")?.children.length > 0, null, { timeout: 15000 })
    .catch(() => problems.push(`${name}: Im Flugmodus startet die App nicht`));
  await page.goto(`${appUrl}?view=sunday&audience=34`).catch(() => {});
  await page.locator(sheetButton).first().click().catch(() => {});
  await page.locator(".pdf-sheet canvas").first().waitFor({ timeout: 20000 })
    .catch(() => problems.push(`${name}: Gesichertes Blatt öffnet sich nach einem Update im Flugmodus nicht`));
  await page.goto(`${appUrl}?view=more&audience=34`).catch(() => {});
  await page.locator(".offline-row").first().waitFor({ timeout: 15000 }).catch(() => {});
  if (!await page.locator(".offline-row").count()) problems.push(`${name}: „Mehr“ zeigt das gesicherte Blatt nicht`);
  await context.setOffline(false);

  for (const entry of failed) problems.push(`${name}: Datei fehlt ${entry}`);
  // Beim Stöbern fragt die App keine fremden Dienste an (Datenschutz an der Schule).
  for (const host of external) problems.push(`${name}: Beim Stöbern angefragt: ${host}`);
  await context.close();
  return { name, ...shell, external: [...external].sort() };
}

try {
  for (const [name, device] of profiles) {
    const result = await checkProfile(name, device);
    console.log(`${result.name}: ${views.length + 1} Ansichten geöffnet, Offline-Paket ${result.files} Dateien, ${(result.bytes / 1e6).toFixed(1)} MB, PDF-Text geprüft, Blatt gesichert und nach Update im Flugmodus geöffnet.`);
    console.log(`  Fremde Adressen beim Stöbern: ${result.external.length ? result.external.join(", ") : "keine"}`);
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.log(`\n${problems.length} Problem(e):\n${[...new Set(problems)].map(problem => `✗ ${problem}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\n✓ Browser-Prüfung bestanden.");
}
