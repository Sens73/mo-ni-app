// Aufgabenblätter auf Wunsch dauerhaft offline sichern.
// Sie liegen in einem eigenen Speicher, den ein App-Update nicht löscht (siehe service-worker.js).
export const SAVED_MATERIALS_CACHE = "moni-saved-materials";

export function createOfflineMaterials({ storage, storageKey, cachesApi = globalThis.caches, fetchApi = (...args) => globalThis.fetch(...args), navigatorApi = globalThis.navigator, baseUrl = globalThis.location?.href } = {}) {
  const absolute = url => new URL(url, baseUrl).href;
  const read = () => {
    try {
      const value = JSON.parse(storage?.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value.filter(entry => entry && typeof entry.url === "string") : [];
    } catch {
      return [];
    }
  };
  const write = entries => {
    try { storage?.setItem(storageKey, JSON.stringify(entries)); } catch { /* Ohne Speicher bleibt nur der Cache. */ }
  };
  const available = () => Boolean(cachesApi?.open);

  return {
    available,
    list: () => read().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))),
    isSaved: url => Boolean(url) && read().some(entry => entry.url === absolute(url)),
    totalBytes: () => read().reduce((sum, entry) => sum + (Number(entry.bytes) || 0), 0),

    async save({ url, title }) {
      if (!available()) throw new Error("Dieser Browser kann keine Blätter offline sichern.");
      const href = absolute(url);
      const response = await fetchApi(href, { cache: "reload" });
      if (!response.ok) throw new Error(`Das Blatt konnte nicht geladen werden (${response.status}).`);
      const bytes = (await response.clone().arrayBuffer()).byteLength;
      await (await cachesApi.open(SAVED_MATERIALS_CACHE)).put(href, response);
      // Bittet den Browser, den Speicher nicht bei Platzmangel zu leeren (auf iPhones vor allem für installierte Apps).
      await navigatorApi?.storage?.persist?.().catch?.(() => false);
      write([{ url: href, title: String(title || "Aufgabenblatt"), bytes, savedAt: new Date().toISOString() }, ...read().filter(entry => entry.url !== href)]);
      return { url: href, bytes };
    },

    async remove(url) {
      const href = absolute(url);
      if (available()) await (await cachesApi.open(SAVED_MATERIALS_CACHE)).delete(href);
      write(read().filter(entry => entry.url !== href));
    },

    // Hat der Browser den Speicher geleert, verschwinden die Einträge auch aus der Liste.
    async reconcile() {
      if (!available()) return read();
      const cache = await cachesApi.open(SAVED_MATERIALS_CACHE);
      const entries = read();
      const kept = [];
      for (const entry of entries) if (await cache.match(entry.url)) kept.push(entry);
      if (kept.length !== entries.length) write(kept);
      return kept;
    }
  };
}

export function formatBytes(bytes) {
  const megabytes = (Number(bytes) || 0) / 1e6;
  return megabytes >= 0.1 ? `${megabytes.toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round((Number(bytes) || 0) / 1e3))} KB`;
}
