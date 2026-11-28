import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installSituation, openInBrowserUrl, installPageUrl } from "../install-guide.js";

const ua = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneYouTube: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 com.google.ios.youtube/19.45.4 (iPhone15,2; U; CPU iOS 18_5 like Mac OS X)",
  iphoneInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36",
  androidSamsung: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15"
};

assert.deepEqual(installSituation({ userAgent: ua.iphoneSafari }), { device: "ios", browser: "safari" });
assert.deepEqual(installSituation({ userAgent: ua.iphoneYouTube }), { device: "ios", browser: "in-app" }, "YouTube app on the iPhone");
assert.deepEqual(installSituation({ userAgent: ua.iphoneInstagram }), { device: "ios", browser: "in-app" });
assert.deepEqual(installSituation({ userAgent: ua.iphoneChrome }), { device: "ios", browser: "chrome" });
assert.deepEqual(installSituation({ userAgent: ua.androidChrome }), { device: "android", browser: "chrome" });
assert.deepEqual(installSituation({ userAgent: ua.androidWebView }), { device: "android", browser: "in-app" }, "Android web view inside an app");
assert.deepEqual(installSituation({ userAgent: ua.androidSamsung }), { device: "android", browser: "other" });
assert.deepEqual(installSituation({ userAgent: ua.mac }), { device: "computer", browser: "safari" });
assert.deepEqual(installSituation({ userAgent: ua.mac, platform: "MacIntel", maxTouchPoints: 5 }), { device: "ios", browser: "safari" }, "iPad reports itself as a Mac");

const page = installPageUrl("https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?audience=34#oben");
assert.equal(page, "https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?audience=34&install=now");
assert.equal(openInBrowserUrl("ios", page), `x-safari-${page}`);
const intent = openInBrowserUrl("android", page);
assert.ok(intent.startsWith("intent://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?audience=34&install=now#Intent;scheme=https;package=com.android.chrome;"));
assert.ok(intent.includes(`S.browser_fallback_url=${encodeURIComponent(page)}`));
assert.equal(openInBrowserUrl("computer", page), "");
assert.equal(openInBrowserUrl("ios", "javascript:alert(1)"), "", "Only web addresses are handed to the browser.");

// Der QR-Code am Computer ist eine eigene Datei (kein fremder QR-Dienst) und gehört zum Offline-Paket.
const worker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
assert.match(worker, /\.\/install-guide\.js\?v=/);
assert.match(worker, /\.\/assets\/app-qr-code\.svg/);
const qr = await readFile(new URL("../assets/app-qr-code.svg", import.meta.url), "utf8");
assert.match(qr, /^<svg /);

console.log("Installationshilfe: Geräte, eingebaute Browser, Safari- und Chrome-Ausweg sowie QR-Code geprüft.");
