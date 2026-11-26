import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOfflineMaterials, formatBytes, SAVED_MATERIALS_CACHE } from "../offline-materials.js";

// Kleine Nachbildung von Cache-Speicher, localStorage und Netz.
function harness({ fetchStatus = 200 } = {}) {
  const caches = new Map();
  const cachesApi = {
    async open(name) {
      if (!caches.has(name)) caches.set(name, new Map());
      const store = caches.get(name);
      return {
        put: async (url, response) => store.set(url, response),
        match: async url => store.get(url),
        delete: async url => store.delete(url)
      };
    }
  };
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const fetched = [];
  const fetchApi = async (url, options) => { fetched.push([url, options]); return new Response(new Uint8Array(250_000), { status: fetchStatus }); };
  let persisted = 0;
  const navigatorApi = { storage: { persist: async () => { persisted += 1; return true; } } };
  const materials = createOfflineMaterials({ storage, storageKey: "test-saved", cachesApi, fetchApi, navigatorApi, baseUrl: "https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html" });
  return { materials, caches, values, fetched, get persisted() { return persisted; } };
}

const sheet = "https://www.mo-ni.de/fileadmin/JagtMrX/Mathe_AG/AG_057.pdf";
const h = harness();
assert.equal(h.materials.available(), true);
assert.equal(h.materials.isSaved(sheet), false);
const saved = await h.materials.save({ url: sheet, title: "Livestream 57" });
assert.deepEqual(saved, { url: sheet, bytes: 250_000 });
assert.equal(h.fetched[0][1].cache, "reload", "Saving fetches a fresh copy.");
assert.ok(h.caches.get(SAVED_MATERIALS_CACHE).has(sheet), "The sheet is stored in the update-proof cache.");
assert.equal(h.persisted, 1, "The browser is asked to keep the storage.");
assert.equal(h.materials.isSaved(sheet), true);
assert.equal(h.materials.totalBytes(), 250_000);

// Relative Adressen (Sonntagsrätsel im App-Ordner) werden wie absolute behandelt.
await h.materials.save({ url: "./Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf", title: "KenKens" });
assert.equal(h.materials.isSaved("https://www.mo-ni.de/fileadmin/grundschule-app-test/Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf"), true);
assert.equal(h.materials.list().length, 2);
await h.materials.save({ url: sheet, title: "Livestream 57" });
assert.equal(h.materials.list().length, 2, "Saving twice keeps one entry.");

// Hat der Browser den Speicher geleert, verschwindet der Eintrag aus der Liste.
h.caches.get(SAVED_MATERIALS_CACHE).delete(sheet);
assert.equal((await h.materials.reconcile()).length, 1);
assert.equal(h.materials.isSaved(sheet), false);

await h.materials.remove("./Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf");
assert.equal(h.materials.list().length, 0);
assert.equal(h.caches.get(SAVED_MATERIALS_CACHE).size, 0);

// Ein fehlgeschlagener Download legt keinen leeren Eintrag an.
const offline = harness({ fetchStatus: 404 });
await assert.rejects(offline.materials.save({ url: sheet, title: "x" }), /404/);
assert.equal(offline.materials.list().length, 0);

// Ohne Cache-Speicher (sehr alte Browser) wird der Knopf gar nicht angeboten.
assert.equal(createOfflineMaterials({ cachesApi: undefined, storage: null, baseUrl: "https://x/" }).available(), false);
assert.equal(formatBytes(2_345_678), "2,3 MB");
assert.equal(formatBytes(48_000), "48 KB");

// Der Service Worker nutzt denselben Speichernamen und löscht ihn bei Updates nicht.
const worker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
assert.ok(worker.includes(`const SAVED_CACHE = "${SAVED_MATERIALS_CACHE}";`));
const prefix = worker.match(/const CACHE_PREFIX = "([^"]+)"/)[1];
assert.ok(!SAVED_MATERIALS_CACHE.startsWith(prefix), "Update cleanup only removes caches with the release prefix.");
assert.match(worker, /\.\/offline-materials\.js\?v=/, "The module is part of the offline start package.");

console.log("Offline materials: save, update-proof cache, relative URLs, reconcile, remove, failed downloads and service worker contract verified.");
