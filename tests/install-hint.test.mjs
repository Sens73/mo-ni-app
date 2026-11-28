import assert from "node:assert/strict";
import { installEntry, recordVisit, shouldOfferInstallHint, snoozeHint, emptyHintRecord, HINT_PAUSE_DAYS } from "../install-hint.js";

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-28T10:00:00Z");
const firstVisit = recordVisit(emptyHintRecord(), now);

// QR-Code (install=1): App startet sofort, kein Fenster.
assert.deepEqual(installEntry("https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?install=1"), { openGuide: false, fromQr: true });
// Ausdrücklicher Wunsch (z. B. nach „In Safari öffnen“) und Installationsseite: Anleitung sofort.
assert.equal(installEntry("https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html?install=now").openGuide, true);
assert.equal(installEntry("https://www.mo-ni.de/fileadmin/mo-ni-grundschul-app-installieren.html?install=1&browser-install=1").openGuide, true);
assert.equal(installEntry("https://sens73.github.io/mo-ni-app/browser-install.html?install=1").openGuide, true);
assert.deepEqual(installEntry("https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html"), { openGuide: false, fromQr: false });

// Erster Besuch ohne Erfolgserlebnis: kein Hinweis.
assert.equal(shouldOfferInstallHint({ device: "ios", record: firstVisit, now }), false);
// Nach Video, Blatt oder Spielrunde: Hinweis.
assert.equal(shouldOfferInstallHint({ device: "ios", record: firstVisit, successThisVisit: true, now }), true);
assert.equal(shouldOfferInstallHint({ device: "android", record: firstVisit, successThisVisit: true, now }), true);
// Zweiter Besuch am selben Tag zählt nicht, an einem anderen Tag schon.
assert.equal(recordVisit(firstVisit, now + 3600e3).visitDays.length, 1);
const secondDay = recordVisit(firstVisit, now + day);
assert.equal(shouldOfferInstallHint({ device: "ios", record: secondDay, now: now + day }), true);
// Installiert oder am Computer: nie.
assert.equal(shouldOfferInstallHint({ installed: true, device: "ios", record: secondDay, successThisVisit: true, now }), false);
assert.equal(shouldOfferInstallHint({ device: "computer", record: secondDay, successThisVisit: true, now }), false);
// „Später“: eine Woche Ruhe, danach wieder; nach zweimal „Später“ nie mehr von selbst.
const once = snoozeHint(secondDay, now);
assert.equal(shouldOfferInstallHint({ device: "ios", record: once, successThisVisit: true, now: now + (HINT_PAUSE_DAYS - 1) * day }), false);
assert.equal(shouldOfferInstallHint({ device: "ios", record: once, successThisVisit: true, now: now + (HINT_PAUSE_DAYS + 1) * day }), true);
const twice = snoozeHint(once, now + 8 * day);
assert.equal(shouldOfferInstallHint({ device: "ios", record: twice, successThisVisit: true, now: now + 60 * day }), false);
// Kaputte gespeicherte Werte stören nicht.
assert.equal(shouldOfferInstallHint({ device: "ios", record: "kaputt", successThisVisit: true, now }), true);
console.log("install-hint: ok");
