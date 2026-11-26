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
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Content-Length": info.size });
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
  await context.route(url => !url.href.startsWith(origin), route => { external.add(new URL(route.request().url()).hostname); route.abort(); });
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
  await context.setOffline(true);
  await page.goto(`${appUrl}?view=home&audience=34`).catch(error => problems.push(`${name}: Offline-Start ${error.message}`));
  await page.waitForFunction(() => document.querySelector("#app")?.children.length > 0, null, { timeout: 15000 })
    .catch(() => problems.push(`${name}: Im Flugmodus startet die App nicht`));
  await context.setOffline(false);

  for (const entry of failed) problems.push(`${name}: Datei fehlt ${entry}`);
  await context.close();
  return { name, ...shell, external: [...external].sort() };
}

try {
  for (const [name, device] of profiles) {
    const result = await checkProfile(name, device);
    console.log(`${result.name}: ${views.length + 1} Ansichten geöffnet, Offline-Paket ${result.files} Dateien, ${(result.bytes / 1e6).toFixed(1)} MB, Flugmodus-Start geprüft.`);
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
