import assert from "node:assert/strict";
import { mergeArchive, requiredFields, videoIds, describe } from "../scripts/inhalte-abgleichen.mjs";

const now = new Date("2026-11-27T05:00:00Z");
const published = {
  version: "0.12.0", count: 2, updatedAt: "2026-11-16T00:00:00Z", source: "https://www.mo-ni.de/mathe-ag-grundschule",
  items: [
    { id: "ag-121", title: "Mathe-AG 121", subtitle: "Der Zahlenstern, gerade Ziffern", grades: [3, 4], pdf: "https://www.mo-ni.de/AG_121_Kopfzeile.pdf" },
    { id: "ag-120", title: "Mathe-AG 120", subtitle: "Würfelnetze", grades: [3, 4], pdf: "https://www.mo-ni.de/AG_120.pdf" }
  ]
};
const generated = {
  version: "0.13.0", count: 4,
  items: [
    { id: "ag-123", title: "Mathe-AG 123", subtitle: "C4 Känguru 2026", pdf: "https://www.mo-ni.de/AG_123.pdf" },
    { id: "ag-122", title: "Mathe-AG 122", subtitle: "C7 Känguru 2026", grades: [3, 4], pdf: "https://www.mo-ni.de/AG_122.pdf", video: "https://youtube.com/live/abcdefghijk" },
    { id: "ag-121", title: "Mathe-AG 121", subtitle: "C4 Känguru 2026 A10 640424", grades: [3, 4], pdf: "https://www.mo-ni.de/_121_–_Blatt_121.pdf" },
    { id: "ag-120", title: "Mathe-AG 120", subtitle: "Würfelnetze" }
  ]
};

assert.deepEqual(requiredFields(published.items), ["grades", "id", "pdf", "subtitle", "title"]);
const { merged, added, rejected } = mergeArchive(published, generated, now);
assert.deepEqual(added.map(item => item.id), ["ag-122"], "Only the complete new sheet is added.");
assert.deepEqual(rejected, [{ id: "ag-123", title: "Mathe-AG 123", missing: ["grades"] }], "A new entry without grade information is held back.");
assert.deepEqual(merged.items.map(item => item.id), ["ag-122", "ag-121", "ag-120"]);
assert.equal(merged.items[1].subtitle, "Der Zahlenstern, gerade Ziffern", "Hand-written subtitles stay.");
assert.equal(merged.items[1].pdf, "https://www.mo-ni.de/AG_121_Kopfzeile.pdf", "Corrected PDF versions stay.");
assert.equal(merged.items[2].grades.length, 2, "Existing fields are never dropped.");
assert.equal(merged.version, "0.12.0", "Top-level fields keep the published values.");
assert.equal(merged.count, 3);
assert.equal(merged.updatedAt, now.toISOString());

// Nichts Neues: die veröffentlichte Fassung bleibt Byte für Byte gleich (kein unnötiges Hochladen).
const unchanged = mergeArchive(published, { items: published.items.map(item => ({ ...item, subtitle: "roh" })) }, now);
assert.equal(unchanged.merged, published);
assert.equal(unchanged.added.length, 0);

// Mathe-AG 5/6 führt Zähler mit.
const ag56 = mergeArchive(
  { coreCount: 1, enrichmentCount: 0, nextNumber: 58, items: [{ id: "a57", title: "57", video: "https://youtu.be/aaaaaaaaaaa", enrichment: false }] },
  { nextNumber: 59, items: [{ id: "a58", title: "58", video: "https://youtu.be/bbbbbbbbbbb", enrichment: false }, { id: "a57", title: "57" }] }, now);
assert.deepEqual([ag56.merged.coreCount, ag56.merged.enrichmentCount, ag56.merged.nextNumber], [2, 0, 59]);

assert.deepEqual(videoIds({ a: "https://youtube.com/live/urs_WWB2SMg", b: "https://youtu.be/QugmHXn1roM", c: "https://www.youtube.com/watch?v=QugmHXn1roM" }), ["urs_WWB2SMg", "QugmHXn1roM"]);

const text = describe({ erstellt: now.toISOString(), hochladen: [{ pfad: "data/mathe-ag.json", typo3Ordner: "fileadmin/grundschule-app-test/data/", grund: "neue Einträge" }], neu: ["Mathe-AG 3/4: Mathe-AG 122"], abgelehnt: ["Mathe-AG 3/4: Mathe-AG 123 (es fehlt: grades)"], hinweise: [] });
assert.match(text, /1\. data\/mathe-ag\.json  →  fileadmin\/grundschule-app-test\/data\//);
assert.match(text, /Nicht übernommen, bitte von Hand ansehen/);

console.log("Inhalts-Abgleich: nur Neues wird ergänzt, gepflegte Texte und Fassungen bleiben, unvollständige Einträge werden zurückgehalten.");
