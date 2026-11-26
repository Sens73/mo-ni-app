import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
const index = await readFile(new URL("index.html", root), "utf8");
const app = await readFile(new URL("app.js", root), "utf8");
const appUpdates = await readFile(new URL("app-updates.js", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const serviceWorker = await readFile(new URL("service-worker.js", root), "utf8");
const externalView = await readFile(new URL("external-view.html", root), "utf8");
const externalScript = await readFile(new URL("external-view.js", root), "utf8");
const launcher = await readFile(new URL("Start-Prototyp.command", root), "utf8");
const iphoneLauncher = await readFile(new URL("Start-iPhone-Test.command", root), "utf8");
const iphoneInstall = await readFile(new URL("iphone-install.html", root), "utf8");

const desktopRelease = launcher.match(/CURRENT_RELEASE="([^"]+)"/)?.[1];
const iphoneRelease = iphoneLauncher.match(/CURRENT_RELEASE="([^"]+)"/)?.[1];
assert.equal(desktopRelease, "v0.14.0-release-4");
assert.equal(iphoneRelease, desktopRelease);
assert.ok(serviceWorker.includes(`const RELEASE_CACHE = "${desktopRelease}";`));

assert.equal(manifest.id, "./");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./index.html?source=pwa");
assert.ok(manifest.shortcuts.every(shortcut => shortcut.url.startsWith("./index.html?")));
assert.equal(manifest.scope, "./");
assert.equal(manifest.lang, "de-DE");
assert.equal(manifest.prefer_related_applications, false);
assert.ok(manifest.categories.includes("education"));
assert.ok(manifest.shortcuts.some(shortcut => shortcut.url.includes("view=dates")));
assert.ok(manifest.shortcuts.some(shortcut => shortcut.url.includes("view=training")));
assert.ok(manifest.shortcuts.some(shortcut => shortcut.url.includes("view=journey")));
assert.ok(manifest.shortcuts.some(shortcut => shortcut.url.includes("view=sunday")));

for (const icon of manifest.icons) await access(new URL(icon.src.replace(/^\.\//, ""), root));
assert.ok(manifest.icons.some(icon => icon.sizes === "192x192" && icon.purpose === "any"));
assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "any"));
assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));

async function pngSize(relativePath) {
  const bytes = await readFile(new URL(relativePath, root));
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

assert.deepEqual(await pngSize("assets/icons/icon-192.png"), [192, 192]);
assert.deepEqual(await pngSize("assets/icons/icon-512.png"), [512, 512]);
assert.deepEqual(await pngSize("assets/icons/icon-maskable-512.png"), [512, 512]);
assert.deepEqual(await pngSize("assets/icons/apple-touch-icon-180.png"), [180, 180]);

assert.match(index, /apple-mobile-web-app-capable/);
assert.match(index, /apple-mobile-web-app-title/);
assert.match(index, /apple-touch-icon-180\.png/);
assert.match(index, /manifest\.webmanifest/);
assert.match(index, /noindex, nofollow/);
assert.match(index, /styles\.css\?v=0\.14\.0-release-4b/);
assert.match(index, /app\.js\?v=0\.14\.0-release-4/);
assert.match(app, /pdf-viewer\.js\?v=0\.14\.0-release-2/);
assert.match(app, /print-manager\.js\?v=0\.14\.0-release-2/);
assert.match(externalView, /styles\.css\?v=0\.14\.0-release-2/);
assert.match(externalView, /external-view\.js\?v=0\.14\.0-release-2/);
assert.match(externalScript, /pdf-viewer\.js\?v=0\.14\.0-release-2/);
assert.match(launcher, /api\/health/);
assert.match(launcher, /PORT_CANDIDATES=\(4213 4214 4215/);
assert.match(launcher, /CURRENT_RELEASE="v0\.14\.0-release-4"/);
assert.match(launcher, /listener_dir/);
assert.match(launcher, /listener_dir" == "\$PROJECT_DIR/);
assert.match(launcher, /version=\$CURRENT_VERSION&release=\$CURRENT_RELEASE&autoupdate=1&view=home/);
assert.match(launcher, /open -na "Google Chrome" --args --new-window/);
assert.match(iphoneLauncher, /MONI_BIND_ADDRESS="0\.0\.0\.0"/);
assert.match(iphoneLauncher, /iphone-test=1/);
assert.match(iphoneLauncher, /IPHONE_PORT="4216"/);
assert.match(iphoneLauncher, /CURRENT_RELEASE="v0\.14\.0-release-4"/);
assert.match(iphoneLauncher, /lan_health/);
assert.match(iphoneLauncher, /local_health/);
assert.match(iphoneLauncher, /listener_dir" == "\$PROJECT_DIR/);
assert.match(iphoneLauncher, /bisherige MO-Ni-iPhone-Version/);
assert.match(iphoneLauncher, /listener_dir.*PROJECT_ROOT.*Versionen/s);
assert.match(iphoneLauncher, /\/usr\/bin\/caffeinate -i/);
assert.match(iphoneLauncher, /\/usr\/bin\/pbcopy/);
assert.match(iphoneLauncher, /iphone-install\.html\?target=/);
assert.match(iphoneLauncher, /open -na "Google Chrome" --args --new-window/);
assert.match(iphoneInstall, /quickchart\.io\/qr/);
assert.match(iphoneInstall, /isPrivateNetworkAddress/);
assert.match(iphoneInstall, /Zum Home-Bildschirm/);
assert.match(iphoneInstall, /Als Web-App öffnen/);
assert.match(styles, /@media \(orientation: landscape\) and \(max-height: 600px\)/);
assert.match(styles, /env\(safe-area-inset-left\)/);
assert.match(styles, /\.quick-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(styles, /\.resource-list[\s\S]{0,120}grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(serviceWorker, /data\/olympiade\.json/);
assert.match(serviceWorker, /data\/mathe-ag-56\.json/);
assert.match(serviceWorker, /data\/matheplus\.json/);
assert.match(serviceWorker, /data\/journey\.json/);
assert.match(serviceWorker, /data\/sunday\.json/);
assert.match(serviceWorker, /assets\/mo-ni-kanallogo\.png/);
assert.match(serviceWorker, /assets\/mo-ni-reise\.png/);
assert.match(serviceWorker, /assets\/mo-ni-arbeitsheft\.png/);
assert.doesNotMatch(serviceWorker, /community-state\.json/);
assert.match(styles, /\.journey-video-list/);
assert.match(styles, /\.offer-header/);

assert.match(app, /beforeinstallprompt/);
assert.match(app, /appinstalled/);
assert.match(app, /display-mode: standalone/);
assert.match(app, /Zum Home-Bildschirm/);
assert.match(app, /window\.addEventListener\("offline"/);
assert.match(app, /window\.addEventListener\("online"/);
assert.match(app, /activate-update/);
assert.match(appUpdates, /SKIP_WAITING/);
assert.match(app, /service-worker\.js/);
assert.match(app, /updateViaCache: "none"/);
assert.match(app, /registration\.update\(\)/);
assert.match(app, /createAppUpdateCoordinator/);
assert.match(app, /maybeApplyAppUpdate/);
assert.doesNotMatch(app, /const automaticUpdate = true/);
assert.match(app, /iPhone oder iPad/);
assert.match(app, /Android-Handy oder -Tablet/);
assert.match(app, /PC oder Mac/);
assert.match(app, /Zum Dock hinzufügen/);
assert.match(app, /Videos und noch nicht geladene Aufgabenblätter benötigen Internet/);
assert.match(app, /requestedInstallHelp \? "install" : null/);
assert.match(app, /aktiviere „Als Web-App öffnen“/);
assert.match(app, /Für diesen Test müssen Mac und iPhone im selben WLAN bleiben/);

assert.match(serviceWorker, /moni-grundschule-/);
assert.match(serviceWorker, /networkFirst/);
assert.match(serviceWorker, /await caches\.match\(request\)/);
assert.match(serviceWorker, /staleWhileRevalidate/);
assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
assert.match(serviceWorker, /url\.pathname\.includes\("\/api\/"\)/);
assert.match(serviceWorker, /event\.data\?\.type === "SKIP_WAITING"/);
assert.match(serviceWorker, /self\.skipWaiting\(\)/);

const combined = `${index}\n${app}\n${serviceWorker}`;
assert.doesNotMatch(combined, /google-analytics|googletagmanager|matomo|plausible\.io/i);

// Real handler probes: failed HTTP responses must keep cached content usable,
// and an installed replacement worker must wait for the client's safe handover.
const handlers = new Map();
const cacheContents = new Map();
let installRequests = [];
let skippedWaiting = 0;
let fetchResponse = new Response("Serverfehler", { status: 503 });
const origin = "https://www.mo-ni.de";
const dataRequest = new Request(`${origin}/fileadmin/grundschule-app-test/data/content.json`);
cacheContents.set(dataRequest.url, new Response('{"knownGood":true}'));
const fakeCache = {
  addAll: async requests => { installRequests = requests; },
  put: async (request, response) => cacheContents.set(request.url, response),
  match: async request => cacheContents.get(typeof request === "string" ? request : request.url)?.clone()
};
class ScopeRequest extends Request {
  constructor(url, options) { super(new URL(url, `${origin}/fileadmin/grundschule-app-test/`), options); }
}
runInNewContext(serviceWorker, {
  self: { location: { origin }, addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: () => { skippedWaiting += 1; }, clients: { claim: async () => {} } },
  caches: { open: async () => fakeCache, match: fakeCache.match, keys: async () => [], delete: async () => true },
  fetch: async () => fetchResponse, URL, Request: ScopeRequest, Response, Headers
});
let installPromise;
handlers.get("install")({ waitUntil: promise => { installPromise = promise; } });
await installPromise;
assert.equal(skippedWaiting, 0, "Ein Codeupdate aktiviert sich erst am sicheren Übergabepunkt.");
assert.ok(installRequests.length > 0);
assert.ok(!installRequests.some(request => new URL(request.url).pathname === "/fileadmin/grundschule-app-test/"), "TYPO3-Ordner ohne index.html darf die Installation nicht blockieren.");
for (const request of installRequests) await access(new URL(new URL(request.url).pathname.split("/grundschule-app-test/")[1], root));

let requestedResponse;
handlers.get("fetch")({ request: dataRequest, respondWith: response => { requestedResponse = response; } });
assert.equal(await (await requestedResponse).text(), '{"knownGood":true}', "HTTP 503 fällt auf bekannte Inhaltsdaten zurück.");
assert.equal(await cacheContents.get(dataRequest.url).clone().text(), '{"knownGood":true}', "Ein Serverfehler ersetzt keinen gültigen Datenstand.");
fetchResponse = new Response('{"newData":true}');
handlers.get("fetch")({ request: dataRequest, respondWith: response => { requestedResponse = response; } });
assert.equal(await (await requestedResponse).text(), '{"newData":true}');
assert.equal(await cacheContents.get(dataRequest.url).clone().text(), '{"newData":true}');
handlers.get("message")({ data: { type: "SKIP_WAITING" } });
assert.equal(skippedWaiting, 1);

console.log("Validated installable PWA metadata, icons, offline shell, update flow and tracking-free pilot mode.");
