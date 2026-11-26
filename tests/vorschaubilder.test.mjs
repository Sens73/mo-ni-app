import assert from "node:assert/strict";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { localThumbnail, primaryMaterialPresentation } from "../material-presentation.js";

// Jedes Vorschaubild, das die App zeigt, liegt im eigenen Ordner. Fehlt eines, hilft:
//   bash scripts/update-vorschaubilder.sh   (auf dem Mac, lädt nur die fehlenden)
const root = new URL("../", import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(`data/${name}.json`, root), "utf8"));
const [journey, sunday, playlists, ag, ag56, olympiad] = await Promise.all(["journey", "sunday", "video-playlists", "mathe-ag", "mathe-ag-56", "olympiade"].map(read));

const shown = new Set();
for (const video of journey.videos) shown.add(localThumbnail(video.thumbnail));
if (journey.nextPublication?.thumbnail) shown.add(localThumbnail(journey.nextPublication.thumbnail));
for (const item of sunday.items) if (item.thumbnail) shown.add(localThumbnail(item.thumbnail));
for (const collection of Object.values(playlists.collections)) for (const video of collection.videos) shown.add(localThumbnail(video.thumbnail));
for (const item of [...ag.items, ...ag56.items, ...olympiad.items]) shown.add(primaryMaterialPresentation(item).thumbnail);
shown.delete("");

const missing = [];
for (const path of shown) {
  assert.ok(!/^https?:/i.test(path), `Keine fremde Bildquelle: ${path}`);
  await access(new URL(path.split("?")[0], root)).catch(() => missing.push(path));
}
assert.deepEqual(missing, [], `Vorschaubilder fehlen. Bitte auf dem Mac ausführen: bash scripts/update-vorschaubilder.sh`);

const files = await readdir(new URL("assets/vorschaubilder/", root));
let bytes = 0;
for (const file of files) {
  assert.match(file, /^[A-Za-z0-9_-]{11}\.jpg$/, file);
  const size = (await stat(new URL(`assets/vorschaubilder/${file}`, root))).size;
  assert.ok(size > 1000 && size < 120_000, `${file}: ${size} Bytes`);
  bytes += size;
}
await access(new URL("assets/vorschaubild-platzhalter.svg", root));
console.log(`Vorschaubilder: ${shown.size} angezeigte Bilder liegen lokal vor (${files.length} Dateien, ${(bytes / 1e6).toFixed(1)} MB), keine fremde Bildquelle.`);
